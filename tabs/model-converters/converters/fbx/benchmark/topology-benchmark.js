/**
 * FBX semantic topology benchmark report assembly.
 *
 * Prepared graph inputs must already carry approved semantic entity IDs, zone
 * assignments, and typed relationships. This module does not parse StagedJSON
 * or infer engineering authority.
 */

import {
  FAIL_STATES,
  TOPOLOGY_RELATIONSHIP_KINDS,
  normalizeGraph,
  normalizePolicy,
  normalizeTolerance,
  record,
} from './topology-benchmark-contract.js';
import {
  branchReports,
  cycleAnomalies,
  flowState,
  islandAnomalies,
  junctionReports,
  orphanBranchAnomalies,
} from './topology-benchmark-graph-analysis.js';
import {
  boundaryAnomalies,
  boundaryReports,
  buildRelationshipLedger,
  duplicateEntityAnomalies,
  reciprocityAnomalies,
  selfConnectionAnomalies,
  unresolvedAnomalies,
} from './topology-benchmark-relationships.js';

export { TOPOLOGY_RELATIONSHIP_KINDS } from './topology-benchmark-contract.js';

function statusCounts(records) {
  const counts = { PASS: 0, PASS_WITH_OBSERVATIONS: 0, FAIL: 0, BLOCKED: 0, NOT_APPLICABLE: 0 };
  for (const item of records) counts[item.status] = (counts[item.status] ?? 0) + 1;
  return Object.freeze(counts);
}

export function buildFbxTopologyBenchmarkReport(input) {
  const request = record(input, 'input');
  const reference = normalizeGraph(request.referenceGraph, 'referenceGraph');
  const actual = normalizeGraph(request.actualGraph, 'actualGraph');
  const policy = normalizePolicy(request.policy);
  const tolerance = normalizeTolerance(request.toleranceProfile);
  const relationshipLedger = buildRelationshipLedger(reference, actual, tolerance);
  const referenceFlow = flowState(reference);
  const actualFlow = flowState(actual);

  const ambiguousReferences = [
    ...duplicateEntityAnomalies(reference, 'reference'),
    ...duplicateEntityAnomalies(actual, 'actual'),
  ];
  const unresolvedReferences = [
    ...unresolvedAnomalies(reference, 'reference'),
    ...unresolvedAnomalies(actual, 'actual'),
  ];
  const reciprocityMismatches = reciprocityAnomalies(actual, policy);
  const selfConnections = selfConnectionAnomalies(actual);
  const disconnectedIslands = islandAnomalies(referenceFlow, actualFlow);
  const unexpectedCycles = cycleAnomalies(referenceFlow, actualFlow, policy);
  const orphanBranches = orphanBranchAnomalies(actual);
  const boundaryDiscontinuities = boundaryAnomalies(actual);
  const duplicateEdges = relationshipLedger.filter((row) => row.matchState === 'DUPLICATE_EDGE');
  const relationshipKindConflicts = relationshipLedger.filter((row) => row.matchState === 'RELATIONSHIP_KIND_CONFLICT');

  const referenceIds = new Set(reference.entities.map((entity) => entity.entityId));
  const actualIds = new Set(actual.entities.map((entity) => entity.entityId));
  const branches = branchReports(reference, actual, relationshipLedger, policy, actualFlow);
  const junctions = junctionReports(reference, actual);
  const boundaries = boundaryReports(relationshipLedger, reference, actual);

  const blocking = ambiguousReferences.some((row) => row.blocking)
    || unresolvedReferences.some((row) => row.blocking);
  const failing = relationshipLedger.some((row) => FAIL_STATES.has(row.matchState))
    || reciprocityMismatches.length || selfConnections.length || disconnectedIslands.length
    || unexpectedCycles.length || orphanBranches.length || boundaryDiscontinuities.length
    || branches.some((row) => row.status === 'FAIL') || junctions.some((row) => row.status === 'FAIL')
    || boundaries.some((row) => row.status === 'FAIL');
  const overallStatus = blocking ? 'BLOCKED' : failing ? 'FAIL' : 'PASS';

  return Object.freeze({
    schema: 'FbxTopologyBenchmarkReport.v1',
    benchmarkIdentity: structuredClone(record(request.benchmarkIdentity, 'benchmarkIdentity')),
    executionIdentity: structuredClone(record(request.executionIdentity, 'executionIdentity')),
    coverage: Object.freeze({
      referenceEntityCount: reference.entities.length,
      actualEntityCount: actual.entities.length,
      referenceRelationshipCount: reference.relationships.length,
      actualRelationshipCount: actual.relationships.length,
      relationshipLedgerCount: relationshipLedger.length,
      unrepresentedReferenceEntities: [...referenceIds].filter((id) => !actualIds.has(id)).sort(),
      unrepresentedActualEntities: [...actualIds].filter((id) => !referenceIds.has(id)).sort(),
      unrepresentedReferenceRelationships: relationshipLedger.filter((row) => row.matchState === 'MISSING_ACTUAL')
        .map((row) => row.relationshipId),
      unrepresentedActualRelationships: relationshipLedger.filter((row) => row.matchState === 'UNEXPECTED_ACTUAL')
        .map((row) => row.relationshipId),
    }),
    graphModel: Object.freeze({
      relationshipKinds: TOPOLOGY_RELATIONSHIP_KINDS,
      topologyPolicyId: policy.policyId,
      toleranceProfileId: tolerance.profileId,
    }),
    branches: Object.freeze(branches),
    relationships: relationshipLedger,
    junctions: Object.freeze(junctions),
    boundaries: Object.freeze(boundaries),
    anomalies: Object.freeze({
      unresolvedReferences: Object.freeze(unresolvedReferences),
      ambiguousReferences: Object.freeze(ambiguousReferences),
      reciprocityMismatches: Object.freeze(reciprocityMismatches),
      duplicateEdges: Object.freeze(duplicateEdges),
      selfConnections: Object.freeze(selfConnections),
      orphanBranches: Object.freeze(orphanBranches),
      disconnectedIslands: Object.freeze(disconnectedIslands),
      unexpectedCycles: Object.freeze(unexpectedCycles),
      boundaryDiscontinuities: Object.freeze(boundaryDiscontinuities),
      relationshipKindConflicts: Object.freeze(relationshipKindConflicts),
    }),
    summary: Object.freeze({
      branchStatusCounts: statusCounts(branches),
      relationshipStatusCounts: statusCounts(relationshipLedger),
      junctionStatusCounts: statusCounts(junctions),
      boundaryStatusCounts: statusCounts(boundaries),
      islandCount: actualFlow.islands.length,
      unexpectedCycleCount: unexpectedCycles.length,
      topologyStatus: overallStatus,
    }),
    determinism: request.determinism == null ? null : structuredClone(record(request.determinism, 'determinism')),
    status: overallStatus,
  });
}
