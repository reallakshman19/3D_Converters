import { deepFreeze } from '../canonical-json.js';
import { sha256Hex } from '../sha256.js';
import { canonicalBenchmarkEvidence, canonicalBenchmarkEvidenceJson } from './evidence-json.js';

const STATUSES = Object.freeze([
  'PASS', 'PASS_WITH_OBSERVATIONS', 'FAIL', 'BLOCKED', 'NOT_EXECUTED',
]);
const STATUS_SET = new Set(STATUSES);
const DIGEST_RULE = 'SHA256_CANONICAL_JSON_WITHOUT_ROOT_FIELD';
const ORDERING = Object.freeze(['artifactId', 'artifactType', 'relativePath']);
const SPEC_KEYS = new Set(['artifactId', 'artifactType', 'relativePath', 'qualificationStatus', 'value']);
const INDEX_KEYS = new Set(['schema', 'benchmarkIdentity', 'executionIdentity', 'artifacts', 'countsByStatus',
  'rootDigestRule', 'canonicalOrdering', 'rootEvidenceSha256']);
const ENTRY_KEYS = new Set(['artifactId', 'artifactType', 'artifactSchema', 'relativePath', 'mediaType',
  'qualificationStatus', 'contentSha256', 'byteLength']);

function assertObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value;
}

function assertOnlyKeys(value, allowed, label) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new TypeError(`${label} contains unsupported field ${key}.`);
  }
}

function assertText(value, label, pattern = null) {
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value) {
    throw new TypeError(`${label} must be a non-empty trimmed string.`);
  }
  if (pattern && !pattern.test(value)) throw new TypeError(`${label} has an invalid format.`);
  return value;
}

function assertRelativePath(value) {
  const path = assertText(value, 'relativePath');
  if (path.includes('\\') || path.startsWith('/') || path.endsWith('/') || path.includes('//')) {
    throw new TypeError('relativePath must be a normalized POSIX relative path.');
  }
  const segments = path.split('/');
  if (segments.some((segment) => segment === '.' || segment === '..')) {
    throw new TypeError('relativePath must not contain traversal segments.');
  }
  return path;
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareEntries(left, right) {
  for (const field of ORDERING) {
    const order = compareText(left[field], right[field]);
    if (order) return order;
  }
  return 0;
}

function normalizedIdentity(value, label) {
  assertObject(value, label);
  return canonicalBenchmarkEvidence(value);
}

function normalizedSpec(value, index) {
  const spec = assertObject(value, `artifacts[${index}]`);
  assertOnlyKeys(spec, SPEC_KEYS, `artifacts[${index}]`);
  const artifactId = assertText(spec.artifactId, `artifacts[${index}].artifactId`, /^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
  const artifactType = assertText(spec.artifactType, `artifacts[${index}].artifactType`, /^[A-Z][A-Z0-9_]*$/);
  const relativePath = assertRelativePath(spec.relativePath);
  if (!STATUS_SET.has(spec.qualificationStatus)) {
    throw new TypeError(`artifacts[${index}].qualificationStatus is invalid.`);
  }
  const evidence = assertObject(spec.value, `artifacts[${index}].value`);
  const artifactSchema = assertText(evidence.schema, `artifacts[${index}].value.schema`);
  return { artifactId, artifactType, artifactSchema, relativePath,
    qualificationStatus: spec.qualificationStatus, evidence };
}

function assertUnique(entries, field) {
  const seen = new Set();
  for (const entry of entries) {
    if (seen.has(entry[field])) throw new Error(`DUPLICATE_EVIDENCE_${field.toUpperCase()}`);
    seen.add(entry[field]);
  }
}

function countsByStatus(entries) {
  const counts = Object.fromEntries(STATUSES.map((status) => [status, 0]));
  for (const entry of entries) counts[entry.qualificationStatus] += 1;
  return counts;
}

function rootPayload(index) {
  const { rootEvidenceSha256: ignored, ...payload } = index;
  return payload;
}

async function indexedArtifact(spec) {
  const canonicalJson = canonicalBenchmarkEvidenceJson(spec.evidence);
  return {
    artifactId: spec.artifactId,
    artifactType: spec.artifactType,
    artifactSchema: spec.artifactSchema,
    relativePath: spec.relativePath,
    mediaType: 'application/json',
    qualificationStatus: spec.qualificationStatus,
    contentSha256: await sha256Hex(canonicalJson),
    byteLength: new TextEncoder().encode(canonicalJson).byteLength,
  };
}

function assertEntry(entry, index) {
  assertObject(entry, `index.artifacts[${index}]`);
  assertOnlyKeys(entry, ENTRY_KEYS, `index.artifacts[${index}]`);
  assertText(entry.artifactId, `index.artifacts[${index}].artifactId`, /^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
  assertText(entry.artifactType, `index.artifacts[${index}].artifactType`, /^[A-Z][A-Z0-9_]*$/);
  assertText(entry.artifactSchema, `index.artifacts[${index}].artifactSchema`);
  assertRelativePath(entry.relativePath);
  if (entry.mediaType !== 'application/json') throw new TypeError('Evidence mediaType must be application/json.');
  if (!STATUS_SET.has(entry.qualificationStatus)) throw new TypeError('Evidence qualificationStatus is invalid.');
  if (!/^[0-9a-f]{64}$/.test(entry.contentSha256)) throw new TypeError('Evidence contentSha256 is invalid.');
  if (!Number.isSafeInteger(entry.byteLength) || entry.byteLength <= 0) throw new TypeError('Evidence byteLength is invalid.');
}

function assertCanonicalEntries(entries) {
  const sorted = [...entries].sort(compareEntries);
  for (let index = 0; index < entries.length; index += 1) {
    if (entries[index].artifactId !== sorted[index].artifactId
      || entries[index].artifactType !== sorted[index].artifactType
      || entries[index].relativePath !== sorted[index].relativePath) {
      throw new Error('NON_CANONICAL_EVIDENCE_ORDER');
    }
  }
}

function assertCounts(index) {
  const expected = countsByStatus(index.artifacts);
  for (const status of STATUSES) {
    if (index.countsByStatus?.[status] !== expected[status]) throw new Error('EVIDENCE_STATUS_COUNT_MISMATCH');
  }
  if (Object.keys(index.countsByStatus || {}).length !== STATUSES.length) {
    throw new Error('EVIDENCE_STATUS_COUNT_MISMATCH');
  }
}

export async function buildFbxBenchmarkEvidenceIndex({ benchmarkIdentity, executionIdentity, artifacts }) {
  if (!Array.isArray(artifacts) || artifacts.length === 0) throw new TypeError('artifacts must be a non-empty array.');
  const specs = artifacts.map(normalizedSpec);
  assertUnique(specs, 'artifactId');
  assertUnique(specs, 'relativePath');
  const entries = (await Promise.all(specs.map(indexedArtifact))).sort(compareEntries);
  const payload = {
    schema: 'FbxBenchmarkEvidenceIndex.v1',
    benchmarkIdentity: normalizedIdentity(benchmarkIdentity, 'benchmarkIdentity'),
    executionIdentity: normalizedIdentity(executionIdentity, 'executionIdentity'),
    artifacts: entries,
    countsByStatus: countsByStatus(entries),
    rootDigestRule: DIGEST_RULE,
    canonicalOrdering: [...ORDERING],
  };
  const rootEvidenceSha256 = await sha256Hex(canonicalBenchmarkEvidenceJson(payload));
  return deepFreeze({ ...payload, rootEvidenceSha256 });
}

export async function validateFbxBenchmarkEvidenceIndex(value) {
  const index = assertObject(value, 'index');
  assertOnlyKeys(index, INDEX_KEYS, 'index');
  if (index.schema !== 'FbxBenchmarkEvidenceIndex.v1') throw new TypeError('Evidence index schema is invalid.');
  normalizedIdentity(index.benchmarkIdentity, 'index.benchmarkIdentity');
  normalizedIdentity(index.executionIdentity, 'index.executionIdentity');
  if (!Array.isArray(index.artifacts) || index.artifacts.length === 0) throw new TypeError('index.artifacts must be non-empty.');
  index.artifacts.forEach(assertEntry);
  assertUnique(index.artifacts, 'artifactId');
  assertUnique(index.artifacts, 'relativePath');
  assertCanonicalEntries(index.artifacts);
  assertCounts(index);
  if (index.rootDigestRule !== DIGEST_RULE) throw new TypeError('Evidence rootDigestRule is invalid.');
  if (JSON.stringify(index.canonicalOrdering) !== JSON.stringify(ORDERING)) {
    throw new TypeError('Evidence canonicalOrdering is invalid.');
  }
  if (!/^[0-9a-f]{64}$/.test(index.rootEvidenceSha256)) throw new TypeError('Evidence root digest is invalid.');
  const actual = await sha256Hex(canonicalBenchmarkEvidenceJson(rootPayload(index)));
  if (actual !== index.rootEvidenceSha256) throw new Error('EVIDENCE_ROOT_SHA256_MISMATCH');
  return index;
}
