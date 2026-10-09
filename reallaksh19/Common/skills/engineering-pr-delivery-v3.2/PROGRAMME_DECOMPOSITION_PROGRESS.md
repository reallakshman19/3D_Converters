# Engineering Relay V3.2 — programme decomposition and progress denominator

> **Implementation status (DELP).** The progress/title projection and the rule that executors report facts but never author percentages or titles are now implemented and mechanically enforced by `operating-model/durable-execution-lineage-projection-v32.md` (`scripts/delp_projection_v32.py`, `schemas/delp-*-v32.schema.yaml`, `tests/test_delp_projection_v32.py`). Where this document shows an older title form, the DELP grammar governs. The rest of this document keeps its existing status.

## Normative status

This file is a normative addendum for the V3.2 planning/progress slice on this candidate branch.

It does not change the core rule that V3.2 progress is denominator-based. It defines how a Coordinator-governed programme/phase decomposition supplies a stable denominator to nested engineering responsibilities and how progress rolls up without allowing executor guesswork, split gaming, or liveness to manufacture completion.

Where this file conflicts with ad-hoc percentage estimates, issue-count percentages, LOC-derived percentages, or executor self-estimates, this file controls for this slice.

## Governing invariant

> **The Coordinator owns the declared denominator; executors own evidence against that denominator. Progress is never guessed by the executor. Parent and Phase percentages are deterministic roll-ups of planned weights and current valid evidence. Splits conserve weight, progressive decomposition consumes reserved weight, genuine scope expansion changes the denominator explicitly, and liveness/status remains independent from percentage completion.**

## Three progress levels

Use distinct progress semantics at each layer:

```text
PRD / COMMENT BLOCK
  P = nested engineering semantic progress
  E = evidenced nested engineering progress

PHASE ISSUE
  D = Local delivery progress across PRDs + phase acceptance/integration
  E = evidenced delivery progress

PARENT / PROGRAMME ISSUE
  D = weighted roll-up of phase delivery progress
  E = weighted roll-up of phase evidenced progress
```

A nested Coder `P=100%` MUST NOT imply the Local responsibility, Phase, or Programme is complete.

## Programme Decomposition Manifest

Before production release, the Coordinator SHOULD establish a machine-readable decomposition manifest containing at minimum:

```yaml
programme:
  id: <stable programme id>
  parent_issue: <provider ref>
  owner_basis_ref: <ref>
  coordinator_principal: <principal>
  local_protocol_ref: <exact ref>
  engineering_protocol_ref: <exact ref>
  acceptance_epoch: <id>
  project_protocol_ref: <ref>
  project_protocol_digest: <digest>

  progress_model:
    total_weight: 10000

  phases:
    - id: PHASE-A
      issue: <ref>
      weight: <integer>
```

For a fixed-denominator programme:

```text
sum(phase.weight) = programme.progress_model.total_weight
```

`10000` is a recommended convenient basis-point denominator, not a mandatory literal value.

## Phase Manifest

Each Phase issue SHOULD have a machine-readable Phase Manifest:

```yaml
phase:
  id: PHASE-C
  programme: <programme id>
  issue: <provider ref>
  coordinator: <principal>
  outcome: <one bounded phase outcome>

  entrance_conditions: [...]
  exit_conditions: [...]
  dependencies: [...]

  weight: 2200

  delivery_pools:
    responsibility_delivery: 1900
    phase_integration: 200
    phase_qualification: 100

  responsibilities:
    - PRD-C01
    - PRD-C02
    - PRD-C03

  undecomposed_reserve_weight: <integer>
```

Invariant:

```text
allocated responsibility weights
+ undecomposed reserve
+ phase integration/qualification weights
= phase weight
```

A Phase cannot claim 100% merely because all currently instantiated COMMENT BLOCKs are complete while reserve or phase-level gates remain unresolved.

## Responsibility Block / PRD schema

Each responsibility SHOULD declare:

```yaml
responsibility:
  id: PRD-<stable-id>
  phase: PHASE-C

  representation:
    kind: COMMENT_BLOCK | SINGLE_ISSUE | CONTINUATION
    issue: <container ref>
    block: <stable block id>
    spec_comment_ref: <ref>

  outcome: <single coherent engineering outcome>
  dependencies: [...]
  write_surface: [...]

  size_budget:
    target_minutes: 15
    hard_minutes: 20
    target_reviewable_loc: 700
    hard_reviewable_loc: 1500

  progress_weight: <integer>

  acceptance_profile:
    ref: <ref>
    digest: <digest>

  nested_engineering_responsibility:
    id: ENG-PRD-<id>-CODER
```

## Semantic implementation units

Nested engineering progress MUST be based on declared semantic units, not LOC, elapsed time, commits, tool calls, tests executed, or model confidence.

Example:

```yaml
implementation_units:
  - id: U1
    outcome: constraint candidate model
    weight: 25
  - id: U2
    outcome: candidate ranking implementation
    weight: 35
  - id: U3
    outcome: grammar-aware rejection
    weight: 20
  - id: U4
    outcome: focused deterministic tests
    weight: 20
```

Invariant:

```text
sum(unit.weight) = 100
```

Then:

```text
P = completed semantic-unit weight / declared semantic-unit weight
E = completed semantic-unit weight with current successor-safe evidence / declared semantic-unit weight
```

Executors report unit state and evidence. They do not manually choose the displayed percentage.

## Local delivery denominator for one PRD

Coder progress is only part of Local delivery. A PRD SHOULD also define delivery units for Reviewer, Super Reviewer and final handoff/binding.

Recommended default when a project-specific acceptance profile does not provide better weights:

```text
CODER semantic units      60
REVIEWER acceptance       20
SUPER REVIEW              15
FINAL handoff/binding      5
                         ---
                         100
```

Where practical, Reviewer/Super Reviewer weights SHOULD instead be derived from explicit required acceptance methods in the pinned Acceptance Profile.

Thus:

```text
Coder P100/E100
Reviewer not started
Super Review not started
```

must not project Local delivery `D100`.

## Split conservation

A `RESPONSIBILITY_SPLIT` MUST conserve the source responsibility's programme/phase weight.

Example:

```text
C03 weight 300
  -> C03A weight 100
  -> C03B weight 120
  -> C03C weight 80
```

Validator requirement:

```text
sum(successor weights) = source weight
```

A split, replacement executor, replacement PR, retry, acceptance replay, or same-stage fresh attempt does not increase the denominator.

The source responsibility becomes an immutable historical record such as `SUPERSEDED_BY_SPLIT`; its weight is carried by its successors and is not double-counted.

## Progressive decomposition and reserve

The Coordinator is not required to fully micro-specify every future Responsibility Block at programme start. Use explicit `UNDECOMPOSED_RESERVE` weight.

Example:

```text
Phase C weight = 2200
C01 = 300
C02 = 250
C03 = 300
phase integration/qualification = 300
reserve = 1050
```

Later wave planning consumes reserve without changing the denominator:

```text
reserve 1050
 -> C04 300
 -> C05 300
 -> C06 250
 -> reserve 200
```

Reserve is unfinished delivery work. It contributes zero completion until allocated/dispositioned under the governing plan.

## Genuine scope expansion

A true new scope discovery is not a split and MUST NOT silently consume unrelated existing weight if doing so would misrepresent the original plan.

Use an explicit `PLAN_UPDATE — SCOPE_EXPANSION` or equivalent governed event.

The Coordinator must record:

```text
old denominator
new scope
newly allocated weight
new denominator
reason
Owner/authority basis when required
```

A legitimate denominator expansion may reduce displayed percentages. That is truthful and MUST NOT be hidden by renormalizing completed work to preserve a previous percentage.

## Mechanical/generated delta classification

Responsibility-size and progress semantics SHOULD distinguish:

```text
SEMANTIC_DELTA
MECHANICAL_DELTA
GENERATED_DELTA
```

A large deterministic tree copy or generated artifact may exceed ordinary LOC budgets while containing little or no semantic work.

Such a migration SHOULD be isolated as a dedicated mechanical responsibility with reproducibility/equality proof, while semantic changes remain in a separately reviewable bounded responsibility.

Mechanical/generated LOC MUST NOT itself create progress.

## Checkpoint thresholds are not split thresholds

Keep these separate:

```text
CHECKPOINT THRESHOLD
  bounds transient recovery distance inside one PRD

RESPONSIBILITY SPLIT THRESHOLD
  bounds total responsibility size
```

Recommended checkpoint triggers from the checkpoint/liveness contract remain event-driven, including approximately:

```text
>=3000 NEW substantive lines reconstructed
>=250 newly authored reviewable LOC
>=400 materially modified reviewable LOC
semantic/evidence frontier movement
pre-risk operation
```

Recommended hard checkpoint ceilings:

```text
>=500 newly authored reviewable LOC
>=700 materially modified reviewable LOC
```

These force checkpointing, not automatic creation of a new PRD.

Cumulative PRD limits such as `>20 active Coder minutes` or `>1500 reviewable semantic LOC` cause `SPLIT_REMAINDER` / `SPLIT_REQUIRED` unless an explicit governed exception applies.

Replacement executors do not reset cumulative responsibility-size usage.

## Reviewer bounded-repair envelope

To prevent a small Coder responsibility from hiding a second large implementation inside review, projects SHOULD define Reviewer repair budgets.

Recommended starting profile:

```text
TARGET: <=5 active min, <=150 reviewable LOC
HARD:   <=10 active min, <=300 reviewable LOC
```

A larger discovered repair becomes a governed material-scope change or successor repair responsibility rather than silent extended Reviewer coding.

## Parallel write-surface safety

Before releasing concurrent PRDs, the Phase Coordinator SHOULD compare declared `write_surface` values.

Conflicting write surfaces require one of:

```text
SERIALIZE
DECLARE DEPENDENCY
ISOLATE/PROVE SAFE INTEGRATION STRATEGY
```

Parallelism is permitted by independent responsibility/workspace topology, not merely by having multiple executors available.

## Deterministic phase roll-up

For a Phase:

```text
phase_D = sum(component_weight * component_delivery_fraction) / phase_weight
phase_E = sum(component_weight * component_evidenced_fraction) / phase_weight
```

`component` includes instantiated PRDs, reserve, phase-integration units and phase-qualification units.

Reserve contributes zero until legitimately allocated/dispositioned.

## Deterministic programme roll-up

For a Programme:

```text
programme_D = sum(phase_weight * phase_D) / total_programme_weight
programme_E = sum(phase_weight * phase_E) / total_programme_weight
```

Do not calculate programme progress from issue count, PR count, commit count, elapsed time, LOC, executor count, or equal-weight phase averaging unless equal weights were explicitly adopted in the manifest.

## Liveness/status is orthogonal to progress

Traffic-light status MUST NOT be inferred from percentage completion.

Recommended states remain:

```text
🟢 ACTIVE
🟡 QUIET / POSSIBLE_SPINNING
🔵 WAITING
🔴 STALE
✅ COMPLETE
```

A task may be `D15% 🟢` and healthy or `D88% 🔴` and abandoned.

Critical-path metadata SHOULD influence Phase/Programme status roll-up.

Example:

```yaml
dependency:
  from: C03
  to: C05
  class: HARD
  critical_path: true
```

Recommended aggregate severity:

```text
RED    if a critical-path PRD/Coordinator is STALE or a critical dependency is irrecoverably blocked
YELLOW if critical-path work is QUIET/SPINNING or a noncritical responsibility is STALE
BLUE   if no red/yellow exists but critical path is legitimately WAITING
GREEN  otherwise while work is active
COMPLETE only after delivery/acceptance completion semantics are satisfied
```

Do not average colors.

## Title projection

Implemented by the DELP projector (`operating-model/durable-execution-lineage-projection-v32.md`); these grammars supersede the earlier brace forms.

Responsibility (leaf) title:

```text
🟢 [#527 › #588 › #592 → PR#593] R:P60/E45 · U3 · ACTIVE — <responsibility title>
```

Phase (intermediate) title:

```text
🟡 [#527 › #588 → #592/PR#593] Φ:D43/E36 · F4 · EVIDENCE_GAP — <phase title>
```

Programme (root) title:

```text
🟡 [#527] Π:D28/E22 · F6 · EVIDENCE_GAP — <programme title>
```

Titles are disposable read models, generated from the execution graph (this manifest in machine-readable form), `CHECKPOINT_FACTS_V1` and observed material truth, never typed by an executor. The manifests/evidence are authority for reconstruction. The per-colour issue counts of the earlier form are replaced by the frontier count `F` and the derived state word; colours are still never averaged.

## Claim-first Responsibility Decomposition Gate

For every **new** programme decomposition, responsibility topology is derived from parent outcome claims before files, workflows, CI lanes or evidence mechanics are assigned.

Required order:

```text
PARENT OUTCOME
  -> falsifiable acceptance claims
  -> independently governable responsibility partition
  -> parent-claim coverage proof
  -> leaf independence proof
  -> implementation/evidence/write surfaces
  -> child materialization
```

The execution graph represents this with:

```yaml
programme:
  acceptance_claims:
    - {id: PA1, claim: learner constructs the reusable model, kind: SEMANTIC}
    - {id: PG1, claim: exact-head integration is qualified, kind: DELIVERY_GATE}
  decomposition_policy:
    mode: ENFORCED
    claim_first: {mode: ENFORCED, require_independence_basis: true}

nodes:
  - kind: LEAF
    work_class: PRODUCT
    owns_claims: [PA1]
    independence_basis: can receive RESPONSIBILITY_COMPLETE YES/NO from its own artifact and oracle
```

Rules:
- every parent acceptance claim is owned by at least one leaf;
- every leaf owns at least one declared parent claim;
- duplicate ownership is a blocker unless that claim explicitly sets `shared: true`;
- every `PRODUCT` leaf owns at least one `SEMANTIC` claim;
- every claim-first leaf states why it can be independently accepted/rejected;
- browser, tests, evidence, workflow, migration and handoff mechanics normally live inside acceptance methods or explicit `GATE` leaves rather than defining PRODUCT responsibility boundaries;
- child issues MUST NOT be materialized until the claim-first gate is RELEASEABLE.

Historical V3.2 graphs without the claim fields remain readable; the compatibility default is `claim_first.mode: OFF`. That compatibility default is not permission for a new programme to omit the gate.

## Pre-materialization claim-first proposal (V2)

For a new programme, **do not create child issues merely to obtain refs for the decomposition graph**. Use the proposal layer first:

```yaml
programme:
  root: Common#<existing-parent>
  total_weight: 100
  acceptance_claims:
    - id: PA1
      claim: <falsifiable semantic parent outcome>
      kind: SEMANTIC
      weight: 90
    - id: PG1
      claim: <delivery qualification>
      kind: DELIVERY_GATE
      weight: 10
  decomposition_policy:
    mode: ENFORCED
    claim_first:
      mode: ENFORCED
      require_independence_basis: true
  decomposition_proposal:
    version: V2
    responsibilities:
      - id: R1
        work_class: PRODUCT
        owns_claims: [PA1]
        claim_allocations: [{claim_id: PA1, weight: 90}]
        outcome: <one independently decidable semantic outcome>
        independence_basis: <why YES/NO does not require siblings>
        semantic_units:
          - {id: S1, kind: SEMANTIC, weight: 34, outcome: <semantic slice>, verify: <oracle>}
          - {id: S2, kind: SEMANTIC, weight: 33, outcome: <semantic slice>, verify: <oracle>}
          - {id: S3, kind: SEMANTIC, weight: 33, outcome: <semantic slice>, verify: <oracle>}
        size_budget: {target_loc: 300, hard_loc: 600, target_minutes: 10, hard_minutes: 20}
        write_surface: [src/example/]
        acceptance_methods: [semantic oracle, exact-head regression]
```

At this stage the graph may contain only the ROOT node. Proposed responsibilities have **no provider refs**.

The release order is:

```text
parent claims
 -> proposed responsibility ids
 -> coverage + independence
 -> semantic units
 -> claim-weight allocation
 -> implementation/acceptance metadata
 -> anti-mechanism + collision/dependency checks
 -> decompose-check RELEASEABLE
 -> record exact proposal_digest
 -> create provider children
 -> bind responsibility_id -> provider ref with released_proposal_digest
```

Binding is rejected if the proposal was not RELEASEABLE, if its digest changed, or if the materialized leaf changes semantic identity, claims, unit contract, write surface, size budget, dependency topology or programme weight. Binding itself earns no P/E/D progress.

Historical execution graphs without `decomposition_proposal` remain on the existing materialized-node path.

## Decomposition Validation Gate

Before first production release, the Coordinator SHOULD produce a machine-verifiable decomposition quality result proving at least:

```text
PROGRAMME
- parent outcome defined
- phase scope covers declared programme scope
- phase weights fully allocate denominator
- no unexplained unallocated scope

PHASE
- outcome, entrance/exit criteria and dependencies declared
- Coordinator identity declared
- phase integration/qualification budget declared
- responsibility + reserve weight conservation holds

RESPONSIBILITY
- stable PRD identity
- bounded outcome
- size-budget estimate present
- write surface declared
- acceptance profile resolvable
- semantic implementation units declared
- dependencies valid/acyclic
- parallel write collisions classified

ACCEPTANCE
- project protocol pinned
- Reviewer/Super Reviewer methods resolvable
- external gates represented where required

PROGRESS
- denominator completely allocated
- split conservation enabled
- reserve represented
- no progress from elapsed time/LOC/activity alone

OBSERVABILITY
- title projection configured
- checkpoint/liveness projection configured
- watcher availability recorded truthfully
```

Suggested result:

```text
DECOMPOSITION_QUALITY_REPORT
PLAN_STATE: RELEASEABLE | NOT_RELEASEABLE
```

## Projection engine

Percentage calculation SHOULD be deterministic code, not LLM arithmetic.

Conceptual flow:

```text
Programme manifest
+ Phase manifests
+ Responsibility blocks
+ Acceptance profiles
+ TASK_EVIDENCE/current validity
+ activity leases
+ provider state
        |
        v
progress projection engine
        |
        +-- PRD P/E/D
        +-- Phase D/E/status
        +-- Programme D/E/status
        +-- issue-title projections
        `-- managed current-state tables
```

Executors generate structured state/evidence. The projection engine generates percentages/status.

## Executor-lifetime rule

A short-lived executor epoch SHOULD normally own exactly one Production Responsibility.

```text
PRD
 -> fresh executor/context
 -> checkpoints
 -> scoped TASK_RESULT / handoff
 -> executor epoch ends
```

The Phase Coordinator remains the longer-lived contextual owner across multiple PRDs. Reusing the same underlying model is permitted, but carrying one unbounded transient executor context across multiple PRDs defeats isolation and recovery goals.

## Governing anti-drift rules

Reject or flag projections/plans that:

- let an executor manually choose P/E/D percentages;
- equate Coder P100 with Local/Phase/Programme complete;
- change percentage merely by splitting or merging work;
- omit undecomposed reserve while substantial future scope is known;
- silently expand scope without denominator change;
- derive completion from LOC/time/commits/issues/PR count;
- let replacement executors reset responsibility-size budgets;
- average traffic-light colors without critical-path semantics;
- permit Phase 100 while unresolved reserve/integration/qualification remains;
- use a 35k-line mechanical copy as ordinary semantic authored progress.
