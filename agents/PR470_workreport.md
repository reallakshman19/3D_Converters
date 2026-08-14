# PR Mission Control

Mission: integrate XML_Compare_Utilities DocumentEvidence v1 as the governed Stage 5C source-evidence path for vibration master recovery.
Source task / issue: #450
PR number: #470
Branch: `agent/document-evidence-stage5c`
Base commit: `994f43521b5aa6e4dd397efd9300ce21943d056d`
PR status: OPEN / DRAFT
Current stage: Stage 5 — Stage 5C semantic target profile
Last completed stage: Stage 4 — production DocumentEvidence client
Engineering status: transport evidence consumer implemented; no master publication/calculation authority
Validation status: Stage 4 focused validation PASS
Current blocker: Stage 7 exact PDF execution remains BLOCKED_ENVIRONMENT because the connected GitHub interface exposes the verified large PDF object metadata but not its bytes
Exact next action: add the fail-closed semantic Stage 5C target allowlist and selection contract without source-page defaults

## Handover in 60 Seconds

### What is now true
- XML contract baseline: `reallaksh19/XML_Compare_Utilities@e7a394fd7f35c34cda5cad13df55cae2dd37bca2`, OpenAPI 1.4.1.
- Controlled EI source identity is verified at Common commit `fb549185b9b27edc2379734240320a85c5bef9f6`: blob `9d3eccc56429411e17c07a579bdebbd13cb0bdc5`, size 10,348,594; current Common main still has the same blob/size.
- `scripts/vibration-stage5c-document-evidence-client.mjs` now calls `/v2/tables/discover` and `/v2/tables/extract`.
- Discovery remains advisory; extraction requires exact source SHA and explicit positive unique pages.
- Returned SourceIdentity and pages are checked against the request.
- Generic evidence payloads containing engineering/screening/design/publication authority fields fail closed.
- Stage 4 published-module executable assertions: 7/7 PASS.

### What is being worked on
Stage 5 semantic target profile: stable domain target IDs only, with curves excluded and source locator/page evidence supplied explicitly by the caller/reviewer.

### What remains unfinished
- Stage 5 target allowlist/selection validation;
- Stage 6 candidate/reconciliation receipts + operator CLI;
- Stage 7 controlled EI API execution if exact bytes become materializable;
- Stage 8 final validation/changed-file audit/handover.

### What must not be assumed
- `accepted` extraction is not engineering approval;
- historical #452 page hints are not locators;
- a semantic target ID does not prove where it occurs in the PDF;
- T3 table targets are distinct from Figures T3-1…T3-4;
- no recovered value is a published master.

Highest-risk remaining item: source execution remains environment-blocked; no source locator/value can be invented to compensate.
Exact next action: implement Stage 5 target profile and tests.

# Mission and Engineering Intent

## Scope
- thin Node v2 evidence client;
- exact source/page binding;
- stable semantic Stage 5C target IDs separate from source locators;
- source-target review receipts;
- operator CLI;
- focused Node tests.

## Non-goals
- T3 curve digitization/calibration/interpolation;
- automatic master activation/publication;
- engineering/screening/design authority promotion;
- reverse engineering from worked examples;
- unrelated calculator/UI changes.

## Governing invariants
1. extraction acceptance is evidence-only;
2. authority stays `NONE / NOT_AUTHORIZED / false`;
3. discovery does not choose extraction pages;
4. extraction requires exact source hash + explicit pages;
5. semantic target IDs and source locators are distinct;
6. unknown target/locator/value/conflict fails closed.

# Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---:|---|---|---|
| XML DocumentEvidence baseline | P0 | ACCEPTED | 1 | XML main `e7a394fd...` |
| #452 classification | P0 | DONE | 3 | matrix below |
| Controlled source Git identity | P0 | VALIDATED | 3 | pinned/current Common trees agree |
| Production v2 client | P0 | VALIDATED | 4 | 7/7 focused assertions |
| Semantic target profile | P0 | IN_PROGRESS | 5 | — |
| Candidate/reconciliation receipt + CLI | P0 | NOT_STARTED | 6 | — |
| Controlled EI API execution | P0 | BLOCKED | 7 | binary materialization unavailable |
| Chart digitization | P0 | DEFERRED | out of scope | separate #450 sequence |

# Engineering Item Register

| ID | Type | Priority | Status | Summary |
|---|---|---:|---|---|
| DEC-001 | Decision | P0 | ACCEPTED | HTTP/schema boundary; no XML runtime copy/import |
| DEC-002 | Decision | P0 | ACCEPTED | semantic master IDs never double as unverified PDF locators |
| DEC-003 | Decision | P0 | ACCEPTED | v2 structured evidence replaces Markdown parsing as primary input |
| DEC-004 | Decision | P0 | ACCEPTED | generic evidence payload authority fields are rejected by 3D client |
| RISK-001 | Risk | P0 | BLOCKED_ENVIRONMENT | exact PDF bytes unavailable through connected binary interface |
| RISK-002 | Risk | P0 | CLOSED | stale #452 classified rather than copied |
| QST-001 | Question | P0 | RESOLVED | controlled source commit/blob/size refreshed |

# Stage 3 Reuse / Adapt / Reject Matrix

| Module / path | Classification | Reason |
|---|---|---|
| #452 `fetch-vibration-master-sections-via-api.mjs` | ADAPT | good source/HTTP patterns; obsolete v1 search/convert and curve scope |
| #452 `inventory-vibration-master-sources.mjs` | ADAPT | blob/size + semantic IDs useful; page hints not authoritative |
| #452 `reconcile-vibration-master-tables.mjs` | REJECT primary path | v2 already supplies structured observations/passes/decisions |
| #452 `normalize-vibration-master-tables.mjs` | DEFER | belongs after reviewed candidate evidence in future publication slice |
| #452 curve targets | REJECT from #470 | chart digitization separate |

# Stage Roadmap

## Stage 1 — Report initialization
Decision: COMPLETE. Report existed before production code; authority freeze recorded.

## Stage 2 — PR allocation
Decision: COMPLETE. Draft PR #470 allocated; report renamed.

## Stage 3 — Repository/source verification
Decision: COMPLETE. #452 classified; controlled source Git object refreshed; binary runtime blocker recorded.

## Stage 4 — Production DocumentEvidence client
Implementation:
- added `scripts/vibration-stage5c-document-evidence-client.mjs`;
- added focused transport tests;
- v2 discovery/extraction routes; explicit page sorting; SHA/source/page response checks; bounded OCR mode contract; generic authority leakage rejection.
Validation: executable assertions against published module: PASS 7/7.
Deviations: none; controlled PDF execution intentionally not simulated.
Decision: COMPLETE.

## Stage 5 — Stage 5C semantic target profile
Current truth: transport is available but has no domain target IDs.
Objective: allow only the current Stage 5C table/rule targets; reject curve IDs and unknown IDs; require reviewer/caller pages and source locator rather than supplying historical defaults.
Expected file: `scripts/vibration-stage5c-targets.mjs` plus extension of focused test file.
Engineering rationale: domain identity belongs in 3D_Converters, while source evidence remains owned by XML service.
Edge cases: curve target, unknown target, missing/empty locator, missing pages, duplicate selection ID.
Planned validation: Node built-in tests.

## Stage 6 — Candidate/reconciliation evidence + CLI
Objective: produce governed source-target receipts with separate evidenceDecision/publicationState/authority and no master activation.

## Stage 7 — Controlled-source execution
Status: BLOCKED_ENVIRONMENT unless exact PDF bytes become materializable. Simulated/local fixture calls cannot be represented as controlled-source execution.

## Stage 8 — Final validation/handover
Objective: targeted suite, CLI HTTP smoke, file ledger reconciliation, final authority audit.

# Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---:|---:|---|---|---|
| `agents/PR470_workreport.md` | 1 | 5 | living engineering handover | yes | protocol PASS |
| `scripts/vibration-stage5c-document-evidence-client.mjs` | 4 | 4 | fail-closed v2 transport | yes | PASS 7 assertions |
| `tests/vibration-stage5c-document-evidence.test.mjs` | 4 | 5 | focused transport/domain tests | yes | Stage 4 PASS; Stage 5 pending |

# Decision / Invariant Status

| Invariant | Enforcement | Validation |
|---|---|---|
| extraction != engineering authority | client rejects generic authority fields; receipts planned | Stage 4 PASS |
| explicit pages required | `normalizeExplicitPages` | PASS |
| exact source hash/page response required | client response validation | PASS |
| chart digitization separate | target profile planned | report PASS; code pending |

# Validation and Evidence Ledger

## Software Validation

| Validation | Status | Evidence |
|---|---|---|
| report protocol / PR allocation | PASS | report precedes production code; #470 |
| source Git-object verification | PASS | Common pinned/current trees |
| Stage 4 published transport assertions | PASS | 7/7 |
| Stage 5 tests | NOT_RUN | pending implementation |

## Engineering Validation

| Property | Status | Evidence |
|---|---|---|
| authority freeze | PASS | report + generic authority rejection |
| exact EI source Git object | PASS | commit/blob/size |
| exact table pages/values | NOT_RUN | controlled binary execution blocked |
| T3 curve data | NOT_APPLICABLE | excluded |

## Explicitly Not Validated
- exact Stage 5C PDF page locators;
- any engineering table value / normalized master row;
- any chart point;
- screening/design authority.

# Known / Deferred Work and Forward Sequence

1. Add semantic target allowlist with no page defaults.
2. Add source-target receipt/CLI using the Stage 4 client.
3. When exact bytes/service are available, execute discover -> human explicit selection -> extract and retain receipt.
4. Later PR: independent semantic row normalization/reconciliation/master publication.
5. Later chart sequence: T3-1…T3-4 calibration/digitization/review.

# Stage Execution Log

- Stage 1: living report initialized before code.
- Stage 2: PR #470 allocated and report renamed.
- Stage 3: stale #452 classified; exact source Git object verified; runtime binary blocker recorded.
- Stage 4: v2 transport client implemented; published-module assertions PASS 7/7.

# Next-Agent Handover

Current stopping point: Stage 5 start.
PR / branch: #470 / `agent/document-evidence-stage5c`.
Last completed stage: Stage 4.
Start here: add `scripts/vibration-stage5c-targets.mjs` and extend focused tests.
Do not redo: XML work, v1 bridge, Markdown table parser.
Do not assume: page hints, source locators, table values, authority.
Known failing checks: none.
Validation still required: Stage 5/6 tests, CLI smoke, controlled execution when environment permits.
Open QST: none; RISK-001 environment-blocked.
Highest-risk item: source execution unavailable from metadata alone.
Exact next action: Stage 5 semantic target implementation and tests.
