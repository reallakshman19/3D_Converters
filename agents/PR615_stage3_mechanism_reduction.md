# PR #615 Stage 3 — Mechanism-Level Result Reduction

## Grounding epoch

- WORK_INTENT: IMPLEMENT
- REPOSITORY_STATE: EXISTING_PR
- MUTATION_AUTHORITY: WRITE_ALLOWED by Owner instruction `ok proceed`
- CRITICALITY: ENGINEERING_CRITICAL
- EXECUTION_MODE: MANUAL
- BASE_BRANCH: `main`
- BASE_MAIN_SHA: `1d9340248b11569f7c7c4f02ac429c7d8c66ff81`
- PR: #615, draft/open/mergeable
- REPORT_BASIS_HEAD: `9fc31bd2a61c259264bf4bd87ce14dfe5fee66e1`
- MERGE_AUTHORITY: OWNER_ONLY / NOT_GRANTED

## Coordination decision

Target stack:

```text
AssessmentUnitResult[]
  -> MechanismNumericResult.v1
  -> MechanismLineResult.v1
  -> qualified mechanism reducer
  -> EiMainLineAggregation
```

Live overlap check:

- PR #571 owns mechanism coverage/identification contracts and explicitly excludes EI main-line aggregation.
- no open PR was found for `ei-mainline-aggregation.js`.
- no open PR was found for `MechanismLineResult` other than PR615.
- Stage 3 will not edit `converters/vibration/mechanisms/contracts.js`.
- Stage 3 will not edit FIT/AIV/SBC workspace files claimed by #479/#506/#508.

Classification: `SAFE` for new mechanism result/reducer files and `COORDINATION_REQUIRED` for the existing EI aggregation file; exact pre-edit custody is required before mutation.

## Current defect

Current `ei-mainline-aggregation.js` iterates every item in each required assessment set and directly pushes each item's `result.governingLof` as an EI main-line contributor.

That permits this unqualified path:

```text
AIV pair 1 LOF
AIV pair 2 LOF
AIV pair 3 LOF
       -> global EI max()
```

without first proving the method-authorized AIV reduction from source-assessment-pair results to one AIV line result.

## Protected invariant

```text
ASSESSMENT_UNIT_LOF != MECHANISM_LINE_LOF
```

and:

```text
one mechanism -> at most one qualified EI main-line contributor
```

A single assessment unit may pass through by identity because no cross-unit reduction occurs. `MANY` assessment units must fail closed until a mechanism-specific multi-item reduction rule is separately qualified.

No universal child-level max reducer is authorized by this stage.

## Planned contracts

### `MechanismNumericResult.v1`

Normalizes one assessment item's numerical/result/qualification state while retaining its observed LOF and explicit aggregation eligibility.

### `MechanismLineResult.v1`

Represents one mechanism at one exact line/case/canonical scope. A numeric governing LOF is emitted only when the reducer is qualified for the input cardinality and all source numeric results are current Screening-eligible.

### Reducer policy

V1 allows:

```text
ONE assessment unit -> IDENTITY_SINGLE_ASSESSMENT_UNIT
ZERO                -> INCOMPLETE
MANY                -> INCOMPLETE unless a separately qualified mechanism-specific rule exists
```

No mechanism receives an inferred `MAX` rule in this stage.

## EI aggregation migration

`EiMainLineAggregation` will no longer iterate item LOFs as contributors. It will:

1. retain existing exact-scope T1/coverage/M3 gates;
2. reduce each required assessment set to one `MechanismLineResult.v1`;
3. reject incomplete/unqualified mechanism line results;
4. apply the existing governed EI cross-mechanism maximum only to qualified mechanism line results.

The aggregation schema/policy revision must change because contributor semantics change.

Caller-supplied `mechanismLineResults` remain forbidden in this slice; the evaluator derives them from the same governed assessment evidence to avoid a second authority store.

## Falsifiers

1. Three current AIV source-assessment pairs cannot yield a numeric EI main-line LOF without a qualified AIV multi-item reducer.
2. One current Screening FIT item still reduces by identity and can contribute.
3. FIT + one current AIV item can still form the governed cross-mechanism maximum when M3/T1/coverage gates are satisfied.
4. stale/candidate/invalid unit results cannot become a current mechanism line result.
5. excluded SBC/TW/slug/corrugation results remain outside EI main-line aggregation.
6. no equation, T1 rule, benchmark oracle, threshold, design authority, or Product Freeze state changes.

## Validation plan

- focused pure Node tests for numeric-result and line-result contracts;
- existing M4 regression updated so MANY no longer contributes individually;
- syntax checks on new modules and modified aggregator/test;
- source inspection proving the aggregator has no direct `item.result.governingLof` contributor loop;
- repository-native current-head suite remains separately `NOT_RUN` if the native checkout is unavailable.

## Appendix A

NOT_REQUIRED_FOR_CONTINUATION — same active implementation agent and same PR; not a takeover. Engineering-critical authority and validation rules remain in force.

## EXACT_NEXT_ACTION

Preserve exact pre-edit `ei-mainline-aggregation.js` and its existing regression, create the result/reducer contracts and focused falsifier, then migrate the aggregator to consume only `MechanismLineResult.v1`. Update the existing M4 test expectation for MANY, validate, reconcile PR615 recovery records, and leave draft/unmerged.
