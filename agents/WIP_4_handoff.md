# WIP 4 — SBC Type-3 Production Freeze PF-004

## Recovery Header

```text
WORK_INTENT: IMPLEMENT / VALIDATE / HANDOVER
CRITICALITY: ENGINEERING_CRITICAL
ISSUE: #514
BRANCH: agent/sbc-pf-004-live-integration
STACK_BASE: PR #522 head af0ca1e2e7e899ced52cf402218860780a7c4d63
LIVE_MAIN: e97effb06ff9bfcad5ea87381abaa9f2665c1bdd
GROUNDING_EPOCH: 2026-08-15T15:02Z
QUALIFICATION: QUALIFIED_FOR_SBC_TYPE3_PRODUCTION_FREEZE
OWNER_PROGRESSION: ok, proceed next phase
TAKEOVER_AUTHORITY: WRITE_ALLOWED
MERGE_AUTHORITY: OWNER_ONLY / NOT_GRANTED
PR_RECOVERY_STATE: RECOVERABLE
CURRENT_SLICE: PF-004 stacked master-assisted live-product integration
FREEZE_STATE: BLOCKED / NOT_FROZEN
```

## Stack / dependency truth

PF-004 is deliberately stacked on PF-003 / PR #522. It will replay the exact accepted PF-001 and PF-002 payloads into this integration branch, then add the missing orchestration/controller/matrix/view hooks required for the real SBC engineer journey.

```text
#520 PF-001  OPEN / DRAFT / mergeable / browser NOT_RUN
#521 PF-002  OPEN / DRAFT / currently non-mergeable / browser NOT_RUN
#522 PF-003  OPEN / DRAFT / mergeable / browser NOT_RUN
```

This integration branch must not be interpreted as merge authority for any prerequisite. It is a validation/integration vehicle until the prerequisite drafts are reconciled by the Owner.

## Live defect / hypothesis

Current main still exposes an explicit-intermediate SBC Type-3 user-data workflow. It does not provide the qualified master-assisted physical-input path, it has no reusable per-scope engineering revision/current-operation guard in the live SBC controller, and the live panel still states C/E/location/main-line/multiplier are explicit project inputs.

Hypothesis: the smallest safe integration is to preserve the legacy evaluator as fallback while adding an SBC-specific master-assisted orchestrator/controller/view. Current candidates are admitted to the facility matrix only through the exact-scope/current-result cache maintained by PF-003 currentness state. FIT remains the only screening-authorized governing mechanism.

Falsifier: stop if integration requires changing #512 top-level workspace vocabulary/authority tiers, activating quarantined curves, weakening D7, or bypassing exact scope/revision/token checks.

## Pre-edit custody

The repository backup CLI cannot run in this connector-only environment because no authenticated checkout is mounted. Before any existing-file edit, immutable Git blob custody is recorded here.

```text
converters/vibration/sbc/type3-user-data.js                69215382db2fabaae8356370ca5760def19d4cba
converters/vibration/sbc/facility.js                       f723aace9c7c7fcbedfcb0fcab64c528dcc1f046
converters/vibration/mechanisms/sbc.js                     fe0a15b8cb32b0d1e16ae41f0fd2e934b88a2557
tabs/vibration-integrity-mechanisms.js                     38368ac98cd685b8fa0f5bd4b680e886cc7c426e
tabs/vibration-integrity-view.js                           ef061686257455ed611545611eceff6165d8fe86
tabs/vibration-integrity-user-data-shell.js                e81e50c22f997fbde28a8cece348dd34e1ec15df
tabs/vibration-integrity-sbc-type3-view.js                 85146c0a72cea36d7c9a37d24fe355356da95c01
```

No existing file outside this list may be edited without first extending this custody record.

## Protected invariants

```text
D7 C=.68 D=.20 E=.70 F=.60 G=.20 LOFLOC=1 final=.70
missing/blank required terms fail closed
only documented automatic zero is C=0 for no unsupported mass
T3-1..T3-4 remain BLOCKED_SOURCE_DATA_CONFLICT / runtime inactive
manual D/F/G must match exact requested figure/x/y coordinates and carry project source reference
exact facility scope is mandatory
physical or D/F/G edit invalidates current candidate synchronously
old async completion cannot overwrite newer engineering state
navigation/presentation does not invalidate engineering state
SBC may be candidateGoverning only
FIT remains screeningGoverning when current/authorized
legacy explicit-user evaluator remains available as fallback
```

## Planned integration files

Exact prerequisite replay:

```text
converters/vibration/sbc/type3-combination.js                from #520
converters/vibration/sbc/type3-user-data.js                  exact #520 payload
converters/vibration/sbc/type3-noncurve-candidate-data.js    from #521
converters/vibration/sbc/type3-master-assisted-derivation.js from #521
```

New PF-004 modules/tests:

```text
converters/vibration/sbc/type3-master-assisted-candidate.js
tabs/vibration-integrity-sbc-type3-controller.js
tests/vibration-sbc-type3-master-assisted-candidate.test.mjs
tests/vibration-sbc-type3-live-integration.test.mjs
```

Bounded existing integration edits:

```text
converters/vibration/sbc/facility.js
converters/vibration/mechanisms/sbc.js
tabs/vibration-integrity-mechanisms.js
tabs/vibration-integrity-view.js
tabs/vibration-integrity-user-data-shell.js
tabs/vibration-integrity-sbc-type3-view.js
```

## Validation target

Repository-level PF-004 must prove D7 final .70, exact curve-coordinate custody, wrong-scope rejection, stale/current matrix behavior, PF-07..PF-10 live wiring semantics, and FIT-vs-SBC authority separation. Official served-app Chromium remains a separate truth claim and is not called PASS unless the exact served branch is actually exercised.