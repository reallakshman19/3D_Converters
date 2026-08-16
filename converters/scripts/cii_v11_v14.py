#!/usr/bin/env python3
"""Convert CAESAR II neutral files between v11 and v14 fixed-format dialects.

This is an adapter around the formatting conventions used by the immutable
``inputxml_to_cii2019.py`` engine. It does not import or modify that engine.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Sequence

from cii_v11_v14_format import (
    Audit, CiiConversionError, ConversionResult, SECTION_ORDER, Section, _EOL,
    _V11_DEFAULT_STIFFNESS, _extract_numbers, _generic_numeric_convert,
    _render_float_row, _sha256, parse_sections,
)
from cii_v11_v14_records import (
    _close_to, _convert_allowables, _convert_coords, _convert_elements,
    _convert_reducers, _convert_restraints, _convert_sif_tees, _convert_units,
    _convert_version, _row_is_all_zero, detect_version,
)
from cii_v11_v14_validate import CiiStructureError, validate_text_for_version


def _convert_section(
    section: Section, source: int, target: int, allow_lossy: bool, audit: Audit
) -> list[str]:
    name = section.name
    lines = section.lines
    if name == "VERSION":
        return _convert_version(lines, target)
    if name == "ELEMENTS":
        return _convert_elements(lines, target)
    if name == "RESTRANT":
        return _convert_restraints(lines, source, target)
    if name == "ALLOWBLS":
        return _convert_allowables(lines, source, target, allow_lossy, audit)
    if name == "SIF&TEES":
        return _convert_sif_tees(lines, source, target, allow_lossy, audit)
    if name == "REDUCERS":
        return _convert_reducers(lines, source, target, allow_lossy, audit)
    if name == "UNITS":
        return _convert_units(lines, target, audit)
    if name == "COORDS":
        return _convert_coords(lines, target, audit)
    # CONTROL integer rows, NODENAME strings, and sections whose record shape is
    # unchanged between the qualified profiles are retained; real-valued fixed
    # rows are re-rendered only when their fixed-width shape is unambiguous.
    return [_generic_numeric_convert(line, target) for line in lines]


def _header(name: str, target: int) -> str:
    return f"#$ {name:<8}" if target == 14 else f"#$ {name}"


def _serialize(sections: Sequence[Section], target: int) -> bytes:
    lines: list[str] = []
    for section in sections:
        lines.append(_header(section.name, target))
        lines.extend(section.lines)
    text = _EOL[target].join(lines) + _EOL[target]
    return text.encode("utf-8")


def _validate_section_envelope(sections: Sequence[Section], audit: Audit) -> None:
    names = [section.name for section in sections]
    expected_present = [name for name in SECTION_ORDER if name in names]
    actual_known = [name for name in names if name in SECTION_ORDER]
    if actual_known != expected_present:
        raise CiiConversionError(
            "Known CII sections are out of canonical order; refusing to reorder an ambiguous file."
        )
    unknown = [name for name in names if name not in SECTION_ORDER]
    if unknown:
        audit.warnings.append(
            "Unknown sections were preserved in place without version-specific interpretation: " + ", ".join(unknown)
        )


def _validate_structure(data: bytes, version: int, *, phase: str) -> None:
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise CiiConversionError(f"{phase} CII is not valid ASCII/UTF-8 text.") from exc
    try:
        validate_text_for_version(text, version, phase=phase)
    except CiiStructureError as exc:
        raise CiiConversionError(str(exc)) from exc


def convert_bytes(data: bytes, target: int, *, allow_lossy: bool = False) -> ConversionResult:
    if target not in (11, 14):
        raise CiiConversionError("Target version must be 11 or 14.")
    sections = parse_sections(data)
    source = detect_version(sections)
    audit = Audit(
        source_version=source,
        target_version=target,
        source_sha256=_sha256(data),
        source_bytes=len(data),
    )
    _validate_section_envelope(sections, audit)

    # Validate the source against an independent CONTROL-driven record envelope
    # before any conversion.  This prevents a malformed source from becoming a
    # superficially well-formed target through row truncation/reformatting.
    _validate_structure(data, source, phase="source")

    if source == target:
        # A no-op conversion must be byte-preserving; this avoids needless
        # formatting churn when a caller misidentifies an already-target file.
        audit.target_sha256 = audit.source_sha256
        audit.target_bytes = len(data)
        audit.warnings.append(f"Input is already CII v{target}; output copied byte-for-byte.")
        return ConversionResult(data=data, audit=audit)

    converted_sections: list[Section] = []
    for section in sections:
        converted_lines = _convert_section(section, source, target, allow_lossy, audit)
        converted_sections.append(Section(section.name, converted_lines))
        if converted_lines != section.lines or _header(section.name, target) != _header(section.name, source):
            audit.changed_sections.append(section.name)

    output = _serialize(converted_sections, target)

    # P0 import gate: do not hand a generated neutral file to the browser until
    # the independent target-version section rules accept CONTROL counts, block
    # widths, section order, MISCEL_1 minimum payload and UNITS envelope.
    _validate_structure(output, target, phase="generated")

    audit.target_sha256 = _sha256(output)
    audit.target_bytes = len(output)
    return ConversionResult(data=output, audit=audit)


def convert_file(
    input_path: Path, output_path: Path, target: int, *, allow_lossy: bool = False,
    audit_json: Path | None = None,
) -> ConversionResult:
    input_path = Path(input_path)
    output_path = Path(output_path)
    data = input_path.read_bytes()
    result = convert_bytes(data, target, allow_lossy=allow_lossy)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(result.data)
    if audit_json is not None:
        audit_json = Path(audit_json)
        audit_json.parent.mkdir(parents=True, exist_ok=True)
        audit_json.write_text(json.dumps(result.audit.as_dict(), indent=2) + "\n", encoding="utf-8")
    return result


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Convert CAESAR II neutral files between v11 and v14 fixed-format dialects."
    )
    parser.add_argument("input", type=Path, help="Source .CII/.cii neutral file")
    parser.add_argument("output", type=Path, help="Target .CII/.cii neutral file")
    parser.add_argument(
        "--target",
        default="auto",
        choices=("auto", "11", "14"),
        help="Target CAESAR II version. Default: auto-detect source and convert to the opposite version.",
    )
    parser.add_argument(
        "--allow-lossy", action="store_true",
        help=(
            "Explicitly allow discarding only version-owned extension data with no v11 storage "
            "(for example SIF/TEE items 31-42, reducer items 6-10, or ALLOWBLS items 154-168)."
        ),
    )
    parser.add_argument("--audit-json", type=Path, default=None, help="Optional JSON audit report path")
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    try:
        if args.target == "auto":
            source_sections = parse_sections(args.input.read_bytes())
            source_version = detect_version(source_sections)
            target_version = 11 if source_version == 14 else 14
        else:
            target_version = int(args.target)
        result = convert_file(
            args.input, args.output, target_version,
            allow_lossy=args.allow_lossy,
            audit_json=args.audit_json,
        )
    except CiiConversionError as exc:
        print(f"ERROR: {exc}")
        return 2
    audit = result.audit
    print(
        f"CII v{audit.source_version} -> v{audit.target_version}: "
        f"{audit.source_bytes} -> {audit.target_bytes} bytes; "
        f"changed sections={len(audit.changed_sections)}, warnings={len(audit.warnings)}, "
        f"loss events={len(audit.loss_events)}"
    )
    for warning in audit.warnings:
        print(f"WARNING: {warning}")
    for loss in audit.loss_events:
        print(f"LOSS: {loss}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
