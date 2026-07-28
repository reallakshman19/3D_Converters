import { canonicalJson } from '../canonical-json.js';
import { sha256Hex } from '../sha256.js';
import {
  calculateSelectedZoneGeometryManifestDigest,
  validateSelectedZoneGeometryManifest,
} from './geometry-manifest.js';
import { validateSupportCandidateEvidence } from './support-evidence.js';
import {
  FBX_ZONE_PACKAGE_FILE_ROLES, FBX_ZONE_PACKAGE_LIMITS,
  FBX_ZONE_PACKAGE_SCHEMAS, fail,
} from './constants.js';

const HASH = /^[0-9a-f]{64}$/;
const DESCRIPTOR_PATH = /^geometries\/(0|[1-9]\d{0,19})\/geometry\.json$/;
const BUFFER_PATH = /^geometries\/(0|[1-9]\d{0,19})\/(control-points-mm|polygon-offsets|polygon-vertex-indices)\.bin$/;
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
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  fail('ZONE_PACKAGE_INVALID_FILE', `${label} must be bytes.`);
}
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
function auditPayload(audit) {
  const payload = structuredClone(audit);
  delete payload.packageDigest;
  return payload;
}
async function calculatePackageDigest(audit) {
  return sha256Hex(canonicalJson(auditPayload(audit)));
}
function recordsByRole(audit, role) {
  return audit.files.filter((record) => record.role === role);
}
function roleContract(record) {
  if (record.role === 'MANIFEST') {
    return record.path === 'manifest.json' && record.disposition === 'PRESENT';
  }
  if (record.role === 'GEOMETRY_DESCRIPTOR') {
    return DESCRIPTOR_PATH.test(record.path) && record.disposition === 'PRESENT';
  }
  if (record.role === 'GEOMETRY_BUFFER') {
    return BUFFER_PATH.test(record.path) && record.disposition === 'PRESENT';
  }
  if (record.role === 'STAGEDJSON') return record.path === 'stagedjson.json';
  if (record.role === 'SUPPORT_EVIDENCE') {
    return record.path === 'support-evidence.json';
  }
  return false;
}
function validateDisposition(record) {
  if (record.disposition === 'PRESENT') {
    return HASH.test(record.sha256 || '')
      && Number.isSafeInteger(record.byteLength)
      && record.byteLength >= 0 && record.reason === null;
  }
  return record.disposition === 'OMITTED_BLOCKED'
    && ['STAGEDJSON', 'SUPPORT_EVIDENCE'].includes(record.role)
    && record.sha256 === null && record.byteLength === 0
    && typeof record.reason === 'string' && Boolean(record.reason.trim());
}
function validateFileRecord(record, priorPath) {
  exactKeys(record, FILE_KEYS, `audit file ${record?.path || '?'}`);
  if (!FBX_ZONE_PACKAGE_FILE_ROLES.includes(record.role)
      || !safePath(record.path) || !roleContract(record)
      || !validateDisposition(record)
      || (priorPath !== null && priorPath >= record.path)) {
    fail('ZONE_PACKAGE_INVALID_AUDIT',
      `audit file record ${record?.path || '<missing>'} is invalid.`);
  }
  return record.path;
}
function validateRoleInventory(audit) {
  const valid = recordsByRole(audit, 'MANIFEST').length === 1
    && recordsByRole(audit, 'STAGEDJSON').length === 1
    && recordsByRole(audit, 'SUPPORT_EVIDENCE').length === 1
    && recordsByRole(audit, 'GEOMETRY_DESCRIPTOR').length === audit.geometryCount
    && recordsByRole(audit, 'GEOMETRY_BUFFER').length === audit.geometryCount * 3;
  if (!valid) {
    fail('ZONE_PACKAGE_INVALID_AUDIT',
      'audit role inventory does not match geometryCount.');
  }
  const support = recordsByRole(audit, 'SUPPORT_EVIDENCE')[0];
  const expected = support.disposition === 'PRESENT'
    ? 'CANDIDATE_EVIDENCE_ONLY' : 'NOT_AUTHORIZED';
  if (audit.supportSemantics !== expected) {
    fail('ZONE_PACKAGE_INVALID_AUDIT',
      'supportSemantics contradicts the support evidence disposition.');
  }
}
async function validateAudit(audit) {
  exactKeys(audit, AUDIT_KEYS, 'audit');
  const identityValid = audit.schema === FBX_ZONE_PACKAGE_SCHEMAS.packageAudit
    && HASH.test(audit.manifestSha256 || '')
    && HASH.test(audit.manifestDigest || '')
    && HASH.test(audit.selectedZoneDigest || '')
    && HASH.test(audit.packageDigest || '')
    && Number.isSafeInteger(audit.geometryCount) && audit.geometryCount >= 1
    && audit.geometryCount <= FBX_ZONE_PACKAGE_LIMITS.maxSelectedGeometries
    && ['NOT_AUTHORIZED', 'CANDIDATE_EVIDENCE_ONLY'].includes(audit.supportSemantics)
    && Array.isArray(audit.files)
    && audit.files.length <= FBX_ZONE_PACKAGE_LIMITS.maxPackageFiles;
  if (!identityValid) fail('ZONE_PACKAGE_INVALID_AUDIT', 'audit identity is invalid.');
  let priorPath = null;
  for (const record of audit.files) priorPath = validateFileRecord(record, priorPath);
  validateRoleInventory(audit);
  if (await calculatePackageDigest(audit) !== audit.packageDigest) {
    fail('ZONE_PACKAGE_INVALID_AUDIT', 'packageDigest is invalid.');
  }
}
function fileMap(files) {
  if (!Array.isArray(files) || !files.length
      || files.length > FBX_ZONE_PACKAGE_LIMITS.maxPackageFiles) {
    fail('ZONE_PACKAGE_INVALID_FILE', 'package files are outside admitted limits.');
  }
  const map = new Map();
  for (const file of files) {
    if (!safePath(file?.path) || map.has(file.path)) {
      fail('ZONE_PACKAGE_INVALID_FILE',
        `package path ${file?.path || '<missing>'} is invalid or duplicate.`);
    }
    map.set(file.path, { ...file, bytes: bytesView(file.bytes, file.path) });
  }
  return map;
}
async function verifyInventory(audit, files) {
  const present = audit.files.filter((record) => record.disposition === 'PRESENT');
  const omitted = audit.files.filter((record) => record.disposition === 'OMITTED_BLOCKED');
  const expected = new Set(['audit.json', ...present.map((record) => record.path)]);
  if (files.size !== expected.size
      || [...files.keys()].some((path) => !expected.has(path))
      || omitted.some((record) => files.has(record.path))) {
    fail('ZONE_PACKAGE_INVALID_FILE',
      'physical package files differ from the audit inventory.');
  }
  for (const record of present) {
    const bytes = bytesView(files.get(record.path).bytes, record.path);
    if (bytes.byteLength !== record.byteLength
        || await sha256Hex(bytes) !== record.sha256) {
      fail('ZONE_PACKAGE_INVALID_FILE',
        `file ${record.path} differs from its audit record.`);
    }
  }
}
function descriptorPayload(entry) {
  return {
    geometryId: entry.geometryId,
    sourceObjectId: entry.sourceObjectId,
    occurrenceIds: [...entry.occurrenceIds],
    controlPointCount: entry.controlPointCount,
    polygonCount: entry.polygonCount,
  };
}
async function verifyGeometryFiles(manifest, files) {
  for (const entry of manifest.geometries) {
    const descriptor = files.get(entry.packagePath);
    const expected = canonicalJson(descriptorPayload(entry));
    if (!descriptor || new TextDecoder().decode(descriptor.bytes) !== expected) {
      fail('ZONE_PACKAGE_INVALID_FILE',
        `geometry descriptor ${entry.packagePath} differs from the manifest.`);
    }
    for (const buffer of entry.buffers) {
      const file = files.get(buffer.packagePath);
      if (!file || file.bytes.byteLength !== buffer.byteLength
          || await sha256Hex(file.bytes) !== buffer.sha256) {
        fail('ZONE_PACKAGE_INVALID_FILE',
          `geometry buffer ${buffer.packagePath} differs from the manifest.`);
      }
    }
  }
}
function parsedJsonFile(files, path, code, label) {
  try {
    const value = JSON.parse(new TextDecoder().decode(files.get(path).bytes));
    if (!value || typeof value !== 'object') throw new Error(`${label} root is invalid.`);
    return value;
  } catch (error) {
    fail(code, `${label} is invalid JSON: ${error?.message || error}`);
  }
}
async function verifyOptionalFiles(audit, manifest, files) {
  const staged = recordsByRole(audit, 'STAGEDJSON')[0];
  if (staged.disposition === 'PRESENT') {
    parsedJsonFile(files, staged.path,
      'ZONE_PACKAGE_INVALID_STAGEDJSON', 'StagedJSON');
  }
  const support = recordsByRole(audit, 'SUPPORT_EVIDENCE')[0];
  if (support.disposition === 'PRESENT') {
    const evidence = parsedJsonFile(files, support.path,
      'ZONE_PACKAGE_INVALID_SUPPORT_EVIDENCE', 'support evidence');
    await validateSupportCandidateEvidence(evidence);
    if (evidence.selectedZoneDigest !== manifest.selectedZoneDigest) {
      fail('ZONE_PACKAGE_INVALID_SUPPORT_EVIDENCE',
        'support evidence differs from the selected manifest.');
    }
  }
}
function expectedGeometryPaths(manifest) {
  return new Set(manifest.geometries.flatMap((entry) => [
    entry.packagePath, ...entry.buffers.map((buffer) => buffer.packagePath),
  ]));
}
function verifyGeometryInventory(audit, manifest) {
  const inventoried = new Set(audit.files
    .filter((record) => ['GEOMETRY_DESCRIPTOR', 'GEOMETRY_BUFFER'].includes(record.role))
    .map((record) => record.path));
  if (canonicalJson([...inventoried].sort())
      !== canonicalJson([...expectedGeometryPaths(manifest)].sort())) {
    fail('ZONE_PACKAGE_INVALID_AUDIT',
      'geometry file inventory differs from the manifest.');
  }
}
async function parsedManifest(files) {
  const manifestFile = files.get('manifest.json');
  if (!manifestFile) fail('ZONE_PACKAGE_INVALID_FILE', 'manifest.json is missing.');
  try {
    const manifest = JSON.parse(new TextDecoder().decode(manifestFile.bytes));
    await validateSelectedZoneGeometryManifest(manifest);
    return { manifest, manifestFile };
  } catch (error) {
    if (error?.code) throw error;
    fail('ZONE_PACKAGE_INVALID_MANIFEST',
      `manifest.json is invalid JSON: ${error?.message || error}`);
  }
}

export async function validateSelectedZonePackage({ files, audit } = {}) {
  await validateAudit(audit);
  const filesByPath = fileMap(files);
  await verifyInventory(audit, filesByPath);
  const auditFile = filesByPath.get('audit.json');
  if (new TextDecoder().decode(auditFile.bytes) !== canonicalJson(audit)) {
    fail('ZONE_PACKAGE_INVALID_AUDIT',
      'audit.json differs from the bound audit object.');
  }
  const { manifest, manifestFile } = await parsedManifest(filesByPath);
  const manifestBound = await sha256Hex(manifestFile.bytes) === audit.manifestSha256
    && await calculateSelectedZoneGeometryManifestDigest(manifest) === audit.manifestDigest
    && manifest.selectedZoneDigest === audit.selectedZoneDigest
    && manifest.geometries.length === audit.geometryCount;
  if (!manifestBound) {
    fail('ZONE_PACKAGE_INVALID_AUDIT',
      'manifest identity differs from the audit.');
  }
  verifyGeometryInventory(audit, manifest);
  await verifyGeometryFiles(manifest, filesByPath);
  await verifyOptionalFiles(audit, manifest, filesByPath);
  return { files, audit, manifest };
}
