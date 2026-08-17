# PR #582 workreport — VIB-BASIS-01

## Mission

Bounded M5 slice for #581: require explicit FIT facility geometry/support/process/scenario basis custody before an executable facility request can be created.

## Repository state

```text
base main = 2e4ffa0fa19e22aaa949434dc42244c7546636e0
branch    = agent/vib-basis-581-fit-facility-custody
PR        = #582
issue     = #581
```

Appendix A was recorded before production mutation:

```text
comment = 5313176365
score   = 98/100
status  = QUALIFIED_FOR_VIB_ENGINEERING_BASIS_M5
```

## Delivered production behavior

`FitFacilityEngineeringBasis.v1` requires explicit:

```text
wallBasis
maximumSpanBetweenEffectiveSupports
spanDeterminationMethod
supportEffectivenessConfirmed
ACTUAL process-property basis
exact-case operatingScenarioCoherent
```

Process basis vocabulary is closed to:

```text
ACTUAL | STANDARD | NORMAL
```

`STANDARD` and `NORMAL` are preserved as explicit source states but are not converted in this slice; they block execution with a conversion-required reason.

For component-derived multiphase, gas and liquid density bases must both be explicit ACTUAL evidence.

No NPS/schedule geometry resolution, geometry tolerance, support inference, standard/normal conversion, or scenario synthesis is introduced.

## Facility request compatibility

The existing FIT adapter/domain API remains unchanged. Once M5 basis is READY:

```text
maximumSpanBetweenEffectiveSupports
  -> request.inputs.maximumUnsupportedSpan
```

This is a compatibility mapping only. The plan trace records the effective-support semantic separately and retains legacy `MAX_UNSUPPORTED_SPAN` only as legacy trace evidence.

## User correction path

The existing Data Blocker fill-only/collision contract now supports:

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

Invalid basis vocabulary and source collisions fail before planning.

## UI / trace reconciliation

The Engineering Basis projection now presents **Effective-support span** from `MAXIMUM_SPAN_BETWEEN_EFFECTIVE_SUPPORTS` rather than presenting the legacy span property as current authority.

The generic FIT mechanism working trace still exposes the existing normalized key `maximumUnsupportedSpan`; its exact backing source cell now resolves through the effective-support projection.

## Controlled benchmark blocker

A temporary attempt to assign benchmark M5 metadata was removed after source audit could not prove the classification from accessible controlled evidence.

Final branch restores these files exactly to base blobs:

```text
tabs/vibration-integrity-benchmarks.js
  058dc431af78d2a365160dbc3a45c57f29adb7a9

tests/vibration-fit-ui-benchmarks.test.mjs
  63cb9ac0e0b125c20db93b517c251fc5f1a4de33
```

Controlled benchmark oracles are also unchanged:

```text
B1 fit-ei-worked-examples-v1.json
  92c589d4f347f59abd29c059b13462802f436deb

B2 fit-independent-hand-benchmarks-v1.json
  94dd711e6af5458d8569389e461fc2514872f613
```

The focused M5 regression intentionally proves that the current D4 facility benchmark path is:

```text
NOT_READY
NOT_ASSESSED_DATA_INCOMPLETE
```

until controlled M5 basis metadata is source-reconciled.

Blocker:

```text
BLOCKED_SOURCE_BASIS:FIT_CONTROLLED_BENCHMARK_FACILITY_M5_METADATA
```

This is a source-basis custody blocker, not a changed numerical benchmark oracle.

## Changed production/test scope

Production:

```text
NEW  converters/vibration/facility/fit-engineering-basis.js
EDIT converters/vibration/facility/fit-plan-contract.js
EDIT converters/vibration/facility/fit-plan-item.js
EDIT converters/vibration/tabular/fit-data-blockers.js
EDIT tabs/vibration-integrity-engineering-basis.js
EDIT tabs/vibration-integrity-engineering-basis-view.js
```

Tests migrated/added:

```text
NEW  tests/vibration-facility-fit-engineering-basis.test.mjs
EDIT tests/vibration-facility-fit-plan.test.mjs
EDIT tests/vibration-facility-fit-preflight.test.mjs
EDIT tests/vibration-facility-fit-workflow.test.mjs
EDIT tests/vibration-facility-fit-tabular-workflow.test.mjs
EDIT tests/vibration-fit-data-blockers.test.mjs
EDIT tests/vibration-integrity-engineering-basis.test.mjs
EDIT tests/vibration-integrity-mechanism-context.test.mjs
```

All other changed paths are durable reports or exact pre-edit backups.

No `.github/workflows/*`, SBC/#546 technical files, T2.9 numerical/source files, FIT adapter/domain kernel, or benchmark oracle files are changed.

## Backup custody

Exact pre-edit blobs are retained under:

```text
.backups/connector-20260817-vib-basis-581/
```

The runtime is connector-only; `utils/backup.js` could not be executed. Backups use exact Git blob/tree reuse and must not be described as native backup-CLI execution.

## Validation truth at PR creation head

```text
PASS     base main unchanged / exact
PASS     active overlap search = SAFE for M5 basis paths
PASS     PR mergeable = true
PASS     review submissions = 0
PASS     review threads = 0
PASS     new resolver = 184 physical lines (<300)
PASS     focused M5 test <300 physical lines
PASS     protected FIT adapter/oracle/benchmark-loader blobs unchanged
PASS     no workflow/#546/T2.9 numerical-source path changes
PASS     benchmark source gap fails closed rather than being inferred
NOT_RUN  native exact-checkout focused Node test
NOT_RUN  full repository-native VIB/FIT/AIV suites
NOT_RUN  browser
NOT_RUN  PR Actions at creation head — no PR-triggered run returned
```

Native execution is unavailable in this connector-only runtime. No supporting static/reconstructed evidence is promoted to native PASS.

## Merge state

```text
DRAFT = true
MERGE_READY = false
MERGE_AUTHORITY = OWNER_ONLY / NOT_GRANTED_FOR_THIS_NEW_PR
```

Even with owner merge authority later, the present recommendation is **do not merge** until the controlled benchmark M5 basis blocker is resolved and exact-head validation is executed or explicitly waived.

## Exact next action

Recover/reconcile controlled source evidence for the FIT D2/D4 facility benchmark basis without changing expected outputs:

```text
wall basis
published span meaning / effective-support status
support/span determination provenance
actual process-property basis
coherent worked-example scenario basis
```

If source evidence cannot establish those fields, define a separately governed benchmark-only orchestration contract rather than weakening the project screening basis gate.
