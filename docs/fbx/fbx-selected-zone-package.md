# FBX Selected-Zone Package

The selected-zone package is a deterministic, validated export of already accepted FBX topology. It does not parse FBX, infer support restraint type, or invent host relationships.

## Authority boundaries

- `FbxZoneGeometryEvidence.v1` remains the authority for selected occurrences, ancestry, transforms, and selected-zone scope.
- `FbxSelectedZoneGeometryManifest.v1` owns the selected geometry projection and exact binary-buffer integrity only.
- Shared geometry is represented once with a sorted `occurrenceIds` array. The manifest does not own occurrence transforms.
- StagedJSON remains engineering-semantic authority when present.
- Support evidence is candidate evidence only; host binding requires explicit owner review.

## Deterministic binary contract

All geometry buffers are encoded explicitly in little-endian byte order:

- `control-points-mm`: Float64, three components per control point;
- `polygon-offsets`: Uint32;
- `polygon-vertex-indices`: Uint32.

The runtime validates integer ranges, buffer lengths, topology offsets, hashes, deterministic paths, and the exact three-role order.

## Package audit

The audit inventories every physical file except `audit.json` itself, including every geometry descriptor and binary buffer. Each present record binds path, role, byte length, and SHA-256. Optional StagedJSON and support evidence are either present with integrity metadata or explicitly `OMITTED_BLOCKED` with a reason.

The package builder immediately re-validates its own output. Validation rejects unbound files, omitted-file publication, manifest or buffer tampering, unsafe paths, malformed StagedJSON, support evidence from another zone, and incomplete geometry inventory.

## Browser export

The zone-analysis controller publishes validated package inputs only after a successful selected-zone analysis. The **Download zone package** control remains disabled until those live inputs exist and is invalidated when the analysis is cleared or fails.

## Archive

`FBXZPKG1` archives enforce fixed file-count, header-size, and total-byte ceilings. Decoding rejects unsafe or duplicate paths, non-contiguous or overlapping offsets, truncation, malformed directories, and SHA-256 mismatches.

## Remaining release evidence

Synthetic qualification proves mechanical determinism and coverage. Real TAY-A qualification and hosted exact-head CI remain required before a release claim specific to that source model.
