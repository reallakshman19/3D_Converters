# PR Mission Control

Mission: integrate XML_Compare_Utilities DocumentEvidence v1 as the governed Stage 5C source-evidence path for vibration master recovery.
Source task / issue: #450
PR number: #470
Branch: `agent/document-evidence-stage5c`
Base commit: `994f43521b5aa6e4dd397efd9300ce21943d056d`
PR status: OPEN / DRAFT
Current stage: Stage 7 — controlled-source execution
Last completed stage: Stage 6 — candidate/reconciliation evidence + operator CLI
Engineering status: production v2 transport, semantic target gate, evidence receipt kernel and CLI implemented; no master publication/calculation authority
Validation status: combined focused suite PASS 17/17; reported Git identity assertions PASS 2/2; localhost HTTP CLI smoke PASS
Current blocker: exact controlled PDF bytes cannot be materialized in this execution environment
Exact next action: attempt exact-source materialization/service execution; if still unavailable, record BLOCKED_ENVIRONMENT without source page/value claims and proceed to Stage 8 software handover

## Handover in 60 Seconds

### What is now true
- XML contract pinned: `reallaksh19/XML_Compare_Utilities@e7a394fd7f35c34cda5cad13df55cae2dd37bca2`, OpenAPI 1.4.1.
- Controlled EI source: Common commit `fb549185b9b27edc2379734240320a85c5bef9f6`, blob `9d3eccc56429411e17c07a579bdebbd13cb0bdc5`, 10,348,594 bytes; current Common main still has same blob/size.
- Production commands are exposed as `npm run recover:vibration-stage5c-evidence -- discover ...` and `... -- extract ...`.
- Verification command is `npm run verify:vibration-stage5c-evidence`.
- `discover` is advisory only; it writes candidates and requires explicit reviewer page/locator selection later.
- `extract` consumes `VibrationStage5cSelection.v1`, exact source SHA, explicit pages, optional explicit candidate IDs and bounded OCR mode.
- Receipt kernel requires `Observation.v1` + complete `TablePass.v1` source/surface/candidate/cell lineage.
- Accepted evidence produces only `publicationState=CANDIDATE`; review/blocked/not-found produces `publicationState=BLOCKED`.
- Every receipt fixes authority to `engineeringAuthority=NONE`, `screeningAuthority=NOT_AUTHORIZED`, `designAuthority=false`, `masterValuesPublished=false`.
- Numeric disagreement such as `10.0` vs `100` remains `review_required`; confidence cannot promote it.
- Multiple table candidates without explicit candidate selection remain review-required.
- Missing requested candidates, malformed lineage, option drift and authority leakage fail closed.

### What remains unfinished
- Stage 7 actual EI PDF discovery/extraction; environment currently cannot provide the 10 MB binary to the XML service.
- Stage 8 final GitHub changed-file/status audit and final report synchronization.

### What must not be assumed
- local fixture/localhost tests are not controlled-source execution;
- historical #452 printed pages are not validated locators;
- no recovered master row/value exists in #470;
- T3 geometry/location rules and T3 figures are not recovered by the table path.

Highest-risk remaining item: exact-source execution is environment-blocked. No source locator/value may be invented to compensate.
Exact next action: Stage 7 materialization attempt and explicit blocker evidence.

# Mission Status

| Work Item | Priority | Status | Evidence |
|---|---:|---|---|
| XML DocumentEvidence baseline | P0 | ACCEPTED | XML main `e7a394fd...` |
| #452 classification | P0 | DONE | ADAPT/REJECT/DEFER matrix |
| Controlled source Git identity | P0 | VALIDATED | pinned/current Common trees agree |
| Production v2 client | P0 | VALIDATED | combined suite |
| Semantic target profile | P0 | VALIDATED | combined suite |
| Evidence receipt kernel + CLI | P0 | VALIDATED | 17/17 + localhost HTTP smoke |
| Controlled EI API execution | P0 | BLOCKED_ENVIRONMENT | binary unavailable to runtime |
| Chart digitization | P0 | DEFERRED | separate #450 sequence |

# Engineering Item Register

| ID | Type | Status | Summary |
|---|---|---|---|
| DEC-001 | Decision | ACCEPTED | HTTP/schema boundary; no XML runtime copy |
| DEC-002 | Decision | ACCEPTED | semantic IDs never double as PDF locators |
| DEC-003 | Decision | ACCEPTED | v2 structured evidence replaces Markdown parsing |
| DEC-004 | Decision | ACCEPTED | generic evidence authority fields are rejected |
| DEC-005 | Decision | ACCEPTED | geometry/location rule targets cannot enter table path |
| DEC-006 | Decision | ACCEPTED | T3 figures are out of scope |
| DEC-007 | Decision | ACCEPTED | runtime Git-blob recomputation is not claimed when source bytes are unavailable; receipts state this explicitly |
| RISK-001 | Risk | BLOCKED_ENVIRONMENT | exact PDF bytes unavailable through connector/direct network |

# Reuse / Adapt / Reject Matrix

| Historical #452 module | Classification | Reason |
|---|---|---|
| v1 API bridge | ADAPT | replaced with v2 explicit-page table evidence |
| source inventory | ADAPT | provenance constants retained; page hints not authority |
| Markdown reconciliation | REJECT primary path | v2 structured evidence is stronger |
| semantic normalization | DEFER | later reviewed-master publication slice |
| curve targets | REJECT from #470 | separate chart qualification |

# Stage Execution

## Stage 1 — Report initialization
COMPLETE. Report existed before production code.

## Stage 2 — PR allocation
COMPLETE. Draft PR #470 allocated and report renamed.

## Stage 3 — Repository/source verification
COMPLETE. #452 classified; exact source Git object refreshed; binary materialization risk recorded.

## Stage 4 — DocumentEvidence transport
COMPLETE. v2 routes, explicit page validation, source/page binding, OCR mode, generic authority rejection.
Validation: Stage 4 published transport assertions PASS 7/7.

## Stage 5 — Semantic target profile
COMPLETE. Six table-capable Stage 5C targets; explicit reviewer locator/page required; geometry/location and curves fail closed.
Validation: Stage 5 assertions PASS 8/8.

## Stage 6 — Evidence receipt kernel + CLI
COMPLETE.
Files:
- `scripts/vibration-stage5c-evidence-receipt.mjs`
- `scripts/recover-vibration-stage5c-via-document-evidence.mjs`
- `package.json`
- focused tests.
Behavior:
- complete Observation/TablePass lineage required;
- candidate ambiguity/missing candidate fail closed;
- decision state aggregation preserves review/blocked/not-found;
- upstream blocking diagnostics block publication;
- effective OCR options must match request;
- receipts separate evidenceDecision/publicationState/authority;
- actual localhost HTTP discovery exercised through CLI runner.
Validation:
- combined Stage 4–6 Node suite PASS 17/17;
- controlled provider-reported Git identity assertions PASS 2/2;
- localhost HTTP CLI smoke PASS;
- new production modules physical lines: client 159, targets 159, receipt 190, CLI 136 (all <300);
- largest audited function: 38 logical lines (<40 guideline).
Decision: COMPLETE.

## Stage 7 — Controlled-source execution
Current truth: exact source Git object is verified, but large binary bytes are not available to this runtime.
Objective: materialize pinned PDF and run real XML discovery/extraction.
Acceptance: only a run against exact source bytes may be called controlled-source execution.
Failure rule: connector omission/direct-network failure remains BLOCKED_ENVIRONMENT; no historical page hints/values substituted.

## Stage 8 — Final validation/handover
Pending after Stage 7 disposition.

# Changed-File Ledger

| File | Stage | Purpose | Validation |
|---|---:|---|---|
| `agents/PR470_workreport.md` | 1–7 | living engineering report | protocol PASS |
| `scripts/vibration-stage5c-document-evidence-client.mjs` | 4 | fail-closed v2 transport | PASS |
| `scripts/vibration-stage5c-targets.mjs` | 5–6 | domain/source target gate | PASS |
| `scripts/vibration-stage5c-evidence-receipt.mjs` | 6 | lineage + source-target decision kernel | PASS |
| `scripts/recover-vibration-stage5c-via-document-evidence.mjs` | 6 | operator CLI/orchestrator | PASS localhost smoke |
| `tests/vibration-stage5c-document-evidence.test.mjs` | 4–6 | transport/target/source tests | PASS |
| `tests/vibration-stage5c-recovery.test.mjs` | 6 | receipt/CLI tests | PASS |
| `package.json` | 6 | recover/verify commands | JSON write reviewed; commands mirror validated Node invocations |

# Invariant Status

| Invariant | Enforcement | Status |
|---|---|---|
| extraction != engineering authority | receipt authority + publication separation | PASS |
| explicit pages required | client + selection | PASS |
| exact source/page response binding | client | PASS |
| no historical page defaults | target profile | PASS |
| curve/non-table separation | target allowlist | PASS |
| table lineage required | receipt kernel | PASS |
| numeric disagreement fail-closed | decision aggregation | PASS |

# Validation Ledger

## Software
- Node focused suite: PASS 17/17
- localhost HTTP CLI discovery: PASS
- provider-reported Git identity guard: PASS 2/2
- file-size rule: PASS, all new production JS <300 lines
- function-size audit: PASS, maximum 38 logical lines

## Engineering
- authority freeze: PASS
- controlled Git commit/blob/size: PASS
- runtime source SHA/table pages/values: NOT_RUN, pending Stage 7 bytes
- chart data: NOT_APPLICABLE

## Explicitly Not Validated
Exact Stage 5C PDF pages, table values, normalized master rows, geometry/location rule values, chart points, calculation/screening/design authority.

# Deferred Sequence

1. When exact PDF bytes/service runtime are available: run discover -> reviewer explicit page/locator/candidate selection -> extract.
2. Separate future PR: semantic row normalization/reconciliation/master publication.
3. Separate chart qualification: Figures T3-1…T3-4.

# Stage Execution Log

- Stage 1: report before code.
- Stage 2: #470 allocation.
- Stage 3: source/reuse verification.
- Stage 4: transport PASS.
- Stage 5: semantic boundary PASS.
- Stage 6: receipt/CLI PASS 17/17 + localhost HTTP + coding-rule audits.

# Next-Agent Handover

Current stage: Stage 7.
Last completed: Stage 6.
Start here: attempt exact PDF materialization; do not use historical page hints as a substitute.
Known blocker: connected GitHub binary interface omits >1 MB PDF body; direct network access must be tested/recorded separately.
If blocked: update this report with exact evidence and proceed only to Stage 8 software handover; keep PR draft because controlled-source execution remains incomplete.
