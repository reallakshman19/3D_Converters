# AIV Product Roadmap v2 — Example-Driven UI, Logic, and Workflow

## Purpose

This roadmap replaces the earlier qualification-framework-first implementation sequence for `VIB.AIV.ACOUSTIC` with an operator/product sequence derived from the controlled Energy Institute worked examples and the existing table-first vibration product architecture.

The permanent engineering authority boundary remains unchanged until the required qualification gates are closed:

```text
calculationState      = BLOCKED
qualificationState    = BLOCKED
engineeringAuthority  = NONE
screeningAuthority    = NOT_AUTHORIZED
designAuthority       = false
```

This document defines product architecture and implementation order. It does not itself authorize any AIV equation, threshold, screening decision, or design use.

## Controlled example basis

Readable worked-example reference:

```text
3D_Converters
commit 8f243592d73ccf4790d9e308a311003ce7d8f5bb
docs/Energy-Institute-AVIFF---Worked-Examples.md
Git blob 9f22d92eba8bdf3b67adc25a4c77a7f7d7211da8
```

The Markdown was produced by PR #445 from:

```text
reallaksh19/Common
commit fb549185b9b27edc2379734240320a85c5bef9f6
Energy-Institute-AVIFF---Worked-Examples.doc.docx
Git blob ceee15ed5f7f320045d5f3979024e2e8664613f2
```

PR #445 recorded full non-empty Word text-node coverage (`3,089 / 3,089`) and source-order Markdown transcription.

Corroborating binary worked-example source:

```text
EI examples.pdf
Git blob 1ddef94f81bd30570d1b1f86b1d3e2acdcc17dec
```

Main EI T2.7 guidance remains separately controlled and is the engineering method authority once reviewed/reconciled.

## Product invariant: three result scopes

The worked examples require three distinct engineering scopes. They must never be collapsed into one generic `LOF` result.

### 1. Source result

A pressure-reducing source produces acoustic power for one operating case.

```text
Source + Case
→ raw EI source PWL
→ sonic flow factor disposition
→ manufacturer low-noise trim disposition
→ effective source PWL
```

Required product terminology:

- `rawSourcePwlDb`
- `sonicFlowFactorDb`
- `trimReductionDb`
- `effectiveSourcePwlDb`

Do not label both pre-trim and post-trim values simply `PWL`.

### 2. Assessment result

A welded discontinuity receives one or more attenuated acoustic source contributions.

```text
Assessment + Case
→ applicable source contributions
→ source-to-assessment physical distance evidence
→ point PWL per source
→ simultaneous-source combination where applicable
→ T2-6 discontinuity calculation
→ assessment LOF
```

### 3. Line/case summary

A line/case summary aggregates assessment results and identifies the controlling engineering result.

```text
Line + Case
→ line AIV LOF
→ controlling assessment
→ controlling source(s)
→ assessment count / evidence
```

This scope separation is mandatory to prevent false comparison of values such as a worked-example line-level AIV LOF and a specific D.2.3 first-discontinuity LOF.

## Product invariant: separate input ownership

The v1 concept `Source + Assessment + Case in one source-case CSV row` is transitional and must not be the target architecture.

The target workspace has three independent engineering tables plus certified topology:

### AIV Sources

Key: `Source Canonical ID + Operating Case`

Owns:

- source device identity/type/state;
- phase;
- mass flow;
- upstream/downstream pressure including basis;
- explicit gauge reference pressure provenance;
- upstream temperature;
- molecular weight;
- sonic-state evidence;
- low-noise-trim state/reduction/vendor provenance;
- process record provenance.

It does **not** own assessment identity or assessment geometry.

### AIV Assessments

Key: `Assessment Canonical ID`

Owns:

- discontinuity type;
- main OD/ID/wall thickness;
- branch OD/wall thickness where relevant;
- material / duplex disposition;
- geometry/material provenance.

Topology supplies canonical identity, line/tag context, and connectivity evidence. Geometry values must not be inferred from SVG presentation.

### Source → Assessment Evidence

Key: `Source Canonical ID + Assessment Canonical ID + Operating Case`

Owns:

- engineering physical distance and unit;
- distance source/revision;
- applicability disposition;
- simultaneous-source grouping;
- relationship provenance.

Certified topology verifies connectivity/path identity only. Physical AIV distance is never derived from SVG pixels or presentation geometry.

## Target operator workflow

```text
Load controlled EI benchmark or import project data
        ↓
Edit / inspect AIV Sources
        ↓
Edit / inspect AIV Assessments
        ↓
Edit / inspect Source → Assessment Evidence
        ↓
Inspect certified topology path
        ↓
Check readiness
        ↓
Run benchmark or screening only when authority permits
        ↓
Source Results
        ↓
Assessment Results
        ↓
Line Summary
        ↓
Calculation detail / provenance / export
```

The product remains table-first. `Advanced_Analysis` remains the upstream model/topology author; `3D_Converters` remains downstream import/verify/join/assess/explain.

## UI architecture

### Primary workspace

The primary AIV screen should emphasize engineering inputs and results, not qualification matrices.

Recommended order:

1. Authority banner
2. Controlled benchmark selector (`Load EI D.2.3` when BENCHMARK_ONLY is available)
3. Working input tables
   - Sources
   - Assessments
   - Source → Assessment
4. Readiness summary
5. Run action, gated by authority
6. Result tabs
   - Source Results
   - Assessment Results
   - Line Summary
7. Selected result detail
8. Evidence / Qualification tab

Qualification trace matrices, errata records, workbook reconciliation, and human-review status remain available but move out of the main operator path.

### Readiness vocabulary

Operator-facing readiness should converge toward:

```text
NOT_READY
METHOD_GAP
READY_FOR_BENCHMARK
READY_FOR_SCREENING
```

While authority is still `BLOCKED`, internal qualification code may continue to report `READY_FOR_QUALIFICATION`, but the target product vocabulary must reflect the action that is actually permitted.

### Actionable readiness groups

Each row/detail should expose:

```text
TOPOLOGY
PROCESS
SOURCE DEVICE
ASSESSMENT
RELATIONSHIP / DISTANCE
METHOD
```

Each failed group must identify the exact missing/conflicting field or evidence source.

## Numerical architecture after qualification

Production numerical logic must be small, pure, traceable stages behind the central Engineering Calculation API:

```text
validate AIV input
→ resolve units / pressure basis / provenance
→ evaluate applicability
→ calculate raw source PWL
→ apply source modifiers
→ calculate point attenuation
→ combine simultaneous sources
→ calculate discontinuity LOF
→ aggregate line/case result
→ assess under current authority
```

UI modules must not contain AIV equations, constants, thresholds, pressure conversions, attenuation logic, dB summation, T2-6 logic, or pass/safe classification.

## Target result contracts

### Source result

```js
{
  sourceCanonicalId,
  caseId,
  rawSourcePwlDb,
  sonicFlowFactorDb,
  trimReductionDb,
  effectiveSourcePwlDb,
  thresholdBranch,
  trace
}
```

### Assessment result

```js
{
  assessmentCanonicalId,
  caseId,
  contributingSources,
  pathEvidence,
  physicalDistance,
  sourceContributionsAtPoint,
  combinedPointPwlDb,
  geometry,
  t26Intermediates,
  lof,
  trace
}
```

### Line/case summary

```js
{
  line,
  caseId,
  lof,
  controllingAssessmentCanonicalId,
  controllingSourceCanonicalIds,
  assessmentCount,
  trace
}
```

## Calculation-detail UI

For a selected assessment result, expose tabs/sections:

```text
SUMMARY
INPUTS
SOURCE PWL
PATH / ATTENUATION
T2-6
PROVENANCE
```

When qualified, T2-6 detail should expose source-justified intermediates such as:

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

The D.2.3 published FLM1 arithmetic discrepancy must remain visible until formally reconciled; it must never be silently normalized in production code.

## Benchmark workflow

The benchmark workflow should reuse the same visible inputs and numerical path as project data.

```text
Load EI D.2.3
→ populate working tables
→ Check readiness
→ Run benchmark
→ compare published vs calculated intermediates/results
```

If the operator edits any benchmark input:

```text
Official parity = NOT_APPLICABLE_INPUTS_MODIFIED
```

The original published values may remain visible as reference, but an edited case is no longer an exact official parity test.

Benchmark comparison should include important intermediates, not final LOF only.

## Simultaneous sources

One assessment may receive multiple active sources. The relationship table therefore supports simultaneous-source grouping.

Target assessment detail:

```text
Source A → point contribution
Source B → point contribution
...
Combined point PWL
```

Source order must not affect the combined result.

## Implementation stages

### Stage 1 — Input-model pivot

Status: **IN_PROGRESS in PR #444**

- introduce separate `AivSourceCsv`, `AivAssessmentCsv`, and `AivSourceAssessmentCsv` contracts;
- update readiness to join the three contracts explicitly;
- update qualification UI imports/templates to the split model;
- keep the old combined `AivSourceCaseCsv.v1` only as transitional/migration evidence until removed deliberately;
- no numerical code.

Acceptance:

- one source may map to multiple assessments without duplicated process data;
- one assessment may receive multiple sources;
- physical distance has explicit engineering provenance;
- readiness fails closed on missing source/assessment/link joins.

### Stage 2 — Real operator working tables + controlled benchmark loader

Status: **NOT_STARTED**

- visible editable Sources table;
- visible editable Assessments table;
- visible editable Source → Assessment table;
- `Load EI D.2.3` populates the same tables;
- edits invalidate exact benchmark parity;
- selected relationship shows certified topology path;
- no numerical execution while method authority is BLOCKED.

### Stage 3 — Result-contract freeze

Status: **NOT_STARTED**

Freeze immutable Source Result, Assessment Result, and Line Summary contracts before implementing equations.

### Stage 4 — Engineering reconciliation closure

Status: **IN_PROGRESS / HUMAN_REVIEW_REQUIRED**

Close:

- controlled T2.7 human reconciliation;
- official page-61 errata disposition;
- D.2.3 FLM1 arithmetic disposition;
- worked-examples derived report result-scope reconciliation;
- sonic SFF=6 independent benchmark acceptance;
- simultaneous-source benchmark acceptance;
- retained-workbook reconciliation.

### Stage 5 — Qualification-only numerical kernel

Status: **BLOCKED BY STAGE 4**

Implement the qualified numerical stages in the engineering calculation layer only. No UI equations.

### Stage 6 — BENCHMARK_ONLY real-path execution

Status: **BLOCKED**

- exact D.2.3 benchmark uses the same production kernel/project path;
- compare intermediate values and final outputs;
- single and batch execution use the same kernel;
- edited benchmark is a qualification trial, not official parity.

### Stage 7 — Facility result workspace + export

Status: **NOT_STARTED**

Implement Source Results, Assessment Results, Line Summary, drill-down evidence, and controlled export.

### Stage 8 — Independent engineering review and authority promotion

Status: **BLOCKED**

Only independent vibration-engineer review may support promotion from `BLOCKED` to `BENCHMARK_ONLY`. `SCREENING` is a later explicit authority promotion.

## Existing PR #444 assets to retain

- certified topology/path identity and ambiguity fail-closed behavior;
- strict P1/P2 pressure-basis/provenance controls;
- low-noise-trim provenance requirements;
- EI T2.7 trace registry;
- page-61 official errata evidence;
- D.2.3 published benchmark evidence;
- exact worked-example/DOCX/Markdown source pins;
- retained workbook inventory/reconciliation controls;
- independent sonic and multi-source qualification vectors;
- inline `Advanced_Analysis` engineering glyphs;
- no UI-side numerical engineering logic.

## Architecture to retire or demote

- combined source+assessment source-case record as target product model;
- qualification matrices as the primary user workflow;
- generic `PWL` labels that do not distinguish raw/effective/point values;
- any result contract that does not declare its scope;
- any future UI-derived AIV physical distance;
- any direct legacy-workbook formula authority.

## Release quality targets

Before BENCHMARK_ONLY promotion:

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
traceability                         >= 97%
software/engineering quality         >= 95%
UI engineering / explainability      >= 95%
```

These are release targets, not confidence scores and not claims about the current implementation.

## Permanent product boundary

```text
Advanced_Analysis:
AUTHOR → EDIT → VALIDATE → CERTIFY → EXPORT

3D_Converters / AIV:
IMPORT → VERIFY → JOIN → ASSESS → EXPLAIN
```

No 3D viewer, free-form topology canvas, geometry authoring runtime, click-on-model calculation flow, or geometry writeback belongs in this AIV product.
