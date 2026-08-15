# WIP 1 — SBC Type-3 Production Freeze PF-001

## Recovery Header

```text
WORK_INTENT: IMPLEMENT / VALIDATE / HANDOVER
CRITICALITY: ENGINEERING_CRITICAL
ISSUE: #514
BRANCH: agent/sbc-pf-001-type3-combination
BASE_MAIN: 5ad2288d41e031ef23df0cb3e600763081b4ac62
GROUNDING_EPOCH: 2026-08-15T13:59Z
QUALIFICATION: QUALIFIED_FOR_SBC_TYPE3_PRODUCTION_FREEZE
TAKEOVER_AUTHORITY: WRITE_ALLOWED
MERGE_AUTHORITY: OWNER_ONLY / NOT_GRANTED
PR_RECOVERY_STATE: RECOVERABLE
CURRENT_SLICE: PF-001 Type-3 fail-closed combination seam and frozen D7 regressions
FREEZE_STATE: BLOCKED / NOT_FROZEN
```

## Owner Direction

The owner explicitly recorded `QUALIFIED_FOR_SBC_TYPE3_PRODUCTION_FREEZE` and directed implementation to start. This authorizes assignment/implementation under issue #514. It does not grant merge authority and does not convert blocked or unexecuted validation into PASS.

## Live Grounding

```text
main                  5ad2288d41e031ef23df0cb3e600763081b4ac62
PR #511               MERGED -> fbcf1b8680c3e69844cfb35675ecf15047134ba5
PR #512               MERGED -> 5ad2288d41e031ef23df0cb3e600763081b4ac62
PR #508                OPEN / DRAFT / salvage evidence only
                       head 35c024887b5b2f016daa9dfb71b94f1cecc5d1e1
AIV / #513             OUT OF SCOPE
```

Open SBC-adjacent PRs were re-checked before mutation. This slice avoids master-registry/source-pack paths and limits ownership to the Type-3 combination/user-data seam plus focused tests.

## PF-001 Hypothesis

The current Type-3 arithmetic is embedded inside the explicit user-engineering-data evaluator. A reusable master-assisted path needs one fail-closed combination seam that preserves the locked max/min equations and never converts missing terms into zero. The only allowed automatic zero is `C=0` after an explicit `first span has unsupported mass = false` decision.

### Falsifier

The hypothesis is false if a current-main reusable seam already enforces the same missing-term semantics independently of the explicit user-row resolver, or if extracting the seam changes any valid legacy result/authority behavior.

### Next experiment

1. Add an isolated Type-3 combination module with strict missing-term guards.
2. Add frozen D7 and no-mass regression vectors plus null/undefined/blank negative cases.
3. Route the current explicit-user evaluator through that seam without changing evidence or authority contracts.
4. Run the focused current-main Type-3 tests and new regressions.

## Protected Invariants

```text
firstGeometry=max(C,D,E)
firstModifier=min(firstGeometry, firstLocationLof)
subsequentGeometry=max(F,G)
subsequentModifier=min(subsequentGeometry,1)
overallModifier=max(firstModifier,subsequentModifier)
mainlineAdjusted=mainlineLof*multiplier
SBC LOF=min(mainlineAdjusted,overallModifier)

D7: C=.68 D=.20 E=.70 F=.60 G=.20 LOFLOC=1 multiplier=1.42 final=.70
curve runtime activation=false
SBC screeningAuthority=NOT_AUTHORIZED
designAuthority=false
masterDataAuthority=false
candidate cannot replace FIT screeningGoverning
missing numeric terms fail closed
C=0 only for explicit no-unsupported-mass case
```

## Pre-edit Custody

The repository backup CLI cannot be executed in this connector-only environment because there is no local authenticated repository checkout (`gh` is not installed and the sandbox cannot resolve github.com). Per the approved fallback rule, immutable Git custody is recorded before every existing-file edit.

```text
path: converters/vibration/sbc/type3-user-data.js
base commit: 5ad2288d41e031ef23df0cb3e600763081b4ac62
pre-edit blob: 69215382db2fabaae8356370ca5760def19d4cba
backup CLI: NOT_RUN / ENVIRONMENT_BLOCKED
fallback: immutable Git blob + exact base commit recorded before edit
```

New files require no pre-edit backup because no prior blob exists.

## Browser BEFORE Status

The unchanged merged production-freeze runner requires a fully served repository plus Playwright. This sandbox has Chromium but no Playwright package, no resolvable GitHub/CDN network, and direct headless Chromium did not reach a rendered diagnostic DOM. No browser policy, test, tolerance, or expected value was changed to bypass the block.

```text
official URL-based BEFORE: NOT_RUN / ENVIRONMENT_BLOCKED
bounded local Chromium attempt: NOT_RUN / ENVIRONMENT_BLOCKED
freeze state: BLOCKED / NOT_FROZEN
```

Implementation may proceed on this isolated draft branch under the owner's explicit start-coding direction, but browser evidence remains an open blocking item for production-freeze closure and merge readiness.

## Source / Oracle Custody

```text
guidance repo: reallaksh19/Common
guidance commit: fb549185b9b27edc2379734240320a85c5bef9f6
PDF: EI - AVIFF Guidelines 2nd Edition.pdf
PDF blob: 9d3eccc56429411e17c07a579bdebbd13cb0bdc5
curve state: BLOCKED_SOURCE_DATA_CONFLICT
runtimeCurveActivation: false
```

D/F/G remain exact-coordinate project/user evidence only. This slice does not reconstruct, interpolate, extrapolate, tune, publish, or activate T3-1..T3-4.

## Validation Ledger

| Check | Status | Oracle / observation |
|---|---|---|
| live repository grounding | PASS | main/#511/#512/#508 checked before branch creation |
| qualification | PASS | owner token recorded on issue #514 |
| pre-edit blob custody | PASS_FALLBACK | `type3-user-data.js` blob `69215382...` |
| official Chromium BEFORE | NOT_RUN / ENVIRONMENT_BLOCKED | no served checkout / Playwright; no false PASS |
| PF-001 Node regressions | NOT_RUN | pending implementation |
| legacy Type-3 regressions | NOT_RUN | pending implementation |
| D7 frozen oracle | NOT_RUN | pending implementation |

## Handover Boundary

Do not merge. Do not touch master registry/source-pack infrastructure, AIV, or redesign the merged #511/#512 shared product contract in this slice. If the Type-3 seam cannot be extracted without changing authority, source custody, or benchmark meaning, stop and set takeover/read-only state rather than widening scope.
