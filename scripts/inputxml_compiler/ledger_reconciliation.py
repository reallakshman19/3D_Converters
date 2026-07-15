from __future__ import annotations

from .base import *
from .xml import *

# These records prove parser/topology decisions but do not themselves own an
# InputXML/CII field. Their downstream elements carry the actual projection.
_SOURCE_ONLY_DISPOSITIONS = {
    ("PDF_INPUT_ECHO", "PARSE_AUTHORITATIVE_INPUT_ECHO_GRAMMAR"),
    ("UXML_ACCEPTED_CONNECTION", "ACCEPT_TOPOLOGY_CONNECTION"),
}
_BRIDGE_DOCUMENT_TYPES = {"ROOT_BRANCH_NODE", "SELECTIONJSON_CUSTOM_ROOT"}


def _canonical_elements(canonical: ET._Element) -> list[ET._Element]:
    model = next(
        child for child in canonical
        if _namespace(child.tag) == "" and _local(child.tag) == "PIPINGMODEL"
    )
    return [
        child for child in model
        if _namespace(child.tag) == "" and _local(child.tag) == "PIPINGELEMENT"
    ]


def reconcile_decision_ledger(canonical: ET._Element, ledger: DecisionLedger) -> None:
    """Finalize producer ledger semantics after canonical normalization.

    This never infers engineering values. It does two explicit bookkeeping
    corrections:

    - parser/topology-only decisions become evidence-only;
    - authoritative bridge document rows receive the actual post-normalization
      InputXML element IDs and nodes emitted by the canonical compiler.
    """
    elements = _canonical_elements(canonical)
    element_ids = [str(element.get("ID") or "") for element in elements]
    node_ids = sorted({
        str(int(Decimal(element.get(field))))
        for element in elements for field in ("FROM_NODE", "TO_NODE")
        if element.get(field)
    })

    for record in ledger.records:
        key = (str(record.get("sourceType") or ""), str(record.get("disposition") or ""))
        if key in _SOURCE_ONLY_DISPOSITIONS:
            record["projectionCardinality"] = "1_TO_0"
            record["disposition"] = "PRESERVE_EXTENSION"
            record["CanonicalElementIds"] = []
            record["CanonicalNodeIds"] = []
            record["InputXMLElementIds"] = []
            record["CIISection"] = None
            evidence = list(record.get("evidence") or [])
            evidence.append("source-only parser/topology decision; emitted element records own InputXML/CII projection")
            record["evidence"] = evidence
            diagnostics = list(record.get("diagnostics") or [])
            diagnostics.append("retained as evidence only; no direct CII index is claimed")
            record["diagnostics"] = diagnostics

        if str(record.get("sourceType") or "") in _BRIDGE_DOCUMENT_TYPES:
            record["CanonicalElementIds"] = element_ids
            record["CanonicalNodeIds"] = node_ids
            record["InputXMLElementIds"] = element_ids
            record["CIISection"] = "ELEMENTS"
            evidence = list(record.get("evidence") or [])
            evidence.append("post-normalization canonical IDs resolved by ledger reconciliation")
            record["evidence"] = evidence


__all__ = [name for name in globals() if not name.startswith("__")]
