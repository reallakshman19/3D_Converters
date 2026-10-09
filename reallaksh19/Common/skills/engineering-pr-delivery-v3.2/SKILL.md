# Engineering Relay V3.2 — worth-gated continuity/recovery candidate

## Status

V3.2 is an additive candidate implementation line created from the frozen Engineering Relay V3.1 tree after the evidence-based audit in Common #483.

Until V3.2 is separately accepted/cut over, V3.1 remains the current production protocol. This directory is the implementation/replay surface for the worth-gated V3.2 continuity slice owned by Common #484.

V3.1 is not modified by V3.2 work.

## Normative recorder-first rule

Relay is a durable **recording, continuity and reconstruction mechanism**. It does not decide whether ordinary engineering work may proceed.

Preserve these boundaries:

- Owner/programme intent is human authority.
- Git / PR / tests / runtime / artifacts are material truth.
- exact-head evidence proves only the exact basis it names.
- recorder-integrity failures remain real hard failures.
- provider/reporting/status failure may reduce observability; it must never reduce production agency except when the active responsibility has explicitly enabled the Owner-visible checkpoint barrier described below.
- generated/current/progress/Further-Task views are derived and disposable.
- execution, evidence, verification, delivery, provider lifecycle, and Owner authority remain separate axes.
- a replacement executor/session does not create a new responsibility.

The engineering task-publication set remains exactly:

```text
IMPLEMENTATION_PLAN
PLAN_UPDATE
TASK_EVIDENCE
TASK_RESULT
```

No periodic heartbeat/activity publication is added. Event-gated checkpoint evidence reuses `TASK_EVIDENCE`; it is not a fifth publication family and never earns progress merely by existing.

## Responsibility-first topology

Choose coordination topology from engineering responsibility, dependency, and writer topology — never executor count.

```text
R = independently governed responsibilities
D = cross-responsibility dependency edges
C = concurrent material writers

R = 1
→ SINGLE_RESPONSIBILITY

R >= 2
→ PROGRAMME

C >= 2
→ CONCURRENT_WRITER overlay requiring its own proven conflict/fencing semantics
```

Three to five sequential replacement agents on one issue remain one responsibility.

Programme Handover, RLL, and OFFLOAD traversal are conditional on real references/dependencies. Their mere existence in this copied baseline does not make them mandatory on the simple path.

## Exact protocol provenance

A new V3.2 continuity-managed responsibility SHOULD record an exact successor-verifiable protocol source:

```text
PROTOCOL_REF: owner/repo@<exact-commit>:skills/engineering-pr-delivery-v3.2
```

If the candidate protocol is not present on the responsibility's own base/default branch, `PROTOCOL_REF` must point to the repository/commit where the governing candidate actually exists. A PR number may be added for navigation, but it does not replace the exact commit.

This field is continuity provenance, not authority. Older snapshots without it remain readable as `UNKNOWN`; never fabricate a value.

## Lossless Owner intent envelope

Direct Owner instructions are captured before workflow normalization. The canonical parser is `scripts/owner_commands.py`.

For a direct Owner utterance it preserves:

```yaml
owner_intent:
  verbatim_request:
  source_ref:
  primary_purpose:
  requested_deliverables: []
  target:
  custody_intent:
  assurance_request:
  modifiers: []
  boundary_constraints: []
  authority_ref:
```

The envelope is lossless request/custody/assurance context, not a new permission system:

- preserve `verbatim_request` exactly; normalization never replaces it;
- `source_ref` and `authority_ref` are references supplied by the caller and are never fabricated;
- compound deliverables remain compound (for example, handover package plus an exact-count successor reconstruction challenge);
- existing scalar `intent`, `workflow`, `reasoning_modes` and question-suppression fields remain derived compatibility views;
- quoted repository/file/fixture text cannot create an Owner envelope;
- the envelope creates no durable authority, role transition, merge authority or production authority.

Custody and reasoning are orthogonal. In particular:

```text
PLAN_HANDOVER
= prepare custody transfer

PLAN_HANDOVER
!= automatic Two-Pass request
!= automatic replanning
!= independent reconstruction
```

A handover workflow may reconcile live material and publish custody context, but it must not manufacture a new reasoning request merely because custody is changing. Replanning/assurance is separate and must be explicitly requested or independently required by the governing responsibility.

## Implementation plan → automatic GitHub start update

When an agent begins material implementation of an already-published implementation plan, it MUST emit the V3.2 `implementation-start` semantic event.

```text
IMPLEMENTATION_PLAN present
        ↓
implementation begins
        ↓
implementation-start event
        ↓
refresh responsibility current state
        ↓
best-effort GitHub Further Task + title projection
        ↓
continue engineering
```

Starting implementation earns zero progress.

Use:

```bash
python skills/engineering-pr-delivery-v3.2/scripts/continuity_projection.py implementation-start \
  --snapshot relay/GENERATED/tasks/<issue>.continuity.json \
  --output relay/GENERATED/tasks/<issue>.continuity.json
```

If the snapshot contains GitHub provider identity and authenticated `gh` is available, the command automatically updates the managed Further Task comment and title suffix.

Provider synchronization failure is recorded as:

```text
FAILED_OBSERVABILITY_ONLY
```

and does not normally block material engineering. When an active responsibility explicitly enables `CHECKPOINT_VISIBILITY_MODE=OWNER_REQUIRED`, checkpoint-boundary provider synchronization is different: the executor MUST NOT start the next substantial work unit until the required GitHub projection has been written and read back, or until the Owner explicitly waives that visibility requirement. This narrow barrier does not convert arbitrary provider failures into engineering truth.

No timer, heartbeat, commit count, test count, tool call, or elapsed-time event may substitute for this semantic event.

## Responsibility-scoped current state

Use one mutable current surface per continuity-managed responsibility:

```text
FURTHER_TASK_SNAPSHOT
AUTHORITY: DERIVED_CONTINUITY_ONLY
```

It answers:

- exact protocol provenance (`PROTOCOL_REF`);
- current state;
- current plan;
- declared progress denominator;
- P = objectively completed declared units;
- E = completed units with durable successor-safe evidence;
- active/pending units;
- material frontier;
- semantic/evidence frontier;
- passive reconciliation need;
- active recovery mode/evidence obligation;
- current / next;
- genuine Owner decision if any;
- stream-loss/handover escalation state;
- activity epoch (`A<n>`) for observable checkpoint motion;
- last meaningful activity classification;
- last material/semantic frontier-advance checkpoint;
- derived liveness projection when a watcher/provider supports it.

The managed provider surface is a cache/read model, not a fifth publication and not authority.

Reference:
- `operating-model/responsibility-continuity-v32.md`
- `templates/further-task-v32.md`
- `schemas/responsibility-continuity.schema.yaml`
- `scripts/continuity_projection.py`

## Progress semantics

Progress is denominator-based.

```text
P = objectively completed declared units / denominator
E = evidenced completed declared units / denominator
```

A unit cannot be evidenced unless it is complete.

Do not award progress from commits, files, tests, comments/publications, tool calls, tokens, elapsed time, executor/session count, activity epochs, checkpoint count, or generic `proceed`.

Percentages may decrease after a legitimate declared-denominator expansion.

## Projection authority — agents publish facts only (DELP)

> **Agents publish facts. Everything else is recomputed from those facts.**

An agent states, about its own responsibility only: which declared units it reports complete, the verification result, the durable evidence refs, the candidate those refs cover, and the next unit — as a `CHECKPOINT_FACTS_V1` block inside `TASK_EVIDENCE`. An agent MUST NOT author, edit or paste a percentage, a title or title suffix, a weight, a frontier count, an activity epoch, an evidence-health verdict, or any parent/phase/programme progress. Those are projections: the DELP projector derives them, a facts record that tries to author one is rejected and cannot move any number, and a hand-edited title is classified as drift and overwritten at the next projection.

```text
leaf          🟢 [#527 › #588 › #592 → PR#593] R:P65/E65 · U04 · ACTIVE — <responsibility>
intermediate  🟢 [#527 › #588 → #592/PR#593] Φ:D60/E58 · F2 · ACTIVE — <phase>
programme     🟢 [#527] Π:D72/E70 · F3 · ACTIVE — <programme>
```

`›` is ownership/hierarchy, `→` is the material PR relation, `F` is the number of active frontier leaves, and every percentage carries its scope (`R:`, `Φ:`, `Π:`). The title is disposable projection only and never authority. The activity epoch `A<n>` is no longer in the title; it lives in `LIVE_STATUS_V1.activity_epoch`. A bare `P56% / E56%` is invalid.

`E` counts a completed unit only while its evidence is **current**: verified result, durable refs, and an evidence candidate equal to the live PR head. A new push therefore lowers `E` without touching `P` until the evidence is replayed; evidence for an older candidate never silently certifies the new one. Parent and programme numbers are weighted roll-ups recomputed from child truth, never incremented, never authored. Continuation commands (`continue`, `proceed`, `next`, `resume`, `reconcile`, `take over`, `keep going`) first reconstruct and reconcile (`CONTINUE CHECKPOINT`), repairing any evidence gap before new coding.

Normative contract: `operating-model/durable-execution-lineage-projection-v32.md`. Implementation: `scripts/delp_projection_v32.py`, `schemas/delp-*-v32.schema.yaml`, `tests/test_delp_projection_v32.py`. New `FURTHER_TASK_SNAPSHOT`s use `projection_mode: DERIVED_FROM_FACTS` (`continuity_projection.py init` default): `unit-update --evidenced` is rejected, E is computed from `evidence_refs` + `evidence_candidate`, and the snapshot never patches the issue title. `LEGACY_AGENT_ASSERTED` snapshots stay readable and unchanged.

**Decomposition gate.** The plan is judged before work starts, by a pure function over the execution graph (never over agent facts): `delp_projection_v32.py decompose-check` evaluates `programme.decomposition_policy` — 3–8 verifiable units per leaf, no unit above 40%, a stated outcome and write surface, a size budget within 700 target / 1500 hard changed lines and 15 / 20 minutes, and overlapping write surfaces either ordered by `depends_on` or declared `parallel_ok` with a basis. The mode defaults to `OFF`; `ADVISORY` only reports; under `ENFORCED` a failing leaf shows `NOT_RELEASEABLE` and every continuation answers `FIX_PLAN` instead of starting a unit.

**Claim-first decomposition is mandatory for new programmes.** Historical V3.2 graphs remain readable because `decomposition_policy.claim_first.mode` defaults to `OFF`, but a newly authored programme MUST set it to `ENFORCED` before material child release. The Coordinator first declares `programme.acceptance_claims[]` as `SEMANTIC` or `DELIVERY_GATE`; each leaf declares `owns_claims` and an `independence_basis`. The gate then rejects uncovered parent claims, undeclared claim references, accidental duplicate ownership, missing leaf ownership/independence basis, and a `PRODUCT` leaf that owns only delivery-gate claims. This is deliberately not keyword inference: workflow/browser/test/evidence work is legitimate as an acceptance method or a `GATE` responsibility, but it cannot masquerade as the primary PRODUCT responsibility for a semantic parent outcome.

**Proposal-v2 is the pre-materialization path for new claim-first programmes.** A Coordinator MAY declare `programme.decomposition_proposal.version: V2` while the execution graph contains only the already-existing ROOT provider issue. Proposed responsibilities use stable `id` values, not invented child issue refs. Before any child issue is created, `decompose-check` requires both decomposition modes to be `ENFORCED` and validates: parent-claim coverage, semantic PRODUCT units (3–8), explicit anti-mechanism exceptions, claim-weight conservation, size/write/dependency topology and acceptance methods. A RELEASEABLE report exposes the exact `proposal_digest`. Provider bindings are valid only when `released_proposal_digest` matches that exact proposal and the materialized leaf preserves responsibility identity, claim ownership, unit contract, dependency topology and programme weight. Child creation/binding earns zero progress. Historical graphs without proposal-v2 retain the existing node/ref path unchanged.

For proposal-v2, schema/script/test/workflow/CI/checkpoint/PR steps are **acceptance or implementation methods**, not progress-bearing semantic units. A PRODUCT proposal unit is explicitly `SEMANTIC`; GATE and MECHANICAL units are separately classified. Mechanism-shaped PRODUCT boundaries are blocked unless an owned SEMANTIC parent claim explicitly permits an infrastructure/verification exception and the proposal records the exception basis.

`graph-diff` rejects a re-plan (split, merge, reweight, drop) that moves any unit's exact programme share without a covering, authorised, append-only `plan_updates` entry. The gate never moves a percentage.

**Materialization.** Unknown is never published as zero. A leaf the provider shows work for (an open, merged or closed pull request, or a `candidate_ref` branch ahead of `programme.base_ref`) but whose ledger has no accepted facts is `UNMATERIALIZED` 🟡; its ancestors say their numbers are a lower bound; a continuation answers `MATERIALIZE_FACTS` — publish facts for exactly what current evidence supports (completion is never inferred from a merge). Publish a first facts block at START so a new leaf is never unmaterialized. A live `sync-github` only writes to the repository the plan declares in `programme.repository`; the shipped examples declare `example/delp-demo`.

**Handover frontier.** A handover is the predecessor's view at one instant, never current truth, and must carry no hand-computed number. `frontier` derives it (provider-observed base, candidate and divergence; derived state, exact `P/E`, evidence health; input digests) and `frontier-verify` checks a handed-over snapshot against live truth: any moved input (`BASE`, `CANDIDATE_HEAD`, `PR_STATE`, `LIVENESS`, `FACTS`, `PLAN`) exits 2 with `RECONCILE`. Every `CONTINUE CHECKPOINT` carries a `FRONTIER:` line.

**Agent health.** Health is observed or derived, never declared (a dead or looping executor cannot report it). With `programme.health_policy.mode: ADVISORY`, started leaves carry a `health` block of seven components (`materialization`, `evidence`, `checkpoint_distance`, `size`, `base_drift`, `interruptions`, `liveness`) using the programme's own written thresholds (250 / 500 lines, the third stream loss); the verdict is the worst component, `UNOBSERVED` is never healthy, and it is advisory: it never moves a number, state, title or admission answer. Telemetry constrains delivery; it does not measure value. `delp_projection_v32.py health` prints it; each `CONTINUE CHECKPOINT` carries a `HEALTH:` line.

This section is an Owner-directed amendment of the V3.2 tree (see the contract's "Amendment of V3.2" and `skills/Local_PR_Deliverty_v1.1/integration/frozen-v32-amendments.yaml`); it does not otherwise unfreeze V3.2.

## Checkpoint-before-continue — write-ahead continuity barrier

V3.2 now distinguishes ordinary passive frontier lag from a **checkpoint threshold**. Passive material-ahead state may still exist during uninterrupted work, but once a checkpoint threshold is crossed the executor must bound interruption loss before beginning another substantial work unit.

Normative invariant:

> When the material, semantic, evidence, or investigation frontier crosses a checkpoint threshold, the executor MUST reconcile current truth, refresh the responsibility snapshot, synchronize the configured GitHub projection, verify provider readback where required, and surface the checkpoint to the Owner in chat before beginning the next substantial work unit.

This is write-ahead continuity discipline. It is not an approval gate and does not award P/E.

### Checkpoint threshold — semantic/evidence movement

Checkpoint before continuing when any of the following becomes true:

- a declared implementation unit becomes complete;
- P or E legitimately changes;
- a root cause, blocker, architecture decision, or finding is established and changes the next action;
- a material hypothesis is eliminated and the negative knowledge would materially help a successor;
- a finding is resolved in a way that changes the material or validation frontier;
- the candidate/material head changes in a way that would increase recovery distance;
- a focused validation, benchmark, browser/runtime check, or external-oracle batch completes and materially changes engineering knowledge.

When semantic/evidence truth advanced, use the existing publication family:

```text
TASK_EVIDENCE — CHECKPOINT
```

A checkpoint evidence record should identify, as applicable (as facts — `P / E` and the activity epoch are rendered by the DELP projector from `CHECKPOINT_FACTS_V1`, never authored by the agent):

```text
RESPONSIBILITY
CURRENT_UNIT
CANDIDATE (the exact commit the evidence covers)
MATERIAL_FRONTIER
SEMANTIC_EVIDENCE_FRONTIER
COMPLETED_UNITS
NEW_FINDINGS / RESOLVED_FINDINGS
NEGATIVE_KNOWLEDGE
VALIDATION_RESULT
NEXT_SUBSTANTIAL_WORK_UNIT
```

Durable provider publication is required when the checkpoint contains successor-relevant semantic/evidence truth that would otherwise be lost in a stream/session failure.

### Checkpoint threshold — substantial activity without semantic completion

Substantial investigation may prove liveness without earning progress. The following are default checkpoint triggers unless a project-specific profile chooses stricter thresholds:

```text
READ/RECONSTRUCTION
- >= 3000 NEW substantive source/document lines inspected; OR
- >= 8 NEW meaningful files inspected; OR
- one complete subsystem/interface boundary reconstructed.

CODE/EDIT ACTIVITY
- >= 250 newly authored reviewable lines; OR
- >= 400 materially modified reviewable lines.

HARD CHECKPOINT CEILING
- >= 500 newly authored reviewable lines; OR
- >= 700 materially modified reviewable lines.
```

Repeatedly rereading the same material, rerunning the same unchanged failing test, generic tool calls, token generation, comments, or elapsed time do not renew meaningful activity by themselves.

An activity-only checkpoint:

- increments `ACTIVITY_EPOCH`;
- refreshes current-state / title projection;
- records what materially new work was observed;
- leaves P and E unchanged unless declared units independently satisfy progress semantics;
- need not create a new durable GitHub issue comment if no successor-relevant semantic/evidence frontier advanced;
- MUST still be mirrored to the Owner in chat before the executor begins the next substantial work unit when `CHECKPOINT_VISIBILITY_MODE=OWNER_REQUIRED`.

### Pre-risk checkpoint

Before starting a higher interruption/latency-risk operation, an executor with meaningful uncheckpointed state MUST checkpoint first. Examples include:

```text
long test or benchmark suite
browser automation
large build or static analysis
external-service/oracle invocation
large repository traversal
generation of a large patch
branch switch / rebase / history rewrite
provider mutation that changes issue/PR/branch state
other operations known to be stream/tool interruption-prone
```

The pre-risk checkpoint may be activity-only when no semantic unit has completed. Its purpose is to bound reconstruction distance.

### Checkpoint barrier order

For `CHECKPOINT_VISIBILITY_MODE=OWNER_REQUIRED`, perform this order before continuing:

```text
1. OBSERVE
   Observe exact live material/provider frontier.

2. RECONCILE
   Reconcile material, semantic/evidence, active unit, findings and negative knowledge.

3. PROJECT
   Recalculate P/E honestly and increment the activity epoch without manufacturing progress.

4. SYNC GITHUB
   Update the managed current-state surface and issue-title projection.

5. READ BACK
   Verify that the intended provider state is actually visible.

6. TASK EVIDENCE IN CHAT
   Surface a concise checkpoint to the Owner, including P/E, current unit,
   frontier, what changed, provider readback status, and next substantial work unit.

7. CONTINUE
   Only now begin the next substantial work unit.
```

If GitHub synchronization/readback fails in Owner-required mode, surface:

```text
WAITING_PROVIDER_VISIBILITY
```

and do not silently cross the checkpoint barrier. Owner may explicitly waive the visibility barrier for that responsibility; such a waiver affects observability only and never rewrites engineering truth.

### Chat checkpoint shape

The user-visible checkpoint should be compact and reconstructable, for example:

```text
TASK_EVIDENCE — CHECKPOINT
🟢 R:P18/E14 · A07 · ACTIVE          (rendered by the projector from CHECKPOINT_FACTS_V1; the agent supplies facts, not these numbers)
CURRENT_UNIT: qualification / persistence blocker reconstruction
COMPLETED: benchmark overlay path reconstructed; persistence blocker identified; audit test written
MATERIAL_FRONTIER: <sha / working-delta ref>
SEMANTIC_FRONTIER: <checkpoint ref>
GITHUB_PROJECTION: updated + read back
NEXT: create bounded repair branch and continue implementation
```

The chat checkpoint is a mirror for Owner visibility. It does not replace durable provider evidence when durable evidence is required.

## Liveness / motion projection

Progress, evidence, liveness, and motion are separate axes:

```text
P = semantic completion
E = successor-safe evidenced completion
A = valid activity/checkpoint epoch
L = derived liveness/motion state
```

Recommended provider projection states:

```text
🟢 ACTIVE   recent meaningful activity and recent frontier movement
🟡 QUIET    executor activity exists but frontier has not moved materially
🔴 STALE    external watcher observes an expired activity lease / missed checkpoints
🔵 WAITING  explicitly waiting on CI/tool/external dependency with a named wait condition
✅ COMPLETE responsibility has ended normally
```

A running executor may publish ACTIVE or WAITING from observed truth. A dead executor cannot mark itself STALE; reliable STALE detection therefore requires an external watcher or provider-side observer. One missed observation must not by itself prove death.

Do not manipulate P/E merely to show that an executor is alive. A stable P/E with advancing `A<n>` is a legitimate sign of active investigation.

## Material vs semantic/evidence frontier

V3.2 separates:

```text
MATERIAL_FRONTIER
SEMANTIC_EVIDENCE_FRONTIER
```

Material head should be observed from Git/owned PR. Semantic/evidence head comes from the latest durable task evidence that explains/proves the relevant responsibility frontier.

A material-ahead distance is reconstruction distance, not progress.

The derived frontier exposes:

```text
RECONCILIATION_NEEDED: true | false
```

This remains a passive discrepancy signal when no checkpoint threshold has been crossed. During uninterrupted work, material may legitimately run ahead of the latest evidence checkpoint for the current micro-unit; however, once a threshold above is crossed, the checkpoint-before-continue rule applies and the executor may not begin the next substantial work unit with that thresholded delta uncheckpointed.

Refresh Git frontier mechanically with:

```bash
python skills/engineering-pr-delivery-v3.2/scripts/continuity_projection.py observe-frontier \
  --snapshot relay/GENERATED/tasks/<issue>.continuity.json \
  --repo-root . \
  --output relay/GENERATED/tasks/<issue>.continuity.json
```

## Active recovery state

Recovery obligation is separate from passive frontier lag:

```text
RECOVERY_MODE: NONE | INTERRUPTED_EXECUTOR | FRONTIER_RECONCILIATION
RECOVERY_EVIDENCE_REQUIRED: true | false
```

A replacement executor that observes recovery-relevant unexplained frontier lag starts recovery explicitly:

```bash
python skills/engineering-pr-delivery-v3.2/scripts/continuity_projection.py recovery-start \
  --snapshot relay/GENERATED/tasks/<issue>.continuity.json \
  --mode FRONTIER_RECONCILIATION \
  --output relay/GENERATED/tasks/<issue>.continuity.json
```

That event changes state to `RECOVERING` and sets `RECOVERY_EVIDENCE_REQUIRED=true`. A same-lifecycle unexpected loss uses `stream-loss` and sets `RECOVERY_MODE=INTERRUPTED_EXECUTOR`.

Only durable `TASK_EVIDENCE — RECOVERY` provider readback clears the active evidence obligation and aligns the recovered semantic/evidence frontier.

## Abrupt interruption — fast recovery

Unexpected stream/session loss uses this first-line sequence:

```text
1. BASIS
   verify responsibility, PROTOCOL_REF, and Owner amendments.

2. LAST CHECKPOINT
   read the latest valid activity/semantic checkpoint and provider projection.

3. LIVE MATERIAL
   observe PR / branch / base / HEAD / relevant checks.

4. DELTA
   compare the last checkpoint semantic/evidence frontier to the material frontier.

5. RECONCILE
   validate active/pending work, assumptions, negative knowledge.

6. TASK_EVIDENCE — RECOVERY
   durably anchor reconstructed truth.

7. OWNER-VISIBLE READBACK
   synchronize/read back the current GitHub projection and mirror recovery evidence in chat.

8. CONTRIBUTE + CONTINUE
   resume useful engineering.
```

Full/deep reconstruction remains available when task identity, authority, programme dependencies, RLL/OFFLOAD state, negative knowledge, or material/provider state cannot be reconciled.

The recovery publication is required before the next material change after a detected recovery. This is semantic continuity discipline, not `relay_can` permission gating.

Checkpoint-before-continue is intended to keep the reconstruction delta bounded to the current uncheckpointed micro-unit rather than an entire lost executor session.

## Three consecutive stream losses

Within one executor lifecycle:

```text
loss 1 → recovery evidence
loss 2 → recovery evidence
loss 3 → recovery evidence + Plan for handover once
loss 4+ → recovery evidence only; no repeat auto trigger
```

A successor lifecycle resets the count/trigger.

This is continuity preparation, not an engineering failure or Owner-approval gate.

## Scoped task results

`TASK_RESULT` must make completion scope explicit:

```text
RESULT_SCOPE: STEP | PRODUCT | RESPONSIBILITY
COVERAGE: <declared coverage>
RESPONSIBILITY_COMPLETE: YES | NO | UNKNOWN
```

`RESPONSIBILITY_COMPLETE: YES` requires `RESULT_SCOPE: RESPONSIBILITY`.

Historical V3.1 results without this field are `UNKNOWN`, never guessed complete.

Provider issue closure and PR merge remain separate from responsibility completion.

## Owner decisions

Owner escalation is based on a genuine decision, not executor replacement or ordinary implementation learning.

Ask Owner when the proposed action changes intended outcome/acceptance, independently governed scope, a protected invariant intentionally, a destructive/irreversible choice, reserved merge/release/publication authority, or another explicitly reserved Owner decision.

Do not ask merely because an executor/session changed, implementation detail changed within accepted responsibility, tests/CI need investigation, a predecessor assumption was wrong, status/projection is stale, or provider title/comment sync failed.

A configured `CHECKPOINT_VISIBILITY_MODE=OWNER_REQUIRED` is itself an Owner observability requirement; inability to satisfy it is surfaced as `WAITING_PROVIDER_VISIBILITY`, not disguised as engineering failure.

## Compatibility posture

This V3.2 directory was forked from the exact V3.1 tree to preserve compatibility while the narrow slice is replayed.

- V3.1 historical records remain immutable.
- copied V3.1 scripts/schemas not touched by this slice remain compatibility baseline, not evidence that their ceremony is mandatory.
- V3.1 AGENT_STATUS remains readable as executor history.
- new responsibility current state is `FURTHER_TASK_SNAPSHOT`.
- old snapshots missing `PROTOCOL_REF` or recovery `mode` remain readable as UNKNOWN/NONE rather than fabricated provenance/recovery.
- old TASK_RESULT without explicit responsibility-complete maps to `UNKNOWN`.
- old snapshots without activity/checkpoint fields remain readable with unknown activity epoch/liveness; do not fabricate historical liveness.
- programme Handover / RLL / OFFLOAD contracts remain readable and are traversed only when relevant.
- missing V3.2 fields map to UNKNOWN rather than fabricated PASS/completion/authority.

## V3.2 exact-head CI

V3.2 candidate changes must have a dedicated hosted check that validates the candidate itself. The V3.1 workflow may legitimately report V3.2-only changes as `NOT_APPLICABLE`; that is not V3.2 acceptance evidence.

The dedicated workflow is `.github/workflows/engineering-pr-delivery-v3.2.yml`. It must remain scoped to V3.2 candidate paths, compile the V3.2 Python surface, and run the focused continuity/replay regressions that exercise this worth-gated slice.

Retired V2.5/V3 workflows must not be restored merely to create more green checks.

## Worth gate

No audit recommendation becomes permanent V3.2 behavior merely because it sounds cleaner.

Retain a change only when replay shows that it addresses an observed failure or recurring measurable operation, materially reduces affected-path protocol work or removes a demonstrated ambiguity/interruption, adds no more recurring ceremony than it removes, keeps clean-path overhead bounded, introduces zero periodic timer/heartbeat ceremony, preserves recorder/material/human-authority invariants, introduces no new Owner decision gate, and survives real/replayable cases. Event-gated checkpoints are permitted only when they materially bound reconstruction loss or improve Owner observability without manufacturing progress.

The principal replay cases are recorded in Common #483: #375/#379, #376, #377, plus the controlled #486/#487 cold-takeover drill. The interruption sequence described by the Owner on 2026-10-05 — multiple useful reconstruction/coding steps followed by stream/tool failure before a durable checkpoint — is an additional replay case for this checkpoint slice.

## Inherited baseline

All other files under this V3.2 tree were copied from the audited V3.1 tree at fork time. They remain available for compatibility and regression comparison.

Where inherited V3.1 prose conflicts with this V3.2 document **for the continuity/recovery/checkpoint slice above**, this document is normative for V3.2.

Where this document is silent, preserve the V3.1 recorder/material/acceptance invariant until a separately evidence-backed V3.2 change is implemented and validated.