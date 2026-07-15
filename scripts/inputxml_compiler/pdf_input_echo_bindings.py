from __future__ import annotations

from typing import Any

from .base import DecisionLedger, ET
from .counts import _new_root
from . import pdf_input_echo as _implementation


def _compile_pdf_input_echo_source(
    source: bytes,
    *,
    source_name: str,
    ledger: DecisionLedger,
    context: dict[str, Any],
) -> ET._Element:
    _implementation._new_root = _new_root
    return _implementation._compile_pdf_input_echo_source(
        source,
        source_name=source_name,
        ledger=ledger,
        context=context,
    )


__all__ = ["_compile_pdf_input_echo_source"]
