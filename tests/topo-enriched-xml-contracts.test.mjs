import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { HASH_POLICIES, canonicalSemanticJson, computeSemanticHash, freezeContract, validateContract } from '../contracts/topo-enriched-xml/contract-core.js';

const V = (status = 'PASS') => ({ status, blockers: [], reviewItems: [], warnings: [] });
const chain = { projectId: 'P', zoneId: 'Z' };
const fixtures = {
  'TopoSourceInventory.v1': { schema: 'TopoSourceInventory.v1', ...chain, coordinateFrameId: 'F', sourceIdentity: { sourceHash: 'sha256:x' }, branches: [{ sourceBranch: '/L/B1' }], entities: [{ sourceEntityId: 'SE-1' }], ports: [{ sourcePortId: 'SP-1', sourceEntityId: 'SE-1' }], validation: V() },
  'TopoLogicalGraph.v1': { schema: 'TopoLogicalGraph.v1', ...chain, coordinateFrameId: 'F', sourceInventoryHash: 'sha256:a', nodes: [{ logicalNodeId: 'LN-1' }, { logicalNodeId: 'LN-2' }], edges: [{ logicalEdgeId: 'LE-1', fromLogicalNodeId: 'LN-1', toLogicalNodeId: 'LN-2' }], junctions: [], boundaries: [], supports: [], validation: V() },
  'TopoNodeTopologyNormalization.v1': { schema: 'TopoNodeTopologyNormalization.v1', ...chain, sourceInventoryHash: 'sha256:a', inputLogicalTopologyHash: 'sha256:b', outputLogicalTopologyHash: 'sha256:c', rawPortMappings: [{ sourcePortId: 'SP-1', logicalNodeId: 'LN-1' }], actions: [{ actionId: 'A-1', disposition: 'PRESERVE' }], validation: V() },
  'TopoSequencePlan.v1': { schema: 'TopoSequencePlan.v1', ...chain, sourceInventoryHash: 'sha256:a', logicalTopologyHash: 'sha256:b', branches: [{ sourceBranch: '/L/B1', canonicalMainLine: '/L' }], components: [{ sourceEntityId: 'SE-1', sourceBranch: '/L/B1' }], validation: V() },
  'TopoNodeHistoryMatchResult.v1': { schema: 'TopoNodeHistoryMatchResult.v1', ...chain, mainLineKey: '/L', coordinateFrameId: 'F', logicalTopologyHash: 'sha256:b', baseRegistrySnapshotHash: 'sha256:r', matches: [{ logicalNodeId: 'LN-1', historyNodeId: 'HN-1' }], newNodes: [], ambiguous: [], conflicts: [], reactivated: [], retirementCandidates: [], validation: V() },
  'TopoNodeAllocationResult.v1': { schema: 'TopoNodeAllocationResult.v1', ...chain, baseRegistrySnapshotHash: 'sha256:r', historyMatchResultHash: 'sha256:h', leases: [{ leaseId: 'L-1', mainLineKey: '/L', start: 500, end: 590, step: 10 }], allocations: [{ logicalNodeId: 'LN-1', historyNodeId: 'HN-1', engineeringNodeNumber: 500 }], retirements: [], reactivations: [], validation: V() },
  'TopoNodePlan.v1': { schema: 'TopoNodePlan.v1', ...chain, sourceInventoryHash: 'sha256:a', logicalTopologyHash: 'sha256:b', sequencePlanHash: 'sha256:c', baseRegistrySnapshotHash: 'sha256:r', configHash: 'sha256:g', logicalNodes: [{ logicalNodeId: 'LN-1', historyNodeId: 'HN-1' }], emittedOccurrences: [{ occurrenceId: 'WO-1', logicalNodeId: 'LN-1', engineeringNodeNumber: 500 }], reservedOccurrences: [{ occurrenceId: 'WO-2', logicalNodeId: 'LN-1', engineeringNodeNumber: 510 }], rawPortMappings: [{ sourcePortId: 'SP-1', logicalNodeId: 'LN-1' }], componentProjection: [{ componentProjectionId: 'CP-1', sourceEntityId: 'SE-1', emittedOccurrenceIds: ['WO-1'], reservedOccurrenceIds: ['WO-2'] }], validation: V(), nodePlanHash: 'sha256:n' },
  'TopoTopologyIndex.v1': { schema: 'TopoTopologyIndex.v1', ...chain, sourceInventoryHash: 'sha256:a', logicalTopologyHash: 'sha256:b', nodePlanHash: 'sha256:n', sourceToLogical: [{ sourceIdentity: 'SE-1', logicalNodeIds: ['LN-1'] }], logicalToSource: [{ logicalNodeId: 'LN-1', sourceIdentities: ['SE-1'] }], logicalToOccurrences: [{ logicalNodeId: 'LN-1', occurrenceIds: ['WO-1'] }], occurrenceToLogical: [{ occurrenceId: 'WO-1', logicalNodeId: 'LN-1' }], validation: V() },
  'TopoNodeRegistryPatch.v1': { schema: 'TopoNodeRegistryPatch.v1', ...chain, baseRegistryCommit: 'abc', baseRegistrySnapshotHash: 'sha256:r', coverage: { scope: 'PARTIAL_LINE', authoritativeForRetirement: false }, preconditions: [], operations: [{ operationId: 'OP-1', type: 'UPSERT_NODE' }], validation: V(), proposedRegistryHash: 'sha256:p' },
  'TopoPreprocessAudit.v1': { schema: 'TopoPreprocessAudit.v1', runId: 'RUN-1', ...chain, sourceHash: 'sha256:s', configHash: 'sha256:g', baseRegistrySnapshotHash: 'sha256:r', evaluatedAt: '2026-07-19T00:00:00Z', summary: {}, actions: [{ actionId: 'A-1', type: 'PRESERVE' }], validation: V() },
  'TopoEnrichedXmlValidationReport.v1': { schema: 'TopoEnrichedXmlValidationReport.v1', ...chain, operatingMode: 'SHADOW', sourceInventoryHash: 'sha256:a', logicalTopologyHash: 'sha256:b', sequencePlanHash: 'sha256:c', nodePlanHash: 'sha256:n', gates: {}, issues: [], validation: V() },
  'PsiWriterOccurrencePlan.v1': { schema: 'PsiWriterOccurrencePlan.v1', ...chain, sourceInventoryHash: 'sha256:a', logicalTopologyHash: 'sha256:b', sequencePlanHash: 'sha256:c', occurrences: [{ occurrenceId: 'WO-1', sourceEntityId: 'SE-1', sourceBranch: '/L/B1', canonicalMainLine: '/L', componentProjectionId: 'CP-1', projectionRole: 'ARRIVE', endpoint: 1, psiComponentType: 'PIPE', coordinateRole: 'APOS', disposition: 'EMITTED' }], componentProjection: [{ componentProjectionId: 'CP-1', occurrenceIds: ['WO-1'] }], validation: V(), occurrencePlanHash: 'sha256:o' },
  'PsiWriterOccurrence.v1': { schema: 'PsiWriterOccurrence.v1', occurrenceId: 'WO-1', sourceEntityId: 'SE-1', sourceBranch: '/L/B1', canonicalMainLine: '/L', componentProjectionId: 'CP-1', projectionRole: 'ARRIVE', endpoint: 1, psiComponentType: 'PIPE', coordinateRole: 'APOS', disposition: 'EMITTED' },
  'PsiSerializationPlan.v1': { schema: 'PsiSerializationPlan.v1', ...chain, nodePlanHash: 'sha256:n', occurrencePlanHash: 'sha256:o', profile: 'STRICT_PSI', branches: [{ sourceBranch: '/L/B1' }], occurrences: [{ occurrenceId: 'WO-1', logicalNodeId: 'LN-1', engineeringNodeNumber: 500 }], validation: V(), serializationPlanHash: 'sha256:z' },
  'PsiWriterParityReport.v2': { schema: 'PsiWriterParityReport.v2', ...chain, nodePlanHash: 'sha256:n', canonical: {}, sequential: {}, differences: [], gates: { numberingEquivalent: true, occurrenceCoverage: 100, writerSideAllocations: 0 }, validation: V() },
};
const clone = structuredClone;
const E = (name, value) => validateContract(name, value);
const has = (errors, token) => errors.some((message) => message.includes(token));
const bundle = JSON.parse(readFileSync(new URL('../schemas/topo-enriched-xml/topo-enriched-xml-contracts.schema.json', import.meta.url), 'utf8'));

test('all required contracts have executable and schema-valid minimal artifacts', () => {
  assert.equal(Object.keys(fixtures).length, 15);
  for (const [name, artifact] of Object.entries(fixtures)) {
    assert.deepEqual(E(name, artifact), [], name);
    const schema = bundle.$defs[name];
    assert(schema && schema.properties.schema.const === name);
    for (const field of schema.required) assert(field in artifact, `${name}.${field}`);
    const invalid = clone(artifact); const field = schema.required.find((item) => item !== 'schema'); delete invalid[field];
    assert(has(E(name, invalid), `${field} is required`));
    const frozen = freezeContract(name, artifact); assert(Object.isFrozen(frozen));
    for (const child of Object.values(frozen)) if (child && typeof child === 'object') assert(Object.isFrozen(child));
  }
});

test('identity, mapping, explicit numbering and status invariants block invalid artifacts', () => {
  const graph = clone(fixtures['TopoLogicalGraph.v1']); graph.nodes.push({ logicalNodeId: 'LN-1' });
  assert(has(E(graph.schema, graph), 'duplicate logicalNodeId'));
  const plan = clone(fixtures['TopoNodePlan.v1']); plan.reservedOccurrences[0].occurrenceId = 'WO-1';
  assert(has(E(plan.schema, plan), 'duplicate occurrenceId'));
  plan.reservedOccurrences[0].occurrenceId = 'WO-2'; plan.emittedOccurrences[0].logicalNodeId = 'LN-X';
  assert(has(E(plan.schema, plan), 'no logical-node mapping'));
  plan.emittedOccurrences[0].logicalNodeId = 'LN-1'; plan.reservedOccurrences[0].numberOffset = 10;
  assert(has(E(plan.schema, plan), 'prohibits relative'));
  const occurrence = clone(fixtures['PsiWriterOccurrence.v1']); occurrence.engineeringNodeNumber = 500;
  assert(has(E(occurrence.schema, occurrence), 'must not contain an allocated'));
  const review = clone(fixtures['TopoSourceInventory.v1']); review.validation.status = 'REVIEW_REQUIRED';
  assert(has(E(review.schema, review), 'requires review evidence'));
  review.validation.reviewItems.push({ code: 'R-1' }); assert.deepEqual(E(review.schema, review), []);
  const blocked = clone(fixtures['TopoSourceInventory.v1']); blocked.validation.status = 'BLOCKED';
  assert(has(E(blocked.schema, blocked), 'requires at least one blocker'));
});

test('zone uniqueness, partial retirement and parity hard gates are frozen', () => {
  const allocation = clone(fixtures['TopoNodeAllocationResult.v1']); allocation.allocations.push({ logicalNodeId: 'LN-2', historyNodeId: 'HN-2', engineeringNodeNumber: 500 });
  assert(has(E(allocation.schema, allocation), 'multiple zone owners'));
  const shared = clone(fixtures['TopoNodePlan.v1']); shared.reservedOccurrences[0].engineeringNodeNumber = 500;
  assert.deepEqual(E(shared.schema, shared), []);
  shared.logicalNodes.push({ logicalNodeId: 'LN-2' }); shared.reservedOccurrences[0].logicalNodeId = 'LN-2';
  assert(has(E(shared.schema, shared), 'maps to multiple logical nodes'));
  const patch = clone(fixtures['TopoNodeRegistryPatch.v1']); patch.operations.push({ operationId: 'OP-2', type: 'RETIRE_NODE' });
  assert(has(E(patch.schema, patch), 'cannot retire'));
  patch.coverage = { scope: 'FULL_LINE', authoritativeForRetirement: true }; assert.deepEqual(E(patch.schema, patch), []);
  for (const [field, value] of [['numberingEquivalent', false], ['occurrenceCoverage', 99], ['writerSideAllocations', 1]]) {
    const parity = clone(fixtures['PsiWriterParityReport.v2']); parity.gates[field] = value; assert(has(E(parity.schema, parity), field));
  }
});

test('hash policies are reproducible and exclude audit metadata', async () => {
  assert.equal(Object.keys(HASH_POLICIES).length, 10);
  const left = clone(fixtures['TopoNodePlan.v1']);
  const right = Object.fromEntries(Object.entries(left).reverse()); right.evaluatedAt = '2099-01-01T00:00:00Z';
  assert.equal(canonicalSemanticJson(left), canonicalSemanticJson(right));
  assert.equal(await computeSemanticHash(left, 'nodePlanHash'), await computeSemanticHash(right, 'nodePlanHash'));
  right.logicalNodes = clone(right.logicalNodes); right.logicalNodes[0].historyNodeId = 'HN-CHANGED';
  assert.notEqual(await computeSemanticHash(left, 'nodePlanHash'), await computeSemanticHash(right, 'nodePlanHash'));
});

test('operating mode ENFORCED cannot weaken review status', () => {
  const report = clone(fixtures['TopoEnrichedXmlValidationReport.v1']); report.operatingMode = 'ENFORCED'; report.validation = V('REVIEW_REQUIRED'); report.validation.reviewItems.push({ code: 'R-1' });
  assert(has(E(report.schema, report), 'ENFORCED output requires validation PASS'));
  report.operatingMode = 'FALLBACK'; assert(has(E(report.schema, report), 'operatingMode'));
});
