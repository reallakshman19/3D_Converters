# WIP-VIB-MECH-T23-20260818 — EI T2.3 Mechanical screening qualification

# CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED_FOR_OWNER_DIRECTED_ASSIGNMENT
EXECUTION_MODE: AUTO
AUTO_STATE: RUNNING
MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED
REPOSITORY: reallaksh19/3D_Converters
SOURCE_TASK: owner-directed focused vibration-integrity implementation; autonomous continuation 2026-08-18
PR_OR_WIP: WIP-VIB-MECH-T23-20260818
BRANCH: agent/vibration-mechanical-t23-screening-qualification-20260818
BASE: main
BASE_HEAD: 765d15e87def22291792ddb533df9ea532fb3f67
CURRENT_STAGE: BASELINE
CURRENT_BLOCKER: NONE
HIGHEST_RISK: promoting derived/candidate master data without direct controlled EI T2.3 source trace or accidentally authorizing shared-support / post-dynamic-analysis branches
EXACT_NEXT_ACTION: bind the nine direct Table T2-3 baseline values to controlled EI T2.3 evidence, add independent reference tests, and promote only that bounded direct-baseline path to screening authority
```

## Mission

Promote the existing Mechanical Excitation T2.3 **direct baseline** evaluator from candidate-only to bounded screening authority without redesigning the calculation or broadening applicability.

## Engineering grounding

EI AVIFF 2nd Edition T2.3.1 defines three excitation extents: directly attached machinery, nearby machinery through supporting structure, and pipework sharing supports with another high-vibration line. T2.3.2 Table T2-3 assigns fixed baseline LOF values for nine machinery classes. It separately states that pipework adjacent to other pipework with LOF >= 0.5 takes the adjacent pipework LOF, and that reciprocating/PD or diesel/gas-engine cases may reduce to 0.4 only after a detailed structural dynamic analysis establishes no frequency coincidence.

Current repository direct-baseline values match Table T2-3 exactly. The shared-support transfer branch and post-dynamic-analysis reduction are intentionally excluded from this qualification slice.

## Scope

- controlled source/method custody for EI T2.3 Table T2-3 direct baselines;
- exact-value parity between production master rows and controlled method table;
- bounded screening authority for direct machinery-source selections only;
- preserve exact facility scope and current/stale result behavior;
- preserve fail-closed shared-support handling;
- preserve no-design-authority.

## Explicit exclusions

- shared-support adjacent-line transfer calculation;
- reduced 0.4 LOF after TM-09/detailed dynamic analysis;
- automatic T1 applicability identification;
- generic EI main-line aggregation changes;
- AIV/FIT/SBC changes;
- design authority;
- workflow files;
- merge.

## Validation plan

- authoritative-reference parity for all nine T2.3 table rows;
- worked-example control: centrifugal compressor + >=15 kW motor governs at 0.4;
- multi-source max selection;
- empty/unknown selection fail-closed;
- shared-support remains blocked;
- exact facility scope mismatch rejected;
- screening assessment contract exposes authority only for direct-baseline path;
- source binding resolved to EI T2.3 / printed page 54 / Table T2-3.

Repository-native execution remains NOT_RUN until executable checkout/hosted CI is available. Source inspection is not a substitute for runtime execution.
