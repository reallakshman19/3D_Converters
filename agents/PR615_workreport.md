# PR #615 Work Report — Current Recovery Authority

## Recovery Header

- WORK_INTENT: IMPLEMENT
- REPOSITORY_STATE: EXISTING_PR
- MUTATION_AUTHORITY: WRITE_ALLOWED by current Owner instruction
- CRITICALITY: ENGINEERING_CRITICAL
- EXECUTION_MODE: MANUAL
- BASE_BRANCH: `main`
- LIVE_MAIN_AT_FINAL_STAGE3_RECONCILIATION: `22b7b57fed3e78534da41342fc3240c8d27369c3`
- BRANCH: `agent/vibration-eit-roadmap-20260818`
- PR: #615
- REPORT_BASIS_HEAD: `477dd1b51f5eeeb6e35a501f3b1844d9e767e051`
- PRE_STATUS_STAGE3_HEAD: `dcaaa2dbfdd1da559e11f2fff827d122f7bc7902`
- BRANCH_RELATION_AT_PRE_STATUS_HEAD: ahead 33 / behind 4
- MERGE_AUTHORITY: OWNER_ONLY / NOT_GRANTED

## Handover in 60 Seconds

PR615 now contains this governed stack:

```text
EnergyInstituteEit.v5 compatibility import
  -> VibrationIntegrityProject.v1 (.vibproj)
  -> EngineeringMethodSource.v1
  -> VibrationRoadmapProjection.v1 / right-side navigator
  -> MechanismNumericResult.v1
  -> MechanismLineResult.v1
  -> EiMainLineAggregation.v2
```

Stage 3 fixed the common aggregation defect: assessment-unit LOFs no longer enter the EI cross-mechanism maximum directly. Each required mechanism must first produce one qualified `MechanismLineResult.v1`.

Permanent invariant:

```text
ASSESSMENT_UNIT_LOF != MECHANISM_LINE_LOF
one mechanism -> at most one EI main-line contributor
```

## Final Main Drift Reconciliation

`main` advanced during Stage 3 from `1d934024...` to `22b7b57f...` by four commits.

The complete drift comparison contains XML→CII Preview/config/test and associated backup/recovery files only. No vibration, mechanism-result, roadmap, project, source-custody, or EI aggregation path overlaps PR615.

Classification:

```text
NON_OVERLAPPING_BASE_DRIFT
```

PR615 was deliberately not rebased at this handover; importing unrelated XML work into the engineering-critical stack provides no Stage-3 validation benefit. Reconcile/rebase the four commits before any merge attempt.

## Coordination / Active Claims

- PR #571 owns mechanism coverage/identification contracts and explicitly excludes EI aggregation.
- no open PR was found for `ei-mainline-aggregation.js` at Stage-3 start.
- no open PR was found for `MechanismLineResult` other than PR615.
- PR #479 owns `tabs/vibration-integrity-tab.js`.
- PR #506 owns `tabs/engineering-calculations-tab.js` plus AIV workspace/runtime.
- PR #508 owns `tabs/vibration-integrity-mechanisms.js` and SBC facility/view paths.

Stage 3 did not edit through those mechanism-workspace claims and did not modify `converters/vibration/mechanisms/contracts.js`.

## Stage 1 — EIT / Project / Roadmap

Implemented:

- generic `EnergyInstituteEit.v5` import for `fit/fip/mex/aiv/sbc/thw/tra/caf`;
- declaration/result/detail preservation independent of legacy module token;
- malformed/unknown compatibility payload retention;
- imported numerical values remain `HISTORICAL_REVIEW_REQUIRED`;
- persistence-only `VibrationIntegrityProject.v1` and `.vibproj`;
- transactional `.eit -> project` load;
- deterministic project Open/Save and line selection;
- persisted current-result authority rejected in V1;
- non-binding Phase × Scope × Specialty right-side roadmap;
- project/roadmap events remain orchestration/presentation only.

## Stage 2 — Source Custody

Added `EngineeringMethodSource.v1` and vibration source registry with separate:

```text
technicalModule
sectionId
flowchartId
equationId
tableId
figureId
printedPage
pdfPage
```

EI 2nd-edition publication/T1-T13 module identity is retained separately from repository-only T2 subsection labels. Repository labels remain `RECONCILIATION_REQUIRED`; dotted section IDs are not silently promoted to flowchart IDs. Thermowell EI T4 vs current ASME identity remains `CONFLICTED`.

Roadmap source state is visible but cannot determine applicability, result, completeness, screening authority, or design authority.

## Stage 3 — Mechanism-Level Reduction

### `MechanismNumericResult.v1`

`converters/vibration/mechanisms/result-contracts.js`

Aggregation eligibility requires:

```text
IMPLEMENTED_SCREENING
qualification.effective = SCREENING
assessmentState = CALCULATED
resultState = CURRENT_RESULT
finite governingLof >= 0
```

Observed stale/candidate/invalid LOF remains auditable but cannot contribute.

### `MechanismLineResult.v1`

One result per mechanism + exact line/case/canonical scope. `CURRENT_RESULT` requires a valid numeric LOF, aggregation eligibility, and no blocking reduction reason. `INCOMPLETE` cannot carry a governing LOF.

### Reducer custody

`converters/vibration/mechanisms/reducers.js`

`VibrationMechanismReducerRegistry.v1` currently allows:

```text
ONE  -> IDENTITY_SINGLE_ASSESSMENT_UNIT / STRUCTURAL_IDENTITY_ONLY
ZERO -> INCOMPLETE
MANY -> INCOMPLETE
```

All multi-item rules are intentionally `null`:

```text
universalMultiItemReducer = false
multiItemReductionQualified = false
```

No AIV/deadleg/etc. max rule has been inferred.

### `EiMainLineAggregation.v2`

`converters/vibration/ei-mainline-aggregation.js`

```text
schema            = EiMainLineAggregation.v2
policy schema     = EiMainLineAggregationPolicy.v2
policy revision   = EI-AVIFF2-MAINLINE-2026-08-18
aggregation rule  = MAX_APPLICABLE_QUALIFIED_MECHANISM_LINE_LOF
```

Reducer-registry revision/fingerprint is part of policy identity.

Flow:

```text
T1 identification / coverage / completeness
  -> benchmark readiness
  -> governed assessment set
  -> MechanismLineResult.v1
  -> one qualified contributor per mechanism
  -> EI cross-mechanism maximum
```

Caller-supplied `mechanismLineResults`, reducer registries, and reducer overrides are forbidden in this slice.

Audit output includes mechanism line results and reduction provenance.

## Primary Falsifier

Old behavior:

```text
AIV assessment pairs [0.21, 0.63, 0.47]
  -> three EI contributors
  -> COMPLETE / 0.63
```

Required Stage-3 behavior without a qualified AIV multi-item rule:

```text
MechanismLineResult.state = INCOMPLETE
governingLof              = null
EI state                   = INCOMPLETE
eiMainLineLof              = null
contributors               = []
reason = MECHANISM_LINE_REDUCTION:aiv:MULTI_ITEM_REDUCTION_UNQUALIFIED:aiv
```

Single-item FIT/AIV remain identity-reducible; the cross-mechanism maximum is unchanged after qualified mechanism-level results exist.

## Authority / Negative Assurance

Stage 3 does not change:

- EI equations, coefficients, or thresholds;
- T1 applicability;
- benchmark oracle values/tolerances;
- FIT/AIV/SBC numerical calculators;
- active mechanism workspace files;
- `mechanisms/contracts.js`;
- design/code authority;
- Product Freeze;
- generic multi-module `.eit` export;
- workflow files.

Authority:

```text
project                    = PERSISTENCE_ONLY
roadmap                    = VISUAL_NAVIGATION_GUIDANCE_ONLY
source registry            = SOURCE_IDENTITY_ONLY
mechanism reducer          = REDUCTION_CUSTODY_ONLY
EI aggregate promotion     = false
designAuthority            = false
codeCompliance             = false
fullVibrationAssessment    = false
productFreezeImplied       = false
```

## Backup Custody

Historical Stage-1 shared-tab backup:

```text
.backups/1_tabs_engineering_calculations_tab_js.bak
```

Stage-3 exact connector-source pre-edit custody:

```text
.backups/connector-20260818-pr615-stage3/converters/vibration/ei-mainline-aggregation.js
.backups/connector-20260818-pr615-stage3/tests/vibration-ei-mainline-aggregation.test.mjs
```

Native backup CLI is not claimed for Stage 3 because no native checkout/network was available.

## Validation Ledger

Historical Stage 1:

```text
PASS 25/25 on its corresponding pre-Stage2 reconstructed surface
```

Stage 2:

```text
PASS 10/10 source-identity focused gate
```

Stage 3 reducer/result:

```text
node --check result-contracts.js     PASS
node --check reducers.js             PASS
focused result/reducer cases         PASS 8/8
```

Stage 3 aggregation controlled-dependency harness:

```text
FIT one-item identity                 PASS
FIT + AIV one-item max                PASS
AIV MANY fail-closed                  PASS
caller line-result override rejected  PASS
TOTAL                                 PASS 4/4
```

Evidence:

```text
STATUS      PASS
OBSERVATION LOCAL_EXECUTION / reconstructed focused surfaces
ORACLE      IMPLEMENTATION_COUPLED with explicit independent falsifier expectations
```

Source/size inspection:

- current aggregator uses `lineResult.governingLof`, not a direct item contributor loop;
- aggregator `<295` physical lines;
- result contracts `<300`;
- reducers `<300`;
- Stage-3 focused test `<300`.

Final hosted state at pre-status head:

```text
reviews             0
review threads      0
commit statuses     0 returned -> NOT PASS
PR workflow runs    0 returned -> NOT PASS
```

Still `NOT_RUN`:

- repository-native current-head M4 test;
- matrix current-head consumer;
- full Vibration/FIT/AIV/SBC suites;
- served browser;
- independent engineering review.

## Stage-3 Changed Files

New:

- `agents/PR615_stage3_mechanism_reduction.md`
- `converters/vibration/mechanisms/result-contracts.js`
- `converters/vibration/mechanisms/reducers.js`
- `tests/vibration-mechanism-line-result.test.mjs`
- `.backups/connector-20260818-pr615-stage3/converters/vibration/ei-mainline-aggregation.js`
- `.backups/connector-20260818-pr615-stage3/tests/vibration-ei-mainline-aggregation.test.mjs`

Modified:

- `converters/vibration/ei-mainline-aggregation.js`
- `tests/vibration-ei-mainline-aggregation.test.mjs`
- `agents/PR615_workreport.md`
- `agents/status/PR615.yaml`
- `agents/claims/PR615.yaml`

## Decisions / Risks / Debt

- DEC-615-09: assessment-unit LOF cannot directly become EI aggregate input.
- DEC-615-10: single-item identity is allowed because no cross-unit engineering reduction occurs.
- DEC-615-11: no universal multi-item reducer; MANY remains fail-closed until method-qualified.
- DEC-615-12: EI policy fingerprint includes reducer custody.
- RISK-615-01: repository-native current-head M4/matrix regression not run.
- RISK-615-02: AIV/deadleg multi-item semantics unresolved; guessing is prohibited.
- RISK-615-03: PR506 shared-tab overlap from Stage 1 remains.
- RISK-615-04: branch is behind four non-overlapping XML→CII commits; reconcile before merge.
- DEBT-615-01: mechanism workspace project-context consumption remains blocked by active claims.
- DEBT-615-02: mechanism-specific multi-item reducer qualification outstanding.
- DEBT-615-03: FIT span/support/process/multiphase/frequency custody outstanding.
- DEBT-615-04: generic multi-module `.eit` export deferred.

## Appendix A

`NOT_REQUIRED_FOR_CONTINUATION` — same active agent and same PR. Any future takeover must re-ground and pass the Engineering PR Delivery qualification gate.

## EXACT_NEXT_ACTION

Re-ground main/claims/source evidence. Do not invent AIV/deadleg multi-item rules. If controlled method evidence explicitly defines a mechanism-specific reduction, qualify one mechanism in isolation. Otherwise keep `MANY` fail-closed and proceed to the next unblocked engineering custody stack, preferably FIT span/support/process/multiphase/frequency evidence. Reconcile the four unrelated `main` commits before any merge attempt. Keep PR615 draft/unmerged unless the Owner explicitly authorizes merge.
