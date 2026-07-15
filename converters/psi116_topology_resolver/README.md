# PSI116 Topology Resolver Foundation

This package performs a non-mutating topology analysis of PSI116 XML and emits two deterministic JSON sidecars:

```text
<stem>.topology-findings.json
<stem>.topology-fix-plan.json
```

It does not rewrite PSI116 XML and does not alter the XML→CII engine.

## Current scope

The resolver foundation inventories the complete branch/node stream, including negative helper records, and detects:

- coincident positive node identities;
- zero-length consecutive route spans;
- spans below the configured short-span threshold;
- non-rigid component classes marked `Rigid=2`;
- instruments whose rigid status needs explicit evidence;
- missing elbow owner/helper endpoint evidence;
- missing tee/olet junction owners;
- duplicate and partially overlapping collinear route spans.

Each finding receives one dry-run disposition:

```text
ALIAS_COINCIDENT_NODE
CONTRACT_PRESERVE_OWNER
SAFE_DROP_PIPE_GEOMETRY
REMOVE_FALSE_RIGID
KEEP
BLOCK_AMBIGUOUS
```

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
- Special fitting ownership is preferred over plain-pipe geometry during a proposed contraction.
- Collinear overlap is blocking until ownership is proven.
- Missing PSI116 helper ports are reported; the resolver does not fabricate them.

A later transactional phase may apply reviewed plans to an in-memory XML clone and must rebuild and independently validate topology before writing a `*.topofix.xml` sidecar.
