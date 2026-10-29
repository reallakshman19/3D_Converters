# XML229 pre-Final restraint defaults — current recovery

Governing WBS: Progress Page CIIFR R4, WBS6/M25–M27. Source task #350. Owner explicitly requested production-fix PRs on 29 October 2026. KEEP WBS6; no merge or release authorization. Builder 6ae1bed6, author of the original RCA; no takeover and no independent self-score.

HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY_DRAFT_REQUIRES_ENGINEERING_REVIEW
REPORT_BASIS_HEAD: local candidate based on PR352 head 5c7ed85c4a80eea34728156fd130c2d8f706bf7e
MAIN_HEAD_LAST_CHECKED: 9ad61417dbd3c473b4e6c0f6fa1aa8eb6005221b
CURRENT_STAGE: VALIDATED_LOCAL_CANDIDATE
HIGHEST_RISK: default REST on retained ATTA nodes can change the support census; this is not legacy full-path support parity.
EXACT_NEXT_ACTION: inspect exact-head CI and independently review the new pre-Final support census and actual native CII restraints before merge.

## Implementation and protected boundaries

The existing governed ATTA fallback closure now runs on the actual Worker prepared document before finalized geometry serialization/hash and before accepting Final kg. It adds missing supports using the existing +Y/default-stiffness policy. No full legacy cleanup is invoked: no post-Final node deletion, reordering or geometry transformation. Explicit restraints survive under the existing closure policy. Config comes from the source-bound live basis. Old accepted sessions do not silently acquire new supports: rebuild Preview and review the resulting geometry/basis.

Numeric defaultFriction=0 survives the support writer (nullish fallback replaces truthiness). Default support profiles inherit configured defaultGap instead of creating unconditional gap0; explicit stored per-kind profiles still override the inherited global default, including an explicit profile gap0. This does NOT migrate existing stored profile tables. TYPE enabled+empty remains no mutation; Tee SIF source-only discrepancy is not changed.

## Evidence and limits

LOCAL_EXECUTION, authoritative original EF05 source, actual Preview and canonical producer with Node24/xmldom0.9.8: 41 branches, 1654 source-node authority rows, 249 physical owners, all 73/73 retained Datum nodes have a restraint. Closure reports 218 missing ATTA restraints added, zero placeholder replacements, 119 existing authoritative restraints preserved. The legacy full wrapper had a different cleaned population (173 total REST), so these counts are not claimed as full-path parity. Existing source Z rows remain subject to the existing explicit-restraint preservation policy. The old direct Python enrichment's 18 missing Datum cases are covered by pre-Final XML now; actual final native CII restraint payload/import and independent engineering acceptance remain NOT_RUN.

Focused two Node regressions PASS: translated Datum position unchanged; +Y, stiffness123456, gap7, friction0; idempotence; disabled mapping; explicit X/stiffness99/gap2 preserved. Uses the existing production Worker XML DOM, no new shim. Actual full-file execution separately uses unmodified xmldom. Prior PR352 native Final mass suite24/24 PASS remains historical; post-restraint native integration is pending exact-head CI.

## Coordination and file ledger

Stacked on PR352 to make the shared producer boundary explicit; PR352 must land first. Existing main/native orchestration drafts #329/#312 are unchanged. This is existing closure integration at a pre-Final boundary, not a runtime/writer switch. No workflow edits. Changed files: finalized-weight-geometry + mirror (closure before hash); producer + mirror (basis config parameter); support-mapping-legacy + mirror (zero friction); support-mapping-config + mirror (inherited gap); focused test; existing native CLI suite import; this recovery report. Each path is intentional. Python native loader/writer, Final decisions, source files and release gates are untouched.

## Open items / future takeover

RISK-350A: compare all newly added ATTA supports to original intended restraint ownership, including explicit Z/zero rows; non-author engineering review required. RISK-350B: existing saved per-kind gap0 overrides global gap7; do not silently migrate user settings. QST-350C: native CII/import parity is pending, not PASS.

Future Appendix A: trace source config into this pre-Final hash; isolate an explicit support versus default missing support; prove coordinates/physical lineage and Final kg remain invariant; independently count emitted CII restraints; identify the smallest next patch if the support census fails engineering review. No self-awarded independent qualification.
