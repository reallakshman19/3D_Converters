import assert from 'node:assert/strict';
import { evaluateExactHeadEvidence } from '../../tabs/model-converters/converters/fbx/benchmark-audit/exact-head-evidence.js';

const sha1 = 'a'.repeat(40), sha256 = 'b'.repeat(64);
function evidence() {
  return {
    schema: 'FbxExactHeadEvidence.v1',
    authority: {
      repositoryCommit: sha1, benchmarkCommit: sha1, benchmarkPath: 'Benchmarks/fbx BM/StaggedJsonBMforFBX',
      benchmarkBlobSha: sha1, benchmarkContentSha256: sha256, benchmarkByteLength: 123,
    },
    observed: {
      repositoryCommit: sha1, repositoryTree: 'c'.repeat(40), checkoutState: 'CLEAN', benchmarkCommit: sha1,
      benchmarkPath: 'Benchmarks/fbx BM/StaggedJsonBMforFBX', benchmarkBlobSha: sha1,
      benchmarkContentSha256: sha256, benchmarkByteLength: 123,
    },
    parserIdentitySha256: sha256, wasmSha256: sha256, mappingPolicySha256: sha256,
    zonePolicySha256: sha256, toleranceProfileSha256: sha256, commandManifestSha256: sha256,
    environmentManifestSha256: sha256, testManifestSha256: sha256,
    run1EvidenceIndexSha256: sha256, run2EvidenceIndexSha256: sha256,
    regressionStatus: 'PASS', determinismStatus: 'PASS',
  };
}

const pass = evaluateExactHeadEvidence(evidence());
assert.equal(pass.status, 'PASS');
assert.ok(pass.checks.every((item) => item.pass));
assert.ok(Object.isFrozen(pass));

const wrongHead = evidence();
wrongHead.observed.repositoryCommit = 'd'.repeat(40);
const failedHead = evaluateExactHeadEvidence(wrongHead);
assert.equal(failedHead.status, 'FAIL');
assert.equal(failedHead.checks.find((item) => item.checkId === 'repository commit').pass, false);

const nondeterministic = evidence();
nondeterministic.run2EvidenceIndexSha256 = 'e'.repeat(64);
assert.equal(evaluateExactHeadEvidence(nondeterministic).status, 'FAIL');

const regressionFailure = evidence();
regressionFailure.regressionStatus = 'FAIL';
assert.equal(evaluateExactHeadEvidence(regressionFailure).status, 'FAIL');

const openShape = evidence();
openShape.unexpected = true;
assert.throws(() => evaluateExactHeadEvidence(openShape), /BLOCKED_AUDIT_CONTRACT/);

console.log('test-benchmark-exact-head-evidence: PASS');
