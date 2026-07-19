# TE-002 — TopoEnrichedXML v1 Contract Freeze

Parent epic: #202  
Work pack: #204  
Dependency evidence: TE-001 / PR #211 / `de694e4a715e7827f4805db2773980d1def8c7d7`

## Scope

This freeze defines executable contracts and architecture decisions only. It does not implement writer migration, allocation, historical matching, topology normalization, registry bootstrap, or CII changes.

## Semantic identities

The following identities are separate and may not be substituted for each other:

1. raw source entity (`sourceEntityId`);
2. raw source port (`sourcePortId`);
3. logical topology node (`logicalNodeId`);
4. logical topology edge (`logicalEdgeId`);
5. PSI writer occurrence (`occurrenceId`);
6. emitted occurrence (`disposition: EMITTED`);
7. reserved occurrence (`disposition: RESERVED`);
8. historical node identity (`historyNodeId`);
9. engineering node number (`engineeringNodeNumber`);
10. component projection (`componentProjectionId`);
11. source branch (`sourceBranch`);
12. canonical main line (`canonicalMainLine`);
13. registry range lease (`leaseId`).

## Status model

- `PASS`: blockers and review items are empty. Automatic continuation is permitted only when the operating mode also permits it.
- `REVIEW_REQUIRED`: blockers are empty and at least one review item is present. This status is never equivalent to PASS.
- `BLOCKED`: at least one blocker is present. Production continuation is prohibited.

## Operating modes

| Mode | Authoritative output | New artifacts | Fallback |
|---|---|---|---|
| `LEGACY` | Current writer output | Optional evidence only | Current writer behavior remains available |
| `SHADOW` | Current writer output | New plans/reports generated and compared | New artifacts cannot control XML |
| `REVIEW` | No automatic authoritative output when review items exist | Proposed node plan and registry patch require disposition | No silent conversion to PASS |
| `ENFORCED` | Immutable approved node/serialization plan | Exact plan, parity, registry and audit bundle | Writer-owned allocation fallback is prohibited |

## Explicit numbering rule

Every emitted or reserved occurrence in `TopoNodePlan.v1` and `PsiSerializationPlan.v1` carries its explicit engineering node number. The following representations are prohibited:

```text
startNodeNumber
nodeCounter
numberingSpan
baseNodeNumber + offset
node + 10
derivedFromOccurrenceId
```

`PsiWriterOccurrence.v1` and `PsiWriterOccurrencePlan.v1` contain no engineering allocation.

## Hash policy

Canonical semantic serialization recursively sorts object keys, preserves array order, uses UTF-8 JSON, and excludes audit-only metadata including `evaluatedAt`, generated timestamps, runtime durations and workflow display metadata.

| Hash | Semantic inputs |
|---|---|
| `sourceInventoryHash` | source identity, project/zone/frame, branches, entities, ports |
| `logicalTopologyHash` | logical nodes/edges/junctions/boundaries/supports and frame |
| `sequencePlanHash` | source/logical hashes plus ordered branches/components |
| `baseRegistrySnapshotHash` | policy, pool, sorted line histories, schema versions |
| `configHash` | complete normalized configuration |
| `coordinateRegistrationHash` | transform, frames, anchors and residual evidence |
| `historyMatchResultHash` | matches, new, ambiguous, conflict, reactivation and retirement candidates |
| `allocationResultHash` | leases, explicit allocations, retirements and reactivations |
| `nodePlanHash` | chain hashes plus logical nodes, explicit occurrences, port mappings and component projection |
| `proposedRegistryHash` | base snapshot/commit, preconditions and ordered operations |

`evaluatedAt` is audit evidence and is excluded from every semantic hash.

## TE-001 traceability

- TEE and REDU/REDUCER reserve two slots and emit one occurrence from the characterized second-slot role; reserved and emitted occurrences are therefore distinct contract records.
- PIPE and OLET have characterized paired occurrences.
- ELBO/BEND retain raw type evidence while projecting the characterized PSI occurrence type.
- canonical and source-sequential presentations must ultimately share occurrence identity and explicit numbering; legacy numbering drift is not accepted by `PsiWriterParityReport.v2` PASS.
- writer clock metadata is excluded from semantic hashes.
- mutable `record.xmlNodeNum` is legacy evidence only and is not an authority in frozen contracts.

## Downstream readiness

TE-003 may implement a pure `PsiWriterOccurrencePlan.v1` only after independent review and orchestrator acceptance of this freeze. TE-003 must not allocate node numbers or edit the production serializer.
