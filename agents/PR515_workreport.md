# PR515 — AIV PF-01 Production Freeze Work Report

## Recovery Header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED_WITHIN_ISSUE_513_GATE

EXECUTION_MODE: MANUAL
SCOPE_AUTHORITY: ISSUE_513_PF01
MERGE_AUTHORITY: OWNER_ONLY

PR_HEAD_OBSERVED: aa6727c83a0420e093194a3323b3becad8e1847c
REPORT_BASIS_HEAD: aa6727c83a0420e093194a3323b3becad8e1847c
MAIN_HEAD_LAST_CHECKED: d659e670a2f8fe0a35fc8072382512f6493898cf
MERGE_BASE: d659e670a2f8fe0a35fc8072382512f6493898cf
REPORT_SYNC: CURRENT
APPENDIX_A_STATUS: NOT_REQUIRED_NEW_ASSIGNMENT_ISSUE_513_GATE_APPLIES
GROUNDING_EPOCH: GE-004
LAST_DURABLE_CHECKPOINT: current-main drift reconciled, evidence-only branch rebased, current-main deployment retry recorded
CURRENT_STAGE: CURRENT_MAIN_REBASED_LIVE_BROWSER_BLOCKED_LOW_LEVEL_ROOT_CAUSE_ISOLATED
CURRENT_BLOCKER: installed Chromium is mandatorily managed with URLBlocklist=["*"]; current-main Pages run 31881892198 and its retry failed before any step executed
HIGHEST_RISK: promoting low-level proof to browser acceptance or committing the patch before the #513 real-app pre-fix workflow
EXACT_NEXT_ACTION: run exact current main d659e670... in a Chromium environment that permits navigation, execute the unchanged Engineering Calculations -> Vibration -> VIB.AIV.ACOUSTIC -> Load D.2.3 -> first filter sync workflow, record browser before evidence, then if reproduced apply only `input = input ?? {};` plus focused regression
```

## Handover in 60 Seconds

PR #515 owns issue #513 PF-01 only. The reviewer marker `QUALIFIED_FOR_AIV_PRODUCTION_FREEZE` is present on #513 as comment `5301819610`.

Current production is now `main@d659e670a2f8fe0a35fc8072382512f6493898cf` (merged PR #516). GE-004 reconciled that drift before any production/test mutation. PR #516 changed controlled EIT sonic-state compatibility plus `package.json`; it did **not** change the PF-01 filter path or PR515 evidence paths. Current main still carries `tabs/vibration-aiv-canvas-filter.js` blob `a5da4fb99e69310659659725696c61c3d9347085`.

PR515 previously had evidence-only ancestry from `a49085c...`. Because the PR contained only six recovery/evidence files and #516 had no exact-path overlap, branch head `2858f1fca8633d9c91328f8fbda252783837cffb` was intentionally superseded and the branch was force-rebased directly onto `d659e670...`. No production, repository test, package, or workflow file was present in the superseded PR diff. The six PF-01 evidence/recovery files were then restored on the current-main parent.

PF-01 diagnosis is materially complete at low level but **not** browser-accepted:

1. Exact current-main filter bytes deterministically fail on explicit-null state creation with `TypeError: Cannot read properties of null (reading 'caseId')`.
2. Exact current-main `createAivCanvasFilterController(...).sync()` fails at the same first-sync boundary.
3. PR #506 filter blob `a4a3990df0381bea8cbd95c49ad554f746141bb1` passes those two low-level checks but remains salvage evidence only.
4. A smaller one-line candidate was isolated against the exact production blob:

   ```js
   input = input ?? {};
   ```

   Candidate blob `8640eca0a2e1454e277613d50c4c9962e3e537d8` passed 8/8 focused low-level state/controller checks. It was not committed to the repository; the reconstructed source was restored to exact blob `a5da4fb9...`.
5. Exact repository backup utility blob `cd0c755457bb623b0487200a7d0b7217d8b3478e` was executed against hash-identical filter bytes in the reconstructed workspace; backup #2 hashes identically to the source. The backup command must be rerun in the native worktree immediately before the actual edit.
6. Installed Chromium 144 is controllable over CDP, but mandatory managed policy `/etc/chromium/policies/managed/000_policy_merge.json` contains `URLBlocklist: ["*"]`; loopback HTTP, container-IP HTTP and `file://` navigation all return `net::ERR_BLOCKED_BY_ADMINISTRATOR`. The policy was not modified or bypassed.
7. Current-main Pages workflow run `31881892198` targeted exact `d659e670...`; attempt 1 job `95005543108` and controlled retry job `95006065316` both failed with `steps=null` and `logs_url=null`. No product step executed and no browser-served artifact exists.

Therefore PF-01 remains `BLOCKED_ENVIRONMENT_WITH_LOW_LEVEL_ROOT_CAUSE_ISOLATED_CURRENT_MAIN_RECONCILED`. PF-02 remains unauthorized.

## Live Ground Truth — GE-004

```text
verified_at: 2026-08-15T15:25:39+04:00
repository: reallaksh19/3D_Converters
default_branch: main
main_head: d659e670a2f8fe0a35fc8072382512f6493898cf
main_tree: 14d9d4b7575e68267560f9c8a8704c69d25a57cc
prior_main: a49085cde69ef71518c0d6315a615477887d7b4e
intervening_change: PR516 / controlled EIT sonic-state compatibility
pr: 515
pr_state: OPEN_DRAFT
branch: agent/aiv-pf01-production-freeze-20260815
superseded_evidence_head: 2858f1fca8633d9c91328f8fbda252783837cffb
rebase_parent: d659e670a2f8fe0a35fc8072382512f6493898cf
report_basis_head: aa6727c83a0420e093194a3323b3becad8e1847c
merge_base: d659e670a2f8fe0a35fc8072382512f6493898cf
source_issue: 513
acceptance_umbrella: 453
salvage_predecessor: PR506
qualification_comment: issuecomment-5301819610
current_main_pages_run: 31881892198 / attempts 1+2 / NOT_RUN_INFRASTRUCTURE_BLOCKED
managed_chromium_policy: URLBlocklist=["*"]
```

## Drift Reconciliation — PR #516

`a49085c... -> d659e670...` is exactly one commit. Changed paths:

```text
ValidationRecords/AIV/ProductionFreeze/AIV-PF-EIT-SONIC-01.json
agents/PR516_workreport.md
converters/vibration/aiv/aiv-eit-controlled-sonic-state.js
converters/vibration/aiv/aiv-eit-import-records.js
package.json
tests/vibration-aiv-eit-controlled-sonic.test.mjs
```

PF-01 exact-path overlap: **none**.

Important custody consequence: `package.json` changed from old blob `9a371439...` to current blob `ef583d8da73d23df5463a4dfdb2da2d19006886f`, so release-suite identity in the PF-01 manifest/ledger was refreshed. The frozen D.2.3 benchmark module remains blob `c6f95bc3...`; the independent multi-source oracle module remains blob `21d1e687...`; the vulnerable filter remains blob `a5da4fb9...`.

Reconciliation classification: `SAFE_TO_CONTINUE_EVIDENCE_ONLY`. Production mutation still waits for the live-browser gate.

## Mission / Scope / Acceptance

Mission: close PF-01 canvas/filter runtime stability through the locked #513 loop:

```text
exact production freeze
-> real Chromium pre-fix reproduction
-> smallest correct fix
-> identical Chromium replay
-> B1-B6 minimum frozen benchmarks
-> professional treatment of touched UI
-> browser + benchmark replay
-> permanent regression
-> immutable receipt
-> only then next slice
```

In scope only after live reproduction:

- `tabs/vibration-aiv-canvas-filter.js` null first-sync correction;
- focused permanent regression in `tests/vibration-aiv-canvas-filter-runtime.test.mjs`;
- PF-01 validation records/recovery artifacts;
- directly necessary filter/loading/error UX after correctness is established.

Out of scope:

- EI equations, coefficients, tolerances or frozen expected values;
- SVG-derived physical distance;
- `screeningResultScope`, line/case authority, or `designAuthority` changes;
- readiness/calculator, grouping, stale async, master custody or export work belonging to later slices;
- broad refactor/dependency migration;
- merge without explicit Owner authorization.

## Authority / Invariants

```text
TABLES = engineering input/source of truth
SVG CANVAS = navigation / relationship editing / explanation only
screeningResultScope = ASSESSMENT
line/case summary = non-authoritative
designAuthority = false
SVG/pixel geometry = NEVER engineering physical distance authority
EXPLICIT PROJECT / USER > qualified exact master reference > visible accepted assumption
```

No UI code may recombine dB values independently. Frozen oracles stay frozen.

## Current Diagnosis, Candidate and Falsifier

### First wrong boundary

`createAivCanvasFilterController()` initializes `state = null`. Its first `sync()` calls `createAivCanvasFilterState(state, options)`. The function default `input = {}` protects only `undefined`; an explicit `null` reaches `input.caseId` and throws.

Current-main anchors:

- filter: `a5da4fb99e69310659659725696c61c3d9347085`;
- canvas controller: `9c7af05425cdf763e668ae38c83ba3dde594990e`;
- PR #506 candidate filter: `a4a3990df0381bea8cbd95c49ad554f746141bb1`.

### Smallest characterized correction

```diff
 export function createAivCanvasFilterState(input = {}, options = {}) {
+  input = input ?? {};
   const cases = values(options.cases ?? []);
```

This changes no numerical equation, authority, distance, master, grouping, async or export semantics. It is smaller than replaying PR #506's broader hunk.

Low-level candidate checks: 8/8 PASS. Classification: `PASS_LOW_LEVEL_ONLY`.

### Falsifier

If the unchanged exact-current-main application completes Engineering Calculations -> Vibration -> `VIB.AIV.ACOUSTIC` -> Load D.2.3 -> first canvas/filter sync -> Case/Line/Show without the exception under exact served-byte custody, PF-01 becomes `NOT_REPRODUCIBLE_ON_CURRENT_MAIN`; the candidate must not be committed merely because the low-level call can manufacture the failure.

## Frozen Benchmark Custody

Current baseline identities:

```text
D.2.3 benchmark module
  tabs/vibration-aiv-benchmarks.js
  blob c6f95bc3e1a6ecd1ca668c3a55a7ad2ef09fd2d0

Independent true two-source oracles
  converters/vibration/aiv/aiv-independent-benchmark-evidence.js
  blob 21d1e687dca0c537f4170e961b2d7b1894d710cc

Release scripts
  package.json
  blob ef583d8da73d23df5463a4dfdb2da2d19006886f
```

Frozen expected examples remain unchanged:

- relief raw source PWL `164.6851759525391 dB`, abs tolerance `1e-10`;
- relief point PWL `164.3734876408508 dB`, abs tolerance `1e-10`;
- `160 + 160 -> 163.0102999566398 dB`, abs tolerance `1e-9`;
- `160 + 150 -> 160.41392685158226 dB`, abs tolerance `1e-9`.

No expected value or tolerance has been edited.

## Validation Ledger

| Check | Status | Observation | Oracle | Tested identity | Notes |
|---|---|---|---|---|---|
| #513 qualification marker | PASS | repository record | authoritative scope | comment 5301819610 | gate satisfied |
| main re-ground GE-004 | PASS | GitHub live state | Git | d659e670... | current production |
| PR516 overlap reconciliation | PASS | compare/source inspection | Git | a49085c...→d659e670... | no PF01 exact path overlap |
| evidence-only branch rebase | PASS | ref rewrite + restored evidence | Git | parent d659e670... | superseded head 2858f1fc... retained |
| exact current-main filter blob | PASS | source inspection | Git blob | a5da4fb9... | unchanged by PR516 |
| direct explicit-null pre-fix | FAIL expected | exact-blob Node execution | code boundary | a5da4fb9... | TypeError on `caseId` |
| controller first-sync pre-fix | FAIL expected | exact-blob Node execution | code boundary | a5da4fb9... | same TypeError |
| PR #506 same low-level cases | PASS support | exact-blob Node execution | salvage only | a4a3990d... | not product authority |
| one-line local candidate | PASS support 8/8 | exact-blob Node execution | minimal mechanism | 8640eca0... | not committed |
| exact backup utility | PASS local support | repository utility execution | repo policy | cd0c7554... | rerun required in native worktree |
| Chromium CDP availability | PASS | local execution | none | Chromium 144 | browser process functional |
| Chromium real-app navigation | NOT_RUN | managed policy block | none | Chromium 144 | URLBlocklist=["*"] |
| current-main Pages attempt 1 | NOT_RUN | GitHub metadata | none | d659e670... | job 95005543108 steps=null |
| current-main Pages attempt 2 | NOT_RUN | GitHub metadata | none | d659e670... | job 95006065316 steps=null |
| B1-B14 benchmark pack | NOT_RUN | not executed | frozen oracles | n/a | no production patch |
| `npm run verify:aiv-canvas-release` | NOT_RUN | no native checkout | mixed | package ef583d8... | no false PASS |

No `FULL_BROWSER_PASS` is claimed.

## Changed-File Ledger

Current PR #515 is evidence/recovery only:

```text
ValidationRecords/AIV/ProductionFreeze/AIV-PF-01-manifest.json
ValidationRecords/AIV/ProductionFreeze/AIV-PF-01-before.json
ValidationRecords/AIV/ProductionFreeze/AIV-PF-01-benchmark.json
agents/PR515_workreport.md
agents/status/PR515.yaml
agents/claims/PR515.yaml
```

No production, repository test, package, workflow, equation, benchmark-oracle, master or UI file is changed.

## Coordination / Overlap

- PR #506 overlaps the filter path and remains `SALVAGE_CANDIDATE`; do not bulk replay or mutate it.
- PR #516 is merged and reconciled; no exact PF-01 claimed-path overlap.
- PF-01 claims no master/numerical/readiness/grouping/async/export authority.
- Overlap classification: `COORDINATION_REQUIRED`, currently controlled.

## Active Items

- `ISS-515-001`: native exact-main worktree is unavailable in this environment.
- `ISS-515-002`: current-main hosted deployment is runner-blocked before execution.
- `ISS-515-003`: managed Chromium policy blocks all URL navigation; policy must not be disabled or bypassed.
- `ISS-515-004`: real-app pre-fix browser evidence remains missing despite low-level root-cause proof.
- `DEC-515-001`: preserve zero production/test mutation until real-app reproduction.
- `DEC-515-002`: if browser reproduction confirms PF-01, prefer the isolated one-line normalization over broader PR #506 hunk.
- `DEC-515-003`: keep PF-02 unauthorized while PF-01 is blocked.
- `DEC-515-004`: evidence-only PR history was rebased onto current main before implementation.
- `RISK-515-001`: confusing low-level exact-blob proof with product acceptance.
- `QST-515-001`: does the unchanged exact current-main real UI reproduce the same first-sync exception?

## Exact Continuation State

1. Re-read live `main`; if it moves from `d659e670...`, create a new grounding epoch and reconcile again.
2. Use a native checkout of that exact current main in an environment with Chromium navigation permitted by policy.
3. Before editing, execute `node utils/backup.js save tabs/vibration-aiv-canvas-filter.js "Issue #513 PF-01 pre-fix backup"` in that native worktree and retain the receipt.
4. Start the unchanged application; record SHA, URL, Chromium version, clean profile/cache state, served AIV module hashes/query tokens, dataset identity and active master identity.
5. Execute normal UI path: Engineering Calculations -> Vibration -> `VIB.AIV.ACOUSTIC` -> Load D.2.3 -> first filter sync -> Case/Line/Show.
6. Capture console/uncaught exception, network, DOM/filter/readiness/result, storage and screenshot evidence in `AIV-PF-01-before.json`.
7. **Only if the real UI reproduces**, add the one-line normalization and focused permanent regression; do not import unrelated PR #506 changes.
8. Repeat the identical browser workflow; run B1-B6 minimum plus applicable release suites; professionalize only touched UI; rerun browser + benchmarks.
9. Fill `AIV-PF-01-after.json`, benchmark receipt and workreport. Only fully green PF-01 may authorize PF-02.

Do not merge without explicit Owner authorization.
