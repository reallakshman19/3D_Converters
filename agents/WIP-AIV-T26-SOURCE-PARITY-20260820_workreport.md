# WIP AIV T2.6 source parity — recovery report

# CURRENT RECOVERY STATE — READ FIRST

## Recovery header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HANDOVER_PENDING_QUALIFICATION
TAKEOVER_AUTHORITY: READ_ONLY_PENDING_3_QUESTION_QUALIFICATION
WIP: WIP-AIV-T26-SOURCE-PARITY-20260820
BRANCH: agent/aiv-t26-source-parity-20260820
BASE_MAIN: a2dc24c27c791355044ae64939647a7c78804aca
IMPLEMENTATION_HEAD_BEFORE_HANDOVER: e558e6cb1154e1faf27c3d87546a4d669e5e93b2
AHEAD_BEHIND_AT_HANDOVER: 20 / 0
CHANGED_PATHS_AT_HANDOVER: 14
WORK_INTENT: IMPLEMENT
CRITICALITY: ENGINEERING_CRITICAL
MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED
CURRENT_STAGE: HANDOVER_QUALIFICATION_GATE
EXACT_NEXT_ACTION: answer and grade Q1-Q3 below; no further numerical implementation until all three are accepted
```

## Handover in 60 seconds

Mission: replace AIV Stage-8 `CONFIGURED_D23_INTERMEDIATES` with a source-calculated EI T2.6 evaluator using actual assessment geometry/material/connection inputs, while preserving assessment-only screening scope and `designAuthority=false`.

Source authority is merged in `reallaksh19/Advanced_Analysis` PR #1289 as `ca53d589b79fc34f5a5616c0ce7de00e06c13df4`.

Current implementation already exists on this WIP branch:

- new pure `aiv-t26.js` with source-calculated `a/s/B`, errata `log10(N)`, FLM1 branches, Weldolet FLM2, Duplex FLM3, Lf clamp and LOF mapping;
- new screening-profile validator that does not require benchmark A/S/B or FLM1 configuration;
- `aiv-calculator.js` Stage 8 now calls the T2.6 evaluator and keeps published FLM1 only as benchmark comparison evidence;
- `aiv-readiness.js` now checks the same T2.6 assessment envelope before `READY_FOR_QUALIFICATION`;
- adapter method revision advanced to the source-calculated Stage-8 revision;
- `VIB-AIV.json` and its probe were updated so machine truth no longer describes configured D.2.3 A/S/B as runtime authority;
- D.2.3 product-path validation and focused tests were updated for the source-calculated chain.

Do **not** continue numerical edits until the three human qualification questions below are answered and accepted.

## Governing source pins

```text
Advanced_Analysis merge        ca53d589b79fc34f5a5616c0ce7de00e06c13df4
T2-6_flowchart.yaml blob       176d98565f582983c78868aa6210848a16f75881
T2-7 source register blob      968e48e679e8a50e7a1247a24cfd7adfc63ca37c
EI guidance PDF blob           9d3eccc56429411e17c07a579bdebbd13cb0bdc5
```

Source status is qualification evidence, not automatic production release authority. Exact pinned-PDF visual parity and Product Freeze remain separate gates.

## Current changed-file ledger

Product / machine truth:

- `converters/vibration/aiv/aiv-t26.js` — new source-calculated T2.6 evaluator
- `converters/vibration/aiv/aiv-screening-profile.js` — new screening-only profile validation
- `converters/vibration/aiv/aiv-calculator.js` — Stage-8 integration
- `converters/vibration/aiv/aiv-readiness.js` — T2.6 readiness parity
- `converters/engineering-calculations/adapters/vibration-aiv.js` — method revision / screening profile validation
- `engineering/workpacks/VIB-AIV.json` — machine custody updated from configured to source-calculated Stage 8
- `engineering/workpacks/probes/vib-aiv.mjs` — drift checks updated
- `scripts/run-aiv-d23-product-path-validation.mjs` — D.2.3 source-calculated verification path

Tests:

- `tests/vibration-aiv-t26-source-parity.test.mjs` — new focused source-parity regression
- `tests/vibration-aiv-auto-product-path.test.mjs` — Stage-8 expected behavior updated

Recovery:

- `.backups/connector-20260820-aiv-t26-source-parity/original-blobs.yaml`
- this work report
- WIP status
- WIP claim

Total effective diff at handover: 14 paths, 20 commits ahead, 0 behind.

## Numerical implementation now present

The evaluator uses:

```text
R = Dext / T
s = 91.9 - R
a = 3.28e-7 R^3 - 8.503e-5 R^2 + 7.063e-3 R + 0.816
B = a [PWL - 0.112762 s - 0.001812 s^2 + 4.307277e-5 s^3]

log10(N) = 470711.5155
           - 63075.1242 log10(B)
           + 183685.4368 / sqrt(B)
           - 575094.3273 / B^0.1
```

Then:

```text
Dext/dext < 10  -> source polynomial FLM1
Dext/dext >= 10 -> FLM1 = 0.5
WELDOLET          -> apply FLM2
WELDED_TEE        -> no FLM2 multiplier
Duplex YES        -> apply FLM3
Duplex NO         -> no FLM3 multiplier
Lf = clamp(3.1 - 0.1303 ln(N), 0, 1)
Lf >= 0.5         -> LOF = Lf
Lf < 0.5          -> LOF = 0.29
```

The published D.2.3 FLM1 `1.2133` versus direct displayed-dimension recalculation `1.210975819...` remains visible as benchmark variance; production runtime no longer selects the published value.

## Validation truth

### PASS

```text
live main/source grounding                         PASS / SOURCE_INSPECTION
Advanced_Analysis PR1289 source authority merged   PASS / GITHUB_STATE
branch base drift                                  PASS / 20 ahead, 0 behind
focused T2.6 exact reconstructed bytes             PASS / LOCAL_EXECUTION / 6 of 6
reconstructed Git-object identity                  PASS / exact fetched branch bytes for focused modules/test
independent D.2.3 numerical oracle                 PASS / INDEPENDENT_REPRODUCTION
```

Focused regression covers:

1. exact merged source binding;
2. D.2.3 source-calculated a/s/B and N chain;
3. `D/d >= 10` FLM1 branch, non-Weldolet FLM2 path and Duplex FLM3;
4. Lf clamping and both LOF branches;
5. fail-closed assessment type/unit/geometry/Duplex validation;
6. screening-profile independence from benchmark A/S/B and FLM1 configuration.

### NOT_RUN / not established

```text
native `node utils/backup.js save ...`             NOT_RUN / ENVIRONMENT_BLOCKED
repository-native focused test from full checkout  NOT_RUN / ENVIRONMENT_BLOCKED
`npm run workpack:verify -- VIB-AIV`                NOT_RUN / ENVIRONMENT_BLOCKED
`npm run verify:aiv-screening-release`              NOT_RUN / ENVIRONMENT_BLOCKED
`npm run verify:aiv-canvas-release`                 NOT_RUN / ENVIRONMENT_BLOCKED
served-browser Product Freeze journey               NOT_RUN
exact pinned-PDF visual parity                      NOT_RUN / TRANSPORT_BLOCKED
full compatibility sweep across AIV assessment types NOT_RUN
merge                                                NOT_AUTHORIZED
```

Do not convert any NOT_RUN item to PASS by inference.

## Coordination / takeover disposition

- PR #506 is open/draft but 104 commits behind the baseline observed at takeover, 33 files wide, and explicitly excluded new EI equations. For this mission it is `SUPERSEDED_FOR_THIS_SCOPE`; do not replay its stale product blobs.
- merged PR #517 is predecessor evidence; its old ACTIVE claim record is historical metadata after merge.
- PR #1289 is merged source authority in `Advanced_Analysis`.

## Protected invariants

- screening result scope remains `ASSESSMENT`;
- line/case summary remains non-authoritative for screening;
- `designAuthority=false`;
- no SVG/pixel distance authority;
- no T2.5 simultaneous-source semantic change in this slice;
- no line/case screening-authority promotion;
- no benchmark expected-value or tolerance weakening;
- benchmark A/S/B and published FLM1 are evidence/oracles, not screening runtime inputs;
- no workflow-file changes;
- Product Freeze is not inferred from equation/source parity.

## Current risks / unresolved items

1. **Compatibility:** full repository regression has not run; existing code may rely on the old Stage-8 intermediate shape or benchmark-mode semantics beyond the focused path.
2. **Readiness/execution parity:** source inspection indicates the intended T2.6 envelope is shared, but full direct-API and UI-path parity is not yet executed in a complete checkout/browser.
3. **Source promotion:** the equations are source-corroborated and D.2.3 reproduced, but exact pinned-PDF visual parity remains NOT_RUN.
4. **FLM1 arithmetic variance:** published D.2.3 `1.2133` differs from direct displayed-input calculation `1.210975819...`; final D.2.3 LOF is unchanged, but the discrepancy must stay explicit.
5. **Authority wording:** AIV currently carries assessment-screening authority from the prior release state; this WIP must not imply the new v4 numerical revision itself is Production-Freeze qualified before release gates execute.

# Three-question qualification gate for further implementation

A qualified human/agent should answer these from the current branch and source evidence, not from generic AVIFF knowledge.

### Q1 — Production trace and failure isolation

You click **Run Screening** for a WELDOLET row whose project geometry is valid, but you deliberately corrupt `benchmark.publishedA`, `benchmark.publishedS`, `benchmark.publishedB`, and set `benchmark.flm1Mode=PUBLISHED` to an absurd value. Trace the exact current branch path from the engineering-calculation adapter into Stage 8. Which values are allowed to influence the screening LOF now, which benchmark fields must be ignored at runtime, and what concrete observation would prove the old configured-D.2.3 dependency still leaks into production?

### Q2 — Branch logic / engineering falsifier

Take two otherwise identical assessments at the same point PWL: one `WELDOLET / Duplex=NO`, and one `WELDED_TEE / Duplex=YES`. Explain exactly how FLM2 and FLM3 must differ between them, and identify the current code lines/modules that enforce those branches. Then give one numerical or state-based falsifier that would make you stop and reject further implementation even if the final LOF happened to equal `0.29` in both cases.

### Q3 — Authority and release decision

Assume the focused T2.6 test is 6/6 PASS and D.2.3 reproduces numerically, but the full AIV release suite, browser Product Freeze journey, and exact pinned-PDF visual parity are still NOT_RUN. What authority can the branch legitimately claim today, what authority must it **not** claim, and what is the smallest next validation/implementation action you would take before allowing this WIP to move toward a PR/merge? Name the protected result-scope and design-authority invariants explicitly.

## Qualification acceptance rule

For this handover, use three questions rather than the normal five-question Appendix-A set because the implementation diagnosis is already established and the purpose is **continued-implementation custody**, not first-time repository onboarding.

Each answer must:

- cite current repository/source anchors;
- state a prediction and a falsifier;
- preserve the protected authority boundaries;
- avoid calling NOT_RUN evidence PASS.

Recommended gate:

```text
Q1 >= 18/20
Q2 >= 18/20
Q3 >= 18/20
TOTAL >= 56/60
```

Any answer that promotes line/case or design authority, treats benchmark fields as governing screening inputs, hides the FLM1 variance, or converts NOT_RUN release evidence into PASS fails the gate regardless of score.

## Exact continuation

1. Answer Q1-Q3.
2. Grade against current branch/source evidence.
3. If gate passes, set `TAKEOVER_AUTHORITY=WRITE_ALLOWED` and resume with compatibility/release validation before any further numerical expansion.
4. If gate fails, remain read-only and repair understanding first.
5. Do not merge without a separate explicit owner merge instruction.
