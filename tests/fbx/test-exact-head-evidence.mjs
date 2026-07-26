import assert from 'node:assert/strict';
import {
  buildFbxExactHeadEvidence,
  REQUIRED_EXACT_HEAD_CHECK_IDS,
  validateFbxExactHeadEvidence,
} from '../../tabs/model-converters/converters/fbx/benchmark/exact-head-evidence.js';

const HEAD = 'b'.repeat(40);
const BASE = 'a'.repeat(40);
const benchmark = Object.freeze({
  path: 'Benchmarks/fbx BM/StaggedJsonBMforFBX',
  commitSha: 'c'.repeat(40),
  blobSha: 'd'.repeat(40),
  contentSha256: 'e'.repeat(64),
  byteLength: 40705,
});
const benchmarkIdentity = Object.freeze({
  benchmarkId: 'StaggedJsonBMforFBX',
  repository: 'reallaksh19/3D_Converters',
  benchmarkCommit: benchmark.commitSha,
  benchmarkPath: benchmark.path,
  benchmarkBlobSha: benchmark.blobSha,
  contentSha256: benchmark.contentSha256,
  byteLength: benchmark.byteLength,
});
function reconciliation(status = 'PASS') {
  return { schema: 'FbxQualificationReconciliation.v1', reconciliationId: `FBXQUAL-${'1'.repeat(32)}`,
    integrationBaselineSha: BASE, sourceHeadSha: HEAD, benchmarkIdentity: { ...benchmarkIdentity }, summary: { status } };
}
function checks(status = 'PASS') {
  return [...REQUIRED_EXACT_HEAD_CHECK_IDS].reverse().map((checkId) => ({
    checkId, status,
    observedHeadSha: status === 'PASS' || status === 'FAIL' ? HEAD : null,
    evidenceRefs: status === 'PASS' || status === 'FAIL' ? [`artifact:${checkId}`] : [],
  }));
}
function evidenceInput(overrides = {}) {
  return { repository: benchmarkIdentity.repository, integrationBaselineSha: BASE, sourceHeadSha: HEAD,
    benchmark: { ...benchmark }, reconciliation: reconciliation(), checks: checks(), ...overrides };
}

const passing = await buildFbxExactHeadEvidence(evidenceInput());
assert.equal(passing.schema, 'FbxExactHeadEvidence.v1');
assert.equal(passing.summary.status, 'PASS');
assert.deepEqual(passing.checks.map((check) => check.checkId), REQUIRED_EXACT_HEAD_CHECK_IDS);
assert.deepEqual(passing.reconciliation.benchmarkIdentity, benchmarkIdentity);
assert.ok(Object.isFrozen(passing));
await validateFbxExactHeadEvidence(passing);

const blockedChecks = checks();
const hosted = blockedChecks.find((check) => check.checkId === 'HOSTED_EXACT_HEAD_CI');
hosted.status = 'NOT_EXECUTED';
hosted.observedHeadSha = null;
hosted.evidenceRefs = [];
const blocked = await buildFbxExactHeadEvidence(evidenceInput({ checks: blockedChecks }));
assert.equal(blocked.summary.status, 'BLOCKED');
assert.deepEqual(blocked.summary.blockingCheckIds, ['HOSTED_EXACT_HEAD_CI']);

const observed = await buildFbxExactHeadEvidence(evidenceInput({ reconciliation: reconciliation('PASS_WITH_OBSERVATIONS') }));
assert.equal(observed.summary.status, 'PASS_WITH_OBSERVATIONS');
const failedChecks = checks();
failedChecks[0].status = 'FAIL';
const failed = await buildFbxExactHeadEvidence(evidenceInput({ checks: failedChecks }));
assert.equal(failed.summary.status, 'FAIL');

const staleChecks = checks();
staleChecks[0].observedHeadSha = 'f'.repeat(40);
await assert.rejects(() => buildFbxExactHeadEvidence(evidenceInput({ checks: staleChecks })),
  /EXACT_HEAD_CHECK_NOT_BOUND_TO_SOURCE_HEAD/);
const unsupportedClaim = checks('BLOCKED');
unsupportedClaim[0].evidenceRefs = ['artifact:forged'];
await assert.rejects(() => buildFbxExactHeadEvidence(evidenceInput({ checks: unsupportedClaim })),
  /UNEXECUTED_OR_BLOCKED_CHECK_MUST_NOT_CLAIM_EVIDENCE/);
await assert.rejects(() => buildFbxExactHeadEvidence(evidenceInput({ checks: checks().slice(1) })),
  /EXACT_HEAD_REQUIRED_CHECK_SET_MISMATCH/);
await assert.rejects(() => buildFbxExactHeadEvidence(evidenceInput({
  reconciliation: { ...reconciliation(), sourceHeadSha: 'f'.repeat(40) },
})), /EXACT_HEAD_RECONCILIATION_HEAD_BINDING_MISMATCH/);
await assert.rejects(() => buildFbxExactHeadEvidence(evidenceInput({
  reconciliation: { ...reconciliation(), benchmarkIdentity: { ...benchmarkIdentity, benchmarkBlobSha: '0'.repeat(40) } },
})), /EXACT_HEAD_RECONCILIATION_BENCHMARK_MISMATCH/);
await assert.rejects(() => buildFbxExactHeadEvidence(evidenceInput({ repository: 'other/repository' })),
  /EXACT_HEAD_RECONCILIATION_BENCHMARK_MISMATCH/);
const forged = structuredClone(passing);
forged.evidenceId = `FBXHEAD-${'0'.repeat(32)}`;
await assert.rejects(() => validateFbxExactHeadEvidence(forged), /EXACT_HEAD_EVIDENCE_ID_MISMATCH/);

console.log('FBX exact-head evidence tests: PASS');
