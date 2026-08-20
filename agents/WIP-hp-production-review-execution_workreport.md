# WIP — HP Production Review Execution

## Recovery header
- REPOSITORY: `reallaksh19/3D_Converters`
- BRANCH: `agent/hp-production-review-execution`
- BASE_AT_ALLOCATION: `main@a2dc24c27c791355044ae64939647a7c78804aca`
- INTENT: contribute useful HP calculations to the production runtime now; defer qualification gates/evidence completion to later work
- STATE: `IMPLEMENTED_ON_BRANCH_PENDING_NATIVE_EXECUTION_AND_PR`
- MERGE_AUTHORITY: `NOT_GRANTED`
- PR_AUTHORITY: `NOT_GRANTED`

## User direction
Production calculation value takes priority over additional blocker/gate/evidence plumbing in this increment.

The implemented boundary is:

```text
mathematical/input inconsistency       -> hard calculation failure
structural project inconsistency       -> hard project failure
authority-promotion attempt            -> hard failure
missing method/source identity         -> production advisory
missing provenance/checker custody     -> production advisory
master-store custody not loaded/match  -> production advisory during calculation
formal qualification route             -> preserved for later evidence work
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
design authority    false
```

The legacy benchmark/qualification definitions are not weakened or removed.

## HP Piping Class production workbench
`hp-piping-class-orchestrator.js` now sends the fatigue step to:

```text
PIPE.B313.CH9.FATIGUE_USER_REVIEW
```

Static and wall calculations remain on the existing Chapter IX domain kernels.

The product path can therefore consume numerically complete user/external Seq and N rows even when `calculationBasis` / checker custody is not yet recorded. Missing custody appears as advisory evidence issues instead of preventing calculation.

### Workspace pre-gates relaxed for production review
`validateHpPipingClassProject()` now accepts a policy:

```text
validationPolicy = REQUIRED           # existing/default behavior
validationPolicy = PRODUCTION_REVIEW  # workbench execution behavior
```

Under `PRODUCTION_REVIEW`, `METHOD_IDENTITY_REQUIRED` is advisory. Numerical/structural project defects remain blocking.

`hp-piping-class-workspace-controller.js` now:
- uses `PRODUCTION_REVIEW` validation for the product workspace;
- no longer pre-blocks calculation because canonical master-store custody is not loaded;
- no longer pre-blocks calculation because an embedded governed basis does not reproduce the loaded custody projection;
- surfaces those custody findings in `advisories` / `warnings`;
- still requires the canonical master store when the user asks the UI to **create/bind a new governed basis package**;
- still blocks any result that attempts to promote native KD3, Code compliance or design authority.

This separates “can calculate for engineering review?” from “is the source/evidence chain qualified?”

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

- invalid project schema/canonical units;
- missing project/product structure needed to execute the workflow;
- invalid design pressure/allowances;
- invalid direct diameter/stress/wall/tolerance inputs;
- invalid wall-state definitions;
- missing/duplicate governed cycle result rows;
- missing result location/state identity;
- state-pair mismatch;
- invalid/non-finite Seq;
- invalid optional user Salt;
- invalid mean stress / beta / Sa-prime values when supplied;
- user Salt conflict against CORE pressure-cycle Salt beyond the repository QA cross-check tolerance;
- Seq = 0 when CORE Salt is non-zero;
- missing/non-positive permissible cycles N for non-zero damage;
- invalid geometry/effective wall/transient definitions inherited from the existing domain kernels;
- any attempt to set `nativeCoreKd3Qualified`, `codeCompliance`, or `canUseForDesignAuthority` true.

These are calculation-integrity / authority-integrity failures, not source-custody gates.

## Advisory-only conditions in production review
Examples:

```text
METHOD_IDENTITY_REQUIRED
USER_FATIGUE_BASIS_REQUIRED
USER_FATIGUE_CHECKER_NOT_INDEPENDENT
USER_FATIGUE_CHECK_CUSTODY_INCOMPLETE
MASTER_STORE_NOT_LOADED
GOVERNED_BASIS_CUSTODY_BLOCKED   # retained code may appear as advisory in workspace output
```

When `evidencePolicy=ADVISORY`, the fatigue domain returns:

```text
evidencePolicy
evidenceIssueCount
evidenceIssues[]
independentCheckComplete
```

The strict/default fatigue route still treats its evidence requirements as failures.

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

Miner examples in the focused tests:

```text
n=10000, N=20000 -> U=0.5
n=500,   N=10000 -> U=0.05
```

## Tests added/updated
Added:
- `tests/b313-chapter-ix-production-review.test.mjs`

Coverage authored for:
1. production-review IDs registered as normal executable calculations with no qualification-mode gate;
2. direct NPS4 pressure arithmetic parity;
3. wall-state EOL/projected-EOL parity;
4. user Seq/N fatigue calculation with no calculationBasis/checker evidence;
5. formal USER_CALCULATED_KD3 route still blocks missing evidence;
6. invalid N and conflicting Salt still fail closed;
7. actual HP Piping Class orchestrator calculates the NPS4 sample after calculationBasis is deliberately removed.

Updated:
- `tests/hp-piping-class-orchestrator-contract.test.mjs`
  - expected fatigue calculation ID changed from formal intake to production-review intake.
- `tests/hp-piping-class-master-controller.test.mjs`
  - creating a new governed binding still requires loaded master store;
  - calculation from an embedded governed package proceeds with `MASTER_STORE_NOT_LOADED` advisory;
  - custody mismatch proceeds as advisory;
  - missing method edition identity is advisory in production workspace validation.

## Changed-file ledger
Engineering/runtime:
1. `converters/engineering-calculations/adapters/b313-chapter-ix-production-review.js`
2. `converters/engineering-calculations/default-registry.js`
3. `converters/b313-chapter-ix/user-calculated-fatigue.js`
4. `converters/b313-chapter-ix/hp-piping-class-project.js`
5. `converters/b313-chapter-ix/hp-piping-class-orchestrator.js`
6. `tabs/hp-piping-class-workspace-controller.js`

Tests:
7. `tests/b313-chapter-ix-production-review.test.mjs`
8. `tests/hp-piping-class-orchestrator-contract.test.mjs`
9. `tests/hp-piping-class-master-controller.test.mjs`

Recovery:
10. `agents/WIP-hp-production-review-execution_workreport.md`

## Source-scope reconciliation
Current branch relation before this update:

```text
base     a2dc24c27c791355044ae64939647a7c78804aca
behind   0
files    10 intended
```

No `Advanced_Analysis` evidence master, KD320 native formula/curve, unrelated vibration implementation, or unrelated UI file is changed.

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

## Pre-existing central-registry defects observed on base
These are **not fixed in this HP increment**:

1. `tests/engineering-calculation-core.test.mjs` still asserts an old catalogue count (`8 executable / 26 total`) that does not match current default-registry source even before these new review IDs are considered.
2. `converters/engineering-calculations/registry.js` does not list `array` in `FIELD_TYPES`, while the already-active AIV calculation definition declares `inventoryCompletenessAttestations` with `type: 'array'`.

These are central-console baseline issues and should be handled separately rather than mixed into this production HP change.

## Authority boundary
This work changes production executability, not engineering authority.

```text
nativeCoreKd3Qualified        false
codeCompliance                false
canUseForDesignAuthority      false
formal evidence-required ID   preserved
production review ID          advisory evidence policy
project method identity       advisory in production review
master custody precheck       advisory during calculation
```

## Exact next action
Before PR publication/merge:
1. obtain a native checkout or equivalent executable source materialization;
2. run at minimum:
   - `tests/b313-chapter-ix-production-review.test.mjs`
   - `tests/hp-piping-class-orchestrator-contract.test.mjs`
   - `tests/hp-piping-class-master-controller.test.mjs`
   - `tests/b313-chapter-ix-user-calculated-fatigue.test.mjs`
   - `tests/b313-chapter-ix-user-calculated-fatigue-product.test.mjs`;
3. run relevant HP Piping Class parity/real-workbench regressions;
4. browser-check Engineering Calculations catalogue and HP Piping Class sample/direct-input path;
5. publish a draft PR only with explicit PR-creation authorization.

## Appendix A — takeover questions
1. Why is a separate production-review adapter preferable to weakening benchmark adapters in place?
2. Which three new calculation IDs are production-executable?
3. What does `evidencePolicy=ADVISORY` relax, and what does it explicitly not relax?
4. Does missing `calculationBasis` prevent production-review fatigue calculation? No.
5. Does missing `calculationBasis` still prevent the formal USER_CALCULATED_KD3 intake? Yes.
6. Why must a user Salt mismatch remain a hard failure?
7. Which project validation issue is currently advisory under `PRODUCTION_REVIEW`? `METHOD_IDENTITY_REQUIRED`.
8. Does an unloaded master store prevent calculation from an already embedded governed basis package? No; it is advisory.
9. Does creating/binding a new governed basis still require a loaded master store? Yes.
10. What NPS4 EOL effective wall should be reproduced? `8.80375 mm`.
11. What is the exact 2->20 MPa Salt reference? `63.29949581051363 MPa` (double-precision display may end in ...362 due binary rounding).
12. What authority flags remain false?
13. Which validation items remain NOT_RUN and why?
