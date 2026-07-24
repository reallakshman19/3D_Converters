# FBX-RUNTIME-002 capability registry and benchmark baseline

## Scope and accepted baseline

This work pack adds three new, deliberately separated contracts:

```text
FbxFeatureCapabilityRegistry.v1  deterministic programme policy
FbxFeatureReport.v1              deterministic per-file evidence projection
FbxRuntimeBenchmark.v1           non-canonical runtime measurement
```

Implementation began from:

```text
main:    2ad906b23d62c4701c7ca67c573480f06c438cd3
branch:  feat/fbx-runtime-002-capability-baseline
gate:    STAGE A: ACCEPTED
issue:   #284
```

The mission does not add mesh topology, materials, textures, animation playback, GLB generation, geometry transport, engineering classification, or mapping behavior.

## Authority boundaries

The existing ufbx/WASM parser and managed worker remain the raw parsing authority. `FbxSourceGraph.v2`, after `enforceSourceGraphPolicy()`, remains the accepted parser-evidence authority. Repository provenance remains the parser-identity authority.

`feature-capability-registry.js` states programme capability policy but never inspects an FBX file. `feature-report.js` receives an already accepted graph and projects only its existing closed evidence. It accepts no raw bytes or parser callback. `runtime-benchmark.js` measures an injected execution and hashes returned artifact bytes. It imports neither feature policy nor mapping/conversion code.

Existing mapping worklists, mapping validators, decision compilers, packages, binding checks, and StagedJSON writers remain the only engineering-mapping and publication authorities.

## Capability registry

The registry is a closed, deeply frozen deterministic value:

```js
{
  schema: 'FbxFeatureCapabilityRegistry.v1',
  registryVersion: '1.0.0',
  statusVocabulary,
  entries,
}
```

Each entry has exactly:

```js
{
  featureId,
  evidenceStatus,
  renderStatus,
  exportStatus,
  engineeringMappingStatus,
  limitations,
  futureWorkPack,
}
```

The closed status vocabulary is:

```text
supported
metadata-only
tessellation-required
blocked-missing-data
blocked-unsupported
requires-governed-mapping
not-applicable
unknown
```

`requires-governed-mapping` is a feature-report publication result, not a registry policy value. Registry entries are ASCII-lexically ordered by `featureId`. Limitations are closed, unique, and ASCII-lexically ordered. Unknown fields, unknown feature IDs, unknown limitations, invalid status contexts, and invalid future work-pack identifiers fail validation.

The registry deliberately reports mesh points as retained evidence while mesh topology and transferable geometry remain blocked and assigned to `FBX-RUNTIME-003`.

## Deterministic feature report

The feature report has exactly:

```js
{
  schema: 'FbxFeatureReport.v1',
  registryVersion,
  sourceGraphSchema,
  sourceIdentity,
  parserIdentity,
  counts,
  features,
  unknownElementTypes,
  warnings,
  blockedCapabilities,
  summary,
}
```

Each feature row explicitly distinguishes:

```text
recognized
parsed
retainedAsEvidence
renderStatus
exportStatus
engineeringMappingStatus
stagedJsonStatus
```

A parsed typed record is not automatically renderable or exportable. Metadata-only records remain metadata-only. Mesh source evidence does not imply retained topology. NURBS control points do not imply a complete retained curve definition or tessellator. FBX connection records do not become engineering-topology authority.

No feature receives `stagedJsonStatus: supported` from this report. Mapping-eligible evidence receives `requires-governed-mapping`; publication still requires the established governed mapping and binding path.

The builder accepts only:

```js
{
  graph,
  sourceIdentity,
  parserIdentity,
  registry,
}
```

It does not accept raw bytes, URLs, file handles, parser callbacks, mapping manifests, or runtime diagnostics. Input graph order is normalized by the existing source-graph policy, and all report arrays use deterministic ordering.

## Runtime benchmark

The benchmark report has exactly:

```js
{
  schema: 'FbxRuntimeBenchmark.v1',
  sourceSha256,
  sourceByteLength,
  parserDigest,
  runtimeEnvironment,
  runConfiguration,
  runs,
  aggregate,
  semanticArtifactDigests,
}
```

It is intentionally non-canonical. Runtime version, platform, architecture, user agent, hardware concurrency, cross-origin isolation, durations, run outcomes, and aggregates may vary between environments and runs.

Every optional observation uses an explicit availability record:

```js
{ status: 'available', value }
{ status: 'unavailable', reason }
```

Unavailable measurements are never represented as zero. A clock that cannot provide a finite monotonic interval yields `CLOCK_UNAVAILABLE`. An aggregate with no available successful duration yields `NO_AVAILABLE_SUCCESSFUL_RUNS`.

Measured execution returns a map of semantic artifact names to exact bytes. The benchmark hashes those bytes. If successful measured runs produce different artifact-digest maps, the benchmark fails with `SEMANTIC_ARTIFACT_DRIFT` rather than averaging incompatible executions.

The benchmark does not canonicalize, modify, publish, or authorize any semantic artifact.

## Isolation invariants

Runtime-only fields must not enter:

```text
FbxSourceGraph.v2
FbxFeatureReport.v1
mapping worklists
draft decisions
mapping packages
binding reports
deterministic conversion reports
StagedJSON
promoted no-mapping JSON
canonical hashes
```

Forbidden runtime fields include:

```text
runtimeEnvironment
runConfiguration
runs
aggregate
durationMs
timestamp
timestamps
workerMode
inputByteLength
progressStages
stageTimingsMs
workerCreated
workerTerminated
terminalCode
hardwareConcurrency
crossOriginIsolated
userAgent
runtimeVersion
platform
architecture
```

The isolation test derives real parser, feature-report, no-mapping, promoted JSON, mapping-package, binding-report, conversion-report, and StagedJSON bytes from the accepted fixture path. It benchmarks repeated creation of those artifacts and requires the benchmark's semantic digests to equal independent pre- and post-benchmark digests exactly.

Static guards prohibit semantic production modules from importing `runtime-benchmark.js`, prohibit the benchmark from importing feature, source-graph, mapping, or conversion policy, and prohibit locale-dependent canonical ordering.

## Agent handoffs

The lead integrated the exclusive workstreams in the required order:

```text
Agent A registry policy:          a862a22671dc2c7c00c93df72673aa9786a1a80b
Agent B deterministic report:     ec40e9bdc8dcf60cdc56679cf5a4bb3f721e9065
Agent C runtime benchmark:        1539083170ae9a52b32750df750bf4c07160586f
Agent D isolation/integration:    recorded at final head
```

Each handoff is accepted only after changed-file ownership, focused tests, syntax checks, limitations, and branch ancestry are verified.

## Required certification

```bash
node tests/fbx/test-feature-capability-registry.mjs
node tests/fbx/test-feature-report.mjs
node tests/fbx/test-feature-report-determinism.mjs
node tests/fbx/test-runtime-benchmark.mjs
node tests/fbx/test-runtime-benchmark-failures.mjs
node tests/fbx/test-runtime-capability-isolation.mjs
node tests/fbx/run-all.mjs
node tests/fbx/test-static-guards.mjs
```

Every changed JavaScript file must also pass `node --check`. The complete FBX regression, committed-WASM reproducibility checks, exact-head hosted checks, and required browser verification must be recorded separately. An unavailable required certification gate is a stop condition unless the governing issue is explicitly revised before implementation; it is not converted into a passing result by silence.

## Next work pack

`FBX-RUNTIME-003` should address binary mesh topology and transferable geometry transport. It must not infer topology merely from retained mesh point arrays.
