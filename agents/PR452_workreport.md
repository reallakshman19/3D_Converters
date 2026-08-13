# PR452 — Vibration Master Source Inventory Work Report

## PR Mission Control

| Field | Current state |
|---|---|
| Mission | Close issue #450's controlled-source inventory gate, recover source-backed vibration master tables without manufacturing values, and keep chart/rule recovery fail-closed until their own evidence gates. |
| Source task / issue | `reallaksh19/3D_Converters#450` |
| PR number | `452` |
| Branch | `agent/vibration-master-source-inventory` |
| Original base | `main@c8aa2786e08a7669b913d0a055ad4c15c6d36b0e` |
| Current upstream main | `092e4055650f605e0b6602388158a34e487e3804` |
| Current HEAD before this report commit | `d6226735ac74b83032d86de66d0b1877e82faa57` |
| PR status | DRAFT / OPEN / MERGE NOT AUTHORIZED |
| Current stage | **Stage 5D — TABLE RECOVERY ONLY** |
| Last completed implementation stage | Stage 5C — document-conversion API bridge |
| Engineering status | Exact source identity/equivalence proven; deterministic materialization and API-consumer paths implemented. Table semantic recovery is now the only active implementation item. |
| Validation status | Inventory + materialization focused gate `15/15 PASS`; API bridge focused gate `10/10 PASS`; Stage 5D table reconciliation tests pending. |
| Current execution boundary | This ChatGPT runtime cannot reach the Owner's `127.0.0.1:8765` service or `/Common` mount. Live EI table values must therefore be accepted only from an API response produced in an environment that can reach the controlled source. |
| Exact next action | Implement evidence-checked table candidate extraction from API conversion Markdown/evidence; then run it against live selected EI pages when the service is reachable. |

## Handover in 60 Seconds

### Controlled source identity

```text
repository: reallaksh19/Common
path: EI - AVIFF Guidelines 2nd Edition.pdf
Git blob: 9d3eccc56429411e17c07a579bdebbd13cb0bdc5
byte length: 10,348,594
retrieval commit: 9e11e1b4ab1ee55f1ad5fd24a8e82994a5442872
adopted historical source commit: fb549185b9b27edc2379734240320a85c5bef9f6
```

Both commit/path entries resolve to the identical blob and size. Governed provenance remains `fb549185…`; `9e11e1b4…` is retrieval-only.

### What is already implemented

- fail-closed source inventory CLI;
- bounded multi-page source ranges and page hashes;
- Appendix-B optional-assumption inventory coverage;
- deterministic Git-object materializer preserving adopted provenance;
- merged `XML_Compare_Utilities` document API bridge for search → explicit page selection → conversion;
- API source size/path/hash checks and conversion Git-blob verification;
- navigation-only corrections for T3 printed page hints;
- no workflow changes and no authority promotion.

### Stage 5D scope

Finish the **table part first**. Active table-like families are:

```text
EI_AVIFF.T3.SBC.FITTING_SPAN_FACTORS.v1
EI_AVIFF.T3.SBC.FIRST_SPAN_LIMITS.v1
EI_AVIFF.T3.SBC.BETWEEN_MAIN_LINES_LIMITS.v1
EI_AVIFF.T2.8.VALVE_CLOSURE_CHARACTERISTICS.v1   # table only if the selected source region actually renders a table
EI_AVIFF.T2.9.VALVE_RECOVERY_FACTORS.v1
EI_AVIFF.T4.WALL_MODIFIER.v1
EI_AVIFF.APPENDIX_B.FLUID_PROPERTY_DEFAULTS.v1   # optional assumption library only
```

Rules/flowcharts and Figure T3-1…T3-4 are explicitly deferred while Stage 5D is active.

### Table recovery acceptance rule

A table candidate may be emitted only when all of the following agree:

1. API conversion source path is the controlled EI PDF.
2. Source size is `10,348,594`.
3. Conversion evidence reports Git blob `9d3eccc…bdc5`.
4. Converted page range equals the explicit caller selection.
5. Saved Markdown SHA-256 equals the API conversion manifest.
6. Evidence contains a corresponding table block and table-render decision.
7. The selected table rendered as deterministic `records`; HTML fallback is not silently parsed.
8. If more than one eligible table exists in the selected range, the table block must be selected explicitly.
9. Extracted cell strings are preserved exactly; no unit/value normalization or inferred headers are introduced in this stage.
10. Output remains a review candidate with frozen authority, not a promoted production master.

### What remains after Stage 5D

- live API execution against the controlled `/Common` PDF;
- exact table candidate values from those API responses;
- target-specific semantic normalization/reconciliation of accepted table candidates;
- source inventory JSON from exact execution if not already produced by the executing environment;
- rule/flowchart recovery;
- independent T3 curve digitization;
- downstream master runtime/calculator qualification;
- separate authority review.

## Authority Freeze

```text
engineeringAuthority = NONE
screeningAuthority   = NOT_AUTHORIZED
designAuthority      = false
```

Existing AIV authority remains independent.

## Mission Status

| Work Item | Priority | Status | Evidence |
|---|---|---|---|
| Living work report | P0 | CURRENT | this file |
| Source identity/equivalence | P0 | VALIDATED | exact blob/size at retrieval + adopted commits |
| Source inventory CLI | P0 | VALIDATED | focused regression |
| Git-object materializer | P0 | VALIDATED | focused regression |
| API search/conversion bridge | P0 | VALIDATED | focused `10/10 PASS` |
| Table candidate reconciliation | P0 | IN_PROGRESS | Stage 5D |
| Live exact EI table extraction | P0 | ENVIRONMENT_BLOCKED | localhost `/Common` service is outside this runtime |
| T3 curve digitization | P0 | DEFERRED | table-first instruction |
| Rule/flowchart recovery | P1 | DEFERRED | table-first instruction |
| Authority promotion | P0 | REJECTED | separate governance event |

## Engineering Item Register

| ID | Type | Priority | Status | Summary |
|---|---|---|---|---|
| ISS-001 | Defect | P0 | RESOLVED | Exact-byte assertion occurs before `pdftotext`. |
| ISS-002 | Defect | P0 | RESOLVED | Multi-page source sections have bounded, fail-closed range evidence. |
| ISS-003 | Defect | P1 | RESOLVED | Stale T3 printed page hints corrected without changing locators. |
| IMP-001 | Improvement | P2 | VALIDATED | Appendix-B source family is optional-assumption inventory only. |
| IMP-002 | Improvement | P0 | VALIDATED | Retrieval/adopted provenance separated with exact blob equivalence. |
| IMP-003 | Improvement | P0 | VALIDATED | Document API bridge verifies source identity before accepting conversion review files. |
| IMP-004 | Improvement | P0 | IN_PROGRESS | Deterministic table-candidate extraction from `records` Markdown + evidence. |
| RISK-001 | Risk | P0 | MITIGATED | Same-name/re-exported source bytes rejected by blob + size checks. |
| RISK-002 | Risk | P0 | MITIGATED | Public discovery receipts omit extracted source text. |
| RISK-003 | Risk | P0 | ACTIVE | Live source data cannot be fetched from Owner localhost by this runtime. |
| RISK-004 | Risk | P0 | MITIGATED | Multiple tables in one selected range must not be guessed; explicit block selection is required when uniqueness is absent. |
| RISK-005 | Risk | P0 | MITIGATED | Complex/HTML table fallback is not silently converted into engineering rows. |
| RISK-006 | Risk | P1 | ACTIVE | Upstream `main` has advanced substantially; integration must be reconciled before closure. |
| DEC-001 | Decision | P0 | ACCEPTED | Preserve `fb549185…` as adopted source provenance. |
| DEC-002 | Decision | P0 | ACCEPTED | No workflow edits for source recovery. |
| DEC-003 | Decision | P0 | ACCEPTED | API search never determines the conversion range automatically. |
| DEC-004 | Decision | P0 | ACCEPTED | Stage 5D emits source-backed table candidates, not promoted engineering masters. |
| DEC-005 | Decision | P0 | ACCEPTED | Chart and rule work pauses until table recovery is closed. |

## Stage Roadmap

### Stages 1–4 — setup and inventory implementation

**COMPLETE.** PR/report setup, repository verification, source inventory CLI and exact-byte sequencing were implemented and validated.

### Stage 5A — range and coverage hardening

**COMPLETE.** Added bounded multi-page ranges, per-page hashes, fail-closed boundaries and Appendix-B coverage.

### Stage 5B — source materialization and locator reconciliation

**PARTIAL / EXECUTION ENVIRONMENT BLOCKED.** Retrieval/adopted source equivalence and deterministic materialization were implemented; exact source execution could not run in the available runner environment.

### Stage 5C — document API source-recovery bridge

**IMPLEMENTATION COMPLETE.** Added `scripts/fetch-vibration-master-sections-via-api.mjs` and focused tests. The bridge uses the merged `XML_Compare_Utilities` `/v1/search` and `/v1/convert` contracts, keeps caller page authority explicit, verifies the exact Git blob on conversion evidence, and stores Markdown/evidence only as review material. Focused result: `10/10 PASS`.

### Stage 5D — table recovery first

**IN_PROGRESS.** Add a deterministic reconciliation layer that maps API `records` rendering back to evidence table blocks, verifies all source/hash/range invariants, and emits exact string-valued table candidates. No chart/rule implementation in this stage.

## Changed-File Ledger

Files already present in PR #452 before Stage 5D:

```text
agents/PR452_workreport.md
package.json
scripts/inventory-vibration-master-sources.mjs
scripts/materialize-vibration-master-source.mjs
scripts/fetch-vibration-master-sections-via-api.mjs
scripts/verify-vibration-fit-release.mjs
tests/vibration-aiv-source-extraction-contract.test.mjs
tests/vibration-master-source-inventory.test.mjs
tests/vibration-master-source-materialization.test.mjs
tests/vibration-master-api-recovery.test.mjs
```

Expected Stage 5D additions/edits:

```text
scripts/reconcile-vibration-master-tables.mjs
tests/vibration-master-table-reconciliation.test.mjs
package.json
scripts/verify-vibration-fit-release.mjs
agents/PR452_workreport.md
```

No `.github/workflows/*` changes.

## Engineering Invariants

- exact source bytes/provenance remain authoritative;
- no mirror-derived value is accepted as master data;
- no benchmark reverse engineering;
- no automatic conversion-page inference;
- no table-block guessing when more than one candidate exists;
- no complex table fallback parsing;
- no numerical coercion, unit inference or nearest-row fallback in Stage 5D;
- no curve points inferred from chart captions/text;
- authority remains `NONE / NOT_AUTHORIZED / false`.

## Validation and Evidence Ledger

| Validation | Status |
|---|---|
| Inventory + materialization focused suites | PASS `15/15` |
| API bridge focused suite | PASS `10/10` |
| Stage 5D table parser/evidence gate | PENDING |
| Live controlled EI table values | NOT_RUN in this runtime |
| Full release suite | NOT_CLAIMED |
| Authority review | NOT_RUN |

## Next-Agent Handover

| Item | Current state |
|---|---|
| PR / branch | `#452` / `agent/vibration-master-source-inventory` |
| Active stage | 5D table recovery only |
| Start here | implement/test table reconciliation from API review bundle |
| Do not start | chart digitization, rule-flow extraction, authority promotion |
| Live execution requirement | environment that can reach `http://127.0.0.1:8765` and `/Common/EI - AVIFF Guidelines 2nd Edition.pdf` |
| Required source identity | blob `9d3eccc…bdc5`, size `10,348,594` |
| Highest risk | treating an ambiguous/multi-table conversion as a unique engineering table |
| Merge authorization | NONE |
