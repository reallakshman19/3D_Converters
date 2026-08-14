# PR Mission Control

Mission: integrate the merged XML_Compare_Utilities DocumentEvidence v1 table-evidence API as the governed Stage 5C source-evidence path for vibration master recovery.
Source task / issue: #450
PR number: #470
Branch: `agent/document-evidence-stage5c`
Base commit: `994f43521b5aa6e4dd397efd9300ce21943d056d`
Current HEAD: report-allocation stage
PR status: OPEN / DRAFT
Current stage: Stage 3 — changed-file / repository-state verification
Last completed stage: Stage 2 — PR allocation + report synchronization
Engineering status: evidence-consumer integration only; no master publication or calculation authority
Validation status: report protocol PASS; production validation NOT_RUN
Current blocker: exact controlled EI source current identity and materialization path still require verification
Exact next action: classify reusable #452 logic, refresh controlled source identity, then record Stage 3 decision before production implementation

## Handover in 60 Seconds

### What is now true
- XML_Compare_Utilities DocumentEvidence v1 is on `main`; this PR pins contract baseline `e7a394fd7f35c34cda5cad13df55cae2dd37bca2`, OpenAPI 1.4.1.
- `/v2/tables/discover` is advisory and returns exact `SourceIdentity.v1` evidence.
- `/v2/tables/extract` requires exact `sourceHash` plus explicit 1-based pages and returns extraction-only decisions.
- Existing 3D PR #452 is stale/non-mergeable but contains historical recovery logic that may be adapted after classification.
- #470 is the clean current-main implementation branch.

### What is being worked on
Stage 3 verification: current package/test conventions, #452 reusable code, and controlled EI source identity.

### What remains unfinished
- classify #452 modules as REUSE / ADAPT / REJECT;
- implement production v2 table-evidence client;
- implement Stage 5C semantic target profile;
- implement candidate/reconciliation receipts;
- attempt controlled EI source execution;
- targeted tests, changed-file reconciliation, authority audit.

### What must not be assumed
- extraction `accepted` is not engineering approval;
- no Stage 5C value is authoritative merely because it was extracted;
- exact T3 semantic table locators are not Figures T3-1…T3-4;
- chart digitization is not part of this PR;
- #452 is historical evidence, not current-main authority.

Highest-risk remaining item: exact controlled EI source/page locator evidence may not be materializable in this runtime; missing source execution must remain a hard blocker rather than trigger guessed values.
Exact next action: inspect #452 client/normalization/reconciliation files and current controlled source metadata.

# Mission and Engineering Intent

## Mission
Provide a real production path in 3D_Converters that consumes the shared DocumentEvidence v1 service for Stage 5C table recovery and preserves evidence lineage through source-target decisions.

## Engineering consequence
The vibration program can move from ad-hoc conversion toward one shared evidence language while keeping generic document evidence separate from domain master publication and calculation qualification.

## Scope
- thin Node client for XML `/v2/tables/discover` and `/v2/tables/extract`;
- exact source SHA/page selection validation;
- semantic Stage 5C target identifiers separate from source locators;
- extraction-evidence review receipts and candidate-master handoff data;
- operator-usable CLI path against a running XML service;
- focused regression tests.

## Explicit non-goals
- no Figures T3-1…T3-4 curve digitization;
- no chart calibration/interpolation datasets;
- no automatic master activation/publication;
- no engineering/screening/design authority promotion;
- no reverse engineering from worked-example targets;
- no unrelated vibration calculator/UI refactor.

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
| #452 reuse classification | P0 | INVESTIGATING | 3 | changed-file inventory captured |
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
| QST-001 | Question | P0 | OPEN | Exact controlled source commit/blob currently governing #450 must be refreshed before source execution | yes |

# Stage Roadmap

## Stage 1 — Report initialization + technical findings
Implementation performed: created required report before production code and froze authority boundaries.
Validation performed: Common CodingRules structure reviewed.
Stage decision: COMPLETE.

## Stage 2 — PR allocation + report synchronization
Implementation performed: opened draft PR #470 and allocated this report path.
Validation performed: GitHub PR metadata confirms base/current branch.
Stage decision: COMPLETE.

## Stage 3 — Changed-file / repository-state verification
Current truth: current main is `994f435...`; #452 has 18 changed files and is stale/non-mergeable; XML v1 contract is merged.
Objective: inspect #452 implementation, current package/test conventions, and controlled source metadata; classify reusable parts.
Expected scope/files: report only until Stage 3 is recorded complete.
Engineering rationale: avoid copying stale v1 conversion logic into the new v2 evidence consumer.
Planned validation: direct GitHub source inspection and source-identity refresh.
Known risks: stale source pointers and stale #452 assumptions.

## Stage 4 — Production DocumentEvidence client
Objective: operator-usable discover/extract command path using v2 API with strict source/page checks.

## Stage 5 — Stage 5C semantic target profile
Objective: stable semantic IDs for SBC geometry/location/span tables, T2.8 closure, T2.9 FL, T4-1 FM; source locators stay explicit evidence, never guessed.

## Stage 6 — Candidate/reconciliation evidence
Objective: turn accepted/review-required table evidence into source-target review receipts without activating masters or authority.

## Stage 7 — Controlled-source execution
Objective: run discover/extract against exact controlled EI bytes if they can be materialized and exact pages can be reviewed; otherwise record a source-execution blocker.

## Stage 8 — Validation + handover
Objective: targeted tests, changed-file reconciliation, authority audit, final report state.

# Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---:|---:|---|---|---|
| `agents/PR470_workreport.md` | 1 | 3 | living engineering handover | yes | protocol PASS |

# Decision / Invariant Status

| Invariant | Where enforced | Validation | PR changes it? |
|---|---|---|---|
| extraction != engineering authority | target profile/receipts + tests | NOT_RUN | no |
| explicit pages required | client request validator | NOT_RUN | no |
| exact source hash required | client request/response binding | NOT_RUN | no |
| chart digitization separate | scope/report | PASS review | no |

# Validation and Evidence Ledger

## Software Validation

| Validation | Status | Last HEAD | Evidence |
|---|---|---|---|
| report protocol initialization | PASS | report init | report existed before production code |
| PR allocation/report rename | PASS | allocation | PR #470 assigned |
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
3. Reconcile candidate tables independently before any future master-publication PR.
4. Keep Figures T3-1…T3-4 in the separate chart-digitization sequence after source pages, axes, and curves are independently reviewed.

# Stage Execution Log

- Stage 1: report initialized before production code; authority freeze recorded.
- Stage 2: draft PR #470 allocated from current main; report moved to PR-numbered path.

# Next-Agent Handover

Current stopping point: Stage 3 verification.
PR / branch / HEAD: #470 / `agent/document-evidence-stage5c` / report-allocation commits.
Last completed stage: Stage 2.
Current active stage: Stage 3.
Start here: inspect #452 changed files and current controlled source identity.
Do not redo: XML platform work; canonical contract is already on XML main.
Do not assume: any EI source locator/value or authority.
Files currently involved: this report plus temporary predecessor pending deletion.
Known failing checks: none run.
Validation still required: all implementation tests and source execution.
Open QST items: QST-001 controlled source current identity.
Important deferred items: T3 figure digitization.
Highest-risk remaining item: source locator/materialization truth.
Exact next recommended action: finish Stage 3 classification, update report, then begin Stage 4.
Required reading: issue #450, Common `CodingRules.md`, XML DocumentEvidence OpenAPI 1.4.1, stale PR #452 only as historical implementation evidence.
