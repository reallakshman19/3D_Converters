# Agent Engineering Work Report

## PR Mission Control

| Field | Current value |
|---|---|
| Mission | Maintain a dependency-free ASME B31.3-2024 Chapter IX piping-class standardization web tool with explicit B31.3 / BPVC VIII-3 authority boundaries. |
| PR number | 437 |
| Branch | `agent/hp-class-standardization-tool` |
| Base commit | `4530b4a98c3b6d6713665228bf3ca8e953a95018` |
| PR status | DRAFT / OPEN |
| Current stage | Stage 10 - controlled KD-3 source integration - IN PROGRESS |
| Last completed stage | Stage 9 - workflow UI refactor |
| Engineering status | B31.3 class-side calculations, multi-cycle K304.8.3 matrix, KD-2 pressure-state package, workflow UI and cumulative usage framework are implemented. User has now supplied a controlled KD-3 PDF source. |
| Validation status | Stage 9 PASS. KD-3 source identity PASS; exact PDF text/equations are being extracted before any calculation code is changed. |
| Current blocker | Exact KD-3 edition/provisions/curves must be read from the supplied PDF before automatic `Seq/Ni` implementation. |
| Exact next action | Extract the user-supplied `kd-3.pdf`, map KD-310/KD-320/KD-330 requirements, then implement only the validated straight-pipe pressure-only route. |

## Handover in 60 Seconds

The app is a five-step qualification workflow: **Design Basis -> Static Wall -> Pressure Cycles -> KD Qualification -> Class Envelope**. Stage 9 left the Stage 8 engineering calculation blob unchanged.

New Stage 10 controlled source supplied by user:

- repository: `reallaksh19/Common`
- commit: `f4d49f2a47d970ae0abf913b537193e324556177`
- path: `kd-3.pdf`
- blob SHA: `e6abaddb7833eb0a61c9460ae39201e2252dc596`
- Git tree size: `1179548` bytes

The GitHub connector identifies the binary but does not decode the PDF body directly. A temporary branch-only Actions extraction step is being used to obtain text from this exact artifact. Do not substitute a different edition/mirror for implementation authority.

## Engineering Invariants

1. Static pressure design and fatigue qualification remain separate gates.
2. B31.3-2024 calculations stay unchanged unless a defect is demonstrated.
3. `Delta Sp/2` is not automatically final `Seq`.
4. KD-2 analytical pressure tensors are mechanics inputs/benchmarks, not automatic approval.
5. KD-3 automation must be tied to the exact supplied source and applicable material route.
6. No generic fatigue curve or undocumented interpolation is allowed.
7. Missing Code/evidence inputs remain visibly blocked.
8. Scope remains piping-class standardization only.

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
- file: `kd-3.pdf`
- blob: `e6abaddb7833eb0a61c9460ae39201e2252dc596`
- size: `1179548` bytes
- source text extraction: IN PROGRESS

### Reporting protocol
- `CodingRules.md` commit: `43eccc27967ecec7d67513c08255398b496be5ce`

## Mission Status

| Work item | Priority | Status |
|---|---|---|
| K304.1.1 / K304.1.2 static calculations | HIGH | VALIDATED |
| Eq. (35a) pressure-rating QA | HIGH | VALIDATED |
| Multi-cycle K304.8.3 pressure matrix | HIGH | VALIDATED |
| KD-2 pressure-state package | HIGH | IMPLEMENTED / VALIDATED |
| Five-step workflow UI / reviewer rail | HIGH | IMPLEMENTED |
| Controlled KD-3 source identity | HIGH | VALIDATED |
| Exact KD-3 text / edition / equations | HIGH | IN PROGRESS |
| Automatic licensed KD-3 `Seq` | HIGH | BLOCKED pending extraction/validation |
| Automatic fatigue-curve `Ni` | HIGH | BLOCKED pending curve validation |
| KD-330 cumulative usage arithmetic | HIGH | IMPLEMENTED; exact source mapping pending |
| Material/product libraries | MEDIUM | PLACEHOLDER |
| Routed-system CAESAR/FEA | LOW | OUT OF SCOPE |

## Engineering Item Register

| ID | Type | Priority | Status | Summary |
|---|---|---|---|---|
| RISK-001 | release risk | CRITICAL | BLOCKED | Wrong KD equation/curve edition would invalidate fatigue release. |
| RISK-002 | release risk | HIGH | ACCEPTED | `Delta Sp/2` must not silently become final `Seq`. |
| RISK-006 | source risk | HIGH | MITIGATING | Exact KD-3 binary is identified; text is being extracted from that artifact before coding. |
| DEC-001 | decision | HIGH | ACCEPTED | Scope stops at piping-class standardization/class-release review. |
| DEC-008 | decision | HIGH | ACCEPTED | KD-3 implementation will be source-locked to the supplied PDF; secondary sources may only be cross-checks. |
| IMP-015 | improvement | HIGH | IN PROGRESS | Replace manual KD-3 placeholders with validated calculation logic where source permits. |
| QST-006 | question | HIGH | IN PROGRESS | Which exact KD-3 material/curve route applies to the selected class material? |

## Stage Execution Log

### Stages 1-9

B31.3 source validation, static wall/rating calculations, K304.8.3 multi-cycle matrix, KD-2 stress-state package, cumulative-usage framework, draft PR publication and five-step workflow UI: **COMPLETE**.

### Stage 10 - Controlled KD-3 Source Integration

**Pre-implementation source check**

- User-supplied GitHub path resolved exactly.
- Commit: `f4d49f2a47d970ae0abf913b537193e324556177`.
- Blob: `e6abaddb7833eb0a61c9460ae39201e2252dc596`.
- Size: `1179548` bytes.
- GitHub connector binary-body decode: unavailable.
- Exact-source extraction method: temporary GitHub Actions `pdftotext` job on the PR branch; temporary workflow will be removed before Stage 10 closeout.

**Planned implementation after extraction**

1. Identify KD-300/KD-310/KD-320/KD-330 structure and exact source edition.
2. Identify the straight-pipe pressure-only principal-direction route.
3. Implement `Salt` / associated mean stress / `Seq` only where the source provides a deterministic applicable route.
4. Implement fatigue-curve `Ni` only if the exact applicable curve data/equation can be represented without inventing copyrighted/unavailable values.
5. Keep unsupported material/weld/special routes blocked.
6. Benchmark the NPS 4 pressure-only case independently.

## Changed-File Ledger

Current intentional production paths:

- `agents/PR437_workreport.md`
- `engineering/hp-class-standardization/README.md`
- `engineering/hp-class-standardization/app.js`
- `engineering/hp-class-standardization/index.html`
- `engineering/hp-class-standardization/styles.css`
- `engineering/hp-class-standardization/ui.js`

A temporary `.github/workflows/tmp-extract-kd3.yml` may appear during Stage 10 extraction and must be deleted before final PR ledger closeout.

## Validation and Evidence Ledger

Stage 9 calculation baseline remains unchanged:

- `t = 7.7103934983 mm`
- `tm = 10.7103934983 mm`
- required nominal wall `= 12.2404497124 mm`
- Eq. (35a) rating `= 23.0861208520 MPa`
- `Sp(2) = 14.0665546246 MPa`
- `Sp(20) = 140.6655462456 MPa`
- `Delta Sp = 126.5989916210 MPa`
- pressure-only `Delta SI = 126.5989916210 MPa`

# Appendix A - Next-Agent Handover

Stage 10 is active. Do not code KD-3 formulas from memory or a different edition. First extract and map the supplied source. Preserve the Stage 9 UI and B31.3/KD-2 mechanics unless a separately demonstrated defect requires change.

# Appendix B - Remaining Data / Review Needs

After source extraction, still confirm: exact VIII-3 edition, selected material spec/grade/form/condition, applicable KD fatigue curve/category, temperature/modulus inputs, product dimensions/tolerances, and reviewer/approval evidence.