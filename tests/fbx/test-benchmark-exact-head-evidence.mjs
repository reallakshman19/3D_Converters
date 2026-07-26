import assert from 'node:assert/strict';
import {
  evaluateExactHeadEvidence, FBX_EXACT_HEAD_IDENTITY_FIELDS,
} from '../../tabs/model-converters/converters/fbx/benchmark-audit/exact-head-evidence.js';

const sha1 = (char) => char.repeat(40);
const sha256 = (char) => char.repeat(64);

function identity() {
  return {
    repositoryCommit: sha1('a'),
    repositoryTree: sha1('b'),
    checkoutState: 'CLEAN',
    benchmarkCommit: sha1('c'),
    benchmarkPath: 'Benchmarks/fbx BM/StaggedJsonBMforFBX',
    benchmarkBlobSha: sha1('d'),
    benchmarkContentSha256: sha256('e'),
    benchmarkByteLength: 123,
    parserIdentitySha256: sha256('1'),
    wasmSha256: sha256('2'),
    benchmarkEvidenceSchemaSha256: sha256('3'),
    zonePolicySha256: sha256('4'),
    zoneIndexSchemaSha256: sha256('5'),
    topologyPolicySha256: sha256('6'),
    topologyReportSchemaSha256: sha256('7'),
    componentPolicySha256: sha256('8'),
    componentReportSchemaSha256: sha256('9'),
    supportPolicySha256: sha256('a'),
    supportReportSchemaSha256: sha256('b'),
    toleranceProfileSha256: sha256('c'),
    mappingPolicySha256: sha256('d'),
    commandManifestSha256: sha256('e'),
    environmentManifestSha256: sha256('f'),
    testManifestSha256: sha256('0'),
    run1EvidenceIndexSha256: sha256('1'),
    run2EvidenceIndexSha256: sha256('1'),
  };
}

function evidence() {
  const authority = identity();
  return {
    schema: 'FbxExactHeadEvidence.v2',
    authority,
    observed: structuredClone(authority),
    regressionStatus: 'PASS',
    determinismStatus: 'PASS',
  };
}

const pass = evaluateExactHeadEvidence(evidence());
assert.equal(pass.status, 'PASS');
assert.deepEqual(pass.failedCheckIds, []);
assert.ok(Object.isFrozen(pass));

for (const field of FBX_EXACT_HEAD_IDENTITY_FIELDS) {
  const mismatch = evidence();
  if (field === 'benchmarkByteLength') mismatch.observed[field] += 1;
  else if (field === 'benchmarkPath') mismatch.observed[field] += '.wrong';
  else if (field === 'checkoutState') mismatch.observed[field] = 'DIRTY';
  else if (mismatch.observed[field].length === 40) mismatch.observed[field] = sha1('f');
  else mismatch.observed[field] = sha256(mismatch.observed[field][0] === 'f' ? 'e' : 'f');
  const result = evaluateExactHeadEvidence(mismatch);
  assert.equal(result.status, 'FAIL', `${field} mismatch must fail`);
  assert.ok(result.failedCheckIds.includes(field), `${field} mismatch must identify its field`);
}

const dirty = evidence();
dirty.authority.checkoutState = 'DIRTY';
dirty.observed.checkoutState = 'DIRTY';
const dirtyResult = evaluateExactHeadEvidence(dirty);
assert.equal(dirtyResult.status, 'FAIL');
assert.ok(dirtyResult.failedCheckIds.includes('checkoutState:CLEAN'));

const repeatMismatch = evidence();
repeatMismatch.observed.run2EvidenceIndexSha256 = sha256('2');
repeatMismatch.authority.run2EvidenceIndexSha256 = sha256('2');
const repeatResult = evaluateExactHeadEvidence(repeatMismatch);
assert.equal(repeatResult.status, 'FAIL');
assert.ok(repeatResult.failedCheckIds.includes('repeatEvidenceIndexSha256'));

const regressionFailure = evidence();
regressionFailure.regressionStatus = 'FAIL';
assert.equal(evaluateExactHeadEvidence(regressionFailure).status, 'FAIL');

const openShape = evidence();
openShape.unexpected = true;
assert.throws(() => evaluateExactHeadEvidence(openShape), /BLOCKED_AUDIT_CONTRACT/);

console.log('test-benchmark-exact-head-evidence: PASS');
