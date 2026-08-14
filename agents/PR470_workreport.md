# PR Mission Control

Mission: integrate the merged XML_Compare_Utilities DocumentEvidence v1 table-evidence API as the governed Stage 5C source-evidence path for vibration master recovery.
Source task / issue: #450
PR number: #470
Branch: `agent/document-evidence-stage5c`
Base commit: `994f43521b5aa6e4dd397efd9300ce21943d056d`
Current HEAD: Stage 3 verification complete
PR status: OPEN / DRAFT
Current stage: Stage 4 — production DocumentEvidence client
Last completed stage: Stage 3 — changed-file / repository-state verification
Engineering status: evidence-consumer integration only; no master publication or calculation authority
Validation status: source Git identity PASS; production validation NOT_RUN
Current blocker: exact controlled PDF bytes cannot be materialized from the connected GitHub binary interface in this runtime; Stage 7 live source execution is therefore currently BLOCKED_ENVIRONMENT
Exact next action: implement the operator-usable v2 discover/extract client and focused fail-closed tests

## Handover in 60 Seconds

### What is now true
- XML_Compare_Utilities DocumentEvidence v1 is on `main`; contract baseline is `e7a394fd7f35c34cda5cad13df55cae2dd37bca2`, OpenAPI 1.4.1.
- `/v2/tables/discover` is advisory and returns `SourceIdentity.v1`.
- `/v2/tables/extract` requires exact `sourceHash` plus explicit 1-based pages and returns structured observations/table passes/cell decisions.
- Controlled EI source at issue-pinned Common commit `fb549185b9b27edc2379734240320a85c5bef9f6` is exact blob `9d3eccc56429411e17c07a579bdebbd13cb0bdc5`, 10,348,594 bytes.
- Current Common `main` still contains that exact blob and byte size, so source-byte Git identity has not drifted.
- The connector can verify the large binary object metadata but does not materialize its bytes; actual Stage 7 API execution is not currently possible here.
- Existing PR #452 remains historical evidence only.

### What is being worked on
Stage 4: a real Node CLI/library that calls XML v2 discover/extract, requires explicit caller page selection, checks returned source/page identity, and writes governed evidence receipts.

### What remains unfinished
- Stage 4 client + CLI;
- Stage 5 semantic target profile;
- Stage 6 candidate/reconciliation receipt behavior;
- Stage 7 controlled source execution if binary materialization becomes available;
- Stage 8 targeted validation, changed-file reconciliation, final authority audit.

### What must not be assumed
- extraction `accepted` is not engineering approval;
- no Stage 5C value is authoritative merely because it was extracted;
- historical printed-page hints from #452 are not source locators;
- exact T3 semantic tables are not Figures T3-1…T3-4;
- chart digitization is not part of this PR.

Highest-risk remaining item: Stage 7 exact-source execution is environment-blocked; no table page/locator/value may be guessed to compensate.
Exact next action: implement Stage 4 against the already merged v2 contract.

# Mission and Engineering Intent

## Mission
Provide a real production path in 3D_Converters that consumes shared DocumentEvidence v1 for Stage 5C table recovery and preserves source/evidence lineage through domain review receipts.

## Scope
- thin Node client for XML `/v2/tables/discover` and `/v2/tables/extract`;
- exact source SHA/page-response binding;
- stable semantic Stage 5C target identifiers separate from source locators;
- extraction-evidence review receipts and candidate-master handoff data;
- operator-usable CLI against a running XML service;
- focused regression tests.

## Explicit non-goals
- no Figures T3-1…T3-4 digitization/calibration/interpolation;
- no automatic master activation/publication;
- no engineering/screening/design authority promotion;
- no reverse engineering from worked-example targets;
- no unrelated vibration calculator/UI changes.

## Governing invariants
1. `accepted` extraction means source evidence resolved only.
2. Newly recovered candidates remain `engineeringAuthority = NONE`, `screeningAuthority = NOT_AUTHORIZED`, `designAuthority = false`.
3. Discovery never selects governed extraction pages.
4. Extraction requires exact source hash and explicit pages.
5. Semantic master IDs remain distinct from source locators and T3 figure IDs.
6. Unknown locator/value/unit/conflict stays blocked/review-required; no nearest/default/extrapolated fallback.

# Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---:|---|---|---|
| Shared XML DocumentEvidence baseline | P0 | ACCEPTED | 1 | XML main `e7a394fd...` |
| #452 reuse classification | P0 | DONE | 3 | classification below |
| Controlled source Git identity | P0 | VALIDATED | 3 | Common pinned/current trees agree on blob + size |
| Production v2 table evidence client | P0 | IN_PROGRESS | 4 | planned files below |
| Stage 5C semantic target profile | P0 | NOT_STARTED | 5 | — |
| Candidate/reconciliation receipt | P0 | NOT_STARTED | 6 | — |
| Controlled EI API execution | P0 | BLOCKED | 7 | large binary not materializable through connector |
| Chart digitization | P0 | DEFERRED | out of scope | #450 separate curve program |

# Engineering Item Register

| ID | Type | Priority | Status | Summary | Current PR? |
|---|---|---:|---|---|---|
| DEC-001 | Decision | P0 | ACCEPTED | Consume XML via HTTP/schema boundary; do not import/copy XML runtime | yes |
| DEC-002 | Decision | P0 | ACCEPTED | Use semantic Stage 5C master IDs; source locators stay separate/reviewer supplied | yes |
| DEC-003 | Decision | P0 | ACCEPTED | v2 structured cell evidence replaces old Markdown parsing as the primary reconciliation input | yes |
| RISK-001 | Risk | P0 | BLOCKED_ENVIRONMENT | Exact PDF binary cannot be materialized in this runtime although Git identity is verified | yes |
| RISK-002 | Risk | P0 | CLOSED | #452 is stale; useful pieces were classified rather than copied | yes |
| QST-001 | Question | P0 | RESOLVED | Issue-controlled source commit/blob/size refreshed and current Common main still carries same blob | yes |

# Stage 3 Reuse / Adapt / Reject Matrix

| Module / path | Current role | Classification | Reason / compatibility risk |
|---|---|---|---|
| #452 `fetch-vibration-master-sections-via-api.mjs` | `/v1/search` + `/v1/convert` bridge | ADAPT | useful fail-closed HTTP/source patterns, but wrong v1 evidence model and included curve targets |
| #452 `inventory-vibration-master-sources.mjs` | source identity + locator search | ADAPT | blob/size and semantic IDs are useful; printed-page hints are historical navigation only, not authority |
| #452 `reconcile-vibration-master-tables.mjs` | parse converted Markdown record tables | REJECT for primary path | v2 returns structured observations/table passes/cell decisions; Markdown parsing would duplicate/degrade evidence |
| #452 `normalize-vibration-master-tables.mjs` | reviewed semantic mapping to typed rows | DEFER | belongs after reviewed source-target evidence, in a future master-publication/qualification slice |
| #452 curve targets | Figures T3-1…T3-4 | REJECT from #470 | chart digitization is a separate qualified process |

# Stage Roadmap

## Stage 1 — Report initialization + technical findings
Implementation: report created before production code; authority freeze recorded.
Validation: Common CodingRules structure review.
Decision: COMPLETE.

## Stage 2 — PR allocation + report synchronization
Implementation: draft PR #470 opened; report renamed and pending predecessor removed.
Validation: GitHub PR metadata.
Decision: COMPLETE.

## Stage 3 — Changed-file / repository-state verification
Implementation: inspected #452 bridge/inventory/reconciliation/normalization; refreshed Common source commit/tree and current-main tree.
Validation: issue-pinned and current Common trees both show PDF blob `9d3eccc...`, size 10,348,594.
Finding: GitHub connector exposes large binary metadata but not bytes, so live Stage 7 extraction is environment-blocked.
Decision: COMPLETE.

## Stage 4 — Production DocumentEvidence client
Current truth: no production #470 module exists yet.
Objective: operator-usable `discover` and `extract` command path over v2 APIs.
Expected files:
- `scripts/vibration-stage5c-document-evidence.mjs`
- `scripts/recover-vibration-stage5c-via-document-evidence.mjs`
- `tests/vibration-stage5c-document-evidence.test.mjs`
- `package.json`
Engineering rationale: make the real shared evidence API consumable without copying XML runtime.
Planned implementation: strict payload/response validation, explicit pages, exact source binding, JSON receipt output.
Expected behavior: discovery remains advisory; extraction is only attempted from a caller selection document.
Edge cases: empty/duplicate/invalid pages, source mismatch, page mismatch, unknown/curve target, missing candidate ID, authority leakage, nonaccepted cell decisions.
Planned validation: Node built-in test runner + CLI smoke with deterministic local HTTP fixture.
Known risks: no controlled PDF execution in this environment.

## Stage 5 — Stage 5C semantic target profile
Objective: support only SBC geometry/location/span tables, T2.8 closure, T2.9 FL, T4-1 FM; source locators never inferred.

## Stage 6 — Candidate/reconciliation evidence
Objective: create `CANDIDATE` source-target receipts from v2 evidence without activating masters or authority.

## Stage 7 — Controlled-source execution
Status: BLOCKED_ENVIRONMENT unless exact PDF bytes can be materialized. No simulated run may be represented as controlled-source validation.

## Stage 8 — Validation + handover
Objective: targeted tests, changed-file reconciliation, authority audit, final report state.

# Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---:|---:|---|---|---|
| `agents/PR470_workreport.md` | 1 | 4 | living engineering handover | yes | protocol PASS |

# Decision / Invariant Status

| Invariant | Where enforced | Validation | PR changes it? |
|---|---|---|---|
| extraction != engineering authority | report; planned receipt builder/tests | report PASS | no |
| explicit pages required | planned client request validator | NOT_RUN | no |
| exact source hash required | planned request/response binding | NOT_RUN | no |
| chart digitization separate | scope/target allowlist | report PASS | no |

# Validation and Evidence Ledger

## Software Validation

| Validation | Status | Evidence |
|---|---|---|
| report protocol initialization / rename | PASS | report existed before production code; PR #470 allocated |
| source Git-object verification | PASS | pinned/current Common trees agree on blob/size |
| Stage 4 tests | NOT_RUN | implementation not yet written |

## Engineering Validation

| Property | Status | Evidence |
|---|---|---|
| authority freeze preserved | PASS | mission/invariants |
| exact EI source Git object | PASS | commit/blob/size verified |
| exact EI table pages/values | NOT_RUN | controlled binary execution blocked |
| screening/design authority | NOT_APPLICABLE | explicitly excluded |

## Explicitly Not Validated
- exact PDF page locators for Stage 5C targets;
- any engineering table value or normalized master row;
- any T3 curve point;
- calculation/screening/design authority.

# Known / Deferred Work and Forward Sequence

1. Complete the operator-facing v2 evidence consumer and tests.
2. Preserve semantic target IDs but require reviewer-supplied source locator/page selection.
3. When exact PDF bytes/service runtime are available, perform controlled discover -> explicit selection -> extract and retain the resulting evidence receipt.
4. Only after independent reconciliation should a separate PR normalize/publish candidate master rows.
5. Figures T3-1…T3-4 remain in the later chart qualification sequence.

# Stage Execution Log

- Stage 1: report initialized before production code; authority freeze recorded.
- Stage 2: draft PR #470 allocated; report moved to PR-numbered path.
- Stage 3: #452 classified; issue-controlled and current Common source Git identity verified; live binary execution blocker recorded.

# Next-Agent Handover

Current stopping point: Stage 4 implementation start.
PR / branch: #470 / `agent/document-evidence-stage5c`.
Last completed stage: Stage 3.
Current active stage: Stage 4.
Start here: implement the two Stage 4 scripts and focused Node tests listed above.
Do not redo: XML platform/JCS/schema work or #452 Markdown reconciliation.
Do not assume: historical printed page hints, any table value, or any authority.
Known failing checks: none; Stage 4 tests not yet run.
Validation still required: Node tests/CLI smoke and controlled-source execution when environment permits.
Open QST items: none; RISK-001 remains environment-blocked.
Important deferred work: semantic normalization/publication and all T3 curve digitization.
Highest-risk remaining item: exact source execution cannot be claimed from metadata alone.
Exact next recommended action: implement Stage 4 then update this report before Stage 5.
Required reading: issue #450, Common `CodingRules.md`, XML DocumentEvidence OpenAPI 1.4.1, this report.
