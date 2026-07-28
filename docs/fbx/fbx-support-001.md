# FBX-SUPPORT-001

## Authority boundary

FBX-SUPPORT-001 adds selected-zone SUPPORT evidence and a geometry-bearing engineering package without changing existing StagedJSON component-family semantics.

The authoritative input chain is:

```text
exact FBX bytes
→ accepted parser/WASM
→ FbxSourceGraph.v2
→ FbxGeometryBundle.v1
→ FbxZoneGeometryEvidence.v1
→ selected-zone SUPPORT analysis
→ FbxSupportEvidence.v1
→ FbxSelectedZoneEngineeringPackage.v1
```

Existing admitted PIPE classifications are the only host-pipe authority. The SUPPORT implementation does not alter PIPE classification, connectivity, mapping, or StagedJSON writing. Names, DOM fields, and custom properties are retained as evidence only and cannot admit a support or determine a subtype.

## Initial classification boundary

The initial release emits only:

```text
supportClass: GENERIC_SUPPORT
supportSubtypeDisposition: NOT_EVALUATED
```

It does not infer `REST`, `GUIDE`, `LINE_STOP`, `HOLD_DOWN`, `HANGER`, `SHOE`, `CLAMP`, or `FRAME`. Geometry alone does not prove restraint mechanics, load direction, permitted movement, attachment condition, or installation intent.

Every selected occurrence terminates as one of:

```text
SUPPORT_ADMITTED
SUPPORT_CANDIDATE_REJECTED
SUPPORT_CANDIDATE_AMBIGUOUS
NOT_SUPPORT_EVIDENCE
CONTEXT_ONLY
```

No ambiguous candidate is silently omitted.

## Analysis profile

The centralized profile is `FBX_SUPPORT_Z1_PROFILE_V1` in `support-analysis/profile.js`.

| Parameter | Rule |
|---|---:|
| Candidate diagonal | `25 mm <= diagonal <= 12,000 mm` |
| Per-axis span | `<= 12,000 mm` |
| Occupied dimensions | at least two axes `>= 1 mm` |
| Connected shells | `1..64` inclusive |
| Source polygons per candidate | `<= 250,000` |
| Source vertex references per candidate | `<= 500,000` |
| Derived triangles per candidate | `<= 500,000` |
| Derived triangles per zone | `<= 5,000,000` |
| Occurrences per assembly | `<= 128` |
| Host search radius | `<= 1,500 mm` broad phase |
| Pipe-surface clearance | `max(2 mm, min(20 mm, 1% of OD))` |
| Contact-normal tolerance | `<= 30 degrees` |
| Minimum contact witnesses | `>= 3` exact transformed source vertices |
| Minimum axial overlap | `max(10 mm, min(100 mm, 5% of OD))` |
| Minimum structural continuation | `max(15 mm, min(150 mm, 10% of OD))` |
| Line-like slenderness | ratio `> 120` is ambiguous |
| Sheet-like slenderness | ratio `> 120` is ambiguous |
| Candidate-host pair limit | `<= 200,000` |
| Candidate-assembly pair limit | `<= 200,000` |

The profile declares world up explicitly as `[0, 0, 1]`. There is no UI or runtime fallback that silently substitutes another axis.

## Topology and transforms

The detector consumes exact `control-points-mm`, `polygon-offsets`, and `polygon-vertex-indices` buffers with each occurrence's `geometryMatrixMm`.

Polygon triangulation is deterministic derived evidence. It does not rewrite source buffers. The implementation rejects non-planar, self-intersecting, degenerate, point, line, empty, or untriangulable polygons. Source polygon keys and source vertex indices remain attached to every derived contact triangle.

Occurrence transforms must satisfy the accepted FBX transform policy. Unsupported inheritance, singular transforms, shear, and ambiguous non-uniform scaling fail closed as `BLOCKED_SUPPORT_SCOPE`.

Preview wireframe sampling, segment stride, renderer state, and UI labels never enter engineering analysis.

## Candidate admission

Exact admitted PIPE occurrences are excluded from SUPPORT candidacy. Remaining polygonal occurrences enter a broad candidate inventory and are admitted only when all mandatory geometric and host predicates pass.

A support-shaped object is not an actual piping support until direct pipe-surface contact and structural continuation are proved. Flanges, valves, branches, reducers, pipe insulation, equipment nozzles, cable trays, handrails, ladders, platforms, columns, foundations, temporary geometry, and nearby steel are not admitted from shape, names, or proximity alone.

Zero-geometry occurrences are context only. Shared and instanced geometry retain separate occurrence identities and world transforms. Multi-geometry occurrences are evaluated exhaustively. NURBS without an already accepted polygonal geometry bundle representation are unsupported.

The current source graph contract does not expose a governed hidden/renderable flag. The detector therefore does not invent hidden-state evidence; this remains a documented limitation.

## Host association

A host classification must bind exactly to the selected-zone occurrence, model object, and geometry object. Each admitted PIPE host supplies a finite centreline, axial span, outside radius, and axis.

Host association uses:

1. a deterministic finite-pipe expanded AABB broad phase;
2. exact candidate-triangle to finite pipe-cylinder witness testing;
3. outside-surface clearance;
4. contact-normal alignment;
5. axial contact overlap;
6. structural continuation away from the pipe surface.

There is no nearest-pipe fallback. Centreline distance alone is insufficient.

Outcomes are:

```text
SINGLE_HOST_PROVED
MULTI_HOST_PROVED
HOST_AMBIGUOUS
HOST_NOT_FOUND
HOST_ASSOCIATION_NOT_APPLICABLE
```

Two or more independently proved pipe occurrences produce `MULTI_HOST_PROVED`. Conflicting geometric interpretations for the same pipe occurrence produce `HOST_AMBIGUOUS`. Exact duplicate host evidence is deduplicated.

The support reference position is an existing contact witness selected by deterministic medoid ordering. No coordinate averaging or coordinate snapping is performed.

## Evidence contract

`contracts/fbx/fbx-support-evidence.v1.schema.json` is closed with `additionalProperties: false` at every governed object boundary.

`FbxSupportEvidence.v1` binds:

```text
source identity
parser identity
source graph digest
geometry bundle digest
selected-zone geometry artifact
analysis profile and digest
candidate dispositions
admitted supports
rejected and ambiguous candidates
host associations
conservation
release disposition
```

Support-like names and custom properties are retained as `NON_AUTHORITATIVE` evidence. They do not participate in candidate, assembly, host-association, or support IDs.

## Engineering package

`FbxSelectedZoneEngineeringPackage.v1` is a deterministic ZIP using the `STORE` method. Entries use UTF-8 paths, `/` separators, fixed DOS timestamp `1980-01-01T00:00:00Z`, fixed `0644` permissions, no extra fields, no comments, and canonical entry ordering.

Package contents are:

```text
manifest.json
source-graph.selected-zone.json
geometry-bundle.manifest.json
geometry-buffers/
zone-geometry-evidence.json
derived-port-evidence.json
support-evidence.json
pipe-inference-evidence.json          [when available]
selected-zone.staged.json             [when available]
package-audit.json
```

The exact accepted selected-zone geometry buffer bytes are preserved. The manifest distinguishes deterministic package-content identity from the completed archive transport SHA-256.

When StagedJSON is unavailable:

```text
stagedJsonDisposition: ABSENT
stagedJsonBlockStatus: <exact existing PIPE/StagedJSON status>
```

No partial or unauthorized StagedJSON is created. Mesh geometry remains in the companion package because existing StagedJSON is a governed component-semantic contract, not a mesh container.

## Preview semantics

Before analysis:

```text
supports: not evaluated
```

During analysis:

```text
supports: analysing
```

After a complete run, the UI reports candidate, admitted, rejected, hosted, and unhosted counts. A blocked run displays its exact `BLOCKED_SUPPORT_*` status. The UI never represents absence of analysis as `supports: 0`.

Available controls are:

```text
Analyse zone geometry
Analyse supports
Download zone geometry evidence
Download derived port evidence
Download PIPE inference evidence
Download support evidence
Download zone engineering package
Download zone StagedJSON
```

The engineering package can be available with valid geometry and support evidence even when existing PIPE-only StagedJSON remains blocked.

## Invalidation

New source bytes, a new converter run, zone change, geometry rerun, changed PIPE evidence, cancellation, and stale generations invalidate current SUPPORT evidence and package state. Stale asynchronous results are discarded by generation identity. Browser refresh does not restore authority without revalidating the exact source and artifacts.

Package failure does not invalidate already valid support evidence. Existing StagedJSON availability remains governed exclusively by existing `STAGEDJSON_PASS` authority.

## Known limitations

- Detailed restraint subtypes are prohibited.
- Integral shoes, clamps, dummy legs, and trunnions that cannot be separated from PIPE topology remain ambiguous.
- Point and line representations of U-bolts, rods, or annotations are unsupported.
- Frames with no direct pipe-contact member are not admitted.
- Hidden/non-renderable state is unavailable in the governed source graph contract.
- Direct geometric contact is required; owner intent cannot replace missing contact evidence.
- Very large, highly fragmented, or highly detailed supports may hit governed resource limits.

## Validation evidence

Focused tests cover candidate inventory, generic classification, fail-closed classification, single and multiple hosts, host ambiguity, no-host behavior, source-order independence, transforms, determinism, resource limits, closed contract validation, package contents and repeated bytes, absent StagedJSON, UI lifecycle, and static UI truthfulness.

Release qualification additionally requires the complete existing FBX suite, committed-WASM Worker execution, browser lifecycle proof, package extraction and digest verification, changed-path and line-count audits, and the exact TAY-A selected-zone proof.

For the reported TAY-A fixture, qualification must first reproduce:

```text
source: TAY-A
zone: /TWGA-1000-CU-PI-P
selected geometries: 389
wireframe source segments: 343380
```

No support count is claimed until the approved detector executes against the exact model bytes.
