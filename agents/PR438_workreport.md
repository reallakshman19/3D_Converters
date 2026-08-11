# PR438 — FIV / FIT API-First Vibration Work Report

## PR Mission Control

| Field | Current state |
|---|---|
| Mission | Establish the controlled roadmap, source-qualification tooling, and first non-empirical FIT domain foundation under issue #429. |
| Source task / issue | Owner requests 2026-08-11; issue #429; `docs/Vibration deep-research-report (2).md`; Common `CodingRules.md` at `43eccc27967ecec7d67513c08255398b496be5ce`. |
| PR number | #438 |
| Branch | `agent/fiv-fit-roadmap-foundation` |
| Base commit | `37c37d770ba47ebb3152679265896de4a943c8b0` |
| Stage 7 pre-code HEAD | `0ed4bddfc877cceceb5798cff9a277b55a76dd0a` |
| PR status | OPEN / DRAFT / mergeable |
| Current stage | Stage 7 — FIT physical input validation + hydraulic resolution |
| Last completed stage | Stage 5; Stage 6 implementation is PARTIAL pending runtime workbook extraction |
| Engineering status | FIT terminology/API safeguard IMPLEMENTED; workbook extractor IMPLEMENTED; numerical FIT method remains BLOCKED; non-empirical physical context now IN_PROGRESS. |
| Validation status | Prior patch/scope inspection PASS; Stage 6 real-workbook runtime NOT_RUN; Stage 7 runtime validation planned locally before commit. |
| Current blocker | Exact licensed FIT equations/tables/applicability/assessment are not yet extracted and independently qualified. |
| Exact next action | Implement only universal physical validation/derivation needed by future FIT screening, test it independently, and keep central `VIB.FIV.FLOW_TURBULENCE` blocked. |

### Handover in 60 Seconds

**What is already true:** the public API ID remains `VIB.FIV.FLOW_TURBULENCE`, visible as **Flow-Induced Turbulence (FIT) Screening**, and remains `BLOCKED` under issue #429. `docs/FIVroadmap.md`, `docs/vibration/FIT-source-register.md`, and `scripts/extract-fit-workbook-source.mjs` establish the table-only roadmap and retained-workbook source evidence. The two retained FIT workbook paths are byte-identical at Git blob `d7d4c1a773fe1b2e9791f258b2b7a07e95bdc41e`, 493,650 bytes. The migrated CRF `aiv-fiv.js` remains rejected as numerical authority because it returns zero placeholders and declares `PENDING_SOURCE_EXTRACTION`.

**Stage 7 scope:** add a small pure FIT physical-context module that validates canonical physical quantities and derives only universally valid hydraulics: inside diameter, internal flow area, volumetric flow, and mean velocity. These derivations are not the empirical FIT screening correlation and carry no applicability, LOF, PASS/FAIL, screening authority, or design authority.

**What remains unfinished:** actual extraction of the retained binary in a normal checkout; exact licensed-method reconciliation; `FIT-APP-*`, `FIT-EQ-*`, `FIT-TBL-*`, `FIT-CONST-*`, `FIT-ASS-*`; independent benchmark matrix; empirical FIT kernel; assessment; central API activation; table-first facility workflow.

**Highest-risk remaining item:** allowing generic physical preprocessing to be mistaken for a qualified FIT method. Stage 7 must explicitly prevent that by returning physical context only and leaving the production calculator blocked.

## Engineering Invariants

1. Public calculation ID remains `VIB.FIV.FLOW_TURBULENCE`.
2. The central calculator remains fail closed until method qualification and authority approval.
3. Validation, physical resolution, applicability, empirical calculation, assessment, qualification, and authority remain separate.
4. No silent engineering defaults.
5. No natural-frequency or damping default/requirement is introduced in Stage 7.
6. No UI/reporting equation path is added.
7. No 3D viewer/canvas is added; vibration remains table-first.
8. Source hashes prove identity, not engineering correctness.
9. Stage 7 derivations are universal conservation/geometry relationships, not `FIT-EQ-*` empirical-method authority.

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---:|---|---:|---|
| FIV/FIT roadmap | P0 | DONE | 1 | `docs/FIVroadmap.md` |
| Stable FIT terminology / public ID | P0 | IMPLEMENTED | 4 | blocked catalogue + regression |
| Controlled FIT source register | P0 | IMPLEMENTED | 6 | `docs/vibration/FIT-source-register.md` |
| Workbook extraction CLI | P0 | IMPLEMENTED | 6 | `scripts/extract-fit-workbook-source.mjs` |
| Stage 6 real-workbook extraction | P0 | BLOCKED | 6 | binary unavailable to local runtime |
| FIT physical input validator | P0 | IN_PROGRESS | 7 | planned `converters/vibration/fit/physical-context.js` |
| FIT hydraulic resolver | P0 | IN_PROGRESS | 7 | same module; no empirical method |
| FIT physical-context regression | P0 | IN_PROGRESS | 7 | planned `tests/vibration-fit-physical-context.test.mjs` |
| FIT Engineering Method Specification | P0 | BLOCKED | Forward | requires extracted workbook + licensed source review |
| Qualified FIT numerical kernel | P0 | BLOCKED | Forward | method specification + independent benchmarks required |
| Central API activation | P0 | BLOCKED | Forward | explicit qualification/authority gate |
| Table exchange/workspace | P1 | DEFERRED | Forward | after qualified mechanism path |

## Engineering Item Register

| ID | Type | Priority | Status | Summary |
|---|---|---:|---|---|
| DEC-001 | Decision | P0 | ACCEPTED | Preserve frozen public ID; FIT is canonical mechanism terminology. |
| DEC-002 | Decision | P0 | ACCEPTED | Table-only vibration product; no 3D/canvas. |
| DEC-003 | Decision | P0 | ACCEPTED | Preserve Engineering Calculation v1 API contract. |
| DEC-004 | Decision | P0 | ACCEPTED | Keep validation/applicability/calculation/assessment/qualification/authority separate. |
| DEC-005 | Decision | P0 | ACCEPTED | FIT stays blocked until exact method + independent qualification. |
| DEC-006 | Decision | P0 | ACCEPTED | Hash-pin/extract retained workbook before empirical transcription. |
| DEC-007 | Decision | P0 | ACCEPTED | Universal physical preprocessing may be coded before empirical method extraction only when its authority boundary is explicit and independently testable. |
| RISK-001 | Risk | Critical | ACCEPTED | Unqualified empirical implementation could create false authority. |
| RISK-005 | Risk | High | ACCEPTED | Different workbook filenames may be identical content; bind source by hash. |
| RISK-006 | Risk | High | ACCEPTED | Preprocessing could accidentally become a hidden method/default layer. Mitigation: explicit canonical fields, no defaults, no applicability/assessment output. |
| QST-001 | Question | P0 | INVESTIGATING | Exact licensed FIT equations/tables/errata/native units/applicability. |
| QST-002 | Question | P1 | DEFERRED | Final upstream table-exchange format. |

## Stage History

### Stage 1 — research/report baseline — COMPLETE
Roadmap and architecture/product boundaries recorded.

### Stage 2 — PR allocation/report synchronization — COMPLETE
Draft PR #438 established under one-assignment/one-PR CodingRules.

### Stage 3 — pre-code scope verification — COMPLETE
Docs-only baseline reconciled. **PASS.**

### Stage 4 — FIT terminology/API compatibility — COMPLETE
Visible name changed to `Flow-Induced Turbulence (FIT) Screening`; frozen ID, issue #429 and no-output behavior retained. Patch inspection **PASS**; exact Node test remains **NOT_RUN** in this environment.

### Stage 5 — prior reconciliation — COMPLETE
Four-file stage scope reconciled. **PASS.**

### Stage 6 — FIT workbook source extraction tooling — PARTIAL
Implemented deterministic XLSM/XLSX inventory, SHA-256 and Git-blob SHA-1 evidence, defined-name/cell/formula/visibility metadata, expected-source hard failure, source register, npm command and synthetic regression. Patch/scope inspection **PASS**. Real retained-workbook extraction and exact Node execution remain **NOT_RUN** because the private binary/dependency checkout is unavailable to the local runtime.

### Stage 7 — FIT physical input validation + hydraulic resolution — IN PROGRESS

**Objective**

Create a pure, reusable physical-context module for canonical FIT candidate data without implementing the empirical FIT method.

**Planned production file**

`converters/vibration/fit/physical-context.js`

**Planned test file**

`tests/vibration-fit-physical-context.test.mjs`

**Canonical Stage 7 inputs**

- `outsideDiameterM` — required finite positive number;
- `wallThicknessM` — required finite positive number;
- `massFlowKgS` — required finite non-negative number;
- `densityKgM3` — required finite positive number;
- `maximumUnsupportedSpanM` — optional finite positive number, preserved only; method specification will decide whether/when it is required.

No phase, natural frequency, damping, pressure, temperature, viscosity, support stiffness, or empirical factor is silently supplied.

**Universal derivations only**

```text
FIT-PHYS-001  insideDiameterM = outsideDiameterM - 2 * wallThicknessM
FIT-PHYS-002  flowAreaM2 = π * insideDiameterM² / 4
FIT-PHYS-003  volumetricFlowM3S = massFlowKgS / densityKgM3
FIT-PHYS-004  meanVelocityMS = volumetricFlowM3S / flowAreaM2
```

These identifiers are physical/preprocessing evidence IDs and are intentionally not `FIT-EQ-*` method-equation identifiers.

**Failure behavior**

- missing required field → `FIT_INPUT_REQUIRED`;
- non-finite/wrong numeric range → `FIT_INPUT_INVALID`;
- `2 * wallThicknessM >= outsideDiameterM` → hard geometry failure;
- no calculation result/LOF/assessment is ever returned by this module.

**Planned validation**

- nominal hand-derived geometry/hydraulic case;
- zero mass-flow case;
- invalid wall/OD geometry;
- missing density/mass-flow/diameter/wall;
- optional span positive validation;
- deterministic repeated output;
- frozen/immutable returned evidence where practical.

**Stage 7 non-goals**

- no method applicability;
- no empirical correlation;
- no LOF;
- no threshold/action band;
- no screening/design authority;
- no central registry activation;
- no table import/UI.

## Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---:|---:|---|---|---|
| `agents/PR438_workreport.md` | 2 | 7 | Living PR state/handover | No | current |
| `docs/FIVroadmap.md` | 1 | 1 | Detailed roadmap | Yes | reconciled |
| `converters/engineering-calculations/pending-definitions.js` | 4 | 4 | FIT-explicit blocked catalogue name | Yes | patch PASS; runtime NOT_RUN |
| `tests/engineering-calculation-core.test.mjs` | 4 | 4 | stable ID/blocked regression | No | patch PASS; runtime NOT_RUN |
| `docs/vibration/FIT-source-register.md` | 6 | 6 | controlled source inventory | Yes | source facts PASS |
| `scripts/extract-fit-workbook-source.mjs` | 6 | 6 | deterministic workbook extraction | Yes | patch PASS; runtime NOT_RUN |
| `tests/fit-workbook-source-extractor.test.mjs` | 6 | 6 | extractor/hash regression | No | patch PASS; runtime NOT_RUN |
| `package.json` | 6 | 6 | extractor command | No | patch PASS |
| `converters/vibration/fit/physical-context.js` | 7 | 7 | universal FIT candidate physical validation/resolution | Yes | IN_PROGRESS |
| `tests/vibration-fit-physical-context.test.mjs` | 7 | 7 | physical-context regression | No | IN_PROGRESS |

## Validation and Evidence Ledger

### Existing evidence

- Retained FIT workbook identity: **PASS** by GitHub source metadata; duplicate paths share `d7d4c1...`, 493,650 bytes.
- Migrated JS numerical authority: **REJECTED**; explicitly `PENDING_SOURCE_EXTRACTION` with zero placeholders.
- Stage 6 patch/scope inspection: **PASS**.
- Stage 6 runtime workbook extraction: **NOT_RUN**.

### Stage 7 validation target

Stage 7 may be marked complete only after the new pure physical-context tests execute successfully against the exact code committed to the PR and the PR changed-file list remains fully explained.

## Explicitly Not Validated / Not Authorized

Any EI/AVIFF empirical equation, coefficient, lookup table, applicability criterion, LOF meaning, action threshold, workbook cached-value benchmark, screening authority, or design authority.

## Recommended Forward Sequence

1. Complete and validate Stage 7 physical-context module.
2. Run Stage 6 extractor on exact pinned workbook in a normal checkout.
3. Build `docs/vibration/FIT-Engineering-Method-Specification-v1.md` from extracted evidence + exact licensed governing source.
4. Independently review `FIT-APP-*`, `FIT-EQ-*`, `FIT-TBL-*`, `FIT-CONST-*`, `FIT-ASS-*` and benchmark cases.
5. Implement pure empirical FIT calculation and assessment only from that controlled specification.
6. Complete independent qualification dossier.
7. Activate `VIB.FIV.FLOW_TURBULENCE` through the existing central Engineering Calculation adapter only after explicit authority approval.
8. Then add certified table exchange/import and table-first line/facility workflow.

## Next-Agent Handover

- **Current stopping point:** Stage 7 opened before production code.
- **PR / branch:** #438 / `agent/fiv-fit-roadmap-foundation`.
- **Current active stage:** Stage 7 — IN PROGRESS.
- **Start here:** implement/test `converters/vibration/fit/physical-context.js`; do not touch central calculator authority.
- **Do not redo:** broad research, FIT/FIV naming, public API identity, source-register work, or 3D planning.
- **Do not assume:** the empirical FIT method has been extracted or qualified.
- **Highest-risk remaining item:** accidentally presenting physical preprocessing as a qualified FIT screening method.
- **Required reading:** `docs/FIVroadmap.md`, `docs/vibration/FIT-source-register.md`, `docs/APIEngineeringCalcContracts.md`, issue #429, Common CodingRules.
