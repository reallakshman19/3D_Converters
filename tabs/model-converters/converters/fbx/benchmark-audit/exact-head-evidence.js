import {
  deepFreeze, fail, requireClosedObject, requirePositiveInteger, requireSha1, requireSha256, requireText,
} from './audit-utils.js';

const ROOT_KEYS = [
  'schema', 'authority', 'observed', 'parserIdentitySha256', 'wasmSha256',
  'mappingPolicySha256', 'zonePolicySha256', 'toleranceProfileSha256',
  'commandManifestSha256', 'environmentManifestSha256', 'testManifestSha256',
  'run1EvidenceIndexSha256', 'run2EvidenceIndexSha256', 'regressionStatus', 'determinismStatus',
];
const AUTHORITY_KEYS = [
  'repositoryCommit', 'benchmarkCommit', 'benchmarkPath', 'benchmarkBlobSha',
  'benchmarkContentSha256', 'benchmarkByteLength',
];
const OBSERVED_KEYS = [
  'repositoryCommit', 'repositoryTree', 'checkoutState', 'benchmarkCommit', 'benchmarkPath',
  'benchmarkBlobSha', 'benchmarkContentSha256', 'benchmarkByteLength',
];

function authority(value) {
  const item = requireClosedObject(value, 'authority', AUTHORITY_KEYS);
  return {
    repositoryCommit: requireSha1(item.repositoryCommit, 'authority.repositoryCommit'),
    benchmarkCommit: requireSha1(item.benchmarkCommit, 'authority.benchmarkCommit'),
    benchmarkPath: requireText(item.benchmarkPath, 'authority.benchmarkPath'),
    benchmarkBlobSha: requireSha1(item.benchmarkBlobSha, 'authority.benchmarkBlobSha'),
    benchmarkContentSha256: requireSha256(item.benchmarkContentSha256, 'authority.benchmarkContentSha256'),
    benchmarkByteLength: requirePositiveInteger(item.benchmarkByteLength, 'authority.benchmarkByteLength'),
  };
}

function observed(value) {
  const item = requireClosedObject(value, 'observed', OBSERVED_KEYS);
  return {
    repositoryCommit: requireSha1(item.repositoryCommit, 'observed.repositoryCommit'),
    repositoryTree: requireSha1(item.repositoryTree, 'observed.repositoryTree'),
    checkoutState: requireText(item.checkoutState, 'observed.checkoutState'),
    benchmarkCommit: requireSha1(item.benchmarkCommit, 'observed.benchmarkCommit'),
    benchmarkPath: requireText(item.benchmarkPath, 'observed.benchmarkPath'),
    benchmarkBlobSha: requireSha1(item.benchmarkBlobSha, 'observed.benchmarkBlobSha'),
    benchmarkContentSha256: requireSha256(item.benchmarkContentSha256, 'observed.benchmarkContentSha256'),
    benchmarkByteLength: requirePositiveInteger(item.benchmarkByteLength, 'observed.benchmarkByteLength'),
  };
}

function check(checkId, expected, actual) {
  return { checkId, expected, actual, pass: expected === actual };
}

function identityChecks(expected, actual) {
  return [
    check('repository commit', expected.repositoryCommit, actual.repositoryCommit),
    check('benchmark commit', expected.benchmarkCommit, actual.benchmarkCommit),
    check('benchmark path', expected.benchmarkPath, actual.benchmarkPath),
    check('benchmark blob', expected.benchmarkBlobSha, actual.benchmarkBlobSha),
    check('benchmark content', expected.benchmarkContentSha256, actual.benchmarkContentSha256),
    check('benchmark byte length', expected.benchmarkByteLength, actual.benchmarkByteLength),
    check('checkout state', 'CLEAN', actual.checkoutState),
  ];
}

function requiredHashes(value) {
  const fields = [
    'parserIdentitySha256', 'wasmSha256', 'mappingPolicySha256', 'zonePolicySha256',
    'toleranceProfileSha256', 'commandManifestSha256', 'environmentManifestSha256', 'testManifestSha256',
    'run1EvidenceIndexSha256', 'run2EvidenceIndexSha256',
  ];
  return Object.fromEntries(fields.map((field) => [field, requireSha256(value[field], field)]));
}

export function evaluateExactHeadEvidence(input) {
  const value = requireClosedObject(input, 'exact-head evidence', ROOT_KEYS);
  if (value.schema !== 'FbxExactHeadEvidence.v1') fail('BLOCKED_AUDIT_CONTRACT', 'schema must be FbxExactHeadEvidence.v1.');
  const expected = authority(value.authority), actual = observed(value.observed), hashes = requiredHashes(value);
  const checks = [
    ...identityChecks(expected, actual),
    check('repeat evidence bytes', hashes.run1EvidenceIndexSha256, hashes.run2EvidenceIndexSha256),
    check('regression status', 'PASS', requireText(value.regressionStatus, 'regressionStatus')),
    check('determinism status', 'PASS', requireText(value.determinismStatus, 'determinismStatus')),
  ];
  const status = checks.every((item) => item.pass) ? 'PASS' : 'FAIL';
  return deepFreeze({
    schema: 'FbxExactHeadEvaluation.v1', authority: expected, observed: actual,
    identities: hashes, checks, status,
  });
}
