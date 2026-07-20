#!/usr/bin/env python3
"""Explicit intake contracts for PR-6 Root topology profiles."""
from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from typing import Any

from lxml import etree as ET

from .base import CompileBlocked, DecisionLedger
from .xml import _local, _namespace


@dataclass(frozen=True)
class TopologyProfileContract:
    profile_id: str
    adapter_id: str
    extension_name: str
    document_source_type: str
    explicit_selection_required: bool
    required_context: tuple[str, ...]
    optional_context: tuple[str, ...]


TOPOLOGY_PROFILE_CONTRACTS = {
    "xml-builder-root-branch-node": TopologyProfileContract(
        profile_id="xml-builder-root-branch-node",
        adapter_id="xml-cii-node-to-canonical",
        extension_name="XmlBuilderSourceDocument",
        document_source_type="XML_BUILDER_ROOT_DOCUMENT",
        explicit_selection_required=False,
        required_context=("version", "jobName", "north"),
        optional_context=(
            "time",
            "issueNo",
            "rigidWeightScale",
            "fluidDensityScale",
        ),
    ),
    "seljson-custom-root": TopologyProfileContract(
        profile_id="seljson-custom-root",
        adapter_id="seljson-custom-model-to-canonical",
        extension_name="SelectionJsonSourceDocument",
        document_source_type="SELECTIONJSON_CUSTOM_ROOT_DOCUMENT",
        explicit_selection_required=True,
        required_context=("version", "jobName", "north"),
        optional_context=(
            "time",
            "issueNo",
            "rigidWeightScale",
            "fluidDensityScale",
        ),
    ),
}


_KNOWN_ROOT_METADATA = {
    "Producer",
    "Profile",
    "SourceIdentity",
    "SelectionJsonSourceIds",
}


def get_topology_profile(profile_id: str) -> TopologyProfileContract:
    try:
        return TOPOLOGY_PROFILE_CONTRACTS[profile_id]
    except KeyError as exc:
        raise CompileBlocked(f"Unknown Root topology profile {profile_id!r}.") from exc


def validate_topology_profile_intake(
    *,
    profile_id: str,
    root: ET._Element | None,
    context: dict[str, Any],
    explicit_override: bool,
    ledger: DecisionLedger,
) -> None:
    profile = get_topology_profile(profile_id)
    if root is None or _namespace(root.tag) != "" or _local(root.tag) != "Root":
        _block(
            ledger,
            "ROOT_PROFILE_MISMATCH",
            f"{profile_id} requires one unqualified Root document.",
            "/Root[1]",
        )
    if profile.explicit_selection_required and not explicit_override:
        _block(
            ledger,
            "SELECTIONJSON_IDENTITY_REQUIRED",
            "SelectionJSON custom Root requires explicit registered profile selection.",
            "/Root[1]",
        )
    _validate_context(profile, context, ledger)
    _validate_root_structure(root, profile, ledger)
    _validate_profile_metadata(root, profile, ledger)
    ledger.add(
        source_entity_id="/Root[1]",
        source_type="TOPOLOGY_PROFILE_INTAKE",
        source_fields={
            "profileId": profile.profile_id,
            "adapterId": profile.adapter_id,
            "explicitOverride": explicit_override,
        },
        projection_cardinality="1_TO_0",
        disposition="PRESERVE_EXTENSION",
        evidence=["profile predicate validated before strict topology resolution"],
    )


def _validate_context(
    profile: TopologyProfileContract,
    context: dict[str, Any],
    ledger: DecisionLedger,
) -> None:
    allowed = set(profile.required_context) | set(profile.optional_context) | {
        "nodeExecutable"
    }
    undeclared = sorted(key for key in context if key not in allowed)
    if undeclared:
        _block(
            ledger,
            "HIDDEN_DEFAULT_PROHIBITED",
            f"Undeclared Root topology context keys are prohibited: {undeclared}.",
            "compiler-context",
        )
    for key in profile.required_context:
        if key not in context or context[key] in (None, "", []):
            _block(
                ledger,
                "HIDDEN_DEFAULT_PROHIBITED",
                f"{profile.profile_id} requires explicit context authority for {key}.",
                f"compiler-context@{key}",
            )
    version = str(context.get("version") or "").strip()
    job_name = str(context.get("jobName") or "").strip()
    if not version or not job_name:
        _block(
            ledger,
            "HIDDEN_DEFAULT_PROHIBITED",
            "Version and jobName must be nonblank lexical values.",
            "compiler-context",
        )
    north = context.get("north")
    if not isinstance(north, (list, tuple)) or len(north) != 3:
        _block(
            ledger,
            "COORDINATE_FRAME_UNRESOLVED",
            "north must be an explicit three-value vector.",
            "compiler-context@north",
        )
    try:
        values = [Decimal(str(value)) for value in north]
    except (InvalidOperation, ValueError) as exc:
        raise CompileBlocked("north contains a non-decimal value.") from exc
    if not all(value.is_finite() for value in values):
        _block(
            ledger,
            "COORDINATE_FRAME_UNRESOLVED",
            "north contains a non-finite value.",
            "compiler-context@north",
        )
    magnitude = sum(value * value for value in values)
    if not Decimal("0.9") < magnitude < Decimal("1.1"):
        _block(
            ledger,
            "COORDINATE_FRAME_UNRESOLVED",
            f"north vector magnitude squared must be approximately one, got {magnitude}.",
            "compiler-context@north",
        )
    for key in ("rigidWeightScale", "fluidDensityScale"):
        if key not in context:
            continue
        try:
            value = Decimal(str(context[key]))
        except InvalidOperation as exc:
            raise CompileBlocked(f"{key} must be a finite decimal.") from exc
        if not value.is_finite() or value <= 0:
            _block(
                ledger,
                "HIDDEN_DEFAULT_PROHIBITED",
                f"{key} must be a finite positive decimal.",
                f"compiler-context@{key}",
            )


def _validate_root_structure(
    root: ET._Element,
    profile: TopologyProfileContract,
    ledger: DecisionLedger,
) -> None:
    direct_branches = [
        child
        for child in root
        if _namespace(child.tag) == "" and _local(child.tag) == "Branch"
    ]
    if not direct_branches:
        _block(
            ledger,
            "ROOT_STRUCTURE_INVALID",
            "Root requires one or more direct unqualified Branch occurrences.",
            "/Root[1]",
        )
    for element in root.iterdescendants():
        if _namespace(element.tag) != "":
            _block(
                ledger,
                "ROOT_STRUCTURE_INVALID",
                "Namespace-qualified Root topology evidence is not accepted.",
                "/Root[1]",
            )
        if _local(element.tag) == "Branch" and element.getparent() is not root:
            _block(
                ledger,
                "ROOT_STRUCTURE_INVALID",
                "Branch occurrences must be direct children of Root.",
                "/Root[1]",
            )
    for index, branch in enumerate(direct_branches, 1):
        nodes = [child for child in branch if _local(child.tag) == "Node"]
        if not nodes:
            _block(
                ledger,
                "ROOT_STRUCTURE_INVALID",
                f"Branch occurrence {index} contains no direct Node occurrences.",
                f"/Root[1]/Branch[{index}]",
            )
        for node in branch.iterdescendants("Node"):
            if node.getparent() is not branch:
                _block(
                    ledger,
                    "ROOT_STRUCTURE_INVALID",
                    "Node occurrences must be direct children of their Branch.",
                    f"/Root[1]/Branch[{index}]",
                )


def _validate_profile_metadata(
    root: ET._Element,
    profile: TopologyProfileContract,
    ledger: DecisionLedger,
) -> None:
    values = {
        _local(child.tag): (child.text or "").strip()
        for child in root
        if _local(child.tag) in _KNOWN_ROOT_METADATA
    }
    profile_value = values.get("Profile", "")
    if profile_value and profile_value != profile.profile_id:
        _block(
            ledger,
            "ROOT_PROFILE_MISMATCH",
            f"Root Profile={profile_value!r} contradicts selected {profile.profile_id!r}.",
            "/Root[1]/Profile[1]",
        )
    if profile.profile_id == "xml-builder-root-branch-node" and values.get(
        "SelectionJsonSourceIds"
    ):
        _block(
            ledger,
            "ROOT_PROFILE_MISMATCH",
            "SelectionJSON producer metadata contradicts XML Builder profile selection.",
            "/Root[1]/SelectionJsonSourceIds[1]",
        )


def _block(
    ledger: DecisionLedger,
    code: str,
    message: str,
    source_entity_id: str,
) -> None:
    ledger.diagnostic("BLOCKING", code, message, source_entity_id)
    raise CompileBlocked(message)


__all__ = [
    "TOPOLOGY_PROFILE_CONTRACTS",
    "TopologyProfileContract",
    "get_topology_profile",
    "validate_topology_profile_intake",
]
