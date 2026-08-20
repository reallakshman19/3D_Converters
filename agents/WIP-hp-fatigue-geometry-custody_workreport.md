# WIP-hp-fatigue-geometry-custody — External KD3 Geometry Coupling

## Recovery header
- REPOSITORY: `reallaksh19/3D_Converters`
- BRANCH: `agent/hp-fatigue-geometry-custody`
- BASE: `main@a97a44c92377c2fb8953fd5d212c0f53067b132f`
- BACKUP: `backup/hp-fatigue-geometry-custody-pre-edit-20260820`
- CRITICALITY: `ENGINEERING_CRITICAL`
- STATE: `IMPLEMENTATION_IN_PROGRESS`
- MERGE_AUTHORITY: `OWNER_ONLY_NOT_GRANTED`

## Mission
Prevent stale external VIII-3 KD3 `Seq` / permissible-cycle `N` values from being combined with a different CORE straight-pipe OD/effective-wall basis in the production HP Piping Class review path.

## RCA
Current production review recalculates CORE pressure-cycle Salt from the selected fatigue wall, but external `Seq` and `N` are not independently bound to the geometry on which the external KD3 calculation was performed. Optional user Salt may be omitted in production review, so a stale external result can survive a wall-basis change.

Concrete reference exposure:
```text
baseline selected wall       8.80375 mm
baseline CORE Salt           63.29949581051363 MPa
brownfield selected wall     8.70000 mm
brownfield CORE Salt         63.99142829153606 MPa
Salt change                  +1.0931 %
external Seq                 70 MPa in both sample states
external N                   10000 in both sample states
reported Miner usage         0.05 in both sample states
```
The unchanged external Seq/N are not proven to belong to the changed geometry.

## Protected invariants
- `USER_CALCULATED_KD3` remains the production fatigue route.
- Native KD320 remains unqualified and unexecuted.
- `codeCompliance=false` and `canUseForDesignAuthority=false` remain false.
- Evidence/provenance/checker gaps may remain advisory under production review.
- Numerical/relational inconsistencies remain hard failures.
- Do not derive new Seq/N from PR1290 candidate formulas.

## Intended fix
Use the existing exchange-package geometry concept as a product evidence invariant. `fatigueEvidence.analysisGeometry` declares the external calculation geometry. Before any external Seq/N are consumed, require it to match the CORE evaluation geometry (OD and effective wall) within a tight repository data-coupling tolerance that is explicitly not an ASME acceptance tolerance.

## Validation plan
1. Baseline NPS4 geometry-bound external result passes.
2. Brownfield selected wall 8.7 with external analysis wall 8.80375 hard-fails even when user Salt is absent.
3. Refreshing declared external geometry to 8.7 permits evaluation without claiming external Seq/N were independently revalidated.
4. OD mismatch hard-fails.
5. Missing/invalid analysis geometry hard-fails.
6. Existing Salt and Miner arithmetic remains unchanged when geometry matches.
7. Full repository-native suite/browser remain `NOT_RUN` if unavailable.

## Current authority
```text
nativeCoreKd3Qualified        false
codeCompliance                false
canUseForDesignAuthority      false
productionKernelAllowed       false  # native KD320
```

## Exact next action
Patch the domain evaluator + product/orchestrator contract and regression fixtures, then validate exact committed bytes and open a draft PR. Do not merge without explicit owner authorization.
