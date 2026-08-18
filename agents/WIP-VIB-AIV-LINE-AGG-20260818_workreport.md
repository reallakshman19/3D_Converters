# WIP-VIB-AIV-LINE-AGG-20260818 — AIV line/case aggregation qualification

# CURRENT RECOVERY STATE — READ FIRST

## 1. Recovery Header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED_FOR_OWNER_DIRECTED_ASSIGNMENT
EXECUTION_MODE: MANUAL
SCOPE_AUTHORITY: LOCKED_TO_APPROVED_MISSION
PHASE_PROGRESSION: MANUAL
MERGE_AUTHORITY: OWNER_ONLY
REPOSITORY: reallaksh19/3D_Converters
SOURCE_TASK: owner instruction 2026-08-18 — proceed with PR-D AIV assessment -> line/case aggregation qualification
PR_OR_WIP: WIP-VIB-AIV-LINE-AGG-20260818
BRANCH: agent/vibration-aiv-line-aggregation-qualification-20260818
PR_HEAD_OBSERVED: N/A
REPORT_BASIS_HEAD: cb7827f0183052ec3e2afca1a43e41935ab19cbd
MAIN_HEAD_LAST_CHECKED: 1d5930638e6f9714a2c29af328fe15a4e6b8b7f6
MERGE_BASE: cb7827f0183052ec3e2afca1a43e41935ab19cbd
APPENDIX_A_STATUS: NOT_REQUIRED_NEW_OWNER_DIRECTED_WORK
GROUNDING_EPOCH: GE-D1
CURRENT_STAGE: PLAN
LAST_COMPLETED_STAGE: BASELINE
CURRENT_BLOCKER: NONE
HIGHEST_RISK: max of provided AIV assessment LOFs could underpredict line LOF if the welded-discontinuity inventory is incomplete
LAST_DURABLE_CHECKPOINT: branch created from exact PR629 head
EXACT_NEXT_ACTION: implement an EI T2.7 max-discontinuity reduction rule that is numerically derived but remains non-authoritative until assessment-inventory completeness is proven
```

## 2. Handover in 60 Seconds

### What is now true
PR-D is stacked on PR629 head `cb7827f...`. EI AVIFF T2.7.3 / Flowchart T2-5 states that main-line LOF follows the greatest discontinuity-location LOF encountered up to the location of interest. Current `aiv-calculator.js` instead publishes a configured worked-example line LOF (`1.48`) for every line/case and separately calculates `maxAssessmentLof`.

### What is currently being worked on
Replace the configured Stage-9 line/case number with a derived max-of-current-assessment-LOFs reducer and explicit method provenance.

### What remains unfinished
The product does not currently prove that every relevant welded discontinuity downstream of each AIV source to the first major vessel is represented. Therefore derived line summaries must remain fail-closed for screening authority until a separate completeness-evidence slice exists.

### What has been proven
- PR629 is OPEN/DRAFT and mergeable at `cb7827f...`.
- `main` advanced independently to `1d593063...` via unrelated High-Pr PR619.
- EI T2.7 source review: AIV generates main-line LOF at welded discontinuities; the running line value is the greatest discontinuity LOF up to the location.
- repo controlled D.2.3 readable source retains relief-line AIV reference `1.48` and first-discontinuity reference `0.29` as different scopes.

### What has NOT been proven / NOT_RUN
- repository-native tests
- browser validation
- complete AIV welded-discontinuity inventory for arbitrary project lines
- authority promotion of line/case summaries

### What must not be assumed
A finite max over the assessment rows supplied by a user is not sufficient evidence that the physical line has been completely assessed.

### Highest-risk remaining item
Silent underprediction caused by missing discontinuities.

### Exact next action
Add a pure qualified reduction module with explicit completeness boundary, wire it into Stage 9, and keep `authoritativeForScreening=false` until coverage evidence exists.

## 3. Repository Ground Truth

```text
stack predecessor PR629: OPEN / DRAFT / mergeable / head cb7827f0183052ec3e2afca1a43e41935ab19cbd
PR629 base: agent/vibration-capability-consistency-20260818 (PR626)
independent PR627: presentation-only; no planned file overlap
main: 1d5930638e6f9714a2c29af328fe15a4e6b8b7f6
main drift from prior vibration base: unrelated PR619 only at grounding
MASTER_INDEX: not present at agents/MASTER_INDEX.md
coordination: PR629 claim explicitly excludes AIV line-case aggregation authority; this work is a follow-on stacked slice
```

## 4. Mission / Scope / Acceptance

Mission: remove the configured line/case LOF from active Stage-9 calculation and implement the EI T2.7 greatest-discontinuity reduction rule without over-promoting authority.

Acceptance:
- line/case LOF is calculated from current assessment results, not `benchmark.workedExampleReliefLineLof`;
- deterministic controlling assessment/source custody is produced;
- source locator and rule qualification are explicit;
- D.2.3 line-level `1.48` remains benchmark/reference evidence only;
- result states explicitly distinguish qualified reduction rule from unproven assessment-inventory completeness;
- no AIV equation/coefficient/attenuation/T2-6 changes;
- no generic EI main-line reducer/policy changes;
- no design authority or full-integrity claim.

## 5. Current Implementation State

| Work item | Implementation | Integration | Validation | Location | Remaining |
|---|---|---|---|---|---|
| T2.7 reduction rule | NOT_STARTED | NOT_STARTED | SOURCE_GROUNDED | planned new module | implement |
| Stage-9 calculator integration | CONFIGURED_REFERENCE_CURRENTLY | NOT_STARTED | SOURCE_INSPECTION | aiv-calculator.js | replace configured value |
| authority/completeness boundary | PARTIAL_EXISTING | NOT_STARTED | SOURCE_INSPECTION | post-discontinuity gate/workpack | make explicit |
| operator publication | CURRENTLY_LABELS_CONFIGURED/NON-AUTH | NOT_STARTED | NOT_RUN | result view/export | update wording/provenance |

## 6. Active Engineering Item Register

| ID | Type | Severity | Priority | Status | Summary | Evidence | Current PR? |
|---|---|---|---|---|---|---|---|
| ISS-D1 | ISSUE | HIGH | P0 | OPEN | Stage 9 uses one configured worked-example line LOF for every line/case | aiv-calculator.js | yes |
| RISK-D1 | RISK | HIGH | P0 | OPEN | max provided assessments can underpredict when inventory incomplete | T2.7 extent + current input model | yes |
| DEC-D1 | DECISION | HIGH | P0 | ACTIVE | qualify reduction rule separately from per-result screening authority | owner mission + authority policy | yes |
| DEBT-D1 | DEBT | MEDIUM | P1 | OPEN | AIV source registry T2.7 binding remains reconciliation-required | source registry | no authority promotion in this slice |

## 7. Current Technical Diagnosis

```text
Observed symptom: Stage-9 line/case `lof` is copied from benchmark.workedExampleReliefLineLof while maxAssessmentLof is separately calculated.
Current hypothesis: EI T2.7 requires line/case reduction from discontinuity LOFs; configured 1.48 is benchmark evidence, not a generic runtime input.
Supporting evidence: EI T2.7.1/T2.7.3 source review; controlled D.2.3 source has 0.29 assessment vs 1.48 line reference.
Alternative hypothesis: line-level value may require spatial segmentation rather than one maximum.
Already ruled out: universal use of configured 1.48 is not project-derived.
Falsifier: authoritative T2.7 text requiring a different line-reduction rule than greatest discontinuity LOF.
Next isolating experiment: synthetic multi-assessment vectors plus controlled D.2.3 incomplete-inventory case.
```

## 8. Authority and Invariants

- Governing standard basis: Energy Institute, AVIFF 2nd ed., T2.7 high-frequency acoustic excitation.
- Assessment LOF remains the output of existing qualified T2-6 calculation; no numerical formula changes.
- New reducer may calculate a line/case candidate only from current screening-qualified assessment results of the same line/case.
- `authoritativeForScreening` remains false while complete discontinuity coverage is unproven.
- `designAuthority=false`; `codeCompliance=false`; full vibration assessment remains false.
- benchmark expected values/tolerances are frozen and must not be changed to make tests pass.

## 9. Current Validation

```text
ID: VAL-D1
Status: PASS
Observation: SOURCE_INSPECTION
Oracle: AUTHORITATIVE_REFERENCE
Tested HEAD: source review external to branch
Evidence: EI AVIFF T2.7.1/T2.7.3 / Flowchart T2-5
Expected: main-line LOF derived from discontinuity-location results, carrying greatest prior discontinuity LOF
Actual: source supports the rule
Limitations: repository source binding for T2.7 remains RECONCILIATION_REQUIRED
Origin: PREEXISTING

ID: VAL-D2
Status: NOT_RUN
Observation: NOT_OBSERVED
Oracle: IMPLEMENTATION_COUPLED
Tested HEAD: N/A
Evidence: repository-native tests
Expected: pass
Actual: NOT_RUN
Limitations: connector-only environment
Origin: UNKNOWN_ORIGIN
```

## 10. Changed-File Ledger

Bootstrap metadata only at this checkpoint. Production/test ledger will be updated after implementation.

## 11. Review / CI State

No PR allocated yet. Hosted checks/reviews: NOT_APPLICABLE until PR creation.

## 12. Repository Coordination / Overlap

```text
MASTER_INDEX_CHECKED: attempted; file absent on main
STATUS_RECORD: agents/status/WIP-VIB-AIV-LINE-AGG-20260818.yaml
CLAIM_RECORD: agents/claims/WIP-VIB-AIV-LINE-AGG-20260818.yaml
FILE_OVERLAP: follow-on stack may modify AIV files outside PR629 exact claim where possible
AUTHORITY_OVERLAP: PR629 explicitly excludes AIV line-case aggregation authority
DEPENDENCY_OVERLAP: STACKED_ON_PR629
COORDINATION_STATE: SAFE_STACKED_FOLLOW_ON
```

## 13. Continuation State

```text
Start here: converters/vibration/aiv/aiv-calculator.js Stage 9
Exact file/function: lineCaseSummaries construction
Current value/path: benchmark.workedExampleReliefLineLof -> configuredLineLof
Do not redo: PR629 assessment-level integration
Do not change: T2-6 equations, AIV source/point calculations, generic EI mainline reducer
Validation still required: reducer vectors, calculator path, workpack/source assertions, browser later
Highest-risk remaining item: completeness of welded-discontinuity inventory
Exact next action: add qualified max-discontinuity reducer with fail-closed coverage state
```

# APPENDIX A — IMPLEMENTATION TAKEOVER QUALIFICATION

`NOT_REQUIRED_NEW_OWNER_DIRECTED_WORK`. A future takeover must re-ground PR629 and this follow-on branch before technical mutation.
