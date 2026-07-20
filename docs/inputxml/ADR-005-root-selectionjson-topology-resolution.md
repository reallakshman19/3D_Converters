# ADR-005 — Root and SelectionJSON Topology Resolution

## Status

Accepted for Agent IXCC-06 / PR-6 implementation.

## Scope

This decision governs only:

- `xml-builder-root-branch-node` / `xml-cii-node-to-canonical`;
- `seljson-custom-root` / `seljson-custom-model-to-canonical`.

InputXML-family profiles corrected by ADR-004, managed-stage JSON, PDF, UXML/RVM,
NodeSet and all production migration paths are unchanged.

The production writer `converters/scripts/inputxml_to_cii2019.py` remains unchanged.

## Binding statements

> Coordinates are comparison evidence, not connection authority.

> Document order is not topology authority unless the source contract explicitly declares ordered adjacency.

> A disabled filler switch is not proof that synthetic topology is impossible.

> SelectionJSON identity is explicit and is never inferred from a filename.

> Every canonical edge must cite authoritative source connection evidence.

## Governing authorities

1. Canonical XSD and Schematron.
2. Field, alias, component and CII projection catalogs.
3. Dialect and compiler-adapter registries.
4. Repository producer contracts and focused fixtures.
5. Unchanged production-writer projection behavior.
6. InputXML compatibility concept and ADR-001 through ADR-004.
7. Characterized browser converter behavior.
8. Explicit profile-permitted compiler context.

Browser compatibility behavior is evidence, not compiler authority.

## Characterized pre-correction behavior

| Concern | XML Builder before PR-6 | SelectionJSON before PR-6 | Strict correction |
|---|---|---|---|
| Profile identity | Generic unqualified `Root` | Delegated to XML Builder, then evidence names were changed | Generic Root selects XML Builder; SelectionJSON requires explicit profile selection |
| XML parser boundary | Node bridge reparsed raw XML with a handwritten tokenizer | Same | Python/lxml is the only XML parser; Node receives versioned JSON |
| Branch selection | Recursive descendant collection | Same | Only direct unqualified `Root/Branch` occurrences |
| Node identity | JavaScript object keyed by node number could overwrite | Same | Exact source occurrence path plus separately validated positive node number |
| Branch evidence | First matching line could win | Same | Exact branch occurrence owns its state and line evidence |
| Adjacency | Browser topology normalization and compatibility repair | Same | Direct Node child order only under the registered producer sequence contract |
| Cross-branch connection | Coordinate coalescing, rays and fillers existed in shared engine | Same | No cross-branch connection without explicit source identity |
| Geometry | Sub-0.5 mm values could become missing sentinel | Same | Exact decimal transform; true zero is `0`; nonzero values remain nonzero |
| Hidden defaults | Project/version/north/material/mechanical defaults | Same | Explicit profile context or source evidence only |
| Components | Generic PIPE fallback and fixed SIF defaults | Same | Supported projection or retained blocker; no default Tee SIF |
| Restraints | Fixed slots and unresolved sentinel padding | Same | Active records only; explicit type/owner; maximum six |
| Source accounting | Document-level one-to-many evidence | Duplicate profile-level evidence | Occurrence/field decisions plus topology-specific accounting proof |
| Blocking policy | Diagnostic-token substring checks | Same | Registered diagnostic-code policy |

## Profiles and explicit identity

### XML Builder

`xml-builder-root-branch-node` is the default profile for one valid unqualified
`Root` containing direct `Branch` occurrences and direct `Node` occurrences.

XML Builder identity does not depend on source filename, branch names, component
references or lexical prefixes.

### SelectionJSON custom Root

`seljson-custom-root` is the custom Root transfer representation produced by the
SelectionJSON workflow. It is not raw SelectionJSON JSON intake.

The compiler requires explicit registered dialect selection. Optional producer,
profile, source-identity and source-ID metadata are retained and checked for
contradiction. The same Root bytes without explicit selection resolve only once,
as XML Builder.

No XML Builder document-projection record is emitted for a SelectionJSON profile.

## Secure parser boundary

The compiler path is:

```text
raw UTF-8 XML bytes
→ secure Python/lxml parse
→ deterministic occurrence model
→ InputXmlTopologyBridgeRequest.v1 JSON
→ strict JavaScript topology engine
→ InputXmlTopologyBridgeResult.v1 JSON
→ independent Python verification
```

The XML parser uses no entity resolution, network access, DTD loading, recovery or
huge-tree mode. DTD and entity declarations are rejected before parsing. Malformed
XML blocks at `MEDIA_INSPECTION_GATE`; the topology engine is not invoked.

The Node bridge contains no XML tokenizer, closing-tag stack, browser DOM adapter,
temporary ESM dependency copy or arbitrary module path.

## Bridge contracts

### `InputXmlTopologyBridgeRequest.v1`

The request contains:

- profile and adapter identity;
- raw source SHA-256;
- source-document identity;
- explicit permitted context;
- ordered branch and node occurrence models;
- source-inventory summary;
- immutable strict-engine options.

### `InputXmlTopologyBridgeResult.v1`

The result contains:

- resolver status, engine identity and version;
- echoed profile, adapter and source hash;
- logical/canonical nodes;
- source-authoritative edges;
- component and auxiliary ownership mappings;
- source-node and source-edge mappings;
- `InputXmlStrictTopologyProof.v1`;
- registered structured diagnostics;
- prohibited-operation metrics.

The bridge never declares compiler production `PASS`. Expected topology blockers
are structured zero-exit results. Nonzero process exit is an internal bridge
failure.

Python verifies exact fields, strict JSON, duplicate keys, trailing output,
profile/adapter/hash identity, mapping coverage, proof counts, prohibited metrics
and an independent topology hash before canonical use.

Operational guards include request/output limits, branch/node/auxiliary limits,
subprocess timeout, bounded stderr, strict UTF-8, `shell=False`, deterministic
environment reduction and an absolute resolved Node executable.

## Source topology model

The model separates occurrence identity from engineering identity:

```text
TopologySourceDocument
BranchOccurrence
NodeOccurrence
RestraintOccurrence
logical node mapping
source edge mapping
component ownership mapping
auxiliary ownership mapping
```

Each source entity has a deterministic path such as:

```text
/Root[1]
/Root[1]/Branch[1]
/Root[1]/Branch[1]/Node[1]
/Root[1]/Branch[1]/Node[1]/Position[1]
```

Every element and attribute is separately inventoried before resolution.
Duplicate source leaf fields block instead of overwriting.

## Topology authority table

### Branch occurrence

Claim: A branch occurrence is identified by its exact direct-child source path.

Classification: REPOSITORY-CONTRACT.

Authority: XML Builder and SelectionJSON Root producer structure.

Version: PR-6 strict source model v1.

Location: `topology_source.py`, `topology_profiles.py`.

Applicability: Both profiles.

Confidence: HIGH.

Action: Reject nested or recursively discovered Branch evidence.

### Line identity

Claim: `LineNo` or `LINE_ID` supplies engineering line identity; populated
`Branchname`, `LineNo` and `LINE_ID` must agree.

Classification: REPOSITORY-CONTRACT.

Authority: Root producer fields and historical XML Builder audit.

Version: Root transfer contract characterized at PR-6.

Location: `TopologySourceDocument/BranchOccurrence`.

Applicability: Both profiles.

Confidence: MEDIUM-HIGH.

Action: Missing or conflicting identity blocks. Repeated line identity across
branch occurrences blocks until an explicit multiplicity policy exists.

### Node occurrence

Claim: A node occurrence is source-path identified; `NodeNumber` is a separate
positive integer engineering identity.

Classification: REPOSITORY-CONTRACT.

Authority: Producer node model and canonical node field contract.

Version: PR-6 strict source model v1.

Location: `topology_source.py`.

Applicability: Both profiles.

Confidence: HIGH.

Action: Invalid, missing or repeated node numbers block; no dictionary overwrite.

### Logical node

Claim: One accepted source node occurrence maps one-to-one to one logical and
canonical node in PR-6.

Classification: CONSERVATIVE-PROFILE-POLICY.

Authority: Canonical global numeric node namespace and unresolved cross-branch
disambiguation.

Version: PR-6.

Location: `strict_root_topology.cjs`.

Applicability: Both profiles.

Confidence: MEDIUM.

Action: Duplicate node numbers block. Coordinates never merge logical nodes.

### Edge adjacency

Claim: Consecutive direct Node children are adjacent only because the registered
Root producer emits branch route sequence in that order.

Classification: REPOSITORY-CONTRACT.

Authority: XML Builder producer serialization and focused route fixtures.

Version: `DIRECT_NODE_CHILD_ORDER_REGISTERED_PRODUCER_V1`.

Location: bridge request option and strict engine edge mapping.

Applicability: Both profiles after profile-specific intake.

Confidence: MEDIUM-HIGH.

Action: Record both occurrence paths for every edge. Invalid intermediate evidence
blocks the branch; connecting around it is prohibited.

### Junction identity

Claim: Tee/Olet/BRAN classification alone does not establish a logical junction.

Classification: UNRESOLVED-AUTHORITY.

Authority: Component catalog requires topology ownership not present in generic
Root classification fields.

Version: PR-6.

Location: `topology_components.py`.

Applicability: Both profiles.

Confidence: HIGH that synthesis is unsafe.

Action: Block with `JUNCTION_OWNERSHIP_UNRESOLVED` or `SIF_TYPE_UNRESOLVED`.

### Component ownership

Claim: A nonjunction component occurrence is owned by the verified incident edge:
first source node uses its outgoing edge; subsequent nodes use their incoming edge.

Classification: REPOSITORY-CONTRACT.

Authority: Existing Root component-on-node producer semantics and element-entering
component convention.

Version: PR-6 strict ownership rule.

Location: `strict_root_topology.cjs`, `topology_components.py`.

Applicability: Supported nonjunction components only.

Confidence: MEDIUM-HIGH.

Action: Multiple incompatible owners or unresolved component mapping blocks.

### Auxiliary ownership

Claim: A restraint belongs to its containing source node and that node's verified
incident canonical element.

Classification: REPOSITORY-CONTRACT.

Authority: Root nesting plus canonical restraint node/owner contract.

Version: PR-6.

Location: bridge auxiliary mapping and `attach_restraint`.

Applicability: Restraint and explicitly classified CustomRestraint evidence.

Confidence: HIGH.

Action: Unresolved owner, type or more than six active occurrences blocks.

### Cross-branch connection

Claim: No current generic Root field proves a branch-to-run connection solely from
position or component class.

Classification: UNRESOLVED-AUTHORITY.

Authority: Absence of source-port relationship in the accepted Root profile.

Version: PR-6.

Location: strict engine design.

Applicability: Both profiles.

Confidence: HIGH that proximity is insufficient.

Action: Do not join branches; explicit junction evidence remains required.

### Branch sequence

Claim: Branch occurrence order is retained as source evidence, not used to connect
branches.

Classification: REPOSITORY-CONTRACT.

Authority: Source XML sequence and absence of cross-branch order semantics.

Version: PR-6.

Location: bridge request/result ordering.

Applicability: Both profiles.

Confidence: HIGH.

Action: Preserve order deterministically; never linearize disconnected branches.

### Coordinate frame

Claim: source `(x,y,z)` millimetres transform to CAESAR `(x,z,-y)` millimetres.

Classification: PROJECT-ENGINEERING-CONTRACT.

Authority: existing XML Builder producer/browser transform and project coordinate
convention.

Version: `ROOT_XYZ_MM` to `CAESAR_X_Z_NEGATIVE_Y_MM`, matrix v1.

Location: `topology_engineering.py`.

Applicability: Both profiles.

Confidence: MEDIUM-HIGH.

Action: Preserve source values, emit transformed endpoints/deltas and verify exact
`TO - FROM == DELTA`; unsupported units block.

## Branch identity and state

Branch state is scoped to one exact branch occurrence. It is never keyed by line
text. Diameter, wall thickness and material require a valid seed. Optional
insulation, corrosion, pressure, temperature, hydro and density fields are emitted
only from explicit source evidence. State may carry only within the same branch
occurrence.

Repeated branch line identity currently blocks because the source contract does not
supply an authoritative occurrence-to-line multiplicity policy.

## Node-number scope

The producer stores node numbers inside branches, while canonical InputXML and the
writer use a model-wide numeric node namespace. PR-6 therefore does not invent a
branch-based numeric offset or suffix. Duplicate node numbers anywhere in the
accepted document block with `DUPLICATE_NODE_NUMBER`.

Equal node numbers do not merge by position. Equal or near positions with different
numbers do not merge. Equal positions on an asserted edge produce a zero-length
edge blocker.

## Adjacency and graph behavior

Every canonical edge records:

- exact source branch occurrence;
- exact source from/to node occurrences;
- logical from/to nodes;
- canonical from/to node IDs;
- topology rule;
- canonical element ID.

Self-loops, zero-length edges, duplicate directed edges and invalid intermediate
nodes block. Cycles cannot be fabricated by repeated-node acceptance. Disconnected
branch occurrences remain independent source components; no branch-order or
coordinate linearization occurs.

## Cross-branch topology and junctions

Coordinate equality, tolerance, nearest-segment search, ray shooting, perpendicular
projection, diameter search, first match and branch display order are prohibited as
connection authority.

TEE, OLET and BRAN require explicit run-side, branch-side and port ownership. The
current accepted Root evidence does not prove those relationships. Such evidence is
retained by the full-source extension and blocks before canonical synthesis.

## Coordinate frame and units

Source frame:

```text
name: ROOT_XYZ_MM
units: millimetres
vertical axis: source Y transformed into target negative Z contribution
handed transform: [x, y, z] -> [x, z, -y]
```

Target frame:

```text
name: CAESAR_X_Z_NEGATIVE_Y_MM
units: millimetres
north: explicit compiler context, approximately unit length
```

Matrix:

```text
[ 1  0  0 ]
[ 0  0  1 ]
[ 0 -1  0 ]
```

All values are finite decimals. Positions are all-or-none triplets. A true zero is
`0`; a missing value is absent; unresolved evidence blocks. Nonzero sub-0.5 mm
components are retained exactly. No tolerance or sentinel is applied.

Fluid-density and rigid-weight source units are not silently assumed. When those
values require scaling, `fluidDensityScale` or `rigidWeightScale` must be explicit,
positive, finite profile context and is ledgered.

## Prohibited topology operations

The compiler-specific strict engine contains no implementation of:

- duplicate-coordinate coalescing;
- nearest-coordinate joining;
- short, ray or second-pass fillers;
- synthetic node allocation;
- midspan ray splitting;
- branch-to-run shooting;
- invalid-node dropping or route repair.

The result contract requires exact zero values for:

```text
duplicateNodeDroppedCount
fillerCount
shortFillerCount
rayFillerCount
raySplitNodeCount
syntheticNodeCount
droppedRouteNodeCount
```

Python independently verifies those values. Any nonzero result is a structured
resolver invariant failure.

## Component and auxiliary policy

| Source evidence | Strict behavior |
|---|---|
| PIPE | route edge projection |
| RIGID | explicit positive Weight and explicit unit scale; one RIGID child |
| ELBO/BEND | explicit positive BendRadius; one BEND child |
| VALV/VALVE/FLAN/FLANGE/REDU/REDUCER/GASK/GASKET | preserve evidence, retain candidate, block at ledger |
| TEE/OLET/BRAN | block without explicit junction ports and SIF authority |
| SUPPORT/ATTA | block; attachment evidence cannot become route geometry |
| unknown component | preserve evidence and block |
| Restraint | explicit type/direction, stiffness, gap, friction, cosines and owner |
| CustomRestraint | explicitly classified compatibility occurrence, then same strict rules |

No default Tee SIF type, inactive second SIF, inactive restraint padding or unresolved
sentinel record is emitted. More than six active restraints blocks before emission.
`CNODE=0` is used only as the canonical representation of absent optional connecting
node evidence, not as a fabricated node.

## Engineering context and hidden defaults

Required context:

- `version`;
- `jobName`;
- `north`.

Optional explicit context:

- `time`;
- `issueNo`;
- `fluidDensityScale`;
- `rigidWeightScale`;
- operational `nodeExecutable`.

Undeclared output-affecting context blocks. Runtime clock, generic project name,
version 11 fallback, north fallback, material 1, modulus/hot-modulus, Poisson ratio,
pipe density and component/SIF defaults are prohibited.

## Source-accounting proof

`InputXmlTopologySourceAccountingProof.v1` reconciles:

- every source element and attribute occurrence;
- branch, node, component and restraint occurrences;
- bridge logical nodes and edges;
- canonical nodes and elements;
- extension and blocked evidence;
- node, edge and ownership mappings.

Accounting indexes are created only after prior decisions are frozen and use:

```text
coverageRule = PRIOR_TRANSFORMATION_DECISION_REQUIRED
```

They cannot certify themselves. Required zero invariants include unaccounted source,
duplicate inventory identity, unmapped canonical nodes/elements, unresolved edges,
unresolved ownership and synthetic topology.

Incomplete proof blocks at `SOURCE_ACCOUNTING_GATE` with a retained candidate only
when meaningful candidate construction already occurred.

## Diagnostic policy and stages

`InputXmlTopologyDiagnosticPolicy.v1` maps each code to stage, severity,
disposition, candidate policy and production effect. No substring or token scan
decides blocking.

Stage mapping follows ADR-001:

- malformed media → `MEDIA_INSPECTION_GATE`;
- profile/root identity → `PROFILE_INTAKE_GATE`;
- source model, topology, bridge, geometry and ownership → `PROFILE_RESOLVER_GATE`;
- accounting proof → `SOURCE_ACCOUNTING_GATE`;
- canonical validation → existing XSD/Schematron gates;
- retained unsupported evidence → `LEDGER_GATE`;
- production eligibility → existing production gate.

## Candidate behavior

- invalid intake, unresolved topology, junction, geometry, hidden default, rigid/SIF
  or restraint authority → `BLOCKED_NO_CANDIDATE`;
- a geometrically meaningful route containing explicitly retained unsupported
  component evidence → `BLOCKED_WITH_CANDIDATE` at `LEDGER_GATE`;
- complete, validated, accounted and supported route → `CANONICAL_CANDIDATE`.

No blocked candidate reaches the unchanged writer.

## Determinism

Source occurrence order determines request ordering. Logical nodes and edges follow
verified source sequence. Canonical IDs use deterministic edge ordinals. No object
or set traversal defines engineering order. JSON bridge hashes use sorted-key compact
serialization. Canonical, ledger and validation bytes continue to use the unchanged
ADR-003 policy.

Tests repeat Python and Node processes, vary `PYTHONHASHSEED`, compare topology proof,
ledger and validation values, and execute on Ubuntu and Windows.

## Compatibility and browser impact

The browser converter is unchanged. Its compatibility defaults, fillers and preview
behavior remain browser concerns and are not imported into the compiler path.

Previously accepted compiler-side defaults, dropped nodes, coordinate coalescing,
sentinel geometry, filler topology and fixed auxiliary padding now fail closed.

## Publication and writer boundary

ADR-002 publication state, staging, lock, rollback and commit-marker verification are
unchanged. ADR-003 serialization policy identity is unchanged. The production CII
writer is unchanged and is invoked only after all existing compiler gates pass.

## Deferred questions

- An authoritative cross-branch port relationship for Tee/Olet/BRAN is not present
  in generic Root evidence.
- A safe document-global disambiguation policy for branch-local duplicate node
  numbers is not authorized.
- Independent projection of multiple active SIF records remains unresolved.
- Full valve/flange/reducer/gasket canonical component projection is outside PR-6.
- Non-explicit source unit inference and coordinate tolerance are not authorized.
- Cyclic topology requires explicit source connection identities beyond repeated
  node numbers.

All deferred questions remain fail-closed. PR-7 is not started and migration is not
authorized.
