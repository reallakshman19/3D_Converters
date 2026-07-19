from .base import *
from .xml import *
from .extension import *
from .counts import *
from .children import *
from .elements import *
from .family import *
from .model import *
from .categorized import *
from .validation import *
from .xml_builder import *
from .seljson import *
from .managed_stage import *
from .pdf_input_echo import *
from .pdf_input_echo_bindings import *
from .uxml_rvm import *
from .ledger_reconciliation import *
from .contract_bundle import *
from .state_machine import CompilerState, CompilerStage
from .dispatcher import resolve_registered_profile
from .resolver_contract import OutcomeKind


def _json_dialect(source: bytes, dialect_override: str | None) -> str:
    if dialect_override:
        return dialect_override
    try:
        payload = json.loads(source.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise CompileBlocked(f"JSON intake could not be parsed: {exc}") from exc
    candidate = payload.get("uxml") if isinstance(payload, dict) and isinstance(payload.get("uxml"), dict) else payload
    if isinstance(candidate, dict) and candidate.get("schemaVersion") == "uxml-topology-v1":
        return "uxml-rvm-intake"
    if isinstance(payload, dict) and any(key in payload for key in ("rvmRows", "rows", "inputKind")):
        return "uxml-rvm-intake"
    return "managed-stage-json"


def compile_document(
    source: bytes,
    *,
    source_name: str,
    source_repository: str,
    source_path: str,
    producer: str,
    registry_path: Path,
    alias_registry_path: Path,
    canonical_xsd_path: Path,
    categorized_xsd_path: Path,
    semantic_rules_path: Path,
    adapter_registry_path: Path | None = None,
    dialect_override: str | None = None,
    context: dict[str, Any] | None = None,
) -> tuple[ET._Element | None, dict[str, Any], dict[str, Any]]:
    context = context or {}
    source_hash = _sha256(source)
    ledger = DecisionLedger(
        source_repository,
        source_path,
        producer,
        dialect_override or "unresolved",
    )
    state = CompilerState()
    
    validation: dict[str, Any] = {
        "schema": "InputXmlCanonicalValidation.v1",
        "dialect": dialect_override or "unresolved",
        "status": "FAILED",
        "blockedAt": None,
        "completedStages": [],
        "contractBundle": None,
        "xsdErrors": [],
        "semanticErrors": [],
        "diagnostics": [],
        "orchestration": state.as_orchestration_dict(),
    }

    def _update_validation() -> None:
        validation["completedStages"] = state.completed_stages
        validation["blockedAt"] = state.blocked_at
        validation["status"] = state.terminal_status or "FAILED"
        validation["orchestration"] = state.as_orchestration_dict()
        validation["diagnostics"] = ledger.diagnostics

    try:
        try:
            bundle = verify_contract_bundle(
                registry_path,
                adapter_registry_path,
                runtime_supported_dialects=SUPPORTED_COMPILER_DIALECTS,
            )
        except ContractBundleError as exc:
            ledger.add(
                source_entity_id="contract-bundle",
                source_type="CONTRACT_BUNDLE",
                source_fields={
                    "dialectRegistry": str(registry_path),
                    "adapterRegistry": str(
                        adapter_registry_path
                        or registry_path.parent / "compiler" / "inputxml-compiler-adapters.json"
                    ),
                },
                disposition="REJECT_INVALID",
                diagnostics=[str(exc)],
            )
            ledger.diagnostic(
                "BLOCKING",
                "CONTRACT_BUNDLE_INVALID",
                str(exc),
            )
            state.block("CONTRACT_BUNDLE_GATE")
            validation["contractBundle"] = {"status": "BLOCKED", "error": str(exc)}
            _update_validation()
            return None, ledger.as_dict(source_hash, None), validation

        state.transition(CompilerStage.CONTRACT_BUNDLE_VERIFIED)
        ledger.contract_bundle = bundle.metadata
        validation["contractBundle"] = bundle.metadata
        
        state.transition(CompilerStage.SOURCE_ENVELOPE_CREATED)

        dialects = bundle.dialects
        stripped = source.lstrip()
        json_source = dialect_override in {"managed-stage-json", "uxml-rvm-intake"} or stripped[:1] in {b"{", b"["}
        pdf_source = dialect_override == "pdf-input-echo" or stripped.startswith(b"%PDF")
        
        state.transition(CompilerStage.MEDIA_INSPECTED)
        
        root: ET._Element | None
        if pdf_source:
            root = None
            dialect = dialect_override or "pdf-input-echo"
        elif json_source:
            root = None
            dialect = _json_dialect(source, dialect_override)
        else:
            root = _parse_xml(source, source_name)
            dialect = dialect_override or detect_dialect(root, bundle.registry)
        
        if dialect not in dialects:
            raise CompileBlocked(f"Dialect {dialect!r} is not registered.")
            
        state.transition(CompilerStage.DIALECT_RESOLVED)

        ledger.dialect = dialect
        validation["dialect"] = dialect

        if dialect not in SUPPORTED_COMPILER_DIALECTS:
            acceptance = dialects[dialect].get("canonicalAcceptance")
            disposition = "REJECT_INVALID" if acceptance == "EXCLUDED" else ("DEFER_EXPLICITLY" if acceptance == "DIAGNOSTIC_ONLY" else "UNSUPPORTED_BLOCKING")
            ledger.add(source_entity_id="document", source_type="DIALECT", source_fields={"dialect":dialect,"canonicalAcceptance":acceptance}, disposition=disposition, diagnostics=["registered dialect has no PR-D adapter implementation"])
            ledger.blocked = True
            ledger.diagnostic("BLOCKING", "DIALECT_ADAPTER_NOT_IMPLEMENTED", "registered dialect has no PR-D adapter implementation")
            state.block("PROFILE_INTAKE_GATE")
            _update_validation()
            return None, ledger.as_dict(source_hash, None), validation
            
        state.transition(CompilerStage.PROFILE_INTAKE_VALIDATED)

        aliases = _resolve_aliases(_load_json(alias_registry_path))
        
        outcome = resolve_registered_profile(
            dialect=dialect,
            source=source,
            root=root,
            ledger=ledger,
            aliases=aliases,
            context=context,
            source_name=source_name,
            source_path=source_path,
            categorized_xsd_path=categorized_xsd_path,
        )
        
        state.transition(CompilerStage.PROFILE_RESOLVED)
        
        if outcome.outcome_kind == OutcomeKind.BLOCKED_NO_CANDIDATE or ledger.blocked:
            state.block("PROFILE_RESOLVER_GATE")
            _update_validation()
            if outcome.canonical_candidate is not None:
                output = _xml_bytes(outcome.canonical_candidate)
                return outcome.canonical_candidate, ledger.as_dict(source_hash, _sha256(output)), validation
            return outcome.canonical_candidate, ledger.as_dict(source_hash, None), validation
            
        state.transition(CompilerStage.SOURCE_ACCOUNTED)
        
        canonical = outcome.canonical_candidate
        
        state.transition(CompilerStage.CANONICAL_CANDIDATE_BUILT)

        reconcile_decision_ledger(canonical, ledger, context=context)

        xsd_errors = _validate_xsd(canonical, canonical_xsd_path)
        validation["xsdErrors"] = xsd_errors
        if xsd_errors:
            ledger.diagnostic("ERROR", "CANONICAL_XSD_FAILED", "Canonical output failed XSD.", errors=xsd_errors)
            state.block("XSD_VALIDATION_GATE")
            _update_validation()
            output = _xml_bytes(canonical)
            return canonical, ledger.as_dict(source_hash, _sha256(output)), validation
            
        state.transition(CompilerStage.XSD_VALIDATED)

        semantic_errors = _validate_schematron(canonical, semantic_rules_path)
        validation["semanticErrors"] = semantic_errors
        if semantic_errors:
            ledger.diagnostic("BLOCKING", "CANONICAL_SEMANTIC_FAILED", "Canonical output failed Schematron.", errors=semantic_errors)
            state.block("SCHEMATRON_VALIDATION_GATE")
            _update_validation()
            output = _xml_bytes(canonical)
            return canonical, ledger.as_dict(source_hash, _sha256(output)), validation
            
        state.transition(CompilerStage.SCHEMATRON_VALIDATED)
        
        if ledger.blocked:
            state.block("LEDGER_VALIDATION_GATE")
            _update_validation()
            output = _xml_bytes(canonical)
            return canonical, ledger.as_dict(source_hash, _sha256(output)), validation
            
        state.transition(CompilerStage.LEDGER_VALIDATED)
        
        state.transition(CompilerStage.PRODUCTION_ACCEPTED)
        state.accept()
        _update_validation()
        
        output = _xml_bytes(canonical)
        return canonical, ledger.as_dict(source_hash, _sha256(output)), validation
        
    except CompileBlocked as exc:
        ledger.diagnostic("BLOCKING", "CANONICALIZATION_BLOCKED", str(exc))
        block_gate = f"{state.current_stage.value}_FAILED_GATE"
        state.block(block_gate)
        _update_validation()
        # If we failed mid-compile, we don't return the candidate because it wasn't returned explicitly
        return None, ledger.as_dict(source_hash, None), validation


__all__ = [name for name in globals() if not name.startswith("__")]
