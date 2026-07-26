# FBX Component Benchmark Qualification

This module is the Agent C implementation boundary for semantic component qualification.
It does not assign zones, classify supports, construct topology authority, or define engineering tolerances.

## Files

```text
contracts/fbx/fbx-component-identity-policy.v1.schema.json
contracts/fbx/fbx-component-benchmark-report.v1.schema.json

tabs/model-converters/converters/fbx/benchmark/component-common.js
tabs/model-converters/converters/fbx/benchmark/component-policy.js
tabs/model-converters/converters/fbx/benchmark/component-catalog.js
tabs/model-converters/converters/fbx/benchmark/component-comparators.js
tabs/model-converters/converters/fbx/benchmark/component-qualification.js

tests/fbx/test-component-benchmark.mjs
tests/fbx/test-component-benchmark-inventory.mjs
```

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

Performs read-only inventory of branch children. Supports are counted separately and are not returned as components.
The output is deterministic and contains branch, component, support, outer-type, and raw-type counts.

### `validateComponentIdentityPolicy(policy)`

Validates the closed Agent C policy contract and rejects:

- non-multimap indexes;
- duplicate merging;
- greedy collision resolution;
- passing structural or spatial diagnostics;
- non-one-to-one cardinality;
- overlapping type-catalog entries;
- scope rules that omit their zone, owner, or branch key;
- frozen policies without a lowercase SHA-256 identity.

The validator does not calculate or approve the policy hash. Evidence authority owns that operation.

### `buildComponentSubjects(stagedJson, policy, side, options)`

Builds immutable, order-independent component subjects. Identical duplicates receive distinct multiplicity indexes.
Subject payloads receive SHA-256 identities. A supplied `zoneResolver` may attach an authoritative zone ID; no zone is inferred when it is absent.

### `qualifyComponents(options)`

Produces `FbxComponentBenchmarkReport.v1` with:

- one ledger record for every reference component;
- one ledger record for every actual component;
- exact, approved-composite, and diagnostic identity evidence;
- conflict-preserving collision groups;
- atomic one-to-one reservations;
- common and family-specific comparison evidence;
- missing, unexpected, ambiguous, blocked, attribute, geometry, and topology states;
- deterministic family and overall summaries.

`qualifyComponents` is asynchronous because subject and report identities use SHA-256.

## Authority inputs

The module requires a frozen `FbxComponentIdentityPolicy.v1` for qualification.
It accepts but does not invent:

```text
zoneResolver
FbxBenchmarkToleranceProfile.v1
normalization functions named by the policy
family comparator overrides
reference-subject topology outcomes
benchmark identity
execution identity
```

Numeric comparisons have no fallback tolerance. A missing tolerance rule produces `BLOCKED_IDENTITY` evidence.
Spatial and structural diagnostic rules can produce candidates but can never reserve a passing match.

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

Selecting a comparator in the frozen type catalog is the authority decision. The implementation does not automatically qualify an observed type.

Orientation text is currently reported as an observation. A governed orientation parser/comparator can be supplied as a comparator override after the orientation convention is frozen.

## Tests

`test-component-benchmark.mjs` covers:

- policy and report schema validation;
- deterministic subject SHA-256 identities;
- input-order independence;
- exact and approved-composite matching;
- duplicate collision preservation;
- collision resolution by an approved composite rule;
- one-to-one counterpart reservation;
- missing and unexpected components;
- wrong family, bore, and endpoint detection;
- non-passing spatial diagnostics;
- unknown-type blocking;
- zone resolver integration;
- missing-tolerance blocking;
- observation-only differences.

`test-component-benchmark-inventory.mjs` parses the immutable benchmark and asserts:

```text
37 branches
354 components
145 supports
536 typed records
```

It also asserts the complete outer-type and raw-type component populations.

## Deliberately unresolved authority

No frozen production identity-policy instance or tolerance profile is included in this change.
The Lead must resolve and approve at least:

- `GASK`, `OLET`, and `INST` dispositions;
- synthetic `PIPE` identity;
- `BEND` comparison semantics;
- tee third-port authority;
- governed specification and material fields;
- orientation grammar;
- all numeric tolerance rules.
