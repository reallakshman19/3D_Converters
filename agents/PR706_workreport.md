# PR706 Work Report

CHAIN_ID: ENGCALC-BOLTED-JOINTS
LEG_ID: LEG-01
PR: 706
BRANCH: agent/engcalc-bolted-joints-phase1-20260902
BASE_MAIN: bff53e336bdbddbe0fb829b7991ca5ed27fc836a
LATEST_MATERIAL_HEAD: dc861a714491bbaec801fbd03fb9a91bb3491ebc
LATEST_ENDPOINT: EP-0010
STATE: BLOCKED_SOURCE_OR_INTEGRATION_DECISION
EXECUTION_MODE: AUTO
AUTO_STATE: OWNER_DECISION_OR_SOURCE_QUALIFICATION_REQUIRED
SCOPE_AUTHORITY: LOCKED_TO_APPROVED_MISSION
MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED

## Mission

Implement the approved `Engineering Calculations -> Flanges & Joints / Bolts` critical path with source-traceable numerical kernels, explicit 3D/load mechanics, non-authorizing master-data custody, independent analytical fixtures, and fail-closed authority semantics.

## Delivered capability

### Flange

- pure SI `FLANGE.RATED_LOAD.UG44B` reference kernel;
- equivalent bending and opening-axial pressure components;
- rated-pressure cap on calculated maximum pressure;
- acceptance-equation cross-form;
- joint-face moment transport `M_target = M_source + r x F`;
- opening-only axial load and resultant in-plane bending resolution;
- direct Node CLI and analytical/PV Elite benchmark sources;
- BENCHMARK_ONLY Engineering Calculation adapter;
- central default-registry/public-index registration;
- central-engine unit-conversion/registration regression source;
- UG44 source-authority register;
- non-authorizing flange master-store scaffold for sources, flange ratings, moment factors and gasket geometries;
- exact-match-only UG44 master resolver with synthetic-only tests; resolver is not integrated into the UG44 calculation path.

### Bolts

- explicit-input short-form preload/torque/stress kernel:
  - `F = A_s * S_ref * alpha`;
  - `T = K * F * d`;
  - explicit `Kmin/Knom/Kmax` range;
  - tensile stress `F/A_s`;
  - explicit reference-stress utilization;
  - no default preload fraction or K;
  - `installationTorsionalStressEvaluated=false`;
  - `canUseForDesignAuthority=false`;
- direct short-form CLI and analytical synthetic fixtures;
- bolt short-form source/authority register;
- non-authorizing bolt master store for sources, threads, materials and friction conditions;
- exact-match-only bolt master resolver; it deliberately reports `preloadFractionResolved=false` and is not integrated into the short-form kernel;
- linear rigid-plate/equal-stiffness bolt-group reference solver for arbitrary 2D bolt coordinates and six-DOF local centroid loads;
- signed axial distribution from `Fz/Mx/My`, shear distribution from `Fx/Fy/Mz`, recovered resultants and equilibrium residuals;
- explicit fail-closed handling for duplicate IDs and degenerate/near-collinear geometry;
- analytical symmetric/asymmetric bolt-group fixtures and direct CLI.

## Engineering authority

```text
UG44 calculationState       = BENCHMARK_ONLY
bolt short-form state       = REFERENCE_KERNEL_ONLY
flange/bolt master ceiling  = ENGINEERING_SANDBOX
codeCompliance              = false
designAuthority             = false
governingEligible           = false
new bolt registryIntegrated = false
```

No real ASME flange `PR/FM/G`, bolt thread/material, lubricant, friction or coating master values are present in the new master stores. Equation satisfaction or reference utilization must not be published as Code/design acceptance.

## Source and benchmark state

### Flange authority

- official public ASME metadata establishes BPVC VIII-1 2025 edition identity;
- exact licensed 2025 UG-44(b) clause/table/footnotes remain `UNRESOLVED`;
- Warren Brown PVP2013-97814 is method provenance, not Code authority;
- historical Code Case 2901 material remains historical/reference evidence;
- user-supplied PV Elite C101 remains a cross-solver benchmark;
- legacy UG44 spreadsheets remain legacy/reference data, not governed production masters.

### Bolt authority

- `Bolt Torques.xls` supports legacy short-form/nut-factor calculation structure;
- `Bolt Torque Calc.xls` contains a more detailed thread/bearing-friction torque and bolt-stress model, but its exact formula chain has not been audited from an inspectable modern workbook/source;
- supplied ExcelCalcs, DesignCalculators, EngiCalcHub and EngineeringDesigner pages are secondary references only;
- the supplied bolted-flange paper supports preload/assembly-sequence sensitivity qualitatively but is not a universal numerical acceptance source.

## Validation truth

```text
source/architecture inspection                    PASS
main/base drift                                    PASS / zero behind
prior reconstructed UG44 kernel tests              PASS 6/6 supporting only
hosted exact PR checkout + Node 22                 PASS
hosted central registry initialization             PASS / indirect integration evidence
latest hosted HP suite                             FAIL 14/15 / OUT_OF_SCOPE_HP_PARITY
UG44 focused exact/native tests                    NOT_RUN / OWNER_DEFERRED_FOR_NOW
flange master-store tests                          NOT_RUN
bolt short-form tests                              NOT_RUN
bolt master-store tests                            NOT_RUN
bolt-group tests                                   NOT_RUN
browser                                            NOT_RUN
independent engineering review                     NOT_RUN
```

Latest observed hosted run: `33605997593`, job `100169984905`. It checked out exact PR merge `b64fa91be5735dc50d68f24fda87dd7c85329fc4`, set up Node 22, then failed the same unrelated HP parity assertion in `tests/hp-piping-class-orchestrator-parity.test.mjs`: expected `PIPE.B313.CH9.FATIGUE_USER_CALCULATED`, actual HP orchestrator uses `PIPE.B313.CH9.FATIGUE_USER_REVIEW`. PR #706 does not modify those HP files. This remains a real hosted FAIL and is not represented as green.

The current GitHub workflow does not execute the newly authored flange/bolt focused tests, so those remain `NOT_RUN`.

## AUTO MODE progression and current hard stop

The owner explicitly instructed to skip the unavailable native UG44 focused test **for now** and proceed. That changed sequencing only; the test remains `NOT_RUN`, not PASS.

AUTO then progressed through bounded new-file-only contributions: flange master custody, bolt short-form calculation, bolt master custody, and bolt-group load distribution.

AUTO is now stopped at a new hard boundary:

1. **Detailed friction torque: `BLOCKED_BY_SOURCE_QUALIFICATION`.** Coding the legacy detailed model from binary string fragments would require guessing exact thread/bearing torque equations, geometry definitions and sign conventions. The detailed model must wait for an inspectable/audited workbook or controlled source.
2. **Central integration for the new bolt calculators: `BLOCKED_BY_EXISTING_FILE_BACKUP_AND_VALIDATION`.** Registry/UI integration would mutate existing shared files while the required native pre-edit backup command is unavailable and focused bolt tests are unexecuted.

## Coordination / overlap

Open-PR searches for `engineering-calculations flange` and `bolt engineering-calculations` returned only PR #706 for the current calculation domain. Main remains at `bff53e336bdbddbe0fb829b7991ca5ed27fc836a`. Re-check both before any later shared-file integration.

## Backup compliance

New engineering source/test/CLI files did not require pre-edit backup. Existing-file relay/status/claim edits have exact connector-side pre-edit copies committed under `.backups/`.

For previous central registry/index edits and connector-side relay edits, the mandated native `node utils/backup.js save ...` command is unavailable in this runtime and remains `NOT_RUN / ENVIRONMENT_BLOCKED`; connector backups are evidence only and are not claimed as policy-equivalent PASS.

## Changed-file intent

The engineering calculation scope now includes:

- UG44 kernel/load primitives/adapter and central registration;
- flange master custody scaffold;
- bolt short-form reference kernel;
- bolt master custody scaffold;
- bolt-group load-distribution reference solver;
- focused tests, CLIs and source registers;
- relay/status/claim/backup custody.

No workflow, runtime, writer, canvas, HP numerical method, vibration numerical authority, or unrelated calculation authority has been intentionally modified.

## Highest risk

The largest remaining technical risk is not the simple arithmetic; it is **source and applicability authority** for the detailed friction model and real master data. Coding those from incomplete legacy extraction would create an apparently precise but untraceable engineering method.

## EXACT_NEXT_ACTION

Obtain an inspectable/qualified detailed torque basis by converting/auditing `Bolt Torque Calc.xls` or providing a controlled detailed thread/bearing-friction torque source. Then implement that detailed model as a separate non-authorizing solver with independent analytical fixtures.

If the owner prefers central integration before detailed-source qualification, explicitly authorize the existing-file integration sequence and its deferred native-backup/focused-test limitations.

## Durable relay

Latest endpoint: `agents/agentchain/ENGCALC-BOLTED-JOINTS/EP-0010.md`.
