"""Decision-ledger records for exact UXML/RVM authority decisions."""
from __future__ import annotations

from typing import Any


def ledger_authority_decisions(ledger: Any, topology: dict[str, Any], lines: dict[str, Any], engineering: dict[str, Any]) -> None:
    for node in topology["nodes"]:
        ledger.add(
            source_entity_id=node["logicalNodeId"], source_type="UXML_RVM_LOGICAL_NODE_DECISION",
            source_fields=node, canonical_node_ids=[str(node["engineeringNodeNumber"])],
            projection_cardinality="MANY_TO_1", disposition="PRESERVE_EXTENSION",
            evidence=[node["authority"], *node.get("evidenceReferences", [])],
        )
    for component_id, decision in sorted(lines.items()):
        ledger.add(
            source_entity_id=component_id, source_type="UXML_RVM_LINE_DECISION",
            source_fields=decision, projection_cardinality="MANY_TO_1",
            disposition="PRESERVE_EXTENSION", evidence=["all line aliases reconciled"],
        )
    for component_id, fields in sorted(engineering.items()):
        for field, decision in sorted(fields.items()):
            ledger.add(
                source_entity_id=f"{component_id}:{field}",
                source_type="UXML_RVM_ENGINEERING_FIELD_DECISION",
                source_fields={"componentId": component_id, "field": field, **decision},
                projection_cardinality="MANY_TO_1", disposition="PRESERVE_EXTENSION",
                evidence=["all source and approved external aliases reconciled"],
            )
