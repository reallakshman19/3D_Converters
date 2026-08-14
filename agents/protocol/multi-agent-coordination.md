# Multi-Agent Repository Coordination

## 1. Durable work identity

The durable identity is the work item/PR, not the chatbot session.

Before PR allocation use a unique WIP ID:

```text
agents/WIP-<work-id>_workreport.md
agents/status/WIP-<work-id>.yaml
agents/claims/WIP-<work-id>.yaml
```

After PR allocation rename/migrate to `PR<NUMBER>`.

Do not use a single shared `PR_PENDING_workreport.md`.

## 2. Repository master index

`agents/MASTER_INDEX.md` is the repo-level coordination dashboard. It is a snapshot, not the authority for mutable GitHub state.

It should expose:

- active PR/WIP mission and workstream;
- recovery/agent state;
- current PR HEAD and last checked main HEAD;
- handover and Appendix A freshness;
- blockers and highest risks;
- dependencies/lineage;
- exact-file, prefix, and authority claims;
- overlap/conflict state;
- base drift;
- recommendation: continue, re-ground, coordinate, qualify, quarantine, salvage, supersede.

Prefer generation/reconciliation from per-PR status/claim records plus live GitHub rather than many agents editing the master file manually.

## 3. Per-PR status record

Each active work item owns its own compact machine-readable status record.

Suggested fields:

```yaml
schema: AgentPrStatus.v1
repository:
pr_or_wip:
mission:
workstream:
branch:
pr_head:
main_head_last_checked:
work_intent:
criticality:
agent_state:
pr_recovery_state:
handover_readiness:
report_path:
report_head:
appendix_a_status:
grounding_epoch:
current_stage:
blocker:
highest_risk:
dependencies:
exact_next_action:
last_updated:
```

## 4. Claims

Each active work item declares intended ownership/contact:

```yaml
schema: AgentClaim.v1
pr_or_wip:
claim_state: ACTIVE
files:
  exact: []
  prefixes: []
authority_domains: []
claim_modes:
  - EXCLUSIVE
  - COORDINATED
  - SHARED_READ
  - OBSERVE_ONLY
last_verified_head:
```

Claims are collision warnings, not permanent locks.

## 5. Overlap check

Before implementation and before each new stage, compare the current work against all active work in three dimensions:

```text
FILE OVERLAP
AUTHORITY OVERLAP
WORKSTREAM / DEPENDENCY OVERLAP
```

Classify:

```text
SAFE
COORDINATION_REQUIRED
BLOCKED_BY_ACTIVE_CLAIM
UNKNOWN
```

Do not silently proceed through an `EXCLUSIVE` or authority-level collision.

## 6. Dependencies and lineage

Support graph relations, not only previous/next:

```text
HARD_DEPENDENCY
SOFT_DEPENDENCY
FOLLOW_ON
REPLACES
SUPERSEDES
INDEPENDENT
```

A new PR based on predecessor work records exact predecessor PR/merge SHA, inherited decisions/invariants/evidence, intentionally non-inherited items, and fresh grounding to current `main`.

## 7. Base drift

An active PR must record the main SHA last checked. If `main` advances, classify whether new work is:

```text
SAFE_TO_CONTINUE
REBASE_OR_RECONCILIATION_REQUIRED
RECONSTRUCTION_RECOMMENDED
```

Never resolve engineering-significant rebase conflicts by guessing intent.
