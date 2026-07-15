# Component Topology Artifacts

## Purpose

The component-topology exporter creates the three producer artifacts required by the independent XML Compare Utilities validator:

```text
managed source JSON
  -> CanonicalTopology.v1
  -> TopologyTraceLedger.v1
  -> component-aware topology InputXML
```

The topology output is native CAESAR II 11 InputXML. It resolves the existing staged-JSON engineering records, splits route edges at grouped support locations, emits RESTRAINT and RIGID children, and writes physical, material, process, line, and global-coordinate attributes on every element.

## Source identity and connection authority

Source entity and port IDs use the existing `SourceEnvelope.v1` and `UniversalSourceGraph.v1` identity formula. IDs are derived from the source file identity, exact JSON path, and `json-object` entity kind. Coordinates are never rounded for identity.

Connectivity authority is explicit source evidence:

- branch child order for route continuity;
- branch HPOS/TPOS for endpoint association;
- CREF with reciprocal HREF/TREF for TEE/OLET branch connections;
- HREF/TREF for branch-to-branch connections;
- external HREF/TREF or missing TEE CREF for boundaries.

Coordinates verify those declared relationships. The normal tolerance is 0.5 mm, ordinary source-order precision is 1 mm, referenced branch endpoints allow the explicit 75 mm source contract, and support projection is limited to 50 mm. Accepted residuals remain visible as `SOURCE_CONNECTION_PRECISION_RESIDUAL`; larger residuals raise instead of fabricating topology.

## Component policy

- PIPE produces route edges.
- Finite VALV, FLAN, GASK, INST, and REDU records retain dedicated component edge ancestry.
- Finite ELBO records produce two bend-arm edges; zero-length ELBO records become point features.
- TEE records create shared junctions and finite run-in/run-out edges.
- OLET records create header-tap junctions. The managed source already segments both header sides at every OLET position; ledger `affectedEdgeIds` identify those two edges.
- CREF branch offsets become explicit branch-connection edges. Coincident connections share the junction node without producing a zero-length element.
- Zero-length FLAN and INST records remain point features and their resolved weights are assigned to the nearest connected native element.
- SUPPORT hierarchy and identical-position records are grouped by the staged-JSON resolver. Their physical positions split owning route edges, all source support records retain lineage, and the ledger uses `EMIT_SUPPORT_ATTACHMENT`.

The benchmark contains 44 finite INST records with an exactly coincident `AUTO_GENERATED_PIPE` carrier. Each pair shares one canonical component edge and one InputXML element with both source IDs. Both ledger records declare `MANY_TO_ONE`, `AUTO_GENERATED_PIPE_COMPONENT_SPAN`, and explicit reclassification evidence.

## Generate artifacts

From `F:\CODE-5\3D_Converters`:

```powershell
node scripts/build-component-topology-artifacts.mjs `
  --input C:\path\to\ATTRIBUTE-AML_ASIM-1835_managed_stage_enriched_stage.json `
  --output-dir C:\path\to\ASIM-1835-output
```

Outputs:

```text
ASIM-1835-output/*.canonical-topology.json
ASIM-1835-output/*.topology-trace-ledger.json
ASIM-1835-output/*.topology.input.xml
```

The browser StagedJSON -> InputXML action also includes these three files in its download outputs. The legacy InputXML remains a separate output for compatibility.

## Real ASIM-1835 result

| Metric | Result |
| --- | ---: |
| Source branches | 276 |
| Child records | 4,608 |
| Route components | 3,277 |
| Grouped support nodes | 663 |
| Native restraints | 828 |
| Resolved rigid bodies | 1,652 |
| Native rigid elements | 1,606 |
| Canonical nodes | 4,409 |
| Canonical edges / InputXML elements | 4,437 |
| Point features | 64 |
| Junctions | 216 |
| Boundaries | 28 |
| Zero-length edges/elements | 0 |
| Blocked records | 0 |

Reference reconciliation is CREF 216/216, HREF/TREF 392/420 internal, and 28 external. All 1,331 raw support records map to the 663 physical support nodes; no support remains deferred. The 1885_NC fixture now serves as a rejection gate because it contains a support 4,582.734 mm away from its owning route.

## Tests

```powershell
node tests/component-topology-static.test.js
node tests/component-topology-artifacts-1885-nc.test.mjs
node tests/component-topology-artifacts-asim-1835.test.mjs
node tests/stagedjson-inputxml-workpack.test.js
```
