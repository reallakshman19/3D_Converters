# Per-PR / WIP Status Records

Each active work item owns exactly one compact machine-readable status record:

```text
agents/status/WIP-<id>.yaml
agents/status/PR<number>.yaml
```

The active agent updates only its own status record. `agents/MASTER_INDEX.md` should be rebuilt/reconciled from these records plus live GitHub state rather than becoming a shared-edit hotspot.

Required concepts include mission/workstream, branch, PR/main HEADs, criticality, recovery state, handover readiness, report path/head, Appendix A freshness, grounding epoch, blocker, dependencies, highest risk, and exact next action.

Live GitHub remains authoritative for mutable PR state.
