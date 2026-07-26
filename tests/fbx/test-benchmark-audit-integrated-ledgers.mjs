import assert from 'node:assert/strict';
import { reconcileCoverage } from '../../tabs/model-converters/converters/fbx/benchmark-audit/coverage-reconciliation.js';

const occurrence = (occurrenceId) => ({ occurrenceId, identityKey: occurrenceId });
const terminal = (recordId, state, referenceOccurrenceIds, actualOccurrenceIds) => ({
  recordId,
  state,
  referenceOccurrenceIds,
  actualOccurrenceIds,
  originalReferenceCandidateIds: [...referenceOccurrenceIds],
  originalActualCandidateIds: [...actualOccurrenceIds],
});
function reconcile(populationKind, ledgerSchema, state = 'EXACT_MATCH') {
  return reconcileCoverage({
    schema: 'FbxCoverageReconciliationInput.v1',
    populationId: `${populationKind}:integrated`,
    populationKind,
    ledgerSchema,
    referencePopulation: [occurrence('reference:1')],
    actualPopulation: [occurrence('actual:1')],
    terminalRecords: [terminal('terminal:1', state, ['reference:1'], ['actual:1'])],
    diagnosticRecords: [],
  });
}

assert.equal(reconcile('COMPONENT', 'FbxComponentBenchmarkReport.v1').status, 'PASS');
assert.equal(reconcile('SUPPORT', 'FbxSupportBenchmarkReport.v1').status, 'PASS');
assert.equal(reconcile('ZONE_BRANCH', 'FbxZoneMembershipIndex.v1', 'SHARED_BOUNDARY').status,
  'PASS_WITH_OBSERVATIONS');

for (const populationKind of [
  'TOPOLOGY_BRANCH', 'TOPOLOGY_RELATIONSHIP', 'TOPOLOGY_JUNCTION', 'TOPOLOGY_BOUNDARY',
]) {
  const result = reconcile(populationKind, 'FbxTopologyBenchmarkReport.v1');
  assert.equal(result.populationKind, populationKind);
  assert.equal(result.status, 'PASS');
}

assert.throws(() => reconcile('COMPONENT', 'FbxSupportBenchmarkReport.v1'), /BLOCKED_AUDIT_VOCABULARY/);
assert.throws(() => reconcile('TOPOLOGY_EDGE', 'FbxTopologyBenchmarkReport.v1'), /BLOCKED_AUDIT_VOCABULARY/);

console.log('test-benchmark-audit-integrated-ledgers: PASS');
