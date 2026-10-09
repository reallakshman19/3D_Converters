# Engineering Relay V3.2 — Owner checkpoint projection

> **Implementation status (DELP).** The progress/title projection and the rule that executors report facts but never author percentages or titles are now implemented and mechanically enforced by `operating-model/durable-execution-lineage-projection-v32.md` (`scripts/delp_projection_v32.py`, `schemas/delp-*-v32.schema.yaml`, `tests/test_delp_projection_v32.py`). Where this document shows an older title form, the DELP grammar governs. The rest of this document keeps its existing status.

## Normative status

This file is a normative addendum for the V3.2 checkpoint/liveness slice on this candidate branch.

Where an Owner-facing checkpoint example in `SKILL.md` conflicts with this file, **this file controls the Owner-facing projection shape**. Durable `TASK_EVIDENCE`, recovery evidence, P/E semantics, material truth, and all other V3.2 authority boundaries remain governed by `SKILL.md`.

The purpose is to prevent successor-grade durable evidence from being dumped verbatim into the Owner chat surface.

## Three distinct views

The same engineering state has three audiences and MUST NOT be rendered as one giant message.

```text
1. GITHUB TITLE
   glanceable operational projection

2. OWNER CHAT CHECKPOINT
   compact delta / blocker / next-action projection

3. DURABLE TASK_EVIDENCE
   detailed successor and recovery truth
```

These surfaces may reference one another, but they have different information budgets.

## 1. GitHub title projection

Generated shape (DELP — `operating-model/durable-execution-lineage-projection-v32.md`):

```text
🟢 [#527 › #588 › #592 → PR#593] R:P42/E36 · U03 · ACTIVE — <responsibility>
```

The title is **generated, never authored**: lineage (`›` ownership, `→` the PR), scoped semantic/evidence progress (`R:` leaf, `Φ:` phase, `Π:` programme), the current unit (leaf) or frontier count `F<n>` (ancestors), and compact work state. It is written only by the DELP runner from `CHECKPOINT_FACTS_V1`, the execution graph and observed material truth; this grammar supersedes the earlier `{P · E · A · U · STATE}` form, and the activity epoch `A<n>` moved to `LIVE_STATUS_V1`. It MUST NOT become a detailed evidence store.

## 2. Owner chat checkpoint

### Governing rule

The Owner chat checkpoint answers:

> **What changed since the last checkpoint, what is blocking now, does the Owner need to act, and what happens next?**

It does **not** answer:

> What is every exact provider/material fact currently known?

The chat checkpoint is a projection of durable evidence, not a duplicate of it.

### Required shape

Use:

```text
TASK_EVIDENCE — CHECKPOINT
🟢/🟡/🔵/🔴 R:P__/E__ · A__ · <STATE>      (rendered by the projector; the agent supplies facts, not these numbers)
UNIT: <one concise line>
DELTA: ✓ <new result>; ✓ <new result>; △ <decision-relevant unresolved finding, optional>
BLOCKER: <NONE | one concise blocking condition>
OWNER_ACTION: <NONE | REQUIRED — one explicit decision/action>
NEXT: <one bounded next substantial work unit>
EVIDENCE: <1–3 durable refs>
```

### Hard information budget

Unless the Owner explicitly requests detail, the checkpoint SHOULD remain within:

```text
<= 12 non-blank content lines
<= 3 DELTA items
<= 1 BLOCKER
<= 1 OWNER_ACTION
<= 1 NEXT
<= 3 EVIDENCE references
```

The objective is glanceable operational truth, not prose completeness.

### Delta-only rule

Do not repeat unchanged facts merely because they remain true.

The following normally belong in durable evidence/current-state records, **not every chat checkpoint**:

```text
unchanged base/main SHA
unchanged branch name
unchanged PR draft/open/merge state
provider blob digest
full changed-file inventory
file-count statistics
full dependency closure
complete remaining denominator
historical evidence already linked
all test names still pending
exact command transcript
```

Include one of those only when it changed since the previous checkpoint or is necessary to understand the current delta/blocker/Owner action.

### Durable-ref rule

If detailed truth is already durable on GitHub, prefer:

```text
✓ TEXPECTED lower-bound contract PASS — evidence: #1239/5992101466
```

over re-explaining the full contract semantics in chat.

The durable record carries the detailed method, hashes, commands, closure and reasoning.

## 3. Durable TASK_EVIDENCE

Durable provider evidence remains successor-grade and MAY contain the details intentionally omitted from Owner chat, including:

- exact protocol/source refs;
- exact candidate/base/material heads;
- blob/tree/digest identities;
- changed files and material delta;
- test commands and exact results;
- dependency closure and negative knowledge;
- detailed findings and repair rationale;
- remaining declared denominator;
- provider state required for recovery;
- evidence invalidation/replay facts.

Compact chat does not reduce durable evidence quality.

## Checkpoint is not TASK_RESULT

A checkpoint MUST NOT be labelled `TASK_RESULT` merely because the current unit is blocked or waiting.

Use checkpoint/current-state vocabulary such as:

```text
ACTIVE
QUIET
WAITING_CI
WAITING_TOOL
WAITING_EXTERNAL
WAITING_PROVIDER_VISIBILITY
RECOVERING
```

`TASK_RESULT` is reserved for a real scoped result boundary with the V3.2 result fields:

```text
RESULT_SCOPE: STEP | PRODUCT | RESPONSIBILITY
RESPONSIBILITY_COMPLETE: YES | NO | UNKNOWN
```

A responsibility with more intended engineering work remaining does not become a final `TASK_RESULT = BLOCKED` simply to report an operational checkpoint.

## OWNER_ACTION semantics

Every Owner-facing checkpoint MUST explicitly say whether Owner action is required.

Examples:

```text
OWNER_ACTION: NONE
```

or:

```text
OWNER_ACTION: REQUIRED — choose whether to relax protected acceptance criterion X
```

`WAITING_EXTERNAL`, `WAITING_CI`, or `QUIET` do not by themselves imply Owner action.

Do not ask the Owner to intervene for ordinary executor recovery, investigation, implementation learning, or provider delay unless the governing protocol reserves that decision to the Owner.

## Barrier order

For `CHECKPOINT_VISIBILITY_MODE=OWNER_REQUIRED`:

```text
1. observe exact material/provider frontier
2. reconcile P/E/A and current unit
3. write detailed durable evidence when semantic/evidence truth advanced
4. update GitHub current-state/title projection
5. read back GitHub state
6. emit the compact Owner chat checkpoint defined here
7. only then start the next substantial work unit
```

The chat checkpoint MAY link the durable evidence created in step 3; it SHOULD NOT reproduce it.

## Example

Preferred Owner projection:

```text
TASK_EVIDENCE — CHECKPOINT
🟡 R:P42/E36 · A07 · WAITING_EXTERNAL
UNIT: Full-stack qualification of #1239 cumulative candidate.
DELTA: ✓ #1252 import defect isolated in draft #1253 (`ea2556d`); ✓ persistence contract PASS; ✓ TEXPECTED lower-bound PASS.
BLOCKER: Executable authenticated checkout / Node `@playwright/test` unavailable for browser + full-regression qualification.
OWNER_ACTION: NONE
NEXT: Restore executable checkout/test surface, then resume retained browser/full qualification.
EVIDENCE: #1239/5992101466 · #1239/5990185563 · PR #1253
```

The durable evidence may still record the exact main SHA, provider blob, changed-file count, dependency hashes, full remaining qualification list and exact commands.

## Anti-noise requirements

Tests/replay for this contract SHOULD reject or flag Owner checkpoint renderings that:

- omit P/E/A when known;
- omit the current unit;
- omit `OWNER_ACTION`;
- repeat unchanged provider/base/PR facts without relevance;
- paste a full remaining denominator instead of one bounded NEXT action;
- use long explanatory paragraphs where a durable evidence reference already exists;
- call an in-progress/waiting checkpoint a final `TASK_RESULT`;
- hide the blocker below background prose;
- exceed the information budget without an explicit Owner request for detail.

## Governing invariant

> **Durable evidence is comprehensive; Owner checkpoint projection is selective. The Owner should be able to determine progress, new delta, blocker, required action and next work in seconds, while a successor should be able to reconstruct the full engineering truth from GitHub without relying on the compact chat message.**
