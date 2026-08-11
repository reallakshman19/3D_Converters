# Agent Work Report — PR Pending

## 0. PR Mission Control

| Field | Current state |
|---|---|
| Mission | Add an empirical-weight Sandbox and complete B31.3 factor coverage only where defensible data authority exists. |
| Source task | User request 2026-08-11 |
| PR number | PENDING |
| Branch | `agent/empirical-sandbox-material-db` |
| Base commit | `bd58aa701f25bd3ddc100d19b38c94406e72f4e7` |
| Current HEAD | pending first report commit |
| PR status | Not yet opened |
| Current stage | Stage 1 — report initialization + technical findings |
| Last completed stage | None |
| Engineering status | INVESTIGATING |
| Validation status | NOT_RUN |
| Current blocker | Licensed/public B31.3-2024 numeric S/E/W/Y tables are not present in the repo or exposed by public ASME pages found so far. |
| Exact next action | Open draft PR, rename this report, then implement Sandbox before deciding factor-data publication. |

### Handover in 60 seconds
- **Now true:** Empirical Weight Tuning already has candidate-model editing and a single Approach-2 Preview; B31.3 material identities exist for CS/LTCS/SS/DSS/SDSS.
- **Working on:** New Sandbox showing Exact, Approach 1, Approach 2, and final estimator results for user-selected type/rating/size/target.
- **Unfinished:** Sandbox implementation; source qualification for LTCS/SS/DSS/SDSS S/E/W/Y.
- **Do not assume:** Missing factor values are safe to infer from material family. Public ASME product pages confirm B31.3-2024 but do not expose the licensed tables.
- **Highest risk:** `RISK-001` — publishing guessed B31.3 design factors as engineering authority.
- **Next action:** Allocate PR number and continue Stage 2.

## 1. Mission and Engineering Intent

**Mission:** Improve the Engineering UI so operators can interrogate empirical-weight estimation paths interactively, and improve B31.3 factor coverage without weakening factor provenance or strict fail-closed behavior.

**Engineering consequence:** The Sandbox must make model behavior inspectable before tuning; material-factor completion must never convert unknown code data into implicit design authority.

**Scope:**
- Empirical Weight Tuning Sandbox: target/type/rating/NS selection; show Exact, A1, A2, final estimate; expose A2 component predictions and weights where available.
- Investigate/populate missing LTCS/SS/DSS/SDSS factor data only from controlled/project-approved evidence available to this task.
- Focused tests/docs/report updates.

**Non-goals:** Refit empirical models; change default estimator authority; invent B31.3 factors; bulk reproduce licensed ASME tables.

## 2. Mission Status

| Work Item | Priority | Status | Stage | Evidence |
|---|---|---|---|---|
| Sandbox UI | P0 | NOT_STARTED | 4 | Existing tab inspected |
| Sandbox regression tests | P0 | NOT_STARTED | 4 | — |
| Missing-factor source investigation | P0 | INVESTIGATING | 3/5 | Repo + official ASME search |
| Publish defensible missing factors | P0 | BLOCKED | 5 | `RISK-001`, `QST-001` |

## 3. Engineering Item Register

| ID | Type | Severity/Priority | Status | Summary | Current PR? |
|---|---|---|---|---|---|
| IMP-001 | Improvement | P0 | ACCEPTED | Add multi-approach empirical-weight Sandbox. | Yes |
| RISK-001 | Risk | Critical | OPEN | Unverified B31.3 S/E/W/Y values could become design authority. | Yes |
| QST-001 | Question | P0 | OPEN | Is a controlled/project-approved source for LTCS/SS/DSS/SDSS factor tables available in-repo? | Yes |
| DEC-001 | Decision | P0 | ACCEPTED | Sandbox uses isolated active/candidate estimators; no candidate edit mutates default API authority. | Yes |
| DEC-002 | Decision | P0 | ACCEPTED | Missing B31.3 factors remain fail-closed unless supported by explicit source/status. | Yes |

## 4. Stage Roadmap

| Stage | Status | Purpose | Primary output | Commit |
|---|---|---|---|---|
| 1 | IN_PROGRESS | Report initialization + findings | This report | pending |
| 2 | NOT_STARTED | PR allocation + report sync | `agents/PR<NUMBER>_workreport.md` | — |
| 3 | NOT_STARTED | Changed-file/repository verification + source investigation | Verified scope/data authority | — |
| 4 | NOT_STARTED | Implement empirical Sandbox | Production UI + tests | — |
| 5 | NOT_STARTED | Material-factor data completion decision/implementation | Qualified records or explicit blocker | — |
| 6 | NOT_STARTED | Final validation + closure | Final HEAD evidence | — |

## Stage Execution Log

### Stage 1 — Before
**Current truth:** Main at `bd58aa701f25bd3ddc100d19b38c94406e72f4e7`; PR #425 is merged. Existing empirical Preview compares active vs candidate Approach 2 only. Existing B31.3 master has complete presence only for A106-B benchmark rows; all other requested materials are placeholders.

**Objective:** Establish scope, authority boundary, and implementation stages before production edits.

**Planned validation:** Inspect current source/master; search repo for controlled factor evidence; verify current ASME edition from official source.

### Stage 1 — After
**Implementation performed:** No production code changed. Current UI/master and official ASME product page were inspected.

**Validation performed:**
| Check | Result | Evidence / Notes |
|---|---|---|
| PR #425 merged state | PASS | GitHub reports merged commit `c3433aae...` |
| Current main identified | PASS | `bd58aa701f25bd3ddc100d19b38c94406e72f4e7` |
| B31.3 current public edition | PASS | Official ASME page shows B31.3-2024 |
| Public ASME numeric factor tables available | FAIL | Public product pages do not expose required tables |

**Stage decision:** COMPLETE

**Handover delta:** Newly true: the data-population blocker is explicit. Next stage starts with draft PR allocation.

## 5. Changed-File Ledger

| File | First Stage | Latest Stage | Purpose | Engineering-sensitive? | Validation |
|---|---|---|---|---|---|
| `agents/PR_PENDING_workreport.md` | 1 | 1 | Living work report | No | Content review |

## 6. Engineering Decisions and Invariants

### DEC-001 — Candidate isolation
**Invariant:** Sandbox/candidate tuning must never mutate the default exported empirical estimator/model.
**Enforced by:** `createEmpiricalWeightEstimator({ model: candidate })` on cloned candidate model.
**Validation:** Focused test required in Stage 4.

### DEC-002 — B31.3 fail-closed authority
**Invariant:** Generic family identity does not invent S/E/W/Y; strict resolver accepts only approved/verified data.
**Enforced by:** existing material-factor resolver/status model.
**Validation:** Existing tests plus any new data tests.

## 7. Validation and Evidence Ledger

### Software validation
| Validation | Status | Last HEAD | Evidence |
|---|---|---|---|
| Existing sandbox-related source inspection | PASS | main `bd58aa...` | `tabs/empirical-weight-tuning-tab.js` inspected |
| New implementation tests | NOT_RUN | — | Stage 4 |

### Engineering validation
| Property | Status | Evidence |
|---|---|---|
| B31.3 edition target = 2024 | PASS | Official ASME B31.3 product page |
| LTCS/SS/DSS/SDSS numeric S/E/W/Y authority | NOT_RUN/BLOCKED | No controlled numeric source found yet |

### Explicitly not validated
- No numeric LTCS/SS/DSS/SDSS S/E/W/Y value has been accepted or published.
- No claim that family-level defaults are code-compliant.

## 8. Known / Deferred Work and Forward Sequence

**Open risks:** RISK-001.
**Open questions:** QST-001.

**Recommended sequence:**
1. Allocate PR/report number.
2. Complete repo-level source investigation.
3. Implement and test Sandbox independently of factor-data outcome.
4. Populate only source-qualified factor records; otherwise document the exact blocker and preserve fail-closed placeholders.
5. Reconcile changed files and validate final HEAD.

## 9. Current State vs History
Living sections above must be kept current. Stage Execution Log and closure evidence are append-only.

## 10. Process Notes / Lessons Learned
- Public confirmation that a code edition exists is not evidence for numeric table values.

## 11. Commit and PR Rules
Single PR; logical commits; report updated with implementation state; no merge without explicit instruction; no new CI workflows.

## 12. Unexpected Findings and Stop Conditions
If controlled factor values cannot be sourced, do not silently broaden to secondary/unverified engineering tables. Preserve fail-closed behavior and record the blocker.

## 13. Coding Rules
Prefer named exports/pure functions; no hidden defaults; no speculative abstractions; no authority-changing shim; no unrelated refactors/format churn.

## 14. Action-First Delivery Gate
Sandbox production behavior → real Engineering tab integration → visible per-approach result → focused tests → evidence. Do not substitute schema/governance work for the usable Sandbox.

## Next-Agent Handover
- **Stopping point:** Stage 1 complete; no production edits yet.
- **PR/branch/HEAD:** PR pending; `agent/empirical-sandbox-material-db`; base `bd58aa...`.
- **Start here:** Open draft PR; rename report; inspect repo for controlled B31.3 factor sources, then modify `tabs/empirical-weight-tuning-tab.js`.
- **Do not redo:** PR #425 status and current empirical tab/master inspection.
- **Do not assume:** Missing numeric factors are 1/1/0.4 or any other family default.
- **Known failing checks:** None; new checks not run.
- **Validation still required:** Sandbox behavior/tests; exact branch syntax/tests; factor-source qualification.
- **Highest-risk remaining:** RISK-001.
