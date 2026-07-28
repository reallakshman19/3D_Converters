import { canonicalJson, deepFreeze } from '../canonical-json.js';
import { FBX_GEOMETRY_BUNDLE_SCHEMA, validateFbxGeometryBundle } from '../geometry-bundle.js';
import { sha256Hex } from '../sha256.js';
import {
  FBX_SELECTED_ZONE_GEOMETRY_MANIFEST_SCHEMA,
  failSelectedZonePackage,
} from './constants.js';

const HASH = /^[0-9a-f]{64}$/;
const ARTIFACT_ID = /^fbx-zone-geometry-evidence:[0-9a-f]{64}$/;
const ROLE = /^(control-points-mm|polygon-offsets|polygon-vertex-indices)$/;
const TOP_KEYS = [
  'schema', 'manifestDigest', 'sourceGraphSchema', 'selectedSourceGraphSha256',
  'sourceGeometryBundleSourceGraphSha256',
  'sourceIdentity', 'parserIdentity', 'coordinateUnit', 'byteOrder',
  'sourceGeometryBundleDigest', 'zoneGeometryEvidenceId', 'selectedZone',
  'selectedGeometryIds', 'geometries', 'buffers',
];
const BUFFER_KEYS = [
  'bufferId', 'geometryObjectId', 'role', 'scalarType', 'componentCount',
  'count', 'alignment', 'byteLength', 'sha256', 'packagePath',
];

function exactObject(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    failSelectedZonePackage('BLOCKED_PACKAGE_SHAPE', `${label} must be an object.`);
  }
  const actual = Object.keys(value).sort().join('\0');
  if (actual !== [...keys].sort().join('\0')) {
    failSelectedZonePackage('BLOCKED_PACKAGE_SHAPE', `${label} fields are invalid.`);
  }
  return value;
}

function equalCanonical(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function selectedGeometryIds(zoneEvidence) {
  const ids = zoneEvidence?.selectedGeometryIds;
  if (!Array.isArray(ids) || !ids.length || new Set(ids).size !== ids.length) {
    failSelectedZonePackage('BLOCKED_ZONE_BINDING', 'Selected geometry identities are incomplete or duplicate.');
  }
  return ids.map(String);
}

function sorted(values) {
  return [...values].map(String).sort();
}

function validateSelectedSourceGraph(graph, zoneEvidence) {
  if (graph?.schema !== 'FbxSourceGraph.v2' || !Array.isArray(graph.occurrences)
    || !Array.isArray(graph.geometries)) {
    failSelectedZonePackage('BLOCKED_SOURCE_GRAPH_BINDING', 'Expected selected-zone FbxSourceGraph.v2.');
  }
  const expectedOccurrences = sorted([
    ...(zoneEvidence.selectedOccurrenceIds || []), ...(zoneEvidence.ancestorOccurrenceIds || []),
  ]);
  const observedOccurrences = sorted(graph.occurrences.map((item) => item.sourceOccurrenceId));
  const observedGeometries = sorted(graph.geometries.map((item) => item.geometryObjectId));
  if (canonicalJson(expectedOccurrences) !== canonicalJson(observedOccurrences)
    || canonicalJson(sorted(zoneEvidence.selectedGeometryIds || [])) !== canonicalJson(observedGeometries)) {
    failSelectedZonePackage('BLOCKED_SOURCE_GRAPH_BINDING', 'Selected source graph scope differs from zone evidence.');
  }
}

async function validateZoneEvidence(zoneEvidence, geometryBundle) {
  if (zoneEvidence?.schema !== 'FbxZoneGeometryEvidence.v1' || !ARTIFACT_ID.test(zoneEvidence.artifactId || '')) {
    failSelectedZonePackage('BLOCKED_ZONE_BINDING', 'Expected identified FbxZoneGeometryEvidence.v1.');
  }
  const body = structuredClone(zoneEvidence);
  delete body.schema; delete body.artifactId;
  const expectedId = `fbx-zone-geometry-evidence:${await sha256Hex(
    `FbxZoneGeometryEvidence.v1\0${canonicalJson(body)}`,
  )}`;
  if (zoneEvidence.artifactId !== expectedId) {
    failSelectedZonePackage('BLOCKED_ZONE_BINDING', 'Zone geometry evidence identity is invalid.');
  }
  const manifest = geometryBundle.manifest;
  if (zoneEvidence.sourceGraphSha256 !== manifest.sourceGraphSha256
    || zoneEvidence.geometryBundleDigest !== manifest.bundleDigest) {
    failSelectedZonePackage('BLOCKED_ZONE_BINDING', 'Zone evidence differs from the accepted geometry bundle.');
  }
  if (!equalCanonical(zoneEvidence.sourceIdentity, manifest.sourceIdentity)
    || !equalCanonical(zoneEvidence.parserIdentity, manifest.parserIdentity)) {
    failSelectedZonePackage('BLOCKED_ZONE_BINDING', 'Zone evidence source or parser identity differs.');
  }
}

function packagePath(descriptor) {
  if (!/^\d+$/.test(descriptor.geometryObjectId) || !ROLE.test(descriptor.role)) {
    failSelectedZonePackage('BLOCKED_GEOMETRY_BINDING', 'Geometry buffer identity is unsafe for package publication.');
  }
  return `geometry-buffers/${descriptor.geometryObjectId}.${descriptor.role}.bin`;
}

function selectGeometries(manifest, ids) {
  const byId = new Map(manifest.geometries.map((item) => [item.geometryObjectId, item]));
  const selected = ids.map((id) => byId.get(id));
  if (selected.some((item) => !item)) {
    failSelectedZonePackage('BLOCKED_GEOMETRY_BINDING', 'Selected geometry is absent from the accepted bundle.');
  }
  return selected.map((item) => structuredClone(item));
}

function selectBuffers(manifest, ids) {
  const selected = new Set(ids);
  return manifest.buffers.filter((item) => selected.has(item.geometryObjectId)).map((item) => ({
    ...structuredClone(item),
    packagePath: packagePath(item),
  }));
}

function validateSelectedCollections(manifest) {
  if (!Array.isArray(manifest.selectedGeometryIds) || !Array.isArray(manifest.geometries)
    || !Array.isArray(manifest.buffers) || !manifest.selectedGeometryIds.length) {
    failSelectedZonePackage('BLOCKED_GEOMETRY_MANIFEST', 'Selected geometry collections are invalid.');
  }
  const geometryIds = manifest.geometries.map((item) => item.geometryObjectId);
  if (canonicalJson(geometryIds) !== canonicalJson(manifest.selectedGeometryIds)
    || new Set(geometryIds).size !== geometryIds.length
    || manifest.buffers.length !== geometryIds.length * 3) {
    failSelectedZonePackage('BLOCKED_GEOMETRY_MANIFEST', 'Selected geometry conservation is invalid.');
  }
  const paths = new Set();
  for (const item of manifest.buffers) {
    exactObject(item, BUFFER_KEYS, 'selected-zone buffer descriptor');
    if (item.packagePath !== packagePath(item) || paths.has(item.packagePath)) {
      failSelectedZonePackage('BLOCKED_GEOMETRY_MANIFEST', 'Selected buffer package path is invalid.');
    }
    paths.add(item.packagePath);
  }
}

function digestPayload(manifest) {
  const payload = structuredClone(manifest);
  delete payload.manifestDigest;
  return payload;
}

export async function calculateSelectedZoneGeometryManifestDigest(manifest) {
  return sha256Hex(`FbxSelectedZoneGeometryManifest.v1\0${canonicalJson(digestPayload(manifest))}`);
}

export async function validateSelectedZoneGeometryManifest(manifest) {
  exactObject(manifest, TOP_KEYS, 'selected-zone geometry manifest');
  if (manifest.schema !== FBX_SELECTED_ZONE_GEOMETRY_MANIFEST_SCHEMA
    || manifest.sourceGraphSchema !== 'FbxSourceGraph.v2'
    || manifest.coordinateUnit !== 'millimetre'
    || manifest.byteOrder !== 'little-endian') {
    failSelectedZonePackage('BLOCKED_GEOMETRY_MANIFEST', 'Selected-zone geometry manifest identity is invalid.');
  }
  for (const hash of [manifest.manifestDigest, manifest.selectedSourceGraphSha256,
    manifest.sourceGeometryBundleSourceGraphSha256, manifest.sourceGeometryBundleDigest]) {
    if (!HASH.test(hash || '')) failSelectedZonePackage('BLOCKED_GEOMETRY_MANIFEST', 'Manifest digest identity is invalid.');
  }
  if (!ARTIFACT_ID.test(manifest.zoneGeometryEvidenceId || '')) {
    failSelectedZonePackage('BLOCKED_GEOMETRY_MANIFEST', 'Zone evidence identity is invalid.');
  }
  validateSelectedCollections(manifest);
  if (await calculateSelectedZoneGeometryManifestDigest(manifest) !== manifest.manifestDigest) {
    failSelectedZonePackage('BLOCKED_GEOMETRY_MANIFEST', 'Selected-zone geometry manifest digest is invalid.');
  }
  return manifest;
}

export async function buildSelectedZoneGeometryManifest({ geometryBundle, zoneEvidence, selectedSourceGraph }) {
  await validateFbxGeometryBundle(geometryBundle);
  if (geometryBundle.manifest.schema !== FBX_GEOMETRY_BUNDLE_SCHEMA) {
    failSelectedZonePackage('BLOCKED_GEOMETRY_BINDING', 'Expected FbxGeometryBundle.v1.');
  }
  await validateZoneEvidence(zoneEvidence, geometryBundle);
  validateSelectedSourceGraph(selectedSourceGraph, zoneEvidence);
  const ids = selectedGeometryIds(zoneEvidence);
  const selectedSourceGraphSha256 = await sha256Hex(canonicalJson(selectedSourceGraph));
  const draft = {
    schema: FBX_SELECTED_ZONE_GEOMETRY_MANIFEST_SCHEMA,
    manifestDigest: '0'.repeat(64),
    sourceGraphSchema: geometryBundle.manifest.sourceGraphSchema,
    selectedSourceGraphSha256,
    sourceGeometryBundleSourceGraphSha256: geometryBundle.manifest.sourceGraphSha256,
    sourceIdentity: structuredClone(geometryBundle.manifest.sourceIdentity),
    parserIdentity: structuredClone(geometryBundle.manifest.parserIdentity),
    coordinateUnit: geometryBundle.manifest.coordinateUnit,
    byteOrder: geometryBundle.manifest.byteOrder,
    sourceGeometryBundleDigest: geometryBundle.manifest.bundleDigest,
    zoneGeometryEvidenceId: zoneEvidence.artifactId,
    selectedZone: structuredClone(zoneEvidence.selectedZone),
    selectedGeometryIds: ids,
    geometries: selectGeometries(geometryBundle.manifest, ids),
    buffers: selectBuffers(geometryBundle.manifest, ids),
  };
  draft.manifestDigest = await calculateSelectedZoneGeometryManifestDigest(draft);
  await validateSelectedZoneGeometryManifest(draft);
  return deepFreeze(draft);
}
