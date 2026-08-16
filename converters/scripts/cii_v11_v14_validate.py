#!/usr/bin/env python3
"""Independent structure gates for CAESAR II CII v11/v14 conversion.

The version converter must never declare success merely because its own parser can
re-read the generated text.  This module reuses the established CII 2019/v11
section validator for target v11 and applies a small v14 profile containing only
record-count deltas independently established for the neutral-file generations.
"""
from __future__ import annotations

import re
from typing import Mapping, Sequence

import cii2019_section_rules as cii11


V14_AUX_ROWS = dict(cii11.LINES_PER_AUX_BLOCK)
V14_AUX_ROWS.update({
    "ALLOWBLS": 28,
    "SIF&TEES": 14,
    "REDUCERS": 2,
})

# MISCEL_1 ends with four execution-option fixed records.  Those rows are
# mixed-format FORTRAN records, not homogeneous REAL rows.  The paired CAESAR
# writers establish the lexical integer positions below; the remaining fields
# are G13.6-compatible real fields.  A generic REAL renderer can keep the row
# width intact while corrupting these I13 positions (for example 0 -> 0.000000).
_MISCEL_EXECUTION_INT_SLOTS = (
    (0, 1, 2, 3, 5),
    (0, 4, 5),
    (0, 1, 2, 3, 5),
    (0,),
)
_MISCEL_FIELD_WIDTH = 13
_MISCEL_LEADING_X = 2
_INT_TOKEN_RE = re.compile(r"[+-]?\d+")


class CiiStructureError(ValueError):
    """The source or generated neutral file violates its fixed-record envelope."""


def _control_block_counts(control: cii11.ControlCounts) -> dict[str, int]:
    return {
        "BEND": control.bends,
        "RIGID": control.rigids,
        "EXPJT": control.expjts,
        "RESTRANT": control.restraints,
        "DISPLMNT": control.displmnt,
        "FORCMNT": control.forcmnt,
        "UNIFORM": control.uniform,
        "WIND": control.wind,
        "OFFSETS": control.offsets,
        "ALLOWBLS": control.allowbls,
        "SIF&TEES": control.sif_tees,
        "REDUCERS": control.nored,
        "FLANGES": control.numflg,
        "EQUIPMNT": control.equipmnt,
    }


def _raise_report_errors(report, phase: str) -> None:
    if report.ok:
        return
    messages = [
        f"{issue.code}[{issue.section}]: {issue.message}"
        for issue in report.issues
        if issue.severity == "error"
    ]
    raise CiiStructureError(f"{phase} CII v11 structure validation failed: " + " | ".join(messages))


def _validate_miscel_execution_fixed_fields(
    sections: Mapping[str, Sequence[str]], *, phase: str
) -> None:
    rows = list(sections.get("MISCEL_1", []))
    if len(rows) < len(_MISCEL_EXECUTION_INT_SLOTS):
        raise CiiStructureError(
            f"{phase} CII MISCEL_1 has {len(rows)} rows; four execution-option rows are required."
        )

    execution = rows[-len(_MISCEL_EXECUTION_INT_SLOTS):]
    for execution_row, (line, integer_slots) in enumerate(
        zip(execution, _MISCEL_EXECUTION_INT_SLOTS), 1
    ):
        if "\t" in line:
            raise CiiStructureError(
                f"{phase} CII MISCEL_1 execution row {execution_row} contains TAB; fixed columns require spaces."
            )
        if line[:_MISCEL_LEADING_X].strip():
            raise CiiStructureError(
                f"{phase} CII MISCEL_1 execution row {execution_row} violates the FORTRAN 2X prefix."
            )

        field_count = 1 if execution_row == 4 else 6
        expected_width = _MISCEL_LEADING_X + field_count * _MISCEL_FIELD_WIDTH
        if len(line) < expected_width:
            raise CiiStructureError(
                f"{phase} CII MISCEL_1 execution row {execution_row} is {len(line)} columns; "
                f"expected at least {expected_width}."
            )
        if len(line) > expected_width and line[expected_width:].strip():
            raise CiiStructureError(
                f"{phase} CII MISCEL_1 execution row {execution_row} has nonblank overflow "
                f"beyond column {expected_width}."
            )

        for slot in integer_slots:
            start = _MISCEL_LEADING_X + slot * _MISCEL_FIELD_WIDTH
            token = line[start:start + _MISCEL_FIELD_WIDTH].strip()
            if token and _INT_TOKEN_RE.fullmatch(token) is None:
                raise CiiStructureError(
                    f"{phase} CII MISCEL_1 execution row {execution_row}, slot {slot + 1} "
                    f"must be lexical I13 integer data; got {token!r}."
                )


def validate_v11_text(text: str, *, phase: str) -> None:
    """Validate a v11/2019 file with the repository's independent section rules."""
    _raise_report_errors(cii11.validate_cii2019_sections(text), phase)
    _validate_miscel_execution_fixed_fields(cii11.parse_section_map(text), phase=phase)


def _require_v14_sections(
    sections: Mapping[str, Sequence[str]],
    order: Sequence[str],
    *,
    phase: str,
) -> cii11.ControlCounts:
    missing = sorted(cii11.REQUIRED_SECTIONS_2019 - set(order))
    if missing:
        raise CiiStructureError(
            f"{phase} CII v14 is missing required sections: {', '.join(missing)}"
        )
    duplicates = sorted(name for name in set(order) if order.count(name) > 1)
    if duplicates:
        raise CiiStructureError(
            f"{phase} CII v14 has duplicate sections: {', '.join(duplicates)}"
        )

    expected_index = {name: index for index, name in enumerate(cii11.SECTION_ORDER_2019)}
    last = -1
    for name in order:
        if name not in expected_index:
            raise CiiStructureError(f"{phase} CII v14 has unsupported section #$ {name}.")
        index = expected_index[name]
        if index < last:
            raise CiiStructureError(f"{phase} CII v14 section order is invalid at #$ {name}.")
        last = index

    try:
        return cii11.parse_control_counts(sections.get("CONTROL", []))
    except ValueError as exc:
        raise CiiStructureError(f"{phase} CII v14 CONTROL is malformed: {exc}") from exc


def validate_v14_text(text: str, *, phase: str) -> None:
    """Validate the v14 record envelope before attempting a downgrade.

    The section sequence and most block sizes remain aligned with v11.  The
    qualified structural deltas are ALLOWBLS=28 rows, SIF&TEES=14 rows and
    REDUCERS=2 rows per CONTROL block.
    """
    sections = cii11.parse_section_map(text)
    order = cii11.parse_section_order(text)
    control = _require_v14_sections(sections, order, phase=phase)

    expected_elements = control.numelt * cii11.ELEMENT_LINES_PER_BLOCK
    actual_elements = len(sections.get("ELEMENTS", []))
    if actual_elements != expected_elements:
        raise CiiStructureError(
            f"{phase} CII v14 ELEMENTS rows={actual_elements}; "
            f"expected {expected_elements} ({control.numelt} x {cii11.ELEMENT_LINES_PER_BLOCK})."
        )

    for name, rows_per_block in V14_AUX_ROWS.items():
        expected = _control_block_counts(control)[name] * rows_per_block
        actual = len(sections.get(name, []))
        if actual != expected:
            raise CiiStructureError(
                f"{phase} CII v14 #$ {name} rows={actual}; expected {expected} "
                f"({_control_block_counts(control)[name]} x {rows_per_block})."
            )

    units = len(sections.get("UNITS", []))
    if units != cii11.UNITS_TOTAL_LINES:
        raise CiiStructureError(
            f"{phase} CII v14 UNITS rows={units}; expected {cii11.UNITS_TOTAL_LINES}."
        )

    # MISCEL_1 retained its CONTROL-driven minimum contract in the qualified
    # paired profile; reuse the established lower-bound/RRMAT checks here, then
    # independently validate the mixed execution-option integer fields.
    miscel_report = cii11.validate_miscel_1(sections, control, order)
    _raise_report_errors(miscel_report, f"{phase} v14/MISCEL_1")
    _validate_miscel_execution_fixed_fields(sections, phase=phase)

    coords = list(sections.get("COORDS", []))
    if coords:
        try:
            declared = int(round(float(coords[0].strip())))
        except ValueError as exc:
            raise CiiStructureError(f"{phase} CII v14 COORDS count is malformed.") from exc
        if len(coords) != declared + 1:
            raise CiiStructureError(
                f"{phase} CII v14 COORDS declares {declared} nodes but contains {len(coords) - 1} rows."
            )


def validate_text_for_version(text: str, version: int, *, phase: str) -> None:
    if version == 11:
        validate_v11_text(text, phase=phase)
        return
    if version == 14:
        validate_v14_text(text, phase=phase)
        return
    raise CiiStructureError(f"Unsupported CII version {version} for structure validation.")