#!/usr/bin/env python3
"""Deterministic source-inventory and accounting proof for PR-5 profiles."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from lxml import etree as ET

from .base import DecisionLedger
from .xml import _local, _namespace


@dataclass(frozen=True)
class SourceInventoryItem:
    source_entity_id: str
    parent_source_entity_id: str | None
    source_type: str
    source_fields: dict[str, Any]


def account_profile_source(
    root: ET._Element,
    *,
    profile_id: str,
    ledger: DecisionLedger,
) -> tuple[str, dict[str, Any]]:
    inventory = build_source_inventory(root)
    accounted: list[str] = []
    for item in inventory:
        ledger.add(
            source_entity_id=item.source_entity_id,
            source_type="SOURCE_ACCOUNTING_INDEX",
            source_fields={
                "profileId": profile_id,
                "entityType": item.source_type,
                "parentSourceEntityId": item.parent_source_entity_id,
                "source": item.source_fields,
                "relation": "ACCOUNTING_INDEX_FOR_PROFILE_TRANSFORMATION",
            },
            projection_cardinality="ACCOUNTING_ONLY",
            disposition="PRESERVE_EXTENSION",
            evidence=[
                "deterministic source inventory identity retained; transformation decisions are separate ledger records"
            ],
        )
        accounted.append(item.source_entity_id)
    unique_inventory = {item.source_entity_id for item in inventory}
    unique_accounted = set(accounted)
    missing = sorted(unique_inventory - unique_accounted)
    duplicate_count = len(accounted) - len(unique_accounted)
    status = "COMPLETE" if not missing and duplicate_count == 0 else "BLOCKED"
    proof = {
        "schema": "InputXmlSourceAccountingProof.v1",
        "profileId": profile_id,
        "inventoryCount": len(inventory),
        "uniqueInventoryCount": len(unique_inventory),
        "accountedCount": len(accounted),
        "uniqueAccountedCount": len(unique_accounted),
        "missingSourceEntityIds": missing,
        "duplicateAccountingCount": duplicate_count,
        "status": status,
    }
    ledger.add(
        source_entity_id="source-accounting-proof",
        source_type="SOURCE_ACCOUNTING_PROOF",
        source_fields=proof,
        projection_cardinality="ACCOUNTING_SUMMARY",
        disposition="EMIT_1_TO_1" if status == "COMPLETE" else "REJECT_INVALID",
        evidence=["source inventory and accounting identities reconciled exactly"],
        diagnostics=[] if status == "COMPLETE" else ["source accounting is incomplete"],
    )
    if status != "COMPLETE":
        ledger.diagnostic(
            "BLOCKING",
            "SOURCE_ACCOUNTING_INCOMPLETE",
            "Source inventory could not be reconciled completely.",
            "source-accounting-proof",
            proof=proof,
        )
    return status, proof


def build_source_inventory(root: ET._Element) -> tuple[SourceInventoryItem, ...]:
    items: list[SourceInventoryItem] = []

    def visit(
        element: ET._Element,
        path: str,
        parent_path: str | None,
    ) -> None:
        items.append(
            SourceInventoryItem(
                source_entity_id=path,
                parent_source_entity_id=parent_path,
                source_type=f"ELEMENT:{{{_namespace(element.tag)}}}{_local(element.tag)}",
                source_fields={
                    "attributes": dict(element.attrib),
                    "text": (element.text or "").strip(),
                    "childCount": len(element),
                },
            )
        )
        for attribute_name in element.attrib:
            items.append(
                SourceInventoryItem(
                    source_entity_id=f"{path}@{attribute_name}",
                    parent_source_entity_id=path,
                    source_type="ATTRIBUTE",
                    source_fields={attribute_name: element.get(attribute_name)},
                )
            )
        occurrences: dict[tuple[str, str], int] = {}
        for child in element:
            key = (_namespace(child.tag), _local(child.tag))
            occurrences[key] = occurrences.get(key, 0) + 1
            namespace, local = key
            qname = f"{{{namespace}}}{local}" if namespace else local
            visit(
                child,
                f"{path}/{qname}[{occurrences[key]}]",
                path,
            )

    root_name = _local(root.tag)
    root_ns = _namespace(root.tag)
    root_qname = f"{{{root_ns}}}{root_name}" if root_ns else root_name
    visit(root, f"/{root_qname}[1]", None)
    return tuple(items)


__all__ = [
    "SourceInventoryItem",
    "account_profile_source",
    "build_source_inventory",
]
