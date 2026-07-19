#!/usr/bin/env python3
"""Central dispatcher for InputXML registered profiles."""
from __future__ import annotations

import copy
from typing import Any
from pathlib import Path
from lxml import etree as ET

from .base import CompileBlocked, DecisionLedger
from .validation import _validate_xsd
from .extension import _ensure_extension_last, _extension_record
from .counts import *
from .children import *
from .elements import *
from .family import _compile_inputxml_family
from .model import _fragment_document, _ledger_direct_canonical
from .categorized import _categorized_document
from .xml_builder import _compile_xml_builder_source
from .seljson import _compile_seljson_custom_root
from .managed_stage import _compile_managed_stage_source
from .pdf_input_echo import _compile_pdf_input_echo_source
from .uxml_rvm import _compile_uxml_rvm_source
from .resolver_contract import ResolverOutcome, OutcomeKind


def resolve_registered_profile(
    *,
    dialect: str,
    source: bytes,
    root: ET._Element | None,
    ledger: DecisionLedger,
    aliases: dict[str, str],
    context: dict[str, Any],
    source_name: str,
    source_path: str,
    categorized_xsd_path: Path,
) -> ResolverOutcome:
    """Dispatches source to the appropriate profile adapter."""
    
    canonical: ET._Element | None = None
    outcome_kind = OutcomeKind.CANONICAL_CANDIDATE
    
    # Check general XML requirement
    if dialect not in {"uxml-rvm-intake", "pdf-input-echo", "managed-stage-json"}:
        if root is None:
            raise CompileBlocked(f"Dialect {dialect} requires XML input.")
            
    if dialect == "uxml-rvm-intake":
        wrapped = _compile_uxml_rvm_source(source, source_name=source_name, source_path=source_path, ledger=ledger, context=context)
        canonical = _compile_inputxml_family(wrapped, dialect=dialect, ledger=ledger, aliases=aliases, context=context)
    elif dialect == "pdf-input-echo":
        wrapped = _compile_pdf_input_echo_source(source, source_name=source_name, ledger=ledger, context=context)
        canonical = _compile_inputxml_family(wrapped, dialect=dialect, ledger=ledger, aliases=aliases, context=context)
    elif dialect == "managed-stage-json":
        wrapped = _compile_managed_stage_source(source, source_name=source_name, ledger=ledger, context=context)
        canonical = _compile_inputxml_family(wrapped, dialect=dialect, ledger=ledger, aliases=aliases, context=context)
    elif dialect == "canonical-inputxml-v1":
        canonical = copy.deepcopy(root)
        _ledger_direct_canonical(canonical, ledger)
    elif dialect == "inputxml-fragment":
        wrapped = _fragment_document(root, context)
        canonical = _compile_inputxml_family(wrapped, dialect=dialect, ledger=ledger, aliases=aliases, context=context)
    elif dialect == "categorized-inputxml-v3":
        categorized_errors = _validate_xsd(root, categorized_xsd_path)
        if categorized_errors:
            raise CompileBlocked("CategorizedInputXML failed categorized-inputxml-v3.xsd: " + "; ".join(categorized_errors))
        wrapped = _categorized_document(root, context, ledger)
        canonical = _compile_inputxml_family(wrapped, dialect=dialect, ledger=ledger, aliases=aliases, context=context)
    elif dialect == "xml-builder-root-branch-node":
        wrapped = _compile_xml_builder_source(source, source_root=root, ledger=ledger, context=context)
        canonical = _compile_inputxml_family(wrapped, dialect=dialect, ledger=ledger, aliases=aliases, context=context)
    elif dialect == "seljson-custom-root":
        wrapped = _compile_seljson_custom_root(source, source_root=root, ledger=ledger, context=context)
        canonical = _compile_inputxml_family(wrapped, dialect=dialect, ledger=ledger, aliases=aliases, context=context)
    else:
        canonical = _compile_inputxml_family(root, dialect=dialect, ledger=ledger, aliases=aliases, context=context)
        if dialect == "xml-to-cii-diagnostic-sidecar":
            _extension_record(canonical, producer=ledger.producer, dialect=ledger.dialect, name="DiagnosticSidecarReconciliation", source_path=ledger.source_path, source_entity_id="document", source_field="dialect", value="Diagnostic reconstruction requires independent source reconciliation before production use.", disposition="DEFER_EXPLICITLY", criticality="HIGH", confidence=0.80)
            _ensure_extension_last(canonical)
            ledger.add(source_entity_id="document", source_type="DIAGNOSTIC_RECONSTRUCTION", source_fields={"dialect":dialect}, disposition="DEFER_EXPLICITLY", evidence=["diagnostic sidecar is not assumed to be the exact writer-consumed model"], confidence={"identity":0.80,"topology":0.80,"geometry":0.80,"dimensions":0.80,"attributes":0.80,"ciiProjection":0.80})
            outcome_kind = OutcomeKind.BLOCKED_WITH_CANDIDATE
            ledger.diagnostic("BLOCKING", "DIAGNOSTIC_RECONCILIATION_REQUIRED", "Diagnostic InputXML sidecar requires independent source reconciliation.")
            ledger.blocked = True

    if ledger.blocked:
        if canonical is not None:
            outcome_kind = OutcomeKind.BLOCKED_WITH_CANDIDATE
        else:
            outcome_kind = OutcomeKind.BLOCKED_NO_CANDIDATE

    return ResolverOutcome(
        profile_id=dialect,
        adapter_id=dialect, # using dialect as adapter_id since it's 1:1 currently
        outcome_kind=outcome_kind,
        canonical_candidate=canonical,
        source_accounting_status="COMPLETE",
    )

__all__ = ["resolve_registered_profile"]
