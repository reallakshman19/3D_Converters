# FBX Selected-Zone Package Contracts — Phase 2

## Purpose

Phase 2 publishes strict JSON Schemas for the selected-zone geometry projection and package audit created by the Phase 1 kernel. It freezes accepted artifact shapes without changing parser, Writer, Worker, renderer, canvas, StagedJSON, support, or host-mapping behavior.

## Authority chain

```text
Complete FbxSourceGraph.v2
→ accepted FbxGeometryBundle.v1
→ FbxZoneGeometryEvidence.v1
→ selected-zone FbxSourceGraph.v2 subset
→ FbxSelectedZoneGeometryManifest.v1
→ FbxSelectedZonePackageAudit.v1
```

Authority remains separated:

- `FbxSourceGraph.v2` preserves selected occurrence ancestry and source identity.
- `FbxZoneGeometryEvidence.v1` owns selected occurrence, ancestry, transform, and geometry binding evidence.
- `FbxGeometryBundle.v1` owns complete topology descriptors and binary-buffer integrity.
- `FbxSelectedZoneGeometryManifest.v1` projects only selected geometry descriptors, buffer hashes, and deterministic package paths.
- StagedJSON remains engineering-semantic authority when supplied by the accepted semantic pipeline.
- `FbxSelectedZonePackageAudit.v1` binds artifacts and file dispositions; it does not replace their authority.

## Published schemas

```text
contracts/fbx/fbx-selected-zone-geometry-manifest.v1.schema.json
contracts/fbx/fbx-selected-zone-package-audit.v1.schema.json
```

Both use JSON Schema Draft 2020-12 and reject unexpected governed fields with `additionalProperties: false`.

## Geometry manifest contract

The geometry manifest records both:

```text
selectedSourceGraphSha256
sourceGeometryBundleSourceGraphSha256
```

The first binds the selected-zone source-graph subset. The second preserves binding to the complete source graph from which the accepted geometry bundle was built. Neither field owns occurrence ancestry or transforms.

Only these binary roles are admitted:

```text
control-points-mm
polygon-offsets
polygon-vertex-indices
```

Binary package paths are deterministic:

```text
geometry-buffers/<geometryObjectId>.<role>.bin
```

Occurrence IDs, ancestry records, transforms, support semantics, host assignments, restraint behavior, renderer state, and preview state are prohibited from the geometry manifest.

## Audit contract

The audit binds:

- exact producer Git revision;
- source and parser identities;
- selected and complete source-graph digests;
- source geometry-bundle digest;
- selected-zone identity;
- authority declarations;
- present-file SHA-256 and byte length;
- explicit omitted-file reasons.

A present file uses `PRESENT`. A blocked absence uses `OMITTED_BLOCKED` with a non-empty reason. A file marked omitted must not appear in the physical package.

`support-evidence.json` remains `OMITTED_BLOCKED`, and support semantics remain `NOT_AUTHORIZED` in Phases 1 and 2.

## StagedJSON preservation

The package may parse StagedJSON only for structural validation and schema observation. It must publish the exact accepted input text without reconstruction, canonicalization, or semantic mutation.

## Determinism

Canonical JSON ordering, artifact identities, file paths, hashes, byte lengths, and omission records must be reproducible for identical accepted inputs. Input ordering must not change canonical output.

## Failure containment

Schema failure, digest mismatch, malformed revision, unexpected fields, unknown roles, unsafe paths, missing required records, unbound files, or silent publication of omitted files blocks the package. There is no fallback to partial or inferred output.

## Non-goals

Phase 2 does not authorize:

- support classification or host inference;
- REST, GUIDE, LINE_STOP, restraint, or DOF semantics;
- tolerance relaxation or closed-cylinder admission;
- archive generation or browser download behavior;
- runtime, Writer, Worker, renderer, or canvas switching;
- StagedJSON schema or semantic changes.

## Validation

```text
node tests/fbx/test-selected-zone-package-core.mjs
node tests/fbx/test-selected-zone-package-contracts.mjs
node tests/fbx/test-static-guards.mjs
node tests/fbx/run-all.mjs
```

The schema tests validate authentic generated artifacts and reject malformed instances. Schema validity proves structural conformance only; it does not independently prove semantic correctness, host correctness, support classification, or restraint behavior.

## Future phases

Support candidate evidence, external host-authority binding, TAY-A diagnostics, browser publication, and release qualification remain separate governed Work Packs.
