# PR522 Workreport — SBC Type-3 Production Freeze PF-003

## Recovery Header

```text
WORK_INTENT: IMPLEMENT / VALIDATE / HANDOVER
CRITICALITY: ENGINEERING_CRITICAL
ISSUE: #514
PR: #522
BRANCH: agent/sbc-pf-003-candidate-currentness
BASE_MAIN: e97effb06ff9bfcad5ea87381abaa9f2665c1bdd
GROUNDING_EPOCH: 2026-08-15T14:59Z
QUALIFICATION: QUALIFIED_FOR_SBC_TYPE3_PRODUCTION_FREEZE
OWNER_PROGRESSION: ok, proceed next phase
OWNER_PROGRESSION_COMMENT: #514 comment 5302780129
TAKEOVER_AUTHORITY: WRITE_ALLOWED
MERGE_AUTHORITY: OWNER_ONLY / NOT_GRANTED
PR_RECOVERY_STATE: RECOVERABLE
CURRENT_SLICE: PF-003 per-scope candidate currentness + stale-async commit protection
FREEZE_STATE: BLOCKED / NOT_FROZEN
```

## Progression Boundary

PF-001 / PR #520 and PF-002 / PR #521 remain OPEN / DRAFT / BLOCKED / NOT_FROZEN with browser evidence still NOT_RUN. The Owner progression direction authorizes this next isolated slice; it does not convert those prior slices to PASS/FROZEN and does not grant merge authority.

PF-003 is independent of both unmerged SBC branches. It imports no PF-001/PF-002 code and contains no Type-3 calculation arithmetic, master-assisted derivation, final LOF, facility-matrix integration, curve publication/activation, shared workflow/UI mutation, or AIV work.

## Live Grounding / Coordination

```text
main                  e97effb06ff9bfcad5ea87381abaa9f2665c1bdd
main advance          731655e2... -> e97effb0... via merged AIV PF-01 #519
advance overlap       NONE with PF-003 SBC paths
PR #520 / PF-001      OPEN / DRAFT / BLOCKED / NOT_FROZEN
PR #521 / PF-002      OPEN / DRAFT / BLOCKED / NOT_FROZEN
PR #508               OPEN / DRAFT / salvage evidence only
competing SBC PF-003  none found
AIV / #513            OUT OF SCOPE
```

The current merged Mechanical controller was inspected as a repository-local state-safety precedent. It uses per-scope pending tokens and discards completion when the current token no longer matches.

Old #508 `tabs/vibration-integrity-sbc-master-assisted-controller.js` was reclassified `REIMPLEMENT_FROM_CONCEPT`: its `evaluateMasterAssisted()` writes `sbcType3Result` and `sbcFacilityCandidateResults[scopeId]` after `await` without an engineering-revision/current-operation guard. That stale-commit behavior is specifically not salvaged.

## PF-003 Hypothesis / Result

### Hypothesis

Current production has exact SBC facility scope identity but no reusable SBC Type-3 currentness contract that independently proves PF-07 through PF-10 before later product integration.

### Result

SUPPORTED for the bounded pure-state seam. PF-003 now provides deterministic per-scope engineering revisions and operation tokens, synchronous invalidation, exact-scope consumption guards, and stale async rejection without touching calculation or shared product contracts.

## Implemented Slice

```text
NEW tabs/vibration-integrity-sbc-candidate-currentness.js
    SbcType3CandidateCurrentnessStore.v1
    exact per-scope engineering revision
    PHYSICAL_INPUT and MANUAL_CURVE_EVIDENCE engineering-change classes
    synchronous CURRENT -> STALE invalidation
    deterministic evaluation sequence/token
    exact pending-token + engineering-revision commit guard
    wrong embedded candidate scope rejection
    stale failure protection
    current candidate inspection/read guard
    presentation/navigation no-op for engineering state
    deep immutable JSON-safe candidate snapshot

NEW tests/vibration-sbc-type3-candidate-currentness.test.mjs
    PF-07 through PF-10 plus isolation/supersession/presentation/immutability regressions
```

Production module size: 222 physical lines, below the repository 300-line limit.

No existing production/test file was edited; therefore no production pre-edit backup was required for this slice.

WIP pre-delete custody:

```text
path: agents/WIP_3_handoff.md
blob: 9a387f346cc205221e12867265d4d508ab6ec610
```

## Currentness Contract

```text
engineering edit on scope S
  -> S.engineeringRevision += 1
  -> existing S candidate becomes STALE immediately
  -> S pending evaluation is cleared
  -> other scopes unchanged

begin evaluation on S
  -> bind operation {scopeId, engineeringRevision, sequence, token}
  -> latest operation replaces older pending operation for S

completion on S
  -> accept only when current pending token equals operation token
  -> accept only when current engineeringRevision equals operation revision
  -> require candidate.result.scopeId == S
  -> otherwise reject without mutating newer state

presentation/navigation change
  -> return exact existing store
  -> no revision increment
  -> no candidate invalidation
```

Deterministic token shape:

```text
SBC-T3-EVAL/<encoded scopeId>/<engineeringRevision>/<sequence>
```

No clock or random input is used.

## Frozen Regression Mapping

```text
SBC-PF-07  wrong facility-scope cached result rejected
SBC-PF-08  physical-input edit invalidates prior SBC candidate
SBC-PF-09  D/F/G evidence edit invalidates prior SBC candidate
SBC-PF-10  async stale result cannot overwrite newer input
```

Additional regression coverage:

- A/B facility currentness isolation;
- same-revision later evaluation supersedes earlier one;
- stale failed operation cannot clear newer pending operation;
- presentation/navigation changes are engineering-state neutral;
- deterministic operation tokens;
- deeply immutable candidate snapshot, detached from caller mutation.

## Exact Payload Custody / Validation

Exact GitHub blobs match the locally executed bytes via `git hash-object`:

```text
tabs/vibration-integrity-sbc-candidate-currentness.js
e7dcd31cab2cc8e33c07c0769d61541833712c7a

tests/vibration-sbc-type3-candidate-currentness.test.mjs
40e870aef5d702301df1005d016b6cd6d8af3181
```

Local execution environment:

```text
node: v22.16.0
native authenticated checkout: unavailable
browser: NOT_RUN
```

Validation ledger:

| Check | STATUS | Observation / oracle |
|---|---|---|
| current-main grounding | PASS | branch based on exact `e97effb0...` |
| GitHub/local blob identity | PASS | both production/test blobs equal locally executed bytes |
| JS syntax | PASS | module + test parse |
| PF-003 focused Node suite | PASS 11/11 | exact payload |
| PF-07 exact/wrong scope | PASS | B cannot consume A; wrong embedded scope cannot commit |
| PF-08 physical edit invalidation | PASS | CURRENT -> STALE synchronously; revision increments |
| PF-09 D/F/G edit invalidation | PASS | CURRENT -> STALE synchronously; curve evidence reason retained |
| PF-10 stale async completion | PASS | stale operation rejected; newer pending/current state preserved |
| same-revision supersession | PASS | older token rejected, latest token commits |
| A/B isolation | PASS | A edit does not invalidate B |
| presentation neutrality | PASS | same immutable store/current candidate retained |
| stale failure completion | PASS | old failure cannot clear newer pending evaluation |
| deterministic token | PASS | exact `SBC-T3-EVAL/FACILITY-A/1/1` in deterministic fixture |
| immutable snapshot | PASS | caller mutation cannot mutate cached result |
| official served-app Chromium | NOT_RUN | pure state seam not wired into product UI in this slice |
| product freeze | NOT_FROZEN | later integration/browser evidence required |
| hosted CI | PENDING | inspect exact final PR head after workreport transition |

## Authority / Safety Boundary

PF-003 creates no engineering calculation output and no Screening authority. It cannot promote SBC into `screeningGoverning`; later integration must continue to enforce #514's candidate-only authority boundary.

This slice also does not resolve missing D/F/G, calculate D7, alter the curve quarantine, or change any expected engineering value/tolerance.

## Browser / Production-Freeze Status

The currentness state seam is not yet connected to the live SBC workflow, so a live A/B/edit/async Chromium acceptance is not possible on this PR alone.

```text
official served-app Chromium: NOT_RUN
reason: UNWIRED_PURE_STATE_SEAM
freeze state: BLOCKED / NOT_FROZEN
```

A later focused integration slice must bind real physical/manual-curve edits and candidate evaluation to this contract, then execute the exact #514 two-facility Chromium experiment.

## Handover Boundary

PR #522 is code-complete for PF-003's bounded currentness contract but is not production-frozen and not merge-authorized.

Do not widen #522 into:

- Type-3 arithmetic/final LOF or #520 code;
- master-assisted physical derivation or #521 code;
- SBC facility matrix consumption;
- live controller/UI integration;
- shared #511/#512 workflow/activity redesign;
- curve publication/activation;
- AIV or other mechanism work.

`EXACT_NEXT_ACTION` after this PR remains draft: reconcile the accepted SBC calculation/derivation slices, then wire the currentness contract into a separate live-product SBC integration slice with real Chromium A/B/edit/async evidence.
