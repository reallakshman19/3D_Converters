# PR444 Work Report

## PR Mission Control

```text
Mission              Deliver a traceable, example-driven AIV product architecture for VIB.AIV.ACOUSTIC
Source task / issue  #441
PR number            #444
Branch               agent/aiv-traceable-table-ui-foundation
Base commit          243042fba24915ae7b2734556cf2d28c1b5425b7
Current HEAD         f4511cc88faa4e8c1f32dd447fee95d1e333f62e at Stage-12 source completion
PR status            DRAFT / OPEN / MERGEABLE
Current stage        Stage 12 — source implementation complete; executable validation pending
Last completed stage Stage 11 — controlled worked-example Markdown integration
Engineering status   Authority remains BLOCKED; example-driven input model is now implemented at source level
Validation status    PARTIAL: focused tests committed, but not executed in this environment
Current blocker      No executable current-head validation plus required human EI/FLM1/result-scope/benchmark/workbook reconciliation
Exact next action    Run `npm run verify:aiv-input-model` in a normal checkout, then begin Stage 13 editable working tables + controlled D.2.3 loader
```

## Handover in 60 Seconds

### What is now true

- `VIB.AIV.ACOUSTIC` remains fully BLOCKED with no screening/design authority.
- `docs/vibration/AIV-Product-Roadmap-v2.md` is the target UI/logic/workflow roadmap.
- The target input model is no longer one combined source+assessment row.
- Production-consumed split contracts now exist:
  - `AivSourceCsv.v2` — Source + Operating Case process/device evidence;
  - `AivAssessmentCsv.v1` — welded assessment geometry/material evidence;
  - `AivSourceAssessmentCsv.v1` — applicability, physical distance, simultaneous-source group and relationship provenance.
- Readiness joins those contracts explicitly and fails closed on missing joins, missing distance provenance, unresolved applicability, topology identity/path ambiguity, mixed main-dimension units, unresolved trim/sonic/material evidence, and other controlled gaps.
- One source can map to multiple assessments without duplicating process data.
- Multiple sources can map to one assessment through an explicit simultaneous-source group.
- Certified topology still provides identity/connectivity only; `topology.physicalDistanceMm` remains non-authoritative/null.
- The UI now imports topology + Sources + Assessments + Source→Assessment files and exposes three templates.
- `AivSourceCaseCsv.v1` remains only as a transitional/migration contract; it is no longer the target readiness workflow.

### What is being worked on

Stage 12 is source-complete but not executable-validated. Stage 13 should implement the real editable operator tables and controlled D.2.3 loader using the split contracts.

### What remains unfinished

- execute Stage-12 focused tests in a normal checkout;
- editable Sources / Assessments / Source→Assessment working tables;
- controlled `Load EI D.2.3` workflow and benchmark-modified invalidation;
- Source Result / Assessment Result / Line Summary contract freeze;
- human engineering reconciliation gates;
- qualification-only numerical kernel;
- BENCHMARK_ONLY real-path execution;
- facility result register/detail/export;
- independent vibration-engineer promotion review.

### What must not be assumed

- no production AIV equation is authorized;
- no benchmark/screening numerical execution is currently authorized;
- no legacy workbook formula is EI authority;
- topology connectivity does not provide physical AIV distance;
- line-report LOF and specific discontinuity LOF are not interchangeable;
- committed tests have not run in this environment;
- GitHub Actions failures seen on this PR are no-start budget/capacity conditions, not executed-test failures.

### Highest-risk remaining item

Human engineering reconciliation of the complete T2.7/T2-6 method and result-scope semantics, especially the D.2.3 FLM1 discrepancy and line-summary aggregation interpretation.

### Exact next action

In a normal repository checkout run:

```bash
npm install
npm run verify:aiv-input-model
```

Fix any source/test regressions before starting Stage 13.

## Mission and Engineering Intent

Build AIV as a defensible downstream engineering assessment product using controlled Energy Institute guidance/worked examples, certified topology identity, explicit process/device/geometry/relationship evidence, and central numerical execution only after qualification.

Permanent product boundary:

```text
Advanced_Analysis:
AUTHOR → EDIT → VALIDATE → CERTIFY → EXPORT

3D_Converters / AIV:
IMPORT → VERIFY → JOIN → ASSESS → EXPLAIN
```

Explicit non-goals: 3D/model authoring, free-form topology canvas, pixel-derived distance, geometry writeback, universal risk/confidence scores, pass/safe claims without authority, or workbook-formula authority.

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---:|---|---:|---|
| Authority freeze / issue #441 routing | P0 | DONE | 1 | pending-definitions / PR authority |
| Qualification UI + topology evidence | P0 | IMPLEMENTED | 1–2 | AIV tab/views + topology graph |
| Legacy combined `AivSourceCaseCsv.v1` | P1 | DEFERRED | 2 | retained for migration only |
| EI T2.7 trace + official errata evidence | P0 | IMPLEMENTED | 3–6 | controlled trace/reconciliation assets |
| D.2.3 benchmark / FLM1 evidence | P0 | IMPLEMENTED | 7–8 | published chain + human disposition gate |
| Retained workbook migration evidence | P1 | IMPLEMENTED | 9 | formula inventory/reconciliation gate |
| Sonic/multi-source qualification vectors | P1 | IMPLEMENTED | 10 | human acceptance pending |
| Controlled worked-example Markdown | P0 | ACCEPTED | 11 | PR #445 / blob `9f22d92...` |
| Example-driven roadmap | P0 | DONE | 12 | `AIV-Product-Roadmap-v2.md` |
| Split Sources / Assessments / Relationships | P0 | IMPLEMENTED | 12 | v2/v1 split contracts + readiness/UI |
| Stage-12 executable validation | P0 | BLOCKED | 12 | no local checkout/network; Actions budget prevents workflow start |
| Editable working tables + D.2.3 loader | P0 | NOT_STARTED | 13 | roadmap Stage 2 |
| Result-contract freeze | P0 | NOT_STARTED | 14 | roadmap Stage 3 |
| Human engineering reconciliation closure | P0 | BLOCKED | 15 | named engineer required |
| Numerical AIV kernel | P0 | BLOCKED | 16 | qualification prerequisite |
| BENCHMARK_ONLY real-path execution | P0 | BLOCKED | 17 | kernel + promotion prerequisite |
| Facility results / export | P1 | NOT_STARTED | 18 | roadmap Stage 7 |
| Independent promotion review | P0 | BLOCKED | 19 | human vibration engineer |

## Engineering Item Register

| ID | Type | Priority | Status | Summary | Current PR? |
|---|---|---:|---|---|---|
| DEC-001 | Decision | P0 | ACCEPTED | Keep authority BLOCKED until explicit independent promotion | Yes |
| DEC-002 | Decision | P0 | ACCEPTED | Advanced_Analysis authors; 3D_Converters assesses downstream | Yes |
| DEC-003 | Decision | P0 | ACCEPTED | Source Result, Assessment Result and Line Summary are distinct scopes | Yes |
| ISS-001 | Defect | P0 | IMPLEMENTED | Combined source+assessment target model replaced by split ownership | Yes |
| RISK-001 | Risk | P0 | OPEN | Published D.2.3 FLM1 differs from displayed-input recalculation | Yes |
| RISK-002 | Risk | P0 | OPEN | Worked-example line LOF can be confused with discontinuity LOF | Yes |
| RISK-003 | Risk | P1 | OPEN | Current-head tests cannot execute here; Actions budget blocks workflow start | Yes |
| QST-001 | Question | P0 | OPEN | Final FLM1 benchmark disposition/tolerance | Yes |
| QST-002 | Question | P0 | OPEN | Exact assessment→line aggregation semantics | Yes |
| IMP-001 | Improvement | P0 | IMPLEMENTED | Split source/assessment/relationship input and readiness model | Yes |
| IMP-002 | Improvement | P0 | NOT_STARTED | Load D.2.3 into same visible working tables as project data | Yes |
| IMP-003 | Improvement | P1 | NOT_STARTED | Move qualification matrices behind Evidence/detail workflow | Yes |

## Engineering Decisions and Invariants

### Authority invariant

```text
calculationState      = BLOCKED
qualificationState    = BLOCKED
engineeringAuthority  = NONE
screeningAuthority    = NOT_AUTHORIZED
designAuthority       = false
```

### Result-scope invariant

- raw/effective source PWL → Source Result;
- point/combined PWL + T2-6 LOF → Assessment Result;
- line-level LOF → Line/Case Summary with controlling assessment/source identity.

### Input-ownership invariant

- Source input owns process/device evidence only;
- Assessment input owns geometry/material evidence only;
- Relationship input owns applicability, physical distance and simultaneous-source grouping;
- no table may silently borrow engineering authority from another scope.

### Physical-distance invariant

Certified topology verifies Canonical IDs and connectivity/path evidence. Physical AIV distance must have explicit engineering value/unit/source/revision and is never inferred from SVG or presentation geometry.

### UI numerical invariant

No AIV equation, coefficient, threshold, pressure conversion, attenuation, logarithmic source combination, T2-6 calculation, line aggregation, or pass/safe classification belongs in UI/controller code.

## Stage 12 — Example-Driven Product/Input-Model Pivot

### Current truth before stage

`AivSourceCaseCsv.v1` repeated source process data for every source/assessment relationship and made many-to-many engineering relationships awkward.

### Objective

Split source, assessment and relationship ownership; make readiness join them explicitly; expose the split in the real AIV UI without adding numerical authority.

### Implementation performed

Added:

```text
converters/vibration/aiv/aiv-tabular-common.js
converters/vibration/aiv/source-csv.js
converters/vibration/aiv/assessment-csv.js
converters/vibration/aiv/source-assessment-csv.js
docs/vibration/AIV-Product-Roadmap-v2.md
agents/PR444_workreport.md
```

Updated:

```text
converters/vibration/aiv/aiv-readiness.js
converters/vibration/aiv/aiv-readiness-tables.js
converters/vibration/aiv/index.js
tabs/vibration-aiv-readiness-view.js
tabs/vibration-aiv-qualification-tab.js
tests/vibration-aiv-readiness.test.mjs
package.json
```

Behavior now enforced:

- exact-header split parsers;
- duplicate source/case, assessment, and relationship keys rejected;
- source process data is not duplicated per assessment;
- assessment geometry/material is independent of source process evidence;
- relationship owns physical distance and provenance;
- one source → multiple assessments supported;
- multiple sources → one assessment supported;
- missing source/assessment joins fail closed;
- applicable relationship requires physical distance + source/revision;
- `NOT_APPLICABLE` is explicit and does not require distance, but Canonical IDs must still exist in certified topology;
- mixed main assessment dimension units fail closed before numeric comparison;
- source/assessment/relationship record revision/ID gaps surface as readiness issues;
- sonic/non-gas/closed-source qualification boundaries remain method gaps;
- numerical execution remains false.

### Deviations from plan

No editable working-table runtime or D.2.3 loader was added in Stage 12; those remain Stage 13 so the input ownership model is frozen first.

### Validation performed

```text
GitHub connector source inspection             PASS
Exact branch file round-trip inspection        PASS
Local clone / node test execution              NOT_RUN
npm run verify:aiv-input-model                 NOT_RUN
GitHub Actions current-head execution          NOT_RUN
```

Local clone reason: this container cannot resolve `github.com`, so a real checkout could not be obtained. GitHub Actions reason: repository Actions budget prevents job start.

Focused test assets committed for:

- split template ownership;
- source parser independence from assessment;
- assessment geometry independence from source process data;
- physical-distance/applicability/simultaneous-source relationship ownership;
- ready split evidence with no numerical authorization;
- one source → multiple assessments;
- multiple sources → one assessment;
- distance provenance failures;
- missing join failures;
- gauge reference-pressure requirements;
- sonic method gap;
- explicit `NOT_APPLICABLE`;
- UI split imports/no Run path;
- no central numerical execution in readiness/UI.

### Stage decision

`PARTIAL` — source implementation and focused regression assets are complete; executable validation remains unavailable.

## Changed-File Ledger — Stage 12

| File | Purpose | Engineering-sensitive? | Validation |
|---|---|---|---|
| `docs/vibration/AIV-Product-Roadmap-v2.md` | Target UI/logic/workflow roadmap | Yes | source review |
| `agents/PR444_workreport.md` | Durable PR handoff | Yes | source review |
| `aiv-tabular-common.js` | Shared strict tabular helpers | Yes | source review; test pending |
| `source-csv.js` | Source+case process/device contract | Yes | focused test pending |
| `assessment-csv.js` | Assessment geometry/material contract | Yes | focused test pending |
| `source-assessment-csv.js` | Relationship/distance/applicability contract | Yes | focused test pending |
| `aiv-readiness.js` | Explicit joins and fail-closed readiness | Yes | focused test pending |
| `aiv-readiness-tables.js` | Split-table import envelope | Yes | focused test pending |
| `index.js` | Public AIV exports | No numerical authority | source review |
| `vibration-aiv-readiness-view.js` | Split input/readiness UI | Yes | static test pending |
| `vibration-aiv-qualification-tab.js` | Split import/template controller | Yes | static test pending |
| `vibration-aiv-readiness.test.mjs` | Stage-12 regression assets | Test | NOT_RUN |
| `package.json` | `verify:aiv-input-model` command | Build/test | NOT_RUN |

A full PR-wide changed-file reconciliation is still required before closure because the PR predates this work report.

## Validation and Evidence Ledger

### Software Validation

| Validation | Status | Last HEAD | Evidence |
|---|---|---|---|
| Connector source/file inspection | PASS | Stage-12 head | fetched current files from branch |
| `npm run verify:aiv-input-model` | NOT_RUN | Stage-12 head | checkout unavailable |
| Full repository tests | NOT_RUN | Stage-12 head | checkout/dependencies unavailable |
| Controlled-source GitHub workflow | NOT_RUN | prior/current heads | jobs do not start because Actions budget prevents use |

### Engineering Validation

| Property | Status | Evidence |
|---|---|---|
| D.2.3 published source/result evidence | ACCEPTED_AS_BENCHMARK_EVIDENCE | controlled worked-example sources |
| Three result scopes | ARCHITECTURE_ACCEPTED | roadmap DEC-003 |
| Split input ownership | SOURCE_IMPLEMENTED | Stage-12 contracts/readiness |
| Physical-distance authority | SOURCE_IMPLEMENTED | relationship contract + topology null-distance invariant |
| FLM1 arithmetic parity | OPEN | published 1.2133 vs recalculation |
| Line-summary aggregation semantics | OPEN | human method interpretation required |
| Sonic SFF=6 benchmark | HUMAN_ACCEPTANCE_REQUIRED | independent vector exists |
| Multi-source benchmark | HUMAN_ACCEPTANCE_REQUIRED | independent vectors exist |
| Legacy workbook formula authority | REJECTED | migration evidence only |

### Explicitly Not Validated

- runtime execution of Stage-12 tests;
- production AIV equations;
- automatic sonic-state determination;
- assessment-to-line numerical aggregation;
- benchmark/screening numerical workflow;
- screening/design authority.

## Known / Deferred Work and Recommended Forward Sequence

1. **Execute Stage-12 tests** — prerequisite for trusting the split contract implementation.
2. **Stage 13: editable working tables + controlled D.2.3 loader** — turns the new model into an operator-visible workflow.
3. **Stage 14: freeze Source/Assessment/Line result contracts** — prevents numerical code from recreating result-scope ambiguity.
4. **Close human engineering reconciliation** — prerequisite for equation transcription.
5. **Qualification-only central kernel** — no UI equations; same kernel for benchmark/project/batch.
6. **BENCHMARK_ONLY real-path parity** — exact D.2.3 through production path, intermediate-by-intermediate comparison.
7. **Facility result workspace/export** — Source Results, Assessment Results, Line Summary, drill-down evidence.
8. **Independent vibration-engineer promotion review** — only then consider BENCHMARK_ONLY; SCREENING is a later separate decision.

## Stage Execution Log

### Stage 12 — 2026-08-12

- Roadmap created.
- Missing PR work report corrected.
- Split contracts implemented and wired to readiness/UI.
- Fail-closed unit/identity/provenance seams hardened during source review.
- Focused regression assets and package verification command added.
- Local clone attempt failed because outbound DNS to GitHub is unavailable.
- Stage recorded PARTIAL rather than falsely claiming executable PASS.

## Process Notes / Lessons Learned

- Worked examples can contain several legitimate `LOF` scopes; result scope must be explicit in both contracts and UI.
- Source process evidence and assessment geometry have different authorities and should not share one record.
- Many-to-many source/assessment relationships need a first-class relationship object, not duplicated source rows.
- Physical distance is relationship evidence, not topology presentation metadata.
- Parser errors should be reserved for malformed structure/types; reviewable provenance gaps are more useful as readiness issues.

## Next-Agent Handover

```text
Current stopping point
  Stage 12 source implementation complete; executable validation pending.

PR / branch / HEAD
  #444 / agent/aiv-traceable-table-ui-foundation / f4511cc88faa4e8c1f32dd447fee95d1e333f62e

Start here
  docs/vibration/AIV-Product-Roadmap-v2.md
  converters/vibration/aiv/source-csv.js
  converters/vibration/aiv/assessment-csv.js
  converters/vibration/aiv/source-assessment-csv.js
  converters/vibration/aiv/aiv-readiness.js
  tests/vibration-aiv-readiness.test.mjs

Do not redo
  EI source pins, errata evidence, D.2.3 evidence, workbook inventory, sonic/multi-source evidence, topology graph foundation, split input-model design.

Do not assume
  tests passed, numerical authority, FLM1 reconciliation, line aggregation semantics, physical distance from topology.

Known failing checks
  none established by executed tests; current environment cannot run them.

Validation still required
  npm install
  npm run verify:aiv-input-model
  later full-repo/browser validation

Open QST items
  QST-001 FLM1 disposition
  QST-002 assessment→line aggregation semantics

Important deferred improvements
  IMP-002 controlled D.2.3 loader / editable tables
  IMP-003 Evidence-tab UI demotion of qualification matrices

Highest-risk remaining item
  human engineering reconciliation before numerical transcription.

Exact next recommended action
  Run Stage-12 tests in a normal checkout. If green, implement Stage 13 using the split contracts; do not add numerical equations yet.
```
