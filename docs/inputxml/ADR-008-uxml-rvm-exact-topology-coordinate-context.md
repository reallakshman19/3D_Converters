# ADR-008 — UXML/RVM exact topology and coordinate-context authority

## Status

Accepted for PR-9 implementation. Production activation and migration remain unauthorized. This revision incorporates the PR-9 owner-review corrections.

## Scope

Only `uxml-rvm-intake` / `uxml-rvm-to-canonical` changes semantically. Shared `uxml/**`, `rvm-pcf-extract/**`, schemas, registries, publication, the production CII writer, and GitHub Actions remain unchanged.

## Authority model

Canonical acceptance requires four source-bound artifacts:

- `UxmlRvmCoordinateContext.v1`;
- `UxmlRvmExactTopologyPlan.v1` when direct exact topology is absent or the intake is RVM rows;
- `UxmlRvmEngineeringContext.v1` when required PIPE fields are absent;
- `UxmlRvmCanonicalMetadata.v1` for job, time, issue, version, and north authority.

Their semantic hashes are bound by `UxmlRvmAuthorityManifest.v1`. The manifest is approved with an HMAC key and key identifier supplied through process configuration, not the compile request. A caller can provide candidate artifacts but cannot replace the detached approval trust root. Missing or mismatched trust blocks.

## Exact topology

Logical-node membership comes only from direct `EXACT_LOGICAL_NODE` / `EXACT_PORT_CONNECTION` declarations with `EXACT_SOURCE` confidence or from an approved source- and adapted-UXML-bound topology plan. Coordinates, tolerance, ray evidence, proximity, ordering, generic export decisions, and accepted handoffs have zero authority.

Every required PIPE endpoint belongs to exactly one logical node. Connected ports must transform to exactly equal coordinates. Distinct nodes may occupy equal coordinates. A node incident to more than two PIPE endpoints blocks because PR-9 does not authorize TEE/OLET/SIF junction projection.

## Coordinate and source intake

The coordinate context uses a signed-axis permutation, registered exact scale to millimetres, finite offset, named frames, and determinant-consistent handedness. Source coordinate units are mandatory and must equal the context source units. No matrix, snapping, averaging, inferred units, or endpoint repair is allowed.

The compiler-specific intake validates required UXML sections, exact identities, component source references, component/anchor/port/segment ownership, support ownership, source diagnostics, and exact anchor/port coordinate agreement. Unsafe JSON integers, precision-losing decimals, duplicate keys, trailing data, unpaired surrogates, and prototype-key loss block.

## Node, line, and engineering authority

Node numbers come only from exact source anchors or an approved plan. They are positive exact integers with one-to-one logical-node ownership. Sorted generated numbering is forbidden.

Line identity is reconciled from all source aliases or an approved plan assignment. Caller defaults, filenames, metadata, coordinates, numbering, and order cannot establish line ownership.

OD and wall thickness are reconciled across every registered alias. Source and approved external values must agree. Bore is not OD. Unsupported components and every support/restraint/hanger record remain explicit blocking evidence.

## Bridge boundary

`InputXmlUxmlRvmBridgeRequest.v1` / `InputXmlUxmlRvmBridgeResult.v1` bind source bytes, profile identity, authority hashes, bridge identity, adapted UXML, inventories, diagnostics, and semantic hashes. The bridge performs adaptation and inventory only.

The Python runner uses bounded streaming reads and terminates the child on timeout or stdout/stderr limit breach. The Node parser uses null-prototype objects, own data properties, code-point key ordering, and exact-number acceptance rules aligned with Python.

## Independent accounting

`InputXmlUxmlRvmSourceAccountingProof.v1` reconstructs expected decisions from source and detached-approved authority, then compares them independently with:

1. serialized and reparsed canonical XML;
2. actual ledger semantic tuples and cardinality;
3. actual extension authority-hash bindings.

The proof covers topology, node numbers, line ownership, transformed coordinates and DELTA, engineering fields, metadata, unsupported evidence, bridge bindings, and output cardinality. Coordinated XML/ledger restamping therefore produces named non-zero invariants.

## Compatibility

Coordinate-only and tolerance-derived UXML/RVM cases now block. RVM rows require an approved exact-topology plan. Loose coordinate basis, arbitrary transforms, caller line defaults, generated node numbers, ray/proximity handoffs, and adapter-generated metadata cannot authorize production output.

## Deferred work

Resource characterization is PR-10 and is not started. Corpus expansion, legacy parity, migration, and production activation remain deferred.
