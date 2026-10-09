# Relay V3.2 responsibility continuity — worth-gated pilot

## Authority

This slice is recorder-first. Git/PR/tests/runtime/artifacts remain material truth; Owner/programme intent remains human authority. Current/progress/provider views are derived. Reporting failure may reduce observability; it must never reduce production agency.

The engineering publication set remains exactly `IMPLEMENTATION_PLAN`, `PLAN_UPDATE`, `TASK_EVIDENCE`, and `TASK_RESULT`.

## Responsibility first

One independently governed engineering responsibility keeps one continuity identity while executors/sessions change. Executor count is execution history, not topology. Programme/RLL/OFFLOAD traversal is conditional on actual references or cross-responsibility dependencies.

## Current responsibility surface

A continuity-managed responsibility has at most one mutable `FURTHER_TASK_SNAPSHOT` with `AUTHORITY: DERIVED_CONTINUITY_ONLY`.

It contains state, exact protocol provenance, plan reference, declared outcome denominator, P completion frontier, E evidence frontier, active/completed/pending units, material and semantic/evidence heads, current/next, Owner decision, and stream-loss/handover state.

Progress must never be inferred from commits, tests, comments, tool calls, tokens, elapsed time, or executor count.

## Exact protocol provenance

New V3.2 continuity-managed responsibilities SHOULD persist a successor-verifiable exact protocol reference:

```text
PROTOCOL_REF: owner/repo@<exact-commit>:skills/engineering-pr-delivery-v3.2
```

When a candidate protocol is not on the responsibility's base/default branch, the exact ref must identify the repository/commit that actually contains the governing candidate implementation. A PR number may be added for navigation, but an exact commit is the reconstructable identity.

`PROTOCOL_REF` is continuity provenance, not authority. Owner intent and repository source truth still govern. Older snapshots without this field remain readable as `UNKNOWN`; successors must discover rather than fabricate a value.

## Mandatory implementation-start event

After a durable implementation plan exists, starting material implementation is an observability event:

```text
IMPLEMENTATION_PLAN present
→ implementation begins
→ implementation-start
→ refresh current responsibility projection
→ best-effort GitHub status/title synchronization
→ continue engineering
```

Starting implementation earns zero progress. The event command automatically synchronizes the configured GitHub responsibility when authenticated `gh` is available. The agent must not hand-author duplicate status prose.

Provider failure is `FAILED_OBSERVABILITY_ONLY`: record/report it and continue engineering. No timer or heartbeat performs this refresh.

## Material vs semantic/evidence frontier

V3.2 exposes independently:

```text
MATERIAL_FRONTIER = live Git/owned-PR material
SEMANTIC_EVIDENCE_FRONTIER = latest durable task evidence basis explaining/proving responsibility state
```

If the semantic head is an ancestor of material HEAD, Git derives the commit distance. Material-ahead distance is reconstruction distance, not progress.

The frontier also exposes:

```text
RECONCILIATION_NEEDED: true | false
```

This is a passive material/evidence discrepancy signal. During healthy uninterrupted engineering, material may legitimately advance before the next semantic evidence checkpoint; `RECONCILIATION_NEEDED=true` therefore does **not** automatically impose a recovery publication on the current executor.

## Recovery state

Active recovery is separate from passive frontier discrepancy:

```text
RECOVERY_MODE:
NONE
INTERRUPTED_EXECUTOR
FRONTIER_RECONCILIATION

RECOVERY_EVIDENCE_REQUIRED: true | false
```

A replacement executor that observes an unexplained/recovery-relevant frontier gap starts recovery explicitly:

```bash
python skills/engineering-pr-delivery-v3.2/scripts/continuity_projection.py recovery-start \
  --snapshot relay/GENERATED/tasks/<issue>.continuity.json \
  --mode FRONTIER_RECONCILIATION \
  --output relay/GENERATED/tasks/<issue>.continuity.json
```

That transition sets `RECOVERY_EVIDENCE_REQUIRED=true`. A same-lifecycle unexpected stream loss uses `stream-loss`, sets `RECOVERY_MODE=INTERRUPTED_EXECUTOR`, and preserves the consecutive-loss counter semantics.

Only successful durable `TASK_EVIDENCE — RECOVERY` provider readback clears the active recovery obligation and aligns the recovered semantic frontier.

## Abrupt interruption

Default first-line recovery:

```text
1. BASIS — verify responsibility and Owner amendments.
2. LIVE MATERIAL — observe PR/branch/base/HEAD/relevant checks.
3. DELTA — compare semantic/evidence and material frontiers.
4. RECONCILE — validate active/pending units, assumptions and negative knowledge.
5. TASK_EVIDENCE — RECOVERY — durably anchor reconstructed truth.
6. CONTRIBUTE + CONTINUE — resume useful engineering.
```

Escalate to full/deep reconstruction when responsibility identity, human authority, programme dependencies, RLL/OFFLOAD references, negative knowledge, or material/provider state cannot be reconciled.

Minimum recovery evidence:

```text
TASK_EVIDENCE — RECOVERY
RESPONSIBILITY
PROTOCOL REF
RECOVERY MODE
OBSERVED MATERIAL
LAST TRUSTED SEMANTIC BASIS
RECOVERED DELTA
CURRENT CLAIM
NOT YET PROVED
OPEN WORK
OWNER DECISION
NEXT
```

After a detected recovery, publish/read back this evidence before the next material change. This is semantic continuity discipline, not legacy action permission gating.

## Three-loss escalation

Within one executor lifecycle:

```text
loss 1 → recovery evidence
loss 2 → recovery evidence
loss 3 → recovery evidence + Plan for handover once
loss 4+ → recovery evidence; no repeated auto handover trigger
```

A successor lifecycle resets the count/trigger. This is continuity preparation, not engineering failure or Owner approval.

## Scoped result

`TASK_RESULT` adds:

```text
RESULT_SCOPE: STEP | PRODUCT | RESPONSIBILITY
COVERAGE: <declared denominator coverage>
RESPONSIBILITY_COMPLETE: YES | NO | UNKNOWN
```

`RESPONSIBILITY_COMPLETE: YES` is valid only with `RESULT_SCOPE: RESPONSIBILITY`. Old results without this field map to UNKNOWN. Issue closure or PR merge does not imply responsibility completion.

## P/E progress

For declared units:

```text
P = completed units / denominator
E = evidenced completed units / denominator
```

A unit cannot be evidenced unless complete. In `projection_mode: DERIVED_FROM_FACTS` (the default for every new snapshot) `E` is not an input: a unit is evidenced only when it is complete, carries durable `evidence_refs`, and its `evidence_candidate` equals the observed material head. An agent reports `complete` plus `evidence_refs`/`evidence_candidate`; it never reports the E flag (`unit-update --evidenced` is rejected). A moved head lowers `E` until the evidence is republished for the new head; `P` is unaffected.

Example generated title (written only by the DELP runner, never by an agent or by this snapshot):

```text
🟡 [#527 › #588 › #592 → PR#593] R:P77/E69 · UNIT-09 · EVIDENCE_GAP — <responsibility>
```

The title is a glanceable projection only. Percentages may decrease after a legitimate denominator change. Weights are plan authority (the DELP execution graph, or an explicit `weight` declared at `init` by the Coordinator), never declared by the executing agent. The earlier `{P77% · E69% · UNIT-09 · RECOVERING}` suffix form is legacy (`LEGACY_AGENT_ASSERTED` snapshots only) and is rewritten by the runner at the next projection. See `durable-execution-lineage-projection-v32.md`.

## Event-driven provider synchronization

Synchronize only at semantic events such as implementation start, declared outcome completion, recovery-start/evidence transition, denominator change, genuine Owner-decision state, and task result/completion.

Do not update for timer wake, heartbeat, command, test retry, commit count, tool call, elapsed time, or generic `proceed`.

## Reference implementation

`scripts/continuity_projection.py` implements the pilot.

Initialize:

```bash
python skills/engineering-pr-delivery-v3.2/scripts/continuity_projection.py init \
  --responsibility owner/repo#484 \
  --units declared-units.json \
  --plan-ref issuecomment-... \
  --protocol-ref 'owner/repo@<exact-sha>:skills/engineering-pr-delivery-v3.2' \
  --material-head "$(git rev-parse HEAD)" \
  --github-repository owner/repo \
  --github-issue 484 \
  --output relay/GENERATED/tasks/484.continuity.json
```

Start implementation and automatically refresh GitHub:

```bash
python skills/engineering-pr-delivery-v3.2/scripts/continuity_projection.py implementation-start \
  --snapshot relay/GENERATED/tasks/484.continuity.json \
  --output relay/GENERATED/tasks/484.continuity.json
```

Report a completed unit with its evidence (facts only; `--evidenced` is rejected in the default DERIVED mode):

```bash
python skills/engineering-pr-delivery-v3.2/scripts/continuity_projection.py unit-update \
  --snapshot relay/GENERATED/tasks/484.continuity.json \
  --unit-id UNIT-09 --complete YES \
  --evidence-ref 'owner/repo#484#issuecomment-12345' \
  --evidence-candidate "$(git rev-parse HEAD)" \
  --output relay/GENERATED/tasks/484.continuity.json
```

Refresh material frontier:

```bash
python skills/engineering-pr-delivery-v3.2/scripts/continuity_projection.py observe-frontier \
  --snapshot relay/GENERATED/tasks/484.continuity.json \
  --repo-root . \
  --output relay/GENERATED/tasks/484.continuity.json
```

## Worth falsifiers

Remove/revise this mechanism if it cannot be rebuilt against durable provider/material truth, provider sync becomes an engineering gate, clean work acquires heartbeat ceremony, P/E rewards activity rather than outcomes/evidence, protocol provenance adds recurring work without improving reconstruction, or fast recovery hides contradictions that require full reconstruction.
