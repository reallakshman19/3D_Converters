# PR438 — FIV / FIT API-First Vibration Work Report

## PR Mission Control

| Field | Current state |
|---|---|
| Mission | Establish a controlled API-first FIT vertical with source-traceable calculations, independent example evidence, and explicit authority boundaries. |
| Source task / issue | Owner requests 2026-08-11/12; issue #429; deep-research report; Common `CodingRules.md` pinned at `43eccc27967ecec7d67513c08255398b496be5ce`. |
| PR number | #438 |
| Branch | `agent/fiv-fit-roadmap-foundation` |
| Base commit | `37c37d770ba47ebb3152679265896de4a943c8b0` |
| Current HEAD before Stage 14 production work | `25f95676c6d86f4f1a655bc952110e24d5944e80` plus Stage 13 integration commits through `54a718541668daa77766dd658adc4129076915ba` |
| PR status | OPEN / DRAFT / mergeable at last GitHub check |
| Current stage | Stage 14 — IN_PROGRESS: bounded screening-candidate evidence gate; screening authority remains disabled |
| Last completed stage | Stage 13 — COMPLETE FOR IMPLEMENTATION / PARTIAL FOR FULL-CHECKOUT VALIDATION |
| Engineering status | `VIB.FIV.FLOW_TURBULENCE` remains `BENCHMARK_ONLY`; screening/design NOT AUTHORIZED. |
| Validation status | EI/domain Stage 12 PASS 12/12; Stage 13 coverage module smoke PASS; committed Stage 13 test syntax PASS; full branch/repository regression NOT_RUN because no complete checkout and GitHub Actions billing/spending gate remains external. |
| Current blocker | Full T2.2 licensed-page reconciliation cannot be honestly claimed from this runtime; full repo execution and identified vibration-engineer authority review remain open. |
| Exact next action | Add a non-authorizing screening-candidate scope evaluator driven by machine-readable qualification coverage; expose it in domain/central evidence; test EI-covered and uncovered slices; do not enable screening mode. |

### Handover in 60 Seconds

**What is now true:** the FIT domain kernel is source-traceable and benchmark-only. It reproduces retained workbook references, independent hand cases, and the EI Appendix D D2/D4 FIT worked examples. EI examples corrected two prior reference assumptions: advanced natural frequency is `1 Hz < fn <= 3 Hz`, and the large flexible family includes the published 273 mm D4 case. Multiphase aggregate/component input ambiguity now fails closed unless a mode is explicit or the input shape is unambiguous.

**Machine-readable evidence coverage is implemented:** each successful FIT domain result now carries `FIT-REFERENCE-COVERAGE-V1` in `qualificationCoverage` and under `evidence.qualificationCoverage`. The central Engineering Calculation adapter propagates the same object. Evidence strength is explicitly separated into:

```text
EI_PUBLISHED_EXAMPLE
INDEPENDENT_HAND_BENCHMARK
RETAINED_PARITY_ONLY
NONE
```

The coverage object also exposes distinct flags for EI published examples, hand benchmarks, retained workbook parity, equivalence tests, and missing independent examples. Every coverage object hard-codes:

```text
screeningQualified = false
engineeringAuthority = NONE
```

**Coverage examples:**

```text
MEDIUM_STIFF gas standard         -> EI_PUBLISHED_EXAMPLE (D2)
STIFF multiphase aggregate        -> EI_PUBLISHED_EXAMPLE (D4)
FLEXIBLE_LARGE liquid standard    -> EI_PUBLISHED_EXAMPLE (D4)
MEDIUM_LARGE standard             -> INDEPENDENT_HAND_BENCHMARK
FLEXIBLE_SMALL standard/advanced  -> INDEPENDENT_HAND_BENCHMARK
MEDIUM_SMALL standard             -> RETAINED_PARITY_ONLY
FLEXIBLE_LARGE advanced           -> RETAINED_PARITY_ONLY
```

**What remains unfinished:** full repository regression; normal extractor execution; complete licensed T2.2/project-procedure reconciliation; independent vibration-engineer approval; any screening/design authority; table exchange/workspace.

**PDF-source limitation:** the full EI 2nd Edition PDF is pinned in `reallaksh19/Common` at commit `aef163a5...`, but the available runtime cannot materialize/render the 10 MB binary through the current GitHub/PDF bridge. Do not record a page-by-page full T2.2 review until that source can be rendered directly. Appendix D worked-example evidence already extracted and benchmarked remains valid as the currently executable independent evidence set.

**Highest risk:** allowing executable benchmark paths or strong evidence coverage to be interpreted as production screening authority.

## Governing Engineering Principles

1. Validation, input resolution, applicability, calculation, assessment, evidence coverage, qualification and engineering authority are distinct layers.
2. A source hash proves content identity, not engineering correctness.
3. Workbook parity is migration/reference evidence, not independent authority.
4. EI worked examples independently validate only the exact method slices they exercise.
5. Independent hand calculations validate arithmetic transcription but are weaker than a governing-source published example.
6. Evidence coverage never grants screening authority.
7. No hidden engineering defaults, nearest-size interpolation, or silent multiphase precedence.
8. Public ID remains `VIB.FIV.FLOW_TURBULENCE`; FIT is the canonical mechanism terminology.
9. The vibration product remains table-first; no 3D viewer or canvas.
10. No `.github/workflows/*` workaround for the external GitHub Actions billing/spending condition.

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---:|---|---:|---|
| Detailed FIT/FIV roadmap | P0 | DONE | 1 | `docs/FIVroadmap.md` |
| Source register / extractor | P0 | IMPLEMENTED | 6 | pinned workbook + extractor |
| Physical context | P0 | VALIDATED | 7 | focused regression |
| Central FIT benchmark adapter | P0 | VALIDATED | 9 | benchmark-only central path |
| Independent hand benchmarks | P0 | IMPLEMENTED | 10 | benchmark JSON + regression |
| EI D2/D4 worked examples | P0 | VALIDATED | 11 | 5 published cases + boundary corrections |
| Multiphase resolution contract | P0 | VALIDATED | 12 | ambiguity fail-closed; explicit/inferred provenance |
| Runtime qualification coverage | P0 | IMPLEMENTED | 13 | coverage module + domain/adapter propagation |
| Coverage regression | P0 | IMPLEMENTED / NOT_RUN_FULL_BRANCH | 13 | focused smoke PASS + test syntax PASS |
| Screening-candidate evidence gate | P0 | IN_PROGRESS | 14 | current stage |
| Full repository regression | P0 | BLOCKED | Forward | Actions billing / no complete checkout |
| Full licensed T2.2/project review | P0 | BLOCKED | Forward | direct rendered source + reviewer required |
| Independent vibration-engineer approval | P0 | BLOCKED | Forward | authority decision required |
| Screening authority | P0 | BLOCKED | Forward | issue #429 |
| Table exchange/workspace | P1 | DEFERRED | Forward | independent of 3D viewer; later stage |

## Engineering Item Register

| ID | Type | Priority | Status | Summary |
|---|---|---:|---|---|
| DEC-001 | Decision | P0 | ACCEPTED | Stable public ID; FIT canonical terminology. |
| DEC-012 | Decision | P0 | ACCEPTED | EI examples qualify only exercised slices. |
| DEC-017 | Decision | P0 | ACCEPTED | Mixed multiphase data require explicit mode; unambiguous shapes may infer. |
| DEC-018 | Decision | P0 | ACCEPTED | Evidence coverage is separate from qualification and authority. |
| DEC-019 | Decision | P0 | ACCEPTED | Coverage strength uses explicit source class rather than one ambiguous boolean. |
| DEC-020 | Decision | P0 | ACCEPTED | Screening-candidate scope may be computed for engineering review but must never authorize screening execution. |
| RISK-018 | Risk | High | ACCEPTED | Equal executable behavior could be mistaken for equal independent evidence. |
| RISK-019 | Risk | Critical | ACCEPTED | Candidate eligibility could be mistaken for engineering approval; mitigate with `screeningAuthorized=false` and no central mode change. |
| QST-001 | Question | P0 | BLOCKED_PENDING_DIRECT_SOURCE | Complete adopted T2.2/project coverage. |
| QST-003 | Question | P0 | FAIL_CLOSED | Manual OD gap remains fail-closed. |
| ISS-009 | Defect | High | SOFTWARE_RESOLVED / AUTHORITY_OPEN | 4 Hz cached advanced behavior rejected; EI rule is `1 < fn <= 3 Hz`. |
| ISS-010 | Defect | High | SOFTWARE_RESOLVED / AUTHORITY_OPEN | Hidden workbook selector ignored; support derived deterministically. |
| ISS-011 | External CI | High | ROOT_CAUSE_CONFIRMED | Actions runner blocked by account billing/spending; no test step ran. |

## Stage Roadmap and Execution Log

### Stages 1–10 — COMPLETE/PARTIAL AS RECORDED

Roadmap, source inventory/extractor, physical foundation, central benchmark API/Console, workbook-reference kernel, independent hand benchmarks and qualification dossier were implemented. FIT stayed benchmark-only.

### Stage 11 — EI Appendix D qualification — COMPLETE FOR IMPLEMENTATION

Source evidence:

```text
reallaksh19/Common
commit aef163a5def3bfe04ca0ba860da05728a27daf42
EI - AVIFF Guidelines 2nd Edition_Examples.pdf
blob 3e2517d0df527a051084fc02e69cb7afa31f8d47
```

Delivered:

- `Benchmarks/VibrationFIT/fit-ei-worked-examples-v1.json`;
- `tests/vibration-fit-ei-worked-examples.test.mjs`;
- D2 gas/medium-stiff cases;
- D4 multiphase/stiff case;
- D4 liquid/flexible-large case;
- explicit EI reference action bands;
- advanced frequency correction to `1 Hz < fn <= 3 Hz`;
- 273 mm inclusion in large family;
- aggregate-effective multiphase input path.

Focused EI regression reached PASS 8/8, then PASS 12/12 after Stage 12 ambiguity coverage was added.

### Stage 12 — multiphase resolution hardening — COMPLETE FOR IMPLEMENTATION

Behavior:

```text
only aggregate data present   -> AGGREGATE_EFFECTIVE / INFERRED
only component data present   -> COMPONENT_DERIVED / INFERRED
both present, no mode          -> FIT_MULTIPHASE_INPUT_AMBIGUOUS
both present, explicit mode    -> selected mode / EXPLICIT; alternate data retained as provenance only
invalid explicit mode          -> FIT_INPUT_INVALID
```

No method revision was falsely created for this API resolution change; engineering method revision remains `ei-aviff2-fit-reference-v2`.

Focused EI/domain regression: PASS 12/12.

### Stage 13 — machine-readable qualification coverage — COMPLETE FOR IMPLEMENTATION / PARTIAL VALIDATION

#### Implementation performed

Files:

```text
converters/vibration/fit/qualification-coverage.js
converters/vibration/fit/index.js
converters/vibration/fit/calculate.js
converters/engineering-calculations/adapters/vibration-fit.js
tests/vibration-fit-qualification-coverage.test.mjs
```

Runtime domain result now includes:

```text
qualificationCoverage.coverageId = FIT-REFERENCE-COVERAGE-V1
qualificationCoverage.screeningQualified = false
qualificationCoverage.engineeringAuthority = NONE
```

Coverage dimensions:

```text
phasePath
standardCorrelation
advancedCorrelation
referenceBand
```

Each evidence slice reports:

```text
evidenceTypes[]
evidenceIds[]
evidenceStrength
eiPublishedExampleCoverage
independentHandBenchmarkCoverage
retainedWorkbookParityCoverage
equivalenceCoverage
noIndependentExample
```

Central adapter copies the same object into `evidence.qualificationCoverage` and records `provenance.qualificationCoverageId`.

#### Validation performed

```text
qualification-coverage module syntax                    PASS
qualification-coverage synthetic smoke                  PASS
committed Stage 13 test file syntax                     PASS
full committed Stage 13 regression against branch       NOT_RUN
full repository regression                              NOT_RUN
```

Stage decision: **PARTIAL** only because the complete branch checkout is unavailable; implementation is complete and no authority state changed.

### Stage 14 — bounded screening-candidate evidence gate — IN_PROGRESS

#### Current truth

The platform can now distinguish strong and weak independent evidence, but it does not yet provide one explicit machine-readable answer to: “Is this exact executed method slice sufficiently covered to be a *candidate for engineering screening review*?”

#### Objective

Add a pure non-authorizing gate:

```text
evaluateFitScreeningCandidateScope(calculation)
```

The gate is for qualification workflow only. It must never change calculation mode, qualification state, pass/fail semantics or design authority.

#### Planned output

```text
candidateForEngineeringReview: boolean
screeningAuthorized: false
engineeringAuthority: NONE
coverageId: FIT-REFERENCE-COVERAGE-V1
status: <reason code>
reasons[]
```

#### Initial candidate rules

A result may be a candidate only when all are true:

1. successful FIT calculation;
2. standard phase path has EI published-example evidence;
3. standard correlation family has EI published-example evidence;
4. no advanced correlation was used;
5. no unresolved applicability/manual-diameter gap;
6. evidence coverage itself remains non-authorizing.

Therefore the currently expected *candidate review slices* are intentionally narrow:

```text
GAS + MEDIUM_STIFF standard          -> candidate (EI D2)
MULTIPHASE aggregate + STIFF         -> candidate (EI D4)
LIQUID + FLEXIBLE_LARGE standard     -> candidate standard slice (EI D4), but LOF>=1 may still require further engineering assessment
```

Expected non-candidates include:

```text
MEDIUM_SMALL
MEDIUM_LARGE
FLEXIBLE_SMALL
component-derived multiphase path
any advanced correlation path
manual OD family gap
invalid/ambiguous input
```

#### Planned files

```text
converters/vibration/fit/screening-candidate.js
converters/vibration/fit/index.js
converters/vibration/fit/calculate.js
converters/engineering-calculations/adapters/vibration-fit.js
tests/vibration-fit-screening-candidate.test.mjs
agents/PR438_workreport.md
```

#### Planned validation

- EI D2 gas cases return candidate-for-review true;
- EI D4 aggregate/stiff returns true;
- EI D4 flexible-large standard result returns true for the standard slice while assessment remains “further engineering assessment required” at LOF >= 1;
- medium-large/medium-small/flexible-small return false;
- any actually executed advanced path returns false;
- candidate object always has `screeningAuthorized=false` and `engineeringAuthority=NONE`;
- strict/screening central execution remains blocked.

## Validation Ledger

| Check | Status |
|---|---|
| EI/domain regression | PASS 12/12 |
| Stage 13 coverage smoke | PASS |
| Stage 13 test syntax | PASS |
| Stage 13 full branch test | NOT_RUN |
| Stage 14 candidate tests | NOT_RUN |
| Full repository | NOT_RUN |
| Screening authority | NOT_AUTHORIZED |

## Next-Agent Handover

- PR / branch: #438 / `agent/fiv-fit-roadmap-foundation`.
- Current active stage: Stage 14.
- Start here: implement `converters/vibration/fit/screening-candidate.js` as a pure evidence gate.
- Do not change FIT equations or method revision in Stage 14.
- Do not enable central `screening` qualification mode.
- Do not create a `pass` boolean from candidate status.
- Use existing `qualificationCoverage` rather than duplicating source mappings.
- Validate EI-covered and uncovered slices separately.
- Full T2.2 direct page review remains blocked until the pinned full PDF can be rendered directly.
- Highest-risk item: evidence/candidate metadata being misrepresented as engineering approval.
