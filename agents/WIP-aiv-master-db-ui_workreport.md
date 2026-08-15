# WIP-aiv-master-db-ui — AIV master DB UI wiring

## Recovery header

```text
WORK_INTENT: IMPLEMENT
REPOSITORY_STATE: NEW_PR_REQUIRED
MUTATION_AUTHORITY: WRITE_ALLOWED
CRITICALITY: ENGINEERING_CRITICAL
EXECUTION_MODE: MANUAL
AUTO_STATE: NOT_ACTIVE
SCOPE_AUTHORITY: LOCKED_TO_APPROVED_MISSION
PHASE_PROGRESSION: MANUAL
MERGE_AUTHORITY: OWNER_ONLY
HANDOVER_READINESS: IN_PROGRESS
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: NOT_APPLICABLE_NEW_WORK
REPOSITORY: reallaksh19/3D_Converters
SOURCE_TASK: Owner request 2026-08-15 — upgrade AIV target data flow and wire UI to DB-creator masters
PR_OR_WIP: WIP-aiv-master-db-ui
BRANCH: agent/aiv-master-db-ui-wiring
BASE: main@0fb4be2a03aa455efe5d476c8a8ba4e82b732b95
REPORT_BASIS_HEAD: 0fb4be2a03aa455efe5d476c8a8ba4e82b732b95
MAIN_HEAD_LAST_CHECKED: 0fb4be2a03aa455efe5d476c8a8ba4e82b732b95
REPORT_SYNC: CURRENT
EXACT_NEXT_ACTION: implement pinned master-package verifier/resolver and wire the AIV input workspace
```

## Handover in 60 Seconds

Mission: let the existing AIV screening workspace consume the DB-creator master package at `reallaksh19/Advanced_Analysis@dad2f1dbf8f200132c9669d275467611d51d6d3b/docs/EI data/AIV misc/masters`, automatically enrich only resolvable blank AIV fields, show master provenance in UI, and preserve explicit user/project data over master data and master data over assumptions.

The exact approved source folder contains seven Phase-1 CSV masters plus architecture/validator. This PR must not copy or silently mutate those masters. It will verify selected master files against the exact pinned Git blob identities before use.

## Live ground truth

- current main: `0fb4be2a03aa455efe5d476c8a8ba4e82b732b95` — merged SBC facility integration.
- open PR483 owns generic `converters/vibration/masters/*` governance framework only; changed paths do not overlap planned AIV UI/resolver paths, but engineering-master authority domain overlaps. Coordination classification: `COORDINATION_REQUIRED`.
- no `agents/MASTER_INDEX.md` exists on current main.
- repository-local `.agents/AGENTS.md` requires backup CLI before existing-file edits. Current environment is connector-only: container cannot resolve github.com and `gh` is unavailable. Backup CLI therefore cannot execute; immutable pre-edit blob SHAs must be recorded and backup status truthfully classified `NOT_RUN / ENVIRONMENT_BLOCKED`.

## Source master package — exact pin

```text
repository: reallaksh19/Advanced_Analysis
commit: dad2f1dbf8f200132c9669d275467611d51d6d3b
path: docs/EI data/AIV misc/masters
```

Expected files / source Git blobs:

```text
M_COMPONENT_TYPE.csv     700f4c8da754a5ec3bc59cafd54a3581b05e5b65
M_DOCUMENT_SOURCE.csv    75894476eaddaecbcacc637a8e968dc5414d72b6
M_MATERIAL.csv           731fdd83b6f6f6ebc5ca9b964be55c508ad85ed7
M_PIPE_DIMENSION.csv     7aaee1609329f00273a40637052705eed251b30b
M_PIPING_CLASS.csv       c3c3381295b22b94354651e76af79519e44e6017
M_SOURCE_DEVICE_TYPE.csv 0019925fe1cc56945fe3a7154edefa3fb5b5dd47
M_UNIT.csv               d0364eb267d94c784a058810c5c4173cbded4d37
```

Known source-data caveats from source inspection remain visible and are not repaired in this PR: some material provenance rows reference related-but-not-exact document records and the source validator proves structural/FK/join consistency, not independent engineering-value correctness. Therefore this PR must not claim that loading the package grants new engineering/design authority.

## Planned production behavior

1. UI accepts the seven master CSVs as one package.
2. Each file is byte-verified against its pinned Git blob SHA before parsing/use.
3. Schema/PK/FK/domain checks fail closed.
4. Resolver uses current topology + master tables to fill only blank fields when a deterministic unique resolution exists.
5. Explicit table values are never overwritten.
6. Master-derived cells are visibly marked `[M]`; assumptions remain `[A]` and execute after master enrichment.
7. User editing a master-derived cell converts that field back to explicit user/project data.
8. No process/case values (flow, P1/P2, T, MW, source state), applicability, simultaneous scenario, or general-topology physical distance are invented by master resolution.

## Authority / invariants

UNCHANGED:
- registered AIV 10-stage numerical kernel;
- AIV equations/correlations/tolerances;
- readiness status rules;
- user-over-assumption precedence;
- flare-network explicit-segment distance authority;
- SVG pixels non-authoritative for distance;
- Assessment LOF screening scope;
- Line/Case non-authoritative status;
- `designAuthority=false`;
- `.eit` import/export contracts.

NEW data-origin precedence:

```text
explicit project/user value > exact-pinned master enrichment > visible assumption
```

Master integration itself confers no new screening/design authority.

## Active findings

- `IMP-001`: pinned package verification must use Git blob hashing, not filename alone.
- `IMP-002`: enrichment must be deterministic/unique and fill blanks only.
- `RISK-001`: generic model type may be too coarse to classify a source or discontinuity; ambiguity must remain unresolved.
- `RISK-002`: current generic topology does not authorize deriving physical AIV distance from element lengths; do not add that behavior.
- `RISK-003`: PR483 shares master-governance domain; avoid its paths and do not create a competing generic registry.
- `DEC-001`: consume DB package through an AIV-specific adapter/UI, pinned to Advanced_Analysis source identities.
- `DEC-002`: source master values remain reference enrichment; no authority promotion.

## Existing-file recovery blobs

Pre-edit blobs currently inspected:

```text
tabs/vibration-aiv-qualification-tab.js  d7c8b2c8af7c5ddcc062168f087bbec07e7a4df7
tabs/vibration-aiv-input-view.js         pending if edited
tabs/vibration-aiv-state.js              021f6a89a483c0d7de820e6c59ebe35f322fe139
package.json                              pending if edited
```

Backup CLI: `NOT_RUN / ENVIRONMENT_BLOCKED`.

## Validation ledger

| Check | Status | Observation | Oracle | Notes |
|---|---|---|---|---|
| current main grounding | PASS | REMOTE_EXECUTION | NONE | `0fb4be2...` |
| source master folder identity | PASS | SOURCE_INSPECTION | AUTHORITATIVE_REFERENCE | exact commit and Git blobs inspected |
| PR483 overlap inspection | PASS | SOURCE_INSPECTION | NONE | no exact-file overlap; authority-domain coordination required |
| implementation tests | NOT_RUN | NOT_OBSERVED | NONE | pending |
| AIV release suite | NOT_RUN | NOT_OBSERVED | NONE | pending |
| real-browser acceptance | NOT_RUN | NOT_OBSERVED | NONE | pending |

## Changed-file ledger

Current:
- `agents/WIP-aiv-master-db-ui_workreport.md` — recovery authority only.

Planned candidate paths:
- new AIV-specific master reference/parser/resolver modules;
- AIV master UI/controller/view modules;
- small wiring edits in AIV state/input/tab;
- focused regressions and release registration if required.

## Appendix A

Not a takeover. New-work implementation authority derives from the owner instruction plus live-grounding/coordination checks. Before handover, Appendix A will contain repository-specific next-agent A1–A5 challenges if further engineering-critical implementation remains.
