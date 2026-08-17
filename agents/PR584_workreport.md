# PR #584 workreport — VIB-GEOM-CUSTODY-02

## Mission

Bounded M5 slice #583:

> Bind FIT `wallBasis=NOMINAL` readiness to exact certified Catalogue Evidence custody for the same Canonical ID without using DN/schedule as numerical geometry and without inventing a geometry consistency tolerance.

## Repository / PR identity

```text
base main                    = fd7f303dbce054a63f10f8c6b8e234e6d09462ef
branch                       = agent/vib-geom-custody-583-nominal-catalogue
issue                        = #583
PR                           = #584
Appendix A comment           = 5314137872
score                        = 98/100
qualification                = QUALIFIED_FOR_VIB_NOMINAL_GEOMETRY_CUSTODY_M5
primary implementation head  = 11579c2d5510e0597840f10c434ed6c77211ca89
purity-hardening head         = 5128de06558231afde7fe25499c94aa272af0697
```

This report is committed after implementation/hardening checkpoints, so the final PR head is the later commit containing this report and related audit-only backup custody.

## Delivered production behavior

The complete `VibrationTableExchange.v1` already includes `Elements[]` descriptors and complete-only `Catalogue Evidence[]`, but the pre-#584 dataset assembler discarded both before FIT planning.

This PR retains exact exchange custody in the deep-frozen dataset:

```text
exchangeComplete
elements[]
catalogueEvidence[]
```

and introduces:

```text
FitFacilityGeometryCustody.v1
```

For `wallBasis=NOMINAL`, readiness requires:

```text
complete exchange
exact same Canonical ID element
exact same Canonical ID Catalogue Evidence
authority
catalogueId
catalogueVersion
catalogueHash
recordId
recordHash
non-empty sourceReference
```

When Elements `catalogueAuthority` is present it must agree with Catalogue Evidence `authority`.

Fail-closed reasons:

```text
NOMINAL_GEOMETRY_COMPLETE_EXCHANGE_REQUIRED
NOMINAL_GEOMETRY_CATALOGUE_CUSTODY_REQUIRED
NOMINAL_GEOMETRY_CATALOGUE_AUTHORITY_MISMATCH
```

Canonical-ID matching is exact. Foreign IDs and whitespace-different source identities do not satisfy the assessment point.

## Numerical / authority boundary

Permanent invariants remain:

```text
DN/NPS != outsideDiameter
Schedule != wallThickness
```

`dnInMm`, `dnOutMm` and `schedule` are retained only as `nominalDescriptor` trace. They never populate or modify OD/wall/ID and never enter `request.inputs`.

Catalogue custody is provenance-only:

```text
authority                   = GEOMETRY_PROVENANCE_CUSTODY_ONLY
engineeringAuthority        = NONE
screeningAuthority          = NOT_AUTHORIZED
designAuthority             = false
numericalDimensionAuthority = false
```

For `MIN_SPEC | AS_BUILT | MEASURED_CURRENT`, this slice returns catalogue custody `NOT_REQUIRED`; it does not silently attach nominal catalogue authority.

No schedule-to-dimension resolver or OD-wall-ID tolerance is introduced.

## Production seam

```text
EDIT converters/vibration/dataset/assemble.js
NEW  converters/vibration/facility/fit-geometry-custody.js
EDIT converters/vibration/facility/fit-plan-context.js
EDIT converters/vibration/facility/fit-engineering-basis.js
EDIT converters/vibration/facility/fit-plan-item.js
```

Flow:

```text
complete exchange
 -> isolated deep-frozen dataset element/catalogue custody copies
 -> per-point exact custody receipt
 -> FitFacilityEngineeringBasis.v1 geometry gate
 -> READY only if NOMINAL custody is valid
 -> existing FIT request uses explicit dimensional enrichment only
```

`FitFacilityEngineeringBasis.v1.geometry` exposes:

```text
wallBasis
geometrySource
catalogueAuthority
catalogueRecordId
nominalDescriptor
```

and source trace exposes:

```text
sourceTrace.geometry.catalogueCustody
```

## Test-first evidence

Primary nominal-custody falsifier was committed before production repair:

```text
1156b8231e9775e2bef8fe82b071fcc7c0ce794a
```

Focused tests:

```text
tests/vibration-facility-fit-geometry-custody.test.mjs         173 lines
tests/vibration-facility-fit-geometry-custody-trace.test.mjs    84 lines
tests/vibration-facility-fit-geometry-custody-scope.test.mjs    45 lines
tests/vibration-facility-fit-geometry-custody-purity.test.mjs   53 lines
```

Coverage:

```text
G01 dataset retains exchange custody
G02 NOMINAL missing catalogue record fails closed
G03 incomplete catalogue identity fails closed
G04 authority mismatch fails closed
G05 exact record allows normal readiness without changing dimensions
G06 limited Elements-only exchange cannot establish NOMINAL
G07 absurd DN/schedule descriptors cannot modify explicit OD/wall
G08 non-NOMINAL basis acquires no catalogue authority
G09 exact catalogue record/source trace is exposed without authority promotion
G10 catalogue/DN/schedule fields never enter numerical FIT request
extra foreign/whitespace Canonical IDs cannot satisfy exact scope
extra dataset freezing does not freeze caller-owned exchange custody objects
```

## Continuation hardening — caller-object purity

A live continuation review identified an unintended side effect introduced by the new dataset custody retention:

```text
pre-hardening behavior:
  elements: [...exchange.elements]
  catalogueEvidence: [...exchange.catalogueEvidence]
  exchangeAuthority: exchange.authority

then deepFreezeVibrationDataset(...)
```

The arrays were copied but their objects were not. Recursive dataset freezing could therefore freeze caller-owned `Elements`, `Catalogue Evidence.sourceReference`, and exchange-authority objects.

The protective regression was committed before the repair:

```text
baf32a7fc6d34ff73b9d1b5446ef56aa6026a90c
```

Repair:

```text
5128de06558231afde7fe25499c94aa272af0697
```

`assembleVibrationIntegrityDataset()` now recursively clones only retained exchange custody values before freezing the dataset. This changes no FIT inputs, equations, applicability, catalogue authority semantics, or readiness criteria; it restores caller-object purity while preserving immutable dataset custody.

## Existing fixture migration

Pre-#583 synthetic tests had used `NOMINAL` as a generic wall-basis token while carrying no catalogue record. Rather than fabricate catalogue evidence, unrelated tests were migrated to explicit `AS_BUILT`:

```text
tests/vibration-facility-fit-engineering-basis.test.mjs
tests/vibration-facility-fit-plan.test.mjs
tests/vibration-facility-fit-preflight.test.mjs
tests/vibration-facility-fit-workflow.test.mjs
tests/vibration-facility-fit-tabular-workflow.test.mjs
tests/vibration-fit-data-blockers.test.mjs
```

Their numerical expectations remain unchanged. Dedicated #583 tests own the positive NOMINAL authority seam.

## Backup custody

Connector-only backup custody is explicit; no claim is made that `node utils/backup.js` ran.

Earlier exact Git blob/tree checkpoints:

```text
509a8640acbb48ec89de0730a6a6bab6ae53726e  pre-production production-file blobs
30601674c3b3f6bb553536bda4fcd4f78a85eab6  pre-migration fixture blobs
9b967deff21550c5cf9a060f8d074e30c79829d7  post-create resolver blob before hardening
```

Continuation backup commits:

```text
18b94a76c1858824724666c994afcac2eedf0799  exact pre-purity-repair assemble.js copy
a633cca9837e77fa9c8eb3724de164352a9773e5  exact pre-report-refresh PR584 workreport copy
```

## Protected scope

No changes to:

```text
FIT equations/correlations/applicability
B1/B2 benchmark expected values/tolerances
screening/design/code authority
Product Freeze
NPS/DN/schedule dimension tables
OD-wall-ID consistency tolerance
standard/normal process conversion
scenario synthesis
.github/workflows/*
PR #546 technical work
T2.9 numerical/source work
```

## Validation truth at post-hardening implementation head

```text
PASS     main/base exact and branch behind 0
PASS     Appendix A 98/100 before production mutation
PASS     primary custody regression committed before primary repair
PASS     purity regression committed before purity repair
PASS     PR mergeable = true at 5128de06558231afde7fe25499c94aa272af0697
PASS     review submissions = 0 at post-hardening re-ground
PASS     review threads = 0 at post-hardening re-ground
PASS     fit-geometry-custody.js = 175 physical lines (<300)
PASS     focused custody tests each <300 physical lines
PASS     compare ledger contains no workflow/#546/T2.9 numerical-source/FIT benchmark-oracle changes
PASS     DN/schedule/catalogue excluded from request.inputs by machine-test source
PASS     retained custody is cloned before dataset deep-freeze by source inspection
NOT_RUN  native exact-checkout focused Node tests — connector-only private checkout unavailable
NOT_RUN  full repository-native VIB/FIT/AIV suites
NOT_RUN  browser
NOT_RUN  exact post-hardening-head PR Actions — no pull-request workflow run returned for 5128de06558231afde7fe25499c94aa272af0697
```

Source/static evidence is not promoted to native execution PASS.

## Merge state

```text
DRAFT = true
MERGEABLE = true at post-hardening re-ground
MERGE_AUTHORITY = OWNER_ONLY / NOT_GRANTED_FOR_THIS NEW PR
```

The prior Owner authorization applied to #582 only. This PR must remain draft and unmerged until a new explicit Owner merge instruction.

## Next programme position

#429 remains in M5 after this slice. This PR does not authorize M6.

Still-separate M5 obligations include controlled geometry consistency/tolerance authority (if introduced), explicit standard/normal-to-actual process resolution, and broader coherent-scenario semantics. None are implemented here, and no dependent production branch should assume #584 has landed while it remains unmerged.