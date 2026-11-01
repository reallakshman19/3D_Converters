# PR378 — XML229 base XML→CII independent of optional enrichment

HANDOVER_READINESS: READY_FOR_DRAFT_REVIEW
PR_RECOVERY_STATE: DRAFT_PUBLISHED_VALIDATION_PENDING
WORK_INTENT: IMPLEMENT
CRITICALITY: ENGINEERING_CRITICAL (source/CI candidate boundary)
TAKEOVER_AUTHORITY: NOT_APPLICABLE_NEW_OWNER_DIRECTED_ASSIGNMENT
EXECUTION_MODE: MANUAL
MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED
REPOSITORY: reallakshman19/3D_Converters
PR_URL: https://github.com/reallakshman19/3D_Converters/pull/378
SOURCE_ISSUE: https://github.com/reallakshman19/3D_Converters/issues/376
BRANCH: fix/xml229-preview-substage-timing-20261101
BASE_MAIN: 2477a6fdee1002d5063bc51e94777ba940e6fa82
IMPLEMENTATION_BASIS_HEAD: 4b32fcb76b6c9c4bedfe13dcc1739a6763712725
REPORT_BASIS_HEAD: 4b32fcb76b6c9c4bedfe13dcc1739a6763712725
COORDINATION: COORDINATION_REQUIRED; open legacy #260 overlaps canonical GC-PW Worker, #253 Preview integration, #371 adjacent native BM2.
CURRENT_STAGE: DRAFT_PUBLISHED
HIGHEST_RISK: broad native/source authority regression not yet tested in real browser; proposed raw route must not discard accepted masses or selected staged JSON.
EXACT_NEXT_ACTION: run focused Node J04, full original XML/no-master, single-master, all-master Chromium original Preview and direct/native conversion; inspect only PR378 exact code and update this report on any failures; coordinate #260 before any merge.

## Owner's authoritative core concept (2026-11-01)
XML→CII base conversion must occur even if Line List, Piping Class master or Material Map is missing, even when Line Key/Piping Class regex is missing or conflicting. These masters are optional ENRICHMENT ONLY. Rating token is always optional. Two conflicting configured Format identities must cause TWO separate 4 Preview review passes, neither silently accepted. Preserve legitimate engineering source, mass, native geometry and output-release gates separately. This supersedes the initial Preview-timing-only WIP mission. Timing/optimization remains issue #376 follow-up, not implemented here.

## Production trace (verified SOURCE_INSPECTION)
- tabs/.../xml-cii-workflow-service.js previously returned blockedRunParityResult before native invocation when `auditConfiguredBranchFormats(...).blocked`, and again when parity Preview format facts were unqualified.
- The output checklist already marks `branch-format-authority` a nonblocking enrichment warning (`blocking:false`).
- The legacy Preview core already computes `formatPreviewPasses` separately for conflicting enabled formats, and renderer.js already draws two read-only pass tables.
- The current original verified GC-PW Worker created `verifiedPreviewResult` from `computed.branchRows/nodeRows` but omitted `computed.formatPreviewPasses` so the normal Worker-backed Preview UI never received the two independent reviews.
- Branch-format extractor already requires only Line Key and Piping Class for its matched identity; Rating is optional and absent Rating cannot create format ambiguity by itself.

## Code at 4b32fcb76b6c9c4bedfe13dcc1739a6763712725
1. xml-cii-workflow-service.js (+docs identical):
   - Existing direct API format audit retained, but unresolved optional formats now route to the UNCHANGED engine with original XML and an empty optional support configuration; no Preview candidate is promoted.
   - When no imported masters and no explicit multi-format config, direct base XML is also executed without master enrichment.
   - If *post-Preview* enrichment identity conflicts, original XML is used rather than unqualified parity-enriched XML.
   - Selected stagedJsonText is retained; Python staged-position ambiguity still fails closed.
   - A native Final packet or accepted rigidWeight override prohibits dropping accepted mass inputs through raw fallback; governed review/packet remains separate.
   - Diagnostic `optionalEnrichment` reports WITHHELD/reason and explicitly indicates it grants no native release.
2. xml229-original-blob-gcpw-worker.mjs (+docs identical):
   - returns `computed.formatPreviewPasses` alongside authoritative original-source Preview rows; read-only presentation only, no effect on engineering FactRecords, physical census or Final decisions.
3. tests/xml-cii-j04-service-release-gate.test.mjs:
   - Replaced the two old requirements that optional conflicts block conversion, retaining all original independent population/identity audit tests.
   - New transport tests assert original XML preserved, absent masters start native engine, staged JSON is preserved, source-bound Final packet cannot be dropped, conflicting parity XML is not sent to native engine.
   - Synthetic stub CII is explicitly a transport oracle, not real native proof.

## Protected invariants / negative assurance
No edits to branch-format extraction, Regex Tester editor/persistence, master values, rating, material, weights, accepted Final CAS, native writer/Pyodide, source units, topology, native independent CII parser, or selection. Raw fallback uses original XML and does not auto-pick Format 1/2; all old enrichment fail-closed audits still report their own conflicts. No stashed approved kg is applied to a newly changed InputBasis. The implementation is a *first scoped candidate*, not final engineering acceptance.

## Incomplete acceptance / risks
- RISK-1: source-bound Final packet requiring raw fallback remains explicitly HELD. This is intentional; cannot safely strip accepted masses just to produce CII.
- RISK-2: selected JSON may still fail mandatory position binding, independent of optional masters and regex.
- RISK-3: no exact Owner loaded staged JSON, format configuration or four-master bytes in GitHub tests supplied to this session.
- RISK-4: no real Chromium/production native execution of this HEAD; code must remain draft.
- RISK-5: direct-service optional master subset coverage is not yet real-browser validated; don't claim all combinations PASS.
- RISK-6: #260 overlap includes Worker path. Coordinate before integration.
- RISK-7: branch name contains legacy "preview-substage-timing" from the initial WIP; issue/PR/report define superseding approved scope unambiguously.

## Validation evidence
- SOURCE_INSPECTION / PASS / analytical: original format gate mismatch and pass handoff omission reproduced on main SHA.
- GIT_OBJECT_CHECK / PASS: source/docs modified file blob SHA identical by using same content for each path; old original blobs backed up before edits.
- ROOT/DOCS runtime parity / NOT_RUN: only byte-equality is asserted, not browser behavior.
- TARGETED_NODE / NOT_RUN as of implementation head (no full clone/DNS in this session); expected scripts: `node --test tests/xml-cii-j04-service-release-gate.test.mjs`, `node --test tests/xml-cii-j04-multi-format-preview.test.mjs`.
- CHROMIUM real EF05 41-branch Preview two passes / NOT_RUN.
- ALL 0/1/3 MASTER CARDINALITIES actual native CII / NOT_RUN.
- INDEPENDENT native CII mass/geometry/full-output reconciliation / NOT_RUN.
- GitHub Actions: initial workflow checks queued/in-progress; one unrelated job passed, *overall green not claimed*.
- Independent reviewer/Owner engineering acceptance / NOT_RUN.

## Changed-file ledger
- Production exact: `tabs/xml-cii-2019-standalone/xml-cii-workflow-service.js`; `tabs/xml-cii-2019-standalone/integration/xml229-original-blob-gcpw-worker.mjs`
- Mirrors: `docs/tabs/xml-cii-2019-standalone/xml-cii-workflow-service.js`; `docs/tabs/xml-cii-2019-standalone/integration/xml229-original-blob-gcpw-worker.mjs`
- Regression: `tests/xml-cii-j04-service-release-gate.test.mjs`
- Nine exact baseline backups in `.backups/20261101-issue376/` (producer, Preview button, worker, service and tests; some producer/button backups are conservative and unedited).
- Recovery report: initial `agents/WIP-XML229-PREVIEW-TIMING-20261101_workreport.md`, superseded by this current PR report.
- PR status and claim in `agents/status/PR378.yaml` / `agents/claims/PR378.yaml`.
All paths belong to this one PR, no other branch edited.

## Coordination and release
Do not merge, rebase, auto-merge or deploy. Exactly open PR378 for engineering review. Open old PR260 has overlapping files, so coordination required. Fix-02 stage-position diagnostics, run-hold UI, performance optimization and broader architecture in issue #376 are NOT INCLUDED in this PR. Direct native result is not release evidence. Keep PR as DRAFT.

## Continuation
The first actionable next command in a complete checkout is `node --test tests/xml-cii-j04-service-release-gate.test.mjs tests/xml-cii-j04-multi-format-preview.test.mjs`. Review root/docs parity and CI exact head, inspect any failed test, then run actual EF05 4 Preview and real XML-only conversion with no and partial masters and selected JSON negative guard. Do not amend independent expected values to hide failures.
