# Agent Recovery and Delivery Protocol

This folder defines the repository's durable multi-agent execution protocol.

## Core documents

- `continuous-handover.md` — current-state recovery, durable checkpoints, grounding epochs, takeover chain, work-report freshness.
- `takeover-qualification.md` — repository-specific implementation authorization for incoming agents.
- `multi-agent-coordination.md` — master index, per-PR status/claims, overlap detection, dependencies, base drift.
- `recovery-salvage.md` — quarantine, salvage, supersession, abandonment, and reconstruction from current `main`.
- `../templates/workreport-template.md` — canonical current-state-first work-report structure.

## Governing principle

History gives continuity. Live GitHub gives mutable repository truth. Independent engineering evidence gives technical authority.

A competent incoming agent must be able to continue without conversation history, but must never trust a previous agent's conclusions without re-grounding them.
