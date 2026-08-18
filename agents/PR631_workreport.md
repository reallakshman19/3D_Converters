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
PR_HEAD_AT_ALLOCATION: 755913416002658046bd05c7bb104726388128f5
REPORT_BASIS_HEAD: 59337fb0202165b014f327db2f26700c6f53d1f4
MAIN_HEAD_LAST_CHECKED: e3fa32bf3e6d919d9ed3e3e17aa32fae2beea14e
CURRENT_STAGE: VALIDATE_RECONCILE
CURRENT_BLOCKER: REPOSITORY_NATIVE_EXECUTION_UNAVAILABLE
HIGHEST_RISK: incomplete welded-discontinuity inventory can underpredict a line candidate; line screening authority remains blocked
EXACT_NEXT_ACTION: migrate status/claim, release WIP claim, reconcile exact PR head/files/checks/reviews, keep PR draft
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

The current product does not prove that all relevant welded discontinuities downstream of each AIV source to the first major vessel are represented. The required extent is therefore explicit and fail-closed: `ALL_RELEVANT_WELDED_DISCONTINUITIES_DOWNSTREAM_TO_FIRST_MAJOR_VESSEL`.

## D.2.3 Scope Correction

The controlled D.2.3 evidence contains two distinct scopes:

```text
first represented discontinuity LOF     0.29
full worked-example relief-line LOF     1.48
```

PR631 removes 1.48 as a runtime Stage-9 input. With only the represented first discontinuity, the live reducer derives a 0.29 line/case candidate and marks it non-authoritative. The frozen 1.48 remains `BENCHMARK_ORACLE_ONLY` evidence and is not changed numerically.

## Delivered Behavior

- `converters/vibration/aiv/aiv-line-aggregation.js`: pure greatest-discontinuity reducer with exact line/case grouping, deterministic tie-break, source/assessment custody, explicit qualification and inventory blocker.
- `aiv-calculator.js`: Stage 9 delegates to the reducer; configured 1.48 line-result injection removed.
- `aiv-post-discontinuity-evidence-gate.js`: distinguishes implemented/qualified reduction rule from unverified inventory and blocked line authority.
- registered `VIB.AIV.ACOUSTIC` adapter: method revision v2; assessment screening authority unchanged; line reduction qualification/inventory exposed separately.
- JSON screening export: carries rule ID, qualification, inventory state and line-authority blocker.
- EI `.eit` export: fresh derived candidate custody uses `aivLineCaseCandidate*`; imported historical configured traces remain under `aivLegacy*` only.
- AIV result UI: `Derived line candidate LOF`, controlling assessment, rule, inventory and `NON-AUTHORITATIVE` wording.
- `VIB-AIV` machine workpack: 1.48 reclassified `BENCHMARK_ORACLE_ONLY`; line-rule probe added; check count 21.
- D.2.3 product-path validator: 25 checks separating current 0.29 candidate from frozen 1.48 full-line reference.
- release/runtime/canvas/flare/EIT/workpack regressions updated to the same boundary.

## Protected Boundaries

No changes to:
- AIV T2-6 equations, coefficients, PWL/attenuation/fatigue/LOF math;
- benchmark expected numerical values or tolerances;
- assessment-level screening authority;
- generic vibration mechanism reducer;
- EI cross-mechanism main-line aggregation policy/implementation;
- PR629 assessment-scope Integrity/session bridge;
- T1 identification rules;
- design authority;
- workflow files;
- merge authority.

PR631 therefore does **not** make AIV eligible for generic EI main-line governing aggregation.

## Validation Ledger

```text
PASS  EI T2.7 greatest-discontinuity rule source grounding / SOURCE_INSPECTION
PASS  exact-source reducer node --check / reconstructed source
PASS  focused reducer execution: max/custody/nonauthority/inventory / reconstructed source
PASS  configured 1.48 runtime dependency removed / SOURCE_INSPECTION
PASS  inventory fail-closed boundary / SOURCE_INSPECTION
PASS  EIT additive field compatibility / SOURCE_INSPECTION
PASS  allocation stack reconciliation: ahead 27 / behind 0 / 22 explained files
NOT_RUN repository-native reducer and AIV release tests
NOT_RUN npm run workpack:verify -- VIB-AIV
NOT_RUN verify:aiv-screening-release / verify:aiv-canvas-release
NOT_RUN browser AIV result/export journey
```

Reconstructed execution is supporting evidence only and is not represented as repository-native PASS.

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

## Continuation

```text
PR631 is stacked on PR629 and must remain draft.
Do not retarget directly to main unless predecessor changes are landed/replayed.
Do not promote line/case authority from the qualified reduction rule alone.
Next: exact-head files/checks/reviews reconciliation, then handover.
```

# APPENDIX A — IMPLEMENTATION TAKEOVER QUALIFICATION

`NOT_REQUIRED_NEW_OWNER_DIRECTED_WORK`. A future technical takeover must re-ground PR629, PR631, live main and the T2.7 method/authority boundary before mutation.
