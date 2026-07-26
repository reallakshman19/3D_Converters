import assert from 'node:assert/strict';
import { reconcileCoverage, summarizeSupportReconciliations } from '../../tabs/model-converters/converters/fbx/benchmark-audit/coverage-reconciliation.js';

const occurrence = (occurrenceId) => ({ occurrenceId, identityKey: occurrenceId });
const base = (populationKind, ledgerSchema) => ({
  populationId: `${populationKind}:test`, populationKind, ledgerSchema,
  referenceOccurrences: [occurrence('shared:1')], actualOccurrences: [occurrence('actual:1')],
  terminalRecords: [{ recordId: 'terminal:1', state: 'EXACT_MATCH', referenceOccurrenceId: 'shared:1', actualOccurrenceId: 'actual:1' }],
  diagnosticRecords: [], allowNotApplicable: false,
});

assert.equal(reconcileCoverage(base('COMPONENT', 'FbxComponentBenchmarkReport.v1')).status, 'PASS');
assert.equal(reconcileCoverage({ ...base('TOPOLOGY_RELATIONSHIP', 'FbxTopologyBenchmarkReport.v1'), populationId: 'topology:test' }).status, 'PASS');

assert.throws(() => reconcileCoverage({ ...base('COMPONENT', 'FbxComponentBenchmarkReport.v1'), populationKind: 'UNKNOWN' }), /BLOCKED_AUDIT_VOCABULARY/);
assert.throws(() => reconcileCoverage({ ...base('COMPONENT', 'FbxComponentBenchmarkReport.v1'), terminalRecords: [{ recordId: 'x', state: 'UNKNOWN', referenceOccurrenceId: 'shared:1', actualOccurrenceId: 'actual:1' }] }), /BLOCKED_AUDIT_VOCABULARY/);

const duplicate = base('SUPPORT', 'FbxSupportBenchmarkReport.v1');
duplicate.terminalRecords.push({ recordId: 'terminal:2', state: 'BLOCKED', referenceOccurrenceId: 'shared:1', actualOccurrenceId: null });
assert.equal(reconcileCoverage(duplicate).status, 'FAIL');

const missingReference = base('ZONE_BRANCH', 'FbxZoneMembershipIndex.v1');
missingReference.terminalRecords = [];
missingReference.actualOccurrences = [];
assert.equal(reconcileCoverage(missingReference).status, 'FAIL');

const missingActual = base('COMPONENT', 'FbxComponentBenchmarkReport.v1');
missingActual.terminalRecords = [{ recordId: 'terminal:1', state: 'MISSING_ACTUAL', referenceOccurrenceId: 'shared:1', actualOccurrenceId: null }];
assert.equal(reconcileCoverage(missingActual).status, 'FAIL');

const diagnosticOnly = base('COMPONENT', 'FbxComponentBenchmarkReport.v1');
diagnosticOnly.terminalRecords = [];
diagnosticOnly.diagnosticRecords = [{ recordId: 'candidate:1', candidateReferenceOccurrenceIds: ['shared:1'], candidateActualOccurrenceIds: ['actual:1'], reason: 'diagnostic collision candidate' }];
assert.equal(reconcileCoverage(diagnosticOnly).status, 'FAIL');

const zoneConflict = base('ZONE_BRANCH', 'FbxZoneMembershipIndex.v1');
zoneConflict.terminalRecords[0].state = 'CONFLICT';
assert.deepEqual(reconcileCoverage(zoneConflict).countsByTerminalState, { CONFLICT: 1 });
const zoneUnassigned = base('ZONE_BRANCH', 'FbxZoneMembershipIndex.v1');
zoneUnassigned.terminalRecords = [{ recordId: 'terminal:1', state: 'UNASSIGNED', referenceOccurrenceId: 'shared:1', actualOccurrenceId: null }];
zoneUnassigned.actualOccurrences = [];
assert.deepEqual(reconcileCoverage(zoneUnassigned).countsByTerminalState, { UNASSIGNED: 1 });

const zeroSupport = { populationId: 'supports:none', populationKind: 'SUPPORT', ledgerSchema: 'FbxSupportBenchmarkReport.v1', referenceOccurrences: [], actualOccurrences: [], terminalRecords: [], diagnosticRecords: [], allowNotApplicable: true };
assert.equal(reconcileCoverage(zeroSupport).status, 'NOT_APPLICABLE');
assert.equal(summarizeSupportReconciliations([{ status: 'FAIL' }, { status: 'BLOCKED' }]), 'BLOCKED');
assert.equal(summarizeSupportReconciliations([{ status: 'NOT_APPLICABLE' }]), 'NOT_APPLICABLE');

console.log('test-benchmark-audit-integrated-ledgers: PASS');
