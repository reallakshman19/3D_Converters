# PR499 — FIT Production Gate 1 — Living Work Report

## Mission Control

| Field | Current state |
|---|---|
| Mission | Remove software/evidence blockers to a defensible bounded FIT production-screening release without changing FIT empirical equations or granting authority. |
| Governing issues | #443 — FIT Engineering Workspace; #429 — Vibration & Dynamic Screening qualification gate. |
| PR | #499 — `agent/fit-production-gate-1` -> `main` |
| Live main reconciled | `638af071b70d4b27676ba385004382aa0a5a35e6` — AIV PR #498 included deliberately. |
| Exact technical head before this report refresh | `f06dd29c2953bb97409ac3b47647437c98858ad7` |
| Current-main compare | `ahead`; `behind_by=0`; merge base = `638af071...`; 32 FIT-controlled net changed paths. |
| Authority | `IMPLEMENTED / BENCHMARK_ONLY`; `engineeringAuthority=NONE`; `screeningAuthority=NOT_AUTHORIZED`; `designAuthority=false`. |
| Merge authorization | **NOT GRANTED**. PR must remain draft. |
| Release suite | 45 controlled FIT/VIB test files after run-evidence qualification was added. |
| Native release/browser execution | **NOT_RUN / ENVIRONMENT_BLOCKED** in this connector-only runtime. |
| EXACT_NEXT_ACTION | Execute the exact 45-file release suite from a clean full checkout, then real-browser/real-file FIT acceptance; use failures to drive only evidence-backed fixes. In parallel close page-level EI/errata/project adoption review and obtain independent vibration-engineer approval. |

## Handover in 60 Seconds

PR499 has progressed beyond the original scope/source/evidence slice. The major code-side production blockers identified in the audit are now implemented while FIT remains fail-closed for production screening:

1. bounded future screening scope is frozen and QST-003 is explicitly excluded;
2. controlled EI source metadata is reconciled to `Common@fb549185...`;
3. the blanket 1.5% published-example tolerance is replaced with independently derived case/field absolute tolerances;
4. independent evidence holes for standard `MEDIUM_SMALL` and advanced `FLEXIBLE_LARGE` are closed;
5. cell, row and table revert are explicit working-state operations;
6. certified complete-XLSX execution is guarded by both the visible Elements projection SHA-256 and the complete XLSX byte-stream SHA-256;
7. source bytes and table state are captured immutably before readiness/run execution;
8. in-flight input drift invalidates readiness or marks a completed run `STALE_RESULT` rather than current;
9. `snapshotHash` (audit/source identity) and `engineeringInputHash` (normalized central request identity) are separate;
10. the useful portion of stale PR #479 has been salvaged as governed `FitRunEvidencePackage.v1` export on the new dual-hash contract;
11. the FIT release manifest now includes the run-evidence regression and contains 45 test files;
12. two self-created regressions found during audit were fixed before handoff: an incorrect 44-file release count and a static facility-workflow import that violated the repository lazy numerical boundary.

The remaining production blockers are no longer primarily missing UI/plumbing. They are executable qualification evidence, browser/file acceptance, exact adopted-source/errata review and independent engineering approval.

## Authority Freeze

This PR must retain:

```text
calculationState       = IMPLEMENTED
qualificationState     = BENCHMARK_ONLY
engineeringAuthority   = NONE
screeningAuthority     = NOT_AUTHORIZED
designAuthority        = false
```

No evidence-strength value, benchmark parity result, hash, export, UI status or candidate-scope record may infer or activate screening/design authority.

No `BENCHMARK_ONLY -> SCREENING` change belongs in this PR. Any eventual activation must be a separately reviewed, intentionally small, owner-authorized governance PR after all remaining gates close on one exact candidate SHA.

## Bounded Future Screening Scope

Controlled by `docs/vibration/FIT-Screening-Scope-v1.md`:

```text
60 mm <= Dext <= 219.1 mm      candidate only after all gates
219.1 mm < Dext < 273 mm       EXCLUDED / fail closed
273 mm <= Dext <= 762 mm       candidate only after all gates
```

Candidate phase paths:

```text
LIQUID
GAS
MULTIPHASE / AGGREGATE_EFFECTIVE
MULTIPHASE / COMPONENT_DERIVED
```

Candidate advanced path:

```text
support = FLEXIBLE_SMALL or FLEXIBLE_LARGE
standard LOF >= 1
actual natural frequency supplied
1 Hz < fn <= 3 Hz
```

Exactly `1 Hz` is excluded and exactly `3 Hz` is included. No interpolation or nearest-family inference is permitted in the excluded diameter interval.

## Controlled EI Source Reconciliation

Current controlled Common pin:

```text
reallaksh19/Common@fb549185b9b27edc2379734240320a85c5bef9f6
```

Controlled objects:

```text
Governing EI method PDF
  EI - AVIFF Guidelines 2nd Edition.pdf
  blob 9d3eccc56429411e17c07a579bdebbd13cb0bdc5

Published worked-example PDF
  EI - AVIFF Guidelines 2nd Edition_Examples.pdf
  blob 3e2517d0df527a051084fc02e69cb7afa31f8d47

Corroborating worked-example DOCX
  Energy-Institute-AVIFF---Worked-Examples.doc.docx
  blob ceee15ed5f7f320045d5f3979024e2e8664613f2
```

The earlier `aef163a5def3bfe04ca0ba860da05728a27daf42` state is retained only as historical parent provenance. Live method, dossier, benchmark and UI source metadata use `fb549185...`. The worked-example PDF blob is unchanged across the parent transition; the later controlled pin additionally binds the DOCX evidence.

Source precedence:

```text
governing EI method PDF
  > published EI worked-example PDF
  > DOCX / line-list corroborating project-scenario evidence
  > controlled JSON transcription
  > retained workbook migration/parity evidence
```

The historical `docs/vibration/FIT-Issue429-Engineering-Review-Package.md` still contains older qualification snapshots and source-pin text. It is a historical review artifact, not the live PR499 source-authority record, and was not rewritten merely to erase history.

## Known Source Differences Preserved

These are intentionally not normalized away:

- D2 recycle suction: DOCX span `7 m` vs controlled benchmark `6.4 m`;
- D2 relief upstream: DOCX span `6 m` vs `5.2 m`, plus small `rho*v^2` difference;
- D2 relief downstream: DOCX span `7 m` vs `6.4 m`;
- D4 separator inlet: revised DOCX velocity/span differs from the published benchmark vector;
- D4 produced water: revised DOCX density/velocity/span/FIT differs from the published benchmark vector.

The worked-example PDF retains benchmark precedence. These differences remain limitations/provenance items for independent method/project review.

## Published-Value Tolerance Reconciliation

The former global `1.5%` relative tolerance has been removed.

Controlled policy:

```text
FIT-EI-PUBLISHED-RECONCILIATION-V1
```

Derivation rule:

```text
absolute tolerance
  = |independent equation-register recalculation - published target|
    + half the target's least displayed output increment
```

The recalculation was performed independently from the documented equation register and published input vector, not by calling the production FIT implementation. Tolerances are rounded outward to practical decimal values and must not be relaxed merely to make a later implementation pass.

Controlled standard-LOF tolerances:

| Case | Independent LOF | Published LOF | Absolute tolerance |
|---|---:|---:|---:|
| D2 recycle suction 6 in | 0.27668688083478665 | 0.276 | 0.0012 |
| D2 relief upstream 4 in | 0.33925816956348825 | 0.338 | 0.0018 |
| D2 relief downstream 6 in | 0.8804122636663433 | 0.881 | 0.0011 |
| D4 separator inlet 20 in | 0.26038168382742455 | 0.26 | 0.0054 |
| D4 produced water 10 in | 3.1519468988287054 | 3.15 | 0.0070 |

Per-case absolute allowances for `rho*v^2`, viscosity factor and `Fv` plus the independent recalculated values are also stored in `fit-ei-worked-examples-v1.json`.

## Independent Correlation Evidence Closure

New hand-derived independent cases:

```text
FIT-HAND-LIQ-MEDIUM-SMALL-008
FIT-HAND-FLEX-LARGE-LOF-120-FN2-009
```

Independent oracle checks:

```text
MEDIUM_SMALL
  D = 168.3 mm
  T = 7.11 mm
  span = 8.5 m -> MEDIUM_SMALL
  Fv = 9264.403089402875 Pa
  LOF = 0.15543365137546206

FLEXIBLE_LARGE advanced
  D = 323.9 mm
  T = 9.53 mm
  span = 15 m -> FLEXIBLE_LARGE
  fn = 2 Hz
  standard Fv = 2508.0742059951117 Pa
  standard LOF = 1.2
  advanced Fv = 5006.56016191939 Pa
  refined LOF = 0.6011490823752119
```

`qualification-coverage.js` now records standard `MEDIUM_SMALL` and advanced `FLEXIBLE_LARGE` as `INDEPENDENT_HAND_BENCHMARK + RETAINED_WORKBOOK_PARITY`. Refined reference-band evidence is family-specific, so a large-family advanced result no longer cites only flexible-small evidence.

## Working-State Revert Contract

The working-state model now has distinct:

```text
cell revert
row revert
table revert
```

Row revert behavior:

- source row -> exact original row values;
- locally added row -> removed from visible working state;
- topology Source Status is ignored when deciding whether the engineering row is edited;
- topology authority downgrade is a separate irreversible session latch, so exact value revert does not silently recover complete-exchange authority.

The UI exposes `Revert row` where applicable and routes it through the same authoritative working-record model used by Engineering basis and Source Data.

## Complete-XLSX Anti-Bypass Contract

New integrity schemas:

```text
FitTopologyElementsProjection.v1
FitSourceFileSha256.v1
```

Preserved complete XLSX execution is allowed only when:

```text
format                     = XLSX
originalCertifiedExchange  = true
authorityDowngraded        = false
Elements projection hash   present + matches current visible Elements projection
complete XLSX file hash    present + matches current source byte stream
```

Why both hashes are mandatory:

- Elements hash prevents stale/hidden working-state substitution where a different visible table is presented while preserved XLSX bytes are retained;
- full-file hash prevents hidden/non-Elements sheets or any other workbook bytes from being replaced while Elements remains identical.

Fail-closed errors include:

```text
VIBRATION_TOPOLOGY_PROJECTION_FINGERPRINT_MISSING
VIBRATION_TOPOLOGY_SOURCE_FILE_FINGERPRINT_MISSING
VIBRATION_TOPOLOGY_PROJECTION_INTEGRITY_MISMATCH
VIBRATION_TOPOLOGY_SOURCE_FILE_INTEGRITY_MISMATCH
```

The first ordinary topology mutation continues to downgrade execution to visible Elements-only CSV until explicit source reload. Revert never re-authorizes the original complete exchange.

## Immutable Capture and In-Flight Drift

`captureVibrationIntegrityExecutionState(state)` creates the run/readiness execution boundary:

- complete source bytes are cloned;
- immutable table references are captured;
- benchmark and limited-exchange state are captured;
- later UI mutations cannot alter the data already selected for execution.

Readiness:

1. capture state;
2. validate/build captured table input;
3. compute preflight;
4. compare captured audit hash to live working state;
5. if changed, reject the preflight as `VIBRATION_PREFLIGHT_INPUT_DRIFT` and require rerun.

Benchmark run:

1. capture state;
2. lazily load the numerical facility workflow;
3. execute only the captured state;
4. bind audit and engineering identities;
5. compare captured audit identity to current live working state;
6. if changed during execution, retain the result only as `STALE_RESULT`, never `CURRENT_RESULT`.

## Lazy Numerical Boundary

The repository requires the visible FIT tab to lazy-load `fit-workflow-tabular.js`.

During this implementation a helper initially imported the workflow statically. Static boundary review caught the regression before handoff. It was fixed so:

```text
tabs/vibration-integrity-tab.js
  -> await import('../converters/vibration/facility/fit-workflow-tabular.js')
  -> inject runVibrationFacilityFitBenchmarkFromTables into run-controller

tabs/vibration-integrity-run-controller.js
  -> does NOT statically import the numerical workflow
```

Both the existing repository module-boundary test and FIT static UI test pin this ownership rule.

## Audit Identity vs Engineering Identity

### Audit/source identity

```text
FitRunSnapshot.v1
snapshotHash
```

Includes:

- working tables/row IDs;
- source names/kinds;
- topology projection schema/hash;
- complete source-file schema/hash where applicable;
- authority-downgrade and limited-exchange state;
- benchmark ID/modification state.

### Normalized engineering identity

```text
FitEngineeringInputIdentity.v1
engineeringInputHash
```

Derived from sorted central FIT request scopes, calculation ID, method revision, qualification mode and normalized `resolvedInputs`.

Consequences pinned by tests:

- source filename change -> audit hash changes, engineering hash does not;
- complete source-file hash change -> audit hash changes, engineering hash does not;
- normalized engineering-input change -> engineering hash changes.

## PR479 Reproducibility Salvage

PR #479 (`agent/fit-reproducibility-evidence`) is stale and overlaps the FIT controller/input-view/release seams. It was not rebased or merged wholesale.

Its useful bounded capability was reimplemented/salvaged onto current PR499 contracts as:

```text
FitRunEvidencePackage.v1
```

The evidence package:

- requires `CURRENT_RESULT`;
- requires a complete dual-hash run snapshot;
- re-canonicalizes and recomputes both SHA-256 hashes before export;
- carries source file descriptors, including Elements/full-file hashes when present;
- carries benchmark source/target identity;
- carries the exact benchmark-only facility workflow envelope;
- rejects stale state, canonical drift and cryptographic hash mismatch;
- declares `purpose=REPRODUCIBILITY_EVIDENCE_ONLY`;
- retains `engineeringAuthority=NONE`, `screeningAuthorized=false`, `designAuthority=false`.

UI action: `Export run evidence JSON`.

After this PR is independently reviewed, PR #479 should be re-evaluated for closure as superseded rather than merged from its stale branch.

## Release Manifest

The controlled FIT/VIB release manifest contains **45** test files after adding:

```text
tests/vibration-integrity-run-evidence.test.mjs
```

A temporary self-created assertion still expected 44 after adding that file. The exact manifest audit caught and corrected the count to 45 before handoff.

`tests/vibration-integrity-run-evidence.test.mjs` executes a real FIT benchmark through the captured-state run helper and then validates package serialization/tamper rejection.

## Mainline Reconciliation — AIV PR #498

PR499 began before AIV PR #498 reached main. Live main later advanced to:

```text
638af071b70d4b27676ba385004382aa0a5a35e6
```

The main delta was audited and was AIV-only plus the shared module-boundary regression. PR499 does not modify the AIV implementation or that shared test.

GitHub produced a clean two-parent synthetic merge tree. PR499 was moved forward to that reconciled commit, then FIT work continued. Current-main compare at the pre-report technical head shows:

```text
status       ahead
behind_by    0
merge_base   638af071b70d4b27676ba385004382aa0a5a35e6
net files    32 FIT-controlled paths
```

No AIV PR498 path appears in the current-main -> PR499 net diff.

## Blocker Disposition

| ID | Priority | State | Disposition |
|---|---:|---|---|
| PROD-001 | P0 | BOUNDED | Future screening scope frozen; authority unchanged. |
| QST-003 | P0 | CLOSED FOR V1 SCOPE | `219.1 < Dext < 273 mm` explicitly excluded/fail-closed. |
| QUAL-001 | P0 | IMPLEMENTED / RUNTIME NOT_RUN | Independent `MEDIUM_SMALL` case added and hand-recalculated. |
| QUAL-002 | P0 | IMPLEMENTED / RUNTIME NOT_RUN | Independent advanced `FLEXIBLE_LARGE` case added and hand-recalculated. |
| TRACE-001 | P1 | FIXED | Advanced refined-band evidence is family-specific. |
| TRACE-002 | P0 | CLOSED FOR LIVE METADATA | Active benchmark/UI/method/dossier use controlled `fb549185...`; old `aef...` is historical only. |
| TRACE-003 | P0 | OPEN | Exact page/table/equation adopted-method + official errata + project basis review not complete. |
| QUAL-003 | P0 | CLOSED FOR BENCHMARK USE | Blanket 1.5% removed; case/field absolute source-reconciliation tolerances adopted. |
| STATE-001 | P0 | IMPLEMENTED / RUNTIME NOT_RUN | Cell/row/table revert contract. |
| STATE-002 | P0 | IMPLEMENTED / RUNTIME NOT_RUN | Elements projection SHA-256 guard. |
| STATE-003 | P0 | IMPLEMENTED / RUNTIME NOT_RUN | Complete XLSX byte-stream SHA-256 guard. |
| STATE-004 | P0 | IMPLEMENTED / RUNTIME NOT_RUN | Captured execution state + readiness/run drift invalidation. |
| HASH-001 | P0 | IMPLEMENTED / RUNTIME NOT_RUN | Separate audit and engineering identities. |
| REPRO-001 | P0 | IMPLEMENTED / RUNTIME NOT_RUN | PR479 bounded run-evidence capability salvaged on current contracts. |
| ARCH-001 | P0 | FIXED | Accidental static numerical import caught; mandated lazy import restored. |
| RELEASE-001 | P0 | IMPLEMENTED / NOT_RUN | 45-file manifest assembled; exact suite not executed. |
| BROWSER-001 | P0 | NOT_RUN | Real browser with real XLSX/CSV/edit/revert/stale/export not executed. |
| REVIEW-001 | P0 | NOT_RUN | Independent vibration-engineer bounded-scope approval absent. |
| AUTH-001 | P0 | BLOCKED BY ABOVE | Screening activation remains prohibited. |

## Current Changed-File Ledger

Current-main -> pre-report technical head has 32 net FIT-controlled paths.

### Qualification / evidence

- `Benchmarks/VibrationFIT/fit-ei-worked-examples-v1.json`
- `Benchmarks/VibrationFIT/fit-independent-hand-benchmarks-v1.json`
- `converters/vibration/fit/qualification-coverage.js`
- `converters/vibration/mechanisms/fit.js`

### Controlled documentation

- `docs/vibration/FIT-EI-Worked-Example-Traceability-v1.md`
- `docs/vibration/FIT-Engineering-Method-Specification-v1.md`
- `docs/vibration/FIT-Qualification-Dossier-v1.md`
- `docs/vibration/FIT-Screening-Scope-v1.md`

### Working state / integrity / reproducibility UI

- `tabs/vibration-integrity-benchmarks.js`
- `tabs/vibration-integrity-dom.js`
- `tabs/vibration-integrity-input-integrity.js`
- `tabs/vibration-integrity-input-model.js`
- `tabs/vibration-integrity-input-runtime.js`
- `tabs/vibration-integrity-input-view.js`
- `tabs/vibration-integrity-run-controller.js`
- `tabs/vibration-integrity-run-evidence.js`
- `tabs/vibration-integrity-run-snapshot.js`
- `tabs/vibration-integrity-tab.js`
- `tabs/vibration-integrity-working-state.js`

### Release/test evidence

- `scripts/verify-vibration-fit-release.mjs`
- `tests/vibration-fit-ei-worked-examples.test.mjs`
- `tests/vibration-fit-mechanism-contract.test.mjs`
- `tests/vibration-fit-qualification-coverage.test.mjs`
- `tests/vibration-fit-release-gate.test.mjs`
- `tests/vibration-fit-ui-benchmarks.test.mjs`
- `tests/vibration-integrity-editable-input-static.test.mjs`
- `tests/vibration-integrity-input-model.test.mjs`
- `tests/vibration-integrity-input-runtime.test.mjs`
- `tests/vibration-integrity-run-evidence.test.mjs`
- `tests/vibration-integrity-run-snapshot.test.mjs`
- `tests/vibration-integrity-working-state.test.mjs`

### Durable handover

- `agents/PR499_workreport.md`

No workflow file, dependency, AIV production file, 3D/canvas implementation or FIT empirical equation/coefficient implementation is changed.

## Validation and Evidence Ledger

| Gate | Status | Evidence / truth |
|---|---|---|
| Live main re-ground | PASS | `main@638af071...` fetched immediately before final audit. |
| Current-main branch reconciliation | PASS | compare at technical head: `behind_by=0`, merge base exact current main. |
| Net changed-file scope | PASS | 32 FIT-controlled paths; no AIV PR498 file in net diff. |
| Independent new benchmark arithmetic | PASS | MEDIUM_SMALL and advanced FLEXIBLE_LARGE independently recalculated from documented equations. |
| Published-tolerance derivation | PASS by independent arithmetic policy | Per-field/case absolute values derived independently; blanket 1.5% removed. |
| Source identity reconciliation | PASS for object identity/live metadata | Controlled pin/blobs explicitly recorded; PDF/DOCX scenario differences preserved. |
| Authority freeze | PASS by source/diff boundary | No screening/design authority transition. |
| Row-revert architecture | PASS by source/static inspection | Same working-record authority, separate topology downgrade latch. |
| Elements/full-XLSX anti-bypass architecture | PASS by source/static inspection | Dual SHA-256 guard and hostile regression cases added. |
| Captured-state/in-flight drift architecture | PASS by source/static inspection | Captured bytes/state and readiness/run drift invalidation implemented. |
| Audit/engineering hash separation | PASS by source/static inspection | Distinct schemas/payloads/hashes and regression cases. |
| Reproducibility export architecture | PASS by source/static inspection | Dual-hash verification, current-result gate, central workflow envelope, non-authorizing output. |
| Lazy facility-workflow ownership | PASS by source/static inspection | Dynamic import restored in visible tab; helper has no static numerical import. |
| Existing-JS module target | PASS by source inspection | `vibration-integrity-tab.js` has no content at/after line 295; new JS modules are below 300 lines. |
| 45-file manifest construction | PASS by source/static audit | Run-evidence test added and expected count corrected from 44 to 45. |
| Native Node focused tests | **NOT_RUN** | Complete authenticated checkout unavailable in this runtime. |
| `npm run verify:vibration-fit-release` | **NOT_RUN / ENVIRONMENT_BLOCKED** | No complete checkout/dependency/runtime execution. |
| Real-browser / real-file acceptance | **NOT_RUN** | No runnable application/browser checkout. |
| Exact page-level EI/errata/project review | **NOT COMPLETE** | Requires independent controlled-source review. |
| Independent vibration-engineer approval | **NOT_RUN** | Mandatory separate qualification gate. |

## Backup / Recovery Ledger

Repository instruction requires `node utils/backup.js save <file>` before editing existing JS. This connector-only runtime cannot execute that repository-local command because no complete checkout/`gh` environment is available. It remains **NOT_RUN / ENVIRONMENT_BLOCKED** and is not represented as PASS.

Immutable pre-edit Git blobs provide exact recovery points for the main existing files edited in this assignment:

```text
Benchmarks/VibrationFIT/fit-ei-worked-examples-v1.json
  9e2438c34ea2e1b282feee58401a98fe1f979ae7

tests/vibration-fit-ei-worked-examples.test.mjs
  ddcd498231cdfdec132f96bdd58ad918cebe7e3e

tabs/vibration-integrity-benchmarks.js
  4bbf9d679fe226e87ef22f3269a74f71a4212c72

converters/vibration/mechanisms/fit.js
  86a1cc4e616c11b50615c457383360b8cb766a7c

tests/vibration-fit-mechanism-contract.test.mjs
  b35de8215983df7966515f1f56f091f9407e5895

docs/vibration/FIT-EI-Worked-Example-Traceability-v1.md
  d4d8b5b226f6154641961df5fb14d3a5b7cdd1f1

docs/vibration/FIT-Engineering-Method-Specification-v1.md
  2aaf40b223fc5377f0430cffa7eda91edcd20828

docs/vibration/FIT-Qualification-Dossier-v1.md
  42f30d602c0a689b4156cba70fb01fed7fd61adf

tabs/vibration-integrity-working-state.js
  ed75cd692a6b652c034c6db2408888bb5ab4ad6b

tabs/vibration-integrity-input-model.js
  9e2cfa24aa44e53a248d58978dece0f68ccc326b

tabs/vibration-integrity-input-runtime.js
  797ed3e9690de784220c7ce0c6f32c5f9be526c3

tests/vibration-integrity-working-state.test.mjs
  1df7e66406ffadb84cc6a803840d43aa2330bb72

tests/vibration-integrity-input-model.test.mjs
  fd3677dc53725b3e7d56e9baf13d0e1c49bbca0f

tests/vibration-integrity-input-runtime.test.mjs
  76f3b2d25a12f409b695837d4b25f967a54684ec

tabs/vibration-integrity-run-snapshot.js
  af870fc5ff3ff7927590d98161d715e8c22d6639

tests/vibration-integrity-run-snapshot.test.mjs
  5f6c849f3f6a32d611d91cfac3c556a14669923e

tabs/vibration-integrity-input-view.js
  77a1ee3d80a50e8a9bb69bd5abc8947a274b172a

tabs/vibration-integrity-tab.js
  646113c43ec790625bb8ac09242eb506c8f09259

tests/vibration-integrity-editable-input-static.test.mjs
  9d0ce72ba82427e9f4e8627e1429aa84beb4953e

scripts/verify-vibration-fit-release.mjs
  615833e5d8bd0ae8e4297c57274366ee5e8f53cc

tests/vibration-fit-release-gate.test.mjs
  129a0ce7ca4c2032ac5f7a5702a2b999f85184c2
```

New files have no pre-edit blob:

```text
tabs/vibration-integrity-dom.js
tabs/vibration-integrity-input-integrity.js
tabs/vibration-integrity-run-controller.js
tabs/vibration-integrity-run-evidence.js
tests/vibration-integrity-run-evidence.test.mjs
docs/vibration/FIT-Screening-Scope-v1.md
docs/vibration/FIT-EI-Worked-Example-Traceability-v1.md  # created earlier in PR499 before later edits
```

Recovery does not depend on private chat state.

## Coordination / Overlap

### PR #479

Status: **COORDINATION_REQUIRED / likely superseded for bounded export scope**.

Do not merge its stale head. Its useful run-evidence concept has been reconstructed on PR499's current working-state, dual-integrity and dual-hash contracts. After PR499 review, compare #479's remaining unique diff; close it as superseded if no unique required behavior remains.

### PR #498 / current main

Already reconciled. Net PR499 diff contains no AIV #498 implementation path.

### Broader vibration master work

PRs #483/#484/#485 remain parallel unless a concrete FIT dependency is proven. Do not gate FIT production qualification on unrelated mechanism recovery by default.

## Remaining Production Gates

The next work should be qualification-first, not another broad feature patch:

1. **Execute exact 45-file FIT/VIB release suite** from a clean full checkout on the final candidate SHA. Record every PASS/FAIL/blocked test; do not infer from source review.
2. **Run real-browser/real-file acceptance** with complete five-sheet XLSX, Elements CSV, operating/enrichment CSV, all controlled EI cases, editing, cell/row/table revert, topology downgrade, readiness, run, in-flight/stale behavior, source navigation, CSV export and JSON evidence export.
3. **Complete central API unit/input-representation qualification** across every included bounded slice, including SI/US equivalence and accepted mass-flow/velocity/multiphase representations.
4. **Complete exact page/table/equation EI T2.2 adoption + official errata + project-basis review.** Preserve source differences rather than forcing parity.
5. **Independent vibration engineer review** of exact bounded scope, QST-003 exclusion, evidence strength, tolerance policy, advanced families, limitations and continuation semantics.
6. Only after 1–5 pass on one exact candidate SHA: prepare a **separate** owner-authorized `BENCHMARK_ONLY -> SCREENING` governance PR with no equation changes.

## Appendix A — Expert Takeover Qualification Questions

A continuation agent must answer these from current repository/source evidence before receiving production-qualification authority:

1. Which exact EI AVIFF T2.2 pages, figures, tables, equations and official errata control every method/applicability item included in `FIT-Screening-Scope-v1`, and which remain unverified?
2. On the exact PR499 head, does `npm run verify:vibration-fit-release` execute all 45 controlled files? List exact failures by mechanism/contract; distinguish software failure, missing dependency and environment blocker.
3. Using a real five-sheet XLSX, can the browser demonstrate that changing only a non-Elements sheet or source bytes triggers `VIBRATION_TOPOLOGY_SOURCE_FILE_INTEGRITY_MISMATCH`, while changing the visible working projection triggers the projection mismatch/downgrade path?
4. Across every included phase/correlation slice, do accepted SI/US and alternate process representations converge through the central Engineering Calculation API to equivalent normalized `resolvedInputs` and results?
5. Can `FitRunEvidencePackage.v1` reproduce the same normalized engineering request/result across a new session/machine while preserving distinct audit source identities and proving both hashes?
6. Is explicit exclusion of `219.1 < Dext < 273 mm` acceptable to the independent vibration engineer for the first screening release, and how must the unsupported outcome be worded/handled operationally?
7. Which standard/advanced branches, process representations or topology input forms must remain outside the first production scope even if all software tests pass?
8. Does PR #479 contain any unique requirement not present in PR499 after exact diff comparison, or should it be closed as superseded?
9. Does any API/UI/register/export/consumer infer safety, screening authority or design acceptance from evidence strength, benchmark PASS, LOF band or `candidateForEngineeringReview`? Any such inference is a release blocker.
10. After all qualification gates pass, what is the smallest authority-only diff required to change FIT from `BENCHMARK_ONLY` to bounded `SCREENING`, and how will excluded inputs continue to fail closed?

Takeover decision: **CONTINUE QUALIFICATION — SOFTWARE HARDENING SLICE COMPLETE / NO MERGE OR AUTHORITY AUTHORIZATION**.
