# PR Mission Control

Mission: integrate XML_Compare_Utilities DocumentEvidence v1 as the governed Stage 5C source-evidence path for vibration master recovery.
Source task / issue: #450
PR number: #470
Branch: `agent/document-evidence-stage5c`
Base commit: `994f43521b5aa6e4dd397efd9300ce21943d056d`
PR status: OPEN / DRAFT
Current stage: Stage 8 — final validation and handover
Last completed stage: Stage 7 — controlled-source execution disposition
Engineering status: production evidence consumer COMPLETE; controlled EI table recovery NOT EXECUTED because exact PDF bytes are unavailable to this runtime
Validation status: software gates PASS; controlled-source execution BLOCKED_ENVIRONMENT
Current blocker: exact 10,348,594-byte controlled PDF cannot be materialized through the connected GitHub binary interface or direct network from this runtime
Exact next action: final changed-file/status audit; leave PR draft and unmerged until a runtime can execute the exact controlled PDF through the XML service

## Handover in 60 Seconds

### Implemented and validated
- XML contract pinned to `reallaksh19/XML_Compare_Utilities@e7a394fd7f35c34cda5cad13df55cae2dd37bca2`, OpenAPI 1.4.1.
- Controlled EI source Git identity verified independently: `reallaksh19/Common@fb549185b9b27edc2379734240320a85c5bef9f6`, path `EI - AVIFF Guidelines 2nd Edition.pdf`, blob `9d3eccc56429411e17c07a579bdebbd13cb0bdc5`, size 10,348,594 bytes. Current Common main still carries the same blob and size.
- Production v2 client calls only `/v2/tables/discover` and `/v2/tables/extract`.
- Discovery is advisory only; extraction requires exact source SHA-256 and explicit positive unique pages.
- SourceIdentity and returned page set are bound back to the request.
- Domain target profile has no PDF page defaults and no engineering values.
- Supported table-capable targets are SBC fitting span factors, first-span limits, between-main-lines limits, T2.8 valve closure characteristics, T2.9 valve recovery factors, and T4 wall modifier.
- SBC geometry/location score targets are rejected from the table path as `NON_TABLE_RULE_EVIDENCE_REQUIRED`.
- Figures T3-1…T3-4 are rejected from this PR as curve/chart work.
- Evidence receipt kernel requires `Observation.v1` plus complete `TablePass.v1` source/surface/candidate/cell lineage.
- Accepted evidence becomes only `publicationState=CANDIDATE`; review/blocked/not-found becomes `publicationState=BLOCKED`.
- Every receipt fixes `engineeringAuthority=NONE`, `screeningAuthority=NOT_AUTHORIZED`, `designAuthority=false`, `masterValuesPublished=false`.
- Numeric disagreement such as `10.0` versus `100` remains `review_required`; confidence cannot resolve it.
- Multiple unselected candidates remain review-required; missing requested candidates, malformed lineage, option drift and generic authority leakage fail closed.
- Operator commands:
  - `npm run recover:vibration-stage5c-evidence -- discover --api <url> --out <json>`
  - `npm run recover:vibration-stage5c-evidence -- extract --api <url> --selection <json> --out <json>`
  - `npm run verify:vibration-stage5c-evidence`

### Controlled-source execution disposition
Stage 7 did **not** execute the EI PDF. The exact Git object is verified, but byte materialization failed through every available path:
1. Connected GitHub repository-file access exposes the large PDF object metadata but omits its body for this >1 MB binary.
2. Direct Git probe failed before authentication/data transfer: `Could not resolve host: github.com`.
3. Direct raw-HTTP probe failed with name-resolution error.

Therefore:
- `controlledSourceGitIdentity = PASS`
- `controlledSourceBytesExecuted = false`
- `stage5cPdfDiscovery = NOT_RUN`
- `stage5cPdfExtraction = NOT_RUN`
- exact Stage 5C PDF pages/locators/values remain **UNVALIDATED**
- no historical #452 page hint or fixture output is substituted.

### Software validation at final implementation state
- combined Stage 4–6 Node tests: **PASS 17/17**;
- provider-reported controlled Git identity assertions: **PASS 2/2**;
- localhost HTTP CLI discovery round-trip: **PASS**;
- `node --check` on all four production modules: **PASS**;
- physical file-size audit: client 159, targets 159, receipt 190, CLI 136 lines; all <300;
- logical function-size audit: maximum 38 lines; within the Common <40 practical guideline.

## Authority / publication state

```text
source extraction evidence accepted != engineering authority
publicationState=CANDIDATE        != RECONCILED / APPROVED_SCREENING
a worked fixture PASS             != controlled EI source execution
chart digitization PASS           != design authority
```

No master rows or engineering values are published by #470.

# Mission Status

| Work item | Status | Evidence |
|---|---|---|
| XML shared DocumentEvidence baseline | COMPLETE | XML main `e7a394fd...` |
| #452 reuse classification | COMPLETE | ADAPT / REJECT / DEFER matrix |
| controlled source Git identity | PASS | pinned/current Common trees agree |
| production v2 transport | PASS | focused suite |
| semantic Stage 5C table target gate | PASS | focused suite |
| source-target receipt kernel + CLI | PASS | focused suite + localhost HTTP |
| exact controlled EI API execution | BLOCKED_ENVIRONMENT | binary unavailable |
| master normalization/publication | DEFERRED | separate reviewed PR required |
| Figures T3-1…T3-4 digitization | DEFERRED | separate chart qualification |

# Reuse / Adapt / Reject Matrix

| Historical #452 module | Classification | Reason |
|---|---|---|
| `fetch-vibration-master-sections-via-api.mjs` | ADAPT | v1 search/convert replaced by v2 explicit-page table evidence |
| `inventory-vibration-master-sources.mjs` | ADAPT | source constants useful; historical page hints are navigation only |
| `reconcile-vibration-master-tables.mjs` | REJECT primary path | v2 provides stronger structured observations/passes/decisions |
| `normalize-vibration-master-tables.mjs` | DEFER | belongs after independent source-target review in future publication slice |
| curve targets | REJECT from #470 | chart calibration/digitization is a separate qualified process |

# Stage Execution

## Stage 1 — Report initialization
COMPLETE. Living report existed before production code; authority freeze recorded.

## Stage 2 — PR allocation
COMPLETE. Draft PR #470 allocated and report renamed.

## Stage 3 — Repository/source verification
COMPLETE. #452 classified and exact controlled source Git object refreshed.

## Stage 4 — DocumentEvidence v2 transport
COMPLETE. Exact routes/source/pages and generic authority rejection implemented.

## Stage 5 — Semantic target profile
COMPLETE. Table-capable allowlist, explicit reviewer locator/page input, non-table/curve rejection implemented.

## Stage 6 — Evidence receipt kernel + CLI
COMPLETE. Complete evidence lineage validation, state aggregation, authority/publication separation and operator command path implemented.

## Stage 7 — Controlled-source execution
DISPOSITION: `BLOCKED_ENVIRONMENT`.
The exact source object is verified but its bytes cannot be materialized in this runtime. No controlled PDF discovery/extraction result is claimed.

## Stage 8 — Final validation/handover
IN_PROGRESS. Final GitHub changed-file/head/check audit remains; no additional production feature work is planned in this PR.

# Changed-File Ledger

| File | Purpose | Validation |
|---|---|---|
| `agents/PR470_workreport.md` | living engineering handover | protocol/current-state audit |
| `scripts/vibration-stage5c-document-evidence-client.mjs` | fail-closed v2 transport | PASS |
| `scripts/vibration-stage5c-targets.mjs` | controlled source + semantic target gate | PASS |
| `scripts/vibration-stage5c-evidence-receipt.mjs` | lineage + source-target decision kernel | PASS |
| `scripts/recover-vibration-stage5c-via-document-evidence.mjs` | operator CLI/orchestrator | PASS localhost HTTP |
| `tests/vibration-stage5c-document-evidence.test.mjs` | transport/target/source regressions | PASS |
| `tests/vibration-stage5c-recovery.test.mjs` | receipt/CLI regressions | PASS |
| `package.json` | recovery/verification commands | command path exercised by equivalent Node invocation |

# Explicitly Not Validated / Not Published
- exact Stage 5C PDF pages or printed-page mapping;
- any EI table value or normalized master row;
- SBC geometry/location scoring rules;
- Figures T3-1…T3-4 axes/curves/points/interpolation;
- any calculation, screening or design authority.

# Deferred Sequence

1. In a runtime with exact controlled PDF bytes and the XML service, execute `discover` against the pinned bytes.
2. Reviewer explicitly selects exact pages, locator and candidate IDs; then execute `extract` and retain the evidence receipt.
3. Separate PR: independent semantic row normalization/reconciliation and candidate-master publication.
4. Separate PR/program: T3-1…T3-4 calibration/digitization/overlay/error/review.

# Next-Agent Handover

Current stage: Stage 8 final audit.
Software implementation: COMPLETE.
Controlled-source execution: BLOCKED_ENVIRONMENT / NOT_RUN.
Do not merge #470 as a completed Stage 5C recovery release while the exact controlled PDF has not been executed.
Do not infer any source page/value from historical hints or test fixtures.
Exact next action: verify the final GitHub head/change list/check state and leave PR draft with the execution blocker visible.
