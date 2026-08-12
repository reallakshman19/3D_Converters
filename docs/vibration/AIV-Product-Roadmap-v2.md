# AIV Product Roadmap v2 — Example-Driven UI, Logic, and Workflow

## Purpose

This roadmap defines the target product and implementation sequence for `VIB.AIV.ACOUSTIC` from the controlled Energy Institute worked examples.

Current authority remains unchanged:

```text
calculationState      = BLOCKED
qualificationState    = BLOCKED
engineeringAuthority  = NONE
productionEquationAuthorized = false
screeningAuthority    = NOT_AUTHORIZED
designAuthority       = false
```

The roadmap distinguishes **machine-reproducible qualification math** from **production numerical authority**. Solving a benchmark does not authorize screening or design use.

## Controlled example basis

Readable worked-example source:

```text
3D_Converters
commit 8f243592d73ccf4790d9e308a311003ce7d8f5bb
docs/Energy-Institute-AVIFF---Worked-Examples.md
blob 9f22d92eba8bdf3b67adc25a4c77a7f7d7211da8
```

Derived from the pinned Common DOCX at commit `fb549185b9b27edc2379734240320a85c5bef9f6`, blob `ceee15ed5f7f320045d5f3979024e2e8664613f2`.

Corroborating binary worked-example source:

```text
EI examples.pdf
blob 1ddef94f81bd30570d1b1f86b1d3e2acdcc17dec
```

Main EI T2.7 guidance remains the method authority once controlled human reconciliation is completed.

## Product invariant — three result scopes

### Source Result

```text
Source + Operating Case
→ raw source PWL
→ sonic SFF disposition
→ low-noise-trim reduction
→ effective source PWL
```

Required distinct fields:

```text
rawSourcePwlDb
sonicFlowFactorDb
trimReductionDb
effectiveSourcePwlDb
```

### Assessment Result

```text
Assessment + Operating Case
→ applicable sources
→ physical distance evidence
→ source contribution at point
→ simultaneous-source combination
→ T2-6 discontinuity chain
→ assessment LOF
```

### Line / Case Summary

```text
Line + Operating Case
→ assessment aggregation
→ line AIV LOF
→ controlling assessment
→ controlling source(s)
```

A D.2.3 first-discontinuity `LOF=0.29` and a derived relief-line `LOF=1.48` are different result objects and must never share a generic result field.

## Product invariant — split input ownership

### `AivSourceCsv.v2`

Key:

```text
Source Canonical ID + Operating Case
```

Owns process/device/source evidence: flow, P1/P2 basis/provenance, temperature, MW, sonic state, trim and source provenance.

### `AivAssessmentCsv.v1`

Key:

```text
Assessment Canonical ID
```

Owns discontinuity geometry/material evidence.

### `AivSourceAssessmentCsv.v1`

Key:

```text
Source + Assessment + Operating Case
```

Owns applicability, explicit physical distance/provenance and simultaneous-source grouping.

Certified topology verifies identity/connectivity only. AIV distance is never derived from SVG pixels or presentation geometry.

## Operator workflow

```text
Load controlled EI benchmark or project data
        ↓
Edit Sources
        ↓
Edit Assessments
        ↓
Edit Source → Assessment evidence
        ↓
Inspect certified topology path
        ↓
Check readiness
        ↓
Run benchmark/screening only when authority permits
        ↓
Source Results
        ↓
Assessment Results
        ↓
Line / Case Summary
        ↓
Calculation detail / provenance / export
```

The current BLOCKED workspace already supports the input/readiness/result-shell portion of this workflow.

## Frozen production-facing result contracts

```text
AivSourceResult.v1
AivAssessmentResult.v1
AivLineCaseSummary.v1
AivResultSet.v1
```

While BLOCKED, all calculated numerical fields stay `null` and `status=NOT_CALCULATED`.

Qualification scripts must not populate those product result shells.

## Qualification evidence and promotion workflow

Prerequisite gates:

```text
CONTROLLED_T2_7_HUMAN_RECONCILIATION
RECONCILE_D2_3_PUBLISHED_FLM1_ARITHMETIC
RECONCILE_WORKED_EXAMPLES_DERIVED_REPORT_RESULT_SCOPE
INDEPENDENT_SONIC_SFF6_BENCHMARK
INDEPENDENT_MULTI_SOURCE_BENCHMARK
RETAINED_WORKBOOK_RECONCILIATION
```

Separate final gate:

```text
INDEPENDENT_VIBRATION_ENGINEER_PROMOTION_REVIEW
```

The workspace can load SHA-256-bound verification artifacts and produce `READY_FOR_INDEPENDENT_AUTHORITY_REVIEW` only when all prerequisites are complete.

Even then:

```text
authorityPromotionAuthorized = false
productionEquationAuthorized = false
screeningAuthority = NOT_AUTHORIZED
designAuthority = false
```

The independent engineer review may recommend `BENCHMARK_ONLY`, require rework, or reject promotion. A separate reviewed code change must apply any authority transition.

## Qualification numerical harness

Machine-side benchmark arithmetic is now intentionally isolated under `scripts/`:

```text
scripts/aiv-qualification-math.mjs
scripts/solve-aiv-d23-qualification.mjs
scripts/solve-aiv-independent-qualification-benchmarks.mjs
```

It is not exported through the production AIV facade and is not callable from the UI or central Engineering Calculation API.

### D.2.3 solved values

```text
Relief raw source PWL       164.6851759525391 dB
Recycle raw source PWL      159.36481554007995 dB
Recycle effective PWL       129.36481554007995 dB
Relief attenuation            0.3116883116883117 dB
Relief point PWL             164.3734876408508 dB
log10(N)                       9.902567870507482
N                              7.990388037921443E9
FLM2                           0.2009306328510857
```

Two FLM1 branches remain explicit:

```text
published FLM1     1.2133               → Lf 0.3128760237 → LOF 0.29
recalculated FLM1  1.2109758194311824   → Lf 0.3131258639 → LOF 0.29
```

The final D.2.3 assessment LOF is numerically robust to the open FLM1 discrepancy. The discrepancy itself remains unresolved for production authority.

`A=0.93989`, `S=68.229`, and `B=152.207` are still retained as controlled published intermediates rather than rederived before T2.6 human reconciliation.

### Controlled Markdown PWL parity

```text
Recycle compressor discharge  129.3648155401 → 129.36 dB
Recycle compressor suction    129.0239800907 → 129.02 dB
Relief downstream line        164.6851759525 → 164.69 dB
```

The line/case LOF values are not rederived by this source-PWL solve.

### Sonic and simultaneous-source vectors

```text
Sonic SFF=6
  non-sonic PWL 156.72433464037815 dB
  sonic PWL     162.72433464037815 dB
  delta           6.0 dB

160 + 160 dB → 163.0102999566398 dB
160 + 150 dB → 160.41392685158226 dB
```

These vectors are machine-reproduced but still require named human acceptance against reviewed EI trace hashes.

## Numerical architecture after authority transition

Only after the required review/authority transition may the central engineering calculation layer implement the product kernel:

```text
validate input
→ resolve units / pressure basis / provenance
→ evaluate applicability
→ calculate raw source PWL
→ apply source modifiers
→ calculate point attenuation
→ combine simultaneous sources
→ calculate full T2-6 discontinuity result
→ aggregate line/case result
→ assess under current authority
```

The qualification helper must not simply be imported into production. The production implementation must be created/reviewed against the completed trace and authority artifacts.

## Calculation-detail target

For a selected assessment result:

```text
SUMMARY
INPUTS
SOURCE PWL
PATH / ATTENUATION
T2-6
PROVENANCE
```

When authorized, T2-6 should expose:

```text
A
S
B
log10(N)
N
Dext/dext
FLM1
N after FLM1
FLM2
N after FLM2
Lf
LOF
```

The FLM1 reconciliation disposition must remain traceable.

## Current implementation stages

| Stage | Work | Status |
|---:|---|---|
| 1–11 | authority/source/trace/errata/benchmark/workbook foundation | IMPLEMENTED; human review pending where applicable |
| 12 | split Sources / Assessments / Relationships + joined readiness | IMPLEMENTED / repository CI pending |
| 13 | editable working tables + controlled `Load EI D.2.3` | IMPLEMENTED / repository CI pending |
| 14 | Source / Assessment / Line result-contract freeze | IMPLEMENTED / repository CI pending |
| 15 | human result-scope gate, promotion planner, hashed artifacts, independent-review handoff | IMPLEMENTED / human artifacts pending |
| 16A | isolated D.2.3 + sonic + multi-source qualification math | IMPLEMENTED / focused isolated execution PASS |
| 16B | central production/qualification kernel | NOT AUTHORIZED |
| 17 | `BENCHMARK_ONLY` real product-path execution | NOT AUTHORIZED |
| 18 | production result register/detail/export | NOT_STARTED |
| 19 | independent engineering promotion decision / later SCREENING promotion | PENDING |

## Stage 16A executed validation

```text
D.2.3 solve tests
  5 pass / 0 fail

Independent sonic + multi-source tests
  3 pass / 0 fail
```

Repository-wide GitHub Actions remain unavailable because the current Actions budget condition creates jobs with no runner/steps. Focused isolated PASS must not be presented as full-repository CI PASS.

## Release quality targets before BENCHMARK_ONLY

```text
critical trace gaps                 0
unexplained numerical constants     0
silent engineering defaults         0
UI-side AIV equations               0
source/assessment scope ambiguity   0
accepted identity ambiguity         0
D.2.3 benchmark parity              100% within approved tolerances/dispositions
```

Target qualitative scores:

```text
traceability                     >= 97%
software/engineering quality     >= 95%
UI engineering / explainability  >= 95%
```

These are targets, not current claims.

## Permanent product boundary

```text
Advanced_Analysis:
AUTHOR → EDIT → VALIDATE → CERTIFY → EXPORT

3D_Converters / AIV:
IMPORT → VERIFY → JOIN → ASSESS → EXPLAIN
```

No 3D viewer, free-form topology canvas, geometry authoring runtime, click-on-model calculation flow, or geometry writeback belongs in the AIV product.
