# FBX selected-zone package (Phases 1-2)

Deterministic packaging of a user-selected FBX zone into a byte-reproducible
file set, independent of any StagedJSON or support-mapping decision.

## Schemas

- `contracts/fbx/fbx-selected-zone-geometry-manifest.v1.schema.json` —
  `FbxSelectedZoneGeometryManifest.v1`: the exact set of selected geometries,
  their control-point/polygon counts, and their three authoritative buffer
  digests (`control-points-mm`, `polygon-offsets`, `polygon-vertex-indices`).
- `contracts/fbx/fbx-selected-zone-package-audit.v1.schema.json` —
  `FbxSelectedZonePackageAudit.v1`: which optional file roles
  (`STAGEDJSON`, `SUPPORT_EVIDENCE`) are `PRESENT` versus explicitly
  `OMITTED_BLOCKED`, plus a package-wide digest.

## Authority boundaries

- `FbxSelectedZoneGeometryManifest.v1` owns only selected geometry
  descriptors, buffer digests, and deterministic package paths. It does not
  own occurrence ancestry, ports, or support semantics.
- `supportSemantics` is `NOT_AUTHORIZED` unless a Phase 3
  `FbxSupportEvidence.v1` object is supplied to the package builder, in
  which case it is `CANDIDATE_EVIDENCE_ONLY` — never a restraint or host
  determination.
- StagedJSON, when supplied, is carried through unmodified as an opaque
  file; this package format neither derives nor validates its content.

## Determinism

`buildSelectedZoneGeometryManifest` + `buildSelectedZonePackage` are pure
functions over their inputs: the same selected geometries always produce
byte-identical manifest JSON, geometry buffer files, and package audit
(`tests/fbx/test-zone-package-core.mjs` asserts this directly by building
the same package twice and comparing every file's bytes).

## Malformed-package fixtures

`tests/fixtures/fbx/zone-package/` contains hand-authored instances that
violate the published schemas (missing `manifestDigest`, an unauthorized
extra property, a `PRESENT` file role with a null digest, and an
unrecognized file role) so the contract test
(`tests/fbx/test-zone-package-contracts.mjs`) proves the schema actually
rejects malformed packages and not just accepts well-formed ones.

## Explicit non-scope (Phase 1-2 boundary)

No UI, archive/download transport, parser, Writer, Worker, or canvas
change is included at this layer. No REST/GUIDE/LINE_STOP support
disposition, restraint DOF, or host inference is produced here — see
`docs/fbx/fbx-selected-zone-support-evidence.md` (Phase 3) and
`docs/fbx/fbx-selected-zone-host-authority.md` (Phase 4).
