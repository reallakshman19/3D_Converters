import assert from 'node:assert/strict';
import { reconcileCoverage } from '../../tabs/model-converters/converters/fbx/benchmark-audit/coverage-reconciliation.js';
import {
  adaptComponentBenchmarkReport,
  adaptSupportBenchmarkReport,
  adaptTopologyBenchmarkReport,
  adaptZoneMembershipIndex,
} from '../../tabs/model-converters/converters/fbx/benchmark-audit/integrated-adapters.js';
import { buildFbxBenchmarkZoneManifest } from '../../tabs/model-converters/converters/fbx/benchmark-zone-contract.js';
import { buildFbxZoneMembershipIndex } from '../../tabs/model-converters/converters/fbx/benchmark-zone-membership.js';
import { buildFbxTopologyBenchmarkReport } from '../../tabs/model-converters/converters/fbx/benchmark/topology-benchmark.js';
import {
  branch, componentPolicy, fitting, pipe, qualify, toleranceProfile,
} from './component-benchmark-fixtures.mjs';
import {
  benchmarkFixture, explicitHostResolver, identityPolicy, loadedBenchmarkFixture,
  normalizers, propertyRules, toleranceProfile as supportToleranceProfile,
} from './support-benchmark-fixtures.mjs';
import { validateSupportBenchmark } from '../../tabs/model-converters/converters/fbx/benchmark/support-validator.js';

const zoneManifest = buildFbxBenchmarkZoneManifest({
  schema: 'FbxBenchmarkZoneManifest.v1',
  benchmark: { commit: 'a'.repeat(40), path: 'benchmark.json', blobSha: 'b'.repeat(40) },
  zonePolicyId: 'audit-zone-policy', sharedBoundaryPolicy: 'explicit-only',
  zones: [
    { zoneId: 'Z1', displayName: 'Zone 1', ownerSites: ['SITE-1'], owners: [], branches: [],
      sharedBoundaryBranches: ['BOUNDARY'] },
    { zoneId: 'Z2', displayName: 'Zone 2', ownerSites: ['SITE-2'], owners: [], branches: [],
      sharedBoundaryBranches: ['BOUNDARY'] },
  ],
  exclusions: [],
});
const zoneBranch = (name, ownerSite) => ({
  name, type: 'BRANCH', attributes: { OWNER: '', OWNER_SITE: ownerSite }, children: [],
});
const zoneIndex = buildFbxZoneMembershipIndex(zoneManifest, [
  zoneBranch('ASSIGNED', 'SITE-1'), zoneBranch('BOUNDARY', 'SITE-1'),
]);
const zoneInput = adaptZoneMembershipIndex(zoneIndex);
const zoneAudit = reconcileCoverage(zoneInput);
assert.equal(zoneAudit.status, 'PASS_WITH_OBSERVATIONS');
assert.equal(zoneAudit.referencePopulationCount, zoneIndex.records.length);
assert.equal(zoneAudit.terminalRecordCount, zoneIndex.records.length);
const blockedIndex = buildFbxZoneMembershipIndex({ ...zoneManifest,
  exclusions: [{ branchName: 'EXCLUDED', reason: 'not qualified' }] }, [zoneBranch('EXCLUDED', '')]);
assert.equal(reconcileCoverage(adaptZoneMembershipIndex(blockedIndex)).status, 'BLOCKED');

const componentReference = branch('/LINE/B1', [
  fitting('FLAN', '=F1'), pipe('PIPE AUTO /LINE/B1 1'),
]);
const componentReport = await qualify({
  reference: componentReference,
  actual: structuredClone(componentReference),
  identityPolicy: componentPolicy(),
  toleranceProfile,
});
const componentInput = adaptComponentBenchmarkReport(componentReport);
const componentAudit = reconcileCoverage(componentInput);
assert.equal(componentAudit.status, 'PASS');
assert.equal(componentAudit.referencePopulationCount, componentReport.inventory.referenceComponentCount);
assert.equal(componentAudit.actualPopulationCount, componentReport.inventory.actualComponentCount);
assert.equal(componentAudit.unreconciledRecords.length, 0);

const supportBranches = benchmarkFixture();
const supportReference = loadedBenchmarkFixture(supportBranches);
const supportActual = loadedBenchmarkFixture(structuredClone(supportBranches));
const supportReport = await validateSupportBenchmark({
  reference: supportReference, actual: supportActual, identityPolicy: identityPolicy(),
  toleranceProfile: supportToleranceProfile, propertyRules, normalizers,
  hostResolver: explicitHostResolver, hostRequired: true,
});
const supportAudit = reconcileCoverage(adaptSupportBenchmarkReport(supportReport));
assert.equal(supportAudit.status, 'PASS');
assert.equal(supportAudit.terminalRecordCount, supportReport.ledgerEntries.length);
assert.equal(supportAudit.unreconciledRecords.length, 0);

const topologyGraph = {
  schema: 'FbxBenchmarkTopologyGraph.v1',
  entities: [
    { entityId: 'B1', kind: 'BRANCH', sourcePath: '$.B1', zoneId: 'Z1', flowParticipant: false,
      routeSequence: ['C1'], junctionKind: null, expectedFlowDegree: null, ports: [] },
    { entityId: 'C1', kind: 'COMPONENT', sourcePath: '$.C1', zoneId: 'Z1', flowParticipant: true,
      routeSequence: [], junctionKind: null, expectedFlowDegree: null, ports: [] },
  ],
  relationships: [{ relationshipId: 'OWN-B1-C1', kind: 'BRANCH_OWNERSHIP', sourceEntityId: 'B1',
    targetEntityId: 'C1', directed: true, sourcePortRole: null, targetPortRole: null,
    authorityField: 'BRANCH_OWNERSHIP', rawReference: null, sourcePath: '$.relationships.0', endpointResidual: null }],
};
const topologyReport = buildFbxTopologyBenchmarkReport({
  benchmarkIdentity: { benchmarkId: 'audit' }, executionIdentity: { testedRepositorySha: 'a'.repeat(40) },
  referenceGraph: topologyGraph, actualGraph: structuredClone(topologyGraph),
  policy: { schema: 'FbxTopologyBenchmarkPolicy.v1', policyId: 'audit-topology',
    branchSequenceAuthority: 'AUTHORITATIVE', reciprocalKinds: [], approvedOneWayReciprocityKeys: [],
    cyclePolicy: { mode: 'FAIL_ALL', allowedCycleClosingRelationshipIds: [] } },
  toleranceProfile: { schema: 'FbxBenchmarkToleranceProfile.v1', profileId: 'audit-tolerance', endpointTolerance: 0.5 },
});
for (const [kind, rows] of [
  ['TOPOLOGY_BRANCH', topologyReport.branches],
  ['TOPOLOGY_RELATIONSHIP', topologyReport.relationships],
  ['TOPOLOGY_JUNCTION', topologyReport.junctions],
  ['TOPOLOGY_BOUNDARY', topologyReport.boundaries],
]) {
  const result = reconcileCoverage(adaptTopologyBenchmarkReport(topologyReport, kind));
  assert.equal(result.status, 'PASS');
  assert.equal(result.terminalRecordCount, rows.length);
  assert.equal(result.unreconciledRecords.length, 0);
}
assert.notEqual(
  adaptTopologyBenchmarkReport(topologyReport, 'TOPOLOGY_BRANCH').populationKind,
  adaptTopologyBenchmarkReport(topologyReport, 'TOPOLOGY_RELATIONSHIP').populationKind,
);
console.log('test-benchmark-audit-integrated-ledgers: PASS');
