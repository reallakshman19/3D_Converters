"""Fail-closed exact-authority UXML/RVM resolver for canonical InputXML."""
from __future__ import annotations
import os
import shutil
from pathlib import Path
from typing import Any
from .base import *
from .counts import _new_root
from .extension import *
from .uxml_rvm_accounting import (
    accounting_is_closed, build_accounting_proof, expected_elements,
    verify_final_accounting_binding,
)
from .uxml_rvm_authority import (
    resolve_engineering, resolve_lines, resolve_topology,
    validate_engineering_context, validate_node_lines,
)
from .uxml_rvm_contracts import (
    ADAPTER, BRIDGE_TIMEOUT_SECONDS, DIALECT, MAX_STDERR_BYTES,
    MAX_STDOUT_BYTES, TOPOLOGY_SCHEMA, ContractError, build_bridge_request,
    clean, decode_source, fail, normalized_identity, require_hash,
    require_object, require_source_binding, sha256_bytes, stable_json_bytes,
    validate_canonical_metadata, validate_coordinate_context,
)
from .uxml_rvm_inventory import source_inventory, validate_topology_plan, verify_bridge_result
from .uxml_rvm_ledger import ledger_authority_decisions
from .uxml_rvm_manifest import validate_authority_manifest
from .uxml_rvm_process import BoundedProcessError, run_bounded_process
from .xml import *

SUPPORTED_COMPILER_DIALECTS.add(DIALECT)
_BRIDGE_SCRIPT = Path(__file__).with_name("node_uxml_rvm_bridge.mjs")
_EMPTY_HASH = sha256_bytes(b"")

def _prevalidate_topology(artifact: Any, source_hash: str, source_kind: str) -> tuple[dict[str, Any] | None, str]:
    if artifact in (None, {}):
        if source_kind == "RVM_ROWS":
            fail("UXML_RVM_TOPOLOGY_PLAN_MISSING", "RVM rows require an approved exact-topology plan")
        return None, _EMPTY_HASH
    plan = require_object(artifact, "UXML_RVM_TOPOLOGY_PLAN_SHAPE", "topology plan")
    if clean(plan.get("schema")) != TOPOLOGY_SCHEMA:
        fail("UXML_RVM_TOPOLOGY_PLAN_SCHEMA", f"Expected {TOPOLOGY_SCHEMA}")
    require_source_binding(plan, source_hash, source_kind, "UXML_RVM_TOPOLOGY_SOURCE_BINDING")
    return plan, require_hash(plan, "topologyPlanHashSha256", "UXML_RVM_TOPOLOGY_PLAN_HASH")

def _run_bridge(request: dict[str, Any]) -> dict[str, Any]:
    node = shutil.which("node")
    if not node:
        fail("UXML_RVM_NODE_MISSING", "UXML/RVM exact bridge requires Node.js")
    if not _BRIDGE_SCRIPT.is_file():
        fail("UXML_RVM_BRIDGE_MISSING", f"Bridge script is missing: {_BRIDGE_SCRIPT}")
    env = {"PATH": os.environ.get("PATH", ""), "NODE_NO_WARNINGS": "1"}
    try:
        completed = run_bounded_process(
            [node, str(_BRIDGE_SCRIPT)], input_bytes=stable_json_bytes(request), env=env,
            timeout_seconds=BRIDGE_TIMEOUT_SECONDS, stdout_limit=MAX_STDOUT_BYTES,
            stderr_limit=MAX_STDERR_BYTES,
        )
    except BoundedProcessError as exc:
        code = "UXML_RVM_BRIDGE_TIMEOUT" if exc.code == "TIMEOUT" else "UXML_RVM_BRIDGE_OUTPUT_LIMIT"
        fail(code, str(exc))
    try:
        stdout = completed.stdout.decode("utf-8", errors="strict")
        stderr = completed.stderr.decode("utf-8", errors="strict")
    except UnicodeDecodeError as exc:
        fail("UXML_RVM_BRIDGE_INVALID_UTF8", str(exc))
    from .uxml_rvm_contracts import strict_json_loads
    payload = strict_json_loads(stdout)
    if completed.returncode != 0:
        error = payload.get("error") if isinstance(payload, dict) else "bridge failure"
        code = payload.get("code") if isinstance(payload, dict) else "UXML_RVM_BRIDGE_FAILURE"
        fail(clean(code) or "UXML_RVM_BRIDGE_FAILURE", clean(error) or clean(stderr) or "Bridge failed")
    return verify_bridge_result(request, payload)

def _ledger_sources(
    *, source: bytes, source_kind: str, bridge: dict[str, Any], ledger: DecisionLedger,
    coordinate: dict[str, Any], plan: dict[str, Any] | None,
    engineering_context: dict[str, Any] | None, metadata: dict[str, Any],
    manifest: dict[str, Any],
) -> None:
    uxml = bridge["uxml"]
    ledger.add(
        source_entity_id="document", source_type="UXML_RVM_SOURCE_KIND_DECISION",
        source_fields={"sourceKind": source_kind, "sourceByteLength": len(source), "sourceHashSha256": _sha256(source)},
        projection_cardinality="1_TO_1", disposition="PRESERVE_EXTENSION",
        evidence=["strict registered JSON shape"],
    )
    collections = (
        ("sources", "UXML_SOURCE"), ("mappings", "UXML_MAPPING"),
        ("pipelines", "UXML_PIPELINE"), ("components", "UXML_COMPONENT"),
        ("anchors", "UXML_ANCHOR"), ("ports", "UXML_PORT"),
        ("segments", "UXML_SEGMENT"), ("supports", "UXML_SUPPORT"),
        ("topologyHints", "UXML_TOPOLOGY_HINT"),
        ("rayEvidence", "UXML_RAY_DIAGNOSTIC_EVIDENCE"),
        ("lossContract", "UXML_LOSS_CONTRACT"),
    )
    for collection, source_type in collections:
        for index, row in enumerate(uxml.get(collection) or []):
            blocking = collection in {"supports", "lossContract"}
            diagnostic = (
                "Support/restraint/hanger projection is not authorized in PR-9"
                if collection == "supports" else
                "Loss-contract evidence remains unresolved"
                if collection == "lossContract" else
                "Ray/proximity evidence is diagnostic and has zero canonical authority"
                if collection == "rayEvidence" else ""
            )
            ledger.add(
                source_entity_id=clean(row.get("id")) or f"{collection}-{index + 1}",
                source_type=source_type, source_fields=row,
                projection_cardinality="1_TO_0" if blocking else "EVIDENCE_ONLY",
                disposition="UNSUPPORTED_BLOCKING" if blocking else "PRESERVE_EXTENSION",
                diagnostics=[diagnostic] if diagnostic else [],
            )
    for index, diagnostic in enumerate(bridge.get("diagnostics") or []):
        severity = normalized_identity(diagnostic.get("severity") or "INFO")
        blocking = severity in {"ERROR", "FATAL", "BLOCKING"}
        ledger.add(
            source_entity_id=clean(diagnostic.get("id")) or f"diagnostic-{index + 1}",
            source_type="UXML_DIAGNOSTIC", source_fields=diagnostic,
            projection_cardinality="1_TO_0",
            disposition="UNSUPPORTED_BLOCKING" if blocking else "PRESERVE_EXTENSION",
        )
    for source_type, artifact in (
        ("UXML_RVM_COORDINATE_CONTEXT", coordinate),
        ("UXML_RVM_EXACT_TOPOLOGY_PLAN", plan),
        ("UXML_RVM_ENGINEERING_CONTEXT", engineering_context),
        ("UXML_RVM_CANONICAL_METADATA", metadata),
        ("UXML_RVM_AUTHORITY_MANIFEST", manifest),
    ):
        if artifact:
            ledger.add(
                source_entity_id=clean(artifact.get("authorityId")) or source_type,
                source_type=source_type, source_fields=artifact,
                projection_cardinality="1_TO_MANY", disposition="PRESERVE_EXTENSION",
            )

def _render_element(record: dict[str, Any]) -> ET._Element:
    if record["fromLogicalNodeId"] == record["toLogicalNodeId"]:
        fail("UXML_RVM_PIPE_NODE_COLLAPSE", f"PIPE {record['componentId']} endpoints share one logical node")
    if all(Decimal(record["delta"][axis]) == 0 for axis in ("x", "y", "z")):
        fail("UXML_RVM_ZERO_LENGTH_PIPE", f"PIPE {record['componentId']} is zero length after transformation")
    return ET.Element(
        "PIPINGELEMENT", ID=record["elementId"],
        FROM_NODE=str(record["fromNodeNumber"]), TO_NODE=str(record["toNodeNumber"]),
        DELTA_X=record["delta"]["x"], DELTA_Y=record["delta"]["y"], DELTA_Z=record["delta"]["z"],
        LINE=record["lineId"],
        FROM_X=record["fromCoordinate"]["x"], FROM_Y=record["fromCoordinate"]["y"], FROM_Z=record["fromCoordinate"]["z"],
        TO_X=record["toCoordinate"]["x"], TO_Y=record["toCoordinate"]["y"], TO_Z=record["toCoordinate"]["z"],
        DIAMETER=record["outsideDiameterMm"], WALL_THICK=record["wallThicknessMm"],
    )

def _preserve_digests(model: ET._Element, ledger: DecisionLedger, values: dict[str, str]) -> None:
    for name, value in values.items():
        _extension_record(
            model, producer=ledger.producer, dialect=ledger.dialect, name=name,
            source_path=ledger.source_path, source_entity_id="document", source_field=name,
            value=value, disposition="PRESERVE_EXTENSION", criticality="HIGH", confidence=1.0,
        )
    _ensure_extension_last(model)

def _model_from_metadata(metadata: dict[str, Any]) -> tuple[ET._Element, ET._Element]:
    root, model = _new_root(clean(metadata["version"]))
    model.set("JOBNAME", clean(metadata["jobName"])); model.set("TIME", clean(metadata["time"])); model.set("ISSUE_NO", clean(metadata["issueNo"]))
    for field, value in zip(("NORTH_X", "NORTH_Y", "NORTH_Z"), metadata["north"]):
        model.set(field, _decimal_text(value, field))
    return root, model

def _compile_exact(source: bytes, *, source_name: str, source_path: str, ledger: DecisionLedger, context: dict[str, Any]) -> ET._Element:
    del source_name, source_path
    _payload, source_kind = decode_source(source); source_hash = _sha256(source)
    coordinate, coordinate_hash = validate_coordinate_context(context.get("uxmlRvmCoordinateContext"), source_hash, source_kind)
    plan, topology_hash = _prevalidate_topology(context.get("uxmlRvmExactTopologyPlan"), source_hash, source_kind)
    engineering_context, engineering_hash = validate_engineering_context(context.get("uxmlRvmEngineeringContext"), source_hash, source_kind)
    engineering_hash = engineering_hash or _EMPTY_HASH
    metadata, metadata_hash = validate_canonical_metadata(context.get("uxmlRvmCanonicalMetadata"), source_hash, source_kind)
    manifest, manifest_hash = validate_authority_manifest(
        context.get("uxmlRvmAuthorityManifest"), source_hash=source_hash, source_kind=source_kind,
        coordinate_hash=coordinate_hash, topology_hash=topology_hash,
        engineering_hash=engineering_hash, metadata_hash=metadata_hash,
    )
    request = build_bridge_request(source, source_kind, coordinate_hash, topology_hash, engineering_hash, manifest_hash, metadata_hash)
    bridge = _run_bridge(request); uxml = bridge["uxml"]
    inventory = source_inventory(uxml, coordinate)
    plan, topology_hash = validate_topology_plan(
        plan, source_hash=source_hash, source_kind=source_kind,
        adapted_hash=bridge["adaptedUxmlHashSha256"], inventory=inventory,
    )
    topology = resolve_topology(uxml, inventory, plan, coordinate)
    lines = resolve_lines(uxml, inventory, plan)
    engineering = resolve_engineering(uxml, inventory, engineering_context)
    validate_node_lines(topology, inventory, lines)
    _ledger_sources(
        source=source, source_kind=source_kind, bridge=bridge, ledger=ledger,
        coordinate=coordinate, plan=plan, engineering_context=engineering_context,
        metadata=metadata, manifest=manifest,
    )
    ledger_authority_decisions(ledger, topology, lines, engineering)
    root, model = _model_from_metadata(metadata)
    unsupported = []
    for component in inventory["components"]:
        component_id = clean(component.get("id")); component_type = normalized_identity(component.get("normalizedType") or component.get("type"))
        if component_type != "PIPE":
            unsupported.append(component_id)
            ledger.add(
                source_entity_id=component_id, source_type=component_type or "UNKNOWN",
                source_fields=component, projection_cardinality="1_TO_0",
                disposition="UNSUPPORTED_BLOCKING",
                diagnostics=["Only fully qualified PIPE spans have an approved PR-9 canonical projection"],
            )
    canonical_records = expected_elements(inventory, topology, lines, engineering, coordinate)
    for record in canonical_records:
        model.append(_render_element(record))
        ledger.add(
            source_entity_id=record["componentId"], source_type="PIPE",
            source_fields=record, canonical_element_ids=[record["elementId"]],
            canonical_node_ids=[str(record["fromNodeNumber"]), str(record["toNodeNumber"])],
            inputxml_element_ids=[record["elementId"]], cii_section="ELEMENTS",
            projection_cardinality="1_TO_1", disposition="EMIT_1_TO_1",
            evidence=["exact port topology", "explicit node-number authority", "hash-bound coordinate context", "reconciled line and engineering authority"],
        )
    if not canonical_records:
        ledger.add(
            source_entity_id="document", source_type="UXML_RVM_EMPTY_PROJECTION",
            source_fields={"componentCount": len(inventory["components"])},
            projection_cardinality="MANY_TO_ZERO", disposition="UNSUPPORTED_BLOCKING",
            diagnostics=["No fully qualified PIPE span was eligible for canonical emission"],
        )
    counts = {name: 0 for name in ("NUMNOZ", "NOHGRS", "NUMBEND", "NUMRIGID", "NUMEXPJNT", "NUMREST", "NUMFORCMNT", "NUMUNFLOAD", "NUMWIND", "NUMELEOFF", "NUMALLOW", "NUMISECT")}
    counts["NUMELT"] = len(canonical_records)
    for field, value in counts.items():
        model.set(field, str(value))
    digest_values = {
        "UxmlRvmBridgeResultHash": bridge["resultHashSha256"],
        "UxmlRvmCoordinateContextHash": coordinate_hash,
        "UxmlRvmTopologyPlanHash": topology_hash,
        "UxmlRvmEngineeringContextHash": engineering_hash,
        "UxmlRvmCanonicalMetadataHash": metadata_hash,
        "UxmlRvmAuthorityManifestHash": manifest_hash,
    }
    _preserve_digests(model, ledger, digest_values)
    reparsed = ET.fromstring(ET.tostring(root, encoding="utf-8"))
    proof = build_accounting_proof(
        source_hash=source_hash, source_kind=source_kind, bridge_result=bridge, uxml=uxml,
        inventory=inventory, coordinate_hash=coordinate_hash, topology_hash=topology_hash,
        engineering_hash=engineering_hash, metadata_hash=metadata_hash, topology=topology,
        lines=lines, engineering=engineering, coordinate_context=coordinate,
        canonical_root=reparsed, ledger_records=list(ledger.records),
        unsupported_component_ids=unsupported,
        unsupported_support_ids=[clean(row.get("id")) for row in inventory["supports"]],
        metadata=metadata, expected_extension_hashes=digest_values,
    )
    ledger.add(
        source_entity_id="document", source_type="INPUTXML_UXML_RVM_SOURCE_ACCOUNTING_PROOF",
        source_fields=proof, projection_cardinality="MANY_TO_MANY",
        disposition="PRESERVE_EXTENSION" if accounting_is_closed(proof) else "REJECT_INVALID",
        diagnostics=[] if accounting_is_closed(proof) else ["Independent UXML/RVM source/XML/ledger accounting did not close"],
    )
    _preserve_digests(model, ledger, {"UxmlRvmSourceAccountingProofHash": proof["accountingProofHashSha256"]})
    if not accounting_is_closed(proof):
        fail("UXML_RVM_SOURCE_ACCOUNTING", "Independent UXML/RVM source/XML/ledger accounting did not close")
    if not verify_final_accounting_binding(root, ledger.records, proof):
        fail("UXML_RVM_ACCOUNTING_BINDING", "Final XML and ledger do not bind the accounting proof")
    return root

def _compile_uxml_rvm_source(source: bytes, *, source_name: str, source_path: str, ledger: DecisionLedger, context: dict[str, Any]) -> ET._Element:
    ledger.add(
        source_entity_id="document", source_type="UXML_RVM_SOURCE_ENVELOPE",
        source_fields={"sourceByteLength": len(source), "sourceHashSha256": _sha256(source)},
        projection_cardinality="1_TO_MANY", disposition="PRESERVE_EXTENSION",
        evidence=["exact received source bytes"],
    )
    try:
        return _compile_exact(source, source_name=source_name, source_path=source_path, ledger=ledger, context=context)
    except ContractError as exc:
        ledger.diagnostic("BLOCKING", exc.code, exc.message, "document")
        ledger.add(
            source_entity_id="document", source_type="UXML_RVM_AUTHORITY_BLOCKER",
            source_fields={"code": exc.code, "message": exc.message},
            projection_cardinality="BLOCKED", disposition="REJECT_INVALID",
            diagnostics=[exc.message],
        )
        raise CompileBlocked(str(exc)) from exc

__all__ = [name for name in globals() if not name.startswith("__")]
