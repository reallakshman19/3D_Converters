# PR438 — FIV / FIT API-First Vibration Work Report

## PR Mission Control

| Field | Current state |
|---|---|
| Mission | Establish a controlled API-first FIT vertical with source-traceable calculations and explicit authority boundaries. |
| Source task / issue | Owner requests 2026-08-11; issue #429; deep-research report; Common `CodingRules.md` pinned at `43eccc27967ecec7d67513c08255398b496be5ce`. |
| PR number | #438 |
| Branch | `agent/fiv-fit-roadmap-foundation` |
| Base commit | `37c37d770ba47ebb3152679265896de4a943c8b0` |
| Current HEAD before this report update | `086852dbaef0a514e5b988941b56b3e29fbeb9ec` |
| PR status | OPEN / DRAFT / mergeable before final reconciliation |
| Current stage | Stage 12 — **PARTIAL**: input-resolution hardening PASS; full central repo regression still NOT_RUN |
| Last stage | Stage 11 — EI worked-example qualification PASS in focused fixture |
| Engineering status | FIT remains `BENCHMARK_ONLY`. Screening/design authority are NOT AUTHORIZED. |
| Validation status | EI/domain regression PASS 12/12; prior retained/hand regression PASS; full repo NOT_RUN; Actions unavailable due account billing/spending. |
| Current blocker | Define bounded screening candidate scope, remaining adopted method/project review, QST-003, full checkout and independent engineer approval. |
| Exact next action | Open Stage 13: convert the evidence set into an explicit supported/excluded FIT qualification envelope and boundary tests; do not promote authority yet. |

### Handover in 60 Seconds

**What is now true:** FIT is deterministic, benchmark-only, and independently checked against EI D2/D4. Stage 12 removed silent multiphase data selection.

**Stage 12 contract:**

```text
only aggregate shape -> AGGREGATE_EFFECTIVE / INFERRED
only component shape -> COMPONENT_DERIVED / INFERRED
both shapes, no mode -> FIT_MULTIPHASE_INPUT_AMBIGUOUS
both + explicit aggregate -> AGGREGATE_EFFECTIVE / EXPLICIT
both + explicit component -> COMPONENT_DERIVED / EXPLICIT
invalid mode -> FIT_INPUT_INVALID
```

`inputResolution` evidence records selected mode, inferred/explicit selection, and whether alternate-mode data were present.

**Stage 12 validation:** expanded committed EI/domain regression PASS 12/12. Five published EI D2/D4 numerical cases remain unchanged. Mixed-mode ambiguity and explicit-selection cases pass.

**Architecture decision:** method revision remains `ei-aviff2-fit-reference-v2`; input-resolution hardening is an API/evidence contract change, not a false new EI engineering-method revision.

**Remaining:** full central/default-registry/Console/batch execution, exact bounded screening scope, QST-003, adopted project basis and independent engineer approval.

**Highest risk:** broadening from benchmark evidence to screening authority without explicitly stating which portions of the method are actually qualified.

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---:|---|---:|---|
| Roadmap/source/extractor | P0 | DONE | 1–6 | controlled |
| Physical/reference FIT kernel | P0 | VALIDATED | 7–9 | retained parity / focused tests |
| Central benchmark API/Console | P0 | VALIDATED | 9 | benchmark mode only |
| Independent hand benchmarks | P0 | IMPLEMENTED | 10 | software oracle |
| EI D2/D4 benchmark set | P0 | VALIDATED | 11 | published-case parity |
| EI frequency/diameter corrections | P0 | VALIDATED | 11 | boundary PASS |
| Explicit multiphase resolution contract | P0 | VALIDATED | 12 | 12/12 focused suite |
| Input-resolution provenance | P0 | VALIDATED | 12 | mode/selection/alternate-data evidence |
| Bounded screening candidate envelope | P0 | NEXT | 13 | not yet authority |
| Full repository regression | P0 | BLOCKED | Forward | Actions/account or checkout |
| Independent engineering approval | P0 | BLOCKED | Forward | identified reviewer |
| Screening authority | P0 | BLOCKED | Forward | #429 |

## Engineering Item Register

| ID | Type | Priority | Status | Summary |
|---|---|---:|---|---|
| DEC-001 | Decision | P0 | ACCEPTED | Stable public ID; FIT canonical terminology. |
| DEC-002 | Decision | P0 | ACCEPTED | Table-only product; no 3D/canvas. |
| DEC-012 | Decision | P0 | ACCEPTED | EI examples qualify only exercised method slices. |
| ISS-009 | Defect | High | DONE | Cached 4 Hz advanced behavior rejected. |
| ISS-010 | Defect | High | DONE | Hidden selector state ignored; support deterministic. |
| ISS-011 | External CI | High | DONE | Actions runner blocked by account billing/spending. |
| ISS-012 | Defect | High | DONE | Exact 1 Hz advanced boundary fixed. |
| ISS-013 | Defect | High | DONE | 273 mm large-family boundary fixed. |
| IMP-014 | Improvement | P0 | DONE | Aggregate-effective multiphase path. |
| IMP-015 | Improvement | P1 | DONE | Neutral EI LOF bands. |
| ISS-016 | Defect | High | DONE | Mixed multiphase data no longer silently select aggregate path. |
| DEC-017 | Decision | P0 | ACCEPTED | Ambiguous mixed modes require explicit selection. |
| QST-001 | Question | P0 | INVESTIGATING | Remaining adopted T2.2/project coverage. |
| QST-002 | Question | P1 | DEFERRED | Final table exchange. |
| QST-003 | Question | P0 | INVESTIGATING | `219.1 < Dext < 273 mm` manual family gap. |

## Stage Roadmap and Execution Log

### Stages 1–10
Roadmap, source extraction, reference kernel, benchmark API/Console, hand benchmarks, qualification dossier and CI investigation established.

### Stage 11 — EI worked-example qualification — PARTIAL

Source-backed corrections implemented. Focused EI regression passed. Full repository execution remains unavailable.

### Stage 12 — multiphase resolution/evidence hardening — PARTIAL

#### Objective

Eliminate silent engineering selection when aggregate-effective and component-derived multiphase data coexist.

#### Implementation

Changed:

```text
converters/vibration/fit/applicability.js
converters/vibration/fit/calculate.js
converters/vibration/fit/index.js
converters/engineering-calculations/adapters/vibration-fit.js
tests/vibration-fit-ei-worked-examples.test.mjs
docs/vibration/FIT-Engineering-Method-Specification-v1.md
docs/vibration/FIT-Qualification-Dossier-v1.md
agents/PR438_workreport.md
```

Domain/API field:

```text
multiphaseResolutionMode:
  AGGREGATE_EFFECTIVE
  COMPONENT_DERIVED
```

Automatic inference is allowed only when the process-data shape is unambiguous. Mixed shapes without explicit mode fail closed.

Result provenance/evidence now contains:

```text
inputResolution.multiphaseResolutionMode
inputResolution.selection
inputResolution.alternateModeDataPresent
```

The UI receives this as a generic enum field from the central definition; no equation or mode-selection logic is placed in the Console.

#### Validation

**PASS — focused committed EI/domain regression:**

```text
12 tests / 12 passed / 0 failed
```

Coverage:
- five EI D2/D4 numerical cases;
- exact 1 Hz rejected / 3 Hz accepted;
- 273 mm flexible-large;
- inferred aggregate/component physical equivalence;
- mixed-shape/no-mode fail-closed;
- explicit aggregate mode;
- explicit component mode;
- invalid mode rejection.

**PASS — Stage 12 ad-hoc branch-module ambiguity check.**

**PASS — Stage 11 prior retained/hand regression remains clean.**

**NOT_RUN — full central/default-registry/Console/batch test graph** due unavailable authenticated checkout and GitHub Actions runner allocation block.

#### Deviations

An initial Stage 12 adapter edit incremented `methodRevision` to v3. This was corrected before stage closure: the engineering method did not change; only API input resolution changed. Final method revision remains `ei-aviff2-fit-reference-v2`.

#### Stage decision

**PARTIAL** — production hardening and focused qualification are complete; full repository/release validation remains external.

## Validation Ledger

| Check | Status |
|---|---|
| EI/domain focused suite | PASS 12/12 |
| Retained/hand regression | PASS |
| Stage 12 syntax/domain execution | PASS |
| Full central repo graph | NOT_RUN |
| GitHub Actions | NOT_RUN — external account block |
| Screening authority | NOT_RUN / not authorized |

## Next-Agent Handover

- Current stopping point: Stage 12 implementation/qualification complete; authority unchanged.
- PR/branch: #438 / `agent/fiv-fit-roadmap-foundation`.
- Start here: Stage 13 bounded qualification envelope.
- Do not redo: EI example work, frequency/273 fixes, multiphase ambiguity contract, CI billing investigation.
- Do not assume: benchmark evidence qualifies untested method regions.
- Open questions: QST-001/QST-003; QST-002 deferred.
- Highest risk: over-broad screening scope.
- Exact next action: define machine-readable supported/excluded candidate envelope + boundary tests, still `BENCHMARK_ONLY`.
