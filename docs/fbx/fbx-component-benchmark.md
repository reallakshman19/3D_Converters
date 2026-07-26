# FBX Component Benchmark Qualification

This directory is the Agent C boundary for semantic component qualification. It does not assign zones, classify supports, construct topology authority, define engineering tolerances, or invent source occurrences.

## Integration state

Agent Z's merged `FbxZoneMembershipIndex.v1` is a mandatory input. Both reference and actual indexes are validated, bound to the benchmark identity, required to cover the branch population exactly, and hashed into execution evidence.

Agent E's occurrence/loader/index/inventory foundation is not present on `main` at the time of this change. The current catalog therefore retains the pre-integration StagedJSON branch-child intake. Replacing that intake with Agent E occurrences is a required follow-up rebase step; this branch must not be represented as E-integrated until that contract exists.

## Files

```text
contracts/fbx/fbx-component-identity-policy.v1.schema.json
contracts/fbx/fbx-component-benchmark-report.v1.schema.json

tabs/model-converters/converters/fbx/benchmark/component-common.js
tabs/model-converters/converters/fbx/benchmark/component-policy.js
tabs/model-converters/converters/fbx/benchmark/component-zone.js
tabs/model-converters/converters/fbx/benchmark/component-catalog.js
tabs/model-converters/converters/fbx/benchmark/component-matching.js
tabs/model-converters/converters/fbx/benchmark/component-comparators.js
tabs/model-converters/converters/fbx/benchmark/component-ledger.js
tabs/model-converters/converters/fbx/benchmark/component-qualification.js

tests/fbx/component-benchmark-fixtures.mjs
tests/fbx/test-component-benchmark.mjs
tests/fbx/test-component-benchmark-adversarial.mjs
tests/fbx/test-component-benchmark-inventory.mjs
```

Production JavaScript modules are each below 300 lines. Matching, comparison, ledger construction, zone admission, and orchestration are separate units.

## Public API

```js
import {
  buildComponentSubjects,
  discoverComponentCatalog,
  qualifyComponents,
  validateComponentIdentityPolicy,
} from './component-qualification.js';
```

### `discoverComponentCatalog(stagedJson)`

Performs read-only inventory of branch children. Supports are counted separately and are not returned as components. This entry point is temporary pending Agent E occurrence integration.

### `validateComponentIdentityPolicy(policy)`

Validates the closed Agent C policy contract and rejects non-multimap indexes, duplicate merging, greedy collision resolution, passing diagnostic rules, non-one-to-one cardinality, overlapping type catalogs, incomplete scope keys, and frozen policies without a lowercase SHA-256 identity.

A `ZONE` identity rule must use `zoneIds`. Shared-boundary membership is a zone set and must not be collapsed to one arbitrary zone.

### `buildComponentSubjects(value, policy, side, options)`

Requires:

```text
options.zoneIndex
options.benchmarkIdentity
```

The zone index must be a valid `FbxZoneMembershipIndex.v1`, match the benchmark identity when supplied, and exactly cover the named branch population. `CONFLICT`, `UNASSIGNED`, and `EXCLUDED` records remain in the ledger but block qualification. No coordinate or naming inference is used.

Identical components remain distinct through multiplicity indexes. Canonical subject payloads and report payloads use SHA-256 identities.

### `qualifyComponents(options)`

Requires separate `referenceZoneIndex` and `actualZoneIndex` values. It produces `FbxComponentBenchmarkReport.v1` with complete reference and actual ledgers, ranked identity evidence, conflict-preserving collision groups, atomic one-to-one reservations, family comparison evidence, zone membership evidence, and deterministic summaries.

Numeric comparisons have no fallback tolerance. Missing tolerance rules produce blocked evidence. Spatial and structural diagnostic rules can expose candidates but cannot reserve passing matches.

## Zone evidence

Every ledger locator includes the full canonical membership record:

```text
branchName
status
authority
zoneIds
candidateZoneIds
exclusionReason
```

Common comparisons evaluate zone status and the canonical zone set. Authority differences are observations; membership differences fail. Each ledger record references its source zone index, and both complete indexes are hashed into `executionIdentity.zoneMembershipIndexes`.

## Built-in comparator IDs

```text
PIPE.v1
ELBOW.v1
TEE.v1
REDUCER.v1
FLANGE.v1
VALVE.v1
GASKET.v1
BRANCH_FITTING.v1
INSTRUMENT.v1
```

Selecting a comparator in a frozen type catalog is an authority decision. Orientation text remains observation-only until its grammar and frame semantics are frozen.

## Tests

`test-component-benchmark.mjs` covers schemas, policy admission, Z-index binding, zone-set scope, deterministic hashes, input-order independence, exact matching, and approved composite matching.

`test-component-benchmark-adversarial.mjs` covers duplicate collisions, approved collision resolution, family/attribute/geometry failures, missing and unexpected components, absent tolerances, observation-only differences, unknown types, cross-zone mismatches, zone conflicts, and forged branch coverage.

`test-component-benchmark-inventory.mjs` parses the immutable benchmark and asserts 37 branches, 354 components, 145 supports, 536 typed records, and the complete observed outer/raw type populations.

## Remaining integration blockers

- Agent E occurrence, loader, index, and inventory contracts are not available on `main`.
- No frozen production component identity policy exists.
- No frozen tolerance profile exists.
- No approved actual zone manifest exists.
- `GASK`, `OLET`, `INST`, synthetic `PIPE`, `BEND`, tee third-port, specification, material, and orientation authorities remain unresolved.
- The real benchmark and complete FBX suite still require exact-head execution by the integration lead.
