# PR517 — AIV PF-02 Production Freeze Work Report

## Recovery Header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED_WITHIN_ISSUE_513_GATE
EXECUTION_MODE: MANUAL
SCOPE_AUTHORITY: ISSUE_513_PF02
MERGE_AUTHORITY: OWNER_ONLY
PR_HEAD_OBSERVED: 92fc30070070a3eeb7a938071c9c6daf1ff83abd
REPORT_BASIS_HEAD: 92fc30070070a3eeb7a938071c9c6daf1ff83abd
MAIN_HEAD_LAST_CHECKED: d659e670a2f8fe0a35fc8072382512f6493898cf
MERGE_BASE: d659e670a2f8fe0a35fc8072382512f6493898cf
REPORT_SYNC: CURRENT
APPENDIX_A_STATUS: NOT_REQUIRED_NEW_ASSIGNMENT_ISSUE_513_GATE_APPLIES
GROUNDING_EPOCH: PF02-GE-001
LAST_DURABLE_CHECKPOINT: PF-02 manifest + before receipt + benchmark ledger + draft PR
CURRENT_STAGE: BASELINE / LIVE REPRODUCTION
CURRENT_BLOCKER: exact-current-main real-app Chromium unavailable because mandatory URLBlocklist=["*"] blocks navigation and Pages runner executes zero steps
HIGHEST_RISK: replaying PR506's broad executable-contract/grouping batch or treating source inspection as live product reproduction
EXACT_NEXT_ACTION: run current main in navigation-permitted Chromium, execute PF-02 UI negative matrix plus direct calculateEngineering parity experiment; only after reproduction implement the smallest PF-02-only contract unification
```

## Handover in 60 Seconds

PR #517 is issue #513 PF-02 only: **readiness ↔ executable calculator contract parity**.

Owner explicitly waived the rule that blocked PF-01 must close before moving next; the waiver is issue comment `5302095544`. The waiver is progression-only. PF-01 remains non-PASS and PF-02 retains its own live-product-first requirement.

Current production baseline is:

```text
main@d659e670a2f8fe0a35fc8072382512f6493898cf
```

No production, test, package or workflow code is changed in PR #517 yet.

Current-main source inspection identifies the candidate PF-02 defect:

1. UI `Run Screening` uses `isAivScreeningReady()` and requires `readyForQualification > 0`, `notReady === 0`, `methodGap === 0`, plus current assumption acceptance.
2. `buildAivEngineeringScreeningRequest()` independently refuses a readiness envelope that has NOT_READY or METHOD_GAP blockers.
3. Registered engine validation calls `VIBRATION_AIV_ENGINEERING_CALCULATION_DEFINITION.validateInput()` before numerical execution.
4. That adapter validator currently checks only non-empty tables/topology and assumption-profile validity.
5. Current `calculateAiv(... qualificationMode='screening')` then executes without calling `buildAivReadiness()` or an equivalent executable contract.

Therefore there is a source-level parity gap: the product UI proves readiness before screening, but direct registered API execution does not prove the same boundary. This is **not yet counted as defect reproduction** because PF-02 requires live product evidence.

## PF-02 Required Contract Matrix

For each row, the real UI and direct registered API must agree:

| Domain | UI expected | Registered API expected |
|---|---|---|
| valid controlled D.2.3 | READY_FOR_QUALIFICATION then screening executes | executes |
| P1 <= P2 after basis resolution | NOT_READY | reject |
| resolved absolute pressure <= 0 | NOT_READY | reject |
| temperature <= 0 K equivalent | NOT_READY | reject |
| unsupported flow/pressure/temperature/MW/distance/diameter unit | NOT_READY | reject |
| GAUGE without reference pressure/source/revision | NOT_READY | reject |
| sonic state unresolved/invalid | NOT_READY | reject |
| trim state/reduction/provenance invalid | NOT_READY | reject |
| required assessment geometry absent/invalid | NOT_READY or METHOD_GAP | reject |
| physical distance/evidence absent/invalid | NOT_READY | reject |
| assessment type outside qualified Stage-8 envelope | METHOD_GAP | reject |

The registered path must never become more permissive than readiness.

## Current Source Custody

```text
converters/vibration/aiv/aiv-readiness.js
  blob 6423267fd49b3d720874a7b699b0b48a657a5df6

converters/vibration/aiv/aiv-calculator.js
  blob 08f1664f1be6a104fe421655e96a46ca66c6a80c

converters/engineering-calculations/adapters/vibration-aiv.js
  blob 81b6774dc24456ac5c89d983a26593ee34d20ba5

converters/engineering-calculations/engine.js
  blob 7b37f45cd22789e565ce8c4b1c31d01a263f9c74

converters/engineering-calculations/input-resolution.js
  blob 4e65a52b57e4c99ef04d9cd6aeafb24b987a9e36

tabs/vibration-aiv-screening-gate.js
  blob dcde1fadd5b54f17d07e63da4705680dbcf152d4

tabs/vibration-aiv-screening-request.js
  blob fd6588f8567fa977d72e75912678201663027cee
```

## PR #506 Salvage Analysis

PR #506 head remains `b846cbfb765cbc01734154ad837b12d040fe0bf7` and is a 33-file batch.

Useful PF-02 candidate evidence:

```text
converters/vibration/aiv/aiv-executable-contract.js
  blob a6de9d2c6bda73370fa5d9889503de4757b95701

converters/vibration/aiv/aiv-calculator.js
  blob f9785783a155371d7174dfc3ebe326e577abddb6
```

The candidate adds explicit executable checks for pressure drop, temperature, supported units, gauge reference evidence, sonic/trim state, required geometry, distance evidence and Stage-8 assessment type. It also runs readiness internally before screening.

**Do not replay it wholesale.** The same candidate module also contains simultaneous-source-group logic assigned to PF-03. Pulling that module unchanged would contaminate PF-02 with the next defect slice.

PF-02 implementation decision after live reproduction must choose the minimum way to share executable-domain validation between readiness and calculation without importing PF-03 grouping semantics, master custody, async custody or export work.

## Candidate Implementation Shape — Not Yet Authorized

No code is committed, but the smallest acceptable shape is likely:

1. a PF-02-only executable-domain validator (<300 physical JS lines) containing only source/assessment/relationship executable checks required by PF-02;
2. readiness calls those validators so `READY_FOR_QUALIFICATION` includes the real executable domain;
3. screening `calculateAiv()` runs readiness and the same executable validators before any numerical stage;
4. direct registered `calculateEngineering()` therefore cannot bypass readiness because it reaches the hardened screening calculator through the existing adapter/engine boundary;
5. benchmark mode remains independently usable for frozen benchmark qualification and must not accidentally inherit screening-only project-readiness requirements unless explicitly intended by the frozen contract.

Alternative implementations are acceptable only if they are smaller and preserve one source of truth for the executable domain.

## Falsifier

If exact-current-main live UI plus direct registered API demonstrates that all PF-02 negative domains already fail consistently through the same qualification boundary, disposition becomes:

```text
NOT_REPRODUCIBLE_ON_CURRENT_MAIN
```

and no #506 parity patch is replayed.

## Frozen Authority / Numerical Boundaries

```text
TABLES = engineering input/source of truth
SVG CANVAS = navigation / relationship editing / explanation only
screeningResultScope = ASSESSMENT
line/case summary = non-authoritative
designAuthority = false
SVG/pixel geometry = NEVER engineering physical distance authority
```

PF-02 must not change EI equations, coefficients, expected benchmark values, simultaneous-group semantics, master qualification semantics, stale-async semantics, or export lineage.

## Validation State

| Gate | Status |
|---|---|
| #513 specialist qualification | PASS — comment 5301819610 |
| Owner progression waiver from PF-01 | PASS — comment 5302095544 |
| current-main grounding | PASS — d659e670... |
| PF-02 manifest | PASS |
| source contract trace | PASS / SOURCE_INSPECTION_ONLY |
| real-app current-main Chromium PF-02 matrix | NOT_RUN / ENVIRONMENT_BLOCKED |
| direct registered API negative matrix | NOT_RUN |
| implementation | NOT_STARTED |
| B1-B14 | NOT_RUN |
| native release suite | NOT_RUN |

No `FULL_BROWSER_PASS` is claimed.

## Current PR File Ledger

```text
ValidationRecords/AIV/ProductionFreeze/AIV-PF-02-manifest.json
ValidationRecords/AIV/ProductionFreeze/AIV-PF-02-before.json
ValidationRecords/AIV/ProductionFreeze/AIV-PF-02-benchmark.json
agents/PR517_workreport.md
agents/status/PR517.yaml      (to be created)
agents/claims/PR517.yaml      (to be created)
```

No merge without explicit Owner authorization.
