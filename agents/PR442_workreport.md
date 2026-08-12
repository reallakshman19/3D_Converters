# PR442 — FIT Editable Benchmark Inputs + Multi-Mechanism Shell Work Report

## PR Mission Control

| Field | Current state |
|---|---|
| Mission | Deliver loadable/editable EI FIT benchmark inputs and establish the line-centric vibration mechanism presentation shell without changing numerical authority. |
| Source task | Owner requested Load BENCHMARK/editable inputs, then directed architecture reconsideration using the complete EI worked-example set and requested roadmap + code update. |
| PR number | #442 |
| Branch | `agent/fit-editable-benchmark-inputs` |
| Original base commit | `243042fba24915ae7b2734556cf2d28c1b5425b7` |
| PR status | OPEN / DRAFT |
| Current stage | **Stage 7 — LINE-CENTRIC MULTI-MECHANISM ARCHITECTURE SHELL** |
| Stage decision | **PARTIAL** — focused mechanism-model tests PASS locally; full private-repo release/browser execution remains NOT_RUN. |
| Engineering status | FIT remains `BENCHMARK_ONLY`; non-FIT mechanisms remain `NOT_IMPLEMENTED`; screening/design authority remains NOT AUTHORIZED. |
| Exact next action | Run `npm run verify:vibration-fit-release` and real browser XLSX/CSV flows in a normal checkout; review the new mechanism matrix against the roadmap before merge. |

## Handover in 60 Seconds

PR #442 still uses the existing FIT numerical path and authority. It now also establishes the product architecture needed for the full EI mechanism set:

- the facility result register becomes **line-centric**;
- the register exposes the EI mechanism columns;
- only FIT can project a current calculated benchmark value;
- every non-FIT mechanism fails closed as `NOT_IMPLEMENTED`;
- the current result is labeled **Implemented governing**, never a full vibration-screening governing result;
- `docs/vibration/VibrationIntegrity-MultiMechanism-Roadmap.md` records source evidence, qualification gaps and implementation stages;
- the existing FIT benchmark loader, editable topology/operating/enrichment tables, provenance downgrade and execution path are unchanged.

Current authority boundary:

```text
FIT calculationState      = IMPLEMENTED
FIT qualificationState    = BENCHMARK_ONLY
engineeringAuthority      = NONE
screeningAuthority        = NOT_AUTHORIZED
designAuthority           = false

all non-FIT mechanisms    = NOT_IMPLEMENTED
```

No AIV, mechanical-excitation, deadleg, transient, thermowell, SBC or other mechanism equation was added.

## Mission Status

| Work item | Status | Evidence |
|---|---|---|
| Findings / source inspection | COMPLETE | FIT contracts + complete EI worked-example transcription reviewed |
| PR allocation/report sync | COMPLETE | PR #442 |
| Editable table model | COMPLETE | production-consumed model |
| Controlled EI FIT benchmark loader | COMPLETE | five source-bound FIT cases |
| Visible benchmark/input UI | COMPLETE | real workspace path |
| XLSX/CSV provenance hardening | COMPLETE | unverified/local-edited boundaries |
| Full EI mechanism roadmap | IMPLEMENTED | `docs/vibration/VibrationIntegrity-MultiMechanism-Roadmap.md` |
| Mechanism catalogue | IMPLEMENTED | source-aligned 12-mechanism model |
| Line-centric mechanism matrix | IMPLEMENTED | FIT-only output projection, other mechanisms fail closed |
| Focused mechanism-model regression | PASS | local Node test: 4/4 |
| FIT release-gate manifest | IMPLEMENTED | expanded from 30 to 31 controlled tests |
| Full release command | NOT_RUN | normal checkout required |
| Real browser/XLSX/CSV interaction | NOT_RUN | normal checkout required |
| Independent vibration-engineering approval | NOT_RUN / external | required before authority promotion |

## Engineering Item Register

| ID | Type | Status | Summary |
|---|---|---|---|
| IMP-001 | Improvement | COMPLETE | CSV loads into visible/editable raw-contract tables. |
| IMP-002 | Improvement | COMPLETE | Five controlled EI FIT cases can be loaded and compared to benchmark output. |
| IMP-003 | Improvement | IMPLEMENTED | Facility result presentation is line-centric and source-aligned to the full EI mechanism matrix. |
| ISS-001 | Defect | COMPLETE | Generic Elements CSV no longer claims `Advanced_Analysis.3D_EDIT` provenance from header shape. |
| ISS-002 | Defect | COMPLETE | Edited certified topology rows no longer display/carry `CERTIFIED`; populated rows become `LOCAL_EDITED_UNVERIFIED`. |
| RISK-001 | Risk | MITIGATED | Dirty certified XLSX executes as local `.edited-elements.csv`. |
| RISK-002 | Risk | MITIGATED | Any benchmark mutation invalidates official parity/stale results. |
| RISK-003 | Risk | MITIGATED | Multi-mechanism UI cannot imply non-FIT calculation, zero, pass, safe or applicability. |
| DEC-001 | Decision | ACCEPTED | First topology mutation uses serialized `CSV_ELEMENTS_ONLY` working override. |
| DEC-002 | Decision | ACCEPTED | Operating/enrichment rows round-trip through existing v1 CSV contracts. |
| DEC-003 | Decision | ACCEPTED | Official benchmark parity only for untouched controlled case inputs. |
| DEC-004 | Decision | ACCEPTED | Use existing five controlled EI FIT cases; no invented numerical demo. |
| DEC-005 | Decision | ACCEPTED | Modified-case target stays informational; parity becomes not applicable. |
| DEC-006 | Decision | ACCEPTED | Header-compatible Elements CSV is unverified; richer upstream authority exists only on complete XLSX path. |
| DEC-007 | Decision | ACCEPTED | Product architecture is line/case + shared basis + mechanism assessments; FIT-specific hydraulics remain inside FIT. |
| DEC-008 | Decision | ACCEPTED | `Implemented governing` is limited to mechanisms that actually execute; full screening governing remains unestablished. |
| QST-001 | Qualification | OPEN | Non-FIT mechanism method/source/independent validation must close separately before implementation/authority. |

## Controlled Source Basis

Complete worked-example source context:

```text
reallaksh19/Common
commit fb549185b9b27edc2379734240320a85c5bef9f6
Energy-Institute-AVIFF---Worked-Examples.doc.docx
blob ceee15ed5f7f320045d5f3979024e2e8664613f2
```

Retained Markdown transcription exists on current `main`:

```text
docs/Energy-Institute-AVIFF---Worked-Examples.md
```

The complete example set shows populated evidence for:

- FIT;
- mechanical excitation;
- deadleg pulsation;
- AIV;
- valve transients;
- thermowells;
- SBC.

The report also contains headings for reciprocating/PD pulsation, rotating stall, corrugated-pipe pulsation, slug flow and cavitation/flashing without populated retained worked-example rows. Those empty sections are **not qualification evidence**.

## Stage Execution Log

### Stage 1 — Findings
**COMPLETE.** Existing FIT UI loaded files but did not expose editable raw tables. Strict CSV helpers and five controlled EI FIT cases already existed.

### Stage 2 — PR allocation
**COMPLETE.** Draft PR #442 allocated; pending report renamed/deleted.

### Stage 3 — Changed-file verification
**COMPLETE / PASS.** Pre-production diff was exactly `agents/PR442_workreport.md`.

### Stage 4 — Core FIT input behavior
**COMPLETE.** Added editable table state, controlled UI benchmark catalogue and source-bound tests. Benchmark tables reuse production CSV contracts.

### Stage 5 — Workspace integration / authority hardening
**COMPLETE.** Added benchmark selector, editable topology/operating/enrichment tables, current-table readiness/run path and topology source downgrade behavior.

Authority fixes retained:

- generic Elements CSV = `UNVERIFIED_ELEMENTS_CSV`;
- dirty XLSX working file = `*.edited-elements.csv`;
- populated edited topology rows = `LOCAL_EDITED_UNVERIFIED`;
- blank added topology rows stay blank until populated.

### Stage 6 — Validation / docs / closure
**PARTIAL.** Source-level validation and 30-file release-manifest reconciliation completed; executable full repository/browser evidence remained NOT_RUN.

### Stage 7 — Line-centric multi-mechanism architecture shell
**PARTIAL.**

#### Current truth

The complete EI worked-example transcription proves that FIT is one mechanism inside a wider line-screening report. The previous FIT-only facility register would create an architectural rewrite when later mechanisms arrive.

#### Objective

Change presentation architecture now without creating a second numerical path or pretending non-FIT mechanisms are calculated.

#### Implemented

- `docs/vibration/VibrationIntegrity-MultiMechanism-Roadmap.md`
  - canonical line/mechanism model;
  - EI mechanism evidence matrix;
  - UI target;
  - state/traceability contracts;
  - staged qualification roadmap.
- `tabs/vibration-integrity-mechanisms.js`
  - source-aligned 12-mechanism catalogue;
  - FIT projection from existing register rows;
  - all other mechanisms `NOT_IMPLEMENTED`;
  - `fullScreeningGoverningEstablished=false`.
- `tabs/vibration-integrity-view.js`
  - facility register renamed/reframed as line-centric vibration screening register;
  - mechanism columns align to retained EI report;
  - only FIT renders a current value;
  - other mechanism cells render blank with explicit not-implemented semantics;
  - current governing label is `Implemented governing`;
  - explicit authority banner remains.
- `tests/vibration-integrity-mechanism-matrix.test.mjs`
  - exact mechanism catalogue;
  - FIT-only projection;
  - non-FIT fail-closed behavior;
  - no full-screening governing claim;
  - unknown mechanism fails closed.
- FIT release gate expanded from 30 to 31 tests.

#### Validation

PASS:

```text
node --test tests/vibration-integrity-mechanism-matrix.test.mjs
4 tests / 4 PASS
```

Local syntax checks PASS for:

```text
tabs/vibration-integrity-mechanisms.js
tabs/vibration-integrity-view.js
scripts/verify-vibration-fit-release.mjs
tests/vibration-integrity-mechanism-matrix.test.mjs
tests/vibration-fit-release-gate.test.mjs
```

NOT_RUN:

```text
npm run verify:vibration-fit-release
real browser facility register
real XLSX / CSV edit interaction
independent vibration-engineering review
```

Stage decision: **PARTIAL**, because architecture/source validation is complete but current-head full executable/browser evidence remains unavailable in this environment.

## Exact Changed-File Ledger — 20/20 explained

1. `agents/PR442_workreport.md` — CodingRules living report.
2. `converters/vibration/exchange/parse-csv.js` — unverified Elements CSV provenance.
3. `docs/vibration/VibrationIntegrityTab-v1.md` — existing editable/benchmark/provenance UX contract.
4. `docs/vibration/VibrationIntegrity-MultiMechanism-Roadmap.md` — NEW full mechanism architecture/qualification roadmap.
5. `scripts/verify-vibration-fit-release.mjs` — release gate now includes 31 tests.
6. `tabs/vibration-integrity-benchmarks.js` — five controlled EI FIT UI benchmark cases.
7. `tabs/vibration-integrity-input-model.js` — editable working table state.
8. `tabs/vibration-integrity-input-runtime.js` — current-table execution/source selection.
9. `tabs/vibration-integrity-input-view.js` — benchmark and editable input UI.
10. `tabs/vibration-integrity-mechanisms.js` — NEW mechanism catalogue + fail-closed projection.
11. `tabs/vibration-integrity-tab.js` — controller integration; existing numerical workflow only.
12. `tabs/vibration-integrity-view.js` — line-centric mechanism matrix presentation.
13. `tabs/vibration-integrity.css` — existing editor/benchmark presentation.
14. `tests/vibration-elements-csv-provenance.test.mjs` — CSV authority regression.
15. `tests/vibration-fit-release-gate.test.mjs` — pins 31-file release manifest.
16. `tests/vibration-fit-ui-benchmarks.test.mjs` — UI benchmark/source parity.
17. `tests/vibration-integrity-editable-input-static.test.mjs` — visible behavior / no direct solver authority.
18. `tests/vibration-integrity-input-model.test.mjs` — edit/dirty/local status regression.
19. `tests/vibration-integrity-input-runtime.test.mjs` — untouched XLSX vs edited CSV execution boundary.
20. `tests/vibration-integrity-mechanism-matrix.test.mjs` — NEW source-aligned mechanism/fail-closed regression.

No workflow, FIT numerical kernel, AIV solver, deadleg solver, transient solver, thermowell solver, SBC solver, 3D/canvas or unrelated product file is changed.

## Engineering Invariants

- **INV-001:** one numerical path only: table UI -> existing facility workflow -> central Engineering Calculation API.
- **INV-002:** edited topology is never represented as certified topology.
- **INV-003:** official benchmark parity is exact-input evidence only.
- **INV-004:** FIT remains `BENCHMARK_ONLY`; no safe/pass screening semantics.
- **INV-005:** uploaded CSV becomes visible working table state; current cells are execution input.
- **INV-006:** source identity follows evidence; CSV header compatibility is not certification.
- **INV-007:** table mutation clears stale preflight/results before the next run.
- **INV-008:** `NOT_IMPLEMENTED` is distinct from `NOT_APPLICABLE`.
- **INV-009:** blank non-FIT mechanism cells never mean zero, pass or safe.
- **INV-010:** current `Implemented governing` cannot be represented as full vibration-screening governing.
- **INV-011:** UI mechanism shell never recomputes engineering results.
- **INV-012:** every future mechanism requires its own source/method/independent qualification evidence.

## Validation / Evidence Ledger

### PASS

- source/import architecture review;
- complete EI worked-example mechanism-coverage review;
- source-aligned mechanism catalogue review;
- focused mechanism-model test: 4/4 PASS;
- new/changed Stage 7 JavaScript syntax checks;
- mechanism model has real production consumer in `vibration-integrity-view.js`;
- release manifest source update to 31 unique intended tests;
- no non-FIT calculation function introduced;
- no FIT numerical kernel changed.

### NOT_RUN

- full `npm run verify:vibration-fit-release`;
- full repository static/integration suite;
- real-browser line/mechanism matrix;
- real-browser XLSX / CSV interaction;
- independent engineering review.

### NOT_APPLICABLE

- non-FIT numerical qualification — no non-FIT solver exists.
- screening/design authority — no promotion requested or implemented.

## Known / Deferred Work

- Execute 31-file FIT/VIB release gate in a normal authenticated checkout.
- Browser-check wide mechanism matrix at engineering desktop widths.
- Implement original/working value/unit/source state and run-snapshot/stale-result contract from Appendix A.
- Make joined line/case engineering basis the primary editable projection while retaining raw source tables.
- Extract FIT presentation into an explicit mechanism detail module without changing the numerical kernel.
- Qualify each future mechanism separately per the new roadmap.
- Empty EI worked-example sections require additional controlled evidence before implementation.
- AIV issue/track remains independent until its own source/method evidence closes.

## Next-Agent Handover

PR/branch:

```text
#442
agent/fit-editable-benchmark-inputs
```

Do not add non-FIT numerical code simply because the mechanism columns now exist.

Exact next validation in a normal checkout:

```bash
npm install
npm run verify:vibration-fit-release
```

Then manually verify:

1. untouched complete XLSX;
2. edited XLSX downgrade;
3. Elements CSV import/edit;
4. operating/enrichment CSV import/edit;
5. all five FIT benchmark cases;
6. benchmark mutation -> parity invalidation -> reload;
7. facility register displays all mechanism headings;
8. only FIT displays calculated values;
9. non-FIT cells do not imply N/A/zero/pass;
10. `Implemented governing` is visibly limited to executed mechanisms.

Merge only with Owner authorization after validation evidence is acceptable.
