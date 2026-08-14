# Repository Agent Master Index

Repository: `reallaksh19/3D_Converters`

```text
MASTER_INDEX_STATUS: BOOTSTRAP
LIVE_GITHUB_STATUS: CURRENT_AT_CREATION
STATUS_REGISTRY_STATUS: MIGRATION_REQUIRED_FOR_EXISTING_PRS
CLAIM_REGISTRY_STATUS: MIGRATION_REQUIRED_FOR_EXISTING_PRS
```

This file is the repo-level coordination dashboard. It is not the authority for mutable GitHub state. Live GitHub wins for PR state, HEAD, changed files, reviews, and checks.

## Active Work

| PR/WIP | Workstream | Mission | Recovery | Handover | Qualification | Coordination | Recommended action |
|---|---|---|---|---|---|---|---|
| #476 | repository/agent-governance | continuous handover + expert takeover protocol v2 | HEALTHY | READY | NOT_REQUIRED | COORDINATED | owner review; no merge without authorization |
| #474 | vibration/AIV CI | controlled AIV canvas release validation | UNMIGRATED | UNKNOWN | UNKNOWN | RECHECK | re-ground before takeover |
| #471 | vibration/master-data | T2.8 valve-closure candidate recovery | UNMIGRATED | report exists | UNKNOWN | RECHECK | re-ground before takeover |
| #457 | vibration/AIV evidence | post-merge validation record | UNMIGRATED | UNKNOWN | UNKNOWN | RECHECK | re-ground before takeover |
| #417 | XML→CII topology | X001 coordinate/topology custody | UNMIGRATED | UNKNOWN | UNKNOWN | RECHECK | re-ground before takeover |
| #412 | XML→CII trace | configurable JSON trace capture | UNMIGRATED | UNKNOWN | UNKNOWN | RECHECK | assess age/base drift |
| #390 | FBX deployment | PR389 Pages certification | UNMIGRATED | UNKNOWN | UNKNOWN | RECHECK | assess age/base drift |
| #355 | FBX selected-zone | selected-zone package core | UNMIGRATED | UNKNOWN | UNKNOWN | RECHECK | assess age/base drift |

## Coordination Rules

1. New work creates unique WIP status/claim/report records before implementation.
2. After PR allocation, migrate WIP records to `PR<number>`.
3. Before every implementation stage, fetch live open PRs and compare intended file/authority/dependency overlap.
4. Existing PRs are not trusted merely because they are open; takeover requires live grounding and Appendix A.
5. Damaged/stale PRs may be quarantined, salvaged, or superseded.
6. This master file should ultimately be generated/reconciled from `agents/status/*`, `agents/claims/*`, and live GitHub.

## Required Master Views

A future generator should expose:

- active PR/WIP table;
- blocking/waiting work;
- handover readiness;
- qualification freshness;
- exact-file/prefix claims;
- engineering-authority claims;
- dependency graph;
- detected overlaps/conflicts;
- base-drift warnings;
- validation/release bottlenecks;
- recently completed/superseded work;
- next available unclaimed work;
- reconciliation metadata.
