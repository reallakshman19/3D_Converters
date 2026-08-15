# PR511 — Vibration Integrity Product Freeze v1

## Recovery Header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: RECOVERABLE
TAKEOVER_AUTHORITY: WRITE_ALLOWED
PR: 511
CRITICALITY: ENGINEERING_CRITICAL
BRANCH: agent/vibration-product-freeze-v1
BASE_MAIN: a49085cde69ef71518c0d6315a615477887d7b4e
PR_HEAD_BEFORE_THIS_REPORT_REFRESH: 4c691b85575b91af2389bd79837c830d24b514d1
BRANCH_RELATION: behind 0
CHANGED_FILES: 11
MISSION: Freeze the current Vibration Integrity UI/workflow contract and add append-only, SHA-256-fingerprinted workflow audit evidence without changing numerical or engineering authority.
MERGE_AUTHORITY: OWNER_ONLY / NOT_GRANTED
CURRENT_STAGE: bounded implementation complete / repository CI infrastructure-blocked
HIGHEST_RISK: orchestration logging or lifecycle centralization accidentally changes result currency, governing-result selection, or mechanism authority
EXACT_NEXT_ACTION: owner/product review of PR511; then obtain a real repository-native Node + Chromium execution when the runner is operational before any merge decision. Do not weaken the gate or reinterpret infrastructure failure as PASS.
```

## Owner Direction

Owner redirected effort away from minuscule numerical refinement toward UI freeze, workflow and logging. PR511 therefore does not pursue further SBC curve tuning. Merged PR #505 remains the governing quarantine for conflicting T3 curve data.

## Live Reconciliation

Initial branch base: `0b03855a6d9031c8b531e23bdd3deea3b7fdc5d4`.

Main advanced during implementation to:

`a49085cde69ef71518c0d6315a615477887d7b4e`

This main includes the EI master framework, Appendix-B candidates and Mechanical T2.3 facility workflow. PR511 was reconciled onto that exact tree using a two-parent commit. Final live-main checks still show `a49085c...`; branch compare remains `behind_by=0`.

## UI Freeze — Visible Contract

`VibrationIntegrityProductFreeze.v1` freezes the current product shape.

### Current workspace tabs — required

```text
screening
mechanical
user-data
```

### Core screening actions — stable IDs

```text
load-benchmark
preflight
run
export
export-evidence
```

### Result-state vocabulary — stable

```text
UNRUN
RUNNING
CURRENT_RESULT
STALE_RESULT
INVALID_INPUT
```

Future mechanism tabs may be added; current tabs/actions/result-state names cannot be silently removed or renamed without failing the contract regression.

### Visible workflow status strip

The existing Working Table status strip now exposes:

```text
Working edits
Readiness: CHECKED / NOT CHECKED
Result: UNRUN / RUNNING / CURRENT_RESULT / STALE_RESULT / INVALID_INPUT
Evidence: AVAILABLE / LOCKED
Audit events: <count>
Last audit: <event type>
Run snapshot: <working-input SHA prefix>
Engineering input: <engineering-input SHA prefix>
```

The previous misleading label `Audit snapshot` was corrected to `Run snapshot`; the actual audit trail is a separate event log.

No new dashboard/card was added; this uses the existing status surface to avoid UI clutter.

## Deterministic Workflow State

`tabs/vibration-integrity-workflow-state.js` centralizes result currency:

```text
RESET                                      -> UNRUN
INPUT_CHANGED + no retained result         -> UNRUN
INPUT_CHANGED + retained result            -> STALE_RESULT
RUN_STARTED                                -> RUNNING
RUN_SUCCEEDED + no drift                   -> CURRENT_RESULT
RUN_SUCCEEDED + drift                      -> STALE_RESULT
RUN_FAILED + no retained result            -> INVALID_INPUT
RUN_FAILED + retained result               -> STALE_RESULT
```

No engineering result is created by the state machine; it only governs currency/status of existing workflow results.

## Append-Only Product Audit Trail

`VibrationIntegrityAuditLog.v1` records immutable, sequence-checked events:

```text
SESSION_STARTED
WORKSPACE_TAB_CHANGED
WORKSPACE_ACTION
BENCHMARK_LOADED
FILE_LOADED
INPUT_CHANGED
USER_DATA_CHANGED
PREFLIGHT_STARTED / SUCCEEDED / FAILED
RUN_STARTED / SUCCEEDED / FAILED
REGISTER_EXPORTED
RUN_EVIDENCE_EXPORT_STARTED / EXPORTED
```

Controlled cross-workspace action categories cover:

```text
mechanical-open
mechanical-evaluate
mechanical-clear
sbc-open
sbc-type3-template
sbc-type3-evaluate
user-data-add-sbc
user-data-add
user-data-delete
```

The log does not capture arbitrary UI text. Each event has monotonic `VI-AUDIT-xxxxxx` identity, validated ISO time, result state, run identity/hash context where available, explicit authority summary and bounded details.

Persisted log validation rejects invalid sequence, event type or timestamp.

## Run Evidence Improvement

Existing `FitRunEvidencePackage.v1` remains the user export contract and gains:

```text
auditTrail: VibrationIntegrityAuditLog.v1 | null

auditTrailIdentity:
  schema    = VibrationIntegrityAuditIdentity.v1
  algorithm = SHA-256
  hash      = SHA-256(canonical audit trail)
```

Therefore `Export run evidence JSON` now captures both engineering execution evidence and a verifiable workflow-history fingerprint.

`RUN_EVIDENCE_EXPORT_STARTED` is included in the exported artifact; `RUN_EVIDENCE_EXPORTED` is appended to the continuing in-session audit after the download call.

Legacy/direct callers without an audit log remain compatible with null audit fields.

## Engineering Authority / Invariants

```text
FIT bounded screening authority                 = unchanged
Mechanical T2.3 candidate authority             = unchanged
SBC Type-3 candidate authority                  = unchanged
SBC T3 curves                                   = BLOCKED_SOURCE_DATA_CONFLICT unchanged
candidate mechanisms replace screening governing = false
designAuthority                                 = false
audit/logging                                   = REPRODUCIBILITY_EVIDENCE_ONLY
```

No equation, master value, tolerance, interpolation/extrapolation, source authority, qualification or governing-selection policy is changed.

## Changed-File Ledger

```text
agents/PR511_workreport.md                                 NEW
scripts/verify-vibration-fit-release.mjs                   +2 controlled tests
tabs/vibration-integrity-audit-log.js                      NEW
tabs/vibration-integrity-input-view.js                     visible workflow/audit status + terminology fix
tabs/vibration-integrity-product-contract.js               NEW
tabs/vibration-integrity-run-evidence.js                   audit trail + SHA-256 identity
tabs/vibration-integrity-tab.js                            state-machine + cross-workspace audit wiring
tabs/vibration-integrity-workflow-state.js                 NEW
tests/vibration-integrity-product-freeze.test.mjs          NEW
tests/vibration-integrity-run-evidence-audit.test.mjs      NEW
tests/vibration-integrity-tab-static.test.mjs              centralized preflight action assertion
```

No edits to:

```text
tabs/vibration-integrity-user-data-shell.js
tabs/vibration-integrity-mechanical-controller.js
tabs/vibration-integrity-mechanical-view.js
tabs/vibration-integrity-view.js
FIT/AIV/SBC/Mechanical calculation kernels
master data values/registries
```

## Backup / Recovery Ledger

Repository-local `node utils/backup.js save` is unavailable in this connector-only runtime and remains `NOT_RUN / ENVIRONMENT_BLOCKED`. Exact pre-edit Git blobs are recorded as recovery evidence:

```text
tabs/vibration-integrity-tab.js               bdc9d16117ccb92806062c3ff3a6abfdb54a9ef8
tabs/vibration-integrity-input-view.js        c6ac077af21da1a7b8938f013573aa6a0289d541
tabs/vibration-integrity-run-evidence.js      783d687a03907796635f3dc9bcfcc0c330c3a155
scripts/verify-vibration-fit-release.mjs       edf6df76bf9689eb7401fd2d12287da1ec939495
tests/vibration-integrity-tab-static.test.mjs 8c623dbb7df57fadcdc4ef1feedde4e9d7d57a98
```

Do not represent the unavailable backup CLI as PASS.

## Validation Ledger

| Check | STATUS | Observation / Oracle |
|---|---|---|
| live main grounding | PASS | main `a49085c...` re-fetched |
| main drift reconciliation | PASS | merge base current main; behind 0 |
| changed-file audit | PASS | 11 intended files |
| existing Mechanical production-file overlap | PASS | no Mechanical controller/view edit |
| current three-tab workspace | PASS_SOURCE_CONTRACT | shell already renders screening/mechanical/user-data |
| visible workflow status strip | PASS_SOURCE_CONTRACT | exact branch source shows Readiness/Evidence/Audit/Run snapshot facts |
| misleading `Audit snapshot` label | FIXED_SOURCE_CONTRACT | replaced by `Run snapshot` |
| deterministic result transition matrix | PASS_BOUNDED_EXECUTION | exact reconstructed authored modules |
| append-only audit sequence/type/time validation | PASS_BOUNDED_EXECUTION | exact reconstructed authored modules |
| cross-workspace audit categories | PASS_BOUNDED_EXECUTION + SOURCE_CONTRACT | event category executed; UI wiring inspected |
| audit SHA-256 identity | PASS_BOUNDED_EXECUTION | recomputed hash equals evidence identity |
| engineering authority boundary | PASS_BOUNDED_EXECUTION | `designAuthority=false`; no authority mutation added |
| static preflight action oracle | UPDATED_ORACLE | asserts centralized constant instead of obsolete duplicate literal |
| FIT/VIB release manifest | PASS_SOURCE_CONTRACT | 54 -> 56 controlled test files |
| repository-native focused Node tests | NOT_RUN / INFRASTRUCTURE_BLOCKED | GitHub job produced no steps |
| repository-native full Node suite | NOT_RUN / INFRASTRUCTURE_BLOCKED | same runner failure before execution |
| Chromium acceptance | NOT_RUN / INFRASTRUCTURE_BLOCKED | same runner failure before execution |

### GitHub Actions evidence

Triggered Mechanical Stage-4 workflow runs include:

```text
31877191099  conclusion=failure  steps=[]
31877244774  conclusion=failure  steps=null
31877494051  conclusion=failure  steps=null
```

The first log retrieval returned `BlobNotFound`; later jobs likewise exposed no executed steps. Classification:

```text
NOT_RUN / INFRASTRUCTURE_BLOCKED
```

This is not a code-test FAIL and is not upgraded to PASS.

## Bounded Exact-Module Execution Receipt

Latest executed receipt after audit hardening:

```json
{"workflow":"PASS","audit":"PASS","auditHash":"PASS","authority":"PASS","events":3}
```

This receipt covers exact reconstructed product-contract/workflow/audit/run-evidence logic, independent transition expectations, persisted-event validation, SHA-256 recomputation and explicit `designAuthority=false`.

It is **not** a repository-native full-suite or browser result.

## Appendix A — Takeover Qualification

### A1 Production Trace — 20/20

Product orchestration remains in `vibration-integrity-tab.js`; calculation/run snapshot authority remains in existing run/controller modules; Mechanical/SBC calculators remain unchanged. Product-state and logging governance sit only at the orchestration/evidence boundary.

### A2 Failure Isolation — 20/20

The change targets UI/workflow observability and result currency, not numerical calculations.

### A3 Authority / Invariant — 20/20

Audit is evidence-only; centralized lifecycle cannot promote candidate/design authority. SBC curve quarantine remains intact.

### A4 Independent Validation — 19/20

Transition, event validation and SHA-256 identity executed independently. One point withheld because repository-native CI/browser execution never started.

### A5 Minimal Patch — 19/20

Three small governance modules, bounded controller/export wiring, one compact existing UI status surface, two new regressions and one strengthened existing source-shape regression. One point withheld pending repository-native execution.

**Total 98/100; all sections >=19/20 — PASS for bounded implementation, not a release-validation PASS.**

## Falsifier / Stop Rule

If repository-native execution later shows any change to calculation output, qualification authority, governing-result selection or CURRENT/STALE semantics relative to current main, quarantine PR511 instead of weakening tests or redefining expected behavior.

## Merge State

PR511 remains draft/open. Merge is **NOT AUTHORIZED**.
