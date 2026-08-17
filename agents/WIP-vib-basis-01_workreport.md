# WIP — VIB-BASIS-01

## Mission

Implement #581: bind production FIT facility request readiness to explicit geometry/support/process/scenario engineering-basis custody without changing FIT numerical methods or authority.

## Live base

```text
repository = reallaksh19/3D_Converters
base/main  = 2e4ffa0fa19e22aaa949434dc42244c7546636e0
branch     = agent/vib-basis-581-fit-facility-custody
issue      = #581
Appendix A = comment 5313176365
score      = 98/100 / QUALIFIED_FOR_VIB_ENGINEERING_BASIS_M5
```

## Recovery / authority state

```text
TAKEOVER_AUTHORITY = IMPLEMENTATION_BOUNDED_TO_#581
OVERLAP             = SAFE for intended M5 basis paths at branch creation
MERGE_AUTHORITY     = OWNER_ONLY / NOT_GRANTED_FOR_NEW_M5_PR
```

## Frozen invariants

- NPS/DN is not OD; schedule is not wall thickness.
- `wallBasis = NOMINAL | MIN_SPEC | AS_BUILT | MEASURED_CURRENT`.
- facility span authority is `maximumSpanBetweenEffectiveSupports`, not legacy numeric `MAX_UNSUPPORTED_SPAN` alone.
- support/span determination evidence is explicit; no topology/render inference.
- process basis is explicit `ACTUAL | STANDARD | NORMAL`; this slice accepts ACTUAL only for FIT facility execution and performs no conversion.
- coherent scenario evidence is exact canonicalId/case bound and explicit.
- FIT equations/correlations/applicability/benchmark oracles remain byte-untouched.
- no Product Freeze, screening/design/code authority, workflow, #546 technical, or T2.9 numerical/source changes.

## Production implementation

### New basis resolver

`converters/vibration/facility/fit-engineering-basis.js`

```text
FitFacilityEngineeringBasis.v1
wall basis validation
maximumSpanBetweenEffectiveSupports validation
spanDeterminationMethod validation
supportEffectivenessConfirmed validation
ACTUAL density/velocity basis gate
ACTUAL component gas/liquid density basis gate
exact-case operatingScenarioCoherent gate
source trace + non-authorizing authority metadata
```

No support inference, process conversion, scenario synthesis or geometry reconciliation is implemented.

### Facility planner integration

`fit-plan-item.js` now:

1. resolves existing process evidence;
2. resolves M5 engineering basis;
3. merges basis missing/invalid state into plan readiness;
4. emits no request when basis is unresolved;
5. maps `maximumSpanBetweenEffectiveSupports` to the existing FIT adapter compatibility key `maximumUnsupportedSpan` only after basis is READY;
6. retains legacy `MAX_UNSUPPORTED_SPAN` only in trace as `legacyMaximumUnsupportedSpan`.

### Existing correction path

`fit-data-blockers.js` exposes the M5 fields through the existing fill-only/collision model:

```text
MAXIMUM_SPAN_BETWEEN_EFFECTIVE_SUPPORTS
WALL_BASIS
SPAN_DETERMINATION_METHOD
SUPPORT_EFFECTIVENESS_CONFIRMED
DENSITY_BASIS
VELOCITY_BASIS
GAS_DENSITY_BASIS
LIQUID_DENSITY_BASIS
OPERATING_SCENARIO_COHERENT
```

Invalid wall/process basis vocabulary fails before planning.

### UI truthfulness

The existing Engineering Basis projection now reads and labels `MAXIMUM_SPAN_BETWEEN_EFFECTIVE_SUPPORTS` as **Effective-support span**. It no longer presents legacy `MAX_UNSUPPORTED_SPAN` as the active span basis.

The mechanism-context compatibility trace continues to expose normalized key `maximumUnsupportedSpan`, but its source cell now resolves through the effective-support projection.

## Fixture migrations

Existing authoritative synthetic/product-path fixtures were updated to supply explicit M5 evidence while preserving their prior numerical expectations:

```text
vibration-facility-fit-plan.test.mjs
vibration-facility-fit-preflight.test.mjs
vibration-facility-fit-workflow.test.mjs
vibration-facility-fit-tabular-workflow.test.mjs
vibration-fit-data-blockers.test.mjs
vibration-integrity-engineering-basis.test.mjs
vibration-integrity-mechanism-context.test.mjs
```

## Controlled benchmark source blocker

During audit I briefly tested adding benchmark-only basis metadata to `tabs/vibration-integrity-benchmarks.js`, then removed it after source review could not prove the exact wall/support/process/scenario classifications.

Final branch restores both controlled loader and its regression test to their base blobs:

```text
tabs/vibration-integrity-benchmarks.js       058dc431af78d2a365160dbc3a45c57f29adb7a9
tests/vibration-fit-ui-benchmarks.test.mjs   63cb9ac0e0b125c20db93b517c251fc5f1a4de33
```

The benchmark oracle JSON also remains unchanged:

```text
Benchmarks/VibrationFIT/fit-ei-worked-examples-v1.json      92c589d4f347f59abd29c059b13462802f436deb
Benchmarks/VibrationFIT/fit-independent-hand-benchmarks-v1.json 94dd711e6af5458d8569389e461fc2514872f613
```

The focused M5 regression therefore explicitly requires the controlled D4 facility benchmark path to remain:

```text
NOT_READY
NOT_ASSESSED_DATA_INCOMPLETE
```

until controlled M5 basis evidence is separately reconciled. This is intentional fail-closed behavior, not a benchmark numerical failure.

Reason:
- connector can identify but cannot read the pinned binary PDF as text;
- available repository specification confirms maximum effective unsupported span semantics but does not prove `wallBasis=NOMINAL` for the published vectors;
- inventing that classification would violate source/authority rules.

## Exact backup custody

Exact pre-edit blobs are retained under:

```text
.backups/connector-20260817-vib-basis-581/
```

Connector-only runtime cannot execute `utils/backup.js`; backups use exact Git blob/tree reuse. Do not describe this as native backup CLI execution.

## Validation truth

```text
PASS     live main/base pinned
PASS     Appendix A 98/100 before mutation
PASS     protective M5 test committed before resolver existed
PASS     new resolver = 184 physical lines (<300)
PASS     focused M5 test remains <300 physical lines
PASS     FIT adapter blob unchanged: eef88d59846a5c779d5f56b71b9502955ddf1b41
PASS     B1 benchmark oracle blob unchanged: 92c589d4f347f59abd29c059b13462802f436deb
PASS     B2 benchmark oracle blob unchanged: 94dd711e6af5458d8569389e461fc2514872f613
PASS     controlled UI benchmark loader restored byte-identical
PASS     no .github/workflows changes
PASS     no SBC/#546 technical-path changes
PASS     no T2.9 numerical/source changes
PASS     benchmark source-basis gap fails closed rather than being inferred
NOT_RUN  native exact-checkout focused Node test — connector-only private checkout unavailable
NOT_RUN  full repository-native VIB/FIT/AIV suites
NOT_RUN  browser
```

## Known blocker

```text
BLOCKED_SOURCE_BASIS:FIT_CONTROLLED_BENCHMARK_FACILITY_M5_METADATA
```

The M5 code is source-complete for explicit project evidence, but a merge-ready state requires either:

1. controlled source proof for the benchmark wall/support/process/scenario basis; or
2. an independently governed decision that benchmark product-path orchestration uses a different explicitly bounded basis contract.

Neither is inferred in this PR.

## EXACT_NEXT_ACTION

Open draft PR with the benchmark source-basis blocker visible. Do not merge until the blocker is resolved and exact-head repository-native validation is available or explicitly owner-waived.
