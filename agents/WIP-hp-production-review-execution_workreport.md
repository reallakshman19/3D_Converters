# WIP — HP Production Review Execution

## Recovery header
- REPOSITORY: `reallaksh19/3D_Converters`
- BRANCH: `agent/hp-production-review-execution`
- BASE_AT_ALLOCATION: `main@a2dc24c27c791355044ae64939647a7c78804aca`
- INTENT: contribute useful HP calculations to the production runtime now; defer qualification gates/evidence completion to later work
- STATE: `IMPLEMENTED_ON_BRANCH_PENDING_NATIVE_EXECUTION_AND_PR`
- MERGE_AUTHORITY: `NOT_GRANTED`

## User direction
Production calculation value takes priority over additional blocker/gate/evidence plumbing in this increment.

The implemented boundary is:

```text
mathematical/input inconsistency       -> hard calculation failure
missing provenance/checker custody     -> advisory in production-review route
formal qualification route             -> preserved unchanged for later evidence work
native CORE KD320                       -> still not executed / not qualified
Code compliance / design authority      -> still false
```

## Production contribution
Three new central calculation IDs are registered:

```text
PIPE.B313.CH9.STRAIGHT_PRESSURE_REVIEW
PIPE.B313.CH9.WALL_STATE_REVIEW
PIPE.B313.CH9.FATIGUE_USER_REVIEW
```

All have:

```text
calculationState    IMPLEMENTED
qualificationState  IMPLEMENTED
required mode gate  none
codeCompliance      false
Design authority    false
```

The legacy benchmark/qualification definitions are not weakened or removed.

## HP Piping Class workbench
`hp-piping-class-orchestrator.js` now sends the fatigue step to:

```text
PIPE.B313.CH9.FATIGUE_USER_REVIEW
```

Static and wall calculations remain on the existing proven Chapter IX kernels.

The product path can therefore consume numerically complete user/external Seq and N rows even when `calculationBasis` / checker custody is not yet recorded. Missing custody appears as advisory evidence issues in the new production-review result instead of preventing calculation.

## Evidence-policy compatibility
`evaluateChapterIxUserCalculatedFatigueSpectrum()` now supports:

```text
evidencePolicy = REQUIRED   # existing/default behavior
evidencePolicy = ADVISORY   # production-review behavior
```

`REQUIRED` remains the default. This preserves the formal `PIPE.B313.CH9.FATIGUE_USER_CALCULATED` intake behavior and its existing evidence gates.

`ADVISORY` skips only provenance/checker gating. It does not relax numerical or relational validity.

## Hard failures intentionally retained
Production review still fails closed for:

- missing/duplicate governed cycle result rows;
- missing result location/state identity;
- state-pair mismatch;
- invalid/non-finite Seq;
- invalid optional user Salt;
- invalid mean stress / beta / Sa-prime values when supplied;
- user Salt conflict against CORE pressure-cycle Salt beyond the repository QA cross-check tolerance;
- Seq = 0 when CORE Salt is non-zero;
- missing/non-positive permissible cycles N for non-zero damage;
- invalid geometry/effective wall/transient definitions inherited from the existing CORE domain kernels.

These are calculation-integrity failures, not source-custody gates.

## Evidence advisories
When `evidencePolicy=ADVISORY`, the domain returns per-cycle evidence states and aggregate:

```text
evidencePolicy
evidenceIssueCount
evidenceIssues[]
independentCheckComplete
```

Examples of advisory-only conditions:

```text
USER_FATIGUE_BASIS_REQUIRED
USER_FATIGUE_CHECKER_NOT_INDEPENDENT
USER_FATIGUE_CHECK_CUSTODY_INCOMPLETE
```

The strict/default route still treats those conditions as failures.

## Frozen numerical reference retained
Independent arithmetic reference for NPS 4:

```text
D                    114.3 mm
P                    20 MPa
S                    138 MPa
nominal wall         13.49 mm
minus tolerance      12.5 %
internal allowance   3 mm
external allowance   0 mm

t_pressure           7.7103934983403475 mm
t_required_min       10.710393498340348 mm
t_required_nominal   12.240449712388969 mm
t_min_manufactured   11.80375 mm
t_eff_EOL            8.80375 mm
P_rating             23.086120852009273 MPa
rating margin        1.1543060426004637
```

Pressure-cycle references:

```text
5 -> 30 MPa  Salt = 87.91596640349115 MPa
2 -> 20 MPa  Salt = 63.29949581051363 MPa
```

Miner examples in the focused test:

```text
n=10000, N=20000 -> U=0.5
n=500,   N=10000 -> U=0.05
```

## Tests added/updated
Added:
- `tests/b313-chapter-ix-production-review.test.mjs`

Coverage includes:
1. production-review IDs are registered as normal executable calculations with no qualification-mode gate;
2. direct NPS4 pressure arithmetic parity;
3. wall-state EOL/projected-EOL parity;
4. user Seq/N fatigue calculation with no calculationBasis/checker evidence;
5. formal USER_CALCULATED_KD3 route still blocks missing evidence;
6. invalid N and conflicting Salt still fail closed;
7. actual HP Piping Class orchestrator calculates the NPS4 sample after calculationBasis is deliberately removed.

Updated:
- `tests/hp-piping-class-orchestrator-contract.test.mjs`
  - expected fatigue calculation ID changed from formal intake to production-review intake.

## Changed-file ledger
Engineering/runtime:
1. `converters/engineering-calculations/adapters/b313-chapter-ix-production-review.js`
2. `converters/engineering-calculations/default-registry.js`
3. `converters/b313-chapter-ix/user-calculated-fatigue.js`
4. `converters/b313-chapter-ix/hp-piping-class-orchestrator.js`

Tests:
5. `tests/b313-chapter-ix-production-review.test.mjs`
6. `tests/hp-piping-class-orchestrator-contract.test.mjs`

Recovery:
7. `agents/WIP-hp-production-review-execution_workreport.md`

## Validation ledger

```text
independent NPS4 hand arithmetic                  PASS
independent 5->30 MPa Salt hand arithmetic        PASS
independent 2->20 MPa Salt hand arithmetic        PASS
source-scope comparison against main              PASS / bounded intended paths only
search for additional workbench old-fatigue-ID    PASS / only known contract test required update
native node test execution                        NOT_RUN / native checkout unavailable; container DNS cannot resolve github.com
full repository regression suite                  NOT_RUN / native checkout unavailable
browser/UI interaction suite                      NOT_RUN
GitHub status checks                              NOT_RUN / no PR created in this increment
```

Do not convert `NOT_RUN` to PASS.

## Authority boundary
This work changes production executability, not engineering authority.

```text
nativeCoreKd3Qualified        false
codeCompliance                false
canUseForDesignAuthority      false
formal evidence-required ID   preserved
production review ID          advisory evidence policy
```

## Exact next action
Before PR publication/merge:
1. obtain a native checkout or equivalent executable source materialization;
2. run `node --test tests/b313-chapter-ix-production-review.test.mjs tests/hp-piping-class-orchestrator-contract.test.mjs tests/b313-chapter-ix-user-calculated-fatigue.test.mjs tests/b313-chapter-ix-user-calculated-fatigue-product.test.mjs`;
3. run the relevant HP Piping Class regression suite;
4. browser-check Engineering Calculations catalogue and HP Piping Class sample path;
5. publish a draft PR only with explicit PR-creation authorization.

## Appendix A — takeover questions
1. Why is a separate production-review adapter preferable to weakening the benchmark adapters in place?
2. Which three new calculation IDs are production-executable?
3. What does `evidencePolicy=ADVISORY` relax, and what does it explicitly not relax?
4. Does missing `calculationBasis` prevent the production-review fatigue calculation? No.
5. Does missing `calculationBasis` still prevent the formal USER_CALCULATED_KD3 intake? Yes.
6. Why must a user Salt mismatch remain a hard failure?
7. What NPS4 EOL effective wall should be reproduced? `8.80375 mm`.
8. What is the exact 2->20 MPa Salt reference? `63.29949581051363 MPa`.
9. What authority flags remain false?
10. Which validation items remain NOT_RUN and why?
