# WIP-ei-appendix-b-stage3 — recovery-first handoff

## Recovery Header

```text
HANDOVER_READINESS: IN_PROGRESS
PR_RECOVERY_STATE: ACTIVE
TAKEOVER_AUTHORITY: WRITE_ALLOWED
WORK_INTENT: IMPLEMENT
CRITICALITY: ENGINEERING_CRITICAL
BRANCH: agent/ei-appendix-b-stage3
PARENT: agent/ei-master-pack-stage1@9ed5acbf2e6ab20746c93650ea167e1a59893f3d
CURRENT_MAIN: 0b03855a6d9031c8b531e23bdd3deea3b7fdc5d4
DEPENDENCY: PR #507 registry framework
COORDINATION: SAFE — no open Appendix-B/property-master PR found; intentionally independent of SBC PR #508
MERGE_AUTHORITY: NOT_GRANTED
EXACT_NEXT_ACTION: add pinned Appendix-B candidate masters and exact-grid inspection tests without activating runtime authority
```

## Mission

Create Stage 3 shared EI AVIFF reference/default masters from the owner-pinned source package:

```text
reallaksh19/Advanced_Analysis@6111ddbc0f27dd95b50a80c569a2c4daba3b3921
docs/EI data/Appendix_B_Defaults_and_Fluid_Properties.md
blob 1d26832aa3ba1e2a99f680ea3d8243490e0ffeb6
```

Deliver reusable candidate records for common properties and T2.3 baseline mechanical-excitation data while preserving precedence:

```text
explicit project data > governed EI method master > Appendix-B default
```

Appendix-B defaults must never silently overwrite project data.

## Planned masters

1. liquid speed of sound at reference temperature;
2. gas dynamic viscosity exact temperature grid;
3. gas molecular-weight / gamma / sonic-velocity reference values;
4. water vapor-pressure exact temperature grid;
5. Reynolds-number / characteristic-dimension method rule;
6. T2.3 mechanical-excitation baseline LOF method table.

## Authority boundary

```text
publicationState     = CANDIDATE
engineeringAuthority = NONE
screeningAuthority   = NOT_AUTHORIZED
designAuthority      = false
masterDataAuthority  = false
runtime activation   = false
```

Property/default records use `EI_DEFAULT_PROPERTY`. Reynolds and T2.3 method rules use `EI_METHOD_MASTER`.

No interpolation/extrapolation will be introduced in this stage. Exact keyed/grid lookup only.

## Source reconciliation

Pinned Appendix-B source states:
- Appendix B sample parameters: printed pages 158–161 / PDF pages 166–169;
- T2.3 mechanical excitation: printed page 54 / PDF page 62;
- liquid speed of sound reference is 20 C;
- gas viscosity grid temperatures are -50, 0, 50, 150, 250, 350, 450 C;
- water vapor-pressure grid temperatures are 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 120, 150 C;
- README governance requires explicit project data to outrank Appendix-B defaults.

## Appendix A — Implementation Takeover Qualification

### A1 Production trace — 20/20
Stage 3 depends only on PR #507's `VibrationMaster.v1` canonical/validation/registry path. It does not depend on PR #508 SBC UI/runtime changes. New candidate records must be sealed by the #507 registry and remain inaccessible to the ACTIVE-only runtime resolver.

### A2 Current failure isolation — 20/20
Current product lacks centralized Appendix-B property/default records. Future mechanisms would otherwise duplicate fluid/reference constants or continue to require manual values. The gap is data governance/reuse, not a numerical solver failure.

### A3 Authority / invariant — 20/20
Protected invariant: candidate/default data cannot become screening/design authority and cannot silently override explicit project data. `resolveVibrationMaster` must continue to reject CANDIDATE records.

### A4 Independent validation — 19/20
Independent oracles are the pinned Appendix-B source rows/locators plus consolidated-register corroboration. Exact-grid probes will be hard-coded from source values; off-grid probes must fail rather than interpolate. Repository-native execution may remain NOT_RUN in connector-only runtime.

### A5 Next-commit / minimal patch — 19/20
Add new source/data/candidate modules and focused tests; edit only `converters/vibration/masters/index.js` to export the capability. Do not modify workflows, UI, mechanism calculators, FIT/AIV/SBC equations or publication states.

```text
APPENDIX_A_SCORE: 98/100
IMPLEMENTATION_AUTHORITY: GRANTED_FOR_THIS_BOUNDED_STAGE
```

## Backup / rollback evidence

Repository backup CLI (`node utils/backup.js save ...`) is unavailable through the GitHub connector, therefore it is `NOT_RUN`. Before editing existing files retain exact Git blob identities here.

```text
converters/vibration/masters/index.js
pre-edit blob = 91df0169e002ec90712412c904f57ef3ff95f6f0
```

All other planned Stage-3 artifacts are new files.

## Validation Ledger

| Check | Status | Observation | Oracle |
|---|---|---|---|
| current main / parent grounding | PASS | GitHub inspection | repository state |
| Appendix-B pinned source identity | PASS | GitHub file inspection | pinned source |
| active PR overlap | PASS | no matching open PR | repository state |
| repository backup CLI | NOT_RUN | connector-only runtime | repo policy |
| candidate lookup tests | NOT_RUN | implementation pending | pinned source |
| repository-native Node suite | NOT_RUN | not yet executed | tests |
| browser acceptance | NOT_APPLICABLE | data/API stage only | scope |

## Highest risk

Promoting approximate/digitized Appendix-B reference values into automatic runtime defaults before independent qualification. Mitigation: CANDIDATE-only publication, exact-grid APIs, explicit default acceptance semantics, and ACTIVE-only runtime resolver unchanged.
