# ADR-008 — UXML/RVM exact topology and coordinate-context authority

## Status

Accepted for implementation in PR-9. Production activation and migration are not authorized.

## Context

The `uxml-rvm-intake` resolver previously accepted topology produced by `UniversalTopoGraph`, whose node construction used coordinate tolerance. The bridge also retained ray, proximity, graph-comparison, topology-decision, and accepted-handoff artifacts in the canonical authority chain. Engineering node numbers were generated from sorted graph order, line identity could fall back to caller defaults, coordinate authority could be a loose basis string or arbitrary matrix, engineering aliases used first-value-wins lookup, and the ledger did not independently reconstruct every source relation.

Those mechanisms violate the governing distinction:

```text
topology authority != coordinate coincidence
geometry evidence  != ownership evidence
node identity       != generated ordering
line identity       != caller default
```

## Decision

### Profile isolation

Only this registered pair changes semantically:

```text
dialect: uxml-rvm-intake
adapter: uxml-rvm-to-canonical
```

Shared modules under `uxml/**` and `rvm-pcf-extract/**` remain unchanged. The RVM adapter is used only to create a source inventory. Generic graph, ray, proximity, comparison, topology-decision, and accepted-handoff outputs have no canonical authority.

### Immutable authority manifest

Every accepted compile requires `UxmlRvmAuthorityManifest.v1`, source-bound and independently pinned by `uxmlRvmApprovedAuthorityManifestHashSha256`. The manifest binds the exact coordinate-context, topology-plan, and engineering-context semantic hashes. Restamping an authority artifact cannot create acceptance unless the independently approved manifest hash also changes.

### Coordinate context

`UxmlRvmCoordinateContext.v1` is mandatory. It binds the exact source bytes and requires:

- named source and `CAESAR_GLOBAL` target frames;
- registered source units and exact conversion to millimetres;
- an exact signed-axis permutation using each source axis once;
- signs exactly `1` or `-1`;
- finite explicit offset;
- explicit source and target handedness consistent with the permutation determinant;
- exact nested object shapes with no arbitrary matrix, shear, rotation, or non-uniform scale;
- independently recomputed semantic hash.

Coordinates corroborate an explicit logical node. Connected ports must transform to exactly equal coordinates. No snapping, averaging, tolerance, midpoint creation, repair, or endpoint mutation is permitted. Distinct logical nodes may occupy identical coordinates.

### Exact topology

Logical-node membership comes only from:

1. direct `EXACT_LOGICAL_NODE` and `EXACT_PORT_CONNECTION` UXML declarations with `EXACT_SOURCE` confidence; or
2. `UxmlRvmExactTopologyPlan.v1`, source-hash and adapted-UXML-hash bound.

Every required PIPE endpoint port appears exactly once. Explicit connections must be registered, symmetric or undirected-exact, and contained within one declared logical node. Coordinates, rays, proximity, row order, lexical order, and generic export labels cannot create membership or adjacency.

### Engineering node numbers

Each logical node requires one finite positive integer from an explicit source anchor or the approved topology plan. Source and external values must agree. Number ownership is one-to-one and globally unique. Sorted `10,20,30,...` generation is removed.

### Line ownership

All `pipelineRef`, `lineKey`, and `lineNo` occurrences are collected from component and matching pipeline records. Equivalent aliases normalize; contradictions block. An approved plan assignment may supply a missing value but cannot override source evidence. `defaultLine`, `lineId`, filename, Job Name, model ID, coordinates, node numbers, and component ordering have no line authority. Cross-line logical nodes block.

### Engineering fields

All OD and wall-thickness aliases are collected from every source origin. Equivalent values reconcile; contradictions block. `UxmlRvmEngineeringContext.v1` can provide missing fields only through source-bound, versioned decisions. External values cannot override explicit source values. Bore is never an OD alias. Required PIPE OD and wall thickness must be finite and positive.

### Bridge boundary

`InputXmlUxmlRvmBridgeRequest.v1` and `InputXmlUxmlRvmBridgeResult.v1` bind source bytes, source kind, profile identity, authority hashes, request hash, bridge identity, adapted UXML, collection hashes, diagnostics, and result hash. The boundary uses strict UTF-8 and duplicate-key-rejecting JSON, bounded source/stdout/stderr, hard timeout, canonical base64, stable key ordering, no current-clock values, and no runtime bridge replacement.

### Independent accounting

`InputXmlUxmlRvmSourceAccountingProof.v1` reconstructs expected canonical elements from immutable source and approved artifacts, not from the candidate XML or ledger. It records cardinality before map/set collapse and verifies source collections, ownership, logical nodes, node numbers, line decisions, coordinate transforms, DELTA, engineering fields, unsupported evidence, bridge hashes, and canonical relations. Every invariant must equal zero for accounting closure.

## Compatibility consequences

Previously accepted coordinate-only UXML and RVM loops now block. RVM rows require an approved exact-topology plan. Loose `coordinateBasis=CAESAR`, caller line defaults, restamped topology decisions, ray/proximity handoffs, and generated node numbers no longer provide compatibility authority. Unsupported components and supports remain preserved and blocking.

## Security consequences

Coordinated changes to ledger and XML remain detectable because expected values are reconstructed from source and independently approved authority artifacts. Full authority-artifact restamping remains detectable through the independent manifest pin.

## Rollback

Rollback is limited to the PR-9 compiler-specific files and fixtures. Shared UXML/RVM runtimes, schemas, registries, publication, production CII writer, and workflows are outside the rollback scope because they are unchanged.

## Deferred work

PR-10 resource characterization, corpus expansion, legacy parity, migration, and production activation are not started by this decision.
