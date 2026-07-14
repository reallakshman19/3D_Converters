# Component Topology Artifacts

## Purpose

The component-topology exporter creates the three producer artifacts required by the independent XML Compare Utilities validator:

```text
managed source JSON
  -> CanonicalTopology.v1
  -> TopologyTraceLedger.v1
  -> component-aware topology InputXML
```

This path is separate from the legacy engineering InputXML converter. It does not emit restraints, supports, automatic anchors, rigid weights, material, wall thickness, temperature, pressure, insulation, or engineering SIF values.

## Source identity and connection authority

Source entity and port IDs use the existing `SourceEnvelope.v1` and `UniversalSourceGraph.v1` identity formula. IDs are derived from the source file identity, exact JSON path, and `json-object` entity kind. Coordinates are never rounded for identity.

Connectivity authority is explicit source evidence:

- branch child order for route continuity;
- branch HPOS/TPOS for endpoint association;
- CREF with reciprocal HREF/TREF for TEE/OLET branch connections;
- HREF/TREF for branch-to-branch connections;
- external HREF/TREF or missing TEE CREF for boundaries.

Coordinates verify those declared relationships. The normal tolerance is 0.5 mm. A separately disclosed 1 mm source-precision allowance accepts one 0.502 mm branch-head residual at `$[113]`; it is recorded as `SOURCE_CONNECTION_PRECISION_RESIDUAL` and is not hidden.

## Component policy

- PIPE produces route edges.
- Finite VALV, FLAN, GASK, INST, and REDU records retain dedicated component edge ancestry.
- Finite ELBO records produce two bend-arm edges; zero-length ELBO records become point features.
- TEE records create shared junctions and finite run-in/run-out edges.
- OLET records create header-tap junctions. The managed source already segments both header sides at every OLET position; ledger `affectedEdgeIds` identify those two edges.
- CREF branch offsets become explicit branch-connection edges. Coincident connections share the junction node without producing a zero-length element.
- Zero-length FLAN and INST records become point features.
- SUPPORT records use `DEFER_SUPPORT` and never enter route or InputXML output.

The benchmark contains 44 finite INST records with an exactly coincident `AUTO_GENERATED_PIPE` carrier. Each pair shares one canonical component edge and one InputXML element with both source IDs. Both ledger records declare `MANY_TO_ONE`, `AUTO_GENERATED_PIPE_COMPONENT_SPAN`, and explicit reclassification evidence.

## Generate artifacts

From `F:\CODE-5\3D_Converters`:

```powershell
node scripts/build-component-topology-artifacts.mjs `
  --input Benchmarks/1885_NC/1885_NC.json `
  --output-dir Benchmarks/1885_NC
```

Outputs:

```text
Benchmarks/1885_NC/1885_NC.canonical-topology.json
Benchmarks/1885_NC/1885_NC.topology-trace-ledger.json
Benchmarks/1885_NC/1885_NC.topology.input.xml
```

The browser StagedJSON -> InputXML action also includes these three files in its download outputs. The legacy InputXML remains a separate output for compatibility.

## Real 1885_NC result

| Metric | Result |
| --- | ---: |
| Source branches | 278 |
| Child records | 4,320 |
| Route components | 2,939 |
| Deferred supports | 1,381 |
| Canonical nodes | 3,409 |
| Canonical edges | 3,429 |
| Point features | 63 |
| Junctions | 206 |
| Boundaries | 28 |
| InputXML elements | 3,429 |
| Zero-length edges/elements | 0 |
| Blocked records | 0 |

Reference reconciliation is CREF 203/203, HREF/TREF 391/416 internal, and 25 external. The independent validator reports 100% source disposition and ancestry coverage with zero blocking issues.

## Tests

```powershell
node tests/component-topology-static.test.js
node tests/component-topology-artifacts-1885-nc.test.mjs
node tests/stagedjson-inputxml-workpack.test.js
```
