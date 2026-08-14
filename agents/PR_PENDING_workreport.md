# PR Mission Control

Mission: integrate the merged XML_Compare_Utilities DocumentEvidence v1 table-evidence API as the governed Stage 5C source-evidence path for vibration master recovery.
Source task / issue: #450
PR number: PENDING
Branch: `agent/document-evidence-stage5c`
Base commit: `994f43521b5aa6e4dd397efd9300ce21943d056d`
Current HEAD: report initialization
PR status: PRE-PR
Current stage: Stage 1 — report initialization + technical findings
Last completed stage: none
Engineering status: evidence-consumer integration only; no master publication or calculation authority
Validation status: NOT_RUN
Current blocker: production implementation intentionally not started until PR number is allocated and this report is renamed
Exact next action: open draft PR, rename this report, verify changed-file state, then implement the production Stage 5C evidence client

## Handover in 60 Seconds

### What is now true
- XML_Compare_Utilities exposes canonical DocumentEvidence v1 table routes on `main`.
- Canonical XML contract baseline for this PR is `e7a394fd7f35c34cda5cad13df55cae2dd37bca2`, OpenAPI 1.4.1.
- `/v2/tables/discover` is advisory and returns immutable `SourceIdentity.v1` evidence.
- `/v2/tables/extract` requires exact `sourceHash` plus explicit 1-based pages and returns extraction-only evidence decisions.
- Existing 3D_Converters PR #452 is stale/non-mergeable and contains useful prior recovery experiments, but it is not the base of this PR.

### What is being worked on
A clean production consumer on current `main` that can discover candidates, require explicit selected pages, extract governed table evidence, map only reviewed Stage 5C source targets, and produce candidate/reconciliation receipts.

### What remains unfinished
- allocate this PR number and rename the report;
- inventory reusable logic from #452 as REUSE / ADAPT / REJECT;
- implement production API client and Stage 5C target profile;
- validate fail-closed source/page/decision behavior;
- attempt controlled EI source execution;
- record any source-materialization or locator blockers without guessing.

### What must not be assumed
- extraction `accepted` is not engineering approval;
- no Stage 5C table/master value is authoritative merely because it was extracted;
- exact T3 semantic table locators are not the same as Figures T3-1…T3-4;
- chart digitization is not part of this PR;
- the stale #452 branch is not current `main` truth.

Highest-risk remaining item: exact controlled EI source/page locator evidence may not be materializable in this runtime; missing source execution must remain a hard blocker rather than trigger guessed values.
Exact next action: allocate the PR number and begin Stage 3 changed-file/reuse verification.

# Mission and Engineering Intent

## Mission
Provide a real production path in 3D_Converters that consumes the shared DocumentEvidence v1 service for Stage 5C table recovery and preserves evidence lineage through source-target decisions.

## Engineering consequence
The vibration program can move from ad-hoc section conversion toward one shared evidence language while keeping generic document evidence separate from domain master publication and calculation qualification.

## Scope
- thin Node client for XML `/v2/tables/discover` and `/v2/tables/extract`;
- exact source SHA/page selection validation;
- semantic Stage 5C target identifiers separate from source locators;
- extraction-evidence review receipts and candidate-master handoff data;
- real command path an operator can execute against a running XML service;
- focused regression tests.

## Explicit non-goals
- no Figures T3-1…T3-4 curve digitization;
- no chart calibration/interpolation datasets;
- no automatic master activation/publication;
- no engineering/screening/design authority promotion;
- no reverse engineering from worked-example targets;
- no changes to unrelated vibration calculators or UI.

## Governing invariants
1. `accepted` extraction means source evidence resolved only.
2. `engineeringAuthority = NONE`, `screeningAuthority = NOT_AUTHORIZED`, `designAuthority = false` for newly recovered candidates.
3. Discovery never silently selects governed extraction pages.
4. Extraction requires exact source hash and explicit pages.
5. T3 semantic table master IDs remain distinct from Figure T3-1…T3-4 curve identifiers.
6. Unknown locator/value/unit/conflict remains blocked or review-required; no default/nearest-row/extrapolation fallback.

# Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---:|---|---|---|
| Shared XML DocumentEvidence baseline | P0 | ACCEPTED | 1 | XML main `e7a394fd...` |
| #452 reuse classification | P0 | INVESTIGATING | 3 | pending PR allocation |
| Production v2 table evidence client | P0 | NOT_STARTED | 4 | — |
| Stage 5C semantic target profile | P0 | NOT_STARTED | 5 | — |
| Candidate/reconciliation receipt | P0 | NOT_STARTED | 6 | — |
| Controlled EI execution | P0 | NOT_STARTED | 7 | — |
| Chart digitization | P0 | DEFERRED | out of scope | #450 separate curve program |

# Engineering Item Register

| ID | Type | Severity/Priority | Status | Summary | Current PR? |
|---|---|---|---|---|---|
| DEC-001 | Decision | P0 | ACCEPTED | Consume XML via HTTP/schema boundary; do not import/copy XML runtime | yes |
| DEC-002 | Decision | P0 | ACCEPTED | Use semantic Stage 5C master IDs; never reuse `T3-1/T3-2/T3-3` as unverified table IDs | yes |
| RISK-001 | Risk | P0 | OPEN | Controlled EI binary/page locators may be unavailable in execution environment | yes |
| RISK-002 | Risk | P0 | OPEN | Existing #452 implementation is stale relative to current main and v2 API | yes |
| QST-001 | Question | P0 | OPEN | Exact controlled source commit/blob currently governing issue #450 must be refreshed before source execution | yes |

# Stage Roadmap

## Stage 1 — Report initialization + technical findings
Current truth: current main is `994f435...`; #452 is stale/non-mergeable; XML v1 contract is merged.
Objective: establish authority boundaries and implementation roadmap before code.
Expected scope/files: this report only.
Engineering rationale: protect source/master/calculation authority before recovery logic exists.
Planned validation: report self-review against Common CodingRules.
Known risks: stale source pointers and stale #452 implementation.
Stage decision: IN_PROGRESS.

## Stage 2 — PR allocation + report synchronization
Objective: open draft PR and rename report to `agents/PR<NUMBER>_workreport.md`.
Planned validation: GitHub PR metadata and changed-file list.

## Stage 3 — Changed-file / repository-state verification
Objective: inspect #452 implementation, current package/test conventions, and controlled source metadata; classify reusable parts.

## Stage 4 — Production DocumentEvidence client
Objective: operator-usable discover/extract command path using v2 API with strict source/page checks.

## Stage 5 — Stage 5C semantic target profile
Objective: stable semantic IDs for SBC geometry/location/span tables, T2.8 closure, T2.9 FL, T4-1 FM; locators remain explicit evidence, never guessed.

## Stage 6 — Candidate/reconciliation evidence
Objective: convert accepted/review-required table evidence into source-target review receipts without activating masters or authority.

## Stage 7 — Controlled-source execution
Objective: run discover/extract against exact controlled EI bytes if they can be materialized and exact pages can be reviewed; otherwise record a source-execution blocker.

## Stage 8 — Validation + handover
Objective: targeted tests, changed-file reconciliation, authority audit, final report state.

# Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---:|---:|---|---|---|
| `agents/PR_PENDING_workreport.md` | 1 | 1 | living engineering handover | yes | self-review pending |

# Decision / Invariant Status

| Invariant | Where enforced | Validation | PR changes it? |
|---|---|---|---|
| extraction != engineering authority | target profile/receipts + tests | NOT_RUN | no |
| explicit pages required | client request validator | NOT_RUN | no |
| exact source hash required | client request/response binding | NOT_RUN | no |
| chart digitization separate | scope/report | review | no |

# Validation and Evidence Ledger

## Software Validation

| Validation | Status | Last HEAD | Evidence |
|---|---|---|---|
| report protocol initialization | PASS | report init | report exists before production code |
| production tests | NOT_RUN | — | implementation not started |

## Engineering Validation

| Property | Status | Evidence |
|---|---|---|
| authority freeze preserved | PASS | mission/invariants |
| exact EI table values | NOT_RUN | controlled source not executed |
| Stage 5C source locators | NOT_RUN | source review pending |

## Explicitly Not Validated
- exact controlled EI source bytes in this runtime;
- exact printed/PDF pages for Stage 5C targets;
- any engineering table value;
- any curve/chart point;
- screening/design authority.

# Known / Deferred Work and Forward Sequence

1. Complete generic table evidence consumer first because domain recovery must not duplicate document extraction logic.
2. Bind semantic Stage 5C targets only after exact source/page evidence exists.
3. Reconcile candidate tables independently before any future master publication PR.
4. Keep Figures T3-1…T3-4 in the separate chart digitization sequence after source pages, axes, and curves are independently reviewed.

# Next-Agent Handover

Current stopping point: pre-production Stage 1.
PR / branch / HEAD: PENDING / `agent/document-evidence-stage5c` / report-init commit.
Last completed stage: none.
Current active stage: Stage 1.
Start here: open draft PR, rename report, then inspect #452 changed files and current main conventions.
Do not redo: XML platform work; canonical contract is already on XML main.
Do not assume: any EI source locator/value or authority.
Files currently involved: this report only.
Known failing checks: none run.
Validation still required: all implementation tests and source execution.
Open QST items: QST-001 controlled source current identity.
Important deferred items: T3 figure digitization.
Highest-risk remaining item: source locator/materialization truth.
Exact next recommended action: allocate PR and update this report before production code.
Required reading: issue #450, Common `CodingRules.md`, XML DocumentEvidence OpenAPI 1.4.1, stale PR #452 only as historical implementation evidence.
