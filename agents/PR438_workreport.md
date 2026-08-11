# PR438 — FIV / FIT API-First Vibration Work Report

## PR Mission Control

| Field | Current state |
|---|---|
| Mission | Establish a controlled, API-first FIT/FIV vertical from exact retained source evidence while preserving engineering authority boundaries under issue #429. |
| Source task / issue | Owner requests 2026-08-11; issue #429; `docs/Vibration deep-research-report (2).md`; Common `CodingRules.md` at `43eccc27967ecec7d67513c08255398b496be5ce`. |
| PR number | #438 |
| Branch | `agent/fiv-fit-roadmap-foundation` |
| Base commit | `37c37d770ba47ebb3152679265896de4a943c8b0` |
| Current HEAD before Stage 9 production work | `797fe11e559e295b7c6a2cd008abe17faf47b4be` |
| PR status | OPEN / DRAFT / mergeable |
| Current stage | Stage 9 — IN_PROGRESS: exact workbook reconciliation + empirical workbook-reference vertical |
| Last completed stage | Stage 8 — FIT physical preflight through central API/Console |
| Engineering status | Exact retained FIT workbook structure and primary calculation formulas are now extractable; empirical implementation may proceed only as `WORKBOOK_REFERENCE_ONLY` / benchmark evidence. Screening/design authority remain BLOCKED. |
| Validation status | Stage 7 PASS 6/6; Stage 8 focused API PASS 5/5; Stage 8 Console PASS 5/5. Stage 9 source reconstruction PASS for exact primary sheet extraction; empirical code not yet written/tested. |
| Current blocker | Exact Energy Institute / project-method authority has not been independently reconciled or reviewed. Workbook reference behavior contains at least two internal inconsistencies that prevent qualification by parity alone. |
| Exact next action | Commit a controlled FIT Engineering Method Specification and pure workbook-reference kernel/tests from the exact extracted formula chain; keep central screening blocked until independent engineering qualification. |

### Handover in 60 Seconds

**What is now true:** `VIB.FIV.FLOW_TURBULENCE` remains the stable public ID. Stage 8 already provides unit-aware physical preflight through the real Engineering Calculation Validate/Resolve path while Calculate remains blocked. The retained CRF-4-1 FIT workbook can now be reconstructed exactly through authenticated GitHub base64 ranges. The primary calculation tab `Flow Induced Turbulence` has been extracted from Git blob `d7d4c1a773fe1b2e9791f258b2b7a07e95bdc41e` and its formula chain is available for controlled transcription.

**Workbook basis found:** the workbook identifies its objective as main-line LOF screening for flow-induced turbulence and cites Energy Institute process-pipework guidance, 2nd Edition (January 2008), Technical Module T2.2, plus project/WorleyParsons guidance. The workbook states a maximum external-diameter limit of 762 mm / NPS 30. This is source evidence, not independent confirmation of the licensed method.

**Core formula chain found:** phase-specific velocity and `rho*v^2`; gas viscosity factor; span-based support stiffness boundaries; six support-category empirical `a`, `b`, and `Fv` correlations; standard LOF; flexible-system advanced-screening correlations using actual natural frequency; refined LOF.

**Critical source inconsistencies:**
1. Workbook methodology text says advanced screening applies to flexible systems with standard LOF >= 1 and actual natural frequency between 1–3 Hz, but a cached example evaluates the advanced formula at 4 Hz.
2. One cached example's hidden support-category selector is inconsistent with the span-based stiffness result calculated on the same sheet. Therefore cached examples are migration/reference evidence only, not independent engineering benchmarks.

**What remains unfinished:** method-spec document; production domain reference kernel; independent equation/table review against licensed source; independent benchmarks; central benchmark-mode integration decision; screening authority; table exchange/workspace.

**What must not be assumed:** workbook parity equals EI compliance; LOF is a probability; cached examples are valid qualification cases; advanced screening is valid outside the stated 1–3 Hz band; a hidden workbook selector should override deterministic support logic; issue #429 is satisfied.

**Highest-risk remaining item:** accidentally promoting workbook behavior to screening authority without resolving source inconsistencies and independently checking the governing method.

**Exact next action:** implement Stage 9 as one coherent reference vertical: specification → source-traceable pure kernel → fail-closed applicability/assessment → cached-case/reference tests → reconciliation. Do not activate screening authority.

## Mission and Engineering Intent

The first FIT vertical defines the pattern for later AIV, FIP, SBC, cavitation/flashing, surge/momentum and slug/time-history calculations. The vibration product remains table-first; there is no 3D viewer or canvas.

### Governing engineering principles

1. Share infrastructure and identical physical data; never share empirical authority by default.
2. Validation, physical resolution, applicability, empirical calculation, assessment, qualification and authority remain separate.
3. No silent engineering defaults or fallback masters.
4. Generic unit normalization belongs to the central platform; empirical correlations retain an explicit native-unit basis.
5. A source hash proves identity, not correctness or engineering authority.
6. Workbook extraction/transcription may support migration and benchmark evidence but cannot independently qualify the governing method.
7. Cached workbook cases are not independent benchmarks when their selectors or applicability are internally inconsistent.
8. The public calculation ID remains `VIB.FIV.FLOW_TURBULENCE`.
9. No screening/design authority until independent qualification is complete.
10. No 3D/canvas and no workflow-file changes.

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---:|---|---:|---|
| Detailed FIT/FIV roadmap | P0 | DONE | 1 | `docs/FIVroadmap.md` |
| Stable public ID + FIT terminology | P0 | DONE | 4 | catalogue + regression |
| Controlled FIT source register | P0 | DONE | 6 | `docs/vibration/FIT-source-register.md` |
| Deterministic workbook extractor CLI | P0 | IMPLEMENTED | 6 | `scripts/extract-fit-workbook-source.mjs` |
| FIT physical validator/resolver | P0 | VALIDATED | 7 | PASS 6/6 |
| Central API/Console physical preflight | P0 | VALIDATED | 8 | API PASS 5/5; Console PASS 5/5 |
| Exact retained-workbook primary-sheet reconstruction | P0 | VALIDATED | 9 | authenticated base64 reconstruction of `sheet13.xml`, uncompressed length 114,139 bytes |
| FIT Engineering Method Specification v1 | P0 | IN_PROGRESS | 9 | exact formula/cell map available |
| Workbook-reference empirical FIT kernel | P0 | IN_PROGRESS | 9 | source formulas reconciled; code pending |
| Independent licensed-source review | P0 | BLOCKED | Forward | engineering reviewer + licensed governing source required |
| Independent benchmark matrix | P0 | BLOCKED | Forward | cannot use cached workbook examples as sole oracle |
| Central screening activation | P0 | BLOCKED | Forward | issue #429 / qualification authority gate |
| Table exchange/workspace | P1 | DEFERRED | Forward | after qualified mechanism path |

## Engineering Item Register

| ID | Type | Severity/Priority | Status | Summary | Current PR? |
|---|---|---:|---|---|---|
| DEC-001 | Decision | P0 | ACCEPTED | Preserve `VIB.FIV.FLOW_TURBULENCE`; FIT is canonical mechanism terminology. | Yes |
| DEC-002 | Decision | P0 | ACCEPTED | Vibration product is table-first; no 3D/canvas. | Yes |
| DEC-003 | Decision | P0 | ACCEPTED | Preserve Engineering Calculation v1 API/engine authority. | Yes |
| DEC-004 | Decision | P0 | ACCEPTED | Validation/applicability/calculation/assessment/qualification/authority remain distinct. | Yes |
| DEC-005 | Decision | P0 | ACCEPTED | Screening remains blocked until exact method + independent qualification. | Yes |
| DEC-006 | Decision | P0 | ACCEPTED | Qualification binds source content hash, not filename. | Yes |
| DEC-007 | Decision | P0 | ACCEPTED | Universal physical preprocessing may precede empirical qualification only with explicit non-authority labeling. | Yes |
| DEC-008 | Decision | P0 | ACCEPTED | Blocked FIT may expose Validate/Resolve physical preflight while Calculate/Batch remain non-authorized. | Yes |
| DEC-009 | Decision | P0 | ACCEPTED | Stage 9 may implement exact retained-workbook equations only as `WORKBOOK_REFERENCE_ONLY`; raw workbook/XML is not committed. | Yes |
| DEC-010 | Decision | P0 | ACCEPTED | Method-text applicability beats permissive cached workbook behavior: advanced screening must not silently accept a natural frequency outside the documented 1–3 Hz band. | Yes |
| RISK-001 | Risk | Critical | ACCEPTED | Unqualified empirical implementation could create false engineering authority. | Mitigated: reference-only + central block |
| RISK-005 | Risk | High | ACCEPTED | Different filenames may be identical source content. | Hash-pinned source register |
| RISK-009 | Risk | High | ACCEPTED | Workbook formulas mix retained empirical behavior with project/user-selector state; parity alone is not a qualification oracle. | Stage 9 fail-closed design |
| ISS-008 | Defect | High | DONE | Stage 8 transient Console syntax defect. | Fixed and syntax-tested |
| ISS-009 | Defect | High | INVESTIGATING | Cached advanced-screening example uses 4 Hz although workbook methodology states 1–3 Hz applicability. | Do not copy permissive behavior |
| ISS-010 | Defect | High | INVESTIGATING | Cached support-category selector conflicts with computed span-based stiffness in one example. | Cached case not independent benchmark |
| QST-001 | Question | P0 | INVESTIGATING | Exact licensed EI/project equation/table/errata authority versus retained workbook transcription. | Independent review required |
| QST-002 | Question | P1 | DEFERRED | Final upstream table-exchange format. | Later cross-repo stage |
| QST-003 | Question | P0 | INVESTIGATING | Exact support-category boundary treatment between OD 219.1 mm and 273.05 mm for manual non-standard diameters. | Fail closed until source review |

## Stage Roadmap and Execution Log

### Stage 1 — research/report baseline — COMPLETE
Architecture, terminology, table-only product boundary and qualification strategy recorded.

### Stage 2 — PR allocation/report synchronization — COMPLETE
Draft PR #438 established under one-assignment/one-PR CodingRules.

### Stage 3 — pre-code scope verification — COMPLETE
Docs-only baseline reconciled.

### Stage 4 — FIT terminology/API compatibility — COMPLETE
Stable public ID preserved; visible FIT terminology added; numerical authority unchanged.

### Stage 5 — initial reconciliation — COMPLETE
Initial safe scope reconciled.

### Stage 6 — workbook source tooling — PARTIAL
Deterministic source extractor, source register and regression added. The original local-runtime binary limitation is superseded by Stage 9 authenticated base64 reconstruction; the CLI itself still requires execution in a normal checkout for its own end-to-end retained-workbook run.

### Stage 7 — FIT physical context — COMPLETE
Strict physical validation plus `FIT-PHYS-001..004`; PASS 6/6.

### Stage 8 — production preflight through central API/Console — COMPLETE
FIT Validate/Resolve uses central units and the real physical resolver; Calculate/current-batch remain blocked; focused API PASS 5/5 and Console PASS 5/5.

### Stage 9 — exact workbook reconciliation + empirical reference vertical — IN_PROGRESS

#### Current truth

The private retained workbook is accessible through the connected GitHub app as base64 line ranges. ZIP central-directory metadata was reconstructed from the exact blob and used to extract the primary calculation worksheet `xl/worksheets/sheet13.xml` byte-faithfully. The workbook maps `Flow Induced Turbulence` to `sheet13.xml`; the extracted XML has 114,139 uncompressed bytes and 155 formula cells. Shared strings and workbook relationships were also reconstructed sufficiently to map labels, method statements and formula addresses.

#### Source identity

```text
Repository: reallaksh19/CRF-4-1
Commit:     68dc8e1fa2ef67073c59b3afc56f1bf40953d535
Path:       Extended calc2/AIV FIV/FIT.xlsm
Git blob:   d7d4c1a773fe1b2e9791f258b2b7a07e95bdc41e
Size:       493650 bytes
Primary tab: Flow Induced Turbulence -> xl/worksheets/sheet13.xml
```

The duplicate `KS-PR-CAL-0086 ... Flow Induced Turbulence Calculation.xlsm` path is the same blob and is therefore the same source content, not a second independent source.

#### Source-backed method findings

- Workbook objective: main-line likelihood-of-failure screening for vibration-induced fatigue due to flow-induced turbulence.
- Workbook basis cites Energy Institute process-pipework vibration guidance, 2nd Edition (January 2008), Technical Module T2.2, plus project/WorleyParsons guidance.
- Workbook states maximum external diameter 762 mm / NPS 30.
- Phase paths: liquid, gas, multiphase.
- Gas path applies a viscosity factor proportional to `sqrt(mu_gas / 0.001 Pa.s)`.
- Standard load term is phase-dependent `rho*v^2`; multiphase uses mixture density from total mass flow / total volumetric flow.
- Three OD-dependent span-boundary correlations classify support stiffness as Stiff / Medium Stiff / Medium / Flexible.
- Six OD-range/support empirical correlation families calculate standard `Fv` from native `Dext` and wall-thickness values in mm.
- Standard LOF is the phase-dependent excitation term divided by `Fv`, with gas viscosity factor included.
- Advanced screening is described for flexible systems with standard LOF >= 1 and known actual natural frequency between 1–3 Hz; separate small/large-diameter flexible correlations recalculate `Fv` and refined LOF.

#### Stage 9 objective

Deliver one coherent non-authoritative empirical vertical:

1. `docs/vibration/FIT-Engineering-Method-Specification-v1.md` with exact source identity, native units, durable `FIT-APP-*`, `FIT-EQ-*`, `FIT-CONST-*`, `FIT-ASS-*` IDs and workbook cell mapping.
2. Pure domain implementation for validation/applicability/calculation/assessment of the retained workbook-reference method.
3. Explicit `WORKBOOK_REFERENCE_ONLY` qualification/evidence in every result.
4. Tests for formula transcription, phase paths, support categories, standard LOF, advanced 1–3 Hz gate, fail-closed manual-diameter gap, deterministic results and cached-workbook parity where a cached case is internally coherent.
5. No promotion of the central calculation to screening/design authority in this stage.

#### Expected files

```text
docs/vibration/FIT-Engineering-Method-Specification-v1.md
converters/vibration/fit/method.js
converters/vibration/fit/applicability.js
converters/vibration/fit/calculate.js
converters/vibration/fit/assess.js
converters/vibration/fit/index.js
tests/vibration-fit-workbook-reference.test.mjs
agents/PR438_workreport.md
```

Existing files may be adjusted only if required for a real production consumer or export. No workflow files, no 3D/canvas code, no unrelated refactor.

#### Planned validation

- exact formula coefficient transcription against `sheet13.xml` cell formulas;
- hand calculation for each support correlation family;
- liquid/gas/multiphase paths;
- cached workbook examples used only as reference parity, with inconsistent cases explicitly excluded from independent qualification;
- advanced screening at 1, 2, 3 Hz and hard non-applicability outside the source-stated band;
- OD maximum boundary and manual-diameter support-family gap fail closed;
- deterministic repeated calculations;
- no hidden defaults;
- central `VIB.FIV.FLOW_TURBULENCE` authority remains blocked unless a separate evidence-backed benchmark-only integration decision is recorded.

#### Stage risks

- The retained workbook may contain implementation defects or project-specific behavior not present in the governing EI method.
- Native empirical coefficients are tied to mm/m/Pa.s/kg-based workbook units; unit conversion must occur outside coefficient definitions and be explicitly traceable.
- Workbook dropdown-linked cells can hold stale/inconsistent selectors; deterministic code must not inherit hidden UI state.
- A cached formula result is not an independent benchmark.

## Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---:|---:|---|---|---|
| `agents/PR438_workreport.md` | 2 | 9 | Living mission control / source findings / handover | No | current |
| `docs/FIVroadmap.md` | 1 | 1 | Detailed API/table-first roadmap | Yes | reconciled |
| `docs/vibration/FIT-source-register.md` | 6 | 6 | Controlled retained-source identity | Yes | source facts PASS |
| `scripts/extract-fit-workbook-source.mjs` | 6 | 6 | Deterministic workbook extraction CLI | Yes | patch PASS; full retained CLI run still NOT_RUN |
| `package.json` | 6 | 6 | extractor command | No | patch PASS |
| `converters/vibration/fit/physical-context.js` | 7 | 7 | universal physical preprocessing | Yes | PASS 6/6 |
| `tests/vibration-fit-physical-context.test.mjs` | 7 | 7 | physical regression | No | PASS 6/6 |
| `converters/engineering-calculations/pending-definitions.js` | 4 | 8 | stable FIT identity + physical preflight definition | Yes | Stage 8 focused PASS |
| `converters/engineering-calculations/input-resolution.js` | 8 | 8 | additive preflight preservation | Yes | Stage 8 focused PASS |
| `tests/engineering-calculation-core.test.mjs` | 4 | 8 | catalogue/preflight/unit/block regression | No | focused fixture PASS; full repo NOT_RUN |
| `tabs/engineering-calculation-console-model.js` | 8 | 8 | preflight-vs-executable predicates | No | PASS |
| `tabs/engineering-calculation-console-sections.js` | 8 | 8 | preflight form/basis/batch authority UI | No | PASS |
| `tabs/engineering-calculation-console-view.js` | 8 | 8 | resolvable control behavior | No | PASS |
| `tests/engineering-calculation-console-fit-preflight.test.mjs` | 8 | 8 | Console authority regression | No | PASS 5/5 |
| `tests/fit-workbook-source-extractor.test.mjs` | 6 | 6 | extractor/hash regression | No | full repo NOT_RUN |

Stage 9 files will be added to this ledger after implementation and before reconciliation.

## Engineering Invariants

- **INV-001:** public ID remains `VIB.FIV.FLOW_TURBULENCE`.
- **INV-002:** source extraction or workbook parity never implies screening/design authority.
- **INV-003:** UI/reporting owns no engineering equations or thresholds.
- **INV-004:** no hidden engineering defaults or mutable latest-master dependency.
- **INV-005:** method applicability is explicit and may fail even when input JSON is valid.
- **INV-006:** `FIT-PHYS-*` universal preprocessing and `FIT-EQ-*` empirical method equations remain distinguishable.
- **INV-007:** native-unit empirical coefficients are not silently rederived into another unit system.
- **INV-008:** advanced screening does not run outside the source-stated natural-frequency band.
- **INV-009:** cached workbook selector state cannot silently override deterministic support classification.
- **INV-010:** table-only product boundary remains in force.

## Validation and Evidence Ledger

### Software Validation

| Validation | Status | Last HEAD / Evidence |
|---|---|---|
| Stage 7 physical regression | PASS | 6/6 |
| Stage 8 focused API/preflight | PASS | 5/5 |
| Stage 8 Console regression | PASS | 5/5 |
| Stage 8 syntax/source reconciliation | PASS | current branch modules |
| Exact workbook Git identity | PASS | `d7d4c1...`, 493650 bytes |
| Workbook relationships + primary-sheet mapping | PASS | `Flow Induced Turbulence` -> `sheet13.xml` |
| Exact primary-sheet decompression | PASS | 114139 XML bytes, 155 formulas |
| Stage 9 reference-kernel tests | NOT_RUN | implementation pending |
| Full repository test suite | NOT_RUN | no full checkout/dependency tree in this runtime |

### Engineering Validation

| Property | Status | Evidence |
|---|---|---|
| Retained workbook identity | PASS | exact frozen commit/blob |
| Workbook formula transcription source | PASS | exact `sheet13.xml` reconstruction |
| Workbook cached-case consistency | FAIL | ISS-009 / ISS-010 |
| Governing EI method independent review | NOT_RUN | licensed source + reviewer required |
| FIT screening authority | NOT_RUN | issue #429 remains open |
| FIT design authority | NOT_RUN | not claimed |

### Explicitly Not Validated

- exact EI equation/table/errata parity;
- legal/licensing status for redistribution of proprietary method tables;
- cached workbook examples as independent engineering benchmarks;
- manual non-standard diameter category in the 219.1–273.05 mm gap;
- screening or design authority.

## Recommended Forward Sequence

1. Complete Stage 9 reference specification and pure workbook-reference kernel/tests.
2. Run the existing extractor and full test set in a normal checkout against the exact retained workbook.
3. Independently reconcile every `FIT-EQ-*`, `FIT-APP-*`, `FIT-CONST-*`, `FIT-ASS-*` item against the licensed governing source/project procedure and errata.
4. Build independent low/nominal/high, boundary, unit-invariant and out-of-applicability benchmark cases that do not use the implementation as oracle.
5. Resolve ISS-009, ISS-010 and QST-003 explicitly.
6. Only then decide whether `VIB.FIV.FLOW_TURBULENCE` can move from BLOCKED to BENCHMARK_ONLY / SCREENING under the platform qualification model.
7. After qualified execution, implement certified table exchange/import and the table-first vibration workspace.
8. Expand to AIV, FIP and SBC with independent empirical authority.

## Process Notes / Lessons Learned

- Source content hash, not filename, is the retained-source identity.
- Private binary GitHub content can be reconstructed exactly from authenticated base64 ranges without adding CI/workflow machinery.
- Workbook formula extraction exposes hidden form-control state that is not visible from the normal cell table; that state can be internally inconsistent with calculated guidance.
- Cached workbook values are useful migration evidence but are not independent qualification cases.
- Applicability text must be enforced explicitly instead of assuming the spreadsheet formula itself enforces every stated limit.

## Next-Agent Handover

- **Current stopping point:** Stage 9 source reconciliation complete enough to begin controlled empirical reference implementation.
- **PR / branch / pre-implementation HEAD:** #438 / `agent/fiv-fit-roadmap-foundation` / `797fe11e559e295b7c6a2cd008abe17faf47b4be` before this report update.
- **Last completed stage:** Stage 8.
- **Current active stage:** Stage 9 — IN_PROGRESS.
- **Start here:** create `docs/vibration/FIT-Engineering-Method-Specification-v1.md`, then implement the pure workbook-reference domain path from the extracted formula map.
- **Do not redo:** broad research, FIV/FIT naming, table-only decision, physical preflight, workbook central-directory reconstruction.
- **Do not assume:** workbook examples are valid benchmarks; 4 Hz advanced screening is authorized; support dropdown cache is authoritative; EI compliance is established.
- **Files currently involved:** 15 reconciled prior paths plus planned Stage 9 files listed above.
- **Known failing checks:** workbook consistency checks ISS-009 and ISS-010; no known software runtime failure.
- **Validation still required:** Stage 9 tests; full-repo tests; independent method review/benchmarks.
- **Open QST-*:** QST-001, QST-003; QST-002 deferred.
- **Highest-risk remaining item:** accidental authority promotion from reference workbook behavior.
- **Exact next recommended action:** specification + reference-only kernel + focused tests in one Stage 9 batch; keep central screening blocked.
- **Required reading:** `docs/FIVroadmap.md`, `docs/vibration/FIT-source-register.md`, issue #429, `docs/APIEngineeringCalcContracts.md`, Common CodingRules, exact CRF workbook blob, this work report.
