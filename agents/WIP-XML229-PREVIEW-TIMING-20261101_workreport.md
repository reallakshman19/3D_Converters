# WIP XML229 Preview timing — issue #376
HANDOVER_READINESS: READY_FOR_DRAFT_REVIEW
WORK_INTENT: IMPLEMENT / OBSERVABILITY_ONLY
REPOSITORY_STATE: NEW_PR_REQUIRED
CRITICALITY: ENGINEERING_CRITICAL (engineering Preview source-bound path; diagnostic-only change)
MUTATION_AUTHORITY: WRITE_ALLOWED (new Owner-selected issue/PR, not takeover)
EXECUTION_MODE: MANUAL
MERGE_AUTHORITY: OWNER_ONLY
REPOSITORY: reallakshman19/3D_Converters
BRANCH: fix/xml229-preview-substage-timing-20261101
BASE_MAIN_SHA: 2477a6fdee1002d5063bc51e94777ba940e6fa82
SOURCE_ISSUE: https://github.com/reallakshman19/3D_Converters/issues/376
COORDINATION: COORDINATION_REQUIRED — old open PR #260 changes producer/Worker and #253 changes Preview button; PR draft only; no other PR modified.

## Mission and falsifier
Instrument the *actual* `all-physical-field-assessment` path, displaying bounded source-safe per-stage timings in live progress and final Preview evidence, without changing engineering source/geometry/mass/Final/native CII semantics. Falsifier: any changed canonical branch/physical/fact/geometry output, timing result used to authorize engineering or stale-basis acceptance, or browser run showing no timings.

## Exact plan
1. Save exact immutable baseline producer/Worker/button source+docs backups **before** any production edit.
2. Add a tiny named-export phase clock with fixed phase allowlist, monotonic ms, bounded results and exception-safe notification.
3. Instrument actual producer subphases and GC-PW session opening; transmit a bounded diagnostic array in the existing ready receipt.
4. Display timings in the completed Preview status (no release status change), add focused Node tests; keep root/docs byte identical.
5. Create draft PR against fresh 2477a6fdee1002d5063bc51e94777ba940e6fa82; reconcile actual diff, run CI/real Chromium when available. No workflow edits.
6. Do not touch other remediation packages (Format 1/2, staged DTXR resolution, Run release).

## Known evidence
Owner 41-branch EF05, 249 Final owners, 1743 facts, 20/20 bounded ambiguous formats, native staged-position failure after 24975ms; these are **not** a Preview performance benchmark. Previous PR280 stall stage differs from current `all-physical-field-assessment`. A real performance hotspot is not yet measured.

## Protected invariants
Source/master/staged JSON SHA/Basis custody; full original census; seven facts per owner; source node ordinals; geometry/physical lineage; all existing engineering mass and independent native CII guards; immutable Final CAS; reject ambiguous format and staged-owner identities. Never auto-approve a source or report an output released.

## Validation ledger
- SOURCE_INSPECTION / PASS: current main production calls `openXml229EngineeringFactModel` immediately after `all-physical-field-assessment`.
- NEW CODE TESTS / NOT_RUN until generated/committed and executed.
- ROOT/DOCS PARITY / NOT_RUN until modified.
- REAL_CHROMIUM: NOT_RUN (container has no direct GitHub clone DNS, no full owner-master/current staged basis supplied).
- OWNER ACCEPTANCE / NOT_RUN.
No CI/review status has been assumed.

## Change-file ledger (planned)
Root+docs: preview-engineering-fact-producer; original-blob-gcpw-worker; adapted-preview-facts-button-session; new preview-phase-clock. Test: tests/xml229-preview-phase-clock.test.mjs. Exact baseline backups; this WIP record then PR-numbered report/status/claim.

## Risk register
RISK-01: instrumentation callback might accidentally fail engineering execution (must swallow observer errors).
RISK-02: arbitrary phase labels might leak private source text (fixed allowlist only).
RISK-03: old open PR #260/#253 exact overlap; **do not merge** until coordination.
RISK-04: no production Chromium benchmark on 385/10699/383/1595 exact loaded data; do not claim speedup.

EXACT_NEXT_ACTION: implement the fixed-phase diagnostics against the backed-up main bytes, add isolated tests and source/docs mirrors, then publish a **draft** PR only, maintaining held independent release status.
