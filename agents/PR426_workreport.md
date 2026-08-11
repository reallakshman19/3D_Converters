# Agent Work Report — PR 426

## 0. PR Mission Control

| Field | Current state |
|---|---|
| Mission | Add an empirical-weight Sandbox and extend B31.3 material-factor coverage without silently changing engineering authority. |
| Source task | User requests 2026-08-11 |
| PR number | 426 |
| Branch | `agent/empirical-sandbox-material-db` |
| Base commit | `bd58aa701f25bd3ddc100d19b38c94406e72f4e7` |
| Current HEAD | `8c5d1df97238a905abc2e48f665f5a33bb7eddff` before this report update |
| PR status | OPEN / DRAFT / MERGEABLE |
| Current stage | Stage 7 — ingest user-supplied B31.3 screening factor basis |
| Last completed stage | Stage 6 — Sandbox reconciliation/handover |
| Engineering status | IN_PROGRESS: Sandbox complete; screening factor data now supplied by Owner |
| Validation status | PARTIAL |
| Current blocker | Supplied S table is stated to be 2016/2018-basis and not independently verified against the project target B31.3-2024 edition. |
| Exact next action | Add supplied S/E/W/Y as `SCREENING`, regenerate runtime registry, add resolver/coverage tests, preserve strict rejection. |

### Handover in 60 seconds
- **Now true:** Empirical Weight Tuning contains a real Sandbox with master-backed target/type/rating/size selectors and Exact/A1/A2/final active-vs-candidate results.
- **Currently being worked on:** Owner supplied numeric S/E/W/Y data for A106-B, A333-6, A312 TP304/TP316, A790 S31803/S32760. Ingest as screening data only.
- **Remains unfinished:** Canonical master/runtime update and tests proving screening resolves while strict continues to fail for unapproved rows.
- **Must not be assumed:** The supplied table is B31.3-2024 verified. User explicitly notes 2016/2018 basis and possible edition differences.
- **Highest-risk remaining item:** `RISK-001` — accidental promotion of screening values into strict design authority.
- **Exact next action:** Edit `docs/Masters/b313-material-factor-master.json`, regenerate runtime data, and test qualification-mode boundaries.

## 1. Mission and Engineering Intent

**Mission:** Make empirical-weight model behavior inspectable before tuning and provide useful B31.3 factor coverage while keeping provenance and qualification explicit.

**Engineering consequence:** Operators can investigate weight estimates interactively. Supplied piping factors become available for screening calculations without being mislabeled as controlled 2024 design authority.

**Scope:**
- Empirical Weight Sandbox API/UI/tests.
- User-supplied S at 20/80/120/300/420 °C where permitted.
- E/W/Y basis at the same temperatures and route-specific E records.
- Explicit `SCREENING` status and user-supplied provenance.
- Strict-mode negative controls.

**Non-goals:** Refit empirical models; claim licensed-table verification; promote screening data to `PROJECT_APPROVED`/`VERIFIED`; invent duplex S at 420 °C.

## 2. Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---|---|---|---|
| Sandbox API | P0 | IMPLEMENTED | 4 | `empirical-weight-sandbox.js` |
| Sandbox UI | P0 | IMPLEMENTED | 4 | `empirical-weight-tuning-tab.js` |
| Sandbox static regression | P0 | VALIDATED | 4 | static UI test PASS |
| Sandbox API regression | P0 | IMPLEMENTED | 4 | committed; exact repo execution previously NOT_RUN |
| Factor source investigation | P0 | DONE | 3/5 | project repo + official ASME public source |
| Owner-supplied factor basis | P0 | ACCEPTED_AS_SCREENING | 7 | user message 2026-08-11 |
| Populate screening S/E/W/Y | P0 | IN_PROGRESS | 7 | pending master/runtime writes |
| Preserve strict authority boundary | P0 | IN_PROGRESS | 7 | tests planned |

## 3. Engineering Item Register

| ID | Type | Severity/Priority | Status | Summary | Current PR? |
|---|---|---|---|---|---|
| IMP-001 | Improvement | P0 | IMPLEMENTED | Multi-approach empirical-weight Sandbox. | Yes |
| RISK-001 | Risk | Critical | IN_PROGRESS | Screening factors must not become strict design authority. | Yes |
| QST-001 | Question | P0 | RESOLVED_PARTIAL | Numeric basis supplied by Owner, but not verified against B31.3-2024 edition of record. | Yes |
| DEC-001 | Decision | P0 | VALIDATED | Sandbox active/candidate estimators remain isolated. | Yes |
| DEC-002 | Decision | P0 | VALIDATED | Missing/unqualified factor data fails closed in strict mode. | Yes |
| DEC-003 | Decision | P0 | ACCEPTED | Store newly supplied factor rows as `SCREENING`, not approved/verified. | Yes |
| RISK-002 | Risk | High | OPEN | E varies by manufacturing/weld construction; resolver must use explicit route records rather than generic E rows. | Yes |
| RISK-003 | Risk | High | OPEN | Duplex S31803/S32760 are intentionally not assigned S at 420 °C per supplied basis. | Yes |

### DEC-003 — Qualification of supplied data
**Observed:** User supplied numeric values and table references but states the S data are 2016/2018-basis and warns that code editions can differ.

**Decision:** Persist data with `status: SCREENING` and `sourceAuthority: USER_SUPPLIED_ENGINEERING_SCREENING_BASIS`. Do not mark `PROJECT_APPROVED` or `VERIFIED`.

**Consequence:** `qualificationMode: screening` can use the rows. `strict` remains unchanged and will reject them unless later reviewed/promoted.

### RISK-002 — E construction specificity
For A312/A790 records, E is route-specific: seamless 1.00; EFW double-butt 0.85; EFW single-butt 0.80; EFW with 100% RT 1.00 according to the supplied basis. No generic E row should match all routes.

### RISK-003 — Duplex high-temperature exclusion
Do not create S records at 420 °C for S31803 or S32760. Expected screening resolution at 420 °C is incomplete with missing `S`.

## 4. Stage Roadmap

| Stage | Status | Purpose | Primary output | Commit/evidence |
|---|---|---|---|---|
| 1 | COMPLETE | Report initialization + findings | initial report | `db6ee98d...` |
| 2 | COMPLETE | PR allocation + report sync | `agents/PR426_workreport.md` | PR #426 |
| 3 | COMPLETE | Repository/source verification | authority decision | repo + official ASME search |
| 4 | COMPLETE | Implement Sandbox | API/UI/tests | commits through Sandbox implementation |
| 5 | COMPLETE_AS_BLOCKED | Initial factor completion decision | fail-closed blocker | no source then available |
| 6 | COMPLETE | Sandbox reconciliation/handover | clean 6-file diff | `8c5d1df...` |
| 7 | IN_PROGRESS | Ingest Owner-supplied screening factors | canonical master/runtime/tests | current |
| 8 | NOT_STARTED | Final validation + reconciliation | final HEAD evidence | — |

## Stage Execution Log

### Stages 1–6 — historical summary
PR #426 established the living report, investigated factor authority, implemented the Empirical Weight Sandbox, added API/static tests, and reconciled the Sandbox-only diff. At Stage 5 numeric factor publication was correctly blocked because no acceptable basis was then available.

### Stage 7 — Before
**Current truth:** Owner has now supplied S/E/W/Y values and stated their source basis/caveats. ASME public pages confirm B31.3-2024 exists, but do not independently expose the licensed numeric tables. Existing resolver supports `screening` status and exact temperature lookup.

**Objective:** Make the supplied data usable for screening without weakening strict design-authority behavior.

**Scope:**
- `docs/Masters/b313-material-factor-master.json`
- generated `converters/b313-material-factors/default-b313-material-factor-data.js`
- `tests/b313-material-factors.test.mjs` and/or focused new screening test
- work report / PR description

**Engineering rationale:** A user-supplied engineering basis is useful for model screening, but the stated edition caveat prevents truthful promotion to strict authority.

**Planned implementation:**
1. Add S records at 20/80/120/300/420 °C as supplied; omit duplex 420 °C S.
2. Add E/W/Y at the supplied temperatures.
3. Make E route-specific. Use explicit route tokens `SEAMLESS`, `EFW_DOUBLE_BUTT`, `EFW_SINGLE_BUTT`, `EFW_100_PERCENT_RT` for SS/DSS/SDSS; CS/LTCS only `SEAMLESS` from this basis.
4. Mark all new rows `SCREENING` with source reference to the Owner-supplied 2026-08-11 basis.
5. Remove covered material IDs from coverage placeholders where appropriate.
6. Regenerate runtime registry deterministically.

**Expected behavior:**
- Screening mode resolves all four factors for supported material/temperature/route combinations.
- Strict mode does not accept these rows.
- S31803/S32760 at 420 °C remain incomplete due to missing S.
- EFW routes select their explicit E factor instead of a generic 1.0.

**Edge cases:** Generic `SS` identity remains ambiguous; exact temperatures only; no interpolation added; no 420 °C duplex S; unsupported E route remains incomplete.

**Planned validation:** Master/runtime drift check; factor resolver tests for LTCS/SS/DSS/SDSS; strict negative control; route-specific E controls; duplex 420 °C negative control.

**Known risks:** Edition drift versus B31.3-2024 (`RISK-001`); route nomenclature mismatch (`RISK-002`).

## 5. Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---|---|---|---|---|
| `agents/PR426_workreport.md` | 2 | 7 | Living report | No | current-state review |
| `converters/empirical-weight/empirical-weight-sandbox.js` | 4 | 4 | Sandbox production API | Yes | syntax PASS; API test committed |
| `converters/empirical-weight/index.js` | 4 | 4 | Public Sandbox exports | Yes | source review |
| `tabs/empirical-weight-tuning-tab.js` | 4 | 4 | Sandbox UI | Yes | syntax/static PASS |
| `tests/empirical-weight-sandbox.test.mjs` | 4 | 4 | Sandbox API regression | No | previously NOT_RUN exact repo |
| `tests/empirical-weight-sandbox-ui-static.test.mjs` | 4 | 4 | UI wiring regression | No | PASS |
| `docs/Masters/b313-material-factor-master.json` | 7 | 7 | Canonical screening S/E/W/Y | Yes | planned generator/tests |
| `converters/b313-material-factors/default-b313-material-factor-data.js` | 7 | 7 | Generated runtime registry | Yes | planned drift check |
| B31.3 factor regression test file | 7 | 7 | Qualification/route controls | No | planned |

## 6. Engineering Decisions and Invariants

### DEC-001 — Candidate isolation
Candidate empirical tuning never mutates the default model/estimator.

### DEC-002 — B31.3 strict fail-closed authority
Strict mode accepts only `VERIFIED` / `PROJECT_APPROVED`. Stage 7 must not change this.

### DEC-003 — Screening ingestion
New Owner-supplied rows are `SCREENING` until edition-of-record engineering review promotes them.

## 7. Validation and Evidence Ledger

### Software validation
| Validation | Status | Last HEAD | Evidence |
|---|---|---|---|
| Sandbox UI static behavior | PASS | pre-Stage-7 | 1/1 static test |
| Sandbox API behavior test | NOT_RUN | pre-Stage-7 | committed; full checkout unavailable previously |
| Material master/runtime drift | NOT_RUN | — | Stage 7 |
| Screening factor resolver tests | NOT_RUN | — | Stage 7 |

### Engineering validation
| Property | Status | Evidence |
|---|---|---|
| Project target edition = B31.3-2024 | PASS | official ASME product page |
| Supplied factor basis captured | PASS | Owner message 2026-08-11 |
| Supplied numbers verified against controlled 2024 edition | NOT_RUN | Owner explicitly warns of edition differences |
| Strict design authority for new rows | NOT_APPLICABLE | rows intentionally `SCREENING` |

### Explicitly not validated
- No claim that supplied 2016/2018-basis S values are identical to B31.3-2024.
- No interpolation behavior is introduced or validated.
- No duplex S at 420 °C is accepted.

## 8. Known / Deferred Work and Forward Sequence

1. Complete Stage 7 screening ingestion and qualification-mode tests.
2. Review source/edition mapping against controlled B31.3-2024.
3. If accepted by project engineering, promote exact records to `PROJECT_APPROVED` or `VERIFIED` with controlled source reference.
4. Re-run Preview B31.3 integration tests after any promotion.

## 9. Current State vs History
Living sections above reflect current truth; Stage Execution Log is historical.

## 10. Process Notes / Lessons Learned
- Public confirmation of a code edition is not evidence for licensed numeric material tables.
- User-supplied values with explicit edition caveats should be captured at a qualification level that preserves the caveat instead of being discarded or over-promoted.

## 11. Commit and PR Rules
Single PR; report updated before meaningful implementation commits; no merge without explicit instruction; no new CI workflows.

## 12. Unexpected Findings and Stop Conditions
If route semantics or supplied numbers conflict with the resolver/master schema, record and fail closed rather than applying a generic factor.

## 13. Coding Rules
No hidden defaults, no silent engineering fallback, no speculative abstraction, no unrelated refactor.

## 14. Action-First Delivery Gate
Sandbox remains operator-visible. Stage 7 adds real screening behavior through the production B31.3 resolver, not merely documentation.

## Next-Agent Handover
- **PR / branch:** #426 / `agent/empirical-sandbox-material-db`.
- **Current stage:** Stage 7 before implementation.
- **Start here:** `docs/Masters/b313-material-factor-master.json`; add Owner-supplied rows as `SCREENING`, regenerate runtime, then write route/qualification tests.
- **Do not redo:** Sandbox implementation or initial public-source search.
- **Do not assume:** supplied values are 2024-verified.
- **Highest risk:** `RISK-001` strict-authority leakage.
- **Exact next action:** canonical master edit with explicit screening provenance.
