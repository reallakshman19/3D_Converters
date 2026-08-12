# PR438 — FIV / FIT API-First Vibration Work Report

## PR Mission Control

| Field | Current state |
|---|---|
| Mission | Establish a controlled API-first FIT vertical and table-only vibration data pipeline without granting unqualified screening/design authority. |
| Source task / issue | Owner requests 2026-08-11/12; issue #429; deep-research report; Common `CodingRules.md` pinned at `43eccc27967ecec7d67513c08255398b496be5ce`. |
| PR number | #438 |
| Branch | `agent/fiv-fit-roadmap-foundation` |
| Base commit | `37c37d770ba47ebb3152679265896de4a943c8b0` |
| PR status | OPEN / DRAFT / mergeable at last check |
| Current stage | Stage 16 — IN_PROGRESS: Vibration Integrity dataset assembly from table exchange + operating cases + enrichment |
| Last completed stage | Stage 15 — COMPLETE FOR IMPLEMENTATION / PARTIAL FOR REAL-XLSX VALIDATION |
| Engineering status | FIT remains `BENCHMARK_ONLY`; screening/design NOT AUTHORIZED. Data pipeline carries no method authority. |
| Validation status | EI/domain focused PASS; coverage/candidate smoke PASS; Stage 15 exchange smoke PASS with SheetJS-compatible fixture; actual repository `xlsx@0.18.5` regression NOT_RUN in this runtime. |
| Current blocker | Full repository regression, direct full T2.2 licensed-page review, independent vibration-engineer approval; none block non-authoritative dataset assembly. |
| Exact next action | Implement deterministic `VibrationIntegrityDataset.v1` assembly with exact line/canonical joins, explicit quantity units/provenance, fail-closed orphan/duplicate handling, and limited-CSV opt-in only. |

### Handover in 60 Seconds

**FIT calculation state:** stable ID `VIB.FIV.FLOW_TURBULENCE`; benchmark-only; EI Appendix D D2/D4 reference parity; strict/screening execution blocked.

**Qualification metadata:** successful FIT results carry `FIT-REFERENCE-COVERAGE-V1` and `FIT-SCREENING-CANDIDATE-V1`. Neither can authorize screening.

**Table integration boundary:** no 3D/canvas/viewer. Advanced_Analysis owns 3D EDIT; vibration consumes table exports only.

**Stage 15 delivered:**

```text
converters/vibration/exchange/schema.js
converters/vibration/exchange/parse.js
converters/vibration/exchange/index.js
converters/vibration/index.js
tests/vibration-table-exchange.test.mjs
docs/vibration/VibrationTableExchange-v1.md
```

Current production-capable source format is the existing five-sheet `TopologyEditTableHumanExport.v1` XLSX. Current CSV is Elements-only and explicitly returns `LIMITED_ELEMENTS_ONLY`; callers requiring complete provenance get `VIBRATION_TABLE_EXCHANGE_INCOMPLETE`.

**Stage 15 validation:** a local SheetJS-compatible fixture passed five-sheet workbook parsing, sheet-order invariance, byte-parser path, quoted CSV parsing and complete-exchange rejection. The actual `xlsx@0.18.5` package is not installed in this execution container, so the committed real-package test is still `NOT_RUN`.

**Highest data risk:** dropping or inventing identity/provenance while joining process cases and vibration-specific enrichment.

## Governing Principles

1. No 3D/canvas/viewer integration in vibration.
2. `Canonical ID` from 3D EDIT is the downstream element identity.
3. Line is the operating-case join key unless a later controlled contract provides a more specific authority.
4. Operating cases and vibration enrichment retain explicit source provenance; no silent defaults.
5. Missing engineering quantities remain missing and are handled later by mechanism applicability/preflight.
6. Limited CSV requires explicit opt-in; it never becomes a complete exchange by inference.
7. Data assembly authority is separate from FIT method qualification.
8. Evidence/candidate metadata cannot grant screening authority.

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---:|---|---:|---|
| FIT kernel / central benchmark path | P0 | VALIDATED | 1–12 | source + EI/hand cases |
| Evidence/candidate metadata | P0 | IMPLEMENTED | 13–14 | non-authorizing runtime evidence |
| Table exchange parser | P0 | IMPLEMENTED | 15 | XLSX/CSV contract parser |
| Table exchange real-package regression | P0 | NOT_RUN | 15 | `xlsx@0.18.5` unavailable locally |
| Vibration dataset assembly | P0 | IN_PROGRESS | 16 | current stage |
| Facility workflow/API | P1 | NOT_STARTED | Forward | after dataset assembly |
| Full repo regression | P0 | BLOCKED | Forward | Actions billing / no checkout |
| Full method authority review | P0 | BLOCKED | Forward | direct source + reviewer |
| Screening authority | P0 | BLOCKED | Forward | #429 |

## Engineering Item Register

| ID | Type | Priority | Status | Summary |
|---|---|---:|---|---|
| DEC-021 | Decision | P0 | ACCEPTED | Advanced_Analysis owns model editing; integration is table-only. |
| DEC-022 | Decision | P0 | ACCEPTED | Five-sheet XLSX is complete current exchange; current CSV is limited Elements-only. |
| DEC-023 | Decision | P0 | ACCEPTED | `Canonical ID` is element join authority; Line is process-case join authority. |
| DEC-024 | Decision | P0 | ACCEPTED | Process quantities require explicit `{value, unit}` and source provenance; no unit/value defaults. |
| RISK-020 | Risk | High | ACCEPTED | Human XLSX export hash is declared but not cryptographically reverified downstream in v1. |
| RISK-021 | Risk | High | ACCEPTED | CSV drops provenance sheets; explicit incomplete status required. |
| RISK-022 | Risk | High | ACCEPTED | Ambiguous/orphan process or enrichment joins could misapply operating conditions to piping. |
| QST-004 | Question | P1 | OPEN | Future multi-CSV + manifest machine package vs dedicated machine XLSX/JSON. |
| ISS-011 | External CI | High | ROOT_CAUSE_CONFIRMED | Actions runner blocked by billing/spending. |

## Stage Log

### Stages 1–14

FIT roadmap, source extraction, physical/kernel implementation, central benchmark path, independent hand/EI examples, multiphase input hardening, evidence coverage and non-authorizing screening-candidate metadata implemented. FIT remains benchmark-only.

### Stage 15 — `VibrationTableExchange.v1` — COMPLETE FOR IMPLEMENTATION / PARTIAL VALIDATION

Verified upstream `Advanced_Analysis/main` contract:

```text
schema: TopologyEditTableHumanExport.v1
sheets: Elements, Connections, Source Mapping, Catalogue Evidence, Export Metadata
CSV: Elements only
```

Parser fail-closed rules include exact headers, source schema/authority, canonical/projection hashes, deterministic-order declaration, row count, unique Canonical IDs, reference integrity and one-per-element custody/source rows.

XLSX result:

```text
schema = VibrationTableExchange.v1
sourceFormat = XLSX
completeExchange = true
integrityStatus = DECLARED_NOT_REVERIFIED
```

CSV result:

```text
sourceFormat = CSV_ELEMENTS_ONLY
completeExchange = false
integrityStatus = LIMITED_ELEMENTS_ONLY
```

Validation performed:

```text
local parser syntax / fixture                     PASS
five-sheet workbook parse                         PASS
sheet-order invariance                            PASS
fixture byte parse                                PASS
quoted CSV                                        PASS
requireCompleteExchange CSV rejection             PASS
actual xlsx@0.18.5 committed regression           NOT_RUN
full repository                                   NOT_RUN
```

### Stage 16 — `VibrationIntegrityDataset.v1` assembly — IN_PROGRESS

#### Objective

Combine a parsed table exchange with authoritative operating cases and vibration-specific enrichment without mixing data authority or inventing defaults.

#### Operating case contract

Required:

```text
caseId
line
source
```

Optional engineering quantities are explicit objects:

```text
massFlow:          { value, unit }
density:           { value, unit }
pressure:          { value, unit, reference? }
temperature:       { value, unit }
dynamicViscosity:  { value, unit }
velocity:           { value, unit }
```

Optional metadata:

```text
label
phase
sourceRevision
recordId
```

Missing quantities stay absent.

#### Enrichment contract

Required:

```text
canonicalId
property
value
source
```

Optional:

```text
line
caseId
unit
status
reviewer
sourceRevision
recordId
```

If line is supplied it must match the element line. If caseId is supplied it must exist for the element line.

#### Fail-closed rules

- complete exchange required by default;
- limited CSV only with `allowLimitedExchange=true`;
- duplicate `(line, caseId)` operating cases rejected;
- process case line must exist in Elements;
- enrichment Canonical ID must exist;
- enrichment line must match the element line;
- enrichment case must exist on that line;
- duplicate `(canonicalId, caseId|null, property)` enrichment rejected;
- quantity values must be finite numbers and units non-empty strings;
- no engineering quantity defaults;
- deterministic output ordering.

#### Planned result

```text
schema = VibrationIntegrityDataset.v1
authority = DATA_ASSEMBLY_ONLY
screeningAuthorized = false
exchangeAuthority
lines[]
unassignedElementCanonicalIds[]
operatingCases[]
enrichment[]
warnings[]
```

Each line groups element Canonical IDs and its operating cases. The dataset does not calculate FIT/AIV/etc.; later mechanism APIs consume it.

#### Planned files

```text
converters/vibration/dataset/schema.js
converters/vibration/dataset/assemble.js
converters/vibration/dataset/index.js
converters/vibration/index.js
tests/vibration-integrity-dataset.test.mjs
docs/vibration/VibrationIntegrityDataset-v1.md
agents/PR438_workreport.md
```

## Validation Ledger

| Check | Status |
|---|---|
| EI/domain focused | PASS |
| Stage 15 exchange fixture | PASS |
| Stage 15 real xlsx package | NOT_RUN |
| Stage 16 dataset tests | NOT_RUN |
| Full repository | NOT_RUN |
| Screening authority | NOT_AUTHORIZED |

## Next-Agent Handover

- Current stage: Stage 16.
- Do not add UI until dataset assembly is proven.
- Do not normalize process units in dataset assembly; preserve explicit value/unit/source for later central unit resolution.
- Do not infer missing process fields.
- Do not join operating cases by tag when Line is available/required by this contract.
- Do not create geometry-derived identity.
- Highest risk: a wrong join applying a valid operating case to the wrong piping element.
