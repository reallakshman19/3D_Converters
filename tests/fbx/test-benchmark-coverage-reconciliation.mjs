import assert from 'node:assert/strict';
import { reconcileCoverage } from '../../tabs/model-converters/converters/fbx/benchmark-audit/coverage-reconciliation.js';

const occurrence = (occurrenceId, identityKey = occurrenceId) => ({ occurrenceId, identityKey });
const terminal = (recordId, state, referenceOccurrenceIds = [], actualOccurrenceIds = [],
  originalReferenceCandidateIds = [], originalActualCandidateIds = []) => ({
  recordId, state, referenceOccurrenceIds, actualOccurrenceIds,
  originalReferenceCandidateIds, originalActualCandidateIds,
});
const diagnostic = (diagnosticId, state, referenceOccurrenceIds = [], actualOccurrenceIds = []) => ({
  diagnosticId, state, referenceOccurrenceIds, actualOccurrenceIds,
});
function input(populationKind, ledgerSchema, overrides = {}) {
  return {
    schema: 'FbxCoverageReconciliationInput.v1',
    populationId: `${populationKind.toLowerCase()}-population`,
    populationKind,
    ledgerSchema,
    referencePopulation: [occurrence('shared-reference')],
    actualPopulation: [occurrence('shared-actual')],
    terminalRecords: [terminal('terminal-1', 'EXACT_MATCH', ['shared-reference'], ['shared-actual'],
      ['shared-reference'], ['shared-actual'])],
    diagnosticRecords: [],
    ...overrides,
  };
}

const zone = reconcileCoverage(input('ZONE_BRANCH', 'FbxZoneMembershipIndex.v1', {
  terminalRecords: [terminal('zone-terminal', 'ASSIGNED', ['shared-reference'], ['shared-actual'],
    ['shared-reference'], ['shared-actual'])],
}));
const topology = reconcileCoverage(input('TOPOLOGY_BRANCH', 'FbxTopologyBenchmarkReport.v1'));
assert.equal(zone.status, 'PASS');
assert.equal(topology.status, 'PASS');

const duplicate = reconcileCoverage(input('COMPONENT', 'FbxComponentBenchmarkReport.v1', {
  terminalRecords: [
    terminal('component-1', 'EXACT_MATCH', ['shared-reference'], ['shared-actual'], ['shared-reference'], ['shared-actual']),
    terminal('component-2', 'APPROVED_EQUIVALENT', ['shared-reference'], [], ['shared-reference'], []),
  ],
}));
assert.equal(duplicate.status, 'FAIL');
assert.deepEqual(duplicate.duplicateConsumptionAttempts.map((item) => `${item.side}:${item.occurrenceId}`),
  ['reference:shared-reference']);

const missingReference = reconcileCoverage(input('COMPONENT', 'FbxComponentBenchmarkReport.v1', {
  terminalRecords: [terminal('actual-only', 'UNEXPECTED_ACTUAL', [], ['shared-actual'], [], ['shared-actual'])],
}));
assert.equal(missingReference.status, 'FAIL');
assert.deepEqual(missingReference.unreconciledRecords, [{ side: 'reference', occurrenceId: 'shared-reference' }]);

const missingActual = reconcileCoverage(input('COMPONENT', 'FbxComponentBenchmarkReport.v1', {
  terminalRecords: [terminal('reference-only', 'MISSING_ACTUAL', ['shared-reference'], [], ['shared-reference'], [])],
}));
assert.equal(missingActual.status, 'FAIL');
assert.deepEqual(missingActual.unreconciledRecords, [{ side: 'actual', occurrenceId: 'shared-actual' }]);

const diagnosticOnly = reconcileCoverage(input('COMPONENT', 'FbxComponentBenchmarkReport.v1', {
  terminalRecords: [terminal('missing', 'MISSING_ACTUAL', ['shared-reference'], [], ['shared-reference'], [])],
  diagnosticRecords: [diagnostic('candidate', 'EXACT_MATCH', ['shared-reference'], ['shared-actual'])],
}));
assert.equal(diagnosticOnly.status, 'FAIL');
assert.equal(diagnosticOnly.diagnosticRecordCount, 1);
assert.equal(diagnosticOnly.terminalRecordCount, 1);
assert.deepEqual(diagnosticOnly.unreconciledRecords, [{ side: 'actual', occurrenceId: 'shared-actual' }]);

const diagnosticBlocked = reconcileCoverage(input('COMPONENT', 'FbxComponentBenchmarkReport.v1', {
  diagnosticRecords: [diagnostic('blocked-candidate', 'BLOCKED_IDENTITY', ['shared-reference'], ['shared-actual'])],
}));
assert.equal(diagnosticBlocked.status, 'PASS');

assert.throws(() => reconcileCoverage(input('UNKNOWN', 'FbxComponentBenchmarkReport.v1')), /BLOCKED_AUDIT_VOCABULARY/);
assert.throws(() => reconcileCoverage(input('COMPONENT', 'FbxComponentBenchmarkReport.v1', {
  terminalRecords: [terminal('unknown', 'MADE_UP_STATE', ['shared-reference'], ['shared-actual'])],
})), /BLOCKED_AUDIT_VOCABULARY/);
assert.throws(() => reconcileCoverage(input('COMPONENT', 'FbxSupportBenchmarkReport.v1')), /BLOCKED_AUDIT_VOCABULARY/);

const collisionEscape = reconcileCoverage(input('COMPONENT', 'FbxComponentBenchmarkReport.v1', {
  actualPopulation: [occurrence('candidate-a'), occurrence('outside-a')],
  terminalRecords: [
    terminal('escaped-pair', 'EXACT_MATCH', ['shared-reference'], ['outside-a'], ['shared-reference'], ['candidate-a']),
    terminal('candidate-unexpected', 'UNEXPECTED_ACTUAL', [], ['candidate-a'], [], ['candidate-a']),
  ],
}));
assert.equal(collisionEscape.status, 'FAIL');
assert.deepEqual(collisionEscape.collisionEscapeAttempts.map((item) => item.occurrenceId), ['outside-a']);

const blockedSupport = reconcileCoverage(input('SUPPORT', 'FbxSupportBenchmarkReport.v1', {
  referencePopulation: [occurrence('support-r1'), occurrence('support-r2')],
  actualPopulation: [occurrence('support-a1')],
  terminalRecords: [
    terminal('blocked', 'BLOCKED', ['support-r1'], ['support-a1'], ['support-r1'], ['support-a1']),
    terminal('missing', 'MISSING_ACTUAL', ['support-r2'], [], ['support-r2'], []),
  ],
}));
assert.equal(blockedSupport.status, 'BLOCKED');

const noSupports = reconcileCoverage(input('SUPPORT', 'FbxSupportBenchmarkReport.v1', {
  referencePopulation: [], actualPopulation: [], terminalRecords: [], diagnosticRecords: [],
}));
assert.equal(noSupports.status, 'NOT_APPLICABLE');

const topologyBranch = reconcileCoverage(input('TOPOLOGY_BRANCH', 'FbxTopologyBenchmarkReport.v1'));
const topologyRelationship = reconcileCoverage(input('TOPOLOGY_RELATIONSHIP', 'FbxTopologyBenchmarkReport.v1'));
assert.equal(topologyBranch.populationKind, 'TOPOLOGY_BRANCH');
assert.equal(topologyRelationship.populationKind, 'TOPOLOGY_RELATIONSHIP');
assert.equal(topologyBranch.status, 'PASS');
assert.equal(topologyRelationship.status, 'PASS');

const zoneFailures = reconcileCoverage(input('ZONE_BRANCH', 'FbxZoneMembershipIndex.v1', {
  referencePopulation: [occurrence('zone-r1'), occurrence('zone-r2')],
  actualPopulation: [],
  terminalRecords: [
    terminal('zone-conflict', 'CONFLICT', ['zone-r1'], [], ['zone-r1'], []),
    terminal('zone-unassigned', 'UNASSIGNED', ['zone-r2'], [], ['zone-r2'], []),
  ],
}));
assert.equal(zoneFailures.status, 'FAIL');
assert.deepEqual(zoneFailures.terminalStateCounts, { CONFLICT: 1, UNASSIGNED: 1 });
assert.ok(Object.isFrozen(zoneFailures));

console.log('test-benchmark-coverage-reconciliation: PASS');
