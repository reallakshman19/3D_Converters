# PR511 — Vibration Integrity Production Freeze v1

## Recovery Header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: RECOVERABLE
TAKEOVER_AUTHORITY: WRITE_ALLOWED
PR: 511
CRITICALITY: ENGINEERING_CRITICAL
BRANCH: agent/vibration-product-freeze-v1
BASE_MAIN: a49085cde69ef71518c0d6315a615477887d7b4e
TECHNICAL_HEAD_BEFORE_REPORT: 24c57af444daa8e0917866dd88e8c83b8acfc43e
BRANCH_RELATION: behind 0
MISSION: Production-freeze Vibration Integrity by exercising the real user journey in Chromium, comparing each engineering result to a controlled worked-example benchmark, fixing one observed issue at a time, and retaining screenshots + machine-readable receipts before moving to the next workflow.
MERGE_AUTHORITY: OWNER_ONLY / NOT_GRANTED
CURRENT_STAGE: PRODUCTION_FREEZE_BLOCKED
FREEZE_STATE: BLOCKED
HIGHEST_RISK: treating source/unit validation as product freeze when Chromium evidence did not execute
EXACT_NEXT_ACTION: obtain an executing Chromium run for the current PF-001..PF-007 journey, inspect the uploaded screenshots/receipt, fix the first user-visible defect found, replay the same benchmark journey, and only then decide FROZEN vs another bounded fix. Do not move to the next workflow while this journey is BLOCKED.
```

## Owner Direction — Production Freeze

Owner clarified the required operating model:

```text
DO AS A USER IN CHROMIUM
    ↓
SEE / CAPTURE THE ISSUE
    ↓
FIX ONE BOUNDED ISSUE
    ↓
RE-RUN THE SAME USER JOURNEY
    ↓
VALIDATE AGAINST KNOWN BOOK / WORKED-EXAMPLE BENCHMARK
    ↓
RECORD SCREENSHOTS + ACTUAL/EXPECTED + AUTHORITY + EVIDENCE
    ↓
FREEZE THAT WORKFLOW
    ↓
MOVE NEXT
```

Minuscule numerical refinement below the controlled engineering tolerance is not a reason to delay this process unless it changes the benchmark disposition, authority boundary, or user decision.

Source inspection, unit tests and static UI tests are supporting evidence only. They cannot establish `FROZEN` status.

Durable protocol: `docs/vibration/Production-Freeze-Protocol-v1.md`.

## Freeze-State Vocabulary

```text
NOT_STARTED
OBSERVED
FIXED_UNVERIFIED
BENCHMARK_PASS
FROZEN
BLOCKED
```

`BLOCKED` is never represented as PASS.

## Current User Journey — PF-001 to PF-007

The current Chromium gate is `scripts/validate-vibration-production-freeze-browser.mjs`.

### PF-001 — Open product as user

```text
Engineering Calculations
  -> VIB
  -> VIB.FIV.FLOW_TURBULENCE
  -> Vibration Integrity workspace
```

Evidence target: `01-workspace.png`.

### PF-002 — Load controlled FIT worked example

Benchmark:

```text
id       EI-D2-FIT-RECYCLE-SUCTION-6IN
label    EI D2 · Recycle suction · 6 in gas
source   Common@fb549185b9b27edc2379734240320a85c5bef9f6
path     EI - AVIFF Guidelines 2nd Edition_Examples.pdf
blob     3e2517d0df527a051084fc02e69cb7afa31f8d47
location Appendix D, Example D2, D.2.1 Steps 1-5
expected standard LOF 0.276
tolerance ±0.0012
expected band LOF_LT_0_3
```

Evidence target: `02-benchmark-loaded.png`.

### PF-003 — Check readiness

Expected controlled state:

```text
Ready     1
Not ready 0
```

Evidence target: `03-readiness.png`.

### PF-004 — Run FIT and benchmark visible result

The browser parses the **visible** `Actual standard LOF` from the benchmark panel and requires:

```text
abs(actual - 0.276) <= 0.0012
Actual band = LOF_LT_0_3
Benchmark parity PASS visible
```

Evidence target: `04-fit-result.png`.

### PF-005 — Evaluate Mechanical T2.3

Known EI D2 / D2.4 oracle:

```text
CENTRIFUGAL_COMPRESSOR                    0.20
ELECTRIC_MOTOR_OR_ALTERNATOR_GE_15KW     0.40
Governing                                 0.40
```

Controlled source package:

```text
Advanced_Analysis@6111ddbc0f27dd95b50a80c569a2c4daba3b3921
docs/EI data/Appendix_B_Defaults_and_Fluid_Properties.md
blob 1d26832aa3ba1e2a99f680ea3d8243490e0ffeb6
```

Repository independent oracles retained in:

```text
tests/vibration-appendix-b-worked-example-stage3.test.mjs
tests/vibration-mechanical-ei-worked-examples.test.mjs
```

Evidence target: `05-mechanical-result.png`.

### PF-006 — Verify authority in the real matrix

Required visible semantics:

```text
FIT remains Screening governing
Mechanical 0.4 remains CANDIDATE / CANDIDATE MASTER
Mechanical candidate cannot replace Screening governing
designAuthority = false
```

Evidence target: `06-governing-matrix.png`.

### PF-007 — Export and verify reproducibility evidence

The browser downloads the actual user export and verifies:

```text
vibration-fit-run-evidence.json
auditTrail present
auditTrailIdentity.algorithm = SHA-256
auditTrailIdentity.hash = 64 hex chars
RUN_EVIDENCE_EXPORT_STARTED present in exported trail
designAuthority = false
```

After successful download, the live UI must show `RUN_EVIDENCE_EXPORTED` as the latest audit state.

Evidence target: `07-evidence-exported.png`.

## Production-Freeze Receipt

The browser writes:

`artifacts/vibration-production-freeze/production-freeze-receipt.json`

Schema:

`VibrationProductionFreezeReceipt.v1`

Each PF step records:

```text
step id
name
PASS / FAIL
screenshot
visible observation
benchmark expected / actual / tolerance / delta where applicable
authority assertion where applicable
```

Failure captures `99-failure.png` where possible.

CI uploads all screenshots, the receipt, downloaded run-evidence JSON and server log with `if: always()` so a failed product journey remains inspectable.

## Issue Ledger

### ISS-PF-001 — export audit status can remain visually stale

```text
Detection class: SOURCE_DETECTED / CHROMIUM_CONFIRMATION_PENDING
Affected step: PF-007
Symptom predicted from source: successful export appends REGISTER_EXPORTED / RUN_EVIDENCE_EXPORTED but did not re-render the visible workflow-status strip.
Expected user behaviour: after export, Audit events / Last audit update immediately without another navigation action.
Root cause: missing render() after successful export audit append.
Fix: tabs/vibration-integrity-tab.js now re-renders after REGISTER_EXPORTED and RUN_EVIDENCE_EXPORTED.
Fix commit: 24c57af444daa8e0917866dd88e8c83b8acfc43e
Benchmark impact: none; engineering result and authority unchanged.
Chromium after-fix evidence: NOT_RUN / INFRASTRUCTURE_BLOCKED
Freeze disposition: FIXED_UNVERIFIED
```

This issue is **not** claimed as Chromium-observed. The new PF-007 gate is specifically intended to prove or falsify the predicted visible defect/fix when Chromium executes.

## Current UI / Workflow Contract

Required current workspace tabs:

```text
screening
mechanical
user-data
```

Stable core screening actions:

```text
load-benchmark
preflight
run
export
export-evidence
```

Stable result states:

```text
UNRUN
RUNNING
CURRENT_RESULT
STALE_RESULT
INVALID_INPUT
```

Visible state strip:

```text
Working edits
Readiness
Result
Evidence
Audit events
Last audit
Run snapshot
Engineering input
```

The previous ambiguous label `Audit snapshot` was corrected to `Run snapshot`; audit history is now a separate append-only event trail.

## Deterministic Result Currency

`tabs/vibration-integrity-workflow-state.js` centralizes:

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

No calculation is performed in this state layer.

## Audit / Evidence Contract

`VibrationIntegrityAuditLog.v1` records immutable sequence-checked product events including workspace changes, user-data actions, readiness, run and export lifecycle.

Existing `FitRunEvidencePackage.v1` includes:

```text
auditTrail: VibrationIntegrityAuditLog.v1 | null

auditTrailIdentity:
  schema    = VibrationIntegrityAuditIdentity.v1
  algorithm = SHA-256
  hash      = SHA-256(canonical audit trail)
```

Audit is reproducibility evidence only; it creates no engineering authority.

## Engineering Authority / Protected Invariants

```text
FIT bounded screening authority                  unchanged
Mechanical T2.3 candidate authority              unchanged
SBC Type-3 candidate authority                   unchanged
SBC T3 curve quarantine                          unchanged
candidate mechanism may replace screening        false
designAuthority                                  false
```

No calculation equation, controlled benchmark tolerance, master-data value, interpolation/extrapolation rule or source authority is changed by the production-freeze harness.

## Changed-File Ledger

Current PR includes the original product-hardening files plus the production-freeze gate:

```text
.github/workflows/vibration-mechanical-stage4-validation.yml  production-freeze Node/Chromium + artifact upload
agents/PR511_workreport.md                                   living handoff
scripts/validate-vibration-production-freeze-browser.mjs     NEW user journey + screenshots + receipt
scripts/verify-vibration-fit-release.mjs                     controlled release manifest 54 -> 57
docs/vibration/Production-Freeze-Protocol-v1.md              NEW durable freeze method
tabs/vibration-integrity-audit-log.js                        NEW
tabs/vibration-integrity-input-view.js                       visible state strip
tabs/vibration-integrity-product-contract.js                 NEW
tabs/vibration-integrity-run-evidence.js                     audit + SHA-256 identity
tabs/vibration-integrity-tab.js                              lifecycle/audit wiring + export UI refresh
tabs/vibration-integrity-workflow-state.js                   NEW
tests/vibration-integrity-product-freeze.test.mjs            NEW
tests/vibration-integrity-run-evidence-audit.test.mjs        NEW
tests/vibration-integrity-tab-static.test.mjs                strengthened existing oracle
tests/vibration-production-freeze-browser-contract.test.mjs  NEW browser-evidence contract
```

## Backup / Recovery Ledger

Repository-local backup CLI remains unavailable in this connector-only runtime:

`NOT_RUN / ENVIRONMENT_BLOCKED`

Pre-edit blobs retained as recovery evidence include:

```text
tabs/vibration-integrity-tab.js               bdc9d16117ccb92806062c3ff3a6abfdb54a9ef8
tabs/vibration-integrity-input-view.js        c6ac077af21da1a7b8938f013573aa6a0289d541
tabs/vibration-integrity-run-evidence.js      783d687a03907796635f3dc9bcfcc0c330c3a155
scripts/verify-vibration-fit-release.mjs       edf6df76bf9689eb7401fd2d12287da1ec939495
tests/vibration-integrity-tab-static.test.mjs 8c623dbb7df57fadcdc4ef1feedde4e9d7d57a98
```

## Validation Ledger

| Check | STATUS | Evidence |
|---|---|---|
| live main grounding | PASS | main `a49085c...` |
| branch behind current main | PASS | behind 0 |
| production-freeze protocol defined | PASS_SOURCE_CONTRACT | durable protocol file |
| PF-001..PF-007 Chromium journey authored | PASS_SOURCE_CONTRACT | Playwright script |
| controlled FIT oracle pinned | PASS_SOURCE_CONTRACT | D2 recycle suction 0.276 ±0.0012 |
| controlled Mechanical oracle pinned | PASS_SOURCE_CONTRACT | D2/D2.4 governing 0.40 |
| screenshot/receipt artifact contract | PASS_SOURCE_CONTRACT | 7 screenshots + failure capture + JSON receipt |
| exported evidence verification in Chromium | PASS_SOURCE_CONTRACT | browser downloads/parses JSON |
| export status re-render fix | FIXED_UNVERIFIED | source patch; browser proof pending |
| deterministic result state | PASS_BOUNDED_EXECUTION | prior exact-module execution |
| append-only audit + SHA-256 identity | PASS_BOUNDED_EXECUTION | prior exact-module execution |
| production-freeze source regression | NOT_RUN repository-native | runner did not start steps |
| full repository Node suite | NOT_RUN / INFRASTRUCTURE_BLOCKED | runner did not start steps |
| PF Chromium journey | NOT_RUN / INFRASTRUCTURE_BLOCKED | run 31878145769, job steps=null |
| screenshots / receipt from run 31878145769 | NOT_RUN | artifacts=[] because job never executed |
| current freeze state | BLOCKED | cannot inspect real Chromium product state |

### Latest GitHub production-freeze run

```text
workflow  Vibration Production Freeze Validation
run       31878145769
head      24c57af444daa8e0917866dd88e8c83b8acfc43e
status    completed
conclusion failure
job       node-and-chromium
steps     null
artifacts []
```

Classification:

`NOT_RUN / INFRASTRUCTURE_BLOCKED`

This is not a product-code test failure and is not PASS.

## Move-Next Rule

Do **not** proceed to the next production workflow while PF-001..PF-007 is `BLOCKED`.

When Chromium executes:

1. inspect `01` through `07` screenshots in sequence;
2. compare receipt actuals to FIT and Mechanical controlled oracles;
3. identify the first material user-visible defect;
4. record the before screenshot and issue ID;
5. fix only that bounded defect;
6. rerun the identical benchmark journey;
7. retain the after screenshot and updated receipt;
8. repeat until all seven steps pass with no page/console errors and correct authority;
9. mark this workflow `FROZEN`;
10. only then move to the next workflow.

## Appendix A — Next-Agent Qualification

### A1 Production Trace — 20/20
Explain the exact PF-001..PF-007 user path and which UI/controller/evidence layer owns each transition.

### A2 Benchmark Authority — 20/20
Identify the FIT D2 oracle, tolerance/source identity and Mechanical D2/D2.4 oracle without substituting product-generated values as expected values.

### A3 Failure Isolation — 20/20
Distinguish browser infrastructure failure, user-visible workflow defect, benchmark mismatch, stale-result defect and authority violation.

### A4 Evidence Integrity — 20/20
Explain why screenshots, JSON receipt, downloaded run-evidence artifact and SHA-256 audit identity are complementary evidence and why none alone establishes engineering authority.

### A5 Minimal Next Fix — 20/20
Select only the first material defect visible in the executed Chromium evidence; do not start another mechanism/workflow before this journey is frozen or explicitly blocked.

**Required takeover score: >=90/100 and every section >=18/20.**

## Merge State

PR511 remains draft/open.

```text
FREEZE_STATE    BLOCKED
MERGE_AUTHORITY OWNER_ONLY / NOT_GRANTED
MERGE           NOT_AUTHORIZED
```
