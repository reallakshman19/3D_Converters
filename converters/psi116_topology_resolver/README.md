# PSI116 Topology Resolver Foundation

This package performs a non-mutating topology analysis of PSI116 XML and emits two deterministic JSON sidecars:

```text
<stem>.topology-findings.json
<stem>.topology-fix-plan.json
```

It does not rewrite PSI116 XML and does not alter the XML→CII engine.

## Topology model

PSI116 is treated as a component-port record stream, not as a flat list of positive nodes. Analysis proceeds in this order:

```text
lossless Branch/Node inventory
→ contiguous component occurrences
→ component-internal spans and inter-occurrence connections
→ coincident connection clusters
→ pipe-carrier projections
→ overlap checks on finite component spans only
→ dry-run action planning
```

This prevents support, olet, elbow and inline-component rows located inside a finite pipe envelope from being misread as backtracking pipe elements.

## Current findings

The resolver reports:

- coincident connection identities and their deterministic owner;
- zero-length and sub-6 mm route connections;
- short finite gasket/inline spans that must be retained;
- non-rigid component classes marked `Rigid=2`;
- instruments whose rigid status needs explicit evidence;
- missing elbow helper endpoint evidence;
- tee/olet junction owners inferred from their positive port sets;
- supports and junctions projected to finite pipe carriers;
- auto-generated pipe carriers overlapping inline components with explicit `MANY_TO_ONE` evidence;
- duplicate and partially overlapping finite component spans.

Each finding receives one dry-run disposition:

```text
ALIAS_COINCIDENT_NODE
CONTRACT_PRESERVE_OWNER
SAFE_DROP_PIPE_GEOMETRY
REMOVE_FALSE_RIGID
MERGE_CARRIER_WITH_COMPONENT
KEEP
BLOCK_AMBIGUOUS
```

Duplicate exact-coincidence findings are coalesced into one action. For example, an alias finding and its zero-length route-span finding produce one `ALIAS_COINCIDENT_NODE` action rather than two competing mutations.

No proposed action is applied in this phase.

## Usage

```bash
python -m converters.psi116_topology_resolver \
  Benchmarks/1885Sjson/FirstpassXML \
  --output-dir out/psi116-topology
```

Use `--fail-on-blocking` only in gates that intentionally treat unresolved findings as a failing exit status.

## Safety boundaries

- The input text and SHA-256 are preserved in the analysis model.
- The sidecar explicitly declares `mutationPolicy: DRY_RUN_ONLY` and `sourceXmlMutated: false`.
- A length below 6 mm is never sufficient by itself to delete a node or element.
- Finite gasket and inline-component spans are retained regardless of the generic threshold.
- Special fitting ownership is preferred over plain-pipe geometry during a proposed contraction.
- Source component identities remain separate when a later CII projection may be `MANY_TO_ONE`.
- Collinear overlap is blocking until ownership is proven.
- Missing PSI116 helper ports are reported; the resolver does not fabricate them.

A later transactional phase may apply reviewed plans to an in-memory XML clone and must rebuild and independently validate topology before writing a `*.topofix.xml` sidecar.
