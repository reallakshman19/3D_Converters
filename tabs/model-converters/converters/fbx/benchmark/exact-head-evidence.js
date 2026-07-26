import { canonicalJson, deepFreeze } from '../canonical-json.js';
import { sha256Hex } from '../sha256.js';

export const FBX_EXACT_HEAD_EVIDENCE_SCHEMA = 'FbxExactHeadEvidence.v1';
export const REQUIRED_EXACT_HEAD_CHECK_IDS = deepFreeze([
  'ACTUAL_ZONE_MANIFEST',
  'FULL_FBX_SUITE',
  'HOSTED_EXACT_HEAD_CI',
  'PRODUCTION_TOLERANCE_PROFILE',
  'REAL_BENCHMARK_QUALIFICATION',
]);
const CHECK_STATUSES = new Set(['PASS', 'FAIL', 'BLOCKED', 'NOT_EXECUTED']);
const RECONCILIATION_STATUSES = new Set(['PASS', 'PASS_WITH_OBSERVATIONS', 'FAIL', 'BLOCKED']);
const SHA1 = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const RECONCILIATION_ID = /^FBXQUAL-[0-9a-f]{32}$/;

function fail(code) { throw new Error(code); }
function compareText(left, right) { return left < right ? -1 : left > right ? 1 : 0; }
function assertText(value, code) { if (typeof value !== 'string' || !value || value !== value.trim()) fail(code); }
function assertSha(value, pattern, code) { if (typeof value !== 'string' || !pattern.test(value)) fail(code); }
function assertJson(value, code) {
  if (value === null || ['string', 'boolean'].includes(typeof value)) return;
  if (typeof value === 'number') { if (!Number.isFinite(value)) fail(code); return; }
  if (Array.isArray(value)) { value.forEach((item) => assertJson(item, code)); return; }
  if (!value || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) fail(code);
  for (const [key, child] of Object.entries(value)) {
    assertText(key, code);
    if (child === undefined) fail(code);
    assertJson(child, code);
  }
}
function cloneJson(value, code) { assertJson(value, code); return structuredClone(value); }
function sortedUniqueText(values, code) {
  if (!Array.isArray(values)) fail(code);
  const result = values.map((value) => { assertText(value, code); return value; }).sort(compareText);
  if (new Set(result).size !== result.length) fail(code);
  return result;
}
function normalizeBenchmarkIdentity(value, code) {
  assertText(value?.benchmarkId, `${code}_ID`);
  assertText(value?.repository, `${code}_REPOSITORY`);
  assertSha(value?.benchmarkCommit, SHA1, `${code}_COMMIT`);
  assertText(value?.benchmarkPath, `${code}_PATH`);
  assertSha(value?.benchmarkBlobSha, SHA1, `${code}_BLOB`);
  assertSha(value?.contentSha256, SHA256, `${code}_CONTENT_HASH`);
  if (!Number.isSafeInteger(value?.byteLength) || value.byteLength < 0) fail(`${code}_BYTE_LENGTH`);
  return {
    benchmarkId: value.benchmarkId, repository: value.repository,
    benchmarkCommit: value.benchmarkCommit, benchmarkPath: value.benchmarkPath,
    benchmarkBlobSha: value.benchmarkBlobSha, contentSha256: value.contentSha256,
    byteLength: value.byteLength,
  };
}
function normalizeBenchmark(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('EXACT_HEAD_BENCHMARK_REQUIRED');
  assertText(value.path, 'EXACT_HEAD_BENCHMARK_PATH_REQUIRED');
  assertSha(value.commitSha, SHA1, 'EXACT_HEAD_BENCHMARK_COMMIT_INVALID');
  assertSha(value.blobSha, SHA1, 'EXACT_HEAD_BENCHMARK_BLOB_INVALID');
  assertSha(value.contentSha256, SHA256, 'EXACT_HEAD_BENCHMARK_CONTENT_HASH_INVALID');
  if (!Number.isSafeInteger(value.byteLength) || value.byteLength < 0) fail('EXACT_HEAD_BENCHMARK_BYTE_LENGTH_INVALID');
  return { path: value.path, commitSha: value.commitSha, blobSha: value.blobSha,
    contentSha256: value.contentSha256, byteLength: value.byteLength };
}
function normalizeReconciliation(value, baselineSha, sourceHeadSha, repository, benchmark) {
  if (value?.schema !== 'FbxQualificationReconciliation.v1') fail('EXACT_HEAD_RECONCILIATION_SCHEMA_INVALID');
  if (!RECONCILIATION_ID.test(value.reconciliationId || '')) fail('EXACT_HEAD_RECONCILIATION_ID_INVALID');
  const status = value.summary?.status ?? value.status;
  if (!RECONCILIATION_STATUSES.has(status)) fail('EXACT_HEAD_RECONCILIATION_STATUS_INVALID');
  if (value.integrationBaselineSha !== baselineSha || value.sourceHeadSha !== sourceHeadSha) {
    fail('EXACT_HEAD_RECONCILIATION_HEAD_BINDING_MISMATCH');
  }
  const identity = normalizeBenchmarkIdentity(value.benchmarkIdentity, 'EXACT_HEAD_RECONCILIATION_BENCHMARK_INVALID');
  if (identity.repository !== repository || identity.benchmarkCommit !== benchmark.commitSha
    || identity.benchmarkPath !== benchmark.path || identity.benchmarkBlobSha !== benchmark.blobSha
    || identity.contentSha256 !== benchmark.contentSha256 || identity.byteLength !== benchmark.byteLength) {
    fail('EXACT_HEAD_RECONCILIATION_BENCHMARK_MISMATCH');
  }
  return { schema: value.schema, reconciliationId: value.reconciliationId,
    integrationBaselineSha: baselineSha, sourceHeadSha, benchmarkIdentity: identity, status };
}
function normalizeCheck(value, sourceHeadSha) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('EXACT_HEAD_CHECK_INVALID');
  assertText(value.checkId, 'EXACT_HEAD_CHECK_ID_REQUIRED');
  if (!CHECK_STATUSES.has(value.status)) fail('EXACT_HEAD_CHECK_STATUS_INVALID');
  const observedHeadSha = value.observedHeadSha ?? null;
  if (observedHeadSha !== null) assertSha(observedHeadSha, SHA1, 'EXACT_HEAD_CHECK_SHA_INVALID');
  const evidenceRefs = sortedUniqueText(value.evidenceRefs || [], 'EXACT_HEAD_EVIDENCE_REFS_INVALID');
  if (value.status === 'PASS' || value.status === 'FAIL') {
    if (observedHeadSha !== sourceHeadSha) fail('EXACT_HEAD_CHECK_NOT_BOUND_TO_SOURCE_HEAD');
    if (!evidenceRefs.length) fail('EXACT_HEAD_EXECUTED_CHECK_REQUIRES_EVIDENCE');
  } else if (observedHeadSha !== null || evidenceRefs.length) {
    fail('UNEXECUTED_OR_BLOCKED_CHECK_MUST_NOT_CLAIM_EVIDENCE');
  }
  return { checkId: value.checkId, status: value.status, observedHeadSha, evidenceRefs,
    detail: value.detail === undefined ? null : cloneJson(value.detail, 'EXACT_HEAD_CHECK_DETAIL_NOT_JSON') };
}
function summarize(checks, reconciliationStatus) {
  const countsByStatus = { PASS: 0, FAIL: 0, BLOCKED: 0, NOT_EXECUTED: 0 };
  for (const check of checks) countsByStatus[check.status] += 1;
  const blockingCheckIds = checks.filter((check) => ['BLOCKED', 'NOT_EXECUTED'].includes(check.status))
    .map((check) => check.checkId);
  const failingCheckIds = checks.filter((check) => check.status === 'FAIL').map((check) => check.checkId);
  const status = reconciliationStatus === 'BLOCKED' || blockingCheckIds.length ? 'BLOCKED'
    : reconciliationStatus === 'FAIL' || failingCheckIds.length ? 'FAIL'
      : reconciliationStatus === 'PASS_WITH_OBSERVATIONS' ? 'PASS_WITH_OBSERVATIONS' : 'PASS';
  return { countsByStatus, blockingCheckIds, failingCheckIds, reconciliationStatus, status };
}
function normalizeInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('EXACT_HEAD_EVIDENCE_INPUT_REQUIRED');
  assertText(input.repository, 'EXACT_HEAD_REPOSITORY_REQUIRED');
  assertSha(input.integrationBaselineSha, SHA1, 'EXACT_HEAD_BASELINE_SHA_INVALID');
  assertSha(input.sourceHeadSha, SHA1, 'EXACT_HEAD_SOURCE_SHA_INVALID');
  const benchmark = normalizeBenchmark(input.benchmark);
  const reconciliation = normalizeReconciliation(input.reconciliation, input.integrationBaselineSha,
    input.sourceHeadSha, input.repository, benchmark);
  if (!Array.isArray(input.checks)) fail('EXACT_HEAD_CHECKS_REQUIRED');
  const checks = input.checks.map((check) => normalizeCheck(check, input.sourceHeadSha))
    .sort((left, right) => compareText(left.checkId, right.checkId));
  if (new Set(checks.map((check) => check.checkId)).size !== checks.length) fail('EXACT_HEAD_DUPLICATE_CHECK_ID');
  if (checks.length !== REQUIRED_EXACT_HEAD_CHECK_IDS.length
    || REQUIRED_EXACT_HEAD_CHECK_IDS.some((checkId, index) => checks[index]?.checkId !== checkId)) {
    fail('EXACT_HEAD_REQUIRED_CHECK_SET_MISMATCH');
  }
  return { schema: FBX_EXACT_HEAD_EVIDENCE_SCHEMA, repository: input.repository,
    integrationBaselineSha: input.integrationBaselineSha, sourceHeadSha: input.sourceHeadSha,
    benchmark, reconciliation, checks, summary: summarize(checks, reconciliation.status) };
}

export async function buildFbxExactHeadEvidence(input) {
  const payload = normalizeInput(input);
  const digest = await sha256Hex(canonicalJson(payload));
  return deepFreeze({ ...payload, evidenceId: `FBXHEAD-${digest.slice(0, 32)}` });
}
export async function validateFbxExactHeadEvidence(value) {
  if (value?.schema !== FBX_EXACT_HEAD_EVIDENCE_SCHEMA) fail('EXACT_HEAD_EVIDENCE_SCHEMA_INVALID');
  const rebuilt = await buildFbxExactHeadEvidence(value);
  if (rebuilt.evidenceId !== value.evidenceId) fail('EXACT_HEAD_EVIDENCE_ID_MISMATCH');
  if (canonicalJson(rebuilt) !== canonicalJson(value)) fail('EXACT_HEAD_EVIDENCE_NOT_CANONICAL');
  return value;
}
