# PR442 — FIT Editable Benchmark Inputs Work Report

## PR Mission Control

| Field | Current state |
|---|---|
| Mission | Add loadable EI FIT benchmark cases and editable table inputs to the existing table-first FIT workspace while preserving topology provenance and benchmark-only authority. |
| Source task | Owner: add **Load BENCHMARK**, show input/output for validation, make input tables editable, and load CSV into those editable tables. |
| PR number | #442 |
| Branch | `agent/fit-editable-benchmark-inputs` |
| Base commit | `243042fba24915ae7b2734556cf2d28c1b5425b7` |
| PR status | OPEN / DRAFT / MERGEABLE |
| Current stage | **Stage 6 — VALIDATION / CLOSURE** |
| Stage decision | **PARTIAL** — implementation/source validation complete; executable current-head browser/release evidence is NOT_RUN in this environment. |
| Engineering status | FIT remains `BENCHMARK_ONLY`; no numerical method or authority promotion. |
| Current blocker | Runtime lacks the repo checkout/dependencies (`xlsx` is not installed); GitHub has no workflow run on current head. |
| Exact next action | In a normal checkout run `npm run verify:vibration-fit-release`, exercise real XLSX/CSV edit flows in browser, then update/merge PR #442 if clean. |

## Handover in 60 Seconds

PR #442 implements the requested capability end-to-end at source level:

- choose any of five controlled EI D2/D4 cases;
- click **Load BENCHMARK**;
- see published target output immediately;
- inspect/edit topology Elements, operating-case and enrichment tables;
- import CSV into those visible tables and continue editing;
- add/delete rows;
- run readiness from current table cells;
- run the existing FIT benchmark workflow from current table cells;
- compare untouched official case target vs actual LOF/reference band;
- after any edit, clear stale outputs and mark benchmark parity not applicable until reload.

Topology authority is explicit:

- untouched complete XLSX continues to execute as the complete exchange;
- first topology edit becomes `*.edited-elements.csv`;
- populated edited rows show `Source Status = LOCAL_EDITED_UNVERIFIED`;
- generic Elements CSV reports `sourceSystem=UNVERIFIED_ELEMENTS_CSV`, `completeExchange=false`, `LIMITED_ELEMENTS_ONLY`, null authority hashes, and an explicit warning.

No FIT equation, coefficient, applicability rule, LOF definition or engineering authority changed.

## Mission Status

| Work item | Status | Evidence |
|---|---|---|
| Findings / source inspection | COMPLETE | current FIT/import/benchmark contracts inspected |
| PR allocation/report sync | COMPLETE | PR #442 |
| Pre-code changed-file verification | PASS | exactly report-only |
| Editable table model | COMPLETE | production-consumed module |
| Controlled EI benchmark loader | COMPLETE | five source-bound cases |
| Visible benchmark/input UI | COMPLETE | real FIT workspace path |
| XLSX/CSV provenance hardening | COMPLETE | ISS-001 / ISS-002 fixes |
| Focused regressions | IMPLEMENTED / NOT_RUN | committed tests |
| FIT release-gate manifest | COMPLETE | 30 controlled tests |
| Workspace documentation | COMPLETE | updated v1 doc |
| Full release command | NOT_RUN | normal checkout required |
| Real browser/XLSX/CSV interaction | NOT_RUN | normal checkout required |

## Engineering Item Register

| ID | Type | Status | Summary |
|---|---|---|---|
| IMP-001 | Improvement | COMPLETE | CSV loads into visible/editable raw-contract tables. |
| IMP-002 | Improvement | COMPLETE | All five controlled EI cases can be loaded and compared to actual benchmark output. |
| ISS-001 | Defect | COMPLETE | Generic Elements CSV no longer claims `Advanced_Analysis.3D_EDIT` provenance from header shape. |
| ISS-002 | Defect | COMPLETE | Edited certified topology rows no longer display/carry `CERTIFIED`; populated rows become `LOCAL_EDITED_UNVERIFIED`. |
| RISK-001 | Risk | MITIGATED | Dirty certified XLSX executes as local `.edited-elements.csv`. |
| RISK-002 | Risk | MITIGATED | Any benchmark mutation invalidates official parity/stale results. |
| DEC-001 | Decision | ACCEPTED | First topology mutation uses serialized `CSV_ELEMENTS_ONLY` working override. |
| DEC-002 | Decision | ACCEPTED | Operating/enrichment rows round-trip through existing v1 CSV contracts. |
| DEC-003 | Decision | ACCEPTED | Official benchmark parity only for untouched controlled case inputs. |
| DEC-004 | Decision | ACCEPTED | Use existing five EI D2/D4 cases; no invented demo case. |
| DEC-005 | Decision | ACCEPTED | Modified-case target stays informational; parity becomes not applicable. |
| DEC-006 | Decision | ACCEPTED | Header-compatible CSV is unverified; richer upstream authority exists only on complete XLSX path. |

## Stage Execution Log

### Stage 1 — Findings
**COMPLETE.** Existing FIT UI loaded files but did not expose editable raw tables. Strict CSV helpers and five controlled EI cases already existed.

### Stage 2 — PR allocation
**COMPLETE.** Draft PR #442 allocated; pending report renamed/deleted.

### Stage 3 — Changed-file verification
**COMPLETE / PASS.** Pre-production diff was exactly `agents/PR442_workreport.md`.

### Stage 4 — Core behavior
**COMPLETE.** Added:
- `tabs/vibration-integrity-input-model.js`;
- `tabs/vibration-integrity-benchmarks.js`;
- source-bound/editor tests.

The benchmark catalogue is tied to `Benchmarks/VibrationFIT/fit-ei-worked-examples-v1.json`; generated tables use existing production CSV contracts.

### Stage 5 — Workspace integration / authority hardening
**COMPLETE.** Added benchmark selector/button, editable tables, CSV/XLSX table load, add/delete/edit, current-table readiness/run, parity display/invalidation, and CSS. Split file/input runtime from the existing controller to keep responsibilities bounded.

Authority fixes:
- Elements CSV source identity is `UNVERIFIED_ELEMENTS_CSV`;
- dirty XLSX file identity is `*.edited-elements.csv`;
- populated topology rows on mutation are visibly `LOCAL_EDITED_UNVERIFIED`;
- blank newly-added topology rows remain fully blank until data is entered.

### Stage 6 — Validation / docs / closure
**PARTIAL.** Source-level validation and scope reconciliation are complete; executable repository/browser validation remains NOT_RUN.

## Exact Changed-File Ledger — 17/17 explained

1. `agents/PR442_workreport.md` — CodingRules report.
2. `converters/vibration/exchange/parse-csv.js` — unverified Elements CSV provenance.
3. `docs/vibration/VibrationIntegrityTab-v1.md` — editable/benchmark/provenance UX contract.
4. `scripts/verify-vibration-fit-release.mjs` — release gate expanded to 30 tests.
5. `tabs/vibration-integrity-benchmarks.js` — five controlled EI UI benchmark cases.
6. `tabs/vibration-integrity-input-model.js` — editable table state and local topology status downgrade.
7. `tabs/vibration-integrity-input-runtime.js` — file parsing and current-table execution input selection.
8. `tabs/vibration-integrity-input-view.js` — benchmark panel / editable input tables.
9. `tabs/vibration-integrity-tab.js` — controller/event integration; existing numerical workflow only.
10. `tabs/vibration-integrity-view.js` — compose input and result views.
11. `tabs/vibration-integrity.css` — benchmark/editor presentation.
12. `tests/vibration-elements-csv-provenance.test.mjs` — CSV authority regression.
13. `tests/vibration-fit-release-gate.test.mjs` — 30-file gate contract.
14. `tests/vibration-fit-ui-benchmarks.test.mjs` — UI benchmark ↔ controlled EI dataset parity.
15. `tests/vibration-integrity-editable-input-static.test.mjs` — visible behavior / no-authority-leak checks.
16. `tests/vibration-integrity-input-model.test.mjs` — edit/dirty/local-source-status regression.
17. `tests/vibration-integrity-input-runtime.test.mjs` — untouched XLSX vs edited CSV execution boundary.

No workflow, FIT kernel, AIV, 3D/canvas or unrelated file is changed.

## Engineering Invariants

- **INV-001:** one numerical path only: table UI → existing facility workflow → central Engineering Calculation API.
- **INV-002:** edited topology is never represented as certified topology.
- **INV-003:** official benchmark parity is exact-input evidence only.
- **INV-004:** FIT remains `BENCHMARK_ONLY`; no safe/pass screening semantics.
- **INV-005:** uploaded CSV becomes visible table state; current cells are execution input.
- **INV-006:** source identity follows evidence; CSV header compatibility is not upstream certification.
- **INV-007:** table mutation clears stale preflight/results before the next run.

## Validation / Evidence Ledger

### PASS
- source/import architecture review;
- pre-code changed-file reconciliation;
- final 17-file reconciliation;
- PR mergeability;
- controlled benchmark ID/source/target mapping review;
- production CSV/parser contract reuse review;
- Elements CSV provenance source review;
- complete XLSX source path remains `Advanced_Analysis.3D_EDIT` and unchanged;
- source scan of controller found no `calculateFit`, `calculateEngineering`, or canvas call;
- release manifest source review: 30 unique controlled test paths;
- current-head GitHub workflow query: no workflow run allocated.

### NOT_RUN
- `tests/vibration-integrity-input-model.test.mjs`;
- `tests/vibration-fit-ui-benchmarks.test.mjs`;
- `tests/vibration-elements-csv-provenance.test.mjs`;
- `tests/vibration-integrity-input-runtime.test.mjs`;
- `tests/vibration-integrity-editable-input-static.test.mjs`;
- full `npm run verify:vibration-fit-release`;
- real-browser XLSX / CSV interaction.

Reason: this execution container has Node v22.16.0 but does not have the repository checkout/dependency tree; `xlsx` is not installed. No PASS is inferred from source review.

### NOT_APPLICABLE
- FIT method/equation qualification — no numerical method changed.
- screening/design authority — remains not authorized.

## Known / Deferred Work

- Run the 30-file release gate from a normal checkout.
- Exercise: untouched certified XLSX, edited XLSX downgrade, Elements CSV import/edit, operating/enrichment CSV import/edit, all five benchmark cases, benchmark mutation/reload.
- Scenario persistence/versioning remains out of scope; CSV is the explicit interchange.
- AIV remains isolated under issue #441.

## Next-Agent Handover

PR/branch: **#442 / `agent/fit-editable-benchmark-inputs`**.

Implementation is complete. Do not add more product scope before executing the release/browser checks.

Exact next commands in a normal checkout:

```bash
npm install
npm run verify:vibration-fit-release
```

Then manually open FIT workspace and verify the file/edit/benchmark interactions listed above. If clean, update this report/PR validation evidence and merge only with owner authorization.
