# WIP-XML229-FORMAT-ENABLE-6ae1bed6
REPORT_BASIS_HEAD: d98723600c11df8fa13f010cb1080b9eb76d2749
Owner builder: 6ae1bed6 (continuation, not takeover)
Intent IMPLEMENT; NEW_PR_REQUIRED; WRITE_ALLOWED; ENGINEERING_CRITICAL.
State: BASELINE / diagnosis established, production patch not started.

## Handover in 60 Seconds
Owner Run shows 41/41 AMBIGUOUS branches; Format 1 correctly reads P8810021 / 31441C4 / 300 / 8, Format 2 reads 31441C4 / PP / blank / 8. Current audit reports 195 Final, zero unresolved, candidate NOT_REACHED and blocker branch-format-authority. Do not reinterpret this as missing mass or the previously repaired download listener.
Exact next action: implement an explicit per-format enable control, preserve its boolean through normalization and config writeback, honor false even on Format 1; reproduce all 41 occurrences and retain genuine ambiguity.
Working branch: fix/xml229-explicit-format-enable-6ae1bed6; local /workspace/scratch/8570fe275718/suggestion-fix/repo.
Highest risk: silently choosing an engineering identity or reusing incompatible Final basis. Neither is authorized.

## Grounding and coordination
Live main d98723600c11df8fa13f010cb1080b9eb76d2749; previous PR360 externally merged and deployed. No master index exists in main tree. Read root AGENTS and .agents/AGENTS, applicable delivery skill and prior same-builder reports.
Live open PR346 topology,335 short merge,329 runtime/orchestration,315 drafts,312/311 native,308 tests and older workstreams inspected. Relevant September Regex claim persists ACTIVE but its branch is absent from current open PR inventory; source exists in main, so stale claim reconciled as predecessor, not evidence of live activity. Shared state file overlaps older PR315 and329 domains: bounded regex format config branch only; do not edit their branches, runtime, native or Weight ownership. SAFE bounded independent continuation; reviewers must reconcile older branches before merging them.

## Findings / hypothesis / falsifier
ISS-1: Two user-configured positional alternatives both extract nonempty identity fields; ambiguity is correctly held. The audit alone cannot establish how Format 2 became configured.
ISS-2 SOURCE_INSPECTION: branch-format-extraction.js skips enabled:false only after index===0 early return, so disabled first format still participates.
ISS-3 SOURCE_INSPECTION: regex-tester mergeConfig discards enabled for all formats; no enable control exists. Thus an explicit exclusion cannot survive normal Save Config.
Hypothesis: preserving and exposing explicit per-format exclusion resolves this input without arbitrary priority. Falsifier: disabling Format 2 then saving still yields any of 41 ambiguous branches or consumer disagreement.

## Scope and invariants
Only per-format participation, its UI/persistence/config normalization and focused tests with root/docs mirrors. No automatic preference, master-based heuristic, sample-specific hardcoding, source mutation, geometry, supports, master values, kg formulas, accepted Final decision edits, runtime/writer changes, release bypass or workflow edits.
Model/config dependency invalidation remains existing production behavior; do not promise old Final will transfer across changed config.
Both enabled disagreeing formats must remain HELD. All disabled must remain UNMATCHED. Legitimate Format 2-only resolution must work. Native output and independent reconciliation remain required.
Private source/audit files stay local. Public EF05 supplies 41 branch names; no private payload committed.

## Validation ledger
NOT_RUN LOCAL_EXECUTION: new focused regression, real Chromium UI/persistence, existing multi-format/Run checks.
USER_SUPPLIED: current format diagnostics and accepted195 census; not independent native CII output proof.
SOURCE_INSPECTION: explicit flag-loss / first-slot false defect.
Production/test diffs not yet present; no PR checks or reviews yet.

## Changed-file plan
converters/xml-cii2019-core/branch-format-extraction.js and docs mirror;
tabs/xml-cii-2019-standalone/xml-cii-regex-tester.js and docs mirror;
ui-adapted/xml-cii-adapted-state.js, xml-cii-adapted-regex-tester.js and mirrors;
new focused UI control if needed and mirror;
new focused tests imported by existing regex acceptance entry and existing browser harness.
Existing paths require utils/backup.js before edits.
Recovery report, status and claim are the only initial commit files.

## Appendix A
Same assigned builder continuation; self-scoring not applicable. Successor must independently re-ground and qualify before engineering-sensitive changes.
Merge authority OWNER_ONLY_NOT_GRANTED.
