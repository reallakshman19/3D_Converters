# Agent Engineering Work Report

## PR Mission Control

| Field | Current value |
|---|---|
| Mission | Maintain a dependency-free ASME B31.3-2024 Chapter IX piping-class standardization tool with explicit B31.3 / BPVC VIII-3 authority boundaries. |
| PR number | 437 |
| Branch | `agent/hp-class-standardization-tool` |
| Base commit | `4530b4a98c3b6d6713665228bf3ca8e953a95018` |
| PR status | DRAFT / OPEN |
| Current stage | Stage 11 — controlled KD-3 fatigue-curve interpolation engine — IN PROGRESS |
| Last completed stage | Stage 10 — controlled KD-3 source intake / compatibility gate |
| Engineering status | B31.3 static/class pressure calculations, multi-cycle K304.8.3 matrix, KD-2 pressure-state package, workflow UI, KD-3 source identity and cumulative-usage framework are implemented. Stage 11 adds controlled automatic `Ni` calculation from licensed curve points without embedding Code curve data. |
| Validation status | Stage 10 source identities and regression baseline remain valid. Stage 11 production validation pending. |
| Current blocker | Exact edition-specific KD-312 equations and exact licensed fatigue-curve data from the supplied `kd-3.pdf` cannot be decoded in this connector environment. |
| Exact next action | Implement a source-gated fatigue-curve point loader + no-extrapolation interpolation engine, benchmark its mathematics independently, then update the KD Qualification UI and CSV evidence output. |

## Handover in 60 Seconds

The application is a five-step workflow:

1. **Design Basis**
2. **Static Wall**
3. **Pressure Cycles**
4. **KD Qualification**
5. **Class Envelope**

Controlled sources currently locked into the application:

- B31.3-2024: Common commit `00f47512e96780ebab10416dcc9354f719346457`, blob `3395ececce7731053dd0f6317008b4cd77446b78`.
- VIII-3 KD-2: Common commit `4dd651abbc86310077eaace6caa8b6788c1a6697`, blob `8f20cd0dab683d28359e02207f6f65b834144ec9`.
- VIII-3 KD-3: Common commit `f4d49f2a47d970ae0abf913b537193e324556177`, path `kd-3.pdf`, blob `e6abaddb7833eb0a61c9460ae39201e2252dc596`, size `1179548` bytes.

The exact KD-3 source binary is identified, but its body is not readable through the GitHub connector because the >1 MB PDF is returned as binary and GitHub Actions extraction is currently unavailable on the repository account. Therefore Stage 11 does **not** embed an inferred ASME curve or edition-specific `Seq` formula.

Instead Stage 11 will let an authorized reviewer enter the exact licensed fatigue-curve points and approve the interpolation basis. The tool will then calculate `Ni` from the final controlled `Seq`, with no extrapolation outside the supplied curve range.

## Engineering Invariants

1. Static pressure design and fatigue qualification are separate gates.
2. B31.3-2024 pressure calculations are not changed by KD source/curve tooling.
3. `Delta Sp/2` is not automatically final `Seq`.
4. KD-2 pressure tensors are mechanics inputs/benchmarks, not automatic Article KD-2 approval.
5. KD-3 automation must be tied to the exact project-compatible Division 3 source and approved material route.
6. No generic or silently substituted ASME fatigue curve is embedded.
7. No fatigue-curve extrapolation is permitted by the Stage 11 engine.
8. Curve points, curve identifier, interpolation basis and reviewer approval remain audit fields.
9. Scope remains piping-class standardization only.

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
- exact binary identity: VALIDATED
- source edition/year: REVIEWER CONFIRMATION REQUIRED
- exact KD-312 equation mapping: NOT_YET_VALIDATED
- exact fatigue-curve data: REVIEWER-CONTROLLED INPUT IN STAGE 11

### Reporting protocol

- `CodingRules.md` commit: `43eccc27967ecec7d67513c08255398b496be5ce`

## Mission Status

| Work item | Priority | Status |
|---|---|---|
| K304.1.1 / K304.1.2 static calculations | HIGH | VALIDATED |
| Eq. (35a) pressure-rating QA | HIGH | VALIDATED |
| Multi-cycle K304.8.3 pressure matrix | HIGH | VALIDATED |
| Per-block `Syt` / `2*Syt` gate | HIGH | VALIDATED |
| KD-2 pressure-state package | HIGH | IMPLEMENTED / VALIDATED |
| KD-2 source/evidence gate | HIGH | IMPLEMENTED |
| Five-step workflow UI / reviewer rail | HIGH | IMPLEMENTED |
| KD-3 exact source identity | HIGH | VALIDATED |
| KD-3 source/project edition gate | HIGH | IMPLEMENTED |
| Manual controlled final `Seq` | HIGH | IMPLEMENTED |
| Manual controlled `Ni` | HIGH | IMPLEMENTED |
| Controlled fatigue-curve point input | HIGH | STAGE 11 IN PROGRESS |
| Automatic `Ni` from approved curve points | HIGH | STAGE 11 IN PROGRESS |
| No-extrapolation curve range gate | HIGH | STAGE 11 IN PROGRESS |
| Cumulative `U = sum(n/N)` | HIGH | IMPLEMENTED / VALIDATED |
| Automatic KD-312 `Seq` | HIGH | BLOCKED — exact source route not decoded/validated |
| Embedded ASME fatigue curves | HIGH | PROHIBITED — licensed source data remain external/controlled |
| Material/product libraries | MEDIUM | PLACEHOLDER |
| Routed-system CAESAR/FEA/HCF | LOW | OUT OF SCOPE |

## Engineering Item Register

| ID | Type | Priority | Status | Summary |
|---|---|---|---|---|
| RISK-001 | release risk | CRITICAL | BLOCKED | Applying an unverified KD equation/curve would invalidate fatigue release. |
| RISK-002 | release risk | HIGH | ACCEPTED | `Delta Sp/2` must not silently become final `Seq`. |
| RISK-006 | source risk | HIGH | MITIGATED | Exact KD-3 artifact is source-locked by commit/blob/size. |
| RISK-007 | edition risk | HIGH | MITIGATED | App blocks a confirmed KD-3 source edition that differs from project VIII-3 entry. |
| RISK-008 | curve risk | HIGH | MITIGATING | Stage 11 will prohibit automatic `Ni` unless curve points, curve ID, interpolation approval and source gate are complete. |
| DEC-001 | decision | HIGH | ACCEPTED | Scope stops at piping-class standardization/class-release review. |
| DEC-008 | decision | HIGH | ACCEPTED | KD-3 automation is source-locked to project-compatible controlled evidence. |
| DEC-010 | decision | HIGH | ACCEPTED | Stage 11 may automate mathematical curve interpolation without embedding copyrighted/proprietary Code curve values. |
| DEC-011 | decision | HIGH | ACCEPTED | `Seq` remains a controlled licensed input until exact KD-312 equations are validated from the supplied project-compatible source. |
| IMP-016 | improvement | HIGH | IN PROGRESS | Controlled curve-point parser, validation and interpolation engine. |
| IMP-017 | improvement | HIGH | IN PROGRESS | Auto/manual `Ni` mode with source/range status in fatigue matrix. |
| QST-006 | question | HIGH | OPEN | Confirm exact source/project VIII-3 edition and material fatigue route. |

## Stage Execution Log

### Stages 1-10

B31.3 source validation, K304.1 static calculations, K304.8.3 multi-cycle pressure matrix, KD-2 pressure-state package, cumulative-usage framework, draft PR publication, five-step workflow UI and exact KD-3 source intake: **COMPLETE**.

### Stage 11 — Controlled KD-3 Fatigue-Curve Interpolation Engine

**Objective**

Automate `Ni` only after the final controlled `Seq` is available, using reviewer-entered licensed fatigue-curve data. The engine must not contain a generic ASME curve and must not extrapolate.

**Planned implementation**

- Add fatigue-curve mode: manual `Ni` or controlled curve interpolation.
- Add curve point input using simple `N, Sa` rows.
- Validate all values are finite/positive.
- Reject duplicate cycle values.
- Sort by `N` and require at least two points.
- Require an explicit curve identifier/source reference.
- Require source/project edition compatibility before automatic use.
- Require reviewer confirmation that the entered interpolation method is applicable to the selected licensed curve.
- Implement log-log interpolation as a generic mathematical option; do not label it Code-approved until reviewer confirmation is checked.
- Prohibit extrapolation above or below the entered curve stress range.
- Calculate `Ni` from `Seq` when all gates pass.
- Preserve manual `Ni` mode as a controlled fallback.
- Carry curve source/mode/range result into CSV.
- Keep cumulative `U = sum(n/N)` unchanged except that `N` may now come from the controlled interpolation engine.

**Planned validation**

- JavaScript syntax/static DOM smoke.
- Existing B31.3 numerical regression unchanged.
- Synthetic interpolation benchmark using non-Code points with known log-log result.
- Exact-point lookup benchmark.
- high/low out-of-range -> BLOCKED, no extrapolation.
- invalid/duplicate point inputs -> BLOCKED.
- source/project edition mismatch -> automatic curve mode BLOCKED.

## Changed-File Ledger

Current PR scope before Stage 11 production edits remains six paths:

| File | Purpose |
|---|---|
| `agents/PR437_workreport.md` | Mission control / evidence / handover |
| `engineering/hp-class-standardization/README.md` | Engineering scope, sources and validation |
| `engineering/hp-class-standardization/app.js` | B31.3/KD calculations and class-status logic |
| `engineering/hp-class-standardization/index.html` | Five-step qualification UI |
| `engineering/hp-class-standardization/styles.css` | Workflow/reviewer presentation |
| `engineering/hp-class-standardization/ui.js` | Workflow status and blocker behavior |

Stage 11 intends to modify only the existing report/README/app/index/ui files; no new runtime dependency or source-data file is planned.

## Validation and Evidence Ledger

Validated before Stage 11:

- exact B31.3 artifact identity;
- exact KD-2 artifact identity;
- exact KD-3 artifact identity;
- K304.1 / Eq.35a / K304.8.3 reference calculations;
- pressure-only analytical `Delta SI` benchmark;
- KD-3 source/project edition mismatch gating;
- six-file PR scope.

Stage 11 validation: **PENDING**.

# Appendix A — Next-Agent Handover

PR #437 is entering Stage 11. Do not replace the licensed-data boundary with a generic fatigue curve. The intended next capability is mathematical interpolation of reviewer-entered controlled fatigue data, not reproduction of ASME curve tables.

Do not implement automatic `Seq` until the exact applicable KD-312 provisions are independently verified from the project-compatible controlled source.

# Appendix B — Remaining Data / Review Request

Still required for full automatic KD-3 closure:

- confirmed project BPVC VIII-3 edition/addenda;
- confirmed edition/year of supplied `kd-3.pdf`;
- selected material specification/grade/form/condition;
- exact KD-312 route for associated mean/equivalent alternating stress;
- applicable fatigue-curve identifier and controlled data/equation;
- required material/surface/plasticity/modulus factors;
- independent checker/approval evidence.
