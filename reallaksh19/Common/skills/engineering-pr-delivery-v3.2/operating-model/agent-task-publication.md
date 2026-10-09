# V3.1 agent task publication lifecycle

## Purpose

Define the normal durable interaction between an engineering agent, its owned child issue, V3.1 recording, the programme Handover ledger and the coordinator.

This is a reconstruction protocol, not an execution gate.

## End-to-end lifecycle

```text
PROGRAMME PARENT
governing human/programme contract
        │
        ▼
CHILD IMPLEMENTATION ISSUE
bounded engineering responsibility
        │
        ▼
PASS 1 SYSTEM BASELINE
independent live system understanding without task/action bias
        │
        ▼
PASS 2 IMPROVEMENT + TASK RECONCILIATION
chat-only proposals + draft implementation plan
        │
        ▼
OWNER APPROVAL
        │
        ▼
AGENT LIVE REFRESH
confirm approval basis is still current
        │
        ▼
IMPLEMENTATION_PLAN rev 1
agent-authored, includes approved IP-* proposals, posted durably on the child issue
        │
        ├────► V3.1 observes/binds current plan to task snapshot
        │
        └────► existing/new EP identifies the bounded responsibility
                  │
                  ▼
              EXECUTION
                  │
          ┌───────┼────────┐
          ▼       ▼        ▼
     PLAN_UPDATE TASK_EVIDENCE PR/TEST/ARTIFACT
          │       │        │
          └───────┼────────┘
                  ▼
            TASK_RESULT
                  │
                  ▼
       [Relay Handover] ledger
        indexes plan/material/result
                  │
                  ▼
             COORDINATOR
        EXPECTED → OBSERVED → CONSEQUENCE
                  │
        ┌─────────┼──────────┐
        ▼         ▼          ▼
     consumer  later check  Owner only if needed
```

## 1. Child issue is the task home

For new multi-agent programmes:

- the **programme parent** carries the governing programme contract;
- the **child implementation issue** carries the bounded engineering responsibility;
- the agent publishes its implementation plan and task evidence on that child issue;
- the dedicated **[Relay Handover]** child indexes the current programme-wide operational picture.

In V3.1 terms, a new EP may therefore carry:

```yaml
programme_parent:
  repository: owner/repo
  number: 210
  ...

parent_issue:
  repository: owner/repo
  number: 232
  ...
```

For compatibility, older EPs may have only `parent_issue`; V3.1 then treats that issue as both work issue and programme parent for reconstruction.

## 2. Two-pass separates system understanding from approved engineering intent

Pass 1 independently reconstructs the live repository/application without seeing the actual issue/task or being asked for a next action.

Pass 2 receives that baseline plus the actual task and refreshes live evidence.

Before proposing improvements, it reconstructs the relevant hierarchy:

```text
Original Intent historical source
→ current Owner/Roadmap authority + amendments
→ current EP / owned issue responsibility
→ relevant primary-agent reasoning
→ latest AGENT_STATUS_V1 / Further task
→ Local Agent / OFFLOAD evidence
→ RLL transport state/results
→ current PR/test/runtime material truth
→ current Task Snapshot / Handover index
```

It then emits `STEP-BACK RECONCILIATION`, distinguishing preserved/satisfied/missing/drifted/superseded Owner intent, Roadmap changes, EP-only assumptions, Local Agent findings, RLL transport-only facts, reality corrections and unresolved questions. Only after that should it identify zero or more legitimate high-ROI Improvement Proposals, quantify them, reconcile the issue disposition, and show the Owner a draft implementation plan in chat.

The first Pass-2 response is **not** durable engineering intent. It must stop for explicit Owner approval.

After approval, the same agent refreshes volatile reality and publishes the approved implementation plan on the original owned issue. Approved in-scope IP-* proposals are embedded in that plan. Approved adjacent proposals use a separate responsibility/EP rather than silently widening the issue.

## 2.1 Responsibility-scoped conversation provenance

The four task publication types remain unchanged. `CONVERSATION_RECORD` is contextual provider provenance, not task-state publication.

When practical, after a substantive semantic Owner↔agent exchange and before the next major material action, append a compact record to the existing responsibility-specific provider surface:

- primary agent → owned child/engineering issue;
- Local Agent/helper → governed OFFLOAD/provider sub-issue;
- RLL → do not copy transport chatter; keep existing RLL execution/state/directive records.

Persist only exchanges that materially affect intent, inputs, expected outputs, RCA, proposals, approvals/rejections, assumptions, falsifiers, reconciliation or handoff understanding.

Do not archive routine commands, file reads, test retries, timer wakes or generic progress chatter.

Failure/missing context capture is reconstruction debt only and does not revoke or invalidate useful material evidence.

## 2.2 Mutable execution continuity — AGENT_STATUS_V1

`CONVERSATION_RECORD` explains **why** reasoning/decisions happened.

`AGENT_STATUS_V1` explains **where execution is now and what remains**.

Keep exactly one mutable status comment per custody epoch on the owned issue. It is `DERIVED_EXECUTION_CONTINUITY`, not an engineering task publication or authority store.

Recommended normalized structure lives in:
- `templates/agent-status.md`;
- `schemas/agent-status.schema.yaml`;
- `scripts/agent_status.py`.

Use FT-* only inside `Further task`. A successor reads predecessor status but must revalidate unresolved FT-* against live issue/PR/head/tests/artifacts before continuing.

Custody transition:
- initial executor → `NEW`;
- graceful successor → new status comment with `HANDOFF` + predecessor ref;
- abrupt-loss successor → new status comment with `RECOVERY` + predecessor ref.

Do not mutate the predecessor status after custody changes.

When responsibility completes, TASK_RESULT carries engineering outcome; status becomes `COMPLETE` and Further task is empty within that responsibility. When responsibility is genuinely replaced, TASK_RESULT records `SUPERSEDED`, status becomes `SUPERSEDED`, and the successor issue is named. Provider issue closure remains separate.

## 3. First durable agent publication — IMPLEMENTATION_PLAN

Before publishing the plan, perform the live V3.1 handshake against current `Common@main`. Repeat that handshake on session/resume and at later semantic boundaries defined by the current V3.1 skill. If the Common SHA changed, reload the live skill/Two-Pass contract and revalidate the pending action rather than replaying completed work.

Normal expectation:

> After live revalidation and before substantial material modification, publish `IMPLEMENTATION_PLAN — rev 1` on the owned child implementation issue.

This is a strong reconstruction convention, not permission.

For deterministic provider reconstruction, the durable comment should **begin with the typed publication heading**. Pass-1/Pass-2 reasoning or long execution narrative may contain the same ideas, but it is not the approved durable implementation plan.

If useful implementation/investigation already happened before the plan was posted, the work remains valid. Publish the current plan as soon as practical and continue.

Do not wait for Relay/coordinator approval after publishing the plan.

Recommended shape:

```text
IMPLEMENTATION_PLAN — rev 1

PROTOCOL BASIS
- V3.1
- Common@<resolved current-main SHA>
- <current Two-Pass protocol revision>

BASIS
- exact current main/head
- relevant parent programme basis
- owned child responsibility ref + observed body/contract digest, when available
- Pass-1/Pass-2 reasoning refs, when used

MY UNDERSTANDING
What I believe the real engineering problem is.

OWNED OUTCOME
What I intend to make true.

SOURCE TRUTH
What I inspected and which source is authoritative.

APPROACH
The implementation strategy I currently intend to use.

PLAN SLICES
Use stable STEP-* IDs. Each meaningful slice records current state and the AC-* criteria it supports.

EXPECTED CHANGED SURFACES
Files/components/interfaces likely to change.

DEPENDENCIES
Required production outputs from other workstreams.

INDEPENDENT WORK
What can proceed even if those outputs are not yet available.

FALSIFIER
What would prove this plan unnecessary, wrong or differently scoped.

VALIDATION
Focused tests/oracles/runtime/browser evidence.

PRESERVE
Existing behavior/contracts that must remain true.

UNCERTAINTIES
What is not yet known.

EXPECTED NEXT OBSERVABLE
The next concrete evidence a coordinator should expect.

CONSUMER / HANDOFF
Who needs the result and what they need from it.
```

## 4. EP role

An EP is V3.1's bounded task/execution identity.

It is **not** the agent's implementation plan and does not replace the child issue.

One meaningful engineering responsibility should normally map to one EP, not one EP per command/file/test.

Do not create nano-EPs for:

- inspect file;
- edit helper;
- run test;
- post issue comment;
- create PR.

A new EP is appropriate when the owned engineering responsibility materially changes or a distinct follow-up/revision becomes a new task.

### Plan timing relative to EP

The preferred new-task sequence is:

```text
child responsibility
→ agent plan
→ V3.1 records/binds EP + plan basis
→ execution
```

But an EP may already exist before an incoming agent publishes its plan, for example when a three-pass/handover packet was prepared from existing V3.1 context.

In that case:

```text
existing EP
→ incoming agent publishes plan
→ TASK_SNAPSHOT/Handover observes current plan ref/revision
```

Do **not** create a replacement EP merely because the implementation plan was first published or revised.

## 5. Plan revisions — PLAN_UPDATE

A material implementation-learning change stays on the same task/EP when responsibility remains the same.

Publish:

```text
PLAN_UPDATE — rev N

CHANGED BECAUSE
New evidence.

PREVIOUS ASSUMPTION
What was wrong/incomplete.

NEW APPROACH
What changes.

UNCHANGED
Outcome, ownership boundary, invariants and consumer contract that remain stable.

EXPECTED NEXT OBSERVABLE
What the coordinator should now expect.
```

Use a new EP/child only if the engineering responsibility itself has materially changed.

A correction/narrowing that changes the intended material approach is still a `PLAN_UPDATE` even when it appears during a long reasoning pass. Label it durably rather than forcing the coordinator to infer the semantic transition from prose.

## 6. Meaningful intermediate evidence — TASK_EVIDENCE

Do not post every action.

Post a durable evidence update when it changes reconstruction or another workstream's next action.

```text
TASK_EVIDENCE

OBSERVED AT
...

EXACT HEAD / BASIS
...

CLAIM
...

EVIDENCE
...

RESULT
PASS | PARTIAL | FAIL | NOT_RUN | PENDING | OBSERVED

REASON CLASS
CURRENT_TASK | UPSTREAM_DEPENDENCY | SIBLING_WORKSTREAM | PREEXISTING_UNRELATED | INFRASTRUCTURE | PROVIDER | OWNER_DECISION | UNKNOWN

CONSEQUENCE
...

DEPENDENCY DISCOVERED
NONE | <missing production truth>

PLAN CONSEQUENCE
NONE | PLAN_UPDATE required

BLOCKING CONDITION
NONE | <production fact that prevents useful continuation>

UNBLOCK CONDITION
NONE | <externally observable fact that permits revalidation>

EXPECTED NEXT OBSERVABLE
<the next useful evidence/event, especially when waiting>
```

Useful triggers include:

- falsifier result;
- newly discovered production dependency;
- consumer-ready producer output;
- important verified negative result;
- runtime/browser evidence that materially changes the plan;
- local/helper result that now matters outside the local workstream.

Routine chatter is not a publication requirement.

## 7. Delivery / handoff — TASK_RESULT

At the meaningful task delivery boundary publish a comment whose first durable heading is `TASK_RESULT`. Final exact-main/integration acceptance is also a TASK_RESULT when that is the owned responsibility.

```text
TASK_RESULT

OUTCOME
ACHIEVED | PARTIAL | FALSIFIED

EXACT MATERIAL
branch
PR
base
head

CHANGED SURFACES
path/component → purpose

VALIDATION
command/oracle → result

PROVED
...

NOT PROVED
...

KNOWN LIMITATIONS
...

NEGATIVE ASSURANCE
What intentionally did not change.

CONSUMER CONSEQUENCE
Which downstream work can now consume what.

REMAINING DEPENDENCY
...

NEXT
...
```

The PR/commit/test/artifact is the material truth. The comment is the durable semantic handoff/index.

Provider issue lifecycle is separate from responsibility completion: a valid `TASK_RESULT` may establish that the bounded responsibility is complete even if the GitHub issue remains open for readback or programme chronology.

## Acceptance and progress denominators

Use stable IDs:

```text
programme: EXIT-*
child/work issue: AC-*
implementation plan: STEP-*
```

Task Snapshot percentages come only from those declared criteria/weights.

Do not use these as progress denominators:

- PR count;
- commit count;
- file count;
- test count;
- chat volume;
- publication count.

When a denominator is absent, V3.1 reports `UNKNOWN / UNMAPPED`.

## 8. V3.1 read models

V3.1 may observe the child issue and expose in `TASK_SNAPSHOT`:

```text
protocol_basis.protocol
protocol_basis.common_sha
protocol_basis.two_pass_revision

reconstruction_context.original_intent
reconstruction_context.latest_reconciliation
reconstruction_context.primary_conversation_refs[]
reconstruction_context.roadmap_refs[]
reconstruction_context.local_agent_refs[]
reconstruction_context.rll_refs[]
```

These are provider/evidence pointers only. Task Snapshot must not copy transcript bodies or turn historical Original Intent / agent reasoning into current authority.

Alongside:

```text
programme_parent
parent_issue / work issue
planning.state
planning.provider_ref
planning.revision
planning.digest
planning.observed_at
planning.expected_next_observable
task_publications[]
```

Plan state is:

```text
PRESENT
MISSING
STALE
UNKNOWN
```

A missing/stale plan is reconstruction debt only.

### Owner-facing status rule

After a meaningful `IMPLEMENTATION_PLAN`, `PLAN_UPDATE`, `TASK_EVIDENCE`, or `TASK_RESULT` changes current reconstruction, refresh the **issue-local** Task Snapshot from live provider/material state and use its rendered form as the primary status surface shown to the Owner.

Do not substitute a narrative activity summary such as "updated issue / created branch / added tests" when the Owner is asking for task status.

The rendered status must make these distinctions visible when applicable:

- parent/programme progress checklist;
- current child/task acceptance checklist;
- current plan revision and expected next observable;
- implementation versus verification;
- `NOT_RUN` versus `FAIL`;
- provider issue state versus responsibility completion;
- PR lifecycle, base and current material head;
- stacked/related PRs;
- what is done;
- what remains;
- next useful observable/action.

If `CURRENT_SNAPSHOT` belongs to another EP/responsibility, it must not masquerade as the current issue's status. Generate/read the issue-local snapshot under `relay/GENERATED/tasks/**` instead.

Narrative prose may follow the rendered snapshot for context, but it is secondary.

## 9. [Relay Handover] programme ledger

The programme Handover ledger should index programme/workstream reconstruction with:

- Original Intent ref;
- current Roadmap/programme reconciliation refs;
- child work issue / EP;
- latest responsibility reconciliation and substantive primary-conversation refs;
- Local Agent / OFFLOAD provider refs;
- RLL execution/state refs when relevant;
- plan state/ref/revision;
- expected next observable;
- branch/PR/exact-head material where available;
- latest meaningful task publications;
- dependency/output consequences;
- current task result/handoff.

It should not duplicate full implementation-plan prose, Original Intent bodies, conversation transcripts, Local Agent chatter or RLL timer/lease chatter.

## 10. Coordinator use

The coordinator watches **expectations**, not agent activity.

```text
EXPECTED
What concrete evidence did the plan say should appear next?

OBSERVED
What durable material/evidence actually exists?

CONSEQUENCE
What changes for this task, another workstream, the plan, the Owner, or the next observation?
```

Examples:

- plan published → expect focused falsifier/PR;
- producer result landed → route to consumer immediately;
- plan changed → retire obsolete timer and watch new expected observable;
- session disappeared → reconstruct from child issue + plan + EP + PR/head/evidence;
- no meaningful change → do nothing.

## 11. Non-blocking invariant

None of the following is engineering permission:

- plan presence;
- plan revision;
- EP state;
- Handover freshness;
- task-publication count;
- timer state;
- coordinator observation;
- V3.1 lease/checkpoint/control state.

Actual production constraints come from source truth, the engineering problem, evidence/tests/runtime, human decisions and real provider permissions.

## 12. V3.1 only

Use Engineering Relay V3.1 only for current recorder/reconstruction/reporting semantics.

Do not use V3 or V2.5 as live coordination, recovery, gating, handover or Owner-command protocols.
