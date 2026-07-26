import assert from 'node:assert/strict';
import { reconcileCoverage } from '../../tabs/model-converters/converters/fbx/benchmark-audit/coverage-reconciliation.js';

const occurrence = (occurrenceId) => ({ occurrenceId, identityKey: occurrenceId });
const terminal = (recordId, state, refs = [], actuals = [], refCandidates = refs, actualCandidates = actuals) => ({
  recordId, state, referenceOccurrenceIds:refs, actualOccurrenceIds:actuals,
  originalReferenceCandidateIds:refCandidates, originalActualCandidateIds:actualCandidates,
});
const diagnostic = (diagnosticId, state, refs = [], actuals = []) => ({
  diagnosticId, state, referenceOccurrenceIds:refs, actualOccurrenceIds:actuals,
});
function input(kind = 'COMPONENT', schema = 'FbxComponentBenchmarkReport.v1', overrides = {}) {
  return { schema:'FbxCoverageReconciliationInput.v2', populationId:`${kind}:test`, populationKind:kind,
    ledgerSchema:schema, referencePopulation:[occurrence('r1')], actualPopulation:[occurrence('a1')],
    terminalRecords:[terminal('t1','EXACT_MATCH',['r1'],['a1'])], diagnosticRecords:[], ...overrides };
}

assert.equal(reconcileCoverage(input()).status,'PASS');
assert.throws(() => reconcileCoverage(input('UNKNOWN')), /BLOCKED_AUDIT_VOCABULARY/);
assert.throws(() => reconcileCoverage(input('COMPONENT','FbxSupportBenchmarkReport.v1')), /BLOCKED_AUDIT_VOCABULARY/);
assert.throws(() => reconcileCoverage(input('COMPONENT','FbxComponentBenchmarkReport.v1', {
  terminalRecords:[terminal('x','MADE_UP_STATE',['r1'],['a1'])],
})), /BLOCKED_AUDIT_VOCABULARY/);

for (const state of ['EXACT_MATCH','APPROVED_EQUIVALENT']) {
  assert.throws(() => reconcileCoverage(input('COMPONENT','FbxComponentBenchmarkReport.v1', {
    referencePopulation:[occurrence('r1'),occurrence('r2')], actualPopulation:[occurrence('a1'),occurrence('a2')],
    terminalRecords:[terminal('many',state,['r1','r2'],['a1','a2'])],
  })), /BLOCKED_AUDIT_CARDINALITY/);
}
assert.throws(() => reconcileCoverage(input('COMPONENT','FbxComponentBenchmarkReport.v1', {
  terminalRecords:[terminal('bad-missing','MISSING_ACTUAL',['r1'],['a1'])],
})), /BLOCKED_AUDIT_CARDINALITY/);
assert.throws(() => reconcileCoverage(input('COMPONENT','FbxComponentBenchmarkReport.v1', {
  terminalRecords:[terminal('bad-unexpected','UNEXPECTED_ACTUAL',['r1'],['a1'])],
})), /BLOCKED_AUDIT_CARDINALITY/);

for (const state of ['EXACT_MATCH','APPROVED_EQUIVALENT','BLOCKED_IDENTITY','MISSING_ACTUAL','UNEXPECTED_ACTUAL']) {
  assert.throws(() => reconcileCoverage(input('COMPONENT','FbxComponentBenchmarkReport.v1', {
    diagnosticRecords:[diagnostic('launder',state,['r1'],['a1'])],
  })), /BLOCKED_AUDIT_VOCABULARY/);
}
const diagnosticOnly = reconcileCoverage(input('COMPONENT','FbxComponentBenchmarkReport.v1', {
  terminalRecords:[terminal('missing','MISSING_ACTUAL',['r1'],[])],
  diagnosticRecords:[diagnostic('candidate','DIAGNOSTIC_CANDIDATE',['r1'],['a1'])],
}));
assert.equal(diagnosticOnly.status,'FAIL');
assert.deepEqual(diagnosticOnly.unreconciledRecords,[{ side:'actual', occurrenceId:'a1' }]);

const unreconciledReference = reconcileCoverage(input('COMPONENT','FbxComponentBenchmarkReport.v1', {
  terminalRecords:[terminal('unexpected','UNEXPECTED_ACTUAL',[],['a1'])],
}));
assert.deepEqual(unreconciledReference.unreconciledRecords,[{ side:'reference', occurrenceId:'r1' }]);
const unreconciledActual = reconcileCoverage(input('COMPONENT','FbxComponentBenchmarkReport.v1', {
  terminalRecords:[terminal('missing','MISSING_ACTUAL',['r1'],[])],
}));
assert.deepEqual(unreconciledActual.unreconciledRecords,[{ side:'actual', occurrenceId:'a1' }]);

const duplicate = reconcileCoverage(input('COMPONENT','FbxComponentBenchmarkReport.v1', {
  actualPopulation:[occurrence('a1'),occurrence('a2')],
  terminalRecords:[terminal('p1','EXACT_MATCH',['r1'],['a1']),terminal('p2','EXACT_MATCH',['r1'],['a2'])],
}));
assert.equal(duplicate.status,'FAIL');
assert.deepEqual(duplicate.duplicateConsumptionAttempts.map((row)=>row.occurrenceId),['r1']);

const escaped = reconcileCoverage(input('COMPONENT','FbxComponentBenchmarkReport.v1', {
  actualPopulation:[occurrence('a1'),occurrence('a2')],
  terminalRecords:[terminal('pair','EXACT_MATCH',['r1'],['a2'],['r1'],['a1']),
    terminal('leftover','UNEXPECTED_ACTUAL',[],['a1'])],
}));
assert.equal(escaped.status,'FAIL');
assert.deepEqual(escaped.collisionEscapeAttempts.map((row)=>row.occurrenceId),['a2']);

const collision = reconcileCoverage(input('COMPONENT','FbxComponentBenchmarkReport.v1', {
  actualPopulation:[occurrence('a1'),occurrence('a2')],
  terminalRecords:[terminal('collision','AMBIGUOUS_MATCH',['r1'],['a1','a2'])],
}));
assert.equal(collision.status,'BLOCKED');

const supportBlocked = reconcileCoverage(input('SUPPORT','FbxSupportBenchmarkReport.v1', {
  referencePopulation:[occurrence('r1'),occurrence('r2')], actualPopulation:[occurrence('a1')],
  terminalRecords:[terminal('blocked','BLOCKED',['r1'],['a1']),terminal('missing','MISSING_ACTUAL',['r2'],[])],
}));
assert.equal(supportBlocked.status,'BLOCKED');
assert.equal(reconcileCoverage(input('SUPPORT','FbxSupportBenchmarkReport.v1', {
  referencePopulation:[], actualPopulation:[], terminalRecords:[],
})).status,'NOT_APPLICABLE');

for (const state of ['CONFLICT','UNASSIGNED','EXCLUDED']) {
  const result = reconcileCoverage(input('ZONE_BRANCH','FbxZoneMembershipIndex.v1', {
    referencePopulation:[occurrence('z1')], actualPopulation:[],
    terminalRecords:[terminal('zone',state,['z1'],[])],
  }));
  assert.equal(result.status,'BLOCKED');
}
const branch = reconcileCoverage(input('TOPOLOGY_BRANCH','FbxTopologyBenchmarkReport.v1'));
const relationship = reconcileCoverage(input('TOPOLOGY_RELATIONSHIP','FbxTopologyBenchmarkReport.v1'));
assert.equal(branch.status,'PASS');
assert.equal(relationship.status,'PASS');
assert.notEqual(branch.populationKind,relationship.populationKind);
assert.ok(Object.isFrozen(branch));
console.log('test-benchmark-coverage-reconciliation: PASS');
