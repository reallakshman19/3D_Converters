# PR515 — AIV PF-01 Production Freeze Work Report

## Recovery Header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED_WITHIN_ISSUE_513_PF01
EXECUTION_MODE: MANUAL
MERGE_AUTHORITY: OWNER_ONLY

MAIN_HEAD_LAST_CHECKED: d659e670a2f8fe0a35fc8072382512f6493898cf
MERGE_BASE: d659e670a2f8fe0a35fc8072382512f6493898cf
IMPLEMENTATION_HEAD_BEFORE_EVIDENCE_SYNC: 835c908ad16fa206aa510136068ea6d1b0578a12
FINAL_EVIDENCE_HEAD_OBSERVED_BEFORE_REPORT_SYNC: 0e354c51011c29b40929ad73826b6c87e5bea4cd
FILTER_BLOB_AFTER: 8640eca0a2e1454e277613d50c4c9962e3e537d8
PACKAGE_BLOB_AFTER_PF01_GATE: 958da1f3ba7cc2185f68af4bb5c4b254f7711dd0
GROUNDING_EPOCH: GE-005
CURRENT_STAGE: IMPLEMENTED_TARGETED_VALIDATION_PASS_NATIVE_AND_FULL_APP_EXECUTION_PENDING
CURRENT_BLOCKER: exact-head native PF-01/release suite and identical post-fix real-application Chromium replay are NOT_RUN
HIGHEST_RISK: treating mapped tests, targeted Chromium or independent numerical subchecks as exact-head native/full-product acceptance
EXACT_NEXT_ACTION: run `npm run verify:aiv-pf01`, then `npm run verify:aiv-canvas-release`, then repeat the same EI EIT -> readiness -> screening -> Case/Line/Show workflow in the real application; keep PF-02 blocked until all required evidence is green
```

## Mission

Issue #513 PF-01 only: use the application live, reproduce the canvas/filter failure, make the smallest correct fix, validate against frozen engineering benchmarks, make the touched failure surface professional, record the proof, and stop before PF-02 until the slice is qualified.

Permanent boundaries:

```text
TABLES = engineering source of truth
SVG/pixel geometry = never physical-distance authority
screeningResultScope = ASSESSMENT
line/case summary = non-authoritative
designAuthority = false
frozen benchmark expected values/tolerances = immutable in this slice
```

## Live BEFORE evidence — confirmed

Owner live Chromium reproduction was supplied at `2026-08-15T15:37:11+04:00` on production `main@d659e670...` after PR #516.

Workflow:

```text
Import EI worked-example EIT
-> AIV readiness/screening workspace
-> Check AIV readiness
-> Run AIV screening
```

Observed failure:

```text
AIV action failed.
Cannot read properties of null (reading 'caseId')
```

Browser stack:

```text
createAivCanvasFilterState (vibration-aiv-canvas-filter.js:33:36)
Object.sync (vibration-aiv-canvas-filter.js:91:13)
syncRuntime (vibration-aiv-canvas-controller.js:160:28)
Object.sync (vibration-aiv-canvas-controller.js:283:17)
render (vibration-aiv-qualification-tab.js?v=aiv-qualification-1:62:22)
```

Callers included dataset load and Check Readiness. This satisfies the PF-01 live-product pre-fix gate.

## First wrong boundary / root cause

```text
createAivCanvasFilterController() initializes state = null
-> first sync passes explicit null
-> createAivCanvasFilterState(input = {}) default applies only to undefined
-> input.caseId dereference throws
```

Pre-fix production blob:

```text
tabs/vibration-aiv-canvas-filter.js
a5da4fb99e69310659659725696c61c3d9347085
```

## Implemented PF-01 correction

### 1. Minimal filter-state fix

Only one production line changes the root failure:

```diff
 export function createAivCanvasFilterState(input = {}, options = {}) {
+  input = input ?? {};
   const cases = values(options.cases ?? []);
```

Patched blob:

```text
8640eca0a2e1454e277613d50c4c9962e3e537d8
```

Permanent regression:

```text
tests/vibration-aiv-canvas-filter-runtime.test.mjs
```

Cases:

- explicit null state factory;
- first controller sync from `state=null`;
- filter change before explicit sync.

The regression is wired into `npm run verify:aiv-canvas`.

### 2. Professional degraded-canvas behavior

The live failure also exposed a UX/authority defect: a presentation canvas exception escaped `render()` and was reported as an engineering `AIV action failed` result.

PF-01 now contains canvas-only failure containment in:

```text
tabs/vibration-aiv-qualification-tab.js
```

`canvasController.sync()` is isolated by `try/catch`. A presentation failure produces a warning inside the canvas:

```text
Canvas unavailable: <error>. Engineering tables and screening controls remain authoritative and usable.
```

The warning does not mutate engineering inputs, readiness authority, screening result authority, or physical distance.

Regression protection is in `tests/vibration-aiv-canvas-hardening.test.mjs`.

### 3. Cache-distinct live delivery

The real browser trace showed:

```text
vibration-aiv-qualification-tab.js?v=aiv-qualification-1
```

The AIV product import in `tabs/engineering-calculations-tab.js` is advanced to:

```text
vibration-aiv-qualification-tab.js?v=aiv-qualification-2
```

This avoids relying on an already-observed stale module URL when qualifying the patched workspace. The hardening regression asserts `-2` is present and `-1` is absent.

### 4. Strong B6 presentation-invariance regression

New:

```text
tests/vibration-aiv-presentation-invariance.test.mjs
```

The controlled two-RV network is screened through the registered path before and after extreme presentation movement:

```text
J-101                -> (9999, -4000)
AIV-ASSESS-HDR-001   -> (-2500, 7000)
```

The test requires exact equality of generated engineering tables, path evidence, readiness counts, registered source results, registered Assessment results, and non-authoritative line/case summaries. It also reasserts `RV-101 -> 38 m`, `RV-102 -> 41 m`, and `svgPixelsAuthoritativeForDistance=false`.

### 5. Named PF-01 native gate

`package.json` exposes:

```bash
npm run verify:aiv-pf01
```

This invokes existing/focused repository tests needed to close PF-01 and B1-B6; it does not create a second benchmark implementation.

## Frozen B1-B6 coverage

| ID | Repository proof | Contract |
|---|---|---|
| B1 | `vibration-aiv-canvas-integration.test.mjs` | EI D.2.3 via `calculateEngineering()`, raw/point PWL, Assessment LOF, canvas parity |
| B2 | canvas integration + flare multisource | `160+160=163.0102999566398 dB` and both source IDs |
| B3 | canvas integration + flare multisource | `160+150=160.41392685158226 dB` and both source IDs |
| B4 | canvas integration | single Engineering API = batch API = canvas projection |
| B5 | screening runtime bridge + flare multisource | controlled 2-RV mock -> readiness envelope -> request -> registered `calculateEngineering()`; RV-101/RV-102 custody |
| B6 | flare network + SVG + presentation invariance | presentation movement cannot alter distance, engineering tables, readiness, or registered results |

The targeted command maps to these proofs, but mapping is not execution.

## Executed validation

### Filter regression — PASS

Exact reconstructed patched filter + committed regression:

```text
3 tests
3 pass
0 fail
```

### Targeted Chromium 144 — PASS, limited scope

Chrome `144.0.7559.96`, CDP 1.3:

```text
explicit-null       PASS
first-sync          PASS
change-before-sync  PASS
```

Classification: `TARGETED_BROWSER_ENGINE_EXECUTION_NOT_FULL_APPLICATION`.

### Frozen numerical invariance subchecks — PASS

```text
D.2.3 relief raw PWL   164.6851759525391 dB   delta 0   tol 1e-10
D.2.3 relief point PWL 164.3734876408508 dB   delta 0   tol 1e-10
160 + 160              163.0102999566398 dB   delta 0   tol 1e-9
160 + 150              160.41392685158226 dB  delta 0   tol 1e-9
```

No oracle or tolerance was edited.

## Exact B1-B6 status

| ID | Status | Reason |
|---|---|---|
| B1 | NOT_RUN | exact native mapped test has not executed on implementation head |
| B2 | NOT_RUN | exact native registered path/source-ID test has not executed |
| B3 | NOT_RUN | exact native registered path/source-ID test has not executed |
| B4 | NOT_RUN | exact native parity test has not executed |
| B5 | NOT_RUN | exact native two-RV registered bridge test has not executed |
| B6 | NOT_RUN | exact native registered presentation-invariance test has not executed |

Therefore:

```text
PF01_FULL_QUALIFICATION = NOT_COMPLETE
PF02_AUTHORIZED = false
MERGE_READY = false
```

## Full application post-fix gate

Still required on the exact patched branch:

```text
Import the same EI worked-example EIT
-> Check AIV readiness
-> Run AIV screening
-> exercise Operating Case / Line / Show
-> no uncaught caseId TypeError
-> no canvas-only exception promoted to AIV action failure
-> authoritative tables/readiness/screening remain usable
```

If a canvas presentation failure is intentionally forced, acceptable behavior is the local degraded warning, not an engineering action failure.

## Execution-environment truth

Current environment limitations:

- no native private repository checkout is materialized;
- the GitHub connector can read the private zipball endpoint but does not expose the archive bytes to the execution container;
- local Chromium is managed with `URLBlocklist=["*"]`, preventing full-app navigation;
- hosted GitHub workflow jobs repeatedly return `steps=null` and no logs.

Final-head AIV runner custody observed on PR head `0c680cace3547abff3a61421ca6a4521c7edef28`:

```text
workflow run: 31883609230
job:          95009492269
GitHub conclusion: failure
steps:        null
logs:         null
classification: NOT_RUN_INFRASTRUCTURE_BLOCKED
```

These are not product failures and not PASS.

## Backup custody

Repository backup utility was previously executed against hash-identical pre-fix filter bytes in the reconstructed workspace:

```text
utils/backup.js blob: cd0c755457bb623b0487200a7d0b7217d8b3478e
receipt: #2
source blob = backup blob = a5da4fb99e69310659659725696c61c3d9347085
```

Native-worktree backup execution remains NOT_RUN because no native checkout exists. Immutable Git history retains the exact pre-edit blob.

## Changed-file ledger

Production/release/test files:

```text
tabs/vibration-aiv-canvas-filter.js                  root null fix
tabs/vibration-aiv-qualification-tab.js              degraded canvas containment
tabs/engineering-calculations-tab.js                 cache token -1 -> -2
tests/vibration-aiv-canvas-filter-runtime.test.mjs   null/first-sync regression
tests/vibration-aiv-canvas-hardening.test.mjs        degraded-mode/cache boundary regression
tests/vibration-aiv-presentation-invariance.test.mjs B6 registered invariance regression
package.json                                          release + PF-01 gate wiring
```

Evidence/recovery files:

```text
ValidationRecords/AIV/ProductionFreeze/AIV-PF-01-manifest.json
ValidationRecords/AIV/ProductionFreeze/AIV-PF-01-before.json
ValidationRecords/AIV/ProductionFreeze/AIV-PF-01-after.json
ValidationRecords/AIV/ProductionFreeze/AIV-PF-01-benchmark.json
agents/PR515_workreport.md
agents/status/PR515.yaml
agents/claims/PR515.yaml
```

## Coordination / authority

- PR #506 remains salvage/evidence only; only individually justified PF-01 ideas were replayed.
- PR #516 is merged and is the production/merge base.
- `main` last checked remains `d659e670a2f8fe0a35fc8072382512f6493898cf`.
- No AIV equation/coefficient, executable-domain, source-grouping, master-authority, assumption-authority, or export-contract change is in PF-01.
- No UI code recomputes dB or derives engineering distance from SVG geometry.

## Active items

- `ISS-515-001` — exact-head `npm run verify:aiv-pf01` NOT_RUN.
- `ISS-515-002` — exact-head `npm run verify:aiv-canvas-release` NOT_RUN.
- `ISS-515-003` — full patched application Chromium replay NOT_RUN.
- `DEC-515-001` — one-line null normalization is the root correction.
- `DEC-515-002` — canvas exceptions degrade presentation only and cannot masquerade as engineering action failure.
- `DEC-515-003` — AIV workspace import token advanced to `aiv-qualification-2` for patched live delivery.
- `DEC-515-004` — B1-B6 use existing registered/frozen tests; no duplicate benchmark equations added.
- `RISK-515-001` — merging or authorizing PF-02 before native B1-B6 and post-fix full-browser closure.

## Exact next action

On an executable exact PR #515 checkout:

```bash
npm ci
npm run verify:aiv-pf01
npm run verify:aiv-canvas-release
```

Then run the identical real-browser EI EIT workflow described above. Record exact head, browser version, result/output evidence, console state and B1-B6 PASS/FAIL. Only after those are green may PF-01 be marked complete and presented for Owner merge authorization. Do not start PF-02 while any required gate remains `NOT_RUN` or red.
