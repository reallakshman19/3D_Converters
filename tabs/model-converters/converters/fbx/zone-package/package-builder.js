import { canonicalJson } from '../canonical-json.js';
import { sha256Hex } from '../sha256.js';
import { FBX_ZONE_PACKAGE_LIMITS, FBX_ZONE_PACKAGE_SCHEMAS, fail } from './constants.js';

function textFile(path, text) {
  return { path, bytes: new TextEncoder().encode(text) };
}

function geometryFiles(manifest, buffersByGeometryId) {
  const files = [];
  for (const entry of manifest.geometries) {
    const raw = buffersByGeometryId.get(entry.geometryId);
    if (!raw) fail('ZONE_PACKAGE_MISSING_BUFFERS', `no raw buffers supplied for geometryId ${entry.geometryId}.`);
    files.push(textFile(entry.packagePath, canonicalJson({
      geometryId: entry.geometryId,
      sourceObjectId: entry.sourceObjectId,
      occurrenceId: entry.occurrenceId,
      controlPointCount: entry.controlPointCount,
      polygonCount: entry.polygonCount,
    })));
    for (const buffer of entry.buffers) {
      const raw2 = raw[buffer.role];
      if (!raw2 || raw2.sha256 !== buffer.sha256) fail('ZONE_PACKAGE_BUFFER_MISMATCH', `raw buffer for ${entry.geometryId}/${buffer.role} does not match the manifest digest.`);
      files.push({ path: buffer.packagePath, bytes: raw2.bytes });
    }
  }
  return files;
}

async function hashedFile(file) {
  return { ...file, sha256: await sha256Hex(file.bytes) };
}

function fileRole(role, path, hashedFileEntry) {
  return {
    role, path: hashedFileEntry ? hashedFileEntry.path : path,
    disposition: hashedFileEntry ? 'PRESENT' : 'OMITTED_BLOCKED',
    sha256: hashedFileEntry ? hashedFileEntry.sha256 : null,
  };
}

/**
 * Phase 1/6 kernel: assembles the exact, deterministic binary file set for a
 * selected-zone package (manifest + geometry buffers + optional StagedJSON
 * and support evidence) and a governed audit describing exactly which
 * optional roles are present versus explicitly blocked. This function is
 * transport-agnostic; the browser export addon (Phase 6) only turns the
 * returned files into a downloadable archive.
 */
export async function buildSelectedZonePackage({
  manifest, buffersByGeometryId, stagedJsonText = null, supportEvidence = null,
} = {}) {
  if (!manifest || manifest.schema !== FBX_ZONE_PACKAGE_SCHEMAS.geometryManifest) {
    fail('ZONE_PACKAGE_INVALID_MANIFEST', 'manifest must be a validated FbxSelectedZoneGeometryManifest.v1.');
  }
  const manifestFile = await hashedFile(textFile('manifest.json', canonicalJson(manifest)));
  const geometryFileList = await Promise.all(geometryFiles(manifest, buffersByGeometryId).map(hashedFile));
  const stagedJsonFile = stagedJsonText == null ? null : await hashedFile(textFile('stagedjson.json', stagedJsonText));
  const supportEvidenceFile = supportEvidence == null
    ? null : await hashedFile(textFile('support-evidence.json', canonicalJson(supportEvidence)));
  const allFiles = [manifestFile, ...geometryFileList, ...(stagedJsonFile ? [stagedJsonFile] : []), ...(supportEvidenceFile ? [supportEvidenceFile] : [])]
    .sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));
  if (allFiles.length > FBX_ZONE_PACKAGE_LIMITS.maxPackageFiles) {
    fail('ZONE_PACKAGE_LIMIT_EXCEEDED', `package file count exceeds the admitted limit of ${FBX_ZONE_PACKAGE_LIMITS.maxPackageFiles}.`);
  }
  const fileRoles = [
    fileRole('MANIFEST', 'manifest.json', manifestFile),
    fileRole('STAGEDJSON', 'stagedjson.json', stagedJsonFile),
    fileRole('SUPPORT_EVIDENCE', 'support-evidence.json', supportEvidenceFile),
  ];
  const packagePayload = {
    schema: FBX_ZONE_PACKAGE_SCHEMAS.packageAudit,
    manifestSha256: manifestFile.sha256,
    fileRoles,
    supportSemantics: supportEvidenceFile ? 'CANDIDATE_EVIDENCE_ONLY' : 'NOT_AUTHORIZED',
    geometryCount: manifest.geometries.length,
  };
  const packageDigest = await sha256Hex(canonicalJson([...allFiles.map((file) => [file.path, file.sha256]), packagePayload]));
  const audit = { ...packagePayload, packageDigest };
  const auditFile = await hashedFile(textFile('audit.json', canonicalJson(audit)));
  return { files: [...allFiles, auditFile], audit };
}
