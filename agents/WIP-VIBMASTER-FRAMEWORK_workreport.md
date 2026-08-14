# WIP-VIBMASTER-FRAMEWORK — Governed Vibration Master Framework

## Recovery header

- Source task: #450
- Branch: `agent/vibration-master-framework`
- Base at allocation: `main@36748e381012bb52ba720cc288101948115721bb`
- Work intent: IMPLEMENT
- Criticality: ENGINEERING_CRITICAL
- Recovery state: CONTINUE
- Coordination: SAFE
- Authority invariant: no engineering values, no active master publication, no screening/design promotion.

## Mission

Implement the shared fail-closed `VibrationMaster.v1` framework required by #450 without waiting on the currently skipped FIT release/browser gate (#479) or SBC DocumentEvidence discovery gate (#480).

This slice is deliberately independent of SBC values and source-page selection. It provides deterministic master identity/content hashing, schema validation, candidate/active isolation, retired/unknown fail-closed resolution, and provenance returned by the resolver.

## Live grounding

Current main: `36748e381012bb52ba720cc288101948115721bb`.

Active related PRs:
- #479 FIT reproducibility — separate FIT files; no master-framework overlap.
- #480 SBC controlled-source recovery — owns SBC inventory/recovery planning; this WIP will not touch its artifacts.
- #471 T2.8 valve-closure candidate — separate T2.8 candidate evidence.

No active PR found claiming `converters/vibration/masters/**`.

Classification: `SAFE`.

## Appendix A — Implementation authorization

### A1 Production Trace — 19/20

Issue #450 requires all future vibration calculations to consume governed master data through one central resolver and emit `masterId`, revision/hash, and source provenance. Current `converters/vibration/` has mechanism domains but no `masters/` resolver directory on `main`.

### A2 Current Failure Isolation — 19/20

The current gap is architectural, not numerical: there is no shared contract that can reject unknown/retired masters, distinguish candidate from active records, deterministically hash engineering content, or return traceable master identity to downstream calculations. Therefore later SBC/T2.8/T2.9/T4 implementations would otherwise risk duplicating lookup semantics.

### A3 Authority / Invariant — 20/20

Protected invariants:
- no EI table/curve/rule values introduced;
- no candidate becomes active automatically;
- unknown master ID fails closed;
- retired master fails closed;
- content hash changes when governed content/provenance changes;
- no `engineeringAuthority`, `screeningAuthority`, or `designAuthority` promotion;
- no UI/runtime/writer/canvas switch.

### A4 Independent Validation — 18/20

Validation will use synthetic hand-authored fixtures independent of any production EI value. Tests will mutate data, units, keys, source locators and publication state to prove anti-drift/fail-closed behavior. Same semantic content with reordered object keys must hash identically.

### A5 Next-Commit / Minimal Patch — 19/20

New files only:
- `converters/vibration/masters/canonical.js`
- `converters/vibration/masters/validate.js`
- `converters/vibration/masters/registry.js`
- `converters/vibration/masters/index.js`
- `scripts/validate-vibration-master.mjs`
- `tests/vibration-master-registry.test.mjs`

No existing production file needs modification for the first usable capability.

**Qualification score: 95/100; minimum challenge 18/20 — PASS.**

## Active hypothesis / falsifier

**Hypothesis:** a pure deterministic registry/resolver plus CLI validator can establish the master governance boundary without any source-specific values or active calculator integration.

**Falsifier:** if the framework requires a source-specific engineering assumption, default value, interpolation rule, or authority transition to function, stop and narrow the design.

## Intended capability

`VibrationMaster.v1` records will be validated and deterministically hashed. A registry will accept candidate/active/retired entries but only resolve active, non-retired masters. Resolution returns immutable master data plus exact provenance/hash. Candidate edits cannot mutate active entries.

## Validation ledger

- live main/issue grounding: PASS / SOURCE_INSPECTION / AUTHORITATIVE_REFERENCE
- active overlap check: PASS / GITHUB_PR_SEARCH / AUTHORITATIVE_REFERENCE
- Appendix A qualification: PASS / REPOSITORY_TRACE / IMPLEMENTATION_AUTHORIZATION
- focused Node tests: NOT_RUN
- CLI validation: NOT_RUN
- release-manifest integration: NOT_APPLICABLE for this isolated framework slice
- browser validation: NOT_APPLICABLE

## Negative assurance

Must remain unchanged:
- all numerical vibration kernels;
- AIV screening authority;
- FIT benchmark authority;
- SBC/T2.8/T2.9/T4 source values;
- source extraction/reconciliation states in #480/#471;
- engineering UI behavior.

## EXACT_NEXT_ACTION

Implement the new pure master contract/hash/registry modules and focused synthetic tests, run them locally, then allocate a draft PR and convert this WIP report to `agents/PR<NUMBER>_workreport.md`.
