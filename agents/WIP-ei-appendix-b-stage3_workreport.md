# WIP-ei-appendix-b-stage3 — recovery-first handoff

## Recovery Header

```text
HANDOVER_READINESS: READY_FOR_PR_ALLOCATION
PR_RECOVERY_STATE: ACTIVE
TAKEOVER_AUTHORITY: WRITE_ALLOWED
WORK_INTENT: IMPLEMENT / VALIDATE / HANDOVER
CRITICALITY: ENGINEERING_CRITICAL
BRANCH: agent/ei-appendix-b-stage3
TECHNICAL_HEAD_BEFORE_REPORT_SYNC: fc8d8f6e6fe6db940a198b67644e6cb1dd843137
PARENT: agent/ei-master-pack-stage1@9ed5acbf2e6ab20746c93650ea167e1a59893f3d
CURRENT_MAIN: 0b03855a6d9031c8b531e23bdd3deea3b7fdc5d4
DEPENDENCY: PR #507 registry framework
COORDINATION: SAFE — no open Appendix-B/property-master PR found; independent of SBC PR #508
MERGE_AUTHORITY: NOT_GRANTED
EXACT_NEXT_ACTION: allocate a draft PR on top of #507, replace this WIP report with agents/PR<NUMBER>_workreport.md, then perform exact-head hosted-status reconciliation
```

## Mission / Delivered Capability

Stage 3 creates shared EI AVIFF reference/default masters from the owner-pinned source package:

```text
reallaksh19/Advanced_Analysis@6111ddbc0f27dd95b50a80c569a2c4daba3b3921
docs/EI data/Appendix_B_Defaults_and_Fluid_Properties.md
blob 1d26832aa3ba1e2a99f680ea3d8243490e0ffeb6
size 7972 bytes
```

Delivered six `VibrationMaster.v1` candidate families:

1. liquid speed of sound at 20 C — `EI_DEFAULT_PROPERTY`;
2. gas dynamic viscosity exact temperature grid — `EI_DEFAULT_PROPERTY`;
3. gas molecular-weight / gamma / sonic-velocity references — `EI_DEFAULT_PROPERTY`;
4. water vapor-pressure exact temperature grid — `EI_DEFAULT_PROPERTY`;
5. Reynolds-number / characteristic-dimension rule — `EI_METHOD_MASTER`;
6. T2.3 mechanical-excitation baseline LOF method table — `EI_METHOD_MASTER`.

Two bounded usable candidate evaluators are also delivered:

```text
calculateEiAviffReynoldsCandidate(input)
evaluateEiAviffMechanicalBaselineCandidate(sourceKeys)
```

The mechanical evaluator selects the maximum exact numeric baseline across the supplied connected/adjacent machine source keys. The shared-support transfer rule is intentionally inspection-only because it requires an explicit adjacent-line LOF rather than a fixed baseline.

## Default precedence / authority invariant

Pinned package governance states:

```text
PROJECT_EXPLICIT > ACTIVE_EI_METHOD_MASTER > APPENDIX_B_DEFAULT
```

Stage 3 encodes:

```text
automaticFallbackAllowed = false
explicitAcceptanceRequired = true
interpolationAllowed = false
extrapolationAllowed = false
```

Appendix-B defaults therefore cannot silently overwrite explicit project data.

All Stage-3 records remain:

```text
publicationState     = CANDIDATE
engineeringAuthority = NONE
screeningAuthority   = NOT_AUTHORIZED
designAuthority      = false
masterDataAuthority  = false
runtime activation   = false
```

The existing #507 ACTIVE-only resolver is unchanged and rejects these CANDIDATE records.

## Source / provenance

Primary Stage-3 transcription source:

```text
repository = reallaksh19/Advanced_Analysis
commit     = 6111ddbc0f27dd95b50a80c569a2c4daba3b3921
path       = docs/EI data/Appendix_B_Defaults_and_Fluid_Properties.md
blob       = 1d26832aa3ba1e2a99f680ea3d8243490e0ffeb6
size       = 7972
```

Package corroboration:

```text
EI_AVIFF_Complete_Master_Register.md
blob = 51bca43473be8018d4ce48fb440ee4d7bd0abc82
size = 32592
```

Governance source:

```text
README.md
blob = 72730d065bcd2aa80976f0ad2870aafacff0bb4c
size = 3472
```

Worked-example oracle:

```text
EI_AVIFF_Guidelines_2nd_Edition_Examples.md
blob = c050cd90802c27241c510c6f0ac43bfaf7a89e9d
size = 99120
```

Controlled EI PDF reconciliation is still not performed in this stage; therefore source values remain CANDIDATE.

## Source semantics retained

### Appendix B.8.2 liquid speed of sound
- reference temperature 20 C;
- exact canonical fluid keys only;
- no synonym/nearest-fluid matching.

### Appendix B.9 Reynolds number

```text
Re = rho * v * Dchar / (1000 * mu)
```

Units retained:

```text
rho   kg/m3
v     m/s
Dchar mm
mu    Pa.s
```

Characteristic dimensions:
- deadleg T2.6.3 -> main pipe internal diameter;
- straight thermowell -> Dtw tip;
- tapered/stepped thermowell -> D2 tip.

Candidate evaluator fails closed on missing/nonpositive density, characteristic dimension or viscosity. Zero velocity remains mathematically valid.

### Figure B-1 gas viscosity
Exact source temperatures only:

```text
-50, 0, 50, 150, 250, 350, 450 C
```

No interpolation or extrapolation.

### Gas thermodynamic defaults
Preserves source molecular weight, gamma, sonic velocity and reference temperature. Steam/water vapor is explicitly referenced at 100 C; the other tabulated gases are 20 C references.

### Figure B-6 water vapor pressure
Exact source temperatures only:

```text
0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 120, 150 C
```

No interpolation or extrapolation.

### T2.3 mechanical excitation
Numeric baseline keys include reciprocating/PD, engine drive, screw compressor/pump, centrifugal pump, motor/alternator power bands, centrifugal compressor, gas turbine and fan/blower.

Shared-support rule:

```text
adjacent LOF threshold = 0.50
result = equal adjacent LOF
```

It is deliberately blocked from direct numeric-baseline evaluation until adjacent-line applicability is supplied explicitly.

## Independent worked-example constraint

Pinned EI Appendix D example D2.4 states:

```text
centrifugal compressor LOF = 0.2
electric motor >15 kW LOF = 0.4
governing mechanical LOF  = 0.4
```

A dedicated regression encodes that expected result independently of the evaluator implementation.

## Appendix A — Implementation Takeover Qualification

### A1 Production trace — 20/20
Stage 3 depends only on PR #507's `VibrationMaster.v1` canonical/validation/registry path and its ACTIVE-only runtime resolver. It does not depend on PR #508 SBC UI/runtime changes.

### A2 Current failure isolation — 20/20
The gap is centralized governed reference/default data. Without Stage 3, future T2.3/T2.6/T2.8/T2.9/T4 consumers would duplicate constants or require unnecessary manual entry.

### A3 Authority / invariant — 20/20
Candidate/default data cannot become screening/design authority and cannot silently override explicit project data. No runtime activation or publication-state transition is introduced.

### A4 Independent validation — 19/20
Oracles are the pinned Appendix-B source values/locators, consolidated package corroboration and D2.4 worked-example expected result. Exact-grid misses are permanent fail-closed tests. Controlled PDF reconciliation and repository-native execution remain pending.

### A5 Minimal patch — 19/20
The patch is limited to shared master/data/evaluator APIs, one export surface, source evidence and focused regressions. No workflows, UI, mechanism matrix, FIT, AIV or SBC equations are modified.

```text
APPENDIX_A_SCORE: 98/100
IMPLEMENTATION_AUTHORITY: GRANTED_FOR_THIS_BOUNDED_STAGE
```

## Backup / rollback evidence

Repository backup CLI:

```text
node utils/backup.js save ... = NOT_RUN
reason = connector-only runtime
```

Exact pre-edit rollback evidence for the only existing file modified:

```text
converters/vibration/masters/index.js
pre-edit blob = 91df0169e002ec90712412c904f57ef3ff95f6f0
current Stage-3 blob = 9485d16977be274f6b6da60c6b32a5c5bf1a044e
```

All other Stage-3 files are new.

## Changed-File Ledger

```text
agents/WIP-ei-appendix-b-stage3_workreport.md
converters/vibration/masters/ei-aviff-appendix-b-data.js
converters/vibration/masters/ei-aviff-appendix-b-candidate.js
converters/vibration/masters/ei-aviff-appendix-b-evaluator.js
converters/vibration/masters/index.js
data/vibration/ei-aviff-2e/appendix-b-stage3-source.v1.json
tests/vibration-appendix-b-master-stage3.test.mjs
tests/vibration-appendix-b-module-boundaries-stage3.test.mjs
tests/vibration-appendix-b-worked-example-stage3.test.mjs
tests/vibration-appendix-b-evaluator-stage3.test.mjs
```

Parent-to-head comparison before report sync:

```text
base   = agent/ei-master-pack-stage1@9ed5acbf2e6ab20746c93650ea167e1a59893f3d
head   = fc8d8f6e6fe6db940a198b67644e6cb1dd843137
ahead  = 12
behind = 0
files  = 10
```

## Validation Ledger

| Check | Status | Observation | Oracle / limitation |
|---|---|---|---|
| current main / parent grounding | PASS | GitHub inspection | main and #507 unchanged |
| active PR overlap | PASS | GitHub PR search | no Appendix-B/property-master overlap |
| pinned source identity | PASS | exact repo/commit/path/blob/size | owner-selected package |
| package governance precedence | PASS | README inspection | explicit project data outranks defaults |
| exact source values / locators | PASS | Appendix-B source inspection | package transcription |
| consolidated package corroboration | PASS | package register inspection | secondary package corroboration |
| EI D2.4 mechanical oracle | PASS | worked-example source inspection | 0.2 + 0.4 -> governing 0.4 |
| new JS <300 physical lines | PASS | branch-visible line-300 probes returned EOF | repo policy |
| ACTIVE-only runtime isolation | PASS | #507 source inspection | CANDIDATE resolver rejection encoded in tests |
| no interpolation/extrapolation policy | PASS | source inspection | exact grid only; regression added |
| repository backup CLI | NOT_RUN | connector-only runtime | repo policy limitation |
| focused Node regression suite | NOT_RUN | exact repo execution unavailable | committed tests present |
| complete repository-native suite | NOT_RUN | exact checkout/runtime unavailable | not claimed |
| hosted workflow/status checks | NOT_RUN | PR not yet allocated | execute after PR allocation |
| browser acceptance | NOT_APPLICABLE | data/API-only Stage 3 | no UI changed |
| controlled EI PDF reconciliation | NOT_RUN | not executed in this stage | required before authority promotion |

## Highest Risk

Treating Appendix-B reference values as automatic engineering inputs merely because they exist in a candidate master. Protection is explicit in the API: optional default policy, exact-grid lookup, no automatic fallback, no interpolation and no runtime activation.

## Next-Agent Handover

Do not activate these masters or wire them as silent defaults. Do not infer values between Figure B-1/B-6 grid points. Do not convert the shared-support rule into a fixed LOF. The next safe action is PR allocation and exact-head validation/handoff; later mechanism-specific consumers should remain separate PRs.
