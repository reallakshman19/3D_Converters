# PR Mission Control

Mission: integrate XML_Compare_Utilities DocumentEvidence v1 as the governed Stage 5C source-evidence path for vibration master recovery.
Source task / issue: #450
PR number: #470
Branch: `agent/document-evidence-stage5c`
Base commit: `994f43521b5aa6e4dd397efd9300ce21943d056d`
PR status: OPEN / DRAFT
Current stage: Stage 6 — candidate/reconciliation evidence + operator CLI
Last completed stage: Stage 5 — semantic target profile
Engineering status: v2 transport + semantic table target boundary implemented; no master publication/calculation authority
Validation status: Stage 4 PASS 7/7; Stage 5 PASS 8/8
Current blocker: Stage 7 exact PDF execution remains BLOCKED_ENVIRONMENT because the verified large Git blob cannot be materialized through the connected binary interface
Exact next action: implement source-target receipts and the real `discover|extract` CLI over the Stage 4/5 modules

## Handover in 60 Seconds

### What is now true
- XML contract is pinned at `e7a394fd7f35c34cda5cad13df55cae2dd37bca2`, OpenAPI 1.4.1.
- Controlled EI Git object: Common commit `fb549185b9b27edc2379734240320a85c5bef9f6`, blob `9d3eccc56429411e17c07a579bdebbd13cb0bdc5`, 10,348,594 bytes; current Common main still has the same blob/size.
- Stage 4 client enforces v2 routes, explicit pages, exact source SHA/SourceIdentity/page response binding and generic authority-field rejection.
- Stage 5 target profile contains no PDF page defaults and no master values.
- Table-capable targets in #470: SBC fitting span factors, first-span limits, between-main-lines limits, T2.8 valve closure characteristics, T2.9 valve recovery factors, T4 wall modifier.
- SBC geometry/location score rules are explicitly `NON_TABLE_RULE_EVIDENCE_REQUIRED`.
- Figures T3-1…T3-4 are explicitly rejected from this table path.

### What is being worked on
Stage 6: evidence receipts and operator CLI, including table-candidate ambiguity, missing candidate IDs, cell decision state aggregation and fixed authority freeze.

### What remains unfinished
- Stage 6 implementation/tests/CLI smoke;
- Stage 7 controlled-source live execution if binary materialization becomes available;
- Stage 8 file-ledger/final validation/handover.

### What must not be assumed
- `accepted` source evidence grants no calculation/screening/design authority;
- `CANDIDATE` is not `RECONCILED` or `APPROVED_*`;
- semantic ID or reviewer locator does not itself prove engineering values;
- historical #452 printed pages remain navigation hints only.

Highest-risk remaining item: exact source execution unavailable; no table value may be claimed from local fixtures.
Exact next action: Stage 6 receipt/CLI code.

# Mission and Engineering Intent

## Governing invariants
1. extraction acceptance is evidence-only;
2. authority stays `engineeringAuthority=NONE`, `screeningAuthority=NOT_AUTHORIZED`, `designAuthority=false`;
3. discovery never chooses extraction pages;
4. source hash + explicit pages bind every extraction;
5. semantic IDs, source locators, and engineering publication are separate states;
6. ambiguous/missing candidates or nonaccepted cells fail closed.

## Non-goals
Chart digitization; master activation/publication; engineering/screening/design promotion; worked-example fitting; unrelated calculator/UI changes.

# Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---:|---|---|---|
| XML DocumentEvidence baseline | P0 | ACCEPTED | 1 | XML main `e7a394fd...` |
| #452 classification | P0 | DONE | 3 | matrix below |
| Controlled source Git identity | P0 | VALIDATED | 3 | pinned/current Common trees agree |
| Production v2 client | P0 | VALIDATED | 4 | 7/7 assertions |
| Semantic target profile | P0 | VALIDATED | 5 | 8/8 assertions |
| Candidate/reconciliation receipt + CLI | P0 | IN_PROGRESS | 6 | — |
| Controlled EI API execution | P0 | BLOCKED | 7 | binary materialization unavailable |
| Chart digitization | P0 | DEFERRED | out of scope | separate #450 sequence |

# Engineering Item Register

| ID | Type | Priority | Status | Summary |
|---|---|---:|---|---|
| DEC-001 | Decision | P0 | ACCEPTED | HTTP/schema boundary; no XML runtime copy |
| DEC-002 | Decision | P0 | ACCEPTED | semantic IDs never double as PDF locators |
| DEC-003 | Decision | P0 | ACCEPTED | v2 structured evidence replaces Markdown parsing |
| DEC-004 | Decision | P0 | ACCEPTED | generic evidence authority fields are rejected |
| DEC-005 | Decision | P0 | ACCEPTED | geometry/location rule targets cannot enter the v2 table path |
| DEC-006 | Decision | P0 | ACCEPTED | T3 figure IDs are hard out-of-scope in Stage 5C table selector |
| RISK-001 | Risk | P0 | BLOCKED_ENVIRONMENT | exact PDF bytes unavailable through connector |
| QST-001 | Question | P0 | RESOLVED | controlled source Git identity refreshed |

# Stage 3 Reuse / Adapt / Reject Matrix

| Historical #452 module | Classification | Reason |
|---|---|---|
| v1 API bridge | ADAPT | v2 explicit-page table evidence replaces search/convert |
| source inventory | ADAPT | provenance constants useful; page hints not authoritative |
| Markdown table reconciliation | REJECT primary path | v2 supplies structured evidence |
| semantic normalization | DEFER | future reviewed-master publication slice |
| curve targets | REJECT from #470 | separate chart qualification |

# Stage Roadmap / Execution

## Stage 1 — Report initialization
COMPLETE. Report existed before production code; authority freeze recorded.

## Stage 2 — PR allocation
COMPLETE. Draft PR #470 allocated and report renamed.

## Stage 3 — Repository/source verification
COMPLETE. #452 classified; controlled source Git object refreshed; binary execution blocker recorded.

## Stage 4 — Production DocumentEvidence client
COMPLETE.
Files: `scripts/vibration-stage5c-document-evidence-client.mjs`, focused tests.
Behavior: v2 routes, exact SHA/source/page binding, explicit page validation, bounded OCR mode, authority leakage rejection.
Validation: published-module executable assertions PASS 7/7.

## Stage 5 — Semantic target profile
COMPLETE.
File: `scripts/vibration-stage5c-targets.mjs` + tests.
Behavior: six table-capable semantic targets; reviewer locator + explicit pages required; controlled source path/size provenance pin; curves and non-table rules rejected.
Validation: executable assertions PASS 8/8.

## Stage 6 — Candidate/reconciliation evidence + CLI
Current truth: validated transport and semantic selections exist, but no operator command or domain receipt exists.
Objective: real `discover|extract` command; select table candidates explicitly when ambiguous; aggregate cell decisions without confidence guessing; emit evidence-only source-target receipts.
Expected files: `scripts/recover-vibration-stage5c-via-document-evidence.mjs`, `package.json`, test extension.
Receipt states:
- `evidenceDecision = accepted | review_required | blocked | not_found`;
- `publicationState = CANDIDATE` only for accepted, explicitly located candidate evidence; otherwise `BLOCKED`;
- fixed authority `NONE / NOT_AUTHORIZED / false`;
- `masterValuesPublished = false` always.
Edge cases: no table, multiple unselected tables, requested candidate absent, invalid cell decision, numeric disagreement/review state, API/source/page drift.
Planned validation: Node tests + real local HTTP CLI smoke. No fixture run will be labeled controlled-source execution.

## Stage 7 — Controlled-source execution
BLOCKED_ENVIRONMENT unless exact PDF bytes become materializable. Source Git identity is PASS; extraction execution is NOT_RUN.

## Stage 8 — Final validation/handover
Targeted suite, file ledger, function/file-size audit, authority audit, PR metadata.

# Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Validation |
|---|---:|---:|---|---|
| `agents/PR470_workreport.md` | 1 | 6 | living report | protocol PASS |
| `scripts/vibration-stage5c-document-evidence-client.mjs` | 4 | 4 | fail-closed v2 transport | PASS 7 |
| `scripts/vibration-stage5c-targets.mjs` | 5 | 5 | semantic/source profile | PASS 8 |
| `tests/vibration-stage5c-document-evidence.test.mjs` | 4 | 6 | focused regression suite | Stage 4/5 PASS; Stage 6 pending |

# Decision / Invariant Status

| Invariant | Enforcement | Validation |
|---|---|---|
| extraction != engineering authority | client authority rejection; Stage 6 receipt contract | Stage 4 PASS; receipt pending |
| explicit pages required | client + target selection | PASS |
| exact source/page response binding | client | PASS |
| no page defaults | target profile | PASS |
| non-table/curve separation | target profile | PASS |

# Validation Ledger

## Software
- report protocol / PR allocation: PASS
- source Git-object verification: PASS
- Stage 4 transport assertions: PASS 7/7
- Stage 5 semantic assertions: PASS 8/8
- Stage 6 tests/CLI smoke: NOT_RUN

## Engineering
- authority freeze: PASS
- exact controlled Git object: PASS
- exact table page/locator/value: NOT_RUN (environment-blocked)
- chart data: NOT_APPLICABLE

## Explicitly Not Validated
Exact Stage 5C PDF pages, table values, normalized master rows, chart points, calculation/screening/design authority.

# Known / Deferred Work and Forward Sequence

1. Finish Stage 6 receipt/CLI.
2. When exact binary/service runtime is available, execute discover -> reviewer selection -> extract and retain receipt.
3. Separate future PR for semantic row normalization/reconciliation and master publication.
4. Separate chart qualification for T3-1…T3-4.

# Stage Execution Log

- Stage 1: report before code.
- Stage 2: PR #470/report allocation.
- Stage 3: source/reuse verification.
- Stage 4: v2 transport PASS 7/7.
- Stage 5: target profile PASS 8/8; curves/non-table rules fail closed.

# Next-Agent Handover

Current stopping point: Stage 6 start.
PR/branch: #470 / `agent/document-evidence-stage5c`.
Last completed: Stage 5.
Start here: implement `scripts/recover-vibration-stage5c-via-document-evidence.mjs`, package script and receipt tests.
Do not redo: XML work, v1 bridge, Markdown parser, target-page guesses.
Do not assume: any engineering value or publication authority.
Known failing checks: none.
Validation required: Stage 6 tests + local HTTP CLI smoke; controlled execution when environment permits.
Highest risk: exact source bytes unavailable to execute here.
