import { canonicalJson, deepFreeze } from '../canonical-json.js';
import { sha256Hex } from '../sha256.js';
import { encodeSelectedGeometryBuffers } from './geometry-buffers.js';
import {
  FBX_ZONE_PACKAGE_BUFFER_ROLES, FBX_ZONE_PACKAGE_LIMITS, FBX_ZONE_PACKAGE_SCHEMAS, fail,
} from './constants.js';

const HASH = /^[0-9a-f]{64}$/;
const DECIMAL_ID = /^(0|[1-9]\d{0,19})$/;

function requireDecimalId(value, label) {
  if (typeof value !== 'string' || !DECIMAL_ID.test(value)) fail('ZONE_PACKAGE_INVALID_IDENTITY', `${label} must be a decimal-string identity.`);
  return value;
}

function requireHash(value, label) {
  if (typeof value !== 'string' || !HASH.test(value)) fail('ZONE_PACKAGE_INVALID_IDENTITY', `${label} must be a lowercase SHA-256 hex digest.`);
  return value;
}

function requireSourceIdentity(value) {
  if (!value || typeof value !== 'object') fail('ZONE_PACKAGE_INVALID_IDENTITY', 'sourceIdentity must be an object.');
  requireHash(value.sha256, 'sourceIdentity.sha256');
  if (!Number.isSafeInteger(value.byteLength) || value.byteLength < 1) fail('ZONE_PACKAGE_INVALID_IDENTITY', 'sourceIdentity.byteLength must be a positive integer.');
  if (!Number.isInteger(value.fbxVersion) || value.fbxVersion < 3000 || value.fbxVersion > 7700) fail('ZONE_PACKAGE_INVALID_IDENTITY', 'sourceIdentity.fbxVersion is out of the admitted range.');
  return { sha256: value.sha256, byteLength: value.byteLength, fbxVersion: value.fbxVersion };
}

function bufferPackagePath(geometryId, role) {
  return `geometries/${geometryId}/${role}.bin`;
}

async function buildManifestGeometry(entry) {
  requireDecimalId(entry.geometryId, 'geometryId');
  requireDecimalId(entry.sourceObjectId, 'sourceObjectId');
  if (typeof entry.occurrenceId !== 'string' || !entry.occurrenceId.trim()) fail('ZONE_PACKAGE_INVALID_IDENTITY', 'occurrenceId must be non-empty text.');
  const encoded = await encodeSelectedGeometryBuffers(entry);
  const buffers = FBX_ZONE_PACKAGE_BUFFER_ROLES.map((role) => {
    const buffer = encoded.buffers[role];
    return {
      role, scalarType: buffer.scalarType, componentCount: buffer.componentCount,
      count: buffer.count, byteLength: buffer.byteLength, sha256: buffer.sha256,
      packagePath: bufferPackagePath(entry.geometryId, role),
    };
  });
  return {
    manifestEntry: {
      geometryId: entry.geometryId,
      sourceObjectId: entry.sourceObjectId,
      occurrenceId: entry.occurrenceId,
      controlPointCount: encoded.controlPointCount,
      polygonCount: encoded.polygonCount,
      packagePath: `geometries/${entry.geometryId}/geometry.json`,
      buffers,
    },
    rawBuffers: encoded.buffers,
  };
}

function compareDecimalId(left, right) {
  const a = BigInt(left), b = BigInt(right);
  return a < b ? -1 : a > b ? 1 : 0;
}

async function selectedZoneDigest(geometries) {
  const identity = geometries.map((item) => `${item.occurrenceId}:${item.geometryId}`).sort();
  return sha256Hex(canonicalJson(identity));
}

/**
 * Phase 1 kernel: projects the exact set of selected-zone occurrences into a
 * deterministic FbxSelectedZoneGeometryManifest.v1, and returns the raw
 * geometry buffers alongside it so a package builder can emit byte-identical
 * files without re-deriving anything.
 */
export async function buildSelectedZoneGeometryManifest({ completeSourceGraphSha256, sourceIdentity, geometries } = {}) {
  requireHash(completeSourceGraphSha256, 'completeSourceGraphSha256');
  const identity = requireSourceIdentity(sourceIdentity);
  if (!Array.isArray(geometries) || !geometries.length) fail('ZONE_PACKAGE_EMPTY_SELECTION', 'geometries must be a non-empty array.');
  if (geometries.length > FBX_ZONE_PACKAGE_LIMITS.maxSelectedGeometries) {
    fail('ZONE_PACKAGE_LIMIT_EXCEEDED', `geometries exceeds the admitted limit of ${FBX_ZONE_PACKAGE_LIMITS.maxSelectedGeometries}.`);
  }
  const seen = new Set();
  const built = await Promise.all(geometries.map(async (entry) => {
    if (seen.has(entry.geometryId)) fail('ZONE_PACKAGE_DUPLICATE_GEOMETRY', `duplicate geometryId ${entry.geometryId}.`);
    seen.add(entry.geometryId);
    return buildManifestGeometry(entry);
  }));
  built.sort((left, right) => compareDecimalId(left.manifestEntry.geometryId, right.manifestEntry.geometryId));
  const manifestGeometries = built.map((item) => item.manifestEntry);
  const zoneDigest = await selectedZoneDigest(manifestGeometries);
  const payload = {
    schema: FBX_ZONE_PACKAGE_SCHEMAS.geometryManifest,
    completeSourceGraphSha256,
    selectedZoneDigest: zoneDigest,
    sourceIdentity: identity,
    geometries: manifestGeometries,
  };
  const manifestDigest = await sha256Hex(canonicalJson(payload));
  const manifest = deepFreeze({ ...payload, manifestDigest });
  const buffersByGeometryId = new Map(built.map((item) => [item.manifestEntry.geometryId, item.rawBuffers]));
  return { manifest, buffersByGeometryId };
}
