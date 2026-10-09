# Engineering Relay V3.1 authority model

Issue #418 defines the V3 architecture. This document records the V3-1 authority boundary implemented by the foundational schemas and validator.

## Design invariant

> Execution safety is synchronous. Handover quality is deterministically derivable. Delivery synchronization may be eventually consistent until the requested delivery action requires it.

V3 preserves handoff by concentrating truth rather than multiplying receipts.

## Durable authority

| Object | Authority |
| --- | --- |
| Roadmap | programme intent, outcome, dependencies, sequencing |
| `EP-*` | executable intent, scope, semantic dependencies, acceptance |
| `STATE.yaml` | minimal present pointers and lifecycle |
| `LEASE-*` | present execution ownership and bounded action authority |
| `CP-*` | immutable accepted engineering result and successor capsule |
| `CONTROLS/controls.yaml` | unresolved action-specific restrictions |
| `EVENTS.jsonl` | append-only historical facts; never current authority |

## Derived views

`CURRENT_SNAPSHOT.yaml`, Owner status, technical status, handover prose, progress views and provider projections are read models. They never override durable authority.

`CURRENT_SNAPSHOT.yaml` MUST declare:

```yaml
authority: DERIVED_READ_MODEL
```

A snapshot/authority disagreement is a validation failure; the snapshot never wins.

## Intent, authority, accepted truth, history

Every authoritative field should fit one of four categories:

```text
intent          -> roadmap / EP
present authority -> STATE / LEASE / CONTROL
accepted truth  -> CHECKPOINT
history         -> EVENTS
```

If a value is primarily explanation, presentation, percentage, handover prose, provider projection or status reporting, it should normally be generated.

## V3-1 boundary

V3-1 establishes:
- strict schemas for STATE, EP, LEASE, CHECKPOINT, CONTROLS, EVENT and CURRENT_SNAPSHOT;
- the stable action vocabulary used by leases and controls;
- explicit Owner-override lease structure without fabricated normal certification;
- risk-routed EP quality policy;
- mandatory checkpoint handoff capsule;
- strict generated-snapshot non-authority;
- a cross-object validator that checks STATE references, active lease binding, control contradictions, event validity, and snapshot/authority agreement.

V3-1 does **not** yet implement `relay.can(action)`, material/coordination basis classification, transactional relay mutations, provider delivery, or V2.5 migration. Those belong to later #418 work packages.

## Compatibility posture

V3 is additive during migration. V2.5 remains the live/default relay until a later #418 phase explicitly changes that status.

Owner-facing command vocabulary and the standalone five-prompt handover protocol are compatibility requirements; V3 storage changes must not redefine them.
