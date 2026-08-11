# Agent Work Report — PR 426

## 0. PR Mission Control

| Field | Current state |
|---|---|
| Mission | Add an empirical-weight Sandbox and extend B31.3 factor coverage only where defensible source authority exists. |
| Source task | User request 2026-08-11 |
| PR number | 426 |
| Branch | `agent/empirical-sandbox-material-db` |
| Base commit | `bd58aa701f25bd3ddc100d19b38c94406e72f4e7` |
| Current HEAD | `3a968857cadd8f736abfa0604bd65581876c48df` before this report update |
| PR status | OPEN / DRAFT / MERGEABLE |
| Current stage | Stage 6 — final validation + handover |
| Last completed stage | Stage 5 — material-factor completion decision |
| Engineering status | PARTIAL: Sandbox implemented; missing B31.3 numeric data blocked by source authority |
| Validation status | PARTIAL |
| Current blocker | No controlled/project-approved numeric B31.3-2024 S/E/W/Y source for LTCS/SS/DSS/SDSS is available in-repo or on the public official ASME pages checked. |
| Exact next action | If a controlled table/export is supplied, populate the missing factor rows in this PR or a follow-up; otherwise review/merge the Sandbox-only capability. |

### Handover in 60 seconds
- **Now true:** Empirical Weight Tuning contains a real Sandbox with master-backed target/type/rating/size choices and side-by-side Exact, A1, A2, and final estimates for active vs candidate models. A2 detail shows A1-prior, collaborative-ratio, cross-ratio predictions and effective weights.
- **Currently worked on:** Final reconciliation/validation only.
- **Unfinished:** Numeric LTCS/SS/DSS/SDSS B31.3 S/E/W/Y population.
- **Do not assume:** `E=1`, `W=1`, `Y=.4`, or any S value is valid simply because a pipe is seamless or belongs to a family. No missing factor was published.
- **Highest risk:** `RISK-001` — guessed code values becoming design authority.
- **Exact next action:** Obtain controlled B31.3-2024 factor data (or Owner-approved project basis) for A333-6, A312 TP304/TP316, A790 S31803/S32760, then add records with explicit provenance/status.

## 1. Mission and Engineering Intent

**Mission:** Make empirical-weight model behavior inspectable before tuning and improve B31.3 factor coverage without weakening fail-closed engineering authority.

**Engineering consequence:** Operators can now see why a weight was arrived at across all estimator paths. Material-factor coverage remains honest: unresolved code data stays unresolved instead of becoming an implicit default.

**Scope delivered:**
- Sandbox production API + Engineering UI.
- Real master-backed selectors.
- Active/candidate comparison.
- A2 contributor/weight inspection.
- Focused sandbox tests/static wiring checks.
- Controlled source investigation for missing B31.3 data.

**Explicit non-goals:** Refit weight models; change active estimator authority; bulk reproduce licensed ASME tables; infer code factors from family labels.

## 2. Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---|---|---|---|
| Sandbox API | P0 | IMPLEMENTED | 4 | `empirical-weight-sandbox.js` |
| Sandbox UI | P0 | IMPLEMENTED | 4 | `empirical-weight-tuning-tab.js` |
| Sandbox static regression | P0 | VALIDATED | 4 | local `node --test` equivalent PASS |
| Sandbox API regression | P0 | IMPLEMENTED | 4 | committed test; exact repo execution NOT_RUN |
| Missing-factor source investigation | P0 | DONE | 3/5 | repo + official ASME search |
| Publish missing LTCS/SS/DSS/SDSS factors | P0 | BLOCKED | 5 | `RISK-001`, `QST-001` |

## 3. Engineering Item Register

| ID | Type | Severity/Priority | Status | Summary | Current PR? |
|---|---|---|---|---|---|
| IMP-001 | Improvement | P0 | IMPLEMENTED | Add multi-approach empirical-weight Sandbox. | Yes |
| RISK-001 | Risk | Critical | BLOCKED | Unverified B31.3 S/E/W/Y values could become design authority. | Yes |
| QST-001 | Question | P0 | BLOCKED | Controlled/project-approved numeric factor source is not available to this task. | Yes |
| DEC-001 | Decision | P0 | VALIDATED | Sandbox uses isolated active/candidate estimators; default API authority unchanged. | Yes |
| DEC-002 | Decision | P0 | VALIDATED | Missing B31.3 factors remain fail-closed without explicit source/status. | Yes |

### RISK-001 detail
**Observed:** The material master has identities for A333-6, A312 TP304/TP316, A790 S31803/S32760 but numeric S/E/W/Y placeholders remain empty.

**Engineering consequence:** Filling those rows from memory or uncontrolled third-party sources could make strict design calculations appear code-qualified when they are not.

**Resolution:** Do not publish guessed values. Require controlled B31.3-2024/project-approved data and provenance.

**Closure evidence:** No material-factor master/runtime file changed in PR #426.

## 4. Stage Roadmap

| Stage | Status | Purpose | Primary output | Commit/evidence |
|---|---|---|---|---|
| 1 | COMPLETE | Report initialization + findings | Pending report | `db6ee98d...` |
| 2 | COMPLETE | PR allocation + report sync | `agents/PR426_workreport.md` | allocated PR #426 |
| 3 | COMPLETE | Repository/source verification | Data-authority decision | repo + official ASME search |
| 4 | COMPLETE | Implement Sandbox | API/UI/tests | commits through `3a968857...` |
| 5 | BLOCKED | Material-factor numeric completion | Controlled rows | source authority unavailable |
| 6 | IN_PROGRESS | Final validation + closure | final evidence | current |

## Stage Execution Log

### Stage 1 — COMPLETE
No production code changed. Current UI/master inspected. Official ASME source confirms B31.3-2024; public product pages do not expose numeric S/E/W/Y tables.

### Stage 2 — COMPLETE
Draft PR #426 allocated; living report renamed to `agents/PR426_workreport.md`.

### Stage 3 — COMPLETE
**Investigation performed:** searched current repo/project piping-class masters and material-factor docs/tests for controlled numeric factor evidence; searched official ASME public pages for the current edition and material-factor tables.

**Result:** Project files establish material identity, schedule, wall, corrosion, etc., but not controlled B31.3 numeric S/E/W/Y. Official public ASME pages establish edition/scope but do not expose the licensed numeric tables. Third-party searchable datasets were not accepted as engineering authority.

**Stage decision:** COMPLETE with `QST-001`/`RISK-001` blocked.

### Stage 4 — COMPLETE
**Before:** Existing UI had a Preview comparing only active vs candidate Approach 2, with free-form rating/NS.

**Implementation performed:**
- Added `listEmpiricalWeightSandboxOptions()` using the real frozen model + built-in weight master.
- Added `evaluateEmpiricalWeightSandbox()` returning Exact, A1, A2, final paths for active and candidate models plus deltas.
- Exported the new Sandbox API.
- Replaced Preview navigation with Sandbox.
- Sandbox uses select controls for target, type, rating, and NS based on real available data.
- Added arrived-weight summary table and A2 contributor details.
- Added focused API and static UI tests.

**Validation performed:**
| Check | Result | Evidence / Notes |
|---|---|---|
| `node --check` authored Sandbox API | PASS | local reconstructed authored file |
| `node --check` authored tuning tab | PASS | local reconstructed authored file |
| Static Sandbox UI assertions | PASS | local equivalent `node --test`: 1/1 PASS after correcting test regex |
| Exact repository `tests/empirical-weight-sandbox.test.mjs` | NOT_RUN | Full repo checkout unavailable because runtime cannot resolve `github.com` |
| Candidate isolation invariant | IMPLEMENTED | API constructs separate estimators from active/candidate model arguments |

**Stage decision:** COMPLETE.

### Stage 5 — BLOCKED
**Objective:** Fill missing LTCS/SS/DSS/SDSS S/E/W/Y.

**Result:** No acceptable controlled numeric source is available. The following remain intentionally missing:

| Family | Material | Spec | Grade | S | E | W | Y |
|---|---|---|---|---|---|---|---|
| LTCS | LTCS-A333-6 | ASTM A333 | 6 | missing | missing | missing | missing |
| SS | SS-A312-TP304 | ASTM A312 | TP304 | missing | missing | missing | missing |
| SS | SS-A312-TP316 | ASTM A312 | TP316 | missing | missing | missing | missing |
| DSS | DSS-A790-S31803 | ASTM A790 | UNS S31803 | missing | missing | missing | missing |
| SDSS | SDSS-A790-S32760 | ASTM A790 | UNS S32760 | missing | missing | missing | missing |

**Stage decision:** BLOCKED rather than publishing unsupported values.

## 5. Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---|---|---|---|---|
| `agents/PR426_workreport.md` | 2 | 6 | Living report | No | reconciled |
| `converters/empirical-weight/empirical-weight-sandbox.js` | 4 | 4 | Sandbox production API/options | Yes | syntax PASS; API test committed |
| `converters/empirical-weight/index.js` | 4 | 4 | Public Sandbox exports | Yes | source review |
| `tabs/empirical-weight-tuning-tab.js` | 4 | 4 | Sandbox UI | Yes | syntax + static assertions PASS |
| `tests/empirical-weight-sandbox.test.mjs` | 4 | 4 | API regression | No | NOT_RUN exact repo |
| `tests/empirical-weight-sandbox-ui-static.test.mjs` | 4 | 4 | UI wiring regression | No | local equivalent PASS |

## 6. Engineering Decisions and Invariants

### DEC-001 — Candidate isolation
**Must remain true:** Candidate tuning cannot mutate the default empirical model/estimator.
**Enforced by:** Sandbox constructs separate estimators using explicit active/candidate model arguments.
**Validated by:** committed isolation test; structural code review. Exact repo test remains NOT_RUN.

### DEC-002 — B31.3 fail-closed authority
**Must remain true:** Generic material identity does not invent S/E/W/Y; only qualified records/explicit overrides may supply them.
**Enforced by:** existing resolver/status contract; PR #426 does not change the factor master.
**Validated by:** changed-file reconciliation confirms no B31.3 factor-data file changed.

## 7. Validation and Evidence Ledger

### Software validation
| Validation | Status | Last HEAD | Evidence |
|---|---|---|---|
| Sandbox API syntax | PASS | authored state | `node --check` local reconstruction |
| Sandbox UI syntax | PASS | authored state | `node --check` local reconstruction |
| Sandbox UI static behavior | PASS | authored state | local `node --test` 1/1 |
| Sandbox API behavior test | NOT_RUN | branch | committed test requires full repo materialization |
| Branch changed-file comparison | PASS | `3a968857...` | exactly 6 intended files |

### Engineering validation
| Property | Status | Evidence |
|---|---|---|
| B31.3 target edition = 2024 | PASS | Official ASME B31.3 product page |
| Material identities | PASS | existing project masters |
| Missing numeric S/E/W/Y engineering authority | BLOCKED | no controlled source available |
| Strict fail-closed behavior preserved | PASS | no factor-master/runtime modification |

### Explicitly not validated
- No numeric LTCS/SS/DSS/SDSS factor value has been qualified or published.
- Full branch Node test suite was not executed in this runtime.

## 8. Known / Deferred Work and Forward Sequence

**Blocked engineering data:** `RISK-001`, `QST-001`.

**Recommended next sequence:**
1. Supply controlled B31.3-2024 material-factor export/table or Owner-approved project factor basis.
2. Add exact temperature/material/product/route records with source reference and `PROJECT_APPROVED`/`VERIFIED` status.
3. Regenerate `default-b313-material-factor-data.js` using the existing generator.
4. Run material-factor tests + Preview B31.3 integration tests at final HEAD.
5. Only then declare the coverage table complete for strict design authority.

## 9. Current State vs History
Living sections above are current; Stage Execution Log is historical.

## 10. Process Notes / Lessons Learned
- Public confirmation of code edition/scope is not evidence for licensed numeric material tables.
- A UI test initially failed because the regex expected escaped quotes rather than the literal source text; the test was corrected and rerun successfully.

## 11. Commit and PR Rules
Single PR; no merge without explicit instruction; no new CI workflows.

## 12. Unexpected Findings and Stop Conditions
The missing DB request is materially constrained by unavailable controlled code data. Scope was not silently broadened to third-party engineering tables.

## 13. Coding Rules
No hidden defaults, no silent engineering fallback data, no speculative abstraction; Sandbox API has a real UI consumer in the same PR.

## 14. Action-First Delivery Gate
**Operator-visible capability achieved:** Engineering → Empirical Weight Tuning → Sandbox → choose target/type/rating/NS → see Exact/A1/A2/final active/candidate weights and A2 contributor details.

## Next-Agent Handover
- **PR / branch / HEAD:** #426 / `agent/empirical-sandbox-material-db` / `3a968857...` before report update.
- **Last completed:** Stage 5 decision (BLOCKED for factor-data authority).
- **Current:** Stage 6 final validation/review.
- **Start here:** If controlled B31.3 data becomes available, start at `docs/Masters/b313-material-factor-master.json`; do not modify Sandbox unless review finds a defect.
- **Do not redo:** Repo/public source search or Sandbox implementation.
- **Do not assume:** any missing S/E/W/Y numeric value.
- **Files currently involved:** six files in Changed-File Ledger.
- **Known failing checks:** None known. API test execution is NOT_RUN, not FAIL.
- **Validation still required:** full repo `node --test tests/empirical-weight-sandbox.test.mjs tests/empirical-weight-sandbox-ui-static.test.mjs` when checkout/runtime permits.
- **Open questions:** `QST-001`.
- **Highest-risk remaining:** `RISK-001`.
- **Exact next recommended action:** obtain controlled factor data; otherwise review PR #426 as Sandbox-only production improvement with explicit DB blocker.
