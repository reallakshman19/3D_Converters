# PR438 — FIV / FIT API-First Vibration Work Report

## PR Mission Control

| Field | Current state |
|---|---|
| Mission | Establish a controlled API-first FIT vertical plus the table-only data boundary needed for facility vibration workflows, without granting unqualified screening/design authority. |
| Source task / issue | Owner requests 2026-08-11/12; issue #429; deep-research report; Common `CodingRules.md` pinned at `43eccc27967ecec7d67513c08255398b496be5ce`. |
| PR number | #438 |
| Branch | `agent/fiv-fit-roadmap-foundation` |
| Base commit | `37c37d770ba47ebb3152679265896de4a943c8b0` |
| Current implementation HEAD before Stage 15 | `8703037a1fe66eb85ec79af7e025ef6607d2d979` plus Stage 14 integration commits on same branch |
| PR status | OPEN / DRAFT / mergeable at last GitHub check |
| Current stage | Stage 15 — IN_PROGRESS: table-only `3D EDIT -> Vibration` exchange/import foundation |
| Last completed stage | Stage 14 — COMPLETE FOR IMPLEMENTATION / PARTIAL FOR FULL-CHECKOUT VALIDATION |
| Engineering status | FIT remains `BENCHMARK_ONLY`; screening/design NOT AUTHORIZED. Stage 14 candidate metadata is review-only and never authorizes screening. |
| Validation status | EI/domain Stage 12 PASS 12/12; Stage 13 evidence smoke PASS; Stage 14 candidate-gate smoke PASS; full branch/repository regression NOT_RUN because no complete checkout and GitHub Actions billing/spending gate remains external. |
| Current blocker | Full licensed T2.2 page-by-page review, full repository execution and independent vibration-engineer authority review remain open; these do not block building the non-authoritative table ingestion boundary. |
| Exact next action | Implement `VibrationTableExchange.v1` parser/validator for Advanced_Analysis certified 3D EDIT XLSX, explicitly downgrade current single-sheet CSV to Elements-only limited status, add synthetic XLSX/CSV tests, keep screening authority unchanged. |

### Handover in 60 Seconds

**FIT state:** `VIB.FIV.FLOW_TURBULENCE` is a source-traceable benchmark-only reference implementation. It reproduces EI Appendix D D2/D4 FIT examples and carries machine-readable evidence coverage. Strict/screening execution still fails with `ENGINEERING_METHOD_NOT_QUALIFIED`.

**Evidence state:** successful domain results contain `qualificationCoverage` (`FIT-REFERENCE-COVERAGE-V1`) and `screeningCandidate` (`FIT-SCREENING-CANDIDATE-V1`). Both hard-code non-authority. A positive candidate means only that the standard phase/correlation slice has at least one EI published example point and is worth engineering review; it does not establish domain coverage or screening authority.

**Product boundary:** no 3D viewer, no canvas, no spatial heatmap. `Advanced_Analysis` owns 3D EDIT and certified table export. Vibration Integrity consumes only a versioned table-data contract.

**Current upstream export verified on `Advanced_Analysis/main`:** `TopologyEditTableHumanExport.v1` produces five sheets in XLSX:

```text
Elements
Connections
Source Mapping
Catalogue Evidence
Export Metadata
```

The `Elements` columns are:

```text
Tag
Type
Line
Connect From
Connect To
DN In (mm)
DN Out (mm)
Length (mm)
Schedule
Material
Piping Class
Pressure Class
Catalogue Authority
Source Status
Canonical ID
```

Authority metadata includes canonical/projection/source hashes, dataset ID/version, journal hash, active-ledger hash and session version. Export is blocked upstream for stale session/projection, source mismatch and unapplied changes.

**Critical format fact:** current CSV serialization exports **only the Elements sheet**. XLSX preserves all five sheets. Therefore CSV cannot be treated as equivalent to the certified multi-sheet XLSX for production machine ingestion.

## Governing Engineering / Architecture Principles

1. Validation, resolution, applicability, calculation, assessment, evidence, qualification and authority are separate.
2. No silent engineering defaults or hidden source fallback.
3. Source hash proves identity, not engineering correctness.
4. Evidence/candidate metadata cannot grant screening authority.
5. Advanced_Analysis owns model editing and export certification; Vibration owns screening/cases/findings/evidence/RCA.
6. The integration surface is table data only—never a model viewer or 3D runtime dependency.
7. Current human XLSX may be ingested as a controlled source projection, but its declared workbook export hash is not independently reverified unless the exact upstream semantic-hash algorithm/material are available.
8. Current CSV is Elements-only and must be labeled limited/incomplete; no silent assumption that missing provenance sheets exist.
9. Preserve upstream `Canonical ID` as the primary stable element identity; do not invent geometry-derived IDs downstream.
10. Keep process operating-case data separate unless it is authoritative in the source export; table topology and process authority have different owners.

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---:|---|---:|---|
| FIT roadmap/source/kernel | P0 | VALIDATED | 1–10 | controlled workbook + API |
| EI D2/D4 examples | P0 | VALIDATED | 11 | worked-example benchmarks |
| Multiphase resolution contract | P0 | VALIDATED | 12 | fail-closed ambiguity |
| Runtime evidence coverage | P0 | IMPLEMENTED | 13 | coverage object |
| Screening candidate metadata | P0 | IMPLEMENTED | 14 | non-authorizing gate |
| 3D EDIT table exchange parser | P0 | IN_PROGRESS | 15 | current stage |
| Table exchange tests | P0 | NOT_STARTED | 15 | synthetic XLSX/CSV planned |
| Full repo regression | P0 | BLOCKED | Forward | Actions billing / no checkout |
| Full licensed T2.2/project review | P0 | BLOCKED | Forward | direct rendered source + reviewer |
| Screening authority | P0 | BLOCKED | Forward | issue #429 |
| Vibration facility workspace | P1 | DEFERRED | Forward | after import contract |

## Engineering Item Register

| ID | Type | Priority | Status | Summary |
|---|---|---:|---|---|
| DEC-001 | Decision | P0 | ACCEPTED | Stable public FIV ID; FIT canonical terminology. |
| DEC-012 | Decision | P0 | ACCEPTED | EI examples qualify only exercised method points/slices. |
| DEC-017 | Decision | P0 | ACCEPTED | Mixed multiphase data require explicit mode. |
| DEC-018 | Decision | P0 | ACCEPTED | Evidence coverage is separate from authority. |
| DEC-020 | Decision | P0 | ACCEPTED | Candidate scope is engineering-review metadata only. |
| DEC-021 | Decision | P0 | ACCEPTED | 3D EDIT / Advanced_Analysis is upstream authoring; vibration integration is table-only. |
| DEC-022 | Decision | P0 | ACCEPTED | Existing multi-sheet XLSX is the current production-capable exchange source; current CSV is limited Elements-only. |
| RISK-018 | Risk | High | ACCEPTED | Executable behavior could be mistaken for equal qualification evidence. |
| RISK-019 | Risk | Critical | ACCEPTED | Candidate metadata could be mistaken for approval; hard-code non-authority. |
| RISK-020 | Risk | High | ACCEPTED | Human XLSX carries declared authority/export hash but downstream cannot yet cryptographically reconstruct upstream semantic hash. |
| RISK-021 | Risk | High | ACCEPTED | Treating current CSV as complete would silently drop connections/source/catalogue/metadata evidence. |
| QST-001 | Question | P0 | BLOCKED_PENDING_DIRECT_SOURCE | Complete adopted T2.2/project coverage. |
| QST-003 | Question | P0 | FAIL_CLOSED | Manual OD family gap. |
| QST-004 | Question | P1 | OPEN | Future machine package: multi-CSV+manifest vs dedicated XLSX/JSON envelope from Advanced_Analysis. |
| ISS-011 | External CI | High | ROOT_CAUSE_CONFIRMED | Actions runner blocked by account billing/spending; no test step ran. |

## Stage Execution Log

### Stages 1–12

Roadmap, source extraction, physical context, central benchmark API/Console, workbook-reference kernel, independent hand cases, EI D2/D4 cases and multiphase ambiguity hardening implemented. FIT remains benchmark-only.

### Stage 13 — machine-readable qualification coverage — COMPLETE FOR IMPLEMENTATION / PARTIAL VALIDATION

Delivered:

```text
converters/vibration/fit/qualification-coverage.js
tests/vibration-fit-qualification-coverage.test.mjs
```

Domain + central evidence now distinguish:

```text
EI_PUBLISHED_EXAMPLE
INDEPENDENT_HAND_BENCHMARK
RETAINED_PARITY_ONLY
NONE
```

Every coverage object carries `screeningQualified=false` and `engineeringAuthority=NONE`.

Validation:

```text
coverage module syntax       PASS
coverage synthetic smoke     PASS
committed test syntax        PASS
full branch test             NOT_RUN
```

### Stage 14 — non-authorizing screening-candidate evidence gate — COMPLETE FOR IMPLEMENTATION / PARTIAL VALIDATION

Delivered:

```text
converters/vibration/fit/screening-candidate.js
tests/vibration-fit-screening-candidate.test.mjs
```

The gate answers only whether an executed **standard method slice** has EI worked-example points sufficient to make it a candidate for engineering review.

Invariant output:

```text
screeningAuthorized = false
engineeringAuthority = NONE
domainCoverageEstablished = false
pointCoverageOnly = true
```

Candidate slices currently include:

```text
GAS + MEDIUM_STIFF standard      (EI D2)
MULTIPHASE aggregate + STIFF     (EI D4)
LIQUID + FLEXIBLE_LARGE standard (EI D4)
```

The D4 produced-water standard case is candidate-for-review but returns `continuationRequired=true` because standard LOF is at/above the reference threshold.

Non-candidates include uncovered correlation families, component-derived multiphase and any executed advanced path.

Validation:

```text
screening-candidate module syntax/smoke       PASS
EI candidate/non-candidate synthetic checks  PASS
full committed candidate regression           NOT_RUN
screening execution authority                 UNCHANGED / NOT_AUTHORIZED
```

### Stage 15 — `VibrationTableExchange.v1` ingestion foundation — IN_PROGRESS

#### Current truth

Upstream source implementation verified:

```text
reallaksh19/Advanced_Analysis
main
src/workspace/topology-edit/table/topology-edit-table-human-export.js
schema = TopologyEditTableHumanExport.v1
```

Current XLSX preserves:

```text
Elements
Connections
Source Mapping
Catalogue Evidence
Export Metadata
```

Current CSV explicitly serializes only:

```text
Elements.columns + Elements.rows
```

#### Objective

Create a pure, API-first vibration exchange parser that can ingest current certified human XLSX without coupling to the 3D editor runtime.

#### Planned canonical result

```text
schema = VibrationTableExchange.v1
sourceSchema = TopologyEditTableHumanExport.v1
sourceFormat = XLSX | CSV_ELEMENTS_ONLY
integrityStatus = DECLARED_NOT_REVERIFIED | LIMITED_ELEMENTS_ONLY

authority:
  canonicalHash
  projectionHash
  sourceHash
  datasetId
  datasetVersion
  journalHash
  activeLedgerHash
  sessionVersion
  sourceAuthority
  sourceExportHash (when workbook property is present)

elements[]
connections[]
sourceMapping[]
catalogueEvidence[]
metadata
warnings[]
```

#### Fail-closed requirements

XLSX production-capable ingestion requires:

- all five expected sheet names;
- exact expected column headers for each sheet;
- `Schema = TopologyEditTableHumanExport.v1` metadata;
- `Authority = CERTIFIED_CANONICAL_PROJECTION_ONLY` metadata;
- non-empty Canonical Hash and Projection Hash;
- unique non-empty `Canonical ID` for Elements;
- every connection/source/catalogue row must reference an existing element Canonical ID;
- deterministic parsed output;
- no silent header aliasing in v1.

CSV behavior:

- parse Elements header exactly;
- return `LIMITED_ELEMENTS_ONLY`;
- explicitly report missing Connections/Source Mapping/Catalogue Evidence/Export Metadata;
- never claim certified complete ingestion;
- callers may reject limited CSV with `requireCompleteExchange=true`.

#### Planned files

```text
converters/vibration/exchange/schema.js
converters/vibration/exchange/parse.js
converters/vibration/exchange/index.js
tests/vibration-table-exchange.test.mjs
docs/vibration/VibrationTableExchange-v1.md
agents/PR438_workreport.md
```

#### Planned validation

- synthetic five-sheet XLSX accepted;
- sheet order does not alter canonical parsed result;
- missing sheet fails closed;
- wrong schema/authority fails closed;
- duplicate Canonical ID fails closed;
- orphan connection/source/catalogue evidence fails closed;
- exact Elements CSV accepted only as limited;
- CSV rejected when complete exchange required;
- current FIT calculation/qualification authority remains untouched.

## Validation Ledger

| Check | Status |
|---|---|
| EI/domain | PASS 12/12 focused |
| Stage 13 coverage smoke | PASS |
| Stage 14 candidate smoke | PASS |
| Stage 15 exchange tests | NOT_RUN |
| Full repository | NOT_RUN |
| Screening authority | NOT_AUTHORIZED |

## Next-Agent Handover

- Current stage: Stage 15.
- Start with pure exchange schema/parser; do not add UI yet.
- Do not import or embed Advanced_Analysis runtime code.
- Do not add 3D/canvas/viewer integration.
- Preserve `Canonical ID` exactly.
- Treat current CSV as incomplete by construction.
- Do not claim upstream exportHash was cryptographically reverified unless semantic-hash parity is actually implemented and tested.
- Highest risk: silently losing authority/provenance data during table import.
