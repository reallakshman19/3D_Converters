# TASK_EVIDENCE — CHECKPOINT with `CHECKPOINT_FACTS_V1` (agent template)

You publish **facts about your own leaf responsibility**. You do not publish progress.

Never write, edit or paste: a percentage (`P`, `E`, `D`, `R:P…/E…`, `Φ:D…`, `Π:D…`), an issue title or title suffix, a unit weight, a frontier count (`F…`), an activity epoch (`A…`), an evidence-health verdict, or any parent / phase / programme number. They are recomputed by the DELP projector. A facts block that contains one is rejected and moves nothing.

Post one comment on **your own leaf issue**, beginning with the typed heading, at a checkpoint boundary (a declared unit completed, a finding that changes the next action, a candidate move that needs replay, a recovery):

````text
TASK_EVIDENCE — CHECKPOINT

<free prose for a human successor: CLAIM, what changed, negative knowledge, consequence. Prose may mention
 test counts or coverage; it never carries the projection notation above.>

```yaml
CHECKPOINT_FACTS_V1:
  responsibility: {issue: <owner/repo#leaf or #leaf>, id: <responsibility id, optional>}
  material:
    pr: <#PR>                          # the leaf's primary PR (omit while there is none)
    candidate_sha: <40-hex commit the evidence below covers>
  units:                               # only the units this checkpoint reports on
    - id: <declared unit id>
      state: COMPLETE                  # COMPLETE | IN_PROGRESS | NOT_STARTED
      result: VERIFIED                 # VERIFIED | PARTIAL | FAILED | NOT_RUN | PENDING
      evidence_refs:                   # durable refs: comment / commit / run / artifact. Empty = a visible EVIDENCE_GAP
        - <ref>
  gates: []                            # reviewers only: [{id: REVIEWER_ACCEPTANCE, result: PASSED, evidence_refs: [<ref>]}]
  activity: ACTIVE                     # ACTIVE | WAITING_CI | WAITING_TOOL | WAITING_EXTERNAL | WAITING_PROVIDER_VISIBILITY | RECOVERING | PAUSED
  next: {unit: <next declared unit>, action: <one line, <= 200 chars>}
  blocker: NONE                        # NONE | one line
  owner_action: NONE                   # NONE | REQUIRED — one explicit decision/action
  # result:                            # only at a true result boundary (see TASK_RESULT)
  #   {scope: RESPONSIBILITY, responsibility_complete: YES}
```
````

Rules of thumb:

- **Publish a first facts block at START** (every unit `NOT_STARTED`, `next` naming the first unit, `activity: ACTIVE`). A leaf whose pull request or branch shows work but whose ledger is empty is shown as `UNMATERIALIZED` — unknown, never zero — and your next `continue` is told to publish facts before anything else.
- Report a unit `COMPLETE` when the implementation is done; give `evidence_refs` and `result: VERIFIED` when it is *proved on `candidate_sha`*. If you completed it but have not recorded evidence yet, say so honestly (empty refs): the gap is visible and the next `continue` repairs it before new coding.
- Evidence covers **one candidate**. After a push, the old evidence stops counting until you replay it on the new head and republish the facts with the new `candidate_sha`.
- `QUIET` and `STALE` are never declared; only an observer can say an executor is quiet or stale.
- Parent issues are not workspaces. Facts addressed to a parent/phase issue are rejected; material work lives in a leaf.
- Validate before posting when you can run scripts: `python skills/engineering-pr-delivery-v3.2/scripts/delp_projection_v32.py validate-facts <file>`.

On `continue` / `proceed` / `next` / `resume` / `reconcile` / `take over` / `keep going`: reconstruct first (lineage, live candidate, latest facts), repair any evidence gap, let the projector refresh titles and status, show the compact `CONTINUE CHECKPOINT`, then do exactly the next bounded unit.
