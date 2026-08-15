# PR518 — AIV PF-03 Simultaneous-Source Semantics Work Report

## Recovery Header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED_WITHIN_ISSUE_513_GATE

EXECUTION_MODE: MANUAL
SCOPE_AUTHORITY: ISSUE_513_PF03
MERGE_AUTHORITY: OWNER_ONLY

PR_HEAD_OBSERVED: 2603aca1560b37917cd15362264fa1125530b9de
REPORT_BASIS_HEAD: 2603aca1560b37917cd15362264fa1125530b9de
MAIN_HEAD_LAST_CHECKED: d659e670a2f8fe0a35fc8072382512f6493898cf
MERGE_BASE: d659e670a2f8fe0a35fc8072382512f6493898cf
REPORT_SYNC: CURRENT
APPENDIX_A_STATUS: NOT_REQUIRED_NEW_ASSIGNMENT_ISSUE_513_GATE_APPLIES
GROUNDING_EPOCH: GE-PF03-001
LAST_DURABLE_CHECKPOINT: PF-03 manifest + before receipt + benchmark ledger + Owner progression waiver
CURRENT_STAGE: BASELINE / LIVE REPRODUCTION
CURRENT_BLOCKER: exact-current-main real-app Chromium navigation is unavailable in this execution environment
HIGHEST_RISK: importing PF-02 behavior from PR #506 or inventing a governing-group algorithm instead of the locked fail-closed PF-03 rule
EXACT_NEXT_ACTION: in navigation-permitted Chromium on exact current main, prove same-group B2/B3 with both source IDs, then change only one relationship to a distinct simultaneous group under the same Assessment+Case and capture whether production incorrectly cross-combines it
```

## Handover in 60 Seconds

PR #518 owns issue #513 PF-03 only. Current production is `main@d659e670a2f8fe0a35fc8072382512f6493898cf`. Owner progression waiver from PF-02 is recorded on #513 as comment `5302118299`; it authorizes progression only and does not convert PF-02 to PASS.

PF-03 locked semantics:

1. same-group multi-source arithmetic remains logarithmic and benchmark-locked;
2. B2 `160 + 160 dB = 163.0102999566398 dB`;
3. B3 `160 + 150 dB = 160.41392685158226 dB`;
4. both Source Canonical IDs remain in assessment contributions and canvas projection;
5. multiple distinct `Simultaneous Source Group` values under one Assessment + Operating Case fail closed until a separately qualified group/scenario result contract exists;
6. PF-03 must not invent a governing-group algorithm.

No production or repository test code has been changed. The current PR contains Production Freeze evidence only.

## Current-Main Diagnosis

### Same-group positive path already frozen

Current `tests/vibration-aiv-canvas-integration.test.mjs` blob `9f101f0092ec2c3a2ce148e92b3dead0c7209442` defines:

```text
SIM-SRC-1
SIM-SRC-2
SIM-GROUP-1
```

and asserts the registered Engineering API plus canvas projection preserve both source identities for:

```text
160 + 160 -> 163.0102999566398 dB
160 + 150 -> 160.41392685158226 dB
```

These source values are also frozen independently in `aiv-independent-benchmark-evidence.js` blob `21d1e687dca0c537f4170e961b2d7b1894d710cc` with tolerance `1e-9`.

### First wrong boundary candidate

Current production `converters/vibration/aiv/aiv-calculator.js` blob `08f1664f1be6a104fe421655e96a46ca66c6a80c` groups contributions with:

```js
JSON.stringify([item.assessmentCanonicalId, item.caseId])
```

The grouping key does not include `simultaneousSourceGroup` and there is no preceding distinct-group fail-closed check in that module.

Current `converters/vibration/aiv/aiv-kernel-candidate.js` blob `647cbf5bd19e2015dbc28708d8b6740269f1e5b4` permits logarithmic combination whenever Assessment Canonical ID and Operating Case match. The contribution object carries `simultaneousSourceGroup`, but the combiner does not compare it.

Repository search on current main found no implementation of `findAivUnsupportedSimultaneousScopes`.

This is a source-level candidate defect, not yet real-app reproduction.

## PR #506 Salvage Boundary

PR #506 head `b846cbfb765cbc01734154ad837b12d040fe0bf7` contains `aiv-executable-contract.js` blob `a6de9d2c6bda73370fa5d9889503de4757b95701` with candidate function `findAivUnsupportedSimultaneousScopes()`.

Its behavior is directionally aligned with PF-03: for APPLICABLE relationships, group by Assessment+Case, collect distinct group labels, and flag scopes with more than one group as `AIV_MULTIPLE_SIMULTANEOUS_GROUPS_UNSUPPORTED`.

However that file also contains PF-02 pressure/unit/geometry executable-contract behavior. It is SALVAGE ONLY. Do not cherry-pick the file or PR wholesale. If live PF-03 reproduction confirms the defect, extract the smallest grouping-only mechanism or implement an equivalently minimal current-main correction.

## Falsifier

If exact current main already refuses multiple distinct simultaneous groups under one Assessment+Case in the real AIV workflow before any screening result is committed, record:

```text
NOT_REPRODUCIBLE_ON_CURRENT_MAIN
```

and do not replay PR #506 grouping logic merely because source inspection suggests the calculator could combine such rows.

## Intended Live Matrix

### Positive same-group

1. Load controlled data with `SIM-SRC-1` and `SIM-SRC-2` both in `SIM-GROUP-1` for the same Assessment and Operating Case.
2. Run readiness and screening for 160+160.
3. Confirm `163.0102999566398 dB` within `1e-9` and both source identities in contributions/canvas.
4. Repeat for 160+150 and confirm `160.41392685158226 dB` within `1e-9`.

### Negative distinct-group

1. Keep source values, Assessment and Operating Case unchanged.
2. Change only the second relationship from `SIM-GROUP-1` to `SIM-GROUP-2`.
3. Re-run readiness/screening.
4. Required qualified behavior: fail closed before any cross-group logarithmic combination; expose a readable METHOD_GAP/non-executable reason.
5. Forbidden behavior: silently combine the two groups, select a governing group, average groups, or otherwise invent result-scope semantics.

## Authority Boundaries

```text
TABLES = engineering input/source of truth
SVG CANVAS = navigation / relationship editing / explanation only
screeningResultScope = ASSESSMENT
line/case summary = non-authoritative
designAuthority = false
SVG/pixel geometry = NEVER engineering physical distance authority
```

UI code may display source contributions but may not recombine dB values independently of the registered kernel.

## Changed-File Ledger

Current PR changes are evidence/recovery only:

- `ValidationRecords/AIV/ProductionFreeze/AIV-PF-03-manifest.json`
- `ValidationRecords/AIV/ProductionFreeze/AIV-PF-03-before.json`
- `ValidationRecords/AIV/ProductionFreeze/AIV-PF-03-benchmark.json`
- `agents/PR518_workreport.md`
- status/claim files to be added in this recovery checkpoint

No production/test/package/workflow file is changed at this checkpoint.

## Potential Implementation Paths After Live Reproduction

Claimed candidate paths are deliberately narrow:

- `converters/vibration/aiv/aiv-readiness.js` — if fail-closed METHOD_GAP belongs at readiness;
- `converters/vibration/aiv/aiv-calculator.js` — if direct execution needs a grouping guard to prevent bypass;
- `tests/vibration-aiv-simultaneous-source-groups.test.mjs` — focused permanent regression;
- PF-03 evidence/recovery records.

A new helper module is not assumed. If one becomes necessary, it must remain below 300 physical lines and must contain only PF-03 grouping semantics, not PF-02 executable-contract validation.

## Validation Ledger

| Check | Status | Evidence class |
|---|---|---|
| Qualification marker | PASS | issue record |
| PF-02→PF-03 progression waiver | PASS | issue comment 5302118299 |
| Current main re-ground | PASS | GitHub live branch state |
| B2/B3 independent oracles frozen | PASS custody only | immutable source inspection |
| Same-group registered fixture identified | PASS custody only | repository source inspection |
| Distinct-group current-main detector | ABSENT by search | source inspection |
| Real-app same-group B2/B3 | NOT_RUN | environment blocked |
| Real-app distinct-group reproduction | NOT_RUN | environment blocked |
| B1-B14 after patch | NOT_RUN | no patch |
| FULL_BROWSER_PASS | NOT_RUN | never inferred from source/unit evidence |

## Active Items

- `ISS-518-001`: exact-current-main real-app Chromium workflow unavailable in current environment.
- `DEC-518-001`: Owner waiver permits PF-03 start but not PF-02 closure.
- `DEC-518-002`: distinct groups must fail closed; no governing-group algorithm.
- `DEC-518-003`: PR #506 grouping detector is salvage only and must be separated from PF-02 logic.
- `RISK-518-001`: importing the full `aiv-executable-contract.js` would violate one-defect scope.
- `RISK-518-002`: changing B2/B3 values or identities to fit runtime is forbidden.

## Exact Continuation State

1. Re-read `main` before any mutation; if it moves, create a new grounding epoch.
2. Establish exact-current-main real-app Chromium custody.
3. Run same-group B2/B3 through normal AIV UI and capture source IDs, readiness, result and canvas evidence.
4. Change only the second relationship to a distinct group under the same Assessment+Case and rerun.
5. If production cross-combines distinct groups, rerun repository backup on every production file before editing.
6. Apply the smallest fail-closed correction without inventing group/scenario selection.
7. Add focused regression for same-group PASS and distinct-group fail-closed behavior.
8. Repeat identical Chromium workflows and run applicable frozen benchmarks; do not alter expected values.
9. Write PF-03 after/benchmark receipts and only then close PF-03 unless Owner explicitly waives remaining gates.

Do not merge without explicit Owner authorization.
