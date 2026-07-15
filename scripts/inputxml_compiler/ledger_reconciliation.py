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


def _explicit_node_evidence(
    elements: list[ET._Element],
    ledger: DecisionLedger,
    context: dict[str, Any],
) -> None:
    evidence_map = context.get("assuredNodeEvidence") or {}
    if not isinstance(evidence_map, dict):
        raise CompileBlocked("assuredNodeEvidence must be an object keyed by canonical node number.")
    field_map = {
        "name": ("NAME", "NODENAME"),
        "x": ("X", "COORDS"),
        "y": ("Y", "COORDS"),
        "z": ("Z", "COORDS"),
    }
    for element in elements:
        element_id = str(element.get("ID") or "")
        for endpoint, node_attr in (("FROM", "FROM_NODE"), ("TO", "TO_NODE")):
            node = str(int(Decimal(element.get(node_attr)))) if element.get(node_attr) else ""
            node_evidence = evidence_map.get(node)
            if node_evidence is None:
                continue
            if not isinstance(node_evidence, dict):
                raise CompileBlocked(f"assuredNodeEvidence[{node!r}] must be an object.")
            for source_field, (suffix, section) in field_map.items():
                canonical_field = f"{endpoint}_{suffix}"
                if element.get(canonical_field) not in (None, ""):
                    continue
                value = node_evidence.get(source_field)
                if value in (None, ""):
                    continue
                if suffix == "NAME":
                    canonical_value = str(value).strip()
                    if not canonical_value:
                        continue
                else:
                    canonical_value = _decimal_text(value, f"assuredNodeEvidence[{node}]/{source_field}")
                element.set(canonical_field, canonical_value)
                ledger.add(
                    source_entity_id=f"compiler-context/assuredNodeEvidence/{node}@{source_field}",
                    source_type="EXPLICIT_ASSURED_NODE_EVIDENCE",
                    source_fields={"node": node, source_field: value},
                    canonical_element_ids=[element_id],
                    canonical_node_ids=[node],
                    inputxml_element_ids=[element_id],
                    cii_section=section,
                    projection_cardinality="1_TO_1",
                    disposition="EMIT_1_TO_1",
                    evidence=["explicit caller-supplied assuredNodeEvidence; no node name or coordinate inference"],
                    confidence={
                        "identity": 1.0,
                        "topology": 1.0,
                        "geometry": 1.0,
                        "dimensions": 1.0,
                        "attributes": 1.0,
                        "ciiProjection": 1.0,
                    },
                )


def reconcile_decision_ledger(
    canonical: ET._Element,
    ledger: DecisionLedger,
    *,
    context: dict[str, Any] | None = None,
) -> None:
    """Finalize producer ledger semantics after canonical normalization.

    This never infers engineering values. It performs three explicit corrections:

    - parser/topology-only decisions become evidence-only;
    - authoritative bridge document rows receive the actual post-normalization
      InputXML element IDs and nodes emitted by the canonical compiler;
    - missing endpoint names/coordinates may be completed only from explicit
      caller-supplied ``assuredNodeEvidence`` and are ledgered field by field.
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
            record["canonicalElementIds"] = []
            record["canonicalNodeIds"] = []
            record["InputXMLElementIds"] = []
            record["CIISection"] = None
            evidence = list(record.get("evidence") or [])
            evidence.append("source-only parser/topology decision; emitted element records own InputXML/CII projection")
            record["evidence"] = evidence
            diagnostics = list(record.get("diagnostics") or [])
            diagnostics.append("retained as evidence only; no direct CII index is claimed")
            record["diagnostics"] = diagnostics

        if str(record.get("sourceType") or "") in _BRIDGE_DOCUMENT_TYPES:
            record["canonicalElementIds"] = element_ids
            record["canonicalNodeIds"] = node_ids
            record["InputXMLElementIds"] = element_ids
            record["CIISection"] = "ELEMENTS"
            evidence = list(record.get("evidence") or [])
            evidence.append("post-normalization canonical IDs resolved by ledger reconciliation")
            record["evidence"] = evidence

    _explicit_node_evidence(elements, ledger, context or {})


__all__ = [name for name in globals() if not name.startswith("__")]
