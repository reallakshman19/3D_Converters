# Relay architecture preservation contract

This contract defines what Engineering Relay must preserve while its implementation is simplified.

It is intentionally smaller than the current file/projection/command surface. A mechanism is not architectural merely because it exists today. Optimisation may remove, merge, automate or regenerate implementation machinery as long as the invariants below remain true.

## Architectural purpose

Relay exists to preserve engineering continuity and bounded authority when actors, sessions, provider state or repository material change.

Its durable truth model is:

| Truth class | Durable source |
| --- | --- |
| Programme intent and sequencing | ROADMAP |
| Executable bounded intent | EP |
| Present lifecycle pointers | STATE |
| Current execution custody and bounded action authority | LEASE |
| Immutable accepted engineering truth | CHECKPOINT |
| Open action-specific restrictions / explicit Owner permissions | CONTROLS |
| Historical transitions | EVENTS |
| Returned external/helper evidence | immutable evidence receipts |

Generated snapshots, handover prose, provider projections, task/improvement views and status renderings are read models. They may improve comprehension but must not become independent authority.

## Preservation invariants

### P1 — Programme truth dominates execution continuity

At actor-change or next-work boundaries, a provider-backed EP may continue only if its governing parent remains part of the reconciled live programme frontier.

A locally ACTIVE EP is not sufficient evidence that the programme still wants that work.

### P2 — Action authorization remains action-specific

Relay must not collapse into one global readiness flag.

Execution, handover, delivery and Owner-authorized transitions retain distinct predicates. Coordination/projection freshness must not become an ordinary MATERIAL_WRITE blocker unless it is itself evidence of an execution-safety defect.

### P3 — Execution custody is exclusive and fenced

A material writer must be bound to the current EP/route/material basis and current custody epoch.

After handoff or recovery advances the epoch, a stale predecessor cannot mutate execution state using old custody.

Abandonment detection must not weaken that fence. Time-based recovery may shorten the operational takeover horizon only when liveness evidence says the predecessor has been inactive **and** the sensitive worktree has not moved since its last recorded activity. Stronger terminal-session evidence must be bound to the exact lease/executor/epoch. Ordinary liveness renewal may not rewrite lease authority or advance custody epochs.

### P4 — Scope and material drift are synchronous safety boundaries

Material writes remain constrained by EP write/protected scope and mechanically derived relevant/unknown drift.

DISJOINT coordination movement may proceed. RELEVANT or UNKNOWN material drift fails closed.

### P5 — Acceptance is exact and immutable

Accepted checkpoints remain bound to the exact EP and accepted material result. Generated views cannot create acceptance and later projections cannot rewrite prior accepted evidence.

Programme completion and checkpoint evidence coverage are separate facts:

- ROADMAP state determines programme completion;
- accepted checkpoints determine native evidence coverage.

### P6 — Owner delivery authority remains separate from execution authority

Execution custody, including OWNER_OVERRIDE execution, must never imply MERGE or RELEASE authority.

Intent-bearing programme changes and delivery authority require their own governing basis.

### P7 — Transaction interruption cannot fabricate authority or history

A partially applied multi-object mutation blocks authority until recovery.

Recovery may confirm a commit only when all targets match after-images, may roll back known before/after mixtures, and must refuse destructive automatic recovery when an externally changed target matches neither basis.

Byte-for-byte staged/backup payload is required only while recovery is still possible. Terminal transactions may discard those bytes once a compact durable receipt retains the command, actor, target paths, before/after digests, terminal status, applied set, timestamps, and recovery basis. Removing terminal payload must not reduce the ability to detect or recover an incomplete transaction.

### P8 — Handoff and recovery remain different facts

Successful handoff requires:

```text
HANDOVER_PLANNED -> HANDOVER_PUBLISHED -> HANDOVER_ACCEPTED
```

If the predecessor disappears without a valid published handover, successor continuation is recovery, not accepted handoff.

### P9 — External/helper evidence is durable

A later helper return may update a convenient latest-result projection but must not erase prior detailed returned evidence.

### P10 — Generated state is disposable

Deleting generated Relay views must not:

- invalidate durable authority;
- broaden or reduce synchronous action authorization;
- erase programme/custody/acceptance truth.

A zero-context successor must be able to rebuild the necessary read models from durable authority plus live provider observations required at the relevant boundary.

A frozen handover context may embed exact derived read-model values when later publication must use the same planned view. Embedding one frozen copy is preferable to persisting additional synchronized projection files; digest checks must still detect tampering.

Full conformance may report a missing expected generated projection until it is rebuilt; that is projection incompleteness, not loss of authority.

### P11 — Optimisation cannot silently broaden permission

For safety-critical actions, a simplified implementation must preserve the old deny/allow decision unless the changed behavior is an explicitly reviewed architectural correction.

Known coordination-only false blockers are not protected behavior.

## Executable proof

The preservation suite is intentionally scenario-oriented rather than tied to the current number of files.

Primary regression coverage includes:

- `test_architecture_preservation.py`
  - destructive deletion and reconstruction of generated state;
  - generated views cannot grant missing durable authority;
  - provider/read-model absence does not become MATERIAL_WRITE authority.
- `test_programme_reconciliation.py`
  - programme-parent classification and live frontier derivation.
- `test_handover_context.py` / `test_relay_completion.py`
  - stale parent continuation is rejected;
  - handoff requires plan, publish and successor acceptance;
  - recovery remains distinct;
  - five-minute inactivity takeover is fenced by current sensitive worktree evidence;
  - exact terminal-session evidence can permit immediate recovery without weakening custody epochs;
  - governed current-executor activity renews liveness without heartbeat ceremony.
- `test_relay_can.py`
  - scope, drift, action authority and Owner delivery separation.
- `test_transactionlib.py`
  - crash recovery, mixed-state rollback and refusal to overwrite unknown external changes.
- `test_local_execution_contract.py`
  - immutable helper-return evidence.
- `test_snapshot_projection.py`
  - ROADMAP programme completion is distinct from checkpoint evidence coverage.

Future optimisation PRs should add or modify preservation scenarios before deleting a mechanism whose architectural role is uncertain.

## Deletion rule

A Relay mechanism is eligible for removal or derivation when all of the following hold:

1. no preservation invariant requires it as durable authority;
2. its useful information can be reconstructed from durable authority and required boundary observations;
3. deleting it does not change safety-critical authorization decisions;
4. the preservation suite remains green.

This deliberately permits aggressive removal of redundant generated views, transaction payload residue, migration/version ceremony and manual coordination steps while protecting the small durable safety/programme kernel.
