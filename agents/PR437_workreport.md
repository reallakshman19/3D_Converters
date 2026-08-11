# Agent Engineering Work Report

## PR Mission Control

| Field | Current value |
|---|---|
| Mission | Maintain a dependency-free ASME B31.3-2024 Chapter IX piping-class standardization tool with explicit B31.3 / BPVC VIII-3 authority boundaries. |
| PR number | 437 |
| Branch | `agent/hp-class-standardization-tool` |
| Base commit | `4530b4a98c3b6d6713665228bf3ca8e953a95018` |
| Branch HEAD before final report sync | `eb3fca486b4caf022b5fbf38251a733026d0e3a6` |
| PR status | DRAFT / OPEN / MERGEABLE |
| Current stage | Stage 11 — controlled KD-3 fatigue-curve interpolation engine — COMPLETE |
| Last completed stage | Stage 11 |
| Engineering status | B31.3 static/class pressure calculations, multi-cycle K304.8.3 matrix, KD-2 pressure-state package, source-controlled KD-3 workflow, controlled automatic `Ni`, cumulative usage and class-release gates are implemented. |
| Validation status | PASS for local JS syntax, DOM-ID smoke, B31.3 numerical regression, synthetic log-log interpolation, exact-point/out-of-range/invalid curve handling, source-gate integration and six-file PR scope. Browser E2E remains NOT_RUN in this connector-only environment. |
| Current blocker | Automatic edition-specific KD-312 `Seq` remains blocked because the exact supplied KD-3 PDF body cannot be decoded in this environment and must not be replaced with a different edition. |
| Exact next action | Confirm the project/source VIII-3 edition and validate the exact applicable KD-312 associated-mean/equivalent-alternating-stress route; then implement automatic `Seq` behind the existing source gate. |

## Handover in 60 Seconds

The app is a five-stage piping-class qualification workspace:

1. **Design Basis**
2. **Static Wall**
3. **Pressure Cycles**
4. **KD Qualification**
5. **Class Envelope**

Stage 11 adds a controlled fatigue-curve engine. The application still does **not** contain ASME fatigue-curve values and still does **not** assume `Delta Sp/2 = Seq`.

The user/reviewer may choose:

- **Manual Ni** — enter the licensed `Ni` for each wall × cycle row; or
- **Controlled curve Ni** — enter the applicable licensed `N, Sa` curve points, curve ID/source, verify the project/source edition, approve the transcription/interpolation basis, and let the app calculate `Ni` from the final controlled `Seq`.

Automatic curve mode never extrapolates outside the entered stress-amplitude range.

## Controlled Sources

### B31.3-2024

- repo: `reallaksh19/Common`
- commit: `00f47512e96780ebab10416dcc9354f719346457`
- blob: `3395ececce7731053dd0f6317008b4cd77446b78`

### BPVC VIII-3 Article KD-2

- repo: `reallaksh19/Common`
- commit: `4dd651abbc86310077eaace6caa8b6788c1a6697`
- blob: `8f20cd0dab683d28359e02207f6f65b834144ec9`

### BPVC VIII-3 Article KD-3

- repo: `reallaksh19/Common`
- commit: `f4d49f2a47d970ae0abf913b537193e324556177`
- path: `kd-3.pdf`
- blob: `e6abaddb7833eb0a61c9460ae39201e2252dc596`
- size: `1179548` bytes
- binary identity: VALIDATED
- source edition/year: reviewer confirmation required
- exact KD-312 formula route: NOT_YET_VALIDATED
- fatigue curve values: reviewer-controlled licensed input; none embedded in repository

### Reporting protocol

- `CodingRules.md` commit: `43eccc27967ecec7d67513c08255398b496be5ce`

## Engineering Invariants

1. Static pressure design and fatigue qualification are separate gates.
2. B31.3-2024 K304 calculations remain independent of KD source/curve data.
3. `Delta Sp/2` is not final `Seq` unless the applicable licensed KD route independently establishes it.
4. KD-2 analytical pressure tensors are mechanics inputs/benchmarks, not automatic approval.
5. KD-3 automation is source- and edition-gated.
6. No generic or copied ASME curve is embedded.
7. Curve transcription, curve identifier/source, interpolation approval and row approval remain auditable evidence fields.
8. Automatic `Ni` performs **no extrapolation**.
9. Scope stops at bounded piping-class standardization/class-release review.

## Mission Status

| Work item | Priority | Status |
|---|---|---|
| K304.1.1 / K304.1.2 static calculations | HIGH | VALIDATED |
| Eq. (35a) pressure-rating QA | HIGH | VALIDATED |
| Multi-cycle K304.8.3 pressure matrix | HIGH | VALIDATED |
| Per-block `Syt` / `2*Syt` gate | HIGH | VALIDATED |
| KD-2 pressure-state package | HIGH | IMPLEMENTED / VALIDATED |
| KD-2 source/evidence gate | HIGH | IMPLEMENTED |
| Five-step workflow / reviewer rail | HIGH | IMPLEMENTED |
| Exact KD-3 artifact identity | HIGH | VALIDATED |
| KD-3 project/source edition compatibility gate | HIGH | IMPLEMENTED |
| Controlled final `Seq` input | HIGH | IMPLEMENTED |
| Manual licensed `Ni` mode | HIGH | IMPLEMENTED |
| Controlled fatigue-curve point parser | HIGH | IMPLEMENTED / VALIDATED |
| Automatic `Ni` from approved curve points | HIGH | IMPLEMENTED / VALIDATED |
| No-extrapolation range gate | HIGH | IMPLEMENTED / VALIDATED |
| `Ui=n/Ni` and cumulative usage | HIGH | IMPLEMENTED / VALIDATED |
| Automatic KD-312 `Seq` | HIGH | BLOCKED — exact edition-specific route not decoded/validated |
| Embedded ASME fatigue curves | HIGH | PROHIBITED |
| Material/product libraries | MEDIUM | PLACEHOLDER |
| Routed-system CAESAR/FEA/HCF | LOW | OUT OF SCOPE |

## Engineering Item Register

| ID | Type | Priority | Status | Summary |
|---|---|---|---|---|
| RISK-001 | release risk | CRITICAL | BLOCKED | Unverified KD equations/curve data must not be used for release. |
| RISK-002 | release risk | HIGH | MITIGATED | `Delta Sp/2` remains a descriptor; final `Seq` is separately controlled. |
| RISK-006 | source risk | HIGH | MITIGATED | KD-3 binary is locked by exact commit/blob/size. |
| RISK-007 | edition risk | HIGH | MITIGATED | Source/project year mismatch and compatibility review are explicit gates. |
| RISK-008 | curve risk | HIGH | MITIGATED | Curve mode requires source, approvals, valid points and no extrapolation. |
| DEC-001 | decision | HIGH | ACCEPTED | Scope stops at piping-class standardization. |
| DEC-008 | decision | HIGH | ACCEPTED | KD-3 automation is source-gated. |
| DEC-010 | decision | HIGH | ACCEPTED | Mathematical interpolation may be automated without storing proprietary Code curve values. |
| DEC-011 | decision | HIGH | ACCEPTED | `Seq` remains controlled until exact KD-312 provisions are validated. |
| IMP-016 | improvement | HIGH | DONE | Controlled curve parser / validation / interpolation engine. |
| IMP-017 | improvement | HIGH | DONE | Manual/automatic `Ni` modes with source/range reporting. |
| QST-006 | question | HIGH | OPEN | Confirm exact project/source VIII-3 edition and material fatigue route. |

## Stage 11 — Implementation and Validation

### Implemented

- Added `fatigueCurveMode`: manual licensed `Ni` or controlled curve interpolation.
- Added reviewer-entered curve points as `N, Sa(MPa)` pairs.
- Added curve source/transcription reference, curve ID and approval fields.
- Added source/project edition compatibility review checkbox.
- Added log-log interpolation option with explicit reviewer approval.
- Added parser requirements:
  - positive finite values;
  - at least two points;
  - unique `N`;
  - unique `Sa`;
  - strictly decreasing `Sa` as `N` increases.
- Added exact-point lookup.
- Added log-log interpolation between bounding points.
- Added hard no-extrapolation behavior above/below the entered curve range.
- Added `Ni basis / range` in the KD-3 matrix.
- Added curve/source/mode/interpolation metadata to CSV output.
- Updated reviewer rail and blockers for KD-3 source, curve and row evidence.
- Preserved manual `Ni` as a controlled fallback.
- Left automatic KD-312 `Seq` disabled.

### Validated file identities

- `app.js`: `9ca7deccc26cc998b6416f3fee129d5f35cf16f1`
- `ui.js`: `890fa2b1f5aee2725fef350d2a945921e0b5a58d`
- `index.html`: `1505b5527c8627de1890f77262a60bfe29f3afdb`
- `README.md`: `a04811979ec3c3f598779d0fa98025c919161e81`

### Local validation

- `node --check app.js`: PASS.
- `node --check ui.js`: PASS.
- Static DOM-ID smoke: PASS — no missing static IDs required by `app.js`/`ui.js`.
- Existing NPS 4 regression: PASS; unchanged baseline:
  - `t = 7.7103934983 mm`
  - `tm = 10.7103934983 mm`
  - Eq. (35a) rating `= 23.0861208520 MPa`
  - `Sp(2) = 14.0665546246 MPa`
  - `Sp(20) = 140.6655462456 MPa`
  - `Delta Sp = 126.5989916210 MPa`
  - pressure-only `Delta SI = 126.5989916210 MPa`
- Synthetic non-Code interpolation benchmark:
  - points `(N=100, Sa=1000)` and `(N=10000, Sa=100)`;
  - input `Seq = 316.227766 MPa`;
  - calculated `Ni = 1000`;
  - PASS.
- Out-of-range synthetic stress: BLOCKED with `no extrapolation`: PASS.
- Duplicate cycle point: rejected: PASS.
- Invalid/nonmonotonic data handling: implemented and source-gated.
- PR changed-file comparison: PASS — exactly six intentional paths.
- Browser E2E / visual interaction: NOT_RUN — no browser runner available in current connected environment.

## Changed-File Ledger

| File | Purpose |
|---|---|
| `agents/PR437_workreport.md` | Mission control / engineering evidence / handover |
| `engineering/hp-class-standardization/README.md` | Scope, controlled sources, Stage 11 engine and validation |
| `engineering/hp-class-standardization/app.js` | B31.3/KD logic, curve parser/interpolation, `Ni`/usage/status/CSV |
| `engineering/hp-class-standardization/index.html` | Five-step UI and controlled fatigue-curve inputs |
| `engineering/hp-class-standardization/styles.css` | Existing workflow/reviewer presentation; no Stage 11 functional dependency added |
| `engineering/hp-class-standardization/ui.js` | Workflow status, source/curve/row blockers and evidence rail |

GitHub PR changed-file comparison: **PASS — six files, all explained.**

## Known / Deferred Work

- Exact KD-2 edition-specific limit automation.
- Automatic KD-312 associated-mean/equivalent-alternating-stress processing.
- Material/property database.
- Pipe product/dimensional-tolerance database.
- Browser E2E in an environment with a browser runner.
- Routed-system fatigue analysis, explicitly out of scope.

# Appendix A — Next-Agent Handover

PR #437 is at a stable Stage 11 checkpoint.

Start at the **KD Qualification** screen. Automatic `Ni` is available only from reviewer-controlled licensed curve points. Do not add generic curve values or assume that `Delta Sp/2` is final `Seq`.

The highest-priority remaining engineering task is to obtain/confirm the project-compatible KD-3 edition and exact KD-312 route, then implement automatic `Seq` with an independent benchmark.

# Appendix B — Remaining Data Request

Required for full automatic fatigue closure:

- project BPVC VIII-3 edition/addenda;
- confirmed edition/year of supplied `kd-3.pdf`;
- selected material specification/grade/form/condition;
- exact KD-312 alternating/mean/equivalent stress provisions;
- applicable curve ID and controlled fatigue data/equation;
- any required modulus/plasticity/penalty factors;
- independent checker/approval evidence.
