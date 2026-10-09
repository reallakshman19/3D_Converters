# FURTHER_TASK_SNAPSHOT — current

`AUTHORITY: DERIVED_CONTINUITY_ONLY`

Use one mutable responsibility-scoped current-state projection. Update the same managed surface at semantic events; do not append heartbeat comments.

```text
RESPONSIBILITY: <issue/task>
PROTOCOL_REF: <owner/repo@exact-sha:path | UNKNOWN for legacy snapshot only>
STATE: PLANNING | IMPLEMENTING | RECOVERING | EVIDENCING | VERIFYING | OWNER_DECISION | BLOCKED_EXTERNAL | DELIVERY_READY | COMPLETE | SUPERSEDED

PROGRESS
P: <completed>/<denominator> = <percent>
E: <evidenced>/<denominator> = <percent>
ACTIVE_UNIT: <declared unit | NONE>

PLAN
<current IMPLEMENTATION_PLAN / PLAN_UPDATE ref>

FRONTIER
MATERIAL: <head | UNKNOWN>
SEMANTIC_EVIDENCE: <head/ref | UNKNOWN>
RELATION: ALIGNED | MATERIAL_AHEAD | MATERIAL_UNKNOWN | SEMANTIC_UNKNOWN | UNRESOLVED
DELTA_COMMITS: <n | UNKNOWN>
RECONCILIATION_NEEDED: true | false

COMPLETED
- [x] <declared unit>

ACTIVE / PENDING
- [ ] <declared unit>

CURRENT
<one concise reconstruction statement>

NEXT
<first useful engineering action>

OWNER_DECISION
NONE | <specific genuine decision>

RECOVERY
mode: NONE | INTERRUPTED_EXECUTOR | FRONTIER_RECONCILIATION
stream_loss_count: <n>
recovery_evidence_required: true | false
handover_plan_triggered_this_lifecycle: true | false
plan_for_handover_now: true | false
```

Rules:
- new continuity-managed responsibilities should record an exact successor-verifiable `PROTOCOL_REF`; missing/UNKNOWN is compatibility-only and must not be fabricated;
- `RECONCILIATION_NEEDED=true` means material/evidence state differs and should be inspected; it does **not** by itself force recovery evidence on an uninterrupted current executor;
- a successor or detected interrupted-executor recovery uses `recovery-start` / `stream-loss`, which sets a recovery `mode` and makes `recovery_evidence_required=true` until durable provider readback succeeds;
- derive Git/material facts where automation is available;
- starting implementation changes state to `IMPLEMENTING` but earns no P/E credit;
- evidence can never outrun completion;
- `PROJECTION_MODE: DERIVED_FROM_FACTS` (default): the E flag is computed from evidence refs + the evidence candidate vs the observed head; agents report facts, never the E flag, a percentage or a title;
- title P/E is a disposable projection written only by the DELP runner (this snapshot never patches the title in DERIVED mode);
- provider update failure is observability debt only;
- no timer/heartbeat updates.
