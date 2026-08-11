# PR438 — FIV / FIT API-First Vibration Work Report

## PR Mission Control

| Field | Current state |
|---|---|
| Mission | Establish a controlled API-first Flow-Induced Turbulence (FIT) vertical with explicit evidence and no unqualified screening/design authority. |
| Source task / issue | Owner requests 2026-08-11; issue #429; `docs/Vibration deep-research-report (2).md`; Common `CodingRules.md` pinned at `43eccc27967ecec7d67513c08255398b496be5ce`. |
| PR number | #438 |
| Branch | `agent/fiv-fit-roadmap-foundation` |
| Base commit | `37c37d770ba47ebb3152679265896de4a943c8b0` |
| Current HEAD before Stage 11 | `ebb562e52baf2daf6445822fa6be75fbc1471e96` |
| PR status | OPEN / DRAFT / mergeable |
| Current stage | Stage 11 — IN_PROGRESS: Energy Institute worked-example qualification and method-boundary corrections |
| Last completed stage | Stage 10 — qualification dossier + independent hand-derived software benchmarks |
| Engineering status | `VIB.FIV.FLOW_TURBULENCE` is active only at `BENCHMARK_ONLY / WORKBOOK_REFERENCE_ONLY`. Screening/design authority are NOT AUTHORIZED. |
| Validation status | Retained source reconstruction PASS; Stage 9 focused runtime PASS 16/16; independent hand benchmark set IMPLEMENTED; CI root cause confirmed external billing/spending gate; EI worked examples now available as independent engineering benchmark evidence. |
| Current blocker | Stage 11 EI worked-example reconciliation must complete; full checkout regression and identified vibration-engineer approval still required before screening authority. |
| Exact next action | Reconcile EI Appendix D FIT examples against the kernel, correct source-backed boundary/input defects, add EI benchmark dataset/tests, then reassess the remaining licensed-method gaps. |

### Handover in 60 Seconds

**What is now true:** FIT has a deterministic retained-workbook reference implementation, a central benchmark-only adapter, explicit units/provenance, hand-derived software benchmarks and a qualification dossier. Strict/screening modes fail closed.

**What is being worked on:** the owner provided the Energy Institute second-edition examples PDF at `reallaksh19/Common@aef163a5def3bfe04ca0ba860da05728a27daf42`, file `EI - AVIFF Guidelines 2nd Edition_Examples.pdf`, Git blob `3e2517d0df527a051084fc02e69cb7afa31f8d47`. Appendix D worked examples provide independent FIT values suitable for qualification.

**New Stage 11 findings before production change:**

1. EI T2.2.4 states advanced screening applies for natural frequency **greater than 1 Hz and less than or equal to 3 Hz**. Current code allows exactly 1 Hz. This is a confirmed reference-method defect to correct.
2. EI worked Example D4 uses a **273 mm OD**, 18 m span line as Flexible and evaluates the large flexible correlation. Current code begins the large family at 273.05 mm and would fail this published example. The large-family lower bound must include 273 mm.
3. EI D4 expresses multiphase demand using **effective density and effective velocity**. Current domain validation requires gas/liquid component data even when authoritative aggregate density/velocity are available. The API needs an explicit aggregate multiphase input path without hidden defaults.
4. Appendix D provides action bands at LOF 0.3, 0.5 and 1.0. Current benchmark assessment only distinguishes below/above 1.0. These bands should be preserved as reference workflow metadata, not a production `pass` boolean.

**What remains unfinished:** EI example regression; full checkout regression; licensed/project-method review of any portions not directly covered by the EI worked examples; independent vibration-engineer approval.

**What must not be assumed:** EI example parity alone authorizes all T2.2 applicability; workbook cached cases are independent evidence; `BENCHMARK_ONLY` means screening authority; missing GitHub Actions results indicate code failure.

**Highest-risk remaining item:** accidental screening promotion before the EI examples, source boundaries and remaining applicability gaps are independently reconciled.

**Exact next action:** implement Stage 11 as one coherent batch: EI example data → source-backed corrections → benchmark tests → dossier/spec/work-report reconciliation. Keep authority `BENCHMARK_ONLY`.

## Mission and Engineering Intent

The FIT vertical is the reference engineering/API pattern for later AIV, FIP, SBC, cavitation/flashing, surge/momentum and slug/time-history mechanisms. The product remains table-first: no 3D viewer and no canvas.

### Governing engineering principles

1. Share infrastructure and identical physical data; never share empirical authority by default.
2. Validation, physical resolution, applicability, calculation, assessment, qualification and engineering authority remain separate.
3. No silent engineering defaults, hidden fallback masters or mutable `latest` engineering authority.
4. Central units normalize generic quantities; empirical coefficients retain their controlled native-unit basis.
5. Source hashes prove identity, not correctness.
6. Prefer governing EI/example evidence over retained workbook UI/cache behavior when they conflict.
7. Reference/benchmark output must not expose production design authority or an unqualified pass/fail claim.
8. Public API ID remains `VIB.FIV.FLOW_TURBULENCE` for compatibility.
9. No 3D/canvas and no workflow-file changes for this assignment.

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---:|---|---:|---|
| Detailed FIT/FIV roadmap | P0 | DONE | 1 | `docs/FIVroadmap.md` |
| Stable public ID / FIT terminology | P0 | DONE | 4 | API/catalogue regression |
| Controlled workbook source register/extractor | P0 | IMPLEMENTED | 6 | source register + extractor CLI |
| Universal FIT physical context | P0 | VALIDATED | 7 | focused PASS 6/6 |
| Retained workbook reconstruction | P0 | VALIDATED | 9 | exact blob / `sheet13.xml` extraction |
| FIT Engineering Method Specification v1 | P0 | IMPLEMENTED | 9 | controlled equation/applicability register |
| Workbook-reference FIT domain API | P0 | VALIDATED | 9 | focused source/reference tests |
| Central FIT benchmark adapter | P0 | VALIDATED | 9 | explicit benchmark mode only |
| Dynamic-viscosity unit support | P0 | VALIDATED | 9 | `Pa*s`, `mPa*s`, `cP` |
| Independent hand benchmark set | P0 | IMPLEMENTED | 10 | `Benchmarks/VibrationFIT/fit-independent-hand-benchmarks-v1.json` |
| Qualification dossier | P0 | IMPLEMENTED | 10 | `docs/vibration/FIT-Qualification-Dossier-v1.md` |
| GitHub Actions failure investigation | P0 | DONE | 10 | external billing/spending gate; runner never started |
| EI worked-example source pin | P0 | VALIDATED | 11 | Common commit/blob identity |
| EI D2 gas compression FIT benchmark set | P0 | IN_PROGRESS | 11 | Appendix D2 published rho-v²/FVF/Fv/LOF values |
| EI D4 separation-system FIT benchmark set | P0 | IN_PROGRESS | 11 | Appendix D4 published multiphase/liquid values |
| Advanced-frequency boundary correction | P0 | IN_PROGRESS | 11 | EI: `1 Hz < fn <= 3 Hz` |
| 273 mm large-family boundary correction | P0 | IN_PROGRESS | 11 | EI D4 273 mm flexible example |
| Effective multiphase aggregate-input path | P0 | IN_PROGRESS | 11 | EI D4 effective density/velocity workflow |
| EI reference action bands | P1 | IN_PROGRESS | 11 | LOF 0.3 / 0.5 / 1.0 worked-example actions |
| Full repository regression | P0 | BLOCKED | Forward | Actions billing or normal authenticated checkout required |
| Independent vibration-engineer approval | P0 | BLOCKED | Forward | identified reviewer required |
| Screening authority | P0 | BLOCKED | Forward | issue #429 remains gate |

## Engineering Item Register

| ID | Type | Severity/Priority | Status | Summary | Current PR? |
|---|---|---:|---|---|---|
| DEC-001 | Decision | P0 | ACCEPTED | Preserve public ID `VIB.FIV.FLOW_TURBULENCE`; FIT is canonical mechanism terminology. | Yes |
| DEC-002 | Decision | P0 | ACCEPTED | Vibration product remains table-only; no 3D/canvas. | Yes |
| DEC-003 | Decision | P0 | ACCEPTED | Preserve Engineering Calculation v1 API/engine authority. | Yes |
| DEC-004 | Decision | P0 | ACCEPTED | Validation/applicability/calculation/assessment/qualification/authority remain distinct. | Yes |
| DEC-005 | Decision | P0 | ACCEPTED | No screening authority until independent qualification. | Yes |
| DEC-009 | Decision | P0 | ACCEPTED | Retained-workbook execution is `WORKBOOK_REFERENCE_ONLY`. | Yes |
| DEC-011 | Decision | P0 | ACCEPTED | Hand-derived benchmarks validate transcription, not method authority. | Yes |
| DEC-012 | Decision | P0 | ACCEPTED | EI worked examples are independent engineering benchmark evidence and take precedence over conflicting workbook cache/UI state. | Yes |
| RISK-001 | Risk | Critical | ACCEPTED | Unqualified empirical implementation could create false engineering authority. | Mitigated by benchmark gate |
| ISS-009 | Defect | High | IN_PROGRESS | Workbook cached 4 Hz advanced behavior conflicts with EI method limit. Stage 11 will enforce EI `>1, <=3 Hz`. | Yes |
| ISS-010 | Defect | High | SOFTWARE_RESOLVED | Hidden workbook support selector conflicts with deterministic span support. Cached selector excluded. | Yes |
| ISS-011 | External CI | High | DONE | Actions runner blocked by account billing/spending condition. | External |
| ISS-012 | Defect | High | CONFIRMED | Advanced eligibility incorrectly accepts exactly 1 Hz; EI requires greater than 1 Hz. | Yes |
| ISS-013 | Defect | High | CONFIRMED | Large medium/flexible family starts at 273.05 mm in code, rejecting EI D4 273 mm published example. | Yes |
| IMP-014 | Improvement | P0 | ACCEPTED | Support authoritative multiphase effective density + velocity input in addition to component-derived resolution. | Yes |
| IMP-015 | Improvement | P1 | ACCEPTED | Preserve EI reference action bands 0.3/0.5/1.0 without exposing production pass/fail. | Yes |
| QST-001 | Question | P0 | INVESTIGATING | Remaining exact EI/project method parity outside worked-example coverage. | Forward review |
| QST-002 | Question | P1 | DEFERRED | Final upstream table-exchange format. | Later |
| QST-003 | Question | P0 | INVESTIGATING | Manual medium/flexible OD gap remains between small-family end and large-family start; EI D4 resolves large start at 273 mm but not the full gap. | Yes |

## Stage Roadmap and Execution Log

### Stages 1–5 — roadmap, PR allocation, scope reconciliation, terminology — COMPLETE
Established issue #429 scope, API compatibility and FIT terminology without numerical authority.

### Stage 6 — workbook source tooling — PARTIAL
Source register/extractor implemented. End-to-end extractor run in a normal checkout remains NOT_RUN.

### Stage 7 — physical context — COMPLETE
Universal validation/derived hydraulics implemented and focused regression PASS 6/6.

### Stage 8 — central preflight — COMPLETE / SUPERSEDED
Proved real API/Console consumer path. Replaced by Stage 9 benchmark execution.

### Stage 9 — retained-workbook empirical reference vertical — COMPLETE FOR IMPLEMENTATION
Implemented pure reference kernel, central adapter, benchmark-only Console/API gating, provenance/evidence and retained-source parity. Focused runtime PASS 16/16.

### Stage 10 — qualification dossier + independent hand benchmarks — PARTIAL
Implemented independent hand-derived software benchmarks, qualification dossier and CI investigation. CI failure root cause is external GitHub billing/spending; full checkout tests remain NOT_RUN.

### Stage 11 — EI worked-example qualification — IN_PROGRESS

#### Current truth

The owner provided an Energy Institute worked-examples PDF:

```text
Repository: reallaksh19/Common
Commit:     aef163a5def3bfe04ca0ba860da05728a27daf42
File:       EI - AVIFF Guidelines 2nd Edition_Examples.pdf
Git blob:   3e2517d0df527a051084fc02e69cb7afa31f8d47
Size:       3,757,439 bytes
```

Independent text extraction of the same EI Appendix D content identifies two directly useful FIT benchmark families:

**D2 — Gas compression system**

- gas dynamic-viscosity/FVF examples;
- all assessed lines classified Medium Stiff;
- published Fv values for 4 in Sch 120, 6 in STD, 8 in Sch 120 and 14 in STD;
- published standard LOFs including 0.338 and 0.881 high-reference cases.

**D4 — Separation system**

- 20 in / 508 mm multiphase line, approximately 5 m effective span, Stiff, Fv 45175, LOF 0.26;
- 10 in / 273 mm liquid line, 18 m span, Flexible-Large, Fv 2636, LOF 3.15.

#### Objective

Use EI worked examples as independent benchmark authority for the portions they cover, correct any source-backed implementation defect, and keep unrelated/unverified applicability blocked.

#### Expected Stage 11 files

```text
Benchmarks/VibrationFIT/fit-ei-worked-examples-v1.json
tests/vibration-fit-ei-worked-examples.test.mjs
converters/vibration/fit/method.js
converters/vibration/fit/applicability.js
converters/vibration/fit/calculate.js
converters/vibration/fit/assess.js
converters/engineering-calculations/adapters/vibration-fit.js
docs/vibration/FIT-Engineering-Method-Specification-v1.md
docs/vibration/FIT-Qualification-Dossier-v1.md
Benchmarks/VibrationFIT/fit-independent-hand-benchmarks-v1.json
tests/vibration-fit-independent-benchmarks.test.mjs
agents/PR438_workreport.md
```

No workflow files, 3D/canvas code, AIV/FIP/SBC code or unrelated refactor.

#### Planned implementation

1. Pin EI examples source identity in benchmark data and evidence.
2. Correct advanced eligibility from `1 <= fn <= 3` to `1 < fn <= 3`.
3. Correct large family lower boundary to include EI published 273 mm case; keep unresolved intermediate gap fail-closed.
4. Add an explicit aggregate multiphase path using authoritative effective density + velocity when supplied; component-derived mixture resolution remains available and provenance-distinct.
5. Add benchmark-only EI action-band metadata at LOF `<0.3`, `0.3–<0.5`, `0.5–<1.0`, `>=1.0`; no production `pass` boolean.
6. Add D2/D4 numerical regressions and update hand benchmarks affected by the 1 Hz correction.
7. Reconcile specification/dossier/work report.

#### Edge cases

- exactly 1 Hz must not enter advanced screening;
- exactly 3 Hz may enter when all other conditions are satisfied;
- exactly 273 mm may use large medium/flexible correlation;
- unresolved OD gap above small-family max and below 273 mm remains fail-closed;
- multiphase aggregate density+velocity must be explicit; no hidden approximation from phase labels;
- if both aggregate and component multiphase data are supplied, the resolution policy must be deterministic and provenance-visible;
- EI example values are rounded; tests require tolerances appropriate to published rounding rather than false exact equality.

#### Planned validation

- EI D2 published FVF/Fv/LOF comparisons;
- EI D4 508 mm Stiff and 273 mm Flexible-Large comparisons;
- exactly 1 Hz rejected / 3 Hz accepted advanced-path boundary;
- aggregate versus component-derived multiphase equivalence case;
- SI/US central-engine equivalence retained;
- no design/screening authority promotion;
- changed-file reconciliation and focused Node tests where executable.

#### Known risks

- the EI example PDF is licensed; repository should store only benchmark inputs/outputs/source references necessary for qualification, not reproduce the document;
- published example values are rounded and should not be used to infer greater precision than printed;
- examples cover specific cases, not the entire T2.2 applicability domain.

## Validation and Evidence Ledger

| Validation | Status | Evidence |
|---|---|---|
| Retained workbook identity/reconstruction | PASS | frozen CRF commit/blob; exact primary worksheet extraction |
| Stage 7 physical-context regression | PASS | 6/6 focused |
| Stage 9 reference/API/Console suite | PASS | 16/16 focused branch-module fixture |
| Independent hand benchmark dataset | PASS | derived independently; committed |
| Full independent benchmark test on complete checkout | NOT_RUN | full checkout unavailable |
| GitHub Actions CI | NOT_RUN | runner blocked by account billing/spending gate; no test step executed |
| EI examples source identity | PASS | Common commit/blob metadata |
| EI worked-example numerical regression | NOT_RUN | Stage 11 implementation pending |
| Licensed/project method review beyond example coverage | NOT_RUN | identified reviewer/source review required |
| Screening authority | NOT_RUN | issue #429 remains open |
| Design authority | NOT_APPLICABLE | not claimed |

## Changed-File Scope

Before Stage 11, PR #438 contained 28 reconciled paths. Stage 11 may add/update only the files listed in its expected scope above. Final reconciliation is mandatory before stage closure.

## Next-Agent Handover

- **Current stopping point:** Stage 11 opened before production changes.
- **PR / branch / HEAD:** #438 / `agent/fiv-fit-roadmap-foundation` / pre-Stage-11 head `ebb562e52baf2daf6445822fa6be75fbc1471e96`.
- **Last completed stage:** Stage 10 partial qualification.
- **Current active stage:** Stage 11 — EI worked-example qualification.
- **Start here:** EI D2/D4 benchmark dataset, then source-backed boundary/input corrections and regressions.
- **Do not redo:** broad vibration research, workbook reconstruction, API ID decision, generic Console architecture, CI root-cause investigation.
- **Do not assume:** exactly 1 Hz is valid advanced screening; 273.05 mm is the governing large-family minimum; workbook cache overrides EI example/method evidence.
- **Files currently involved:** Stage 11 expected scope above.
- **Known failing checks:** no known FIT software failure from executed focused tests; GitHub Actions unavailable due billing/spending gate.
- **Validation still required:** EI D2/D4 regressions; full checkout suite; independent vibration-engineering approval.
- **Open QST-*:** QST-001, QST-003; QST-002 deferred.
- **Important deferred IMP-*:** table exchange/workspace after bounded screening qualification.
- **Highest-risk remaining item:** authority promotion before source-backed corrections and independent engineering review close.
- **Exact next recommended action:** implement Stage 11 as planned and keep `BENCHMARK_ONLY`.
- **Required reading:** `docs/FIVroadmap.md`, `docs/vibration/FIT-Engineering-Method-Specification-v1.md`, `docs/vibration/FIT-Qualification-Dossier-v1.md`, issue #429, Common `CodingRules.md`, EI worked examples PDF source pin.
