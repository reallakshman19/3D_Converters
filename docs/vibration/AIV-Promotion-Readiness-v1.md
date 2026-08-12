# AIV Promotion Readiness v1

## Purpose

`AivQualificationPromotionReadiness.v1` is a fail-closed orchestration contract for `VIB.AIV.ACOUSTIC` qualification evidence.

It does **not** calculate AIV, implement Energy Institute equations, or grant engineering authority. Its only purpose is to answer:

> Have the required controlled human/benchmark reconciliation artifacts been completed and identified strongly enough that the method may be sent to an independent vibration engineer for an authority decision?

Current authority remains:

```text
calculationState      = BLOCKED
qualificationState    = BLOCKED
engineeringAuthority  = NONE
productionEquationAuthorized = false
screeningAuthority    = NOT_AUTHORIZED
designAuthority       = false
```

Even a fully satisfied prerequisite checklist does not change those values.

## Implementation

```text
converters/vibration/aiv/aiv-promotion-readiness.js
tabs/vibration-aiv-promotion-view.js
```

Human worked-example result-scope reconciliation:

```text
scripts/verify-aiv-worked-example-result-scope.mjs
AivWorkedExampleResultScopeReview.v1
```

Focused regressions:

```text
tests/vibration-aiv-promotion-readiness.test.mjs
tests/vibration-aiv-result-scope-review.test.mjs
```

## Gate set

The planner contains six prerequisite evidence gates and one final human authority gate.

```text
CONTROLLED_T2_7_HUMAN_RECONCILIATION
RECONCILE_D2_3_PUBLISHED_FLM1_ARITHMETIC
RECONCILE_WORKED_EXAMPLES_DERIVED_REPORT_RESULT_SCOPE
INDEPENDENT_SONIC_SFF6_BENCHMARK
INDEPENDENT_MULTI_SOURCE_BENCHMARK
RETAINED_WORKBOOK_RECONCILIATION
INDEPENDENT_VIBRATION_ENGINEER_PROMOTION_REVIEW
```

The first six are prerequisites for an authority review. The final gate is intentionally not satisfiable by this planner.

## Evidence record contract

A prerequisite is not closed by a Boolean flag.

Input must be an evidence identity record:

```js
{
  artifactSha256: 'sha256:<64 lowercase hex>',
  verification: {
    schema: '<expected verification schema>',
    methodId: 'VIB.AIV.ACOUSTIC',
    productionEquationAuthorized: false,
    // gate-specific completion fields
  }
}
```

The SHA-256 value is the identity of the verification artifact bytes produced by the controlled verification workflow. The orchestration layer validates the SHA-256 format and structured verification content. The upstream artifact-producing workflow remains responsible for computing the hash from the actual bytes.

Bare booleans, missing hashes, wrong schemas, wrong method IDs, incomplete completion fields, or authority-tainted verification objects are `INVALID_EVIDENCE`.

## Expected verification schemas

| Gate | Required verification schema |
|---|---|
| T2.7 human reconciliation | `AivT27ReconciliationVerification.v1` |
| D.2.3 FLM1 reconciliation | `AivD23Flm1ReconciliationVerification.v1` |
| Worked-example result-scope reconciliation | `AivWorkedExampleResultScopeReviewVerification.v1` |
| Sonic SFF=6 benchmark | `AivIndependentBenchmarkReviewVerification.v1` |
| Multiple-source benchmark | `AivIndependentBenchmarkReviewVerification.v1` |
| Retained workbook reconciliation | `AivWorkbookReconciliationVerification.v1` |
| Independent vibration-engineer review | `AivIndependentVibrationEngineerPromotionReview.v1` — final authority gate, not auto-consumed by this planner |

The independent benchmark verification artifact intentionally serves two prerequisite gates because the reviewed artifact contains separate accepted sonic and multi-source dispositions.

## Gate statuses

```text
SATISFIED
UNSATISFIED
INVALID_EVIDENCE
```

`UNSATISFIED` means the required verification artifact has not been provided.

`INVALID_EVIDENCE` means an artifact was provided but is not structurally acceptable for the gate. Invalid evidence blocks readiness and must not be treated as merely missing.

## Overall statuses

```text
PROMOTION_PREREQUISITES_INCOMPLETE
INVALID_EVIDENCE
READY_FOR_INDEPENDENT_AUTHORITY_REVIEW
```

`READY_FOR_INDEPENDENT_AUTHORITY_REVIEW` means all six prerequisite gates are satisfied. It does **not** mean:

- equations are production-authorized;
- benchmark execution is authorized;
- screening is authorized;
- design use is authorized;
- the method has been independently approved.

The output therefore always contains:

```text
authorityPromotionAuthorized = false
independentVibrationEngineerReviewRequired = true
productionEquationAuthorized = false
screeningAuthority = NOT_AUTHORIZED
designAuthority = false
```

## Worked-example result-scope human review

The controlled worked examples expose two unlike result objects:

```text
Derived downstream relief line report
  PWL 164.69 dB
  LOF 1.48

D.2.3 first welded discontinuity
  point PWL 164.4 dB
  LOF 0.29
```

The review template binds those values and the controlled Markdown blob and requires a named `HUMAN_ENGINEER` to explicitly accept the product scope separation:

```text
raw/effective source PWL → Source Result
first-discontinuity point PWL / LOF → Assessment Result
derived line-report LOF → Line / Case Summary
```

The human review must also state that line aggregation is **not derived from a single first-discontinuity result** and that Source, Assessment, and Line/Case result contracts remain separate.

Even a completed result-scope review retains:

```text
productionEquationAuthorized = false
lineAggregationImplementationAuthorized = false
```

The review resolves interpretation/scope only. It does not supply or authorize a line-aggregation equation/rule.

## Relationship to numerical implementation

The promotion-readiness planner is deliberately upstream of numerical implementation.

```text
controlled source/review artifacts
        ↓
promotion prerequisite planner
        ↓
READY_FOR_INDEPENDENT_AUTHORITY_REVIEW
        ↓
independent vibration-engineer decision
        ↓
explicit authority transition, if approved
        ↓
qualification-only numerical implementation / benchmark execution
```

No code path from this planner calls the Engineering Calculation API or calculates PWL, attenuation, logarithmic source combination, T2-6, LOF, or line aggregation.

## Current expected state

Until the named human artifacts are actually completed, the UI should show the six prerequisite gates as `UNSATISFIED` and the independent vibration-engineer gate as separately required.

That state is expected and correct. The presence of templates, benchmark vectors, or source evidence alone is not a completed human review.
