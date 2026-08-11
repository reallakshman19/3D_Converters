# Agent Work Report — PR 426

## 0. PR Mission Control

| Field | Current state |
|---|---|
| Mission | Add Empirical Weight Sandbox and extend B31.3 material-factor coverage without weakening engineering authority. |
| Source task | User requests 2026-08-11 |
| PR number | 426 |
| Branch | `agent/empirical-sandbox-material-db` |
| Base commit | `bd58aa701f25bd3ddc100d19b38c94406e72f4e7` |
| Current HEAD | `10d12f962aa41955671fc70e0aaa7a9fd448abfa` before this report update |
| PR status | OPEN / DRAFT / MERGEABLE |
| Current stage | Stage 7 — screening factor ingestion + resolver authority fix |
| Last completed stage | Stage 6 — Sandbox reconciliation/handover |
| Engineering status | IN_PROGRESS |
| Validation status | PARTIAL |
| Current blocker | Supplied stress basis is stated as 2016/2018-basis and is not independently verified against project edition B31.3-2024. |
| Exact next action | Fix `exact()` so absent manufacturing route cannot select a route-qualified E row, then validate screening/strict behavior. |

### Handover in 60 seconds
- **Now true:** Sandbox is implemented. Canonical screening basis, generator expansion, runtime registry, and factor tests are now authored on the branch.
- **Currently being worked on:** `ISS-001` route authority defect discovered during Stage 7 validation.
- **Remains unfinished:** resolver fix; final branch tests/reconciliation; work-report closure.
- **Must not be assumed:** supplied values are 2024-verified; missing route must never imply seamless E=1.0.
- **Highest-risk remaining:** `RISK-001` strict-authority leakage / route-authority leakage.
- **Exact next action:** edit `converters/b313-material-factors/index.js`, then rerun focused screening tests.

## 1. Mission and Engineering Intent

**Mission:** Make empirical-weight estimates inspectable and make Owner-supplied B31.3 factor data usable for screening while preserving strict design authority.

**Engineering consequence:** Operators can compare Exact/A1/A2/final weights, and engineers can evaluate supplied S/E/W/Y without those rows being mislabeled as controlled B31.3-2024 data.

**Scope:** Sandbox API/UI/tests; compact screening basis; deterministic runtime expansion; route-specific E; strict-mode negative controls; duplex 420 °C exclusion.

**Non-goals:** Refit empirical models; claim 2024 verification; promote `SCREENING` to `PROJECT_APPROVED`/`VERIFIED`; interpolate S; invent duplex S at 420 °C.

## 2. Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---|---|---|---|
| Sandbox API/UI | P0 | IMPLEMENTED | 4 | production API + Engineering tab |
| Sandbox static regression | P0 | VALIDATED | 4 | static UI test PASS |
| Owner screening basis | P0 | IMPLEMENTED | 7 | canonical master + generated runtime |
| Screening resolver tests | P0 | IMPLEMENTED | 7 | `tests/b313-material-factors.test.mjs` |
| Strict authority boundary | P0 | IN_PROGRESS | 7 | strict negative control authored |
| Route-specific E authority | P0 | IN_PROGRESS | 7 | `ISS-001` fix pending |

## 3. Engineering Item Register

| ID | Type | Severity/Priority | Status | Summary | Current PR? |
|---|---|---|---|---|---|
| IMP-001 | Improvement | P0 | IMPLEMENTED | Multi-approach empirical-weight Sandbox. | Yes |
| ISS-001 | Defect | Critical | ACCEPTED / IN_PROGRESS | Missing manufacturing route is treated as wildcard and can select a route-qualified E row. | Yes |
| RISK-001 | Risk | Critical | IN_PROGRESS | Screening factors must not become strict design authority. | Yes |
| RISK-002 | Risk | High | IN_PROGRESS | E varies by construction; route identity must be explicit. | Yes |
| RISK-003 | Risk | High | VALIDATED_BY_DATA_MODEL | No duplex S at 420 °C. | Yes |
| QST-001 | Question | P0 | RESOLVED_PARTIAL | Owner supplied numeric basis, but edition-of-record 2024 verification remains outstanding. | Yes |
| DEC-001 | Decision | P0 | VALIDATED | Sandbox candidate estimator remains isolated from active model. | Yes |
| DEC-002 | Decision | P0 | VALIDATED | Strict mode accepts only `VERIFIED` / `PROJECT_APPROVED`. | Yes |
| DEC-003 | Decision | P0 | IMPLEMENTED | New supplied rows are `SCREENING`. | Yes |
| DEC-004 | Decision | P0 | ACCEPTED | Route-qualified factor records require an explicit matching request route; absent route only matches route-agnostic records. | Yes |

### ISS-001 — Missing-route wildcard
**Stage discovered:** Stage 7 validation.

**Affected component:** `converters/b313-material-factors/index.js`, helper `exact()`.

**Observed behavior:** Existing predicate `!v || !r[k] || match` means an absent requested route (`v` empty) accepts every route-specific record. With new A312/A790 E rows, an unspecified route can therefore pick the first E record, currently seamless E=1.0.

**Engineering consequence:** A welded pipe with unknown construction could receive an unjustified quality factor.

**Chosen resolution:** For each extra discriminator: if request value exists, allow an exact matching row or a route-agnostic row; if request value is absent, only allow a route-agnostic row. This keeps generic W/Y behavior while preventing route-specific E defaulting.

**Validation required:** SS no-route and unknown-route must fail with missing E; explicit `SEAMLESS`, `EFW_DOUBLE_BUTT`, `EFW_SINGLE_BUTT`, and `EFW_100_PERCENT_RT` must resolve expected E.

## 4. Stage Roadmap

| Stage | Status | Purpose | Primary output | Evidence |
|---|---|---|---|---|
| 1 | COMPLETE | Report initialization | living report | historical |
| 2 | COMPLETE | PR allocation/report sync | PR #426 report | historical |
| 3 | COMPLETE | Source/repo investigation | factor authority gate | historical |
| 4 | COMPLETE | Empirical Sandbox | API/UI/tests | implemented |
| 5 | COMPLETE_AS_BLOCKED | Initial DB decision before basis supplied | fail-closed state | historical |
| 6 | COMPLETE | Sandbox reconciliation | clean Sandbox diff | historical |
| 7 | IN_PROGRESS | Screening basis + resolver authority | data/generator/runtime/tests/fix | current |
| 8 | NOT_STARTED | Final validation/reconciliation | final HEAD evidence | — |

## Stage Execution Log

### Stages 1–6 — historical summary
PR #426 established the report, investigated B31.3 authority, implemented the Empirical Weight Sandbox, added tests, and reconciled the initial Sandbox diff. Missing factor publication was originally blocked because no acceptable basis was available.

### Stage 7 — Before
**Current truth:** Owner supplied S/E/W/Y values with explicit 2016/2018 edition caveat. Project target remains B31.3-2024. Existing resolver supports `SCREENING` and exact temperatures.

**Objective:** Ingest the supplied basis for screening only and prove it cannot leak into strict or wrong-route calculations.

**Expected files:** canonical master, generator, generated runtime, B31.3 factor tests, resolver, report/PR description.

**Engineering rationale:** Preserve useful supplied data and provenance while failing closed where edition, route, temperature, or qualification is unresolved.

**Planned validation:** generator drift; resolver route cases; strict rejection; duplex 420 °C missing S; coverage expansion; existing benchmark preservation.

### Stage 7 — Mid-stage finding
Canonical basis and deterministic expansion were implemented. Validation review discovered `ISS-001`; resolver fix is required before Stage 7 can complete.

## 5. Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---|---|---|---|---|
| `agents/PR426_workreport.md` | 2 | 7 | Living report | No | current |
| `converters/empirical-weight/empirical-weight-sandbox.js` | 4 | 4 | Sandbox API | Yes | syntax/test authored |
| `converters/empirical-weight/index.js` | 4 | 4 | Sandbox exports | Yes | source review |
| `tabs/empirical-weight-tuning-tab.js` | 4 | 4 | Sandbox UI | Yes | syntax/static PASS |
| `tests/empirical-weight-sandbox.test.mjs` | 4 | 4 | Sandbox API regression | No | exact repo previously NOT_RUN |
| `tests/empirical-weight-sandbox-ui-static.test.mjs` | 4 | 4 | Sandbox UI regression | No | PASS |
| `docs/Masters/b313-material-factor-master.json` | 7 | 7 | Compact Owner screening basis | Yes | generator/test pending final |
| `scripts/generate-b313-material-factors.mjs` | 7 | 7 | Expand compact basis deterministically | Yes | local reconstructed write/check PASS |
| `converters/b313-material-factors/default-b313-material-factor-data.js` | 7 | 7 | Generated runtime registry | Yes | local reconstructed drift PASS |
| `tests/b313-material-factors.test.mjs` | 7 | 7 | screening/strict/route regression | No | authored; execution pending final |
| `converters/b313-material-factors/index.js` | 7 | 7 | route-authority fix | Yes | pending |

## 6. Engineering Decisions and Invariants

### DEC-001 — Candidate isolation
Candidate empirical tuning never mutates the active estimator.

### DEC-002 — Strict fail closed
`strict` accepts only `VERIFIED` / `PROJECT_APPROVED`; `SCREENING` is never design authority.

### DEC-003 — Screening ingestion
Owner-supplied factor table is retained with `SCREENING`, `basisId`, and explicit edition caveat.

### DEC-004 — Route discriminator invariant
A route-qualified E record cannot be selected unless the request supplies the same route. Route-agnostic W/Y records may match any route.

## 7. Validation and Evidence Ledger

### Software validation
| Validation | Status | Last HEAD | Evidence |
|---|---|---|---|
| Sandbox static UI | PASS | pre-Stage-7 | 1/1 |
| Compact master -> runtime deterministic generation | PASS (local reconstruction) | authored state | `--write` then `--check` |
| Screening factor tests | NOT_RUN | current branch | execution pending resolver fix |
| B31.3 resolver syntax | NOT_RUN | — | pending fix |

### Engineering validation
| Property | Status | Evidence |
|---|---|---|
| Project target B31.3 edition = 2024 | PASS | official ASME product page |
| Supplied numeric basis captured | PASS | Owner message 2026-08-11 |
| Values verified against controlled 2024 edition | NOT_RUN | Owner states 2016/2018 basis and possible edition drift |
| Strict authority for new rows | NOT_APPLICABLE | intentionally SCREENING |
| Duplex 420 °C S | EXPLICITLY_UNAVAILABLE | no S record generated |

### Explicitly not validated
No claim is made that the supplied S values are unchanged in B31.3-2024. No interpolation is activated.

## 8. Known / Deferred Work and Forward Sequence

1. Fix and validate `ISS-001`.
2. Complete Stage 7 resolver/data tests and drift check.
3. Reconcile actual PR changed files.
4. Future controlled B31.3-2024 review may promote selected records to `PROJECT_APPROVED`/`VERIFIED`.

## 9. Current State vs History
Living sections are current; Stage Execution Log preserves history.

## 10. Process Notes / Lessons Learned
- Route-specific data exposed a pre-existing wildcard behavior that was harmless with one benchmark row but unsafe with real E variants.
- User-supplied values with edition caveats should be stored at a qualification level that preserves the caveat.

## 11. Commit and PR Rules
Single PR; report kept current; no merge without explicit instruction; no new CI workflows.

## 12. Unexpected Findings and Stop Conditions
Authority ambiguity fails closed rather than selecting a convenient factor.

## 13. Coding Rules
No hidden defaults, no silent engineering fallback, no unrelated refactor.

## 14. Action-First Delivery Gate
Production Sandbox is visible; screening factor basis is consumed by the real B31.3 resolver; tests target activated behavior.

## Next-Agent Handover
- **PR / branch:** #426 / `agent/empirical-sandbox-material-db`.
- **Current stage:** Stage 7, resolver authority fix pending.
- **Start here:** `converters/b313-material-factors/index.js`, helper `exact()`; implement DEC-004 then run `tests/b313-material-factors.test.mjs`.
- **Do not redo:** Sandbox implementation or canonical basis generation.
- **Do not assume:** missing route = seamless.
- **Known failing checks:** none executed yet against final Stage 7 branch; `ISS-001` is a known logic defect pending fix.
- **Highest risk:** `ISS-001` / `RISK-001`.
- **Exact next action:** route-matching fix plus focused negative tests.
