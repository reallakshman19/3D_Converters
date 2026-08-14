# Agent Engineering Execution Rules

This repository uses a continuous-recovery engineering workflow. These rules apply to every agent that investigates, modifies, validates, reviews, or hands over repository work.

## 1. Continuous handover is mandatory

Assume the active agent may disappear, lose context, or become incapable immediately after any meaningful action.

No essential mission, engineering, validation, or continuation state may exist only in chat history or private reasoning.

At every durable checkpoint, another qualified agent must be able to recover the work from:

```text
repository
+ live GitHub PR state
+ agents/MASTER_INDEX.md
+ agents/PR<NUMBER>_workreport.md
```

Before a PR exists, use a unique `agents/WIP-<work-id>_workreport.md`.

Read `agents/protocol/continuous-handover.md`.

## 2. Incoming agents are read-only until qualified

A takeover agent must independently re-ground the PR against live GitHub and current `main`, inspect the actual diff and evidence, then pass the repository-specific **Appendix A — Implementation Takeover Qualification** before modifying production code.

Generic textbook answers do not qualify an agent. Questions must be repository-bound, implementation-bound, and evidence-bound.

Read `agents/protocol/takeover-qualification.md`.

## 3. Multi-agent coordination is mandatory

Before implementation and before each new stage, check `agents/MASTER_INDEX.md`, active PRs, per-PR status/claims, file overlap, authority overlap, dependencies, and base drift.

Do not silently modify an area claimed by another active PR.

Read `agents/protocol/multi-agent-coordination.md`.

## 4. A PR may be rejected

Preserve validated engineering value, not the PR at all costs.

If a PR is stale, contaminated, unintelligible, authority-unsafe, or harder to prove correct than to reconstruct from current `main`, quarantine it and perform a salvage assessment. A valid outcome is to supersede the PR and rebuild only known-good work.

Read `agents/protocol/recovery-salvage.md`.

## 5. Engineering and coding constraints

- No runtime, writer, solver, canvas, topology, authority, tolerance, or engineering-data switch unless explicitly authorized.
- No hidden/default mocks, silent fallbacks, authority-changing shims, or expected-value changes made only to obtain PASS.
- No broad refactors outside scope.
- New JavaScript modules should normally remain below 300 physical lines; functions should normally remain below 40 logical lines. These are maintainability heuristics, not correctness gates.
- Prefer named exports, pure functions, explicit ownership, and bounded mutation.
- Do not claim PASS for checks that were not executed.
- Do not treat implementation-coupled output as independent engineering verification.
- Do not merge unless explicitly authorized by the owner.

## 6. Delivery invariant

A PR is not ready merely because code exists.

It must have current ground truth, controlled scope, reconciled changed files, explicit authority boundaries, appropriate validation, a current handover state, and—while technical work remains—a current Appendix A takeover gate.
