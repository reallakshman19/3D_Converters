# FBX-AUTO-002 — deterministic PIPE inference

## Status

Owner direct implementation is in progress on `owner/fbx-auto-002-core`.

## Accepted authority chain

```text
exact FBX bytes
→ FbxSourceGraph.v2
→ FbxGeometryBundle.v1
→ FbxZoneGeometryEvidence.v1
→ FbxDerivedPortEvidence.v1
→ strict PIPE admission
→ one-to-one derived-port connectivity
→ accepted family/connectivity/writer pipeline
```

The implementation does not modify public `FbxStagedMapping.v1/v2` semantics and does not introduce another StagedJSON writer.

## Initial PIPE admission profile

The first committed slice requires one geometry, exactly two admitted boundary loops, one deterministic A/L assignment, equal radii within the closed profile, and every exact transformed control point to lie on one constant-radius open cylinder between the two derived centres.

Names, materials, colours, preview samples and hierarchy labels are not classification authority.

## Initial connectivity profile

Ports match only when centres coincide within the closed tolerance, normals are opposed, radii agree, and the ports belong to different components. Zero matches remain open endpoints. More than one match blocks release. Coordinates are never moved, averaged or snapped.

## Incomplete integration

The following remain required before merge:

- internal authority artifact and deterministic identity hashing;
- accepted family/connectivity/writer execution;
- selected-zone lifecycle/UI publication;
- focused tests and full FBX regression proof;
- browser certification with committed WASM/Worker execution.
