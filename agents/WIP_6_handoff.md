# WIP 6 — SBC Type-3 Production Freeze PF-006

## Recovery Header

```text
WORK_INTENT: IMPLEMENT / VALIDATE / HANDOVER
CRITICALITY: ENGINEERING_CRITICAL
ISSUE: #514
BRANCH: agent/sbc-pf-006-browser-acceptance
STACK_BASE: PR #527 head a68cba98d81df5e182c17bfa4233a42a9e553157
GROUNDED_CURRENT_MAIN: 36f53018d5c1cf8bec609e39d6995a6067bb5d01
QUALIFICATION: QUALIFIED_FOR_SBC_TYPE3_PRODUCTION_FREEZE
OWNER_PROGRESSION: ok proceed
TAKEOVER_AUTHORITY: WRITE_ALLOWED
MERGE_AUTHORITY: OWNER_ONLY / NOT_GRANTED
PR_RECOVERY_STATE: RECOVERABLE
CURRENT_SLICE: PF-006 SBC-specific served-Chromium acceptance harness
FREEZE_STATE: BLOCKED / NOT_FROZEN
```

## Grounding / defect

The exact PF-005 candidate remains `a68cba98d81df5e182c17bfa4233a42a9e553157`; current `main` remains `36f53018d5c1cf8bec609e39d6995a6067bb5d01`.

The shared production-freeze browser script currently exercises FIT, Mechanical authority separation and FIT evidence export only. It does **not** exercise the SBC Type-3 master-assisted workflow, D7 values, exact D/F/G project evidence, facility A/B isolation, wrong-scope rejection, edit invalidation, or stale async rejection. Therefore even if the hosted runner budget were restored, the existing script could not produce a valid SBC Type-3 freeze receipt.

Issue #511 owns shared browser infrastructure/protocol/runner/release plumbing. PF-006 therefore adds an SBC-specific acceptance harness without editing the shared #511 script or workflow.

## Hypothesis / falsifier

Hypothesis: a standalone SBC browser harness can use the real Vibration Integrity product controls to create two controlled facilities, run FIT, evaluate both SBC D7 candidates at `.70`, verify FIT remains screening authority, then prove PF-007 through PF-010 behavior in served Chromium.

Falsifier: stop if the harness requires a hidden production test hook, changes engineering calculations/authority/currentness, reconstructs or activates quarantined curves, or edits #511 shared runner plumbing.

## Planned new files

```text
scripts/vibration-sbc-type3-browser-fixture.mjs
scripts/validate-vibration-sbc-type3-production-freeze-browser.mjs
tests/vibration-sbc-type3-production-freeze-browser-contract.test.mjs
ValidationRecords/VibrationSBC/ProductionFreeze/SBC-PF-006-browser-harness.json
```

No existing production file is planned for edit, so no production backup is required.

## Browser acceptance contract

The harness must use visible product/file controls plus served modules and record screenshots/JSON receipt for:

```text
1. upload two controlled EI FIT benchmark facilities through topology/operating/enrichment inputs
2. readiness = 2 READY / 0 NOT_READY; run FIT
3. resolve exact facility scope A and B from the live register
4. served-runtime wrong-scope precomputed candidate -> INVALID_PRECOMPUTED_CANDIDATE / FACILITY_SCOPE_MISMATCH
5. facility A D7: C=.68 D=.20 E=.70 F=.60 G=.20 LOFLOC=1 multiplier=1.42 final=.70
6. facility B same D7 result under a distinct exact scope
7. both rows: FIT remains screening governing; SBC=.70 candidate tier only
8. physical edit on A -> A STALE/current candidate removed, B remains current
9. D/F/G evidence edit on A -> A STALE/current candidate removed, B remains current
10. deterministic same-task Evaluate+physical-edit race -> old async completion cannot restore A; B remains current
11. T3-1..T3-4 remain BLOCKED SOURCE DATA / runtime inactive
12. no Chromium page/console errors
```

The same-task race is deterministic because the click starts evaluation and synchronously rerenders; the harness then re-queries the new physical input and dispatches the edit before the evaluation promise continuation can commit.

## Source / fixture custody

Two existing controlled FIT benchmark cases are used only to create two real facility rows through the product input contracts:

```text
EI-D2-FIT-RELIEF-UPSTREAM-4IN
EI-D2-FIT-RECYCLE-SUCTION-6IN
```

SBC D7 remains the frozen issue oracle. Manual D/F/G values `.20/.60/.20` are entered as exact project evidence at the generated T3-1/T3-3/T3-4 coordinates with a non-empty D7 source reference. No interpolation, extrapolation, reconstruction, publication or runtime curve activation is performed.

## Local authoring validation before repository mutation

```text
scripts/vibration-sbc-type3-browser-fixture.mjs                  node --check PASS; 163 lines
scripts/validate-vibration-sbc-type3-production-freeze-browser.mjs node --check PASS; 226 lines
```

Playwright/live Chromium is still `NOT_RUN`; local sandbox has Chromium but no checkout/network and no Playwright package. Hosted Actions remains previously classified `NOT_RUN / INFRASTRUCTURE_BLOCKED` until the exact PF-006 head is inspected.
