#!/usr/bin/env python3
"""Version-specific record transforms for the CAESAR II CII v11/v14 adapter."""
from __future__ import annotations

import math
from typing import Sequence

from cii_v11_v14_format import (
    Audit, CiiConversionError, ELEMENT_RECORD_LINES, LEGACY_ELEMENT_TEXT_WIDTH,
    LEGACY_RESTRAINT_TEXT_WIDTH, REDUCER_ROWS_V11, REDUCER_ROWS_V14,
    RESTRAINT_RECORD_LINES, SIF_ROWS_V11, SIF_ROWS_V14, Section,
    V14_VERSION_GENERATOR, V14_VERSION_TEXT_WIDTH, _UNITS_SI_MM, _VERSION_LINE,
    _V11_DEFAULT_STIFFNESS, _V11_RIGID_STIFFNESS, _V14_DEFAULT_STIFFNESS,
    _V14_RIGID_STIFFNESS, _extract_numbers, _generic_numeric_convert,
    _render_float_row,
)

def detect_version(sections: Sequence[Section]) -> int:
    version = next((s for s in sections if s.name == "VERSION"), None)
    if version is None or not version.lines:
        raise CiiConversionError("Missing or empty #$ VERSION section.")
    parsed = _extract_numbers(version.lines[0])
    if parsed is None or len(parsed[0]) < 2:
        raise CiiConversionError(f"Cannot parse VERSION record: {version.lines[0]!r}")
    source = int(round(parsed[0][1]))
    if source not in (11, 14):
        raise CiiConversionError(f"Unsupported CII source version {source}; expected 11 or 14.")
    return source


def _convert_version(lines: Sequence[str], target: int) -> list[str]:
    if not lines:
        raise CiiConversionError("VERSION section is empty.")
    converted = [_VERSION_LINE[target]]
    for index, line in enumerate(lines[1:], 1):
        # The final VERSION payload row is version-owned in the qualified pair:
        # v14 carries the neutral-interface generator banner, while v11 leaves
        # the row blank.  Do not leak the v14 banner into a v11 file.
        if len(lines) == 61 and index == 60:
            text = V14_VERSION_GENERATOR if target == 14 else ""
        else:
            text = line.rstrip()
        if target == 14:
            converted.append(text.ljust(V14_VERSION_TEXT_WIDTH))
        else:
            converted.append(text if text else "  ")
    return converted


def _compact_length_prefixed_text(line: str) -> str:
    # FORTRAN (7X,I5,1X,A...) retains the 1X separator even for a blank A field.
    # A legacy padded blank row is therefore 12-column prefix + one space.
    prefix = line[:12] if len(line) >= 12 else line.rjust(12)
    remainder = line[12:] if len(line) >= 12 else ""
    if not remainder.strip():
        return prefix + " "
    return line.rstrip()


def _convert_element_text_row(line: str, target: int) -> str:
    if target == 11:
        return line.rstrip().ljust(LEGACY_ELEMENT_TEXT_WIDTH)
    return _compact_length_prefixed_text(line)


def _convert_elements(lines: Sequence[str], target: int) -> list[str]:
    if len(lines) % ELEMENT_RECORD_LINES:
        raise CiiConversionError(
            f"ELEMENTS payload has {len(lines)} rows; expected a multiple of {ELEMENT_RECORD_LINES}."
        )
    out: list[str] = []
    for base in range(0, len(lines), ELEMENT_RECORD_LINES):
        block = list(lines[base:base + ELEMENT_RECORD_LINES])
        # Rows 1-9 are fixed-width REAL records.  Rows 10-11 are string records;
        # rows 12-15 are integer/separator records and remain untouched.
        for index in range(9):
            block[index] = _generic_numeric_convert(block[index], target)
        block[9] = _convert_element_text_row(block[9], target)
        block[10] = _convert_element_text_row(block[10], target)
        out.extend(block)
    return out


def _text_prefix_is_blank(line: str) -> bool:
    prefix = line[:12].strip()
    if not prefix:
        return True
    try:
        return int(float(prefix)) == 0
    except ValueError:
        return False


def _close_to(value: float, expected: float) -> bool:
    return math.isclose(value, expected, rel_tol=5e-8, abs_tol=max(1e-9, abs(expected) * 5e-8))


def _map_restraint_stiffness(
    values1: list[float], values2: list[float], text1: str, text2: str,
    source: int, target: int,
) -> list[float]:
    if len(values1) < 3:
        return values1
    node = values1[0]
    type_code = values1[1]
    stiffness = values1[2]
    empty_slot = (
        abs(node) < 1e-9
        and abs(type_code) < 1e-9
        and all(abs(value) < 1e-9 for value in values2[:3])
        and _text_prefix_is_blank(text1)
        and _text_prefix_is_blank(text2)
    )
    mapped = list(values1)
    if source == 14 and target == 11:
        if empty_slot and abs(stiffness) < 1e-9:
            mapped[2] = _V11_DEFAULT_STIFFNESS
        elif _close_to(stiffness, _V14_DEFAULT_STIFFNESS):
            mapped[2] = _V11_DEFAULT_STIFFNESS
        elif _close_to(stiffness, _V14_RIGID_STIFFNESS):
            mapped[2] = _V11_RIGID_STIFFNESS
    elif source == 11 and target == 14:
        if empty_slot and _close_to(stiffness, _V11_DEFAULT_STIFFNESS):
            mapped[2] = 0.0
        elif _close_to(stiffness, _V11_DEFAULT_STIFFNESS):
            mapped[2] = _V14_DEFAULT_STIFFNESS
        elif _close_to(stiffness, _V11_RIGID_STIFFNESS):
            mapped[2] = _V14_RIGID_STIFFNESS
    return mapped


def _convert_restraint_text_row(line: str, target: int) -> str:
    if target == 11:
        return line.rstrip().ljust(LEGACY_RESTRAINT_TEXT_WIDTH)
    return _compact_length_prefixed_text(line)


def _convert_restraints(lines: Sequence[str], source: int, target: int) -> list[str]:
    if len(lines) % RESTRAINT_RECORD_LINES:
        raise CiiConversionError(
            f"RESTRANT payload has {len(lines)} rows; expected a multiple of {RESTRAINT_RECORD_LINES}."
        )
    out: list[str] = []
    for base in range(0, len(lines), RESTRAINT_RECORD_LINES):
        row1, row2, text1, text2 = lines[base:base + RESTRAINT_RECORD_LINES]
        parsed1 = _extract_numbers(row1)
        parsed2 = _extract_numbers(row2)
        if parsed1 is None or parsed2 is None or len(parsed1[0]) != 6 or len(parsed2[0]) != 3:
            raise CiiConversionError(
                f"Malformed RESTRANT fixed record at payload row {base + 1}."
            )
        values1 = _map_restraint_stiffness(
            list(parsed1[0]), list(parsed2[0]), text1, text2, source, target
        )
        out.append(_render_float_row(values1, target))
        out.append(_render_float_row(parsed2[0], target))
        out.append(_convert_restraint_text_row(text1, target))
        out.append(_convert_restraint_text_row(text2, target))
    return out


def _row_is_all_zero(line: str) -> bool:
    parsed = _extract_numbers(line)
    return parsed is not None and bool(parsed[0]) and all(abs(value) < 1e-12 for value in parsed[0])


def _convert_sif_tees(
    lines: Sequence[str], source: int, target: int, allow_lossy: bool, audit: Audit
) -> list[str]:
    if not lines:
        return []
    source_rows = SIF_ROWS_V11 if source == 11 else SIF_ROWS_V14
    if len(lines) % source_rows:
        raise CiiConversionError(
            f"SIF&TEES payload has {len(lines)} rows; expected a multiple of {source_rows} for v{source}."
        )
    out: list[str] = []
    for record_index, base in enumerate(range(0, len(lines), source_rows), 1):
        record = list(lines[base:base + source_rows])
        if source == 14 and target == 11:
            extras = record[SIF_ROWS_V11:SIF_ROWS_V14]
            if not all(_row_is_all_zero(line) for line in extras):
                message = (
                    f"SIF&TEES record {record_index} contains non-zero v14-only rows; "
                    "v11 has no storage for them."
                )
                if not allow_lossy:
                    raise CiiConversionError(message + " Re-run with --allow-lossy to discard them explicitly.")
                audit.loss_events.append(message)
            record = record[:SIF_ROWS_V11]
        elif source == 11 and target == 14:
            zero = _render_float_row([0.0] * 6, 14)
            record.extend([zero] * (SIF_ROWS_V14 - SIF_ROWS_V11))
        out.extend(_generic_numeric_convert(line, target) for line in record)
    return out


def _convert_reducers(
    lines: Sequence[str], source: int, target: int, allow_lossy: bool, audit: Audit
) -> list[str]:
    if not lines:
        return []
    if source == 14:
        if len(lines) % REDUCER_ROWS_V14:
            raise CiiConversionError(
                f"REDUCERS payload has {len(lines)} rows; expected pairs for v14."
            )
        out: list[str] = []
        for record_index, base in enumerate(range(0, len(lines), 2), 1):
            first, extra = lines[base:base + 2]
            if target == 11:
                if not _row_is_all_zero(extra):
                    message = (
                        f"REDUCERS record {record_index} contains a non-zero v14-only row; "
                        "v11 has no storage for it."
                    )
                    if not allow_lossy:
                        raise CiiConversionError(message + " Re-run with --allow-lossy to discard it explicitly.")
                    audit.loss_events.append(message)
                out.append(_generic_numeric_convert(first, 11))
            else:
                out.extend([first, extra])
        return out

    # v11: every row is one reducer record.
    out = []
    for line in lines:
        out.append(_generic_numeric_convert(line, target))
        if target == 14:
            parsed = _extract_numbers(line)
            field_count = len(parsed[0]) if parsed is not None else 5
            out.append(_render_float_row([0.0] * field_count, 14))
    return out


def _convert_units(lines: Sequence[str], target: int, audit: Audit) -> list[str]:
    if any("SI (mm)" in line for line in lines):
        return list(_UNITS_SI_MM[target])
    audit.warnings.append(
        "UNITS is not the qualified SI (mm) profile; constants/labels were preserved and only fixed numeric rows were re-rendered."
    )
    return [_generic_numeric_convert(line, target) for line in lines]


def _parse_int_token(token: str, what: str) -> int:
    try:
        value = float(token)
    except ValueError as exc:
        raise CiiConversionError(f"Invalid {what}: {token!r}") from exc
    rounded = int(round(value))
    if abs(value - rounded) > 1e-8:
        raise CiiConversionError(f"Non-integral {what}: {token!r}")
    return rounded


def _convert_coords(lines: Sequence[str], target: int, audit: Audit) -> list[str]:
    if not lines:
        return []
    first = _extract_numbers(lines[0])
    if first is None or len(first[0]) != 1:
        raise CiiConversionError("Malformed COORDS count row.")
    count = _parse_int_token(first[1][0], "COORDS count")
    if len(lines) != count + 1:
        raise CiiConversionError(
            f"COORDS count is {count} but payload contains {len(lines) - 1} coordinate rows."
        )
    out = [f"{count:15d}"]
    max_delta = 0.0
    for row_index, line in enumerate(lines[1:], 1):
        parsed = _extract_numbers(line)
        if parsed is None or len(parsed[0]) != 4:
            raise CiiConversionError(f"Malformed COORDS row {row_index}: {line!r}")
        node = _parse_int_token(parsed[1][0], f"COORDS node at row {row_index}")
        coords = list(parsed[0][1:])
        if target == 11:
            rendered_coords = [f"{value:13.4f}" for value in coords]
        else:
            rendered_coords = [f"{value:13.6E}" for value in coords]
        rendered = f"{node:15d}" + "".join(rendered_coords)
        # Quantization is part of the target fixed format; report a concise maximum.
        reparsed = _extract_numbers(rendered)
        if reparsed is not None:
            for before, after in zip(coords, reparsed[0][1:]):
                max_delta = max(max_delta, abs(before - after))
        out.append(rendered)
    if max_delta > 0.0:
        audit.warnings.append(
            f"COORDS target formatting quantized coordinate values; maximum absolute formatting delta={max_delta:.9g}."
        )
    return out

