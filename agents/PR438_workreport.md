# PR438 — FIV / FIT API-First Vibration Work Report

## PR Mission Control

| Field | Current state |
|---|---|
| Mission | Establish a controlled API-first FIT vertical with source-traceable calculations and explicit authority/evidence boundaries. |
| Source task / issue | Owner requests 2026-08-11; issue #429; deep-research report; Common `CodingRules.md` pinned at `43eccc27967ecec7d67513c08255398b496be5ce`. |
| PR number | #438 |
| Branch | `agent/fiv-fit-roadmap-foundation` |
| Base commit | `37c37d770ba47ebb3152679265896de4a943c8b0` |
| Current HEAD before Stage 13 production work | `de45655182eb6c53549d46b7d1860b95a5c188b9` |
| PR status | OPEN / DRAFT / mergeable |
| Current stage | Stage 13 — IN_PROGRESS: machine-readable FIT qualification/evidence coverage |
| Last stage | Stage 12 — PARTIAL: multiphase resolution hardening PASS 12/12; full repo still NOT_RUN |
| Engineering status | FIT remains `BENCHMARK_ONLY`; screening/design NOT AUTHORIZED. |
| Validation status | EI/domain 12/12 PASS; retained/hand regression PASS; full repo NOT_RUN. |
| Current blocker | Evidence is not yet machine-readable per correlation/phase path; then remaining adopted method/project review/full checkout/engineer approval. |
| Exact next action | Add runtime evidence coverage mapping, expose it through domain/central evidence, test stronger/weaker coverage classes, keep authority unchanged. |

### Handover in 60 Seconds

**What is true:** FIT D2/D4 example parity and input-resolution qualification pass. The numerical kernel includes six standard correlation families and two advanced families, but the independent evidence is not equally strong for every family.

**Stage 13 objective:** encode evidence strength without conflating it with engineering authority.

Planned evidence classes:

```text
EI_WORKED_EXAMPLE_POINT
RETAINED_WORKBOOK_PARITY
INDEPENDENT_HAND_BENCHMARK
EQUIVALENCE_TEST
NO_INDEPENDENT_EXAMPLE
```

Examples:

```text
MEDIUM_STIFF gas standard path -> EI D2 worked-example points
STIFF multiphase aggregate -> EI D4 worked-example point
FLEXIBLE_LARGE liquid standard -> EI D4 worked-example point
MEDIUM_SMALL / MEDIUM_LARGE / FLEXIBLE_SMALL standard -> hand/workbook evidence, no EI worked-example point
advanced flexible correlations -> hand/workbook evidence, no EI Appendix D qualification point currently
component multiphase resolution -> workbook/equivalence evidence; D4 independently validates aggregate-effective path
```

**Why:** a runtime result should be able to say which method slice has independent example evidence and which remains weaker, without changing `BENCHMARK_ONLY` authority.

**Highest risk:** an eventual screening UI treats every executable family as equally qualified.

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---:|---|---:|---|
| Source/reference kernel | P0 | VALIDATED | 6–9 | controlled source + parity |
| Hand benchmarks | P0 | IMPLEMENTED | 10 | independent arithmetic |
| EI D2/D4 | P0 | VALIDATED | 11 | example parity |
| Multiphase explicit resolution | P0 | VALIDATED | 12 | 12/12 suite |
| Runtime qualification coverage | P0 | IN_PROGRESS | 13 | current stage |
| Full repo regression | P0 | BLOCKED | Forward | Actions/checkout |
| Method/project authority review | P0 | INVESTIGATING | Forward | reviewer/source |
| Screening authority | P0 | BLOCKED | Forward | #429 |

## Engineering Item Register

| ID | Type | Priority | Status | Summary |
|---|---|---:|---|---|
| DEC-001 | Decision | P0 | ACCEPTED | Stable ID and FIT terminology. |
| DEC-012 | Decision | P0 | ACCEPTED | EI examples qualify only exercised slices. |
| DEC-017 | Decision | P0 | ACCEPTED | Mixed multiphase data require explicit mode. |
| DEC-018 | Decision | P0 | ACCEPTED | Runtime evidence coverage is separate from qualification/engineering authority. |
| RISK-018 | Risk | High | ACCEPTED | Equal executable behavior could be mistaken for equal independent qualification evidence. |
| QST-001 | Question | P0 | INVESTIGATING | Remaining adopted T2.2/project coverage. |
| QST-003 | Question | P0 | INVESTIGATING | Manual OD gap; fail-closed. |

## Stage Roadmap

### Stages 1–12
Roadmap, source extraction, reference kernel, central benchmark API/Console, hand/EI benchmarks and ambiguity hardening are implemented. Focused domain/EI tests pass; full repo remains externally constrained.

### Stage 13 — qualification/evidence coverage — IN_PROGRESS

#### Objective

Attach machine-readable evidence coverage to each FIT benchmark result without changing its calculation or authority.

#### Expected files

```text
converters/vibration/fit/qualification-coverage.js
converters/vibration/fit/index.js
converters/vibration/fit/calculate.js
converters/engineering-calculations/adapters/vibration-fit.js
tests/vibration-fit-qualification-coverage.test.mjs
docs/vibration/FIT-Engineering-Method-Specification-v1.md
docs/vibration/FIT-Qualification-Dossier-v1.md
agents/PR438_workreport.md
```

#### Planned behavior

Coverage will report evidence for:

```text
phase/hydraulic path
multiphase resolution path
standard support correlation family
advanced correlation family, if used
reference bands
```

Every coverage object must include:

```text
screeningQualified = false
engineeringAuthority = NONE
```

Coverage metadata must never override central qualification state.

#### Validation

- D2 medium-stiff gas maps to EI D2 evidence;
- D4 stiff aggregate multiphase maps to EI D4 evidence;
- D4 flexible-large liquid maps to EI D4 evidence;
- medium-large/small families are explicitly weaker evidence;
- advanced paths are explicitly not EI-worked-example qualified;
- existing 12/12 EI regression unchanged;
- authority remains benchmark-only.

## Validation Ledger

| Check | Status |
|---|---|
| Stage 12 EI/domain | PASS 12/12 |
| Stage 13 coverage tests | NOT_RUN |
| Full repo | NOT_RUN |
| Screening authority | NOT_RUN / not authorized |

## Next-Agent Handover

- Current stopping point: Stage 13 opened before production changes.
- Start here: new pure `qualification-coverage.js` module.
- Do not change formulas/thresholds in this stage.
- Do not equate coverage evidence with authority.
- Exact next action: implement coverage map + tests and propagate through evidence.
