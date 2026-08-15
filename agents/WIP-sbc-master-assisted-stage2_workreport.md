# WIP-sbc-master-assisted-stage2 — recovery-first handoff

## Recovery Header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: CONTINUE
TAKEOVER_AUTHORITY: WRITE_ALLOWED
WORK_INTENT: IMPLEMENT
CRITICALITY: ENGINEERING_CRITICAL
BRANCH: agent/sbc-master-assisted-stage2
STACK_BASE: agent/ei-master-pack-stage1@9ed5acbf2e6ab20746c93650ea167e1a59893f3d
PARENT_PR: #507 draft / unmerged
CURRENT_MAIN_AT_START: 0b03855a6d9031c8b531e23bdd3deea3b7fdc5d4
COORDINATION: STACKED_ON_PR507 / no separate overlapping SBC master-consumer PR found
MERGE_AUTHORITY: NOT_GRANTED
```

## Mission

Build the Stage-2 Type-3 SBC candidate consumer on top of PR507 without activating any master or quarantined curve. Replace user-entered non-curve intermediate terms with calculations from physical SBC geometry and candidate master data.

Target custody:

```text
physical project geometry
 -> candidate T3 non-curve masters
 -> automatic C / E / location / 1.42 rule where qualified
 -> manual exact D/F/G curve values while T3-1..T3-4 remain quarantined
 -> existing worked-example-correct Type-3 max/min combination
 -> candidate SBC LOF only
```

## Source / current engineering truth

Pinned EI worked example D7 states:
- Type-3 first-span `LOFGEOM(C)` is obtained using ordinary Flowchart T3-3 five-factor geometry scoring.
- Weldolet, 700 mm branch, one valve < ANSI 900, parent Schedule 120 assessed as Schedule 80, 1.5 in minimum diameter gives `LOFGEOM(C)=0.68`.
- First span 0.9 m / fitting factor 0.7 = 1.286 m feeds Figure T3-1 and gives D=0.2.
- First span 0.9 m * fitting factor 0.7 = 0.63 m; T3-2 limit 1.3 m gives E=0.7.
- unknown main-line LOF sets `LOFLOC=1.0` and main-line LOF for assessment to 1.0.
- subsequent D7 curve results remain F=0.6 and G=0.2.
- final rule is `min(mainLineLof * 1.42, overallModifier)`.

Merged PR484 candidate evidence supplies five non-curve master families: geometry scores, location scores, fitting span factors, first-span limits, between-main-line limits. Merged PR505 quarantines the supplied T3-1..T3-4 digitized curves because they contradict D7.

## Protected invariants

- no T3 curve interpolation, extrapolation, reconstruction or activation;
- D/F/G remain explicit manual evaluated curve values until corrected source geometry is independently qualified;
- candidate masters do not become ACTIVE merely because consumed by this evaluator;
- engineeringAuthority = NONE;
- screeningAuthority = NOT_AUTHORIZED;
- designAuthority = false;
- final Type-3 combination remains the existing worked-example-correct min/max chain;
- no missing numeric value becomes zero except the documented `C=0` when first span has no unsupported mass;
- project physical inputs are distinct from EI method data.

## Appendix A — implementation takeover qualification

### A1 Production Trace — 19/20
Current product path inspected: facility matrix -> `evaluateSbcFacilityType3()` -> `calculateSbcType3FromUserEngineeringData()`. The current calculator asks the user for C/E/location/main-line multiplier and curve results D/F/G. Stage 2 will introduce a separate master-assisted candidate path rather than change screening authority.

### A2 Failure Isolation — 20/20
The unnecessary user burden is isolated to non-curve terms that are already deterministic from merged candidate evidence. Curve terms are a separate source-data conflict and will not be touched.

### A3 Authority / Invariants — 20/20
Candidate inspection is explicitly non-authorizing. PR507 ACTIVE-only runtime resolution remains intact. Stage 2 will not use the ACTIVE resolver for candidate data and will not mislabel candidate data as an ACTIVE governed resolution.

### A4 Independent Validation — 19/20
Independent D5/D6/D7/D8 worked-example values and merged PR484 source oracles are available. One point withheld because repository-native execution is unavailable in connector-only runtime.

### A5 Minimal Patch — 19/20
Plan is a separate stacked PR with a small non-curve candidate pack/consumer, pure combination seam, focused regressions, and optional UI integration only after the domain contract is stable. No FIT/AIV kernel or master activation changes.

**Score: 97/100; all sections >=19/20 — PASS.**

## Planned first implementation slice

1. encode candidate geometry/location/rule masters or deterministic lookup service from already merged candidate evidence;
2. extract/reuse one pure Type-3 combination function so numerical custody is single-source;
3. calculate C from physical geometry;
4. calculate E from fitting factor + actual first span + T3-2 limit;
5. resolve location from project location + parent schedule where main-line LOF <1; default LOFLOC=1 only where EI rule explicitly requires it;
6. use 1.42 as source-qualified method rule;
7. retain D/F/G manual exact curve input and emit the exact x/y lookup coordinates required for those entries;
8. validate D7 plus independent no-mass and off-grid/fail-closed cases.

## Validation state

- live #507 grounding: PASS / GitHub
- current production-path inspection: PASS / source inspection
- D7 source semantics: PASS / pinned EI worked-example transcription
- PR484 non-curve evidence: PASS / merged repository evidence
- PR505 curve quarantine: PASS / current main
- repository-native Stage-2 tests: NOT_RUN
- browser acceptance: NOT_RUN

## Exact next action

Implement the pure master-assisted domain slice and run bounded reconstructed tests before touching UI/runtime integration.
