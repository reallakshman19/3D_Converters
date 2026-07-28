import { canonicalJson, deepFreeze } from '../canonical-json.js';
import { sha256Hex } from '../sha256.js';
import { domainId, packageContentDigest, packageId } from './identity.js';
import { FBX_SUPPORT_PACKAGE_SCHEMA } from './profile.js';

export async function digestEntries(entries) {
  return Promise.all(entries.map(async (entry) => Object.freeze({
    path: entry.path,
    byteLength: entry.bytes.byteLength,
    sha256: await sha256Hex(entry.bytes),
    mediaType: entry.mediaType,
    artifactSchema: entry.artifactSchema || null,
    artifactId: entry.artifactId || null,
    bufferRole: entry.bufferRole || null,
    sourceGeometryObjectId: entry.sourceGeometryObjectId || null,
  })));
}

function artifactEntries(digests) {
  return digests.filter((entry) => entry.artifactSchema).map((entry) => ({
    path: entry.path, schema: entry.artifactSchema, artifactId: entry.artifactId,
    sha256: entry.sha256, byteLength: entry.byteLength, required: true, disposition: 'INCLUDED',
  }));
}

function bufferEntries(digests) {
  return digests.filter((entry) => entry.bufferRole).map((entry) => ({
    path: entry.path, bufferId: `fbx-engineering-buffer:${entry.sha256}`,
    sourceGeometryObjectId: entry.sourceGeometryObjectId, bufferRole: entry.bufferRole,
    mediaType: entry.mediaType, elementType: entry.bufferRole === 'control-points-mm'
      ? 'Float64' : 'Uint32', endianness: 'little', byteLength: entry.byteLength,
    sha256: entry.sha256,
  }));
}

export async function buildPackageManifest({ zoneGeometryEvidence, supportResult,
  payloadDigests, stagedJsonDisposition, stagedJsonBlockStatus, canonicalEntryOrder }) {
  const core = {
    schema: FBX_SUPPORT_PACKAGE_SCHEMA,
    sourceIdentity: structuredClone(zoneGeometryEvidence.sourceIdentity),
    parserIdentity: structuredClone(zoneGeometryEvidence.parserIdentity),
    sourceGraphSha256: zoneGeometryEvidence.sourceGraphSha256,
    geometryBundleDigest: zoneGeometryEvidence.geometryBundleDigest,
    sourceZoneGeometryArtifactId: zoneGeometryEvidence.artifactId,
    selectedZone: structuredClone(zoneGeometryEvidence.selectedZone),
    analysisProfileSha256: supportResult.supportEvidence.analysisProfileSha256,
    includedArtifacts: artifactEntries(payloadDigests),
    includedBinaryBuffers: bufferEntries(payloadDigests),
    stagedJsonDisposition,
    stagedJsonBlockStatus,
    supportDisposition: supportResult.status,
    conservation: {
      payloadEntryCount: payloadDigests.length,
      artifactEntryCount: artifactEntries(payloadDigests).length,
      binaryBufferEntryCount: bufferEntries(payloadDigests).length,
      selectedGeometryCount: zoneGeometryEvidence.conservation.selectedGeometryCount,
      admittedSupportCount: supportResult.counts.admittedSupportCount,
    },
    canonicalEntryOrder,
    archiveFormat: 'ZIP',
    archiveDeterminismProfile: 'FBX_ENGINEERING_ZIP_STORE_V1',
  };
  const packageDigest = await packageContentDigest({ manifestCore: core,
    payloadEntries: payloadDigests.map((entry) => ({ path: entry.path, sha256: entry.sha256,
      byteLength: entry.byteLength })) });
  const id = await packageId(packageDigest);
  return deepFreeze({ ...core, packageId: id, packageDigest });
}

export async function buildPackageAudit(manifest, payloadDigests) {
  const core = {
    schema: 'FbxSelectedZoneEngineeringPackageAudit.v1',
    packageId: manifest.packageId,
    packageDigest: manifest.packageDigest,
    archiveTransportDigestDisposition: 'EXTERNAL_AFTER_ARCHIVE_COMPLETION',
    archiveProfile: {
      compressionMethod: 'STORE',
      compressionLevel: 'NOT_APPLICABLE',
      timestamp: '1980-01-01T00:00:00Z',
      permissions: '0644',
      pathSeparator: '/',
      extraFields: 'NONE',
      entryComments: 'NONE',
      archiveComment: 'NONE',
    },
    payloadEntries: payloadDigests.map((entry) => ({ path: entry.path,
      sha256: entry.sha256, byteLength: entry.byteLength })),
  };
  const auditId = await domainId('fbx-engineering-package-audit',
    'fbx-engineering-package-audit/v1', core);
  return deepFreeze({ ...core, auditId });
}

export function manifestBytes(value) {
  return new TextEncoder().encode(canonicalJson(value));
}
