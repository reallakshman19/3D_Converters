# FBX Selected-Zone Package Contracts (Phase 2)

## Artifact Purpose
The Phase 2 Selected-Zone Package contract specification establishes formal, immutable JSON Schema Draft 2020-12 definitions for the accepted Phase 1 package kernel artifacts (`FbxSelectedZoneGeometryManifest.v1` and `FbxSelectedZonePackageAudit.v1`). These machine-readable schemas lock down artifact structures, SHA-256 identities, and deterministic package layouts to prevent silent drift during downstream integration.

The schemas strictly validate structure and identity representation. They do not independently prove engineering semantic correctness, host correctness, support classification, or restraint behavior.

## Exact Authority Separation
To preserve single-source authority, each artifact in the selected-zone package holds exclusive engineering responsibility:
* **`FbxGeometryBundle.v1`**: Sole authority for raw geometric control points, polygons, topology descriptors, and binary buffer integrity.
* **`FbxZoneGeometryEvidence.v1`**: Exclusive authority for physical world occurrence IDs, model object hierarchy ancestry, local transformation matrices, and selected-zone identity boundaries.
* **StagedJSON (`selected-zone.staged.json`)**: Sole authority for engineering semantics when present. Preserved byte-for-byte as generated without semantic re-interpretation.
* **`FbxSelectedZoneGeometryManifest.v1`**: Binds selected geometry subsets to deterministic binary buffer filenames without importing occurrence or transform authority.
* **`FbxSelectedZonePackageAudit.v1`**: Exact ledger binding all package files with producer Git revisions and cryptographic hashes without replacing individual file authority.
* **Support Semantics**: Fully restricted (`NOT_AUTHORIZED` and `OMITTED_BLOCKED`). Proximity-based support classification or PIPE host inference cannot enter the package during Phase 1 or 2.

## Package File Inventory
Every package assembled in memory contains exactly these core paths:
* `source-graph.selected-zone.json`: Filtered subset of `FbxSourceGraph.v2` strictly scoped to selected occurrences and geometries.
* `zone-geometry-evidence.json`: `FbxZoneGeometryEvidence.v1` defining occurrence transformations and zone selection.
* `geometry-bundle.manifest.json`: `FbxSelectedZoneGeometryManifest.v1` governing buffer descriptors and binary paths.
* `geometry-buffers/<geometryId>.<role>.bin`: ArrayBuffer binary streams for control points, polygon offsets, and vertex indices.
* `selected-zone.staged.json`: Optional StagedJSON engineering semantic payload.
* `package-audit.json`: `FbxSelectedZonePackageAudit.v1` cryptographic file ledger.
* `support-evidence.json`: Explicitly recorded as an uninitialized omission; never published as a physical placeholder file.

## Schema Identities
* **Geometry Manifest Schema**: `https://contracts.3d-converters.org/fbx/fbx-selected-zone-geometry-manifest.v1.schema.json` (`$id` / constant `FbxSelectedZoneGeometryManifest.v1`).
* **Package Audit Schema**: `https://contracts.3d-converters.org/fbx/fbx-selected-zone-package-audit.v1.schema.json` (`$id` / constant `FbxSelectedZonePackageAudit.v1`).
* Both schemas enforce `additionalProperties: false` on all governed objects to prevent silent extension.

## Digest and Ancestry Chain
Cryptographic provenance follows a rigorous, unidirectional lineage binding source objects to package files without merging selected and complete digests:
```text
Complete FbxSourceGraph.v2
→ accepted FbxGeometryBundle.v1
→ FbxZoneGeometryEvidence.v1
→ selected-zone FbxSourceGraph.v2 subset
→ FbxSelectedZoneGeometryManifest.v1
→ FbxSelectedZonePackageAudit.v1
```
The audit explicitly separates `selectedSourceGraphSha256` (the subset digest) from `sourceGeometryBundleSourceGraphSha256` (the complete ancestor digest). They cannot be merged or aliased.

## Deterministic Ordering Requirements
* Artifact JSON serialization uses strict alphabetical property key sorting via `canonicalJson`.
* Repeated generations from identical inputs must yield byte-for-byte identical canonical buffers and SHA-256 hashes regardless of external JS engine enumeration ordering.

## Explicit Omitted/Blocked Behavior
* Missing optional engineering payloads (such as absent StagedJSON) or restricted future domains (such as support candidate evidence) must be explicitly accounted for inside `package-audit.json` with status `OMITTED_BLOCKED` and a non-empty `reason`.
* Every audit entry marked omitted has no corresponding published physical file in the assembled package container. Silently publishing an omitted file triggers immediate rejection.

## Failure Containment
* Fail-closed rejection: Any deviation in schema conformity, missing files, unauthorized fields (e.g. occurrence matrices inside geometry descriptors), duplicate package paths, or checksum discrepancies throws a `SelectedZonePackageError` with explicit status codes (`BLOCKED_PACKAGE_SHAPE`, `BLOCKED_PACKAGE_AUDIT`, `BLOCKED_GEOMETRY_MANIFEST`, `BLOCKED_GEOMETRY_BINDING`).

## Non-Goals
* No archive serialization (ZIP, TAR, compression, or encoding).
* No user interface components, dialog overlays, or browser download behaviors.
* No support-classification algorithms or structural restraint inference.
* No geometry manipulation, decimation, tolerance relaxation, or canvas rendering.

## Validation Commands
Execute the following verification sequence to confirm full compliance:
```bash
node tests/fbx/test-selected-zone-package-core.mjs
node tests/fbx/test-selected-zone-package-contracts.mjs
node tests/fbx/test-static-guards.mjs
node tests/fbx/run-all.mjs
```

## Known Unresolved Future Phases
* **Phase 3**: Support candidate evidence definition (`FbxSupportEvidence.v1`).
* **Phase 4**: Complete package verification and validation against integrated benchmarks.
* **Phase 5**: Physical container archival binding (ZIP layout standardization).
* **Phase 6**: UI integration and browser export orchestration.
* **Phase 7**: End-to-end regression qualification across real industrial FBX corpora.
