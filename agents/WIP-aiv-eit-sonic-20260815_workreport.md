# WIP-aiv-eit-sonic-20260815 — AIV controlled EIT sonic-state recovery

## Current state

- Mission: remove the three redundant `AIV_SONIC_STATE_UNRESOLVED` blockers when importing the exact controlled Energy Institute AVIFF worked-example `.eit`, without introducing a generic sonic-state inference rule.
- Classification: `ENGINEERING_CRITICAL`.
- Owner instruction: direct implementation request on 2026-08-15 after defect/root-cause review.
- Work Pack umbrella: issue #513; production acceptance umbrella: issue #453.
- Base branch: `main`.
- Grounded base SHA: `a49085cde69ef71518c0d6315a615477887d7b4e`.
- Branch: `agent/aiv-eit-controlled-sonic-20260815`.
- Coordination: `SAFE` for exact files. PR #515 owns PF-01 canvas/filter validation; PRs #511/#512 own shared Vibration Integrity workflow/evidence. This slice does not touch those paths.
- Recovery decision: `CONTINUE_FROM_CURRENT_MAIN`; PR #506 is not used as a code source.

## Failure isolation

Current `converters/vibration/aiv/aiv-eit-import-records.js` implements:

```text
explicit detail.sonicState -> use it
otherwise                   -> UNRESOLVED
```

The exact controlled Common `.eit` has no `sonicState` field for AIV RIDs 5, 6 and 8, therefore the importer creates `UNRESOLVED` and readiness emits `AIV_SONIC_STATE_UNRESOLVED` for all three relationships.

Independent controlled AIV D.2.3 qualification evidence records the worked-example source branch as `SFF = 0 dB`, i.e. `NON_SONIC`, and reproduces the source/effective PWL values:

```text
RID 5 recycle discharge  129.3648155401 dB -> report 129.36 dB
RID 6 recycle suction    129.0239800907 dB -> report 129.02 dB
RID 8 relief downstream  164.6851759525 dB -> report 164.69 dB
```

The fix must consume that controlled worked-example disposition only when the imported legacy record matches the pinned worked-example identity/vector. Generic legacy `.eit` remains `UNRESOLVED`.

## Controlled source custody

```text
repository: reallaksh19/Common
commit:     7bfead910f6bca91b10748ead009e40f20c82219
path:       Energy-Institute-AVIFF---Worked-Examples.eit
Git blob:   aaf3afe262b19f927fe05e0c44f07f08167fbfa0
options:    title="Energy Institute AVIFF - Worked Examples", version=5, id=8872, project=3010
```

Independent implementation-side qualification record:

```text
docs/vibration/AIV-D2.3-Qualification-Solve-v1.md
```

## Authority / invariants

1. No generic critical-flow or pressure-ratio sonic resolver is introduced.
2. Explicit modern `.eit` `sonicState` always wins.
3. Only an exact controlled worked-example vector match may resolve missing legacy state to `NON_SONIC`.
4. Any mismatch remains `UNRESOLVED` and fail-closed.
5. `SFF=0 dB` / `NON_SONIC` is benchmark evidence for this worked-example import, not a general process-design default.
6. No AIV equations, coefficients, physical-distance authority, Assessment screening scope, or design authority change.
7. Imported historical result authority remains `REVIEW_REQUIRED`; the import still requires registered screening for current results.
8. Benchmark expected values are frozen; implementation output may not rewrite them.

## Proposed minimal patch

- Add a small pure resolver module for exact controlled worked-example sonic-state disposition and provenance.
- Update `aiv-eit-import-records.js` to use precedence:
  `explicit sonicState > controlled worked-example vector > UNRESOLVED`.
- Carry the controlled resolution evidence in `detailEvidence`.
- Update/add importer regression tests:
  - exact controlled RIDs 5/6/8 -> `NON_SONIC`;
  - ordinary legacy document -> remains `UNRESOLVED`;
  - one-field drift from controlled vector -> remains `UNRESOLVED`;
  - explicit sonic state overrides controlled resolver;
  - PWL benchmark values remain 129.3648155401 / 129.0239800907 / 164.6851759525 dB within existing controlled precision.

## Backup / recovery

Repository-mandated `node utils/backup.js save ...` cannot be executed because this environment has no native checkout and `gh` is unavailable. This is `NOT_RUN / ENVIRONMENT_BLOCKED`, not PASS. Immutable pre-edit Git blobs are the recovery boundary.

Known pre-edit production blob:

```text
converters/vibration/aiv/aiv-eit-import-records.js
blob 6f23c8b31ecab9b43d0b7732dd6129b5f6d188d4
```

## Validation status

| Gate | Status | Oracle / observation |
|---|---|---|
| Current-main failure isolation | PASS | source inspection + exact Common EIT content |
| Controlled source blob identity | PASS | Common Git blob `aaf3afe...` |
| D.2.3 NON_SONIC / SFF=0 custody | PASS | existing controlled qualification record |
| Repository backup CLI | NOT_RUN / ENVIRONMENT_BLOCKED | no checkout |
| Focused exact resolver execution | NOT_RUN | pending implementation |
| Repository-native EIT import test | NOT_RUN | pending implementation / no checkout |
| Full AIV release suite | NOT_RUN | pending |
| Full real-app Chromium import | NOT_RUN / ENVIRONMENT_BLOCKED | no materialized app checkout |

## Appendix A — Implementation Takeover Qualification

### A1 Production Trace — 20/20
Trace: Common `.eit` -> `parseAivEitImport()` -> `buildAivEitImportedRecords()` -> `sourceRow()` -> `sonicState()` -> source CSV `Sonic State=UNRESOLVED` -> readiness `validateSource()` -> `AIV_SONIC_STATE_UNRESOLVED` -> UI blocker. Exact RIDs are 5, 6, 8.

### A2 Current Failure Isolation — 20/20
Root cause is not missing P/T/flow/MW, not a readiness UI defect, and not a calculator error. The legacy compatibility importer intentionally maps absent `detail.sonicState` to `UNRESOLVED`; the exact controlled legacy file predates this field. Falsifier: if the exact imported source rows already contain `NON_SONIC`, this hypothesis is wrong.

### A3 Authority / Invariant — 20/20
Do not infer sonic state from `P2/P1`, device type, historical LOF, or a generic default. Resolve only exact controlled worked-example vectors whose published/qualified PWL branch is independently established as `SFF=0 dB`. Explicit `.eit` state outranks controlled compatibility resolution; mismatch fails closed.

### A4 Independent Validation — 20/20
Use frozen D.2.3 source/effective PWL oracles, not modified runtime output: 129.3648155401, 129.0239800907 and 164.6851759525 dB. Also verify a drifted vector remains unresolved and generic legacy test remains unresolved. Full browser acceptance stays separate.

### A5 Next-Commit / Minimal Patch — 19/20
Create one pure <300-line controlled-vector resolver, wire one importer call plus evidence field, update importer regressions only. No calculator/readiness/UI/refactor changes unless this minimal path fails a falsifier. One point held because native backup/test execution is environment-blocked.

**Qualification: 99/100; all challenges >=19/20. IMPLEMENTATION_AUTHORITY = GRANTED_FOR_THIS_DIRECT_OWNER_ASSIGNED_SLICE.**

## Changed-file ledger

Current:

```text
agents/WIP-aiv-eit-sonic-20260815_workreport.md   added   handover/state only
```

Production/test files: none yet.

## Highest risk

Accidentally turning controlled worked-example compatibility into a generic sonic-state inference. Guard by exact vector identity + drift-negative tests.

## EXACT_NEXT_ACTION

Fetch exact current-main importer/test blobs, implement the pure controlled-vector resolver and importer precedence, then execute the resolver/PWL benchmark in the local container from exact branch source text before opening a draft PR.