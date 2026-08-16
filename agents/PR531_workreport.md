# PR531 — Chapter IX Fatigue Foundation R3 Work Report

## Recovery Header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
WORK_INTENT: IMPLEMENT
CRITICALITY: ENGINEERING_CRITICAL
TAKEOVER_AUTHORITY: WRITE_ALLOWED
EXECUTION_MODE: AUTO
AUTO_STATE: HARD_BOUNDARY_REACHED
SCOPE_AUTHORITY: LOCKED_TO_APPROVED_MISSION
MERGE_AUTHORITY: OWNER_ONLY / NOT_GRANTED
REPOSITORY: reallaksh19/3D_Converters
PR: 531
BRANCH: agent/hp-ch9-fatigue-foundation-r3
BASE_MAIN: f25f721dc35c30b2f7a911f31c26ccdf8a53c6ac
SOURCE_BASIS: reallaksh19/Advanced_Analysis@951798864e6f557691d0d4388368b7805e425f0d/docs/High Pr
CURRENT_STAGE: FATIGUE FOUNDATION + USER_CALCULATED_KD3 INTAKE COMPLETE
CURRENT_BLOCKER: native CORE KD320 formulation/custody is not qualified; UI/registry expansion is outside the locked PR531 scope
EXACT_NEXT_ACTION: preserve USER_CALCULATED_KD3 as the usable intake; only start a separate UI/registry or native-KD320 phase under its own authorized scope.
```

## Mission / Current Design

Deliver straight-pipe Chapter IX pressure-cycle fatigue mechanics without inventing licensed KD-3 semantics. Independent checking may occur later, but Code/design authority is never inferred.

Implemented:
- operating-state and transition custody;
- KD-2 bore pressure stresses / Tresca intensity;
- pressure-cycle `DeltaSp` and `Salt`;
- synthetic `DIRECT_SALT_EQUAL_SEQ` route;
- log-log fatigue interpolation with strict no-extrapolation;
- zero-stress / zero-damage handling;
- Miner cumulative usage;
- straight-pipe spectrum orchestrator;
- method/route/curve/point/spectrum master resolver;
- pinned benchmark/source audit and reference runner;
- `USER_CALCULATED_KD3` result ingestion;
- optional user `Salt` cross-check against CORE;
- external `Seq` and `N` custody;
- calculator/checker provenance;
- JSON candidate verifier and authoring template.

Removed after research review:
- the provisional CORE arithmetic `Seq = Salt/(1-beta*sigmaMean/Sy)`;
- `yieldStrengthMpa` as a claimed KD320 correction denominator;
- hidden per-cycle mean-stress parameter execution in the spectrum path.

## Native KD320 Hard Boundary

`KD320_MEAN_STRESS_CORRECTION` now returns:

```text
KD320_CORE_ROUTE_NOT_QUALIFIED
requiredInputMode = USER_CALCULATED_KD3
reason = CONTROLLED_KD320_FORMULATION_AND_CUSTODY_NOT_ESTABLISHED
canUseForDesignAuthority = false
```

The pinned production master still resolves structurally as `PRODUCTION_EVIDENCE_PENDING`. No native production KD320 calculation is executed.

## USER_CALCULATED_KD3 Contract

For every governed transient cycle, the user supplies:

```text
cycleId                  REQUIRED
locationId               REQUIRED
fromStateId              REQUIRED and must match governed spectrum
toStateId                REQUIRED and must match governed spectrum
Seq                      equivalentAlternatingStressMpa — REQUIRED
N                        permissibleCycles — REQUIRED when Seq > 0
calculationBasis.code    REQUIRED
calculationBasis.edition REQUIRED
calculationBasis.methodRef REQUIRED
calculationBasis.calculationRef REQUIRED
calculationBasis.calculatedBy REQUIRED
```

Optional evidence fields:

```text
userAlternatingStressIntensityMpa -> cross-checked against CORE Salt
associatedMeanStressMpa           -> audit only
beta                              -> audit only
saPrimeMpa                        -> audit only
checkedBy / checkedAt             -> may be added later
```

CORE does not use `associatedMeanStressMpa`, `beta`, `saPrimeMpa`, or any yield-strength field to reconstruct `Seq`.

## Authority Custody

Per cycle:

```text
Salt authority = CORE_AND_USER_CROSSCHECKED
                 or CORE_CALCULATED_USER_NOT_PROVIDED
Seq authority  = USER_SUPPLIED
N authority    = USER_SUPPLIED
n authority    = GOVERNED_TRANSIENT_SPECTRUM
Damage         = CORE_DERIVED
```

Before independent checking:

```text
EXTERNAL_KD3_CALCULATED_NOT_CHECKED
USER_CALCULATED_NOT_INDEPENDENTLY_CHECKED
```

With distinct checker + timestamp:

```text
EXTERNAL_KD3_CALCULATED_CHECKED_NOT_AUTHORIZED
USER_CALCULATED_INDEPENDENTLY_CHECKED
```

Even the checked state retains `canUseForDesignAuthority=false` and `codeCompliance=false`.

## Salt Cross-Check Policy

If user `Salt` is supplied, CORE independently computes straight-pipe pressure-cycle `Salt` and compares using repository QA policy:

```text
type = RELATIVE
value = 1e-4
```

This is not an ASME design tolerance. Mismatch fails closed as `USER_SALT_MISMATCH`. User `Salt` remains optional.

## User Authoring Artifacts

```text
converters/b313-chapter-ix/user-calculated-fatigue.js
scripts/verify-b313-ch9-user-calculated-fatigue.mjs
engineering/hp-class-standardization/qualification/user-calculated-fatigue.template.json
```

CLI:

```text
node scripts/verify-b313-ch9-user-calculated-fatigue.mjs <candidate.json>
```

## Source Custody

Pinned High-Pr source blobs remain:

```text
method_manifest.csv      a34af2063105db4dae59003ebe77704b95541e81
fatigue_route.csv        6a7b603951c34586da292812e7e38a3a19499aae
fatigue_curve.csv        997fa0a863c9887d64472aabab1d3ac58be60ad4
fatigue_curve_point.csv  d773a01bf550e343dddf5b3ac85f328d859116f9
cycle_spectrum.csv       e972475b9b12864aea6d2b8975babe3f6b6b482c
operating_state.csv      812498264cb0de94907c34b0e076fb827a17ccdb
cycle_transition.csv     9393f7da50bc1575476af0c183834c3f6dea38e2
```

## Validation Receipt

Original R3 validation remains intact:
- pinned analytical/synthetic benchmarks PASS;
- exact pinned synthetic master execution retained `U = 1.1200262680869295 / REFERENCE_FAIL` without weakening inputs;
- production master audit remains fail-closed.

Post-research correction focused suite:

```text
22 tests
22 PASS
0 FAIL
```

Coverage includes native KD320 hard block, external `Seq + N`, state/cycle binding, optional Salt cross-check, mismatch rejection, mandatory provenance, checker collision rejection, checked/not-checked evidence states, zero damage, and file verifier.

Exact tested Git blobs:

```text
fatigue-equivalent.js               99ef93cc82ba447467bbe246a390727628954476
fatigue-spectrum.js                 f035dee53ccdcb09c2872bf2b1fcf4f9a79f31c8
user-calculated-fatigue.js          07e173707a105556057f8ada81ea53f24386b144
fatigue-foundation.test.mjs         b01f49ea3f6e2401be2b256d32b31c72eaf55647
user-calculated-fatigue.test.mjs    a98769a49c7f68f8b4746b2953cabee15a2c1259
```

## Final Reconciliation Receipt

After the correction implementation:

```text
main = f25f721dc35c30b2f7a911f31c26ccdf8a53c6ac
PR531 compare = 30 ahead / 0 behind
changed files = 19
```

No `.github/workflows/*`, UI/runtime, package script, or central registry files are changed.

## Validation Truth

PASS:
- live grounding / overlap classification;
- exact pinned-source hash reconstruction;
- source-supported pressure-cycle mechanics;
- pinned independent benchmark regressions;
- synthetic master audit/execution;
- native KD320 fail-closed behavior;
- `USER_CALCULATED_KD3` focused suite 22/22;
- exact branch-blob identity for tested changed files;
- final base reconciliation 0 behind.

NOT_RUN / NOT_ESTABLISHED:
- complete private-repo native suite: NOT_RUN / environment limitation;
- native CORE KD320 controlled formulation/custody: NOT_ESTABLISHED;
- licensed curve independent custody: NOT_ESTABLISHED;
- independent engineering qualification: deferred / NOT_ESTABLISHED;
- Code/design authority: NOT_ESTABLISHED.

## Protected Invariants

- no authority promotion;
- no hidden engineering defaults;
- no fatigue-curve extrapolation;
- no tolerance weakening;
- no oracle regeneration;
- no native KD320 calculation from guessed semantics;
- optional mean-stress fields remain audit-only;
- user `Seq/N` provenance is explicit;
- no component/class qualification from straight-pipe mechanics;
- no workflow mutation;
- no merge without explicit owner authorization.

## Handover in 60 Seconds

PR531 provides a usable user/external KD-3 result pathway while native CORE KD320 remains fail-closed. Users supply externally calculated `Seq` and `N`; CORE binds them to governed cycles, optionally reproduces `Salt`, and derives Miner damage. Independent checking can be added later without changing the data model. UI/registry integration should be a separately authorized scope. Keep PR531 draft/unmerged until explicit owner merge authorization.
