# PR631 — AIV line/case reduction qualification

# CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED_FOR_OWNER_DIRECTED_ASSIGNMENT
EXECUTION_MODE: MANUAL
MERGE_AUTHORITY: OWNER_ONLY
REPOSITORY: reallaksh19/3D_Converters
PR_OR_WIP: PR631
BRANCH: agent/vibration-aiv-line-aggregation-qualification-20260818
STACK_BASE_PR: 629
STACK_BASE_BRANCH: agent/vibration-aiv-assessment-integration-20260818
STACK_BASE_HEAD: cb7827f0183052ec3e2afca1a43e41935ab19cbd
PR_HEAD_LAST_RECONCILED: 9ffa8917b3611083bc81fa5a0473a08c56082929
IMPLEMENTATION_BASIS_HEAD: 59337fb0202165b014f327db2f26700c6f53d1f4
MAIN_HEAD_LAST_CHECKED: e3fa32bf3e6d919d9ed3e3e17aa32fae2beea14e
CURRENT_STAGE: HANDOVER_READY
CURRENT_BLOCKER: REPOSITORY_NATIVE_EXECUTION_UNAVAILABLE
HIGHEST_RISK: incomplete welded-discontinuity inventory can underpredict a line candidate; line screening authority remains blocked
EXACT_NEXT_ACTION: keep PR631 draft; run repository-native/workpack/browser validation when available or continue with the separate inventory-completeness slice
```

## Engineering State

PR631 qualifies the AIV Stage-9 **reduction rule** while deliberately withholding line/case screening authority.

```text
assessment screening result             AUTHORIZED / ASSESSMENT scope
Stage-9 rule                            EI_AVIFF_T2_7_GREATEST_DISCONTINUITY_LOCATION_LOF
reduction rule qualification            QUALIFIED_FOR_DERIVATION
line/case candidate                     greatest current assessment LOF for exact line+case
controlling assessment/source custody   deterministic
assessment inventory completeness       UNVERIFIED
line/case authoritativeForScreening     false
line/case screeningAuthority            NOT_AUTHORIZED
designAuthority                         false
```

The current product does not prove that all relevant welded discontinuities downstream of each AIV source to the first major vessel are represented. Required extent remains fail-closed: `ALL_RELEVANT_WELDED_DISCONTINUITIES_DOWNSTREAM_TO_FIRST_MAJOR_VESSEL`.

## D.2.3 Scope Correction

```text
first represented discontinuity LOF     0.29
current derived line candidate          0.29
full worked-example relief-line LOF     1.48 / BENCHMARK_ORACLE_ONLY
```

The frozen 1.48 value is unchanged numerically but is no longer injected as runtime Stage-9 line truth.

## Delivered Behavior

- pure greatest-discontinuity reducer with exact line/case grouping and deterministic custody;
- Stage 9 delegates to calculated assessment results rather than configured 1.48;
- post-discontinuity gate separates rule qualification from inventory completeness/authority;
- registered adapter remains assessment-screening authorized and reports line-rule qualification separately;
- JSON export records rule, inventory and line-authority blocker;
- fresh EI `.eit` output uses `aivLineCaseCandidate*`; imported historical configured traces remain `aivLegacy*` only;
- UI shows `Derived line candidate LOF`, controlling assessment, rule, inventory and `NON-AUTHORITATIVE`;
- machine workpack classifies 1.48 `BENCHMARK_ORACLE_ONLY`, adds line-rule probe/check #21, and advances method revision to v2;
- D.2.3 product-path validator now separates the 0.29 current candidate from the frozen 1.48 line reference;
- release/runtime/canvas/flare/EIT/workpack regressions updated to the same boundary.

## Protected Boundaries

No AIV T2-6 equation/coefficient/PWL/attenuation/fatigue/LOF math changes. No benchmark expected numerical values/tolerances changed. Assessment-level screening authority is unchanged. Generic vibration mechanism reducer and EI cross-mechanism main-line aggregation are untouched. PR629's assessment Integrity/session bridge is untouched. No T1 rules, design authority, workflow files, or merge authority are changed.

PR631 therefore does **not** make AIV eligible for generic EI main-line governing aggregation.

## Validation Ledger

```text
PASS  EI T2.7 greatest-discontinuity rule grounding / SOURCE_INSPECTION
PASS  exact-source reducer node --check / reconstructed source
PASS  focused reducer execution: max/custody/nonauthority/inventory / reconstructed source
PASS  configured 1.48 runtime dependency removed / SOURCE_INSPECTION
PASS  inventory fail-closed boundary / SOURCE_INSPECTION
PASS  EIT additive-field compatibility / SOURCE_INSPECTION
PASS  exact stacked reconciliation at 9ffa8917: 25/25 files explained; ahead 32 / behind 0
NOT_RUN repository-native reducer and AIV release tests
NOT_RUN npm run workpack:verify -- VIB-AIV
NOT_RUN verify:aiv-screening-release / verify:aiv-canvas-release
NOT_RUN browser AIV result/export journey
NOT_RUN current-head hosted CI: 0 combined statuses returned
NOT_RUN current-head PR workflows: 0 runs returned
PASS  review-thread observation: 0 threads at reconciliation
```

Reconstructed execution is supporting evidence only and is not represented as repository-native PASS. Absence of hosted CI is NOT_RUN, not PASS.

## Rollback / Backup Evidence

Native `node utils/backup.js save ...` is `NOT_RUN / ENVIRONMENT_BLOCKED`. Immutable pre-edit stack-base blobs:

```text
converters/vibration/aiv/aiv-calculator.js                         08f1664f1be6a104fe421655e96a46ca66c6a80c
converters/vibration/aiv/aiv-post-discontinuity-evidence-gate.js   e28d60f8a26fcc7495a55111e759265b0bd2fc0f
converters/vibration/aiv/aiv-screening-export.js                   6e99532956771675e09cf734470708fa73708fc0
converters/vibration/aiv/aiv-eit-document.js                       ac29617a3c716483c9ec8e163cec2eba85c24926
converters/engineering-calculations/adapters/vibration-aiv.js      81b6774dc24456ac5c89d983a26593ee34d20ba5
tabs/vibration-aiv-result-view.js                                  b32b5e91e35d84c07172f8c835b782fcf4356856
engineering/workpacks/VIB-AIV.json                                 3fe07f7dbb19ed2af019dd529d45800042cdf35e
engineering/workpacks/probes/vib-aiv.mjs                           5dbe28e46f13963cedd13fca864a5d57c0ae9469
scripts/run-aiv-d23-product-path-validation.mjs                    c42f69d83fb80f880ef80d75c098b88ddca79b5e
tests/vibration-aiv-auto-product-path.test.mjs                     c091dff652ba8fb445a7a97d87f3d0113a9a183e
tests/vibration-aiv-eit-export.test.mjs                            7811914bdf2ea226ea75f4ced4db2576c59afb9b
tests/vibration-aiv-workpack-drift.test.mjs                        c6acf903feb09689059c6510d2fb2647d6c235b6
tests/vibration-aiv-screening-release.test.mjs                     4dfc678e21b59e0cd4265cb5523a6a52b8a585dd
tests/vibration-aiv-flare-network.test.mjs                         7378b38bdab405307fac17b0043d6f31b898c32c
tests/vibration-aiv-canvas-integration.test.mjs                    36d983018d6e7ef3fc7cd7bda60bdab5bfe3097d
tests/vibration-aiv-screening-runtime-bridge.test.mjs              69c89f45755283a99c575d45ba72b34d4c8507c6
tests/vibration-aiv-post-discontinuity-evidence-gate.test.mjs      1e5fb7bf72121fdbb6717e90114475ae51548818
```

These are rollback evidence, not backup-command PASS. New reducer/test files have no pre-edit blob.

## Residual Engineering Debt

- exact controlled source-registry binding for AIV T2.7 remains `RECONCILIATION_REQUIRED`;
- welded-discontinuity inventory completeness must be implemented/proven before any line/case screening-authority promotion;
- generic AIV mechanism-line / EI-mainline contribution remains intentionally blocked;
- pre-existing module-boundary source assertion drift from PR629 remains out of scope.

## Repository Coordination / Closure State

```text
PR631 base: PR629 branch at cb7827f0183052ec3e2afca1a43e41935ab19cbd
stack drift at reconciliation: behind 0
changed files at reconciliation: 25 / 25 explained
engineering + test files: 19
recovery metadata files: 6
WIP claim/status: RELEASED / MIGRATED_TO_PR631
PR631 claim/status: ACTIVE / HEALTHY
main last checked: e3fa32bf3e6d919d9ed3e3e17aa32fae2beea14e via unrelated PR630
merge authority: NOT_GRANTED
```

## Continuation

Keep PR631 draft. Do not retarget directly to main unless predecessor changes are landed/replayed. Do not promote line/case authority from the qualified reduction rule alone. The next engineering prerequisite for authority is explicit welded-discontinuity inventory completeness evidence, not another numerical reducer change.

# APPENDIX A — IMPLEMENTATION TAKEOVER QUALIFICATION

`NOT_REQUIRED_NEW_OWNER_DIRECTED_WORK`. A future technical takeover must re-ground PR629, PR631, live main and the T2.7 method/authority boundary before mutation.
