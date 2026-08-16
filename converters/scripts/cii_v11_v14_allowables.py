#!/usr/bin/env python3
"""Semantic ALLOWBLS mapping for CAESAR II neutral-file v11/v14 conversion.

The neutral-file manuals define ALLOWBLS with FORTRAN ``(2X,6G13.6)``.
This module therefore parses six *fixed slots* per physical row.  Regex token
counts are not authoritative: a blank G13.6 field is still a logical array
position and must not shift every following allowable item to the left.
"""
from __future__ import annotations

import math
from typing import Sequence

from cii_v11_v14_format import Audit, CiiConversionError, _fmt_v11, _fmt_v14

ALLOWABLE_ROWS_V11 = 26
ALLOWABLE_ROWS_V14 = 28
ALLOWABLE_VALUES_V11 = 153
ALLOWABLE_VALUES_V14 = 168

_LEADING_X = 2
_FIELDS_PER_ROW = 6
_FIELD_WIDTH = 13
_PAYLOAD_WIDTH = _FIELDS_PER_ROW * _FIELD_WIDTH
_ZERO_TOL = 1e-12


def _loss_or_raise(message: str, allow_lossy: bool, audit: Audit) -> None:
    if not allow_lossy:
        raise CiiConversionError(
            message
            + " Re-run with --allow-lossy to discard only unsupported extension data explicitly."
        )
    audit.loss_events.append(message)


def _parse_g13_6_row(
    line: str,
    *,
    section: str,
    record_index: int,
    row_index: int,
) -> list[float | None]:
    """Parse one ``2X,6G13.6`` row without losing blank field positions."""
    if "\t" in line:
        raise CiiConversionError(
            f"{section} record {record_index}, row {row_index} contains TAB; fixed-column CII requires spaces."
        )

    # 2X is part of the record contract.  Missing trailing characters are
    # interpreted only as blank trailing fixed fields; nonblank overflow is an
    # error because it cannot belong to any of the six G13.6 slots.
    prefix = line[:_LEADING_X]
    if prefix.strip():
        raise CiiConversionError(
            f"{section} record {record_index}, row {row_index} violates FORTRAN 2X prefix."
        )
    payload = line[_LEADING_X:]
    if len(payload) > _PAYLOAD_WIDTH and payload[_PAYLOAD_WIDTH:].strip():
        raise CiiConversionError(
            f"{section} record {record_index}, row {row_index} has nonblank data beyond six G13.6 fields."
        )
    payload = payload[:_PAYLOAD_WIDTH].ljust(_PAYLOAD_WIDTH)

    slots: list[float | None] = []
    for slot_index in range(_FIELDS_PER_ROW):
        start = slot_index * _FIELD_WIDTH
        raw = payload[start:start + _FIELD_WIDTH]
        token = raw.strip()
        if not token:
            slots.append(None)
            continue
        try:
            value = float(token.replace("D", "E").replace("d", "e"))
        except ValueError as exc:
            item_no = (row_index - 1) * _FIELDS_PER_ROW + slot_index + 1
            raise CiiConversionError(
                f"{section} record {record_index}, row {row_index}, slot {slot_index + 1} "
                f"(item {item_no}) is not a valid G13.6 real: {token!r}."
            ) from exc
        if not math.isfinite(value):
            item_no = (row_index - 1) * _FIELDS_PER_ROW + slot_index + 1
            raise CiiConversionError(
                f"{section} record {record_index}, item {item_no} is non-finite: {token!r}."
            )
        slots.append(value)
    return slots


def _render_g13_6_row(values: Sequence[float | None], target: int) -> str:
    if not 1 <= len(values) <= _FIELDS_PER_ROW:
        raise CiiConversionError("ALLOWBLS row must contain between 1 and 6 fixed slots.")
    formatter = _fmt_v11 if target == 11 else _fmt_v14
    cells = [" " * _LEADING_X]
    for value in values:
        if value is None:
            cells.append(" " * _FIELD_WIDTH)
            continue
        token = formatter(float(value))
        if len(token) > _FIELD_WIDTH:
            raise CiiConversionError(
                f"ALLOWBLS numeric token {token!r} exceeds G13.6 field width {_FIELD_WIDTH}."
            )
        cells.append(token.rjust(_FIELD_WIDTH))
    return "".join(cells)


def _parse_allowable_record(
    rows: Sequence[str],
    *,
    source: int,
    record_index: int,
) -> tuple[list[float | None], list[int]]:
    expected_rows = ALLOWABLE_ROWS_V11 if source == 11 else ALLOWABLE_ROWS_V14
    if len(rows) != expected_rows:
        raise CiiConversionError(
            f"ALLOWBLS v{source} record {record_index} has {len(rows)} rows; expected {expected_rows}."
        )

    physical: list[float | None] = []
    for row_index, line in enumerate(rows, 1):
        physical.extend(
            _parse_g13_6_row(
                line,
                section="ALLOWBLS",
                record_index=record_index,
                row_index=row_index,
            )
        )

    if source == 14:
        logical = physical
        if len(logical) != ALLOWABLE_VALUES_V14:
            raise CiiConversionError(
                f"ALLOWBLS v14 record {record_index} resolved to {len(logical)} fixed slots; "
                f"expected {ALLOWABLE_VALUES_V14}."
            )
    else:
        # 26 x 6 physical slots exist, but only items 1-153 belong to the legacy
        # ALL array.  Physical slots 154-156 are padding and must be blank/zero.
        logical = physical[:ALLOWABLE_VALUES_V11]
        padding = physical[ALLOWABLE_VALUES_V11:]
        if any(value is not None and abs(value) >= _ZERO_TOL for value in padding):
            raise CiiConversionError(
                f"ALLOWBLS v11 record {record_index} has non-zero physical padding after item 153; "
                "the legacy array mapping is ambiguous."
            )

    blank_items = [index + 1 for index, value in enumerate(logical) if value is None]
    return logical, blank_items


def _render_allowable_record(values: Sequence[float | None], target: int) -> list[str]:
    expected = ALLOWABLE_VALUES_V11 if target == 11 else ALLOWABLE_VALUES_V14
    if len(values) != expected:
        raise CiiConversionError(
            f"Internal ALLOWBLS target mapping has {len(values)} items; expected {expected} for v{target}."
        )
    return [
        _render_g13_6_row(values[offset:offset + _FIELDS_PER_ROW], target)
        for offset in range(0, len(values), _FIELDS_PER_ROW)
    ]


def _convert_allowables(
    lines: Sequence[str],
    source: int,
    target: int,
    allow_lossy: bool,
    audit: Audit,
) -> list[str]:
    """Map ALLOWBLS by logical fixed-field item identity, not regex token count."""
    if not lines:
        return []
    if source not in (11, 14) or target not in (11, 14):
        raise CiiConversionError("ALLOWBLS conversion supports only CII v11 and v14.")

    source_rows = ALLOWABLE_ROWS_V11 if source == 11 else ALLOWABLE_ROWS_V14
    if len(lines) % source_rows:
        raise CiiConversionError(
            f"ALLOWBLS payload has {len(lines)} rows; expected a multiple of {source_rows} for v{source}."
        )

    out: list[str] = []
    for record_index, base in enumerate(range(0, len(lines), source_rows), 1):
        rows = list(lines[base:base + source_rows])
        logical, blank_items = _parse_allowable_record(
            rows,
            source=source,
            record_index=record_index,
        )

        if blank_items:
            preview = ", ".join(str(item) for item in blank_items[:12])
            suffix = "..." if len(blank_items) > 12 else ""
            audit.warnings.append(
                f"ALLOWBLS record {record_index} contains {len(blank_items)} blank fixed field(s) "
                f"at item(s) {preview}{suffix}; positions are preserved and are not re-indexed."
            )

        if source == 14 and target == 11:
            legacy = logical[:ALLOWABLE_VALUES_V11]
            extension = logical[ALLOWABLE_VALUES_V11:ALLOWABLE_VALUES_V14]
            nonzero_extension = [
                index + 154
                for index, value in enumerate(extension)
                if value is not None and abs(value) >= _ZERO_TOL
            ]
            if nonzero_extension:
                preview = ", ".join(str(item) for item in nonzero_extension[:12])
                suffix = "..." if len(nonzero_extension) > 12 else ""
                _loss_or_raise(
                    f"ALLOWBLS record {record_index} contains non-zero v14-only item(s) {preview}{suffix}; "
                    "v11 has storage only for items 1-153.",
                    allow_lossy,
                    audit,
                )
            out.extend(_render_allowable_record(legacy, 11))
            continue

        if source == 11 and target == 14:
            # Extension items 154-168 have no legacy source.  Write qualified
            # zeros while preserving every legacy blank/numeric slot in place.
            upgraded = list(logical) + [0.0] * (ALLOWABLE_VALUES_V14 - ALLOWABLE_VALUES_V11)
            out.extend(_render_allowable_record(upgraded, 14))
            continue

        out.extend(rows)

    return out


__all__ = [
    "ALLOWABLE_ROWS_V11",
    "ALLOWABLE_ROWS_V14",
    "ALLOWABLE_VALUES_V11",
    "ALLOWABLE_VALUES_V14",
    "_convert_allowables",
    "_parse_allowable_record",
    "_parse_g13_6_row",
    "_render_g13_6_row",
]
