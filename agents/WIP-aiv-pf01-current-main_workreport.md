# WIP-aiv-pf01-current-main — AIV PF-01 current-main recovery

## Recovery Header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
WORK_INTENT: IMPLEMENT
REPOSITORY_STATE: NEW_PR_REQUIRED
MUTATION_AUTHORITY: WRITE_ALLOWED
CRITICALITY: ENGINEERING_CRITICAL
TAKEOVER_AUTHORITY: WRITE_ALLOWED
EXECUTION_MODE: MANUAL
MERGE_AUTHORITY: OWNER_ONLY

REPOSITORY: reallaksh19/3D_Converters
BRANCH: agent/aiv-pf01-current-main-fix-20260815
MAIN_HEAD_AT_FREEZE: 5ad2288d41e031ef23df0cb3e600763081b4ac62
GROUNDING_EPOCH: GE-PF01-CURRENT-MAIN-20260815-1804+04
CURRENT_STAGE: BASELINE
CURRENT_BLOCKER: none for source implementation; exact post-fix full-application Chromium still requires a served exact branch build
HIGHEST_RISK: confusing the already-proven PR515 candidate with current production; current main still contains the crash
EXACT_NEXT_ACTION: apply the minimal current-main PF-01 fix, focused regressions, cache-token bump and canvas-only error containment; then validate against the frozen EI D.2.3 golden path without changing engineering oracles.
```

## Handover in 60 Seconds

Owner reported the live AIV product still throws:

```text
TypeError: Cannot read properties of null (reading 'caseId')
createAivCanvasFilterState -> canvas filter first sync
```

The live stack loads `vibration-aiv-qualification-tab.js?v=aiv-qualification-1`.

Current `main@5ad2288d...` independently confirms:

- `tabs/vibration-aiv-canvas-filter.js` blob `a5da4fb99e69310659659725696c61c3d9347085` still reads `input.caseId` with no explicit-null normalization;
- `tabs/engineering-calculations-tab.js` blob `5d638f86197e5175faf14f7cace8cf92bf97537d` still imports `vibration-aiv-qualification-tab.js?v=aiv-qualification-1`;
- `tabs/vibration-aiv-qualification-tab.js` blob `9cd1d8f9745fd429ba82c5c4f78cc5a9cf145962` lets `canvasController.sync()` throw through `render()`.

PR #515 contains a previously proven candidate fix but is stale against advanced main. This WIP supersedes its implementation from current production rather than rebasing or replaying its evidence batch.

## Source task and qualification

Source Work Pack: issue #513.

Owner qualification gate is satisfied by issue comment `5301819610`:

```text
QUALIFIED_FOR_AIV_PRODUCTION_FREEZE
```

The five repository-specific qualification answers are retained on #513. No new architectural decision is opened in this WIP.

## Coordination

Live open AIV recovery PRs at grounding:

```text
#515 PF-01 stale implementation/evidence        exact-file overlap; to be superseded
#517 PF-02 readiness/executable parity          separate authority slice; do not touch
#518 PF-03 simultaneous-source semantics        separate authority slice; do not touch
#506 broad AIV hardening salvage/evidence       do not replay wholesale
```

Classification: `COORDINATION_REQUIRED` because #515 still claims the PF-01 files. Resolution: this current-main branch will supersede #515 explicitly; no PF-02/PF-03 production files or semantics are in scope.

`agents/MASTER_INDEX.md` and `agents/status/` do not exist on current main; no invented coordination registry will be added in this narrow slice.

## Mission

Fix the currently reproduced PF-01 production defect on exact current main using the owner-locked loop:

```text
LIVE ERROR -> MINIMAL FIX -> EI D.2.3 GOLDEN EXAMPLE -> PROFESSIONAL TOUCHED UI -> EVIDENCE -> HANDOFF
```

### In scope

1. explicit-null normalization in AIV canvas filter state;
2. change-before-first-sync null safety;
3. contain canvas presentation exceptions so they cannot masquerade as AIV engineering failure;
4. advance AIV dynamic-import cache token away from the observed failing URL;
5. focused regression wired into the existing AIV canvas release path;
6. use existing controlled EI D.2.3 registered/canvas test as the primary engineering golden oracle;
7. one concise current-main validation receipt.

### Out of scope

- AIV equations, coefficients, tolerances or oracle changes;
- readiness/calculator executable-contract semantics (PF-02 / #517);
- simultaneous-source-group semantics (PF-03 / #518);
- async transaction/master/export changes;
- master engineering qualification;
- broad UI redesign;
- workflow files;
- merge.

## Authority / invariants

```text
TABLES = engineering source of truth
SVG/pixels = presentation only; never physical-distance authority
screeningResultScope = ASSESSMENT
line/case summary authoritativeForScreening = false
designAuthority = false
frozen EI D.2.3 expected values/tolerances = immutable
```

## Primary golden benchmark

Existing repository test `tests/vibration-aiv-canvas-integration.test.mjs` already freezes the D.2.3 registered production path:

```text
relief raw source PWL   164.6851759525391 dB
relief point PWL        164.3734876408508 dB
Assessment LOF          0.29
line/case LOF           1.48, explicitly non-authoritative
single API == batch API == canvas projection
```

This is corroborated by pinned owner-supplied EI transcription:

```text
reallaksh19/Advanced_Analysis
commit 04328852dced9f5c4827da8afe8a82aeb8b1a1d3
docs/EI data/EI_AVIFF_Guidelines_2nd_Edition_Examples.md
blob c050cd90802c27241c510c6f0ac43bfaf7a89e9d
D.2.3 High Frequency Acoustic Excitation
```

Published rounded values include relief source PWL 164.7 dB, 0.8 m to the first weldolet, discontinuity PWL about 164.4 dB and final LOF 0.29.

## Backup / rollback custody

Repository policy requires `node utils/backup.js save` before editing existing files. This connector-only execution environment has no native private checkout, so the backup CLI is `NOT_RUN / ENVIRONMENT_BLOCKED`.

Rollback custody is exact immutable Git blobs on current main:

```text
tabs/vibration-aiv-canvas-filter.js          a5da4fb99e69310659659725696c61c3d9347085
tabs/vibration-aiv-qualification-tab.js      9cd1d8f9745fd429ba82c5c4f78cc5a9cf145962
tabs/engineering-calculations-tab.js         5d638f86197e5175faf14f7cace8cf92bf97537d
package.json                                 ef583d8da73d23df5463a4dfdb2da2d19006886f
tests/vibration-aiv-canvas-hardening.test.mjs 634a81c928f25fc0036c532aac55fa52458122e0
```

This limitation must not be represented as backup PASS.

## Validation ledger

| Check | Status | Observation | Oracle |
|---|---|---|---|
| owner live pre-fix product reproduction | PASS | USER_SUPPLIED exact stack on current production | NONE |
| current-main source reproduces null boundary | PASS | SOURCE_INSPECTION | NONE |
| current-main old module token confirmed | PASS | SOURCE_INSPECTION | NONE |
| issue #513 qualification | PASS | OWNER_RECORDED | NONE |
| post-fix focused runtime regression | NOT_RUN | pending implementation | IMPLEMENTATION_COUPLED |
| EI D.2.3 registered/canvas golden test | NOT_RUN | pending exact branch execution | AUTHORITATIVE_REFERENCE + existing independent qualification |
| full post-fix application Chromium | NOT_RUN | requires exact served branch | AUTHORITATIVE_REFERENCE |
| full `verify:aiv-canvas-release` | NOT_RUN | no native checkout | mixed |

## Active items

- `ISS-PF01-001` — explicit `null` crashes `createAivCanvasFilterState` on current main.
- `ISS-PF01-002` — canvas-only exception currently propagates as an engineering action failure.
- `IMP-PF01-001` — normalize explicit-null state and pre-sync change path.
- `IMP-PF01-002` — local degraded-canvas containment.
- `IMP-PF01-003` — cache-distinct AIV workspace import token.
- `RISK-PF01-001` — do not import PF-02/PF-03 logic from PR #506/#515.
- `DEC-PF01-001` — EI D.2.3 is the primary end-to-end engineering golden case for this slice; small software regressions remain supporting safety nets.
