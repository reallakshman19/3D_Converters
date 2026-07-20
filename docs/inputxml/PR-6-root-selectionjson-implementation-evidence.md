# PR-6 Root/SelectionJSON Implementation Evidence

## C-01 — Generic Root profile

Claim: A valid generic unqualified `Root/Branch/Node` document resolves only as `xml-builder-root-branch-node` unless SelectionJSON is explicitly selected.

Classification: REPOSITORY-CONTRACT.

Authority: Dialect registry, compiler adapter registry and ADR-005.

Version: InputXML contract bundle v1 / PR-6.

Location: `xml.py`, `topology_profiles.py`.

Applicability: Generic Root intake.

Confidence: HIGH.

Action: Block incompatible override or contradictory producer metadata.

## C-02 — SelectionJSON identity

Claim: SelectionJSON custom Root identity is explicit and cannot be inferred from filename, path, prefixes or component references.

Classification: GOVERNING-POLICY.

Authority: PR-6 Work Pack and ADR-005.

Version: PR-6.

Location: `topology_profiles.py`, SelectionJSON profile tests and corpus.

Applicability: `seljson-custom-root`.

Confidence: HIGH.

Action: Require explicit registered dialect selection; default the same bytes to XML Builder.

## C-03 — XML parser boundary

Claim: The Node bridge receives no raw XML and performs no XML parsing.

Classification: SECURITY-CONTRACT.

Authority: ADR-001 media boundary and PR-6 parser requirements.

Version: `InputXmlTopologyBridgeRequest.v1`.

Location: `compiler.py`, `xml.py`, `node_xml_builder_bridge.cjs`.

Applicability: Both PR-6 profiles.

Confidence: HIGH.

Action: Reject malformed XML, DTDs and entity declarations before bridge invocation.

## C-04 — Branch occurrence identity

Claim: Exact source path identifies a branch occurrence; line text is a separate engineering attribute.

Classification: REPOSITORY-CONTRACT.

Authority: Root producer shape and source occurrence model.

Version: `TopologySourceDocument` v1.

Location: `topology_source.py`.

Applicability: Both PR-6 profiles.

Confidence: HIGH.

Action: Block nested Branch evidence, line conflicts and ungrounded repeated line identity.

## C-05 — Node occurrence identity

Claim: Exact source path identifies a node occurrence and a positive integer-like `NodeNumber` supplies canonical node identity.

Classification: REPOSITORY-CONTRACT.

Authority: Root producer model and canonical XSD.

Version: PR-6 source model v1.

Location: `topology_source.py`.

Applicability: Every source Node.

Confidence: HIGH.

Action: Block missing, invalid, duplicate or silently overwritten node numbers.

## C-06 — Duplicate node-number scope

Claim: The accepted Root source does not authorize a deterministic document-global disambiguator for repeated branch-local node numbers.

Classification: UNRESOLVED-AUTHORITY.

Authority: Producer nesting contrasted with canonical global numeric node namespace.

Version: PR-6.

Location: `topology_source.py`, `strict_root_topology.cjs`.

Applicability: Cross-branch duplicate NodeNumber evidence.

Confidence: HIGH that invented offsets are unsafe.

Action: Fail closed with `DUPLICATE_NODE_NUMBER`.

## C-07 — Ordered adjacency

Claim: Consecutive direct Node children establish route adjacency only under the registered Root producer sequence contract.

Classification: REPOSITORY-CONTRACT.

Authority: XML Builder serialization and focused route fixtures.

Version: `DIRECT_NODE_CHILD_ORDER_REGISTERED_PRODUCER_V1`.

Location: bridge request and `strict_root_topology.cjs`.

Applicability: Within one accepted Branch occurrence.

Confidence: MEDIUM-HIGH.

Action: Cite exact adjacent source paths; block invalid intermediates rather than connecting around them.

## C-08 — Coordinates do not connect

Claim: Equal or near coordinates do not create or merge logical nodes, edges, branches or junctions.

Classification: GOVERNING-POLICY.

Authority: PR-6 Work Pack and ADR-005.

Version: PR-6.

Location: strict engine design and prohibited-operation tests.

Applicability: All source positions.

Confidence: HIGH.

Action: Use positions only for exact geometry and mismatch evidence.

## C-09 — Cross-branch junctions

Claim: Generic Root component classification does not prove Tee/Olet run and branch ports.

Classification: UNRESOLVED-AUTHORITY.

Authority: Component catalog and absence of source-port relationships.

Version: PR-6.

Location: `topology_components.py`.

Applicability: TEE, OLET and BRAN occurrences.

Confidence: HIGH that synthesis is unsafe.

Action: Preserve full source and block with structured junction/SIF diagnostics.

## C-10 — Coordinate transform

Claim: Source positions are millimetres transformed by `(x,y,z) → (x,z,-y)` into the CAESAR frame.

Classification: PROJECT-ENGINEERING-CONTRACT.

Authority: Existing producer/browser transform and repository fixtures.

Version: `ROOT_XYZ_MM` to `CAESAR_X_Z_NEGATIVE_Y_MM`, matrix v1.

Location: `topology_engineering.py` and ADR-005.

Applicability: Both PR-6 profiles.

Confidence: MEDIUM-HIGH.

Action: Retain raw source values, emit exact transformed endpoints/deltas and block unsupported units.

## C-11 — Geometry sentinel prohibition

Claim: A true zero is `0`; missing or unresolved geometry is never represented internally or canonically by `-1.0101`.

Classification: CANONICAL-CONTRACT.

Authority: Field catalog, ADR-004 and PR-6 Work Pack.

Version: Canonical InputXML v1.

Location: `topology_engineering.py`.

Applicability: Every emitted edge.

Confidence: HIGH.

Action: Block missing/nonfinite positions and preserve all nonzero decimal components exactly.

## C-12 — Filler and coalescing prohibition

Claim: The strict engine contains no duplicate-coordinate coalescing, filler, ray, midspan split, synthetic-node or invalid-node-drop implementation.

Classification: IMPLEMENTATION-INVARIANT.

Authority: PR-6 Work Pack and strict engine source.

Version: `strict-root-topology-engine` 1.0.0.

Location: `strict_root_topology.cjs`, `topology_bridge.py`.

Applicability: Both profiles.

Confidence: HIGH.

Action: Require all prohibited-operation metrics to equal zero and test attempts to enable them.

## C-13 — Hidden context defaults

Claim: Version, jobName and north require explicit profile context; output-affecting unit scales require explicit finite positive context.

Classification: PROFILE-CONTRACT.

Authority: ADR-005 and PR-6 Work Pack.

Version: PR-6 profile descriptors.

Location: `topology_profiles.py`, `topology_engineering.py`, `topology_components.py`.

Applicability: Both profiles.

Confidence: HIGH.

Action: Block missing or undeclared context; ledger every accepted context-derived value.

## C-14 — Branch state

Claim: Diameter, wall thickness and material require seeds and may carry only inside the exact branch occurrence.

Classification: CONSERVATIVE-PROFILE-POLICY.

Authority: Root producer fields and canonical required engineering fields.

Version: PR-6.

Location: `topology_engineering.py`.

Applicability: Every accepted branch.

Confidence: MEDIUM-HIGH.

Action: Block missing seeds and prohibit state carry keyed only by textual line identity.

## C-15 — Rigid and bend evidence

Claim: RIGID requires explicit weight plus explicit scale; BEND/ELBO requires an explicit positive radius.

Classification: COMPONENT-CONTRACT.

Authority: Component catalog, canonical XSD and unchanged writer behavior.

Version: Canonical InputXML v1 / PR-6 strict profile.

Location: `topology_components.py`.

Applicability: RIGID, ELBO and BEND source evidence.

Confidence: HIGH.

Action: Block missing unit/radius authority; never emit compatibility sentinel/default values.

## C-16 — Unsupported components

Claim: Valve, flange, reducer and gasket classification can be preserved on a meaningful route candidate but does not authorize a canonical engineering component projection.

Classification: KNOWN-UNSUPPORTED-ENGINEERING.

Authority: Component catalog and incomplete canonical component representation.

Version: PR-6.

Location: `topology_components.py`, `topology_candidate_policy.py`.

Applicability: VALV/VALVE/FLAN/FLANGE/REDU/REDUCER/GASK/GASKET.

Confidence: HIGH.

Action: Retain evidence with `DEFER_EXPLICITLY`, keep the candidate blocked and terminate at `LEDGER_GATE`.

## C-17 — Restraint ownership

Claim: Each restraint belongs to its containing source node and that node's bridge-verified incident canonical element.

Classification: REPOSITORY-CONTRACT.

Authority: Root nesting, canonical restraint node contract and producer behavior.

Version: PR-6.

Location: bridge auxiliary mappings and `topology_components.py`.

Applicability: Restraint and CustomRestraint occurrences.

Confidence: HIGH.

Action: Require explicit type/cosines, block unresolved ownership, and block above six before emission.

## C-18 — No auxiliary padding

Claim: The strict path emits only active source auxiliaries and no inactive SIF or restraint padding slots.

Classification: IMPLEMENTATION-INVARIANT.

Authority: PR-6 Work Pack and canonical cardinality contracts.

Version: PR-6.

Location: `topology_components.py` and tests.

Applicability: SIF and restraint projection.

Confidence: HIGH.

Action: Emit one record per accepted source occurrence; block unsupported SIF authority and overflow.

## C-19 — Bridge integrity

Claim: Bridge output is untrusted until Python verifies strict JSON, exact identity/hash, complete mappings, zero prohibited metrics and topology hash.

Classification: SECURITY-CONTRACT.

Authority: PR-6 Work Pack.

Version: request/result v1.

Location: `topology_bridge.py` and bridge tamper tests.

Applicability: Every bridge invocation.

Confidence: HIGH.

Action: Block duplicate keys, trailing output, tampering, missing/duplicate mappings and contradictory result status.

## C-20 — Source-accounting proof

Claim: `sourceAccountingStatus=COMPLETE` is valid only when source occurrence, topology mapping and canonical mapping invariants all equal zero.

Classification: EVIDENCE-CONTRACT.

Authority: PR-5 accounting principle and PR-6 Work Pack.

Version: `InputXmlTopologySourceAccountingProof.v1`.

Location: `topology_accounting.py`.

Applicability: Both profiles.

Confidence: HIGH.

Action: Freeze prior decisions before indexes, use `PRIOR_TRANSFORMATION_DECISION_REQUIRED`, and block incomplete proof at `SOURCE_ACCOUNTING_GATE`.

## C-21 — Diagnostic policy

Claim: Blocking stage and candidate behavior are selected by exact registered diagnostic code, never by substring matching.

Classification: COMPILER-ORCHESTRATION-CONTRACT.

Authority: ADR-001 and PR-6 Work Pack.

Version: `InputXmlTopologyDiagnosticPolicy.v1`.

Location: `topology_diagnostics.py`.

Applicability: All PR-6 diagnostics.

Confidence: HIGH.

Action: Reject unregistered bridge diagnostics and preserve existing compiler gate taxonomy.

## C-22 — Determinism and publication

Claim: Topology resolution changes producer evidence only; deterministic serialization and crash-consistent publication authorities remain unchanged.

Classification: ARCHITECTURE-INVARIANT.

Authority: ADR-002 and ADR-003.

Version: Existing publication contracts and `inputxml-deterministic-serialization-v1`.

Location: unchanged publication/serialization modules plus topology determinism tests.

Applicability: Accepted and blocked PR-6 bundles.

Confidence: HIGH.

Action: Compare repeated processes/hash seeds on Ubuntu and Windows; do not version the serializer to hide producer nondeterminism.

## C-23 — Writer boundary

Claim: No blocked PR-6 candidate may reach the production CII writer.

Classification: PRODUCTION-GATE-INVARIANT.

Authority: ADR-001, projection wrapper and PR-6 Work Pack.

Version: Existing compiler production gate.

Location: compiler orchestration and end-to-end matrix.

Applicability: Every blocked fixture.

Confidence: HIGH.

Action: Require blocked evidence bundles with projection/reparse not run; keep writer unchanged.
