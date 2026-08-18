# PR #615 Work Report — EIT Project, Source Custody, Dynamic Roadmap, Mechanism Reduction

## Recovery Header

- WORK_INTENT: IMPLEMENT
- REPOSITORY_STATE: EXISTING_PR
- MUTATION_AUTHORITY: WRITE_ALLOWED by current Owner instruction
- CRITICALITY: ENGINEERING_CRITICAL
- EXECUTION_MODE: MANUAL
- BASE_BRANCH: `main`
- BASE_MAIN_SHA_AT_CURRENT_REGROUND: `1d9340248b11569f7c7c4f02ac429c7d8c66ff81`
- BRANCH: `agent/vibration-eit-roadmap-20260818`
- PR: #615
- REPORT_BASIS_HEAD: `da4472e1577b2f1f7d7ef14011ebc5ed445e0796`
- MERGE_AUTHORITY: OWNER_ONLY / NOT_GRANTED

## Handover in 60 Seconds

PR615 now contains five connected layers:

```text
EnergyInstituteEit.v5 compatibility import
  -> VibrationIntegrityProject.v1 (.vibproj)
  -> EngineeringMethodSource.v1
  -> VibrationRoadmapProjection.v1 / right-side navigator
  -> MechanismNumericResult.v1 / MechanismLineResult.v1
  -> EiMainLineAggregation.v2
```

Authority boundaries remain separated:

- `.eit` import = compatibility/history, not current result authority;
- `.vibproj` = persistence only;
- source registry = source identity/locator custody only;
- roadmap = visual navigation only;
- mechanism reducer = reduction custody only;
- EI aggregation = governed main-line aggregation only, no design/code/Product Freeze authority.

The Stage-3 correction removes direct assessment-item LOFs from EI cross-mechanism aggregation. One mechanism can now supply at most one qualified `MechanismLineResult.v1` contributor.

## Live Ground Truth / Coordination

Stage-3 start:

```text
main                 1d9340248b11569f7c7c4f02ac429c7d8c66ff81
PR615 pre-stage head 9fc31bd2a61c259264bf4bd87ce14dfe5fee66e1
```

Coordination:

- PR #571 owns coverage/identification contracts and explicitly excludes EI aggregation.
- no open PR was found for `ei-mainline-aggregation.js`.
- no open PR was found for `MechanismLineResult` other than PR615.
- PR #479 owns `tabs/vibration-integrity-tab.js`.
- PR #506 owns `tabs/engineering-calculations-tab.js`, AIV workspace/runtime.
- PR #508 owns `tabs/vibration-integrity-mechanisms.js` and SBC facility/view paths.

Stage 3 therefore avoided all active mechanism-workspace claims and did not edit `mechanisms/contracts.js`.

## Stage 1 — EIT / Project / Roadmap

Implemented:

- generic `EnergyInstituteEit.v5` import for `fit/fip/mex/aiv/sbc/thw/tra/caf`;
- declaration/result/detail preservation independent of `lines[].modules`;
- malformed/unknown payload retention;
- imported numerical values remain `HISTORICAL_REVIEW_REQUIRED`;
- `VibrationIntegrityProject.v1` with transactional `.eit -> project` load;
- `.vibproj` deterministic Open/Save;
- persisted current-result authority is rejected in V1;
- right-side Phase × Scope × Specialty roadmap;
- project line selection;
- roadmap/project events remain non-authoritative orchestration channels.

## Stage 2 — Source Identity

Added:

- `EngineeringMethodSource.v1`;
- typed `technicalModule / sectionId / flowchartId / equationId / tableId / figureId / printedPage / pdfPage`;
- EI 2nd-edition publication identity and T1-T13 technical-module custody;
- current repository T2 subsection labels remain `RECONCILIATION_REQUIRED`;
- thermowell EI-T4 vs `ASME PTC 19.3 TW-2016` remains `CONFLICTED`;
- roadmap source states visible but non-binding.

No dotted `T2.x` section is silently converted into a `T2-x` flowchart identity.

## Stage 3 — Mechanism Result Reduction

### Defect

Pre-Stage3 `ei-mainline-aggregation.js` looped over every required assessment-set item and directly promoted each `item.result.governingLof` to an EI contributor.

That made this possible without a mechanism reducer:

```text
AIV pair LOF[] -> global EI max()
```

### New contracts

`converters/vibration/mechanisms/result-contracts.js`

- `MechanismNumericResult.v1`
- `MechanismLineResult.v1`

`MechanismNumericResult.v1` retains observed LOF and source states but requires all of the following for aggregation eligibility:

```text
IMPLEMENTED_SCREENING
qualification.effective = SCREENING
assessmentState = CALCULATED
resultState = CURRENT_RESULT
finite governingLof >= 0
```

Stale/candidate/invalid values remain auditable but are ineligible.

`MechanismLineResult.v1` can carry a numeric governing LOF only when `state=CURRENT_RESULT`, `aggregationEligible=true`, and no blocking reduction reason exists.

### Reducer registry

`converters/vibration/mechanisms/reducers.js`

`VibrationMechanismReducerRegistry.v1` explicitly registers the known mechanism universe.

Current V1 policy:

```text
ONE  -> IDENTITY_SINGLE_ASSESSMENT_UNIT / STRUCTURAL_IDENTITY_ONLY
ZERO -> INCOMPLETE
MANY -> INCOMPLETE / no qualified multi-item rule
```

All current `multiItemRule` values are `null`.

Permanent invariant:

```text
ASSESSMENT_UNIT_LOF != MECHANISM_LINE_LOF
```

### EI aggregation v2

`converters/vibration/ei-mainline-aggregation.js`

Now:

```text
EiMainLineAggregation.v2
EiMainLineAggregationPolicy.v2
revision = EI-AVIFF2-MAINLINE-2026-08-18
aggregationRule = MAX_APPLICABLE_QUALIFIED_MECHANISM_LINE_LOF
```

Reducer-registry revision/fingerprint is included in the policy fingerprint.

Flow:

```text
T1 / coverage / completeness
  -> M3 benchmark readiness
  -> assessment set
  -> MechanismLineResult.v1
  -> one contributor per required mechanism
  -> governed EI cross-mechanism maximum
```

Caller-provided `mechanismLineResults`, reducer registries, and reducer overrides are rejected to avoid a second authority store.

Output contains `mechanismLineResults` for auditability.

### Main changed falsifier

Old regression:

```text
AIV [0.21, 0.63, 0.47] -> COMPLETE / 0.63
```

New required behavior without a qualified AIV multi-item reducer:

```text
state         = INCOMPLETE
eiMainLineLof = null
contributors  = []
reason        = MECHANISM_LINE_REDUCTION:aiv:MULTI_ITEM_REDUCTION_UNQUALIFIED:aiv
```

One-item FIT and one-item AIV still pass by identity; cross-mechanism max still applies after mechanism-level reduction.

## Authority Boundary / Negative Assurance

Stage 3 does **not** change:

- EI equations/correlations/coefficients;
- T1 applicability logic;
- benchmark values or tolerances;
- FIT/AIV/SBC numerical calculators;
- active mechanism workspace files;
- `converters/vibration/mechanisms/contracts.js`;
- design/code authority;
- Product Freeze;
- generic multi-module `.eit` export;
- workflow files.

Authority remains:

```text
mechanism reducer authority = REDUCTION_CUSTODY_ONLY
EI aggregate authority       = no promotion / Screening contributors only
designAuthority              = false
codeCompliance               = false
fullVibrationAssessment      = false
productFreezeImplied         = false
```

## Backup Evidence

Historical Stage-1 shared-tab pre-edit blob:

```text
.backups/1_tabs_engineering_calculations_tab_js.bak
```

Stage-3 exact pre-edit connector-source custody:

```text
.backups/connector-20260818-pr615-stage3/converters/vibration/ei-mainline-aggregation.js
.backups/connector-20260818-pr615-stage3/tests/vibration-ei-mainline-aggregation.test.mjs
```

Native backup CLI was not claimed for Stage 3 because no native checkout/network is available.

## Validation Ledger

### Historical Stage-1 gate

```text
PASS 25/25 on corresponding pre-Stage2 reconstructed surface
```

### Stage-2 source-identity gate

```text
PASS 10/10 on reconstructed exact source/roadmap/panel surface
```

### Stage-3 reducer contract gate

```text
node --check result-contracts.js                  PASS
node --check reducers.js                         PASS
focused reducer/result harness                   PASS 8/8
```

Falsifiers include single identity, stale, candidate, invalid LOF, AIV MANY, ZERO, no universal multi reducer, malformed/mismatched evidence.

### Stage-3 aggregator harness

Controlled dependency harness using the Stage-3 reducer/result code:

```text
FIT one-item identity                 PASS
FIT + AIV one-item max                PASS
AIV MANY fail-closed                  PASS
caller line-result override rejected  PASS
TOTAL                                 PASS 4/4
```

Evidence classification:

```text
STATUS      PASS
OBSERVATION LOCAL_EXECUTION / reconstructed focused surfaces
ORACLE      IMPLEMENTATION_COUPLED with independent falsifier expectations
```

Source inspection confirms current aggregation collects `lineResult.governingLof`; it no longer contains the direct per-item contributor loop.

Size checks:

- aggregator `<295` physical lines;
- result contracts `<300`;
- reducers `<300`;
- focused Stage-3 test `<300`.

### Truthful remaining gates

- repository-native current-head M4 regression: `NOT_RUN / ENVIRONMENT_BLOCKED`;
- matrix consumer current-head execution: `NOT_RUN`;
- full vibration/FIT/AIV/SBC suites: `NOT_RUN`;
- served browser: `NOT_RUN`;
- independent engineering review: `NOT_RUN`.

No missing status/workflow is treated as PASS.

## Changed-File Ledger — Stage 3

New:

- `agents/PR615_stage3_mechanism_reduction.md`
- `converters/vibration/mechanisms/result-contracts.js`
- `converters/vibration/mechanisms/reducers.js`
- `tests/vibration-mechanism-line-result.test.mjs`
- Stage-3 backup files listed above

Modified:

- `converters/vibration/ei-mainline-aggregation.js`
- `tests/vibration-ei-mainline-aggregation.test.mjs`
- PR615 recovery/status/claim metadata

Prior Stage-1/2 files remain as previously recorded.

## Decisions / Risks / Debt

- DEC-615-09: assessment-unit LOF cannot directly become EI aggregate input.
- DEC-615-10: single-item identity is permitted because it is not a cross-unit engineering reduction.
- DEC-615-11: no universal multi-item reducer; MANY fails closed until mechanism-specific method evidence is qualified.
- DEC-615-12: EI policy fingerprint includes reducer custody.
- RISK-615-01: repository-native current-head M4/matrix regression remains unexecuted.
- RISK-615-02: AIV/deadleg actual multi-item reduction semantics remain unresolved and must not be guessed.
- RISK-615-03: PR506 shared-tab overlap from Stage 1 remains; no further shared-tab mutation permitted without reconciliation.
- DEBT-615-01: mechanism workspaces still do not consume project context due active claims.
- DEBT-615-02: controlled multi-item reducer qualification is outstanding.
- DEBT-615-03: FIT span/process/multiphase/frequency custody remains outstanding.
- DEBT-615-04: generic multi-module `.eit` export remains deferred.

## Appendix A

`NOT_REQUIRED_FOR_CONTINUATION` — same active agent and same PR, not a takeover. Any future takeover must re-ground and satisfy the Engineering PR Delivery qualification gate.

## EXACT_NEXT_ACTION

Re-ground active claims and source evidence. Do **not** invent AIV/deadleg multi-item reduction. If controlled source evidence is sufficient, qualify one mechanism-specific reducer in isolation. Otherwise proceed to the next unblocked common engineering correction, preferably FIT physical/process custody, while leaving unresolved multi-item mechanisms fail closed. Keep PR615 draft/unmerged unless the Owner explicitly authorizes merge.
