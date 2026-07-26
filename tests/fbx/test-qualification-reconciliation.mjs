import assert from 'node:assert/strict';
import {
  buildFbxQualificationReconciliation,
  validateFbxQualificationReconciliation,
} from '../../tabs/model-converters/converters/fbx/benchmark/qualification-reconciliation.js';

const BASE = 'a'.repeat(40);
const HEAD = 'b'.repeat(40);
const identity = Object.freeze({
  benchmarkId: 'StaggedJsonBMforFBX',
  repository: 'reallaksh19/3D_Converters',
  benchmarkCommit: 'c'.repeat(40),
  benchmarkPath: 'Benchmarks/fbx BM/StaggedJsonBMforFBX',
  benchmarkBlobSha: 'd'.repeat(40),
  contentSha256: 'e'.repeat(64),
  byteLength: 100,
});
const authority = Object.freeze({
  commit: identity.benchmarkCommit,
  path: identity.benchmarkPath,
  blobSha: identity.benchmarkBlobSha,
});
function loaded(prefix, fullIdentity = false) {
  const componentRecord = { type: 'VALV', attributes: {} };
  const supportRecord = { type: 'SUPPORT', attributes: {} };
  const branchRecord = { type: 'BRANCH', attributes: {}, children: [componentRecord, supportRecord] };
  const branch = { occurrenceId: 'branch:0', branchOccurrenceId: 'branch:0', parentOccurrenceId: null,
    branchIndex: 0, childIndex: null, recordRole: 'BRANCH_RECORD', record: branchRecord };
  const component = { occurrenceId: 'branch:0/child:0', branchOccurrenceId: 'branch:0',
    parentOccurrenceId: 'branch:0', branchIndex: 0, childIndex: 0, recordRole: 'CHILD_RECORD', record: componentRecord };
  const support = { occurrenceId: 'branch:0/child:1', branchOccurrenceId: 'branch:0',
    parentOccurrenceId: 'branch:0', branchIndex: 0, childIndex: 1, recordRole: 'CHILD_RECORD', record: supportRecord };
  const occurrences = [branch, component, support];
  return { schema: 'FbxBenchmarkLoaded.v1', identity: fullIdentity ? { ...identity } : {
    contentSha256: `${prefix === 'ref' ? 'e' : 'f'}`.repeat(64), byteLength: 100,
  }, branches: [branchRecord], occurrences,
  occurrenceById: Object.fromEntries(occurrences.map((item) => [item.occurrenceId, item])) };
}
function inventory() {
  return { schema: 'FbxBenchmarkInventory.v1', benchmarkIdentity: { ...identity },
    parseResult: { status: 'PASS', skippedRecordCount: 0 }, inventoryStatus: 'PASS',
    counts: { totalRecords: 3, branchRecords: 1, childRecords: 2,
      supportOuterTypeRecords: 1, nonSupportChildRecords: 1 } };
}
function zoneReport() {
  return { schema: 'FbxZoneBenchmarkReport.v1', status: 'PASS', benchmark: { ...authority }, zonePolicyId: 'zone-v1',
    zones: [{ zoneId: 'Z1', status: 'PASS' }], referenceConflictBranchNames: [], referenceUnassignedBranchNames: [],
    actualConflictBranchNames: [], actualUnassignedBranchNames: [] };
}
function topologyReport() {
  return { schema: 'FbxTopologyBenchmarkReport.v1', benchmarkIdentity: { ...authority }, status: 'PASS',
    coverage: { referenceEntityCount: 3, actualEntityCount: 3, referenceRelationshipCount: 1,
      actualRelationshipCount: 1, relationshipLedgerCount: 1, unrepresentedReferenceEntities: [],
      unrepresentedActualEntities: [], unrepresentedReferenceRelationships: [], unrepresentedActualRelationships: [] },
    branches: [{ status: 'PASS' }], relationships: [{ status: 'PASS', matchState: 'EXACT_MATCH' }],
    junctions: [], boundaries: [],
    anomalies: { unresolvedReferences: [], ambiguousReferences: [], reciprocityMismatches: [], duplicateEdges: [],
      selfConnections: [], orphanBranches: [], disconnectedIslands: [], unexpectedCycles: [],
      boundaryDiscontinuities: [], relationshipKindConflicts: [] }, summary: { topologyStatus: 'PASS' } };
}
function componentReport(actualIdentity) {
  return { schema: 'FbxComponentBenchmarkReport.v1', benchmarkIdentity: { ...authority },
    executionIdentity: { benchmarkLoads: { reference: { schema: 'FbxBenchmarkLoaded.v1',
      contentSha256: identity.contentSha256, byteLength: identity.byteLength },
    actual: { schema: 'FbxBenchmarkLoaded.v1', ...actualIdentity } } },
    inventory: { referenceComponentCount: 1, actualComponentCount: 1 }, collisionGroups: [],
    ledger: [
      { side: 'REFERENCE', subjectId: 'component-reference', recordStatus: 'PASS', comparisons: [],
        subjectLocator: { sourceOccurrenceId: 'branch:0/child:0', branchOccurrenceId: 'branch:0' } },
      { side: 'ACTUAL', subjectId: 'component-actual', recordStatus: 'PASS', comparisons: [],
        subjectLocator: { sourceOccurrenceId: 'branch:0/child:0', branchOccurrenceId: 'branch:0' } },
    ], summary: { referenceCoverageCount: 1, actualCoverageCount: 1, referenceCoverageComplete: true,
      actualCoverageComplete: true, componentStatus: 'PASS' } };
}
function supportReport() {
  return { schema: 'FbxSupportBenchmarkReport.v1', identityPolicyId: 'support-v1', toleranceProfileId: 'tol-v1',
    referenceInventory: { supportCount: 1 }, actualInventory: { supportCount: 1 },
    coverage: { referenceLedgerCount: 1, actualLedgerCount: 1, referencesCoveredExactlyOnce: true,
      actualsCoveredExactlyOnce: true, discardedReferenceCount: 0, discardedActualCount: 0, invariantsPassed: true },
    ledgerEntries: [{ ledgerKey: 'match:1', disposition: 'PASS', matchState: 'EXACT_MATCH',
      reference: { sourceOccurrenceId: 'branch:0/child:1', branchOccurrenceId: 'branch:0' },
      actual: { sourceOccurrenceId: 'branch:0/child:1', branchOccurrenceId: 'branch:0' } }],
    summary: { status: 'PASS' } };
}
function inputs() {
  const referenceLoaded = loaded('ref', true), actualLoaded = loaded('act');
  return { integrationBaselineSha: BASE, sourceHeadSha: HEAD, referenceLoaded, actualLoaded,
    benchmarkInventory: inventory(), zoneReport: zoneReport(), topologyReport: topologyReport(),
    componentReport: componentReport(actualLoaded.identity), supportReport: supportReport() };
}

const passingInputs = inputs();
const passing = await buildFbxQualificationReconciliation(passingInputs);
assert.equal(passing.summary.status, 'PASS');
assert.deepEqual(passing.producers.map((item) => item.agent), ['E', 'Z', 'T', 'C', 'S']);
assert.ok(Object.isFrozen(passing));
assert.equal((await buildFbxQualificationReconciliation(inputs())).reconciliationId, passing.reconciliationId);
await validateFbxQualificationReconciliation(passing, passingInputs);

const observedTopology = inputs();
observedTopology.topologyReport.anomalies.unresolvedReferences = [{ blocking: false, code: 'EXTERNAL_REFERENCE' }];
const observedTopologyResult = await buildFbxQualificationReconciliation(observedTopology);
assert.equal(observedTopologyResult.summary.status, 'PASS', 'nonblocking topology observations must not create a false failure');

const zoneBlockedInputs = inputs();
zoneBlockedInputs.zoneReport.status = 'BLOCKED_REFERENCE';
zoneBlockedInputs.zoneReport.referenceUnassignedBranchNames = ['B1'];
assert.equal((await buildFbxQualificationReconciliation(zoneBlockedInputs)).summary.status, 'BLOCKED');

const badZone = inputs();
badZone.zoneReport.benchmark.commit = 'f'.repeat(40);
await assert.rejects(() => buildFbxQualificationReconciliation(badZone), /Z_BENCHMARK_IDENTITY_MISMATCH/);
const badSupport = inputs();
badSupport.supportReport.ledgerEntries[0].reference.sourceOccurrenceId = 'missing';
await assert.rejects(() => buildFbxQualificationReconciliation(badSupport), /REFERENCE_SUPPORT_OCCURRENCE_NOT_FOUND/);
const badComponent = inputs();
badComponent.componentReport.summary.referenceCoverageComplete = false;
await assert.rejects(() => buildFbxQualificationReconciliation(badComponent), /C_COVERAGE_INCOMPLETE/);
const missingInventoryOccurrence = inputs();
missingInventoryOccurrence.benchmarkInventory.counts.totalRecords = 2;
await assert.rejects(() => buildFbxQualificationReconciliation(missingInventoryOccurrence), /E_INVENTORY_COUNTS_INVALID/);
const badTopology = inputs();
badTopology.topologyReport.coverage.unrepresentedActualEntities = ['orphan'];
await assert.rejects(() => buildFbxQualificationReconciliation(badTopology), /T_SUMMARY_STATUS_INCONSISTENT/);
const forgedSupportStatus = inputs();
forgedSupportStatus.supportReport.ledgerEntries[0].disposition = 'FAIL';
await assert.rejects(() => buildFbxQualificationReconciliation(forgedSupportStatus), /S_SUMMARY_STATUS_INCONSISTENT/);
const forgedComponentStatus = inputs();
forgedComponentStatus.componentReport.ledger[0].recordStatus = 'FAIL';
await assert.rejects(() => buildFbxQualificationReconciliation(forgedComponentStatus), /C_SUMMARY_STATUS_INCONSISTENT/);
const forgedOccurrenceIndex = inputs();
forgedOccurrenceIndex.referenceLoaded.occurrenceById['branch:0/child:1'] = {
  ...forgedOccurrenceIndex.referenceLoaded.occurrenceById['branch:0/child:1'],
};
await assert.rejects(() => buildFbxQualificationReconciliation(forgedOccurrenceIndex),
  /REFERENCE_OCCURRENCE_OBJECT_IDENTITY_INVALID/);
const badAncestry = inputs();
badAncestry.supportReport.ledgerEntries[0].reference.branchOccurrenceId = 'branch:9';
await assert.rejects(() => buildFbxQualificationReconciliation(badAncestry), /REFERENCE_BRANCH_ANCESTRY_MISMATCH/);
const badActualLoad = inputs();
badActualLoad.componentReport.executionIdentity.benchmarkLoads.actual.contentSha256 = '0'.repeat(64);
await assert.rejects(() => buildFbxQualificationReconciliation(badActualLoad), /C_ACTUAL_LOAD_IDENTITY_MISMATCH/);
const duplicatedComponentOccurrence = inputs();
duplicatedComponentOccurrence.componentReport.ledger.push({
  ...structuredClone(duplicatedComponentOccurrence.componentReport.ledger[0]),
  subjectId: 'component-reference-duplicate',
});
await assert.rejects(() => buildFbxQualificationReconciliation(duplicatedComponentOccurrence),
  /C_REFERENCE_OCCURRENCE_DUPLICATED/);

console.log('FBX qualification reconciliation tests: PASS');
