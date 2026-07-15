from __future__ import annotations

from .base import *
from .xml import *

# These records prove parser/topology decisions but do not themselves own an
# InputXML/CII field. Their downstream elements carry the actual projection.
_SOURCE_ONLY_DISPOSITIONS = {
    ("PDF_INPUT_ECHO", "PARSE_AUTHORITATIVE_INPUT_ECHO_GRAMMAR"),
    ("UXML_ACCEPTED_CONNECTION", "ACCEPT_TOPOLOGY_CONNECTION"),
}


def reconcile_decision_ledger(canonical: ET._Element, ledger: DecisionLedger) -> None:
    """Make source-only evidence explicit after an adapter builds canonical XML.

    This does not infer engineering ownership. It only converts two named
    producer decisions, whose role is parser/topology evidence, into the
    repository's explicit evidence-only disposition. Emitted element records
    remain responsible for canonical and CII ownership.
    """
    for record in ledger.records:
        key = (str(record.get("sourceType") or ""), str(record.get("disposition") or ""))
        if key not in _SOURCE_ONLY_DISPOSITIONS:
            continue
        record["projectionCardinality"] = "1_TO_0"
        record["disposition"] = "PRESERVE_EXTENSION"
        evidence = list(record.get("evidence") or [])
        evidence.append("source-only parser/topology decision; emitted element records own InputXML/CII projection")
        record["evidence"] = evidence
        diagnostics = list(record.get("diagnostics") or [])
        diagnostics.append("retained as evidence only; no direct CII index is claimed")
        record["diagnostics"] = diagnostics


__all__ = [name for name in globals() if not name.startswith("__")]
