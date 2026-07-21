# TE-015 — Registry publication and recovery control

## Status and authority

TE-015 is an operations-side controller over the accepted TE-005 registry contracts and the accepted TE-012 bootstrap transaction. It consumes an independently read current registry, one approved `TopoNodeRegistryPatch.v1`, and the corresponding approved bootstrap result.

The controller prepares evidence for an operator-controlled publication. It has no authority to alter the live registry, invoke GitHub, commit, push, merge, allocate node numbers, change lifecycle state, normalize topology, or run PSI/CII conversion.

## API

```js
prepareRegistryPublication({
  currentRegistryRoot,
  approvedPatch,
  bootstrapResult,
  expectedBaseCommit,
  expectedCurrentSnapshotHash,
  targetManifest,
  evaluatedAt,
  fileSystem, // optional explicit adapter
})
```

`currentRegistryRoot` is the filesystem root beneath which every path in the target manifest is resolved. `fileSystem` is an explicit effect boundary; production defaults to the Node filesystem adapter, while tests may inject a failing or corrupting adapter.

No wall clock, random identifier, network call, repository write, or hidden fallback is used.

## Target manifest

```js
{
  schema: 'TopoRegistryPublicationTargetManifest.v1',
  registryRootPath: 'node-history/registry/current/PROJECT/ZONE',
  temporaryRoot: '/absolute/operator-staging-root',
  rollbackProofRoot: '/absolute/rollback-proof-root',
  files: [
    { role: 'ZONE_REGISTRY', path: '.../zone-registry.json' },
    { role: 'LINE_HISTORY', mainLineKey: '/LINE-A', path: '.../lines/LINE-A.json' },
    { role: 'REGISTRY_MANIFEST', path: '.../manifest.json' },
  ],
}
```

Paths are POSIX-style repository-relative identities. Absolute targets, traversal, empty segments, backslashes, duplicate paths, case-collisions, duplicate line identities, files outside `registryRootPath`, and incorrect role cardinality block before materialization.

The temporary and rollback roots are explicit absolute filesystem boundaries. They must be disjoint from the independently read current registry root and from each other. Existing materialization roots are rejected; the controller never reuses or cleans an unowned existing directory.

The semantic target-manifest hash excludes machine-specific temporary paths. Different operators may stage in different approved temporary locations while producing the same package hash.

## Publication stages

1. Normalize and validate the target manifest, expected commit, expected snapshot hash, and explicit evaluation timestamp.
2. Recursively enumerate the current registry subtree and require exact equality with the target file set.
3. Read all current files as bytes, parse independently, validate through TE-005, and recompute zone, line-history, manifest, and complete snapshot hashes.
4. Compare the independently computed current snapshot to the caller-provided expected snapshot.
5. Require the approved patch and bootstrap result to be `PASS`.
6. Recompute the bootstrap-result hash and patch semantic hash.
7. Require exact patch/bootstrap bundle equality and exact base commit/snapshot preconditions.
8. Validate the complete proposed snapshot through TE-005 and re-run `verifyTopoNodeRegistryPatch` against the independently read current artifacts.
9. Require unchanged project, zone, registry version, policy version, configuration version, and coordinate-registration reference set.
10. Materialize every proposed artifact into a newly created temporary root using canonical UTF-8 JSON plus one trailing newline.
11. Re-enumerate and independently re-read the materialized tree; recompute every artifact and snapshot hash.
12. Build a recovery manifest containing every original target path, raw before-byte payload, and raw before-byte SHA-256 hash.
13. Restore those exact bytes into a separate rollback-proof root, independently validate the restored snapshot, and require the restored snapshot hash and file hashes to equal the original.
14. Remove the rollback-proof root after proof. Re-read the live registry and prove its raw file hashes and snapshot hash did not change.
15. Emit a deterministic publication package only when every stage passes.

## Publication package

A passing `TopoRegistryPublicationPackage.v1` contains:

- project and zone;
- exact base commit and base snapshot hash;
- exact proposed snapshot hash;
- target-manifest hash and ordered target paths;
- ordered before/after raw file hashes;
- approved patch hash and bootstrap-result hash;
- deterministic operator instructions;
- complete recovery manifest and recovery-manifest hash;
- publication-package hash.

Machine-local temporary roots and audit timestamps are excluded from package semantics. Repeated semantic runs therefore produce byte-identical packages and package hashes.

The operator instructions require complete-registry replacement under independent change control. They explicitly prohibit partial file updates, conversion-runtime mutation, and publication without verified recovery evidence.

## Recovery package

`TopoRegistryRecoveryManifest.v1` records:

- project, zone, and base commit;
- original current-registry snapshot hash;
- target-manifest hash;
- every ordered target path;
- exact original bytes encoded as base64;
- SHA-256 of each original byte payload;
- recovery-manifest hash.

`restoreRegistrySnapshot()` accepts an explicit empty restore root. It validates the recovery-manifest hash and exact path set before writing, writes exact before-bytes, independently re-reads the restored registry, and proves both the complete snapshot hash and every raw file hash.

TE-015 uses this API only against the temporary rollback-proof root. It never invokes it against the current live registry.

## PASS result

```text
schema: TopoRegistryPublicationResult.v1
status: PASS
publishablePackage: complete
acceptedMaterializedRoot: explicit temporary root
materializedSnapshotHash: approved proposed snapshot hash
reReadSnapshotHash: materialized snapshot hash
rollbackProof.status: PASS
rollbackProof.restoredSnapshotHash: original current snapshot hash
liveRegistryMutated: false
```

## BLOCKED result

Any invalid authority, stale base, missing or unexpected path, hash mismatch, write failure, re-read corruption, rollback mismatch, or live-registry drift produces:

```text
status: BLOCKED
publishablePackage: null
acceptedMaterializedRoot: null
liveRegistryMutated: false
```

Controller-owned temporary candidate and rollback-proof trees are removed after a blocked run. Precise low-level blockers remain visible together with stage-level context.

## Coverage and lifecycle containment

TE-015 does not interpret absence as retirement. A partial or non-authoritative patch that removes history or carries a `RETIRE_NODE` operation is blocked independently, even before considering publication.

Lifecycle changes, number ownership, lease validity, and patch diff coverage remain TE-005/TE-012 authority and are revalidated rather than reimplemented.

## Failure containment

The controller fails closed for:

- stale expected commit or current snapshot;
- patch/bootstrap hash or bundle mismatch;
- proposed snapshot mismatch;
- missing, duplicate, extra, unsafe, or case-colliding paths;
- symbolic links or unsupported filesystem entries;
- existing materialization roots;
- partial writes or independent re-read corruption;
- rollback manifest, byte, file-hash, or snapshot-hash mismatch;
- any observed mutation of the current registry.

No blocked run exposes a directory or package as accepted publication output.
