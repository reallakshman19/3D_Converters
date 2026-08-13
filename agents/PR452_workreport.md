# PR452 — Vibration Master Source Inventory Work Report

## PR Mission Control

| Field | Current state |
|---|---|
| Mission | Finish issue #450's controlled-source **table** recovery path without manufacturing engineering values. |
| PR / branch | `#452` / `agent/vibration-master-source-inventory` |
| Original base | `main@c8aa2786e08a7669b913d0a055ad4c15c6d36b0e` |
| Current upstream main | `092e4055650f605e0b6602388158a34e487e3804` |
| Last completed stage | Stage 5D — evidence-bound table candidate recovery |
| Current stage | **Stage 5E — TABLE SEMANTIC NORMALIZATION GATE / IN PROGRESS** |
| Validation entering stage | inventory + materialization `15/15 PASS`; API bridge `10/10 PASS`; Stage 5D reconciliation `8/8 PASS` |
| Runtime boundary | This runtime cannot reach Owner `127.0.0.1:8765` or `/Common`; no live EI values are claimed here. |
| Merge status | DRAFT / MERGE NOT AUTHORIZED |

## Handover in 60 Seconds

Controlled source remains:

```text
reallaksh19/Common
EI - AVIFF Guidelines 2nd Edition.pdf
blob 9d3eccc56429411e17c07a579bdebbd13cb0bdc5
size 10,348,594
retrieval 9e11e1b4ab1ee55f1ad5fd24a8e82994a5442872
adopted provenance fb549185b9b27edc2379734240320a85c5bef9f6
```

Stage 5C implements search → explicit page selection → conversion through the merged `XML_Compare_Utilities` API and verifies the controlled source identity before review files are accepted. Stage 5D implements `reconcile-vibration-master-tables.mjs`; it accepts only supported table families, checks Git blob/page range/Markdown SHA/evidence structure, rejects ambiguous or complex tables, and emits exact strings as `TABLE_CANDIDATE_RECOVERED` with `SEMANTIC_RECONCILIATION_REQUIRED`.

### Stage 5E acceptance rule

Stage 5E must not infer engineering semantics from table layout. Normalization requires an **explicit reviewed mapping** bound to the exact Stage 5D candidate. The mapping must identify the exact `masterId`, `tableBlockId`, source Git blob, Markdown SHA and page range; optional `selectionId`; explicit row disposition; explicit source coordinate (`C1`, `C2`, …); semantic field name; value type; and unit when meaningful.

Supported value types are intentionally narrow: `string`, `decimal`, `enum`. Decimal parsing is strict finite decimal syntax only. No thousands/unit stripping, unit conversion, interpolation, nearest-row fallback, default substitution, expression evaluation, automatic header detection, automatic field naming or unit inference is allowed. Enum values require an explicit allowed-value list. Raw source strings remain attached to typed values.

A successful Stage 5E record is still not authorized engineering data:

```text
sourceState    = TABLE_MASTER_CANDIDATE_NORMALIZED
recoveryAction = QUALIFICATION_REQUIRED
engineeringAuthority = NONE
screeningAuthority   = NOT_AUTHORIZED
designAuthority      = false
```

Appendix B remains `OPTIONAL_ASSUMPTION_LIBRARY`, never a hidden default. T2.8 normalizes only if Stage 5D actually recovered a table. Curves/charts/rule-flow work stays deferred.

## Table Families

```text
EI_AVIFF.T3.SBC.FITTING_SPAN_FACTORS.v1
EI_AVIFF.T3.SBC.FIRST_SPAN_LIMITS.v1
EI_AVIFF.T3.SBC.BETWEEN_MAIN_LINES_LIMITS.v1
EI_AVIFF.T2.8.VALVE_CLOSURE_CHARACTERISTICS.v1
EI_AVIFF.T2.9.VALVE_RECOVERY_FACTORS.v1
EI_AVIFF.T4.WALL_MODIFIER.v1
EI_AVIFF.APPENDIX_B.FLUID_PROPERTY_DEFAULTS.v1
```

## Authority Freeze

```text
engineeringAuthority = NONE
screeningAuthority   = NOT_AUTHORIZED
designAuthority      = false
```

## Mission Status

| Work item | Status |
|---|---|
| Source identity/equivalence | VALIDATED |
| Inventory/materializer | VALIDATED |
| API search/conversion bridge | VALIDATED `10/10` |
| Table candidate reconciliation | VALIDATED `8/8` |
| Table semantic normalization | **IN PROGRESS** |
| Live controlled EI table population | ENVIRONMENT_BLOCKED in this runtime |
| T3 curves | DEFERRED |
| Rule/flowcharts | DEFERRED |
| Authority promotion | REJECTED / separate governance event |

## Engineering Item Register

| ID | Type | Status | Summary |
|---|---|---|---|
| IMP-006 | Improvement | IN_PROGRESS | Source-bound explicit semantic mapping → typed table candidates. |
| RISK-003 | Risk | ACTIVE | Live source API is outside this runtime. |
| RISK-007 | Risk | ACTIVE | Semantic labels/units/types could be invented if inferred from layout; Stage 5E forbids inference. |
| DEC-006 | Decision | ACCEPTED | Semantic meaning comes only from explicit reviewed mapping bound to exact source evidence. |
| DEC-005 | Decision | ACCEPTED | Chart/rule work remains paused until table work closes. |

## Stage Roadmap

Stages 1–5D are implemented as recorded in prior commits. **Stage 5E is now open.** It will add only:

- `scripts/normalize-vibration-master-tables.mjs`
- `tests/vibration-master-table-normalization.test.mjs`
- one package operator command
- one release-manifest test entry
- this living report

No `.github/workflows/*` changes are authorized. No real EI values will be embedded in software tests.

## Engineering Invariants

- exact controlled source identity is authoritative;
- no mirror-derived values or benchmark reverse engineering;
- no automatic page/table/header/field/unit/type inference;
- no numeric cleanup beyond strict explicitly requested decimal parsing;
- no unit conversion/interpolation/nearest-row/default substitution;
- mapping identity must match candidate Git blob, Markdown SHA, page range and table block;
- raw source strings remain preserved beside typed values;
- Appendix B remains optional assumptions only;
- curves/charts/rules remain out of scope;
- authority remains `NONE / NOT_AUTHORIZED / false`.

## Validation Ledger

| Validation | Status |
|---|---|
| Inventory + materialization | PASS `15/15` |
| API bridge | PASS `10/10` |
| Stage 5D table reconciliation | PASS `8/8` |
| Stage 5E normalization | PENDING |
| Live EI table values | NOT_RUN here |
| Full release suite | NOT_CLAIMED |

## Next-Agent Handover

Start with Stage 5E explicit semantic normalization and synthetic fail-closed tests. Do **not** begin chart digitization or rule/flow extraction. After the software gate passes, a source-capable runtime must execute API discovery/conversion → reconciliation → reviewed mapping → normalization against the controlled blob. Merge authorization remains NONE.
