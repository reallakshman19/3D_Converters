# WIP-VIB-T1-SUGGEST-20260818 — non-authoritative T1 mechanism suggestions

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED_FOR_OWNER_DIRECTED_ASSIGNMENT
EXECUTION_MODE: AUTO
AUTO_STATE: RUNNING
MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED
REPOSITORY: reallaksh19/3D_Converters
BRANCH: agent/vibration-t1-suggestions-20260818
BASE: main
BASE_HEAD: 765d15e87def22291792ddb533df9ea532fb3f67
CURRENT_STAGE: IMPLEMENT
CURRENT_BLOCKER: NONE
HIGHEST_RISK: accidentally converting a heuristic/context signal into EI applicability evidence
EXACT_NEXT_ACTION: add six verified-fact suggestion rules, draft-only authoring integration, and negative-authority tests
```

## Mission

Add a small T1 assistance layer that highlights obvious mechanism candidates from explicit project facts while preserving the existing rule that mechanism applicability is established only by explicit engineer/reviewer identification evidence.

## Safety contract

Suggestions:
- require exact line/case/canonical scope;
- require exact boolean enrichment properties with value `true` and status `VERIFIED`;
- never set REQUIRED / NOT_APPLICABLE / UNRESOLVED;
- never enter `createVibrationMechanismIdentificationBundle()` directly;
- never count toward completeness;
- may only create an incomplete draft authoring row for engineer review;
- retain source/revision/record/reviewer trigger facts;
- grant no source, screening, design, code or engineering authority.

## Initial rules

1. `T1_RECIP_PD_EQUIPMENT_PRESENT` -> `reciprocatingPulsation`
2. `T1_ROTATING_EQUIPMENT_CONNECTION_PRESENT` -> `mechanicalExcitation`
3. `T1_DEADLEG_PRESENT` -> `deadlegPulsation`
4. `T1_PRESSURE_REDUCING_GAS_SOURCE_PRESENT` -> `aiv`
5. `T1_SMALL_BORE_CONNECTION_PRESENT` -> `smallBoreConnections`
6. `T1_THERMOWELL_OR_INTRUSIVE_ELEMENT_PRESENT` -> `thermowells`

The facts are intentionally explicit rather than inferred from names, pressure values, phases or free text.
