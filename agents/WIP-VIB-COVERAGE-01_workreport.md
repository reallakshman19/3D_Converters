# WIP-VIB-COVERAGE-01 — recovery-first workreport

Issue: #570
Branch: `agent/vib-coverage-01`
Base/main at takeover: `24080a49647c7802ff8ab496ccd37421b8d53b68`
Criticality: `ENGINEERING_CRITICAL`
Merge authority: `OWNER_ONLY`
Takeover disposition: `CONTINUE`

## Mission

Create machine-readable mechanism-identification / required-assessment / coverage / completeness contracts so partial vibration results cannot masquerade as complete family assessment.

First slice is intentionally non-numerical and does **not** implement EI main-line aggregation or automatic T1 applicability rules.

## Live grounding

Observed current contracts:

- `converters/vibration/mechanisms/contracts.js` — `VibrationMechanismAssessmentItem.v1` / `VibrationMechanismAssessmentSet.v1`; zero cardinality is not `NOT_APPLICABLE`.
- `converters/vibration/mechanisms/index.js` — FIT, Mechanical and SBC mechanism adapters only.
- `tabs/vibration-integrity-mechanisms.js` — computes screening/candidate governing values and returns `fullScreeningGoverningEstablished: false` unconditionally.
- `tests/vibration-integrity-mechanism-matrix.test.mjs` — protects candidate-vs-screening and stale-result behavior.
- current static mechanism catalogue still labels `aiv` as `NOT_IMPLEMENTED`; this is projection drift and is forbidden as completeness authority.

## Active overlap

Initial contract-only paths:

```text
converters/vibration/mechanisms/coverage.js                  NEW
tests/vibration-mechanism-coverage.test.mjs                 NEW
agents/WIP-VIB-COVERAGE-01_workreport.md                     NEW
```

Observed neighboring open PRs:

- PR #479: FIT run-evidence/input/tab/release paths — no exact overlap with initial contract-only paths.
- PR #539: FIT adapter + Engineering Calculation console/family projection — no exact overlap.
- PR #560: `docs/FIVroadmap.md` only — no exact overlap.
- PR #546: explicitly forbidden technical scope; no inspection/implementation performed for its solution.

Initial classification: `SAFE` for new contract/test files. Any later edit to shared existing Vibration Integrity files requires re-grounding and backup compliance.

## Appendix A — implementation takeover qualification

### A1 — Production Trace — 19/20

Current facility projection flows:

```text
facility FIT register row
→ buildVibrationMechanismMatrixRow()
→ buildVibrationMechanismAssessment(...)
→ mechanism-specific builder
→ VibrationMechanismAssessmentSet.v1
→ screeningGoverning / candidateGoverning
→ Vibration Integrity matrix
```

The current path can show a valid FIT screening value and separate candidate values, but has no record of which mechanisms were required by identification evidence. `fullScreeningGoverningEstablished=false` is a constant disclaimer, not derived proof.

### A2 — Current Failure Isolation — 19/20

Failure layer is family orchestration, not numerical kernels. The repository has assessment contracts but no prior contract that states:

```text
considered mechanism
required assessment identity
explicit NOT_APPLICABLE evidence
unresolved identification
coverage state
family completeness
```

The smallest safe seam is a pure contract module consuming explicit identification evidence plus existing assessment sets. It must not use static UI implementation labels and must not invent T1 rules.

### A3 — Authority / Invariant — 20/20

Current source proves:

- `ZERO` assessment-set cardinality is distinct from `NOT_APPLICABLE`.
- candidate Mechanical/SBC states remain `NOT_AUTHORIZED` and cannot replace FIT screening governing.
- `STALE_RESULT` is retained evidence but excluded from current governing.
- a current FIT result carries only FIT scope/authority and does not prove missing mechanisms were assessed.
- SBC/thermowell remain separate from the future EI main-line aggregate; this issue does not aggregate.

Protected invariant:

```text
CURRENT_MECHANISM_RESULT != COMPLETE_FAMILY_ASSESSMENT
```

### A4 — Independent Validation / Falsification — 18/20

First tests will freeze expected completeness independently from production output:

```text
no identification -> INCOMPLETE
REQUIRED + missing -> INCOMPLETE
REQUIRED + NOT_IMPLEMENTED -> INCOMPLETE
REQUIRED + STALE -> INCOMPLETE
REQUIRED + candidate when SCREENING required -> INCOMPLETE
explicit NOT_APPLICABLE + evidence -> NOT_APPLICABLE coverage
UNRESOLVED -> INCOMPLETE
all REQUIRED current SCREENING assessments -> COMPLETE
all explicit NOT_APPLICABLE -> NOT_APPLICABLE
unknown mechanism -> throw
duplicate identity / contradictory disposition -> throw
```

No expected engineering LOF is introduced by these tests.

### A5 — Minimal Next Commit — 18/20

First production slice:

```text
NEW converters/vibration/mechanisms/coverage.js
NEW tests/vibration-mechanism-coverage.test.mjs
NEW agents/WIP-VIB-COVERAGE-01_workreport.md
```

No existing production file is edited in the first commit, avoiding backup-rule violation in this connector-only environment.

Falsifier: if the pure contract cannot distinguish `NOT_APPLICABLE` from missing/unresolved evidence without importing mechanism numerical/UI logic, stop and redesign before integration.

### Qualification result

```text
TOTAL = 94/100
minimum = 18/20
A1/A2/A3 >= 18
hard fail = NONE
DISPOSITION = QUALIFIED_FOR_VIB_COVERAGE_IMPLEMENTATION
```

## Protected invariants

- no automatic T1 engineering rules;
- no numerical method/equation/coefficient changes;
- no benchmark expected/tolerance changes;
- no authority promotion;
- no Product Freeze inference;
- static UI catalogue cannot decide completeness;
- missing assessment != NOT_APPLICABLE;
- candidate != required SCREENING coverage;
- stale != current coverage;
- no main-line aggregation in this slice;
- no PR #546 technical work.

## Validation truth

At this checkpoint:

```text
source grounding: PASS / source inspection / current GitHub blobs
Appendix A: PASS / repository-specific evidence
runtime tests: NOT_RUN / implementation not yet created
native backup CLI: NOT_APPLICABLE to first slice because existing files are not edited
```

## Highest risk

Accidentally encoding engineering applicability/authority policy inside a generic completeness helper instead of consuming explicit governed identification/assessment evidence.

## EXACT_NEXT_ACTION

Create `converters/vibration/mechanisms/coverage.js` as a pure, fail-closed contract with deterministic identities and no numerical vibration logic, then add `tests/vibration-mechanism-coverage.test.mjs` that falsifies missing/stale/candidate/unresolved coverage before any shared-file integration.
