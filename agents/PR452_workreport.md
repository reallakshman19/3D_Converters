# PR452 — Vibration Master Source Inventory Work Report

## PR Mission Control

| Field | Current state |
|---|---|
| Mission | Close issue #450's controlled-source inventory gate, recover source-backed vibration master material without weakening fail-closed behavior, and keep authority separate from recovery. |
| Source task / issue | `reallaksh19/3D_Converters#450` |
| PR number | `452` |
| Branch | `agent/vibration-master-source-inventory` |
| Original base | `main@c8aa2786e08a7669b913d0a055ad4c15c6d36b0e` |
| Current upstream main | `fbe7f1a4ec27087997df0ef717a62faf7bbb2f8e` — later AIV UI/network work; final integration recheck still required. |
| Current HEAD | `cdad4efb06423b2813216a87a0bf50c338938031` before this report commit |
| PR status | DRAFT / OPEN / MERGE NOT AUTHORIZED |
| Current stage | **Stage 5C — DocumentConversionApi controlled-source recovery bridge** |
| Last completed stage | Stage 5A — inventory coverage/range hardening; Stage 5B remains PARTIAL because exact execution could not run in the prior environment. |
| Engineering status | Exact source identity and retrieval/adopted equivalence are proven; deterministic Git materializer is validated; Stage 5C is introducing an evidence-checked API path for exact PDF search and bounded conversion. |
| Validation status | Existing inventory + materialization focused gate **15/15 PASS**; Stage 5C candidate API-consumer focused gate **9/9 PASS locally before branch publication**; exact EI API execution still NOT_RUN in this ChatGPT runtime. |
| Current blocker | The merged document-conversion service is localhost/filesystem scoped. This ChatGPT runtime cannot access the user's `127.0.0.1:8765` service or `/Common` mount. |
| Exact next action | Publish the thin API consumer/test bridge, then run `discover` against the exact `/Common/EI - AVIFF Guidelines 2nd Edition.pdf`; require explicit page selections; run bounded `/v1/convert`; accept review material only if conversion evidence reports Git blob `9d3eccc…bdc5`. |

## Handover in 60 Seconds

### Controlled source identity

```text
repository: reallaksh19/Common
path: EI - AVIFF Guidelines 2nd Edition.pdf
Git blob: 9d3eccc56429411e17c07a579bdebbd13cb0bdc5
byte length: 10,348,594

retrieval commit:
  9e11e1b4ab1ee55f1ad5fd24a8e82994a5442872

adopted historical source commit retained in governed provenance:
  fb549185b9b27edc2379734240320a85c5bef9f6
```

Both commit/path entries resolve to the identical Git blob and size. Retrieval reachability does not rewrite the adopted historical source commit.

### What Stage 5B established

- exact-byte-before-extraction invariant;
- bounded single/multi-page inventory locators with hashes;
- deterministic Git-object materializer;
- retrieval/adopted commit equivalence;
- T3 navigation-page correction:

```text
Table T3-1  -> printed p81
Table T3-2  -> printed p81
Table T3-3  -> printed p82
Figure T3-1 -> printed p82
Figure T3-2 -> printed p83
Figure T3-3 -> printed p83
Figure T3-4 -> printed p84
```

Focused result before Stage 5C:

```text
inventory source/locator/range/navigation   11 / 11 PASS
source materialization/provenance            4 /  4 PASS
combined                                    15 / 15 PASS
```

No locator regex, master value, source state or authority field was weakened/promoted by the navigation correction.

### Why the previous exact run stayed blocked

The local runner had no GitHub egress; connector binary APIs did not expose the 10.3 MB PDF; and the existing controlled-source GitHub Actions job did not acquire a runner because the repository Actions budget prevented further use. That red check was environmental, not a source/locator failure.

### New Stage 5C execution path

`reallaksh19/XML_Compare_Utilities#972` is merged. Its service provides:

```text
POST /v1/search
POST /v1/convert
GET  /healthz
GET  /v1/capabilities
```

The service is controlled-filesystem only (`remoteSourceFetch = false`), uses original 1-based PDF pages, supports native + OCR search, and preserves evidence/provenance. Conversion evidence includes `sourceGitBlobSha`, so PR #452 can independently reject a same-name/wrong PDF after conversion.

Stage 5C consumer policy:

1. Search the exact `/Common/EI - AVIFF Guidelines 2nd Edition.pdf` by literal section/table/figure labels.
2. Store only sanitized discovery metadata in any public receipt: page, bbox, extraction source, OCR confidence, search/index hashes. Do not publish search snippets/line text.
3. Search never selects conversion pages automatically.
4. A caller-reviewed selection file supplies explicit `start`/`end` pages.
5. Bounded `/v1/convert` uses `tableMode=records`, OCR auto, engineering regions auto, and `images=skip`.
6. Reject the conversion before writing review material unless:

```text
source.sizeBytes == 10348594
evidence.sourceGitBlobSha == 9d3eccc56429411e17c07a579bdebbd13cb0bdc5
pageRange == explicitly selected range
```

7. Raw Markdown/evidence is a private review bundle; it is not automatically a governed master dataset.
8. Table values can be reconciled from bounded Markdown/evidence after source validation.
9. T3 curves remain `FIGURE_DIGITIZATION_REQUIRED`. API v1 intentionally supports `images=skip` only, so it cannot by itself recover numerical curve points.

### What remains unfinished

- live `/v1/search` against the exact controlled EI PDF;
- explicit caller page selection from real search hits;
- bounded `/v1/convert` against the exact source;
- exact source inventory JSON derived from real execution;
- reconciliation of geometry and T2.9 locator adequacy;
- governed table/rule extraction;
- controlled T3 figure render + independent dual digitization;
- source register/master runtime/calculator qualification;
- separate authority review.

### What must not be assumed

A merged converter is not engineering authority. A search match is not a source-qualified master. A bounded Markdown conversion is not numerical qualification. Chart captions/OCR do not establish curve coordinates. Existing AIV authority is independent from this vibration-master program.

## Mission and Engineering Intent

The source-inventory/recovery path is an anti-drift gate. It must bind every recovered value/rule/curve to the exact controlled PDF and explicit source page evidence before production engineering data is published.

Stage 5C exists only to overcome the transport/execution limitation from Stage 5B using the already-merged controlled document-conversion capability. It does not change the adopted source or authority model.

## Authority Freeze

```text
engineeringAuthority = NONE
screeningAuthority   = NOT_AUTHORIZED
designAuthority      = false
```

No source search/conversion event may change these fields. Any authority transition is a separate reviewed governance change after master recovery and mechanism qualification.

## Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---|---|---|---|
| Living work report | P0 | CURRENT | 1–5C | this file |
| Exact source constants | P0 | VALIDATED | 4–5B | blob + size tests |
| Inventory CLI | P0 | VALIDATED | 4–5B | 11/11 focused inventory suite |
| Git materializer | P0 | VALIDATED | 5B | 4/4 focused materialization suite |
| Retrieval/adopted source equivalence | P0 | VALIDATED | 5B | both commits resolve identical blob/size |
| T3 printed-page hints | P1 | VALIDATED | 5B | navigation regression |
| Prior controlled runner | P0 | ENVIRONMENT_BLOCKED | 5B | Actions budget prevented job start |
| DocumentConversionApi implementation | P0 | AVAILABLE / MERGED | 5C | `XML_Compare_Utilities#972` |
| Stage 5C API consumer | P0 | IN_PROGRESS | 5C | candidate focused 9/9 PASS before publication |
| Live exact-source API search | P0 | NOT_RUN | 5C | localhost service inaccessible to this runtime |
| Live exact-source bounded conversion | P0 | NOT_RUN | 5C | requires explicit real page selection |
| Exact `source-inventory-v1.json` | P0 | NOT_STARTED | 5C | must be derived from real exact-source evidence |
| Governed table/rule recovery | P0/P1 | NOT_STARTED | after exact source evidence | no manufactured values |
| T3 curve digitization | P0 | NOT_STARTED | after source-page confirmation | API v1 has no figure binary transport |
| Authority promotion | P0 | REJECTED IN THIS PR STAGE | all | separate governance event |

## Engineering Item Register

| ID | Type | Priority | Status | Summary |
|---|---|---|---|---|
| ISS-001 | Defect | P0 | RESOLVED | Exact source assertion now executes before `pdftotext`. |
| ISS-002 | Defect | P0 | RESOLVED | Bounded multi-page sections and per-page hashes added. |
| ISS-003 | Defect | P1 | RESOLVED | T3 printed-page hints corrected; regexes unchanged. |
| IMP-001 | Improvement | P2 | VALIDATED | Appendix-B optional defaults represented as inventory-only source family. |
| IMP-002 | Improvement | P0 | VALIDATED | Git-object materializer separates retrieval commit from adopted provenance. |
| IMP-003 | Improvement | P0 | IN_PROGRESS | Add fail-closed DocumentConversionApi search/conversion bridge. |
| RISK-001 | Risk | P0 | MITIGATED | Wrong/same-name bytes rejected by blob + size gates. |
| RISK-002 | Risk | P0 | MITIGATED | Public search receipts omit extracted EI text/snippets. |
| RISK-003 | Risk | P0 | MITIGATED | Curve targets never become inferred numerical datasets. |
| RISK-004 | Risk | P1 | ACTIVE | Upstream main advanced; final integration/rebase check required. |
| RISK-005 | Risk | P0 | ACTIVE | This runtime cannot connect to the user's localhost API or `/Common` mount. |
| RISK-006 | Risk | P0 | ACTIVE | API v1 has no binary figure transport; curve digitization still needs controlled render tooling. |
| DEC-001 | Decision | P0 | ACCEPTED | Preserve `fb549185…` as adopted source provenance. |
| DEC-002 | Decision | P0 | ACCEPTED | Use `9e11e1b4…` only as retrieval/materialization identity for the same blob. |
| DEC-003 | Decision | P0 | ACCEPTED | Search result pages are discovery evidence; caller selection remains explicit. |
| DEC-004 | Decision | P0 | ACCEPTED | Conversion review material is accepted only after `sourceGitBlobSha` and byte-size verification. |
| DEC-005 | Decision | P0 | ACCEPTED | Raw converted Markdown/evidence is private review material, not automatically public master data. |
| QST-001 | Question | P0 | OPEN | Which current inventory locators are unique against the exact real source? |
| QST-002 | Question | P0 | OPEN | Does T3 geometry require visual/manual rule reconciliation? |
| QST-003 | Question | P0 | OPEN | Where exactly is T2.9 `FL` represented in native/OCR/image content? |

## Stage Roadmap / Decisions

### Stages 1–4 — Setup + controlled inventory implementation

**COMPLETE.** Work report, PR allocation, baseline verification, source inventory CLI, exact-byte gate and focused tests delivered. Initial extraction-order defect was fixed before closure.

### Stage 5 — Exact controlled-source execution

**BLOCKED / NOT_RUN** in the first execution environment because exact bytes could not be materialized locally.

### Stage 5A — Range/coverage hardening

**COMPLETE.** Added bounded page ranges, page hashes, fail-closed boundary handling, and Appendix-B target coverage. Focused inventory result reached 10/10 PASS.

### Stage 5B — Exact-source materialization + locator reconciliation

**PARTIAL / ENVIRONMENT_BLOCKED.** Added deterministic Common Git materialization, retrieval/adopted equivalence checks, CI bridge, Actions-budget diagnosis, and corrected navigation-only T3 page hints. Combined focused result reached 15/15 PASS. Exact PDF execution did not occur.

### Stage 5C — DocumentConversionApi controlled-source recovery bridge

**IN_PROGRESS.**

The merged API implementation in `reallaksh19/XML_Compare_Utilities#972` is the selected execution interface.

Planned production files:

```text
scripts/fetch-vibration-master-sections-via-api.mjs
tests/vibration-master-api-recovery.test.mjs
package.json
scripts/verify-vibration-fit-release.mjs
agents/PR452_workreport.md
```

No `.github/workflows/*` changes.

Candidate focused validation before branch publication:

```text
9 tests / 9 PASS / 0 FAIL
```

Covered candidate behaviors:

- catalogue includes T3 table/figure families plus T2.8/T2.9/T4;
- exact `/v1/search` request contract;
- sanitized search receipts omit line/snippet source text;
- explicit bounded `/v1/convert` request contract;
- `images=skip` enforced;
- exact Git blob required from conversion evidence;
- authority remains frozen;
- curve conversions remain digitization-required;
- wrong source blob fails before raw Markdown/evidence files are written;
- accepted source writes private review bundle only after identity passes.

Stage 5C cannot be closed until the live API is reachable from an execution environment containing `/Common/EI - AVIFF Guidelines 2nd Edition.pdf`.

## Changed-File Ledger

Before Stage 5C production publication, the PR contains the prior eight intended files:

| File | First Stage | Latest Stage | Purpose |
|---|---|---|---|
| `agents/PR452_workreport.md` | 1 | 5C | living mission/validation/handover |
| `package.json` | 4 | 5B | inventory + materialization commands |
| `scripts/inventory-vibration-master-sources.mjs` | 4 | 5B | source inventory/range/hash anti-drift |
| `scripts/materialize-vibration-master-source.mjs` | 5B | 5B | exact Git materialization |
| `scripts/verify-vibration-fit-release.mjs` | 4 | 5B | focused release-manifest integration |
| `tests/vibration-aiv-source-extraction-contract.test.mjs` | 5B | 5B | existing controlled-source runner bridge |
| `tests/vibration-master-source-inventory.test.mjs` | 4 | 5B | inventory regressions |
| `tests/vibration-master-source-materialization.test.mjs` | 5B | 5B | materialization regressions |

Stage 5C will add exactly the two API consumer files and one command/manifest line each unless exact live evidence later proves a locator defect.

## Engineering Decisions and Invariants

- **Exact source identity:** expected blob `9d3eccc…bdc5`, size `10,348,594`.
- **Historical provenance stability:** retrieval commit does not replace adopted source commit.
- **Search is discovery only:** no automatic page authority.
- **Explicit page range:** bounded conversion requires caller-selected pages.
- **Conversion source proof:** `evidence.sourceGitBlobSha` must equal expected blob before review files are accepted.
- **Public receipt minimization:** search line text/snippets are omitted from public receipts.
- **Raw review isolation:** converted Markdown/evidence is review input, not automatic master publication.
- **No reverse engineering:** worked examples cannot be used to infer missing source masters.
- **No curve invention:** API chart text does not create points; T3 curves require independent digitization.
- **Locator fail-closed:** zero/multiple/mis-bounded results remain blocked.
- **Authority freeze:** `NONE / NOT_AUTHORIZED / false`.

## Validation and Evidence Ledger

### Software validation

| Validation | Status | Evidence |
|---|---|---|
| Inventory suite | PASS | 11/11 |
| Materialization suite | PASS | 4/4 |
| Combined pre-5C focused gate | PASS | 15/15 |
| Stage 5C API-consumer candidate | PASS_LOCAL | 9/9 before branch publication |
| Live API health/capabilities from this runtime | FAIL_ENVIRONMENT | localhost connection refused |
| `/Common` mount in this runtime | NOT_AVAILABLE | source not mounted |
| Exact API search/conversion | NOT_RUN | requires reachable service + exact mounted source |

### Engineering validation

| Property | Status |
|---|---|
| Retrieval path metadata blob/size | PASS |
| Adopted historical path metadata blob/size | PASS |
| Retrieval/adopted blob equivalence | PASS |
| Wrong bytes blocked before old extraction path | PASS |
| Wrong API conversion blob blocked before review-file write | PASS_LOCAL_CANDIDATE |
| Real search page matches | NOT_RUN |
| Real bounded table conversion | NOT_RUN |
| Real geometry/T2.9 locator adequacy | NOT_RUN |
| Any recovered master numerical value | NOT_VALIDATED |
| Any T3 curve coordinate | NOT_VALIDATED |
| Screening/design authority | NOT_AUTHORIZED |

## Known / Deferred Work and Forward Sequence

1. Publish Stage 5C API consumer + focused regression.
2. In a runtime that can reach the merged service and `/Common`, run API discovery.
3. Review `pagesWithMatches` and provide explicit page selections; do not auto-infer ranges.
4. Convert selected table/rule pages with evidence and exact Git-blob verification.
5. Reconcile source inventory locators from real evidence.
6. Publish only governed table/rule datasets after row-level reconciliation.
7. Render confirmed T3 figure pages with controlled image tooling and perform independent dual digitization.
8. Create governed source register/master resolver only after real master data exists.
9. Complete mechanism qualification, mutation/boundary validation, and result-staleness tests.
10. Perform authority review as a separate governance event.

## Next-Agent Handover

| Item | Current state |
|---|---|
| PR / branch | #452 / `agent/vibration-master-source-inventory` |
| Current stage | 5C — API controlled-source recovery bridge |
| Last fully completed stage | 5A; 5B partial due environment |
| Source identity | exact blob/size proven at retrieval + adopted commits |
| Start here | publish/test API consumer, then run live discovery where localhost service + `/Common` are available |
| Do not redo | inventory byte-order fix, range hardening, materializer, T3 hint reconciliation |
| Do not assume | search match = governed source; Markdown = qualified master; chart text = curve data |
| Highest-risk remaining item | accepting source-derived values without exact conversion evidence and explicit page authority |
| Open QST-* | QST-001, QST-002, QST-003 |
| Merge | NOT AUTHORIZED |

## Stage Execution Log

### Stages 1–4

Report/PR/baseline setup and controlled inventory implementation completed. Exact-byte sequencing defect corrected. Focused validation reached 7/7 PASS.

### Stage 5

Exact-source execution blocked by source transport in the original runtime; no substitute PDF accepted.

### Stage 5A

Range anti-drift, per-page hashes and Appendix-B coverage added. Focused validation reached 10/10 PASS.

### Stage 5B

Deterministic Git-object materializer, retrieval/adopted equivalence, controlled-runner bridge and T3 navigation corrections added. Combined focused validation reached 15/15 PASS. GitHub Actions did not start because of Actions budget; exact extraction remained NOT_RUN.

### Stage 5C

Owner supplied the merged `XML_Compare_Utilities#972` document search/conversion capability for source recovery. This report was updated before branch publication of the API consumer. Candidate consumer tests are 9/9 PASS locally. Live exact-source calls remain pending because this ChatGPT runtime cannot reach the user's localhost service or `/Common` mount.
