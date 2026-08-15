# PR520 Workreport — SBC Type-3 Production Freeze PF-001

## Recovery Header

```text
WORK_INTENT: IMPLEMENT / VALIDATE / HANDOVER
CRITICALITY: ENGINEERING_CRITICAL
ISSUE: #514
PR: #520
BRANCH: agent/sbc-pf-001-type3-combination
BASE_MAIN: 5ad2288d41e031ef23df0cb3e600763081b4ac62
GROUNDING_EPOCH: 2026-08-15T13:59Z
LATEST_MAIN_RECHECK: 5ad2288d41e031ef23df0cb3e600763081b4ac62
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

Open SBC-adjacent PRs were re-checked before mutation. This slice avoids master-registry/source-pack paths and limits ownership to the Type-3 combination/user-data seam plus focused tests. `main` was re-checked again before PR allocation and remained unchanged at the exact base SHA.

## PF-001 Hypothesis

The current Type-3 arithmetic is embedded inside the explicit user-engineering-data evaluator. A reusable master-assisted path needs one fail-closed combination seam that preserves the locked max/min equations and never converts missing terms into zero. The only allowed automatic zero is `C=0` after an explicit `first span has unsupported mass = false` decision.

### Result

SUPPORTED. The combination seam was extracted without changing valid legacy output, evidence, method ID or authority. The exact D7 chain remains `0.70`; the no-mass regression remains `0.284`; null/undefined/blank required numeric terms now fail closed at the reusable seam.

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

## Implemented Slice

```text
NEW  converters/vibration/sbc/type3-combination.js
     reusable fail-closed Type-3 max/min combination seam

NEW  tests/vibration-sbc-type3-combination-guard.test.mjs
     D7=.70, no-mass=.284, null/undefined/blank guards,
     missing mass-state guard, negative/non-finite guards

EDIT converters/vibration/sbc/type3-user-data.js
     route current explicit-user workflow through the shared seam
     while preserving method/evidence/authority contracts
```

No master registry, source-pack, curve runtime, facility, UI, AIV, #511 release-runner, or #512 shared workflow/activity path changed in PF-001.

## Pre-edit Custody

The repository backup CLI could not be executed in this connector-only environment because there is no local authenticated repository checkout (`gh` is not installed and the sandbox cannot resolve github.com). Per the approved fallback rule, immutable Git custody was recorded before the existing-file edit.

```text
path: converters/vibration/sbc/type3-user-data.js
base commit: 5ad2288d41e031ef23df0cb3e600763081b4ac62
pre-edit blob: 69215382db2fabaae8356370ca5760def19d4cba
backup CLI: NOT_RUN / ENVIRONMENT_BLOCKED
fallback: immutable Git blob + exact base commit recorded before edit
```

New files required no pre-edit backup because no prior blob existed.

## Browser BEFORE / AFTER Status

The unchanged merged production-freeze runner requires a fully served repository plus Playwright. This sandbox has Chromium but no Playwright package, no resolvable GitHub/CDN network, and direct headless Chromium did not reach a rendered diagnostic DOM. No browser policy, test, tolerance, or expected value was changed to bypass the block.

```text
official URL-based BEFORE: NOT_RUN / ENVIRONMENT_BLOCKED
bounded local Chromium attempt: NOT_RUN / ENVIRONMENT_BLOCKED
official URL-based AFTER: NOT_RUN / ENVIRONMENT_BLOCKED
freeze state: BLOCKED / NOT_FROZEN
```

Implementation proceeded only on this isolated draft branch under the owner's explicit start-coding direction. Browser BEFORE/AFTER evidence remains an open blocking item for production-freeze closure and merge readiness.

## Hosted CI Truth

The production-freeze workflow was automatically requested for exact PR head `665c4e48ef5cd5714cc32bdaf6d55a172b5bc5bf`:

```text
workflow run: 31889267284
job: 95023000289
name: node-and-chromium
steps: []
runner_id: 0
GitHub conclusion: failure
annotation: The job was not started because an Actions budget is preventing further use.
classification: NOT_RUN / INFRASTRUCTURE_BLOCKED
```

No product or test step executed in that hosted run. The GitHub `failure` conclusion is therefore retained as an infrastructure-blocked `NOT_RUN`; it is not relabeled PASS and is not interpreted as an SBC product-test failure.

## Source / Oracle Custody

```text
guidance repo: reallaksh19/Common
guidance commit: fb549185b9b27edc2379734240320a85c5bef9f6
PDF: EI - AVIFF Guidelines 2nd Edition.pdf
PDF blob: 9d3eccc56429411e17c07a579bdebbd13cb0bdc5
curve state: BLOCKED_SOURCE_DATA_CONFLICT
runtimeCurveActivation: false
```

D/F/G remain exact-coordinate project/user evidence only. This slice did not reconstruct, interpolate, extrapolate, tune, publish, or activate T3-1..T3-4.

## Validation Ledger

| Check | Status | Oracle / observation |
|---|---|---|
| live repository grounding | PASS | main/#511/#512/#508 checked before branch creation and rechecked before handover |
| qualification | PASS | owner token recorded on issue #514 |
| pre-edit blob custody | PASS_FALLBACK | `type3-user-data.js` blob `69215382db2fabaae8356370ca5760def19d4cba` |
| isolated combination regressions | PASS 30/30 | D7/no-mass/missing/invalid-term matrix |
| integration replay with current Type-3 user-data regressions | PASS 37/37 | new guard suite + existing current-main Type-3 user-data tests |
| D7 frozen oracle | PASS | expected `.70`, observed `.70` |
| no-mass regression | PASS | expected `.284`, observed `.284` |
| legacy authority/evidence shape | PASS | existing user-data regression unchanged |
| official Chromium BEFORE | NOT_RUN / ENVIRONMENT_BLOCKED | no served checkout / Playwright; no false PASS |
| official Chromium AFTER | NOT_RUN / ENVIRONMENT_BLOCKED | same infrastructure block; no false PASS |
| hosted production-freeze workflow | NOT_RUN / INFRASTRUCTURE_BLOCKED | run `31889267284`, job `95023000289`, zero steps, runner_id=0, Actions budget annotation |

## Handover Boundary

PR #520 is code-complete for PF-001's bounded hypothesis but is **not production-frozen and not merge-ready** because official browser evidence is still unavailable. Do not merge. Do not widen this PR into master-assisted derivation, facility caching, UI redesign, master registry/source-pack work, AIV, or shared #511/#512 architecture changes. Those belong to later focused #514 slices after this seam is accepted.
