# PR442 — FIT Editable Inputs + Multi-Mechanism / Working-State Work Report

## PR Mission Control

| Field | Current state |
|---|---|
| Mission | Deliver editable controlled FIT benchmark inputs, establish the line-centric vibration mechanism shell, and establish canonical original/working execution state without changing numerical authority. |
| Source task | Owner requested Load BENCHMARK/editable inputs, then full EI-set architecture roadmap/code update, then directed the next roadmap stage. |
| PR number | #442 |
| Branch | `agent/fit-editable-benchmark-inputs` |
| Original base | `243042fba24915ae7b2734556cf2d28c1b5425b7` |
| Current work-report stage | **Stage 8 — CANONICAL ORIGINAL / WORKING ENGINEERING STATE** |
| Roadmap stage | **Stage 2 — Canonical original / working engineering state** |
| Stage decision | **PARTIAL** — focused state/snapshot tests and syntax validation PASS; full private-repo release/browser execution remains NOT_RUN. |
| FIT authority | `BENCHMARK_ONLY` |
| Non-FIT mechanisms | `NOT_IMPLEMENTED` |
| Screening/design authority | `NOT_AUTHORIZED` / `false` |
| Exact next action | Run the full 33-file release gate and real browser edit/revert/unit/snapshot flows; if clean, proceed to Roadmap Stage 3 joined line/case engineering-basis projection. |

## Handover in 60 Seconds

PR #442 now contains three bounded product layers:

1. controlled EI FIT benchmark loading and editable topology/operating/enrichment inputs;
2. line-centric multi-mechanism facility result presentation with FIT as the only executable mechanism;
3. canonical original/working input state with stable row IDs, exact revert, central unit-aware edits, deterministic run snapshots and explicit stale-result semantics.

Current authority remains frozen:

```text
FIT calculationState      = IMPLEMENTED
FIT qualificationState    = BENCHMARK_ONLY
engineeringAuthority      = NONE
screeningAuthority        = NOT_AUTHORIZED
designAuthority           = false

all non-FIT mechanisms    = NOT_IMPLEMENTED
```

Key Stage-8 behavior:

- source rows have stable deterministic IDs;
- local rows have stable local IDs;
- original and working values coexist;
- cell/table revert is visible and exact for engineering values;
- known unit-only changes convert numeric values through the central unit layer;
- unknown numeric enrichment unit semantics fail closed;
- certified topology authority downgrade is latched after first mutation and survives value revert;
- engineering edits preserve the previous result as `STALE_RESULT` instead of deleting it;
- stale output remains inspectable but cannot export or claim benchmark parity;
- successful runs create a SHA-256 `FitRunSnapshot.v1` over `FitWorkingInputState.v1`.

No FIT kernel or non-FIT numerical mechanism changed.

## Mission Status

| Work item | Status | Evidence |
|---|---|---|
| Controlled EI FIT benchmark loader | COMPLETE | five source-bound cases |
| Editable source-contract tables | COMPLETE | production UI/runtime |
| XLSX/CSV provenance hardening | COMPLETE | unverified/local override boundaries |
| Full EI mechanism roadmap | IMPLEMENTED | `VibrationIntegrity-MultiMechanism-Roadmap.md` |
| Line-centric mechanism matrix | IMPLEMENTED | FIT-only numerical projection |
| Stable original/working row model | IMPLEMENTED | `vibration-integrity-working-state.js` |
| Stable source/local row IDs | IMPLEMENTED | model + tests |
| Cell/table revert | IMPLEMENTED | model + UI controls |
| Unit-aware known quantity editing | IMPLEMENTED | central `convertEngineeringUnit()` |
| Unknown unit semantics fail closed | IMPLEMENTED | `VIBRATION_INPUT_UNIT_CONTEXT_UNRESOLVED` |
| Topology authority latch | IMPLEMENTED | `authorityDowngraded` independent of value dirty state |
| Run snapshot / SHA-256 | IMPLEMENTED | `FitRunSnapshot.v1` |
| Stale result preservation | IMPLEMENTED | `STALE_RESULT`; export/parity blocked |
| Focused Stage-8 pure tests | PASS | 5/5 |
| [SIMULATED] focused input-model harness | PASS | 8/8 with reconstructed current contracts |
| Stage-8 syntax checks | PASS | changed production/test JS |
| Full release command | NOT_RUN | no full checkout/dependency tree in this runtime |
| Real browser edit/revert/unit flow | NOT_RUN | browser evidence required |
| Independent vibration-engineering approval | NOT_RUN / external | required before authority promotion |

## Engineering Item Register

| ID | Type | Status | Summary |
|---|---|---|---|
| IMP-001 | Improvement | COMPLETE | CSV loads into visible/editable raw-contract tables. |
| IMP-002 | Improvement | COMPLETE | Five controlled EI FIT cases load and compare to benchmark output. |
| IMP-003 | Improvement | IMPLEMENTED | Facility register is line-centric and aligned to the full EI mechanism set. |
| IMP-004 | Improvement | IMPLEMENTED | Input tables retain canonical original/working state with stable IDs and revert. |
| IMP-005 | Improvement | IMPLEMENTED | FIT run captures deterministic SHA-256 working-input snapshot. |
| IMP-006 | Improvement | IMPLEMENTED | Previous results persist as visibly stale after engineering edits. |
| ISS-001 | Defect | COMPLETE | Generic Elements CSV no longer claims certified 3D EDIT provenance. |
| ISS-002 | Defect | COMPLETE | Edited topology rows no longer retain `CERTIFIED` status. |
| RISK-001 | Risk | MITIGATED | Dirty certified XLSX executes as local Elements CSV. |
| RISK-002 | Risk | MITIGATED | Modified benchmark cannot claim official parity. |
| RISK-003 | Risk | MITIGATED | Multi-mechanism UI cannot imply non-FIT calculation/pass/safe/N/A. |
| RISK-004 | Risk | MITIGATED | Exact value revert cannot silently regain certified topology authority. |
| RISK-005 | Risk | MITIGATED | Stale result cannot be exported or used for current benchmark parity. |
| DEC-001 | Decision | ACCEPTED | First topology mutation executes serialized `CSV_ELEMENTS_ONLY` override. |
| DEC-002 | Decision | ACCEPTED | Operating/enrichment tables reuse existing v1 CSV contracts. |
| DEC-003 | Decision | ACCEPTED | Official benchmark parity requires exact controlled working inputs and a current result. |
| DEC-004 | Decision | ACCEPTED | Use the five retained EI FIT cases; no invented numerical demo. |
| DEC-005 | Decision | ACCEPTED | Modified-case target is informational only. |
| DEC-006 | Decision | ACCEPTED | Header-compatible Elements CSV remains unverified. |
| DEC-007 | Decision | ACCEPTED | Product architecture is line/case + shared basis + independent mechanism assessments. |
| DEC-008 | Decision | ACCEPTED | `Implemented governing` is limited to mechanisms that actually execute. |
| DEC-009 | Decision | ACCEPTED | Stable row IDs are source/local identities independent of visible row position. |
| DEC-010 | Decision | ACCEPTED | Unit-only edits convert numeric values only where engineering quantity semantics are known. |
| DEC-011 | Decision | ACCEPTED | Topology authority downgrade is a separate latch from engineering dirty/equality state. |
| DEC-012 | Decision | ACCEPTED | Result currency is explicit; edits create `STALE_RESULT` and preserve evidence. |
| DEC-013 | Decision | ACCEPTED | Current Stage-2 hash is a working-input/evidence snapshot; normalized engineering-input hash is deferred to joined shared-basis requests. |
| QST-001 | Qualification | OPEN | Non-FIT mechanisms require separate adopted methods and independent validation. |
| QST-002 | Qualification | OPEN | Full browser confirmation is required that displayed snapshot hash corresponds to the exact consumed execution state. |

## Controlled Source Basis

Full worked-example source:

```text
reallaksh19/Common
commit fb549185b9b27edc2379734240320a85c5bef9f6
Energy-Institute-AVIFF---Worked-Examples.doc.docx
blob ceee15ed5f7f320045d5f3979024e2e8664613f2
```

Retained transcription:

```text
docs/Energy-Institute-AVIFF---Worked-Examples.md
```

Controlled FIT qualification source remains the existing five-case benchmark JSON and independent hand benchmarks. No numerical authority is inferred from the wider example set.

## Stage Execution Log

### Stage 1 — Findings
**COMPLETE.** Existing FIT input/import/benchmark paths inspected.

### Stage 2 — PR allocation
**COMPLETE.** Draft PR #442 allocated and work report established.

### Stage 3 — Changed-file verification
**COMPLETE / PASS.** Scope established before production edits.

### Stage 4 — Core FIT input behavior
**COMPLETE.** Added editable table state and five controlled benchmark cases using production CSV contracts.

### Stage 5 — Workspace integration / authority hardening
**COMPLETE.** Added benchmark loader, editable tables, CSV/XLSX flow, current-table execution and provenance downgrade.

### Stage 6 — Initial validation / docs
**PARTIAL.** Source validation complete; full release/browser evidence unavailable.

### Stage 7 — Line-centric multi-mechanism architecture shell
**PARTIAL.** Added full roadmap, 12-mechanism catalogue, FIT-only facility matrix and fail-closed non-FIT behavior. Focused mechanism model test 4/4 PASS; full release/browser NOT_RUN.

### Stage 8 — Canonical original / working engineering state
**PARTIAL.**

#### Current truth before implementation

The previous editable table model stored only current row strings. A mutation destroyed the direct original/current relationship, row identity followed array position, topology certification and dirty state were overloaded, and any edit deleted prior calculation results rather than retaining explicit stale evidence.

#### Objective

Implement Roadmap Stage 2 at the shared table input layer without changing the FIT numerical kernel or introducing a second editable authority store.

#### Implemented behavior

`tabs/vibration-integrity-working-state.js`:

- immutable source/local working records;
- stable row IDs;
- original + working row values;
- deleted source-row tombstones;
- add/delete/edit/revert helpers;
- dirty/edit-count calculation with explicitly ignored provenance columns.

`tabs/vibration-integrity-input-model.js`:

- production tables consume the new working record model;
- `rows` remains the backward-compatible current execution projection;
- `rowIds`, `editCount`, `authorityDowngraded` added;
- cell/table revert exported;
- known operating/enrichment unit edits call central `convertEngineeringUnit()`;
- unknown numeric enrichment unit conversions fail closed;
- topology `Source Status` is treated as provenance consequence, not engineering dirty content;
- topology authority downgrade remains latched after exact value revert.

`tabs/vibration-integrity-run-snapshot.js`:

- `FitWorkingInputState.v1` canonical payload;
- `FitRunSnapshot.v1`;
- deterministic stable JSON ordering;
- Web Crypto SHA-256 only; no weak fallback.

`tabs/vibration-integrity-tab.js`:

- explicit `UNRUN`, `RUNNING`, `CURRENT_RESULT`, `STALE_RESULT`, `INVALID_INPUT` behavior;
- engineering mutations stale the previous result instead of deleting it;
- source benchmark modification is recomputed from working dirty state plus source detachment;
- exact revert can restore benchmark working equality;
- run snapshot captured immediately before existing facility FIT execution;
- export requires `CURRENT_RESULT`.

`tabs/vibration-integrity-input-view.js` / `vibration-integrity-view.js`:

- original-value cell context;
- visible cell/table revert controls;
- working edit count;
- result-state / snapshot display;
- stale-result warning;
- stale parity suppression;
- explicit topology authority-latch warning.

#### Validation completed

PASS:

```text
node --test tests/vibration-integrity-working-state.test.mjs \
  tests/vibration-integrity-run-snapshot.test.mjs
5 tests / 5 PASS
```

[SIMULATED] focused module harness using reconstructed current headers/CSV and central conversion semantics:

```text
node --test tests/vibration-integrity-input-model.test.mjs
8 tests / 8 PASS
```

Stage-8 production/test syntax checks:

```text
tabs/vibration-integrity-working-state.js      PASS
tabs/vibration-integrity-run-snapshot.js       PASS
tabs/vibration-integrity-input-model.js        PASS
tabs/vibration-integrity-input-runtime.js      PASS
tabs/vibration-integrity-input-view.js         PASS
tabs/vibration-integrity-tab.js                PASS
tabs/vibration-integrity-view.js               PASS
scripts/verify-vibration-fit-release.mjs        PASS
new/updated Stage-8 tests                      PASS syntax
```

GitHub current-head workflow allocation before this stage: none.

NOT_RUN:

```text
npm run verify:vibration-fit-release
real browser cell/table revert
real browser unit-only conversion
real browser topology edit -> revert -> still local execution
real browser current result -> edit -> stale result -> rerun
exact snapshot-vs-consumed-input browser inspection
```

Stage decision: **PARTIAL** until these executable/browser gates run.

## Exact Changed-File Ledger — 24/24 explained

1. `agents/PR442_workreport.md` — living report / Stage-8 evidence.
2. `converters/vibration/exchange/parse-csv.js` — unverified Elements CSV provenance.
3. `docs/vibration/VibrationIntegrityTab-v1.md` — current product/working-state contract.
4. `docs/vibration/VibrationIntegrity-MultiMechanism-Roadmap.md` — roadmap with Stage-1/2 status.
5. `scripts/verify-vibration-fit-release.mjs` — release manifest expanded to 33 tests.
6. `tabs/vibration-integrity-benchmarks.js` — five controlled EI FIT cases.
7. `tabs/vibration-integrity-input-model.js` — original/working state, unit/revert/authority integration.
8. `tabs/vibration-integrity-input-runtime.js` — authority-latched topology execution selection.
9. `tabs/vibration-integrity-input-view.js` — original/edit/revert/result snapshot UI.
10. `tabs/vibration-integrity-mechanisms.js` — 12-mechanism fail-closed catalogue.
11. `tabs/vibration-integrity-run-snapshot.js` — NEW deterministic run snapshot/hash.
12. `tabs/vibration-integrity-tab.js` — stale/current state and snapshot orchestration.
13. `tabs/vibration-integrity-view.js` — mechanism matrix + stale-result evidence display.
14. `tabs/vibration-integrity-working-state.js` — NEW canonical immutable working-record model.
15. `tabs/vibration-integrity.css` — existing PR editor/matrix styling.
16. `tests/vibration-elements-csv-provenance.test.mjs` — provenance regression.
17. `tests/vibration-fit-release-gate.test.mjs` — pins 33-file release manifest.
18. `tests/vibration-fit-ui-benchmarks.test.mjs` — controlled benchmark parity/source.
19. `tests/vibration-integrity-editable-input-static.test.mjs` — revert/stale/snapshot/no-direct-authority static behavior.
20. `tests/vibration-integrity-input-model.test.mjs` — original/working/unit/revert/topology latch.
21. `tests/vibration-integrity-input-runtime.test.mjs` — XLSX authority latch through revert.
22. `tests/vibration-integrity-mechanism-matrix.test.mjs` — multi-mechanism fail-closed regression.
23. `tests/vibration-integrity-run-snapshot.test.mjs` — NEW deterministic SHA-256 snapshot regression.
24. `tests/vibration-integrity-working-state.test.mjs` — NEW stable IDs/revert/tombstone regression.

No workflow, FIT numerical kernel, AIV/deadleg/transient/thermowell/SBC solver, 3D/canvas or unrelated product module is changed.

## Engineering Invariants

- **INV-001:** one numerical path only: UI -> existing facility workflow -> central Engineering Calculation API.
- **INV-002:** edited topology is never represented as certified topology.
- **INV-003:** official benchmark parity requires exact working inputs and a current result.
- **INV-004:** FIT remains `BENCHMARK_ONLY`; no safe/pass screening semantics.
- **INV-005:** current working cells are execution input; originals remain evidence/revert state.
- **INV-006:** source identity follows evidence; CSV shape is not certification.
- **INV-007:** engineering mutation makes prior result stale instead of silently current or destroyed.
- **INV-008:** `NOT_IMPLEMENTED` is distinct from `NOT_APPLICABLE`.
- **INV-009:** blank non-FIT mechanism cells never mean zero/pass/safe.
- **INV-010:** `Implemented governing` is not full vibration-screening governing.
- **INV-011:** UI never recomputes mechanism equations.
- **INV-012:** every future mechanism requires source/method/independent qualification.
- **INV-013:** stable row identity is independent of visible row index after delete/add operations.
- **INV-014:** unit-only conversion uses the central engineering unit layer only where semantics are known.
- **INV-015:** exact value revert cannot regain source authority that was lost by mutation.
- **INV-016:** stale results cannot export or claim current benchmark parity.
- **INV-017:** run snapshot uses SHA-256 with no silent fallback.

## Validation / Evidence Ledger

### PASS

- controlled-source / full EI architecture review;
- Stage-7 mechanism model 4/4 focused tests;
- Stage-8 pure working-state + snapshot tests 5/5;
- Stage-8 production/test syntax checks;
- new abstractions have production consumers;
- no direct UI solver call added;
- no FIT numerical kernel changed;
- release manifest source updated to 33 intended tests.

### [SIMULATED] PASS

- focused input-model harness 8/8 using reconstructed current contracts to exercise unit/revert/authority behavior.

### NOT_RUN

- full 33-file `npm run verify:vibration-fit-release`;
- full repository suite;
- real-browser editing/revert/unit/snapshot flows;
- real-browser wide mechanism matrix;
- independent engineering review.

### NOT_APPLICABLE

- non-FIT numerical qualification — no non-FIT solver was added.
- screening/design authority promotion — not requested or implemented.

## Known / Deferred Work

- Execute full 33-file release gate in a normal checkout.
- Browser-check current Stage-8 edit/revert/unit/stale/snapshot behavior.
- Roadmap Stage 3: make joined line/case engineering basis the primary editor while retaining raw source tables as the single backing working state.
- Roadmap Stage 4: extract FIT presentation into explicit mechanism detail without rewriting numerical kernel.
- Add stable correlation IDs / calculation intermediates for FIT detail.
- Separate normalized engineering-input hash from broader working/evidence snapshot once joined requests are canonical.
- Qualify future mechanisms independently; empty EI sections need additional adopted evidence.

## Next-Agent Handover

PR/branch:

```text
#442
agent/fit-editable-benchmark-inputs
```

Exact next validation:

```bash
npm install
npm run verify:vibration-fit-release
```

Then manually verify:

1. untouched certified XLSX uses original XLSX execution;
2. first topology edit downgrades to local Elements CSV;
3. topology value revert restores values but **does not** restore XLSX authority;
4. source/local row IDs remain stable through edit/add/delete;
5. operating unit-only edit converts numeric value and cell revert restores value+unit pair;
6. unknown numeric enrichment unit conversion fails closed;
7. table revert restores deleted source rows and removes added rows;
8. successful FIT run shows `CURRENT_RESULT` and a SHA-256 snapshot;
9. engineering edit changes result to `STALE_RESULT` while old result remains inspectable;
10. stale result cannot export or show benchmark parity PASS;
11. rerun returns `CURRENT_RESULT` with a new snapshot where inputs changed;
12. filter/sort/detail navigation does not stale the result;
13. mechanism matrix still shows only FIT values and no implied non-FIT assessment.

If those pass, update this report with executable/browser evidence and proceed to Roadmap Stage 3. Merge only with Owner authorization.
