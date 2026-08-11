# PR438 — FIV / FIT API-First Vibration Work Report

## PR Mission Control

| Field | Current state |
|---|---|
| Mission | Establish a controlled API-first FIT vertical with source-traceable calculations and explicit authority boundaries. |
| Source task / issue | Owner requests 2026-08-11; issue #429; deep-research report; Common `CodingRules.md` pinned at `43eccc27967ecec7d67513c08255398b496be5ce`. |
| PR number | #438 |
| Branch | `agent/fiv-fit-roadmap-foundation` |
| Base commit | `37c37d770ba47ebb3152679265896de4a943c8b0` |
| Current HEAD before Stage 12 production work | `263c49819a5a446afb936a95d7c4f1b35ae1ecba` |
| PR status | OPEN / DRAFT / mergeable |
| Current stage | Stage 12 — IN_PROGRESS: FIT method-domain ambiguity hardening and evidence contract |
| Last stage | Stage 11 — PARTIAL: EI worked-example implementation PASS 8/8; full repo/authority gates still open |
| Engineering status | FIT remains `BENCHMARK_ONLY`; D2/D4 EI examples pass. Screening/design authority are NOT AUTHORIZED. |
| Validation status | EI regression PASS 8/8; prior retained/hand regression PASS; full repo NOT_RUN; Actions runner unavailable due account billing/spending. |
| Current blocker | Stage 12 API ambiguity hardening; then remaining method/project scope review, full checkout and independent engineer approval. |
| Exact next action | Make multiphase resolution explicit/fail-closed when aggregate and component data coexist, expose provenance, add central/API/domain tests, then reconcile authority coverage. |

### Handover in 60 Seconds

**What is true:** Stage 11 corrected the EI boundary defects (`1 < fn <= 3`, 273 mm large family), added aggregate-effective multiphase resolution and neutral LOF bands, and passed the EI D2/D4 regression 8/8.

**What is being worked on:** Stage 12 removes the remaining silent multiphase precedence. Today `density + velocity/mass` automatically selects `AGGREGATE_EFFECTIVE` even if gas/liquid component data are also supplied. That is deterministic software but an unacceptable hidden engineering selection.

**Stage 12 decision:** add an optional explicit domain/API field `multiphaseResolutionMode` with values `AGGREGATE_EFFECTIVE` and `COMPONENT_DERIVED`. When only one complete data shape exists, inference is allowed and recorded. When both data shapes coexist and no mode is supplied, fail closed with `FIT_MULTIPHASE_INPUT_AMBIGUOUS`. When a mode is explicit, use only that qualified path and report `resolutionModeSelection = EXPLICIT`.

**What remains unfinished:** full checkout regression, remaining adopted EI/project method review outside worked-example coverage, QST-003 and independent approval.

**What must not be assumed:** extra component/aggregate values may be silently ignored without provenance; benchmark-only is screening; examples cover all applicability.

**Highest risk:** an upstream table import supplies both aggregate and phase-specific process columns and the engine silently chooses one engineering interpretation.

**Exact next action:** implement Stage 12 domain + adapter + tests, preserve Stage 11 benchmark parity, then record coverage.

## Mission and Engineering Intent

The FIT vertical is the reference pattern for later vibration mechanisms. Product boundary remains table-only; no 3D/canvas. Engineering calculation infrastructure is shared, empirical authority is not.

### Principles

1. No silent engineering defaults or silent authority selection.
2. Validation, resolution, applicability, calculation, assessment, qualification and authority are distinct.
3. Input-resolution decisions must be explicit or safely inferable from an unambiguous data shape.
4. Source/examples validate only the slices they exercise.
5. Stable public ID remains `VIB.FIV.FLOW_TURBULENCE`.
6. Screening/design remain blocked under #429.

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---:|---|---:|---|
| Roadmap/source/extractor | P0 | DONE | 1–6 | controlled docs/tooling |
| FIT physical/reference kernel | P0 | VALIDATED | 7–9 | retained parity + focused suites |
| Central benchmark API/Console | P0 | VALIDATED | 9 | benchmark-only execution |
| Hand-derived benchmark set | P0 | IMPLEMENTED | 10 | independent software oracle |
| EI D2/D4 benchmark set | P0 | VALIDATED | 11 | PASS 8/8 |
| EI 1 Hz / 273 mm corrections | P0 | VALIDATED | 11 | boundary tests PASS |
| Aggregate-effective multiphase | P0 | VALIDATED | 11 | D4 + equivalence PASS |
| Explicit multiphase resolution contract | P0 | IN_PROGRESS | 12 | current stage |
| Full repository regression | P0 | BLOCKED | Forward | Actions billing / checkout |
| Remaining method/project review | P0 | INVESTIGATING | Forward | source + reviewer |
| Screening authority | P0 | BLOCKED | Forward | issue #429 |

## Engineering Item Register

| ID | Type | Priority | Status | Summary |
|---|---|---:|---|---|
| DEC-001 | Decision | P0 | ACCEPTED | Stable ID preserved; FIT terminology canonical. |
| DEC-002 | Decision | P0 | ACCEPTED | Table-only product; no 3D/canvas. |
| DEC-012 | Decision | P0 | ACCEPTED | EI examples are independent benchmark evidence for exercised slices. |
| ISS-009 | Defect | High | DONE | Cached 4 Hz behavior rejected. |
| ISS-010 | Defect | High | DONE | Hidden selector state replaced by deterministic support classification. |
| ISS-011 | External CI | High | DONE | Actions blocked before runner allocation by account condition. |
| ISS-012 | Defect | High | DONE | Exact 1 Hz advanced eligibility fixed. |
| ISS-013 | Defect | High | DONE | 273 mm large-family boundary fixed. |
| IMP-014 | Improvement | P0 | DONE | Aggregate-effective multiphase path. |
| IMP-015 | Improvement | P1 | DONE | Neutral EI LOF bands. |
| ISS-016 | Defect | High | CONFIRMED | Mixed aggregate/component multiphase inputs silently select aggregate path. |
| DEC-017 | Decision | P0 | ACCEPTED | Mixed modes require explicit `multiphaseResolutionMode`; otherwise fail closed. |
| QST-001 | Question | P0 | INVESTIGATING | Remaining adopted T2.2/project parity outside examples. |
| QST-002 | Question | P1 | DEFERRED | Final table-exchange format. |
| QST-003 | Question | P0 | INVESTIGATING | `219.1 < Dext < 273 mm` manual family gap; fail-closed. |

## Stage Roadmap

### Stages 1–10
Roadmap, source extraction, reference kernel, benchmark API/Console, hand benchmarks, qualification dossier and CI investigation are established.

### Stage 11 — EI worked-example qualification — PARTIAL

Implementation completed and focused validation PASS:

```text
EI D2/D4 regression: 8/8 PASS
retained reference cases: 2 PASS
standard Fv families: 6 PASS
threshold/advanced cases: 4 PASS
support boundary: PASS
syntax: PASS
```

Full repository/default-registry/Console execution remains NOT_RUN because Actions cannot allocate a runner and no full authenticated checkout is mounted.

### Stage 12 — multiphase resolution/evidence hardening — IN_PROGRESS

#### Current truth

The domain supports aggregate-effective and component-derived multiphase calculations. If both complete input sets are present, current `usesAggregateMultiphaseInput()` selects aggregate mode automatically. This can occur naturally after merging line-list/HMB data and must not be a silent engineering interpretation.

#### Objective

Make multiphase resolution explicit when ambiguous, infer only when exactly one complete data mode is present, and preserve the selected mode/source in result evidence.

#### Expected scope

```text
converters/vibration/fit/applicability.js
converters/vibration/fit/calculate.js
converters/vibration/fit/index.js
converters/engineering-calculations/adapters/vibration-fit.js
tests/vibration-fit-ei-worked-examples.test.mjs
tests/vibration-fit-workbook-reference.test.mjs or new focused test
docs/vibration/FIT-Engineering-Method-Specification-v1.md
docs/vibration/FIT-Qualification-Dossier-v1.md
agents/PR438_workreport.md
```

#### Planned behavior

```text
Only aggregate shape present      -> infer AGGREGATE_EFFECTIVE / INFERRED
Only component shape present      -> infer COMPONENT_DERIVED / INFERRED
Both shapes + no explicit mode    -> FIT_MULTIPHASE_INPUT_AMBIGUOUS
Both + explicit aggregate mode    -> AGGREGATE_EFFECTIVE / EXPLICIT
Both + explicit component mode    -> COMPONENT_DERIVED / EXPLICIT
Invalid explicit mode             -> FIT_INPUT_INVALID
Explicit mode missing its data    -> fail closed on required fields
```

#### Planned validation

- Stage 11 EI 8/8 remains PASS;
- both-shapes/no-mode fails closed;
- explicit aggregate and explicit component both calculate and report selected mode;
- invalid mode fails validation;
- aggregate/component physical equivalence remains PASS;
- no screening/design authority change.

#### Risks

- central UI must render the new enum without owning engineering logic;
- automatic inference is permitted only for truly unambiguous input shapes;
- extra unselected data must never change the calculation result.

## Validation Ledger

| Check | Status |
|---|---|
| Stage 11 EI regression | PASS 8/8 |
| Prior retained/hand regression | PASS |
| Stage 12 ambiguity tests | NOT_RUN |
| Full repository regression | NOT_RUN |
| GitHub Actions | NOT_RUN — external runner allocation block |
| Screening authority | NOT_RUN / not authorized |

## Next-Agent Handover

- Current stopping point: Stage 12 opened before production changes.
- PR/branch: #438 / `agent/fiv-fit-roadmap-foundation`.
- Start here: `applicability.js` multiphase mode detection/validation.
- Do not redo: EI D2/D4 extraction/benchmarks, CI root cause, Stage 11 corrections.
- Do not assume: mixed multiphase datasets may choose an engineering interpretation implicitly.
- Open questions: QST-001, QST-003; QST-002 deferred.
- Highest risk: silent process-data interpretation.
- Exact next action: implement explicit mode contract + focused tests; keep benchmark-only.
