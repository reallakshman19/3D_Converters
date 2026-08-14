# Per-PR / WIP Coordination Claims

Each active work item may declare intended exact-file, prefix, workstream, and engineering-authority contact in:

```text
agents/claims/WIP-<id>.yaml
agents/claims/PR<number>.yaml
```

Claim modes:

```text
EXCLUSIVE
COORDINATED
SHARED_READ
OBSERVE_ONLY
```

Claims are collision warnings, not permanent locks. Before each implementation stage, re-check live changed files and active claims.

Overlap must be evaluated for file paths, engineering/software authority, and dependency/workstream interaction.
