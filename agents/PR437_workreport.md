# Agent Engineering Work Report

## PR Mission Control

| Field | Current value |
|---|---|
| Mission | Maintain a dependency-free ASME B31.3-2024 Chapter IX piping-class standardization tool with explicit BPVC VIII-3 KD authority gates. |
| PR number | 437 |
| Branch | `agent/hp-class-standardization-tool` |
| Base commit | `4530b4a98c3b6d6713665228bf3ca8e953a95018` |
| PR status | DRAFT / OPEN / MERGEABLE |
| Current stage | Stage 12 - controlled automatic KD-312 `Seq` processor - IN PROGRESS |
| Last completed stage | Stage 11 - controlled fatigue-curve `Ni` engine |
| Current engineering status | B31.3 static/pressure calculations, multi-cycle K304.8.3, KD-2 pressure-state package, controlled KD-3 source gates, manual `Seq`, automatic/manual `Ni`, cumulative usage and class-envelope review are implemented. |
| Current blocker | Exact project-compatible KD-312 route remains an authority decision. Automatic `Seq` must therefore be route-selectable and reviewer-approved rather than inferred from material/edition. |
| Exact next action | Implement pressure-only unchanged-principal-direction `Salt`/associated-normal processing and gated automatic `Seq` modes without embedding Code-specific numeric constants. |

## Handover in 60 Seconds

The app workflow remains:

1. **Design Basis**
2. **Static Wall**
3. **Pressure Cycles**
4. **KD Qualification**
5. **Class Envelope**

Stage 12 is limited to the straight-pipe pressure-only class case already supported by the analytical KD-2 stress package. Principal directions are fixed for this model. The new processor will calculate the three KD-style principal-stress-difference pairs and their alternating intensities, then permit automatic `Seq` only through a reviewer-selected route.

Planned automatic `Seq` routes:

- **Mean stress embedded in selected fatigue curve**: `Seq = Salt` for each stress pair, only when the reviewer confirms the licensed KD route says the selected curve incorporates mean-stress effects.
- **Explicit normalized mean-stress correction**: use the reviewer-entered correction coefficient, reference-cycle count, correction-term cap and the approved fatigue curve to calculate the reference amplitude; no Code numeric constants are preloaded.
- **Manual / special route**: retain controlled manual `Seq` for changing principal axes, inelastic/special analysis, or any route not represented by the two automatic modes.

## Controlled Sources

### ASME B31.3-2024
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
- exact edition/year and project compatibility: reviewer-controlled gate

### Reporting protocol
- `CodingRules.md` commit: `43eccc27967ecec7d67513c08255398b496be5ce`

## Engineering Invariants

1. Static pressure design and fatigue qualification are separate gates.
2. B31.3 calculations are not altered by KD source/route selection.
3. `Delta Sp/2` is a pressure-only mechanics descriptor, not automatically final `Seq`.
4. Automatic KD-312 processing is limited to the analytical pressure-only case with unchanged principal directions.
5. No edition-specific coefficient, correction limit or fatigue-curve value may be silently embedded.
6. Reviewer must confirm source edition/project compatibility and the exact selected `Seq` route.
7. Inelastic/special cases remain outside the automatic route.
8. Automatic `Ni` never extrapolates outside reviewer-entered approved fatigue-curve data.
9. Scope stops at bounded piping-class standardization/class-release review.

## Mission Status

| Work item | Status |
|---|---|
| K304.1.1/K304.1.2 static wall | VALIDATED |
| Eq. (35a) pressure rating | VALIDATED |
| Multi-cycle K304.8.3 pressure matrix | VALIDATED |
| `2*Syt` gate | VALIDATED |
| KD-2 pressure stress-state package | IMPLEMENTED / VALIDATED |
| KD-3 source identity / edition gate | IMPLEMENTED |
| Manual `Seq` | IMPLEMENTED |
| Controlled fatigue-curve parser | IMPLEMENTED / VALIDATED |
| Automatic `Ni` / no extrapolation | IMPLEMENTED / VALIDATED |
| Cumulative `U=sum(n/N)` | IMPLEMENTED / VALIDATED |
| Pressure-only `Salt12/Salt23/Salt31` | STAGE 12 IN PROGRESS |
| Pressure-only associated normal/mean descriptors | STAGE 12 IN PROGRESS |
| Automatic `Seq = Salt` mean-embedded route | STAGE 12 IN PROGRESS |
| Automatic explicit mean-correction route | STAGE 12 IN PROGRESS |
| Changing-axis KD-313 automation | OUT OF CURRENT SCOPE |
| Inelastic KD route | SPECIAL / MANUAL |

## Engineering Item Register

| ID | Type | Priority | Status | Summary |
|---|---|---|---|---|
| RISK-001 | release risk | CRITICAL | MITIGATED | Unverified KD equations/curve data remain blocked by source/approval gates. |
| RISK-002 | release risk | HIGH | MITIGATED | `Delta Sp/2` is not silently mapped to final `Seq`. |
| RISK-007 | edition risk | HIGH | MITIGATED | Project/source edition mismatch and compatibility review are explicit. |
| RISK-009 | route risk | HIGH | ACTIVE | Different KD editions/material routes treat associated mean stress differently; automatic route must be explicit. |
| DEC-012 | decision | HIGH | ACCEPTED | Automatic `Seq` will be route-selectable, not material-inferred. |
| DEC-013 | decision | HIGH | ACCEPTED | No Code-specific beta/reference-cycle/cap values will be preloaded; reviewer supplies them when that route is used. |
| IMP-018 | improvement | HIGH | IN PROGRESS | Pressure-only principal-pair `Salt`/mean/`Seq` processor. |

## Stage 12 Plan

### Implementation

- derive principal stresses from the existing analytical pressure states using fixed order `sigma1=hoop`, `sigma2=axial`, `sigma3=radial`;
- calculate signed `S12`, `S23`, `S31` at both cycle endpoints;
- calculate `Salt_ij = 0.5*(max(Sij)-min(Sij))`;
- calculate associated plane-normal stresses `sigma_n12`, `sigma_n23`, `sigma_n31` at both endpoints;
- calculate the conservative elastic average descriptor `max(0, 0.5*(sigma_n_max+sigma_n_min))` for route input/reporting;
- expose automatic route controls and source/approval fields;
- fill `Seq` automatically only when the selected route gate is complete;
- report controlling pair and calculation basis in the fatigue matrix and CSV;
- feed resulting `Seq` into the existing controlled `Ni` engine.

### Validation targets

Reference NPS 4 / 13.49 mm / 2 to 20 MPa case:

- controlling pressure-only `Salt` expected about `63.2995 MPa`;
- controlling associated normal-stress descriptor expected about `27.683 MPa`;
- mean-embedded route should return `Seq = 63.2995 MPa` exactly within numerical tolerance;
- explicit mean-correction synthetic test will use non-Code curve/parameters and be independently checked;
- B31.3 Stage 11 regression values must remain unchanged.

## Changed-File Ledger

Expected Stage 12 paths remain within the existing PR scope:

| File | Purpose |
|---|---|
| `agents/PR437_workreport.md` | stage plan/status/evidence/handover |
| `engineering/hp-class-standardization/app.js` | KD-312 pressure-only calculations and Seq route gates |
| `engineering/hp-class-standardization/index.html` | Seq route controls and basis/result column |
| `engineering/hp-class-standardization/ui.js` | reviewer status/blockers for Seq route |
| `engineering/hp-class-standardization/README.md` | updated engineering scope and authority boundary |
| `engineering/hp-class-standardization/styles.css` | no Stage 12 functional change expected |

# Appendix A - Handover

If interrupted, resume at Stage 12. Do not infer the selected KD-312 material/mean-stress route from material name alone. Keep manual/special `Seq` available and require reviewer approval for either automatic route.

# Appendix B - Remaining Authority Inputs

For production release, retain:

- project BPVC VIII-3 edition/addenda;
- confirmed edition of supplied KD-3 source;
- material specification/grade/form/condition;
- exact licensed KD-312 route and clause reference;
- route approval;
- if explicit mean correction is selected: licensed coefficient, reference cycle count, correction-term limit and curve source;
- approved fatigue curve data;
- fracture/KD-4 disposition;
- checker/approval evidence.
