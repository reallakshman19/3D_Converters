import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  buildFbxBenchmarkEvidenceIndex,
  validateFbxBenchmarkEvidenceIndex,
} from '../../tabs/model-converters/converters/fbx/benchmark/evidence-index.js';

const contract = JSON.parse(await readFile(new URL(
  '../../contracts/fbx/fbx-benchmark-evidence-index.v1.schema.json', import.meta.url), 'utf8'));
assert.equal(contract.$id, 'FbxBenchmarkEvidenceIndex.v1');
assert.equal(contract.additionalProperties, false);
assert.deepEqual(contract.properties.canonicalOrdering.prefixItems.map((item) => item.const),
  ['artifactId', 'artifactType', 'relativePath']);

const benchmarkIdentity = {
  benchmarkId: 'StaggedJsonBMforFBX',
  benchmarkCommit: 'ecd841cd41cc7a8df1764cec502e0873f578a5dc',
  contentSha256: 'a'.repeat(64),
};
const executionIdentity = {
  repositoryCommit: '9bb79e210d292f5fa582686cc007e33c6ef461bd',
  runId: 'local-focused-test',
  executionMode: 'DIRECT',
};
const artifacts = [
  {
    artifactId: 'zone-report', artifactType: 'ZONE_REPORT', relativePath: 'zone/report.json',
    qualificationStatus: 'PASS', value: { schema: 'FbxZoneBenchmarkReport.v1', zones: ['Z2', 'Z1'] },
  },
  {
    artifactId: 'inventory', artifactType: 'INVENTORY', relativePath: 'inventory/report.json',
    qualificationStatus: 'PASS_WITH_OBSERVATIONS', value: {
      schema: 'FbxBenchmarkInventory.v1', rawOuterTypes: [], rawAttributeTypes: [],
      rawAttributeRawTypes: [], supportAttributeObservations: {}, ownerSiteObservations: [],
      duplicateIdentities: [], counts: { totalRecords: 2 },
    },
  },
];

const first = await buildFbxBenchmarkEvidenceIndex({ benchmarkIdentity, executionIdentity, artifacts });
const second = await buildFbxBenchmarkEvidenceIndex({
  benchmarkIdentity: { ...benchmarkIdentity }, executionIdentity: { ...executionIdentity },
  artifacts: [...artifacts].reverse(),
});
assert.deepEqual(first, second);
assert.equal(first.artifacts[0].artifactId, 'inventory');
assert.equal(first.countsByStatus.PASS, 1);
assert.equal(first.countsByStatus.PASS_WITH_OBSERVATIONS, 1);
assert.equal(first.countsByStatus.FAIL, 0);
assert.equal(Object.isFrozen(first), true);
assert.equal(Object.isFrozen(first.artifacts), true);
assert.equal(Object.isFrozen(first.artifacts[0]), true);
assert.equal(await validateFbxBenchmarkEvidenceIndex(first), first);

const changed = await buildFbxBenchmarkEvidenceIndex({
  benchmarkIdentity, executionIdentity, artifacts: artifacts.map((artifact) => artifact.artifactId === 'zone-report'
    ? { ...artifact, value: { ...artifact.value, zones: ['Z1', 'Z2'] } } : artifact),
});
assert.notEqual(changed.rootEvidenceSha256, first.rootEvidenceSha256);
assert.notEqual(changed.artifacts[1].contentSha256, first.artifacts[1].contentSha256);

await assert.rejects(buildFbxBenchmarkEvidenceIndex({
  benchmarkIdentity, executionIdentity, artifacts: [artifacts[0], { ...artifacts[1], artifactId: 'zone-report' }],
}), /DUPLICATE_EVIDENCE_ARTIFACTID/);
await assert.rejects(buildFbxBenchmarkEvidenceIndex({
  benchmarkIdentity, executionIdentity, artifacts: [artifacts[0], { ...artifacts[1], relativePath: 'zone\/report.json' }],
}), /DUPLICATE_EVIDENCE_RELATIVEPATH/);
await assert.rejects(buildFbxBenchmarkEvidenceIndex({
  benchmarkIdentity, executionIdentity, artifacts: [{ ...artifacts[0], relativePath: '../escape.json' }],
}), /traversal/);
await assert.rejects(buildFbxBenchmarkEvidenceIndex({
  benchmarkIdentity, executionIdentity, artifacts: [{ ...artifacts[0], extra: true }],
}), /unsupported field extra/);

const forgedTopLevel = structuredClone(first);
forgedTopLevel.extra = true;
await assert.rejects(validateFbxBenchmarkEvidenceIndex(forgedTopLevel), /unsupported field extra/);
const forgedEntry = structuredClone(first);
forgedEntry.artifacts[0].extra = true;
await assert.rejects(validateFbxBenchmarkEvidenceIndex(forgedEntry), /unsupported field extra/);

const forgedRoot = structuredClone(first);
forgedRoot.rootEvidenceSha256 = '0'.repeat(64);
await assert.rejects(validateFbxBenchmarkEvidenceIndex(forgedRoot), /EVIDENCE_ROOT_SHA256_MISMATCH/);
const forgedOrder = structuredClone(first);
forgedOrder.artifacts.reverse();
await assert.rejects(validateFbxBenchmarkEvidenceIndex(forgedOrder), /NON_CANONICAL_EVIDENCE_ORDER/);
const forgedCount = structuredClone(first);
forgedCount.countsByStatus.PASS = 2;
await assert.rejects(validateFbxBenchmarkEvidenceIndex(forgedCount), /EVIDENCE_STATUS_COUNT_MISMATCH/);

console.log('test-benchmark-evidence-index: PASS');
