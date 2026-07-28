import { canonicalJson } from '../canonical-json.js';
import { sha256Hex } from '../sha256.js';
import {
  calculateSelectedZoneGeometryManifestDigest,
  validateSelectedZoneGeometryManifest,
} from './geometry-manifest.js';
import {
  FBX_ZONE_PACKAGE_FILE_ROLES, FBX_ZONE_PACKAGE_LIMITS,
  FBX_ZONE_PACKAGE_SCHEMAS, fail,
} from './constants.js';

const HASH = /^[0-9a-f]{64}$/;
const AUDIT_KEYS = Object.freeze([
  'schema', 'manifestSha256', 'manifestDigest', 'selectedZoneDigest',
  'files', 'supportSemantics', 'geometryCount', 'packageDigest',
]);
const FILE_KEYS = Object.freeze([
  'role', 'path', 'disposition', 'sha256', 'byteLength', 'reason',
]);

function bytesView(value, label = 'file bytes') {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  fail('ZONE_PACKAGE_INVALID_FILE', `${label} must be bytes.`);
}
function textFile(path, text) { return { path, bytes: new TextEncoder().encode(text) }; }
function exactKeys(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || Object.keys(value).sort().join('\0') !== [...keys].sort().join('\0')) {
    fail('ZONE_PACKAGE_INVALID_AUDIT', `${label} fields are invalid.`);
  }
}
function safePath(path) {
  return typeof path === 'string' && path.length > 0 && path.length <= 512
    && !path.startsWith('/') && !path.includes('\\')
    && !path.split('/').some((part) => !part || part === '.' || part === '..');
}
function comparePath(left, right) { return left.path < right.path ? -1 : left.path > right.path ? 1 : 0; }
async function presentRecord(role, file) {
  const bytes = bytesView(file.bytes, file.path);
  return { role, path: file.path, disposition: 'PRESENT', sha256: await sha256Hex(bytes),
    byteLength: bytes.byteLength, reason: null };
}
function omittedRecord(role, path, reason) {
  const text = String(reason || '').trim();
  if (!text) fail('ZONE_PACKAGE_INVALID_AUDIT', `${role} omission requires a reason.`);
  return { role, path, disposition: 'OMITTED_BLOCKED', sha256: null, byteLength: 0, reason: text };
}

async function geometryFiles(manifest, buffersByGeometryId) {
  if (!(buffersByGeometryId instanceof Map)) fail('ZONE_PACKAGE_MISSING_BUFFERS', 'buffersByGeometryId must be a Map.');
  const files = [];
  for (const entry of manifest.geometries) {
    const raw = buffersByGeometryId.get(entry.geometryId);
    if (!raw) fail('ZONE_PACKAGE_MISSING_BUFFERS', `no raw buffers supplied for geometryId ${entry.geometryId}.`);
    files.push({ role: 'GEOMETRY_DESCRIPTOR', ...textFile(entry.packagePath, canonicalJson({
      geometryId: entry.geometryId, sourceObjectId: entry.sourceObjectId,
      occurrenceIds: [...entry.occurrenceIds], controlPointCount: entry.controlPointCount,
      polygonCount: entry.polygonCount,
    })) });
    for (const descriptor of entry.buffers) {
      const rawBuffer = raw[descriptor.role];
      if (!rawBuffer) fail('ZONE_PACKAGE_MISSING_BUFFERS', `raw buffer ${entry.geometryId}/${descriptor.role} is missing.`);
      const bytes = bytesView(rawBuffer.bytes, `${entry.geometryId}/${descriptor.role}`);
      const actualHash = await sha256Hex(bytes);
      if (actualHash !== descriptor.sha256 || bytes.byteLength !== descriptor.byteLength
          || rawBuffer.sha256 !== descriptor.sha256 || rawBuffer.byteLength !== descriptor.byteLength) {
        fail('ZONE_PACKAGE_BUFFER_MISMATCH', `raw buffer ${entry.geometryId}/${descriptor.role} differs from the manifest.`);
      }
      files.push({ role: 'GEOMETRY_BUFFER', path: descriptor.packagePath, bytes: bytes.slice() });
    }
  }
  return files;
}

function validatedStagedJson(text) {
  if (text == null) return null;
  if (typeof text !== 'string' || !text.trim()) fail('ZONE_PACKAGE_INVALID_STAGEDJSON', 'stagedJsonText must be non-empty JSON text.');
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== 'object') fail('ZONE_PACKAGE_INVALID_STAGEDJSON', 'stagedJsonText must contain a JSON object or array.');
  } catch (error) {
    if (error?.code === 'ZONE_PACKAGE_INVALID_STAGEDJSON') throw error;
    fail('ZONE_PACKAGE_INVALID_STAGEDJSON', `stagedJsonText is invalid JSON: ${error?.message || error}`);
  }
  return textFile('stagedjson.json', text);
}
async function validatedSupportEvidence(value, manifest) {
  if (value == null) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || value.schema !== FBX_ZONE_PACKAGE_SCHEMAS.supportEvidence
      || value.selectedZoneDigest !== manifest.selectedZoneDigest
      || !Array.isArray(value.candidates) || !HASH.test(value.evidenceDigest || '')) {
    fail('ZONE_PACKAGE_INVALID_SUPPORT_EVIDENCE', 'supportEvidence is not bound to the selected manifest.');
  }
  const payload = structuredClone(value); delete payload.evidenceDigest;
  if (await sha256Hex(canonicalJson(payload)) !== value.evidenceDigest) {
    fail('ZONE_PACKAGE_INVALID_SUPPORT_EVIDENCE', 'supportEvidence digest is invalid.');
  }
  return textFile('support-evidence.json', canonicalJson(value));
}
function auditPayload(audit) { const payload = structuredClone(audit); delete payload.packageDigest; return payload; }
async function calculatePackageDigest(audit) { return sha256Hex(canonicalJson(auditPayload(audit))); }
function validateFileRecord(record, priorPath) {
  exactKeys(record, FILE_KEYS, `audit file ${record?.path || '?'}`);
  if (!FBX_ZONE_PACKAGE_FILE_ROLES.includes(record.role) || !safePath(record.path)) {
    fail('ZONE_PACKAGE_INVALID_AUDIT', 'audit file role or path is invalid.');
  }
  if (priorPath !== null && priorPath >= record.path) fail('ZONE_PACKAGE_INVALID_AUDIT', 'audit files must be strictly sorted by path.');
  if (record.disposition === 'PRESENT') {
    if (!HASH.test(record.sha256 || '') || !Number.isSafeInteger(record.byteLength)
        || record.byteLength < 0 || record.reason !== null) {
      fail('ZONE_PACKAGE_INVALID_AUDIT', `present file ${record.path} has invalid integrity metadata.`);
    }
  } else if (record.disposition === 'OMITTED_BLOCKED') {
    if (record.sha256 !== null || record.byteLength !== 0
        || typeof record.reason !== 'string' || !record.reason.trim()) {
      fail('ZONE_PACKAGE_INVALID_AUDIT', `omitted file ${record.path} has invalid omission metadata.`);
    }
  } else fail('ZONE_PACKAGE_INVALID_AUDIT', `file ${record.path} has an unknown disposition.`);
  return record.path;
}
async function validateAudit(audit) {
  exactKeys(audit, AUDIT_KEYS, 'audit');
  if (audit.schema !== FBX_ZONE_PACKAGE_SCHEMAS.packageAudit
      || !HASH.test(audit.manifestSha256 || '') || !HASH.test(audit.manifestDigest || '')
      || !HASH.test(audit.selectedZoneDigest || '') || !HASH.test(audit.packageDigest || '')
      || !Number.isSafeInteger(audit.geometryCount) || audit.geometryCount < 1
      || audit.geometryCount > FBX_ZONE_PACKAGE_LIMITS.maxSelectedGeometries
      || !['NOT_AUTHORIZED', 'CANDIDATE_EVIDENCE_ONLY'].includes(audit.supportSemantics)
      || !Array.isArray(audit.files)) fail('ZONE_PACKAGE_INVALID_AUDIT', 'audit identity is invalid.');
  let priorPath = null; for (const record of audit.files) priorPath = validateFileRecord(record, priorPath);
  if (await calculatePackageDigest(audit) !== audit.packageDigest) fail('ZONE_PACKAGE_INVALID_AUDIT', 'packageDigest is invalid.');
}
function fileMap(files) {
  if (!Array.isArray(files) || !files.length || files.length > FBX_ZONE_PACKAGE_LIMITS.maxPackageFiles) {
    fail('ZONE_PACKAGE_INVALID_FILE', 'package files are outside admitted limits.');
  }
  const map = new Map();
  for (const file of files) {
    if (!safePath(file?.path) || map.has(file.path)) fail('ZONE_PACKAGE_INVALID_FILE', `package path ${file?.path || '<missing>'} is invalid or duplicate.`);
    map.set(file.path, { ...file, bytes: bytesView(file.bytes, file.path) });
  }
  return map;
}
async function verifyInventory(audit, files) {
  const present = audit.files.filter((record) => record.disposition === 'PRESENT');
  const omitted = audit.files.filter((record) => record.disposition === 'OMITTED_BLOCKED');
  const expected = new Set(['audit.json', ...present.map((record) => record.path)]);
  if (files.size !== expected.size || [...files.keys()].some((path) => !expected.has(path))
      || omitted.some((record) => files.has(record.path))) {
    fail('ZONE_PACKAGE_INVALID_FILE', 'physical package files differ from the audit inventory.');
  }
  for (const record of present) {
    const bytes = bytesView(files.get(record.path).bytes, record.path);
    if (bytes.byteLength !== record.byteLength || await sha256Hex(bytes) !== record.sha256) {
      fail('ZONE_PACKAGE_INVALID_FILE', `file ${record.path} differs from its audit record.`);
    }
  }
}
function expectedGeometryPaths(manifest) {
  return new Set(manifest.geometries.flatMap((entry) => [entry.packagePath, ...entry.buffers.map((buffer) => buffer.packagePath)]));
}

export async function validateSelectedZonePackage({ files, audit } = {}) {
  await validateAudit(audit);
  const filesByPath = fileMap(files); await verifyInventory(audit, filesByPath);
  const auditFile = filesByPath.get('audit.json');
  if (new TextDecoder().decode(auditFile.bytes) !== canonicalJson(audit)) {
    fail('ZONE_PACKAGE_INVALID_AUDIT', 'audit.json differs from the bound audit object.');
  }
  const manifestFile = filesByPath.get('manifest.json');
  if (!manifestFile) fail('ZONE_PACKAGE_INVALID_FILE', 'manifest.json is missing.');
  let manifest;
  try { manifest = JSON.parse(new TextDecoder().decode(manifestFile.bytes)); }
  catch (error) { fail('ZONE_PACKAGE_INVALID_MANIFEST', `manifest.json is invalid JSON: ${error?.message || error}`); }
  await validateSelectedZoneGeometryManifest(manifest);
  if (await sha256Hex(manifestFile.bytes) !== audit.manifestSha256
      || await calculateSelectedZoneGeometryManifestDigest(manifest) !== audit.manifestDigest
      || manifest.selectedZoneDigest !== audit.selectedZoneDigest
      || manifest.geometries.length !== audit.geometryCount) {
    fail('ZONE_PACKAGE_INVALID_AUDIT', 'manifest identity differs from the audit.');
  }
  const inventoried = new Set(audit.files.filter((record) => ['GEOMETRY_DESCRIPTOR', 'GEOMETRY_BUFFER'].includes(record.role)).map((record) => record.path));
  if (canonicalJson([...inventoried].sort()) !== canonicalJson([...expectedGeometryPaths(manifest)].sort())) {
    fail('ZONE_PACKAGE_INVALID_AUDIT', 'geometry file inventory differs from the manifest.');
  }
  return { files, audit, manifest };
}

export async function buildSelectedZonePackage({
  manifest, buffersByGeometryId, stagedJsonText = null, supportEvidence = null,
  stagedJsonOmissionReason = 'StagedJSON was not produced for this selected zone.',
  supportEvidenceOmissionReason = 'Support evidence was not produced for this selected zone.',
} = {}) {
  await validateSelectedZoneGeometryManifest(manifest);
  const manifestFile = { role: 'MANIFEST', ...textFile('manifest.json', canonicalJson(manifest)) };
  const geometryFileList = await geometryFiles(manifest, buffersByGeometryId);
  const stagedValue = validatedStagedJson(stagedJsonText);
  const stagedFile = stagedValue ? { role: 'STAGEDJSON', ...stagedValue } : null;
  const supportValue = await validatedSupportEvidence(supportEvidence, manifest);
  const supportFile = supportValue ? { role: 'SUPPORT_EVIDENCE', ...supportValue } : null;
  const physical = [manifestFile, ...geometryFileList, ...(stagedFile ? [stagedFile] : []), ...(supportFile ? [supportFile] : [])].sort(comparePath);
  if (physical.length + 1 > FBX_ZONE_PACKAGE_LIMITS.maxPackageFiles) {
    fail('ZONE_PACKAGE_LIMIT_EXCEEDED', `package file count exceeds ${FBX_ZONE_PACKAGE_LIMITS.maxPackageFiles}.`);
  }
  const records = await Promise.all(physical.map((file) => presentRecord(file.role, file)));
  if (!stagedFile) records.push(omittedRecord('STAGEDJSON', 'stagedjson.json', stagedJsonOmissionReason));
  if (!supportFile) records.push(omittedRecord('SUPPORT_EVIDENCE', 'support-evidence.json', supportEvidenceOmissionReason));
  records.sort(comparePath);
  const auditBase = { schema: FBX_ZONE_PACKAGE_SCHEMAS.packageAudit,
    manifestSha256: await sha256Hex(manifestFile.bytes), manifestDigest: manifest.manifestDigest,
    selectedZoneDigest: manifest.selectedZoneDigest, files: records,
    supportSemantics: supportFile ? 'CANDIDATE_EVIDENCE_ONLY' : 'NOT_AUTHORIZED',
    geometryCount: manifest.geometries.length };
  const audit = { ...auditBase, packageDigest: await sha256Hex(canonicalJson(auditBase)) };
  const files = [...physical.map(({ path, bytes }) => ({ path, bytes })), textFile('audit.json', canonicalJson(audit))];
  await validateSelectedZonePackage({ files, audit });
  return { files, audit };
}
