# WIP-781-WEIGHT-BUILD-LOOP-20260930

## Recovery header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: RECOVERABLE
TAKEOVER_AUTHORITY: WRITE_ALLOWED
ISSUE: #781
BRANCH: agent/issue-781-weight-build-loop-20260930
REPORT_BASIS_MAIN: 119d0d65cc30adc9a677a61e92073a0e3aed510a
PROTOCOL: V3.1 / Common@1ced68258afeaf50df113b1d38a4ceb9193587e3
CRITICALITY: ENGINEERING_CRITICAL
CURRENT_STAGE: pre-edit backup / performance repair
HIGHEST_RISK: changing candidate eligibility/order while optimizing Weight-master scans
EXACT_NEXT_ACTION: native-backup weight-valve-hints + shared renderer exact main bytes, add cached bore/rating index and Build single-flight guard, run parity/performance regressions and applicable XML→CII CI.
```

## Source diagnosis

`#mc-wm-refresh` is not recursively self-clicking. One Build performs enrichment, `collectXmlCiiWeightMatchRows`, Match-1 validation, another collection, then a per-issue rating rerank. Every `rankXmlCiiWeightCandidates` currently scans the complete `config.weight.masterRows`, and fallback paths scan same-bore/rating rows again. A large imported Weight master therefore produces repeated issue-count × master-row-count UI-thread work. The shared renderer also allows overlapping `compute()` calls.

## Planned repair

1. Add a WeakMap-cached Weight-master index keyed by the masterRows array identity.
2. Preselect rows using the existing eligibility predicate only: finite bore with `abs(rowBore - requestedBore) < 1`, and rating exact/partial match under the current normalized-rating rule.
3. Preserve source row order before existing ranking/scoring logic.
4. Keep special-factor/interpolation fallback on the same narrowed row set because those paths already require exact same bore/rating.
5. Guard shared Build computation so a second click/validator trigger reuses/ignores the active computation and the button exposes busy state.

## Protected invariants

- Match-1 acceptance/provenance authority unchanged.
- Candidate scoring, length tolerance, interpolation/extrapolation formulas unchanged.
- Eligible-row semantics unchanged.
- Weight master persistence/custody unchanged.
- No Mode B/runtime/writer/topology change.
- Source/docs mirrors remain byte-identical.

## Coordination

Open PR #792 does not touch `converters/xml-cii2019-core/weight-valve-hints.js` or `tabs/model-converters/converters/xmltocii2019_helper/weight-match-renderer.js`; exact-file overlap = SAFE.

## Validation ledger

- pre-edit native backup: NOT_RUN
- index parity against brute-force eligible set: NOT_RUN
- 100k structural reduction: NOT_RUN
- overlapping Build guard regression: NOT_RUN
- existing Weight/Match-1 authority regressions: NOT_RUN
- Issue #776 exact-head authority/browser validation: NOT_RUN

MERGE_AUTHORITY = OWNER_ONLY / NOT_GRANTED for this follow-on PR.
