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
IMPLEMENTATION_HEAD: 8ce49f991d6907694f284398026a8114437d9740
FILTER_BLOB_AFTER: 8640eca0a2e1454e277613d50c4c9962e3e537d8
GROUNDING_EPOCH: GE-005
CURRENT_STAGE: IMPLEMENTED_TARGETED_VALIDATION_PASS_FULL_APP_POSTFIX_AND_B1_B6_PENDING
CURRENT_BLOCKER: full patched application cannot be navigated from this execution environment; B1-B6 complete closure remains NOT_RUN
HIGHEST_RISK: mistaking targeted Chromium/module or analytical subchecks for full application/registered benchmark acceptance
EXACT_NEXT_ACTION: run PR515 patched head in the real AIV application, import the same EI EIT, Check AIV readiness, Run AIV screening, exercise Case/Line/Show, confirm zero uncaught caseId errors, then execute B1-B6 and the AIV release suite before merge or PF-02
```

## Mission

Issue #513 PF-01 only: reproduce the live AIV canvas/filter crash as a user, make the smallest correct fix, benchmark immediately, and stop before PF-02 until the slice is fully qualified.

Permanent boundaries remain:

```text
TABLES = engineering source of truth
SVG/pixel geometry = never physical-distance authority
screeningResultScope = ASSESSMENT
line/case summary = non-authoritative
designAuthority = false
frozen benchmark expected values/tolerances = immutable in this slice
```

## Live BEFORE evidence

Owner live Chromium reproduction was supplied at `2026-08-15T15:37:11+04:00` on current production after PR #516.

User workflow:

```text
Import EI worked-example EIT
-> AIV readiness/screening workspace
-> Check AIV readiness
-> Run AIV screening
```

Observed product failure:

```text
AIV action failed.
Cannot read properties of null (reading 'caseId')
```

Console stack reproduced the same first wrong boundary twice:

```text
createAivCanvasFilterState (vibration-aiv-canvas-filter.js:33:36)
Object.sync (vibration-aiv-canvas-filter.js:91:13)
syncRuntime (vibration-aiv-canvas-controller.js:160:28)
Object.sync (vibration-aiv-canvas-controller.js:283:17)
render (vibration-aiv-qualification-tab.js?v=aiv-qualification-1:62:22)
```

One path was dataset load (`vibration-aiv-dataset-loader.js:102`); the second was Check Readiness (`vibration-aiv-execution.js:56`).

Current production filter blob at reproduction: `a5da4fb99e69310659659725696c61c3d9347085`.

Root cause:

```text
createAivCanvasFilterController() initializes state = null
-> first sync passes explicit null
-> createAivCanvasFilterState(input = {}) default does not apply to null
-> input.caseId throws
```

This satisfies the PF-01 pre-fix falsifier. The defect is live-product confirmed, not only helper-generated.

## Fix

Only one production line changed:

```diff
 export function createAivCanvasFilterState(input = {}, options = {}) {
+  input = input ?? {};
   const cases = values(options.cases ?? []);
```

Committed production filter blob after fix:

```text
8640eca0a2e1454e277613d50c4c9962e3e537d8
```

No AIV equation, coefficient, readiness contract, source-grouping rule, master rule, physical-distance authority, result scope or export contract changed.

Permanent regression added:

```text
tests/vibration-aiv-canvas-filter-runtime.test.mjs
```

and wired into:

```text
npm run verify:aiv-canvas
```

Package change is release-gate registration only.

## Backup custody

Repository policy backup utility was previously executed in the reconstructed hash-identical workspace against the pre-fix filter bytes:

```text
utility: utils/backup.js
utility blob: cd0c755457bb623b0487200a7d0b7217d8b3478e
receipt: #2
source blob = backup blob = a5da4fb99e69310659659725696c61c3d9347085
```

A native-worktree rerun remains `NOT_RUN / ENVIRONMENT_BLOCKED`; immutable Git history retains the exact pre-edit blob. This limitation is recorded and not called PASS.

## Executed validation

### Filter regression

Exact reconstructed patched filter + committed regression:

```text
3 tests
3 pass
0 fail
```

Cases:

1. explicit `null` state factory;
2. controller first sync from initial `state=null`;
3. change-before-explicit-sync.

### Targeted Chromium

Chrome `144.0.7559.96`, CDP 1.3:

```text
explicit-null       PASS
first-sync          PASS
change-before-sync  PASS
```

Classification: `TARGETED_BROWSER_ENGINE_EXECUTION_NOT_FULL_APPLICATION`.

### Frozen numerical invariance subchecks

Exact independent qualification math/oracle values:

```text
D.2.3 relief raw PWL
actual   164.6851759525391 dB
expected 164.6851759525391 dB
PASS delta 0, tol 1e-10

D.2.3 relief point PWL
actual   164.3734876408508 dB
expected 164.3734876408508 dB
PASS delta 0, tol 1e-10

160 + 160 dB
actual   163.0102999566398 dB
expected 163.0102999566398 dB
PASS delta 0, tol 1e-9

160 + 150 dB
actual   160.41392685158226 dB
expected 160.41392685158226 dB
PASS delta 0, tol 1e-9
```

No oracle or tolerance was edited.

## B1-B6 qualification state

The numerical subchecks above are supporting evidence. They do not satisfy the complete B1-B6 contracts by themselves.

| ID | Status | Remaining proof |
|---|---|---|
| B1 D.2.3 registered screening | NOT_RUN | patched registered path + canvas projection parity |
| B2 160+160 | NOT_RUN | patched registered multi-source path + both Source Canonical IDs |
| B3 160+150 | NOT_RUN | patched registered multi-source path + both Source Canonical IDs |
| B4 single/batch/canvas | NOT_RUN | registered-kernel parity execution |
| B5 2-RV mock flare network | NOT_RUN | full registered workflow |
| B6 SVG invariance | NOT_RUN | live canvas move/resize with engineering inputs/results unchanged |

Therefore:

```text
PF01_FULL_QUALIFICATION = NOT_COMPLETE
PF02_AUTHORIZED = false
MERGE_READY = false
```

## Full application post-fix gate

Still required on the exact patched branch/head:

```text
Import the same EI worked-example EIT
-> Check AIV readiness
-> Run AIV screening
-> exercise Operating Case / Line / Show
-> no uncaught TypeError
-> no AIV action failed banner from canvas-filter sync
-> authoritative tables/readiness remain usable
```

The current execution container cannot perform this because managed Chromium has `URLBlocklist=["*"]`, private repo checkout is unavailable, and hosted workflow jobs have historically acquired no runner/steps. These remain `NOT_RUN`, not PASS.

## Changed-file ledger

```text
Production/test/release:
  tabs/vibration-aiv-canvas-filter.js                 +1 line
  tests/vibration-aiv-canvas-filter-runtime.test.mjs new focused regression
  package.json                                        release-gate registration only

Evidence/recovery:
  ValidationRecords/AIV/ProductionFreeze/AIV-PF-01-manifest.json
  ValidationRecords/AIV/ProductionFreeze/AIV-PF-01-before.json
  ValidationRecords/AIV/ProductionFreeze/AIV-PF-01-after.json
  ValidationRecords/AIV/ProductionFreeze/AIV-PF-01-benchmark.json
  agents/PR515_workreport.md
  agents/status/PR515.yaml
  agents/claims/PR515.yaml
```

## Coordination

- PR #506 remains salvage/evidence only; no broad replay was used.
- PR #516 is merged and is the production base.
- No overlap with numerical/master/readiness/grouping/export authority in PF-01.
- `main` last checked remains `d659e670a2f8fe0a35fc8072382512f6493898cf`.

## Active items

- `ISS-515-001` — full patched application Chromium path NOT_RUN.
- `ISS-515-002` — B1-B6 full benchmark closure NOT_RUN.
- `ISS-515-003` — native `npm run verify:aiv-canvas-release` NOT_RUN.
- `DEC-515-001` — one-line null normalization accepted as minimal fix after owner live reproduction.
- `DEC-515-002` — numerical subchecks PASS but cannot be promoted to registered/full-app benchmark PASS.
- `DEC-515-003` — no further UI redesign in PF-01 unless full-app replay reveals a touched-workflow usability defect.
- `RISK-515-001` — merging before identical post-fix live workflow and B1-B6 closure.

## Exact next action

Run the exact PR #515 patched head in the real application and repeat the owner workflow. If the `caseId` crash is gone, execute B1-B6 plus `npm run verify:aiv-canvas-release`, update the receipts with exact results, then request owner merge authorization. Do **not** start PF-02 while any required PF-01 benchmark remains `NOT_RUN` or red.
