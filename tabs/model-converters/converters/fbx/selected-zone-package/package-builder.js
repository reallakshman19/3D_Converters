import { canonicalJson, deepFreeze } from '../canonical-json.js';
import { sha256Hex } from '../sha256.js';
import { enforceSourceGraphPolicy } from '../source-graph.js';
import {
  FBX_SELECTED_ZONE_PACKAGE_AUDIT_SCHEMA,
  FBX_SELECTED_ZONE_PACKAGE_SCHEMA,
  SELECTED_ZONE_PACKAGE_PATHS,
  SELECTED_ZONE_PACKAGE_STATUS,
  failSelectedZonePackage,
} from './constants.js';
import {
  buildSelectedZoneGeometryManifest,
  calculateSelectedZoneGeometryManifestDigest,
  validateSelectedZoneGeometryManifest,
} from './geometry-manifest.js';

const REVISION = /^[0-9a-f]{40}$/;
const HASH = /^[0-9a-f]{64}$/;
const TEXT_ENCODER = new TextEncoder();
const AUDIT_KEYS = [
  'schema', 'auditId', 'packageStatus', 'producerRevision', 'sourceIdentity',
  'parserIdentity', 'selectedSourceGraphSha256', 'sourceGeometryBundleSourceGraphSha256',
  'sourceGeometryBundleDigest', 'selectedZone', 'authority', 'files',
];
const AUTHORITY_KEYS = ['engineeringSemantics', 'occurrenceAndTransform', 'topologyAndBuffers', 'supportSemantics'];
const FILE_RECORD_KEYS = [
  'path', 'role', 'required', 'status', 'schema', 'bufferId', 'sha256', 'byteLength', 'reason',
];

function bytesOf(content) {
  if (typeof content === 'string') return TEXT_ENCODER.encode(content);
  if (content instanceof ArrayBuffer) return new Uint8Array(content);
  if (ArrayBuffer.isView(content)) return new Uint8Array(content.buffer, content.byteOffset, content.byteLength);
  failSelectedZonePackage('BLOCKED_PACKAGE_FILE', 'Package content must be text or bytes.');
}

function exactObject(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    failSelectedZonePackage('BLOCKED_PACKAGE_SHAPE', `${label} must be an object.`);
  }
  if (Object.keys(value).sort().join('\0') !== [...keys].sort().join('\0')) {
    failSelectedZonePackage('BLOCKED_PACKAGE_SHAPE', `${label} fields are invalid.`);
  }
  return value;
}

function nonEmptyReason(value, label) {
  const reason = String(value || '').trim();
  if (!reason) failSelectedZonePackage('BLOCKED_PACKAGE_AUDIT', `${label} requires an explicit reason.`);
  return reason;
}

async function presentRecord({ path, role, schema = null, content, bufferId = null, required = true }) {
  const bytes = bytesOf(content);
  return {
    path, role, required, status: SELECTED_ZONE_PACKAGE_STATUS.present,
    schema, bufferId, sha256: await sha256Hex(bytes), byteLength: bytes.byteLength, reason: null,
  };
}

function omittedRecord({ path, role, reason }) {
  return {
    path, role, required: false, status: SELECTED_ZONE_PACKAGE_STATUS.omittedBlocked,
    schema: null, bufferId: null, sha256: null, byteLength: 0, reason,
  };
}

function geometryBufferFiles(geometryBundle, geometryManifest) {
  const byId = new Map(geometryBundle.buffers.map((item) => [item.bufferId, item.bytes]));
  return geometryManifest.buffers.map((descriptor) => {
    const bytes = byId.get(descriptor.bufferId);
    if (!bytes) failSelectedZonePackage('BLOCKED_GEOMETRY_BINDING', 'Selected geometry buffer is unavailable.');
    return { path: descriptor.packagePath, role: 'GEOMETRY_BUFFER', bufferId: descriptor.bufferId, content: bytes.slice(0) };
  });
}

function stagedFile(stagedJsonText) {
  if (stagedJsonText === null) return null;
  if (typeof stagedJsonText !== 'string' || !stagedJsonText.trim()) {
    failSelectedZonePackage('BLOCKED_STAGED_JSON', 'StagedJSON must be non-empty text when present.');
  }
  let parsed;
  try { parsed = JSON.parse(stagedJsonText); }
  catch (error) { failSelectedZonePackage('BLOCKED_STAGED_JSON', 'StagedJSON is not valid JSON.', error?.message); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    failSelectedZonePackage('BLOCKED_STAGED_JSON', 'StagedJSON root must be an object.');
  }
  return { path: SELECTED_ZONE_PACKAGE_PATHS.stagedJson, role: 'STAGED_JSON', schema: parsed.schema || null, content: stagedJsonText, required: false };
}

function auditPayload(audit) {
  const payload = structuredClone(audit);
  delete payload.auditId;
  return payload;
}

export async function calculateSelectedZonePackageAuditId(audit) {
  return sha256Hex(`FbxSelectedZonePackageAudit.v1\0${canonicalJson(auditPayload(audit))}`);
}

function authorityRecord(stagedPresent) {
  return {
    engineeringSemantics: stagedPresent ? SELECTED_ZONE_PACKAGE_PATHS.stagedJson : SELECTED_ZONE_PACKAGE_STATUS.omittedBlocked,
    occurrenceAndTransform: SELECTED_ZONE_PACKAGE_PATHS.zoneGeometryEvidence,
    topologyAndBuffers: SELECTED_ZONE_PACKAGE_PATHS.geometryManifest,
    supportSemantics: SELECTED_ZONE_PACKAGE_STATUS.notAuthorized,
  };
}

async function buildAudit({ producerRevision, geometryManifest, zoneEvidence, files, stagedPresent }) {
  const audit = {
    schema: FBX_SELECTED_ZONE_PACKAGE_AUDIT_SCHEMA,
    auditId: '0'.repeat(64),
    packageStatus: SELECTED_ZONE_PACKAGE_STATUS.evidenceReady,
    producerRevision,
    sourceIdentity: structuredClone(geometryManifest.sourceIdentity),
    parserIdentity: structuredClone(geometryManifest.parserIdentity),
    selectedSourceGraphSha256: geometryManifest.selectedSourceGraphSha256,
    sourceGeometryBundleSourceGraphSha256: geometryManifest.sourceGeometryBundleSourceGraphSha256,
    sourceGeometryBundleDigest: geometryManifest.sourceGeometryBundleDigest,
    selectedZone: structuredClone(zoneEvidence.selectedZone),
    authority: authorityRecord(stagedPresent),
    files: files.map((item) => structuredClone(item)),
  };
  audit.auditId = await calculateSelectedZonePackageAuditId(audit);
  return deepFreeze(audit);
}

function copiedContent(content) {
  if (typeof content === 'string') return content;
  return bytesOf(content).slice().buffer;
}

async function fileAndRecord(file) {
  const record = await presentRecord(file);
  return { file: Object.freeze({ ...file, content: copiedContent(file.content) }), record };
}

function freezePackage(value) {
  Object.freeze(value.files);
  return Object.freeze(value);
}

export async function buildSelectedZonePackageCore({
  sourceGraph,
  zoneGeometryEvidence,
  geometryBundle,
  producerRevision,
  stagedJsonText = null,
  stagedJsonOmissionReason = 'StagedJSON was not produced by the accepted semantic pipeline.',
  supportEvidenceOmissionReason = 'Support evidence is not implemented in Phase 1.',
}) {
  if (!REVISION.test(producerRevision || '')) {
    failSelectedZonePackage('BLOCKED_PACKAGE_AUDIT', 'producerRevision must be an exact Git revision.');
  }
  let canonicalSourceGraph;
  try { canonicalSourceGraph = enforceSourceGraphPolicy(sourceGraph); }
  catch (error) { failSelectedZonePackage('BLOCKED_SOURCE_GRAPH_BINDING',
    'Selected source graph failed policy enforcement.', error?.message || String(error)); }
  const geometryManifest = await buildSelectedZoneGeometryManifest({
    geometryBundle, zoneEvidence: zoneGeometryEvidence, selectedSourceGraph: canonicalSourceGraph,
  });
  const staged = stagedFile(stagedJsonText);
  const coreFiles = [
    { path: SELECTED_ZONE_PACKAGE_PATHS.sourceGraph, role: 'SOURCE_GRAPH', schema: canonicalSourceGraph.schema, content: canonicalJson(canonicalSourceGraph) },
    { path: SELECTED_ZONE_PACKAGE_PATHS.zoneGeometryEvidence, role: 'ZONE_GEOMETRY_EVIDENCE', schema: zoneGeometryEvidence.schema, content: canonicalJson(zoneGeometryEvidence) },
    { path: SELECTED_ZONE_PACKAGE_PATHS.geometryManifest, role: 'GEOMETRY_MANIFEST', schema: geometryManifest.schema, content: canonicalJson(geometryManifest) },
    ...geometryBufferFiles(geometryBundle, geometryManifest),
    ...(staged ? [staged] : []),
  ];
  const bound = await Promise.all(coreFiles.map(fileAndRecord));
  const omitted = [
    omittedRecord({ path: SELECTED_ZONE_PACKAGE_PATHS.supportEvidence, role: 'SUPPORT_EVIDENCE', reason: nonEmptyReason(supportEvidenceOmissionReason, 'Support evidence omission') }),
    ...(staged ? [] : [omittedRecord({ path: SELECTED_ZONE_PACKAGE_PATHS.stagedJson, role: 'STAGED_JSON', reason: nonEmptyReason(stagedJsonOmissionReason, 'StagedJSON omission') })]),
  ];
  const audit = await buildAudit({ producerRevision, geometryManifest, zoneEvidence: zoneGeometryEvidence,
    files: [...bound.map((item) => item.record), ...omitted], stagedPresent: Boolean(staged) });
  const auditFile = await fileAndRecord({ path: SELECTED_ZONE_PACKAGE_PATHS.audit, role: 'PACKAGE_AUDIT', schema: audit.schema, content: canonicalJson(audit) });
  return freezePackage({ schema: FBX_SELECTED_ZONE_PACKAGE_SCHEMA, audit, geometryManifest,
    files: [...bound.map((item) => item.file), auditFile.file] });
}

function fileMap(packageValue) {
  if (!Array.isArray(packageValue?.files)) failSelectedZonePackage('BLOCKED_PACKAGE_SHAPE', 'Package files are missing.');
  const map = new Map(packageValue.files.map((item) => [item.path, item]));
  if (map.size !== packageValue.files.length) failSelectedZonePackage('BLOCKED_PACKAGE_SHAPE', 'Package file paths are duplicate.');
  return map;
}

function validateAuditShape(audit) {
  exactObject(audit, AUDIT_KEYS, 'package audit');
  exactObject(audit.authority, AUTHORITY_KEYS, 'package audit authority');
  if (audit.schema !== FBX_SELECTED_ZONE_PACKAGE_AUDIT_SCHEMA
    || audit.packageStatus !== SELECTED_ZONE_PACKAGE_STATUS.evidenceReady
    || !REVISION.test(audit.producerRevision || '') || !Array.isArray(audit.files)) {
    failSelectedZonePackage('BLOCKED_PACKAGE_AUDIT', 'Package audit identity is invalid.');
  }
  audit.files.forEach((item) => exactObject(item, FILE_RECORD_KEYS, 'package audit file record'));
}

function verifyFileSet(audit, files) {
  const present = audit.files.filter((item) => item.status === SELECTED_ZONE_PACKAGE_STATUS.present);
  const expected = new Set([SELECTED_ZONE_PACKAGE_PATHS.audit, ...present.map((item) => item.path)]);
  const omitted = audit.files.filter((item) => item.status === SELECTED_ZONE_PACKAGE_STATUS.omittedBlocked);
  if (files.size !== expected.size || [...files.keys()].some((path) => !expected.has(path))) {
    failSelectedZonePackage('BLOCKED_PACKAGE_FILE', 'Package contains unbound or missing files.');
  }
  if (omitted.some((item) => files.has(item.path))) {
    failSelectedZonePackage('BLOCKED_PACKAGE_FILE', 'An omitted package file was silently published.');
  }
}

async function verifyAuditFiles(audit, files) {
  for (const record of audit.files) {
    if (record.status !== SELECTED_ZONE_PACKAGE_STATUS.present) continue;
    const file = files.get(record.path);
    if (!file) failSelectedZonePackage('BLOCKED_PACKAGE_FILE', `${record.path} is absent.`);
    const bytes = bytesOf(file.content);
    if (bytes.byteLength !== record.byteLength || await sha256Hex(bytes) !== record.sha256) {
      failSelectedZonePackage('BLOCKED_PACKAGE_FILE', `${record.path} differs from package audit.`);
    }
  }
}

async function verifyPublishedJson(files, path, expected) {
  const file = files.get(path);
  if (!file || typeof file.content !== 'string' || file.content !== canonicalJson(expected)) {
    failSelectedZonePackage('BLOCKED_PACKAGE_FILE', `${path} does not match the bound object.`);
  }
}

export async function validateSelectedZonePackageCore(packageValue) {
  if (packageValue?.schema !== FBX_SELECTED_ZONE_PACKAGE_SCHEMA) {
    failSelectedZonePackage('BLOCKED_PACKAGE_SHAPE', 'Expected FbxSelectedZonePackage.v1.');
  }
  const files = fileMap(packageValue);
  validateAuditShape(packageValue.audit);
  verifyFileSet(packageValue.audit, files);
  await validateSelectedZoneGeometryManifest(packageValue.geometryManifest);
  if (await calculateSelectedZoneGeometryManifestDigest(packageValue.geometryManifest)
    !== packageValue.geometryManifest.manifestDigest) {
    failSelectedZonePackage('BLOCKED_GEOMETRY_MANIFEST', 'Geometry manifest changed after assembly.');
  }
  if (!HASH.test(packageValue.audit?.auditId || '')
    || await calculateSelectedZonePackageAuditId(packageValue.audit) !== packageValue.audit.auditId) {
    failSelectedZonePackage('BLOCKED_PACKAGE_AUDIT', 'Package audit identity is invalid.');
  }
  await verifyAuditFiles(packageValue.audit, files);
  await verifyPublishedJson(files, SELECTED_ZONE_PACKAGE_PATHS.geometryManifest, packageValue.geometryManifest);
  await verifyPublishedJson(files, SELECTED_ZONE_PACKAGE_PATHS.audit, packageValue.audit);
  return packageValue;
}
