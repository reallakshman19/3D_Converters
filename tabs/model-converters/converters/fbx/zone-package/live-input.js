import { buildSelectedZoneGeometryManifest } from './geometry-manifest.js';
import { fail } from './constants.js';

function bytesView(value, label) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  fail('ZONE_PACKAGE_INVALID_BUFFER', `${label} must be bytes.`);
}

function valuesFromSelection(selection, role) {
  const item = selection.buffers.find((candidate) => candidate.role === role);
  if (!item) fail('ZONE_PACKAGE_MISSING_BUFFERS', `selected geometry ${selection.geometry.geometryObjectId} lacks ${role}.`);
  const bytes = bytesView(item.buffer.bytes, role);
  const scalarType = item.descriptor.scalarType;
  const bytesPerValue = scalarType === 'Float64' ? 8 : scalarType === 'Uint32' ? 4 : 0;
  if (!bytesPerValue || bytes.byteLength % bytesPerValue !== 0) {
    fail('ZONE_PACKAGE_INVALID_BUFFER', `selected geometry ${selection.geometry.geometryObjectId} has invalid ${role} bytes.`);
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), values = [];
  for (let offset = 0; offset < bytes.byteLength; offset += bytesPerValue) {
    values.push(scalarType === 'Float64' ? view.getFloat64(offset, true) : view.getUint32(offset, true));
  }
  return values;
}

function owningOccurrences(scope, geometryId) {
  const ids = scope.selectedOccurrences
    .filter((occurrence) => occurrence.geometryObjectIds.includes(geometryId))
    .map((occurrence) => occurrence.sourceOccurrenceId).sort();
  if (!ids.length) fail('ZONE_PACKAGE_INVALID_IDENTITY', `selected geometry ${geometryId} has no owning selected occurrence.`);
  return ids;
}

export async function buildLiveZonePackageInputs({
  zoneGeometryEvidence, scope, selections, stagedJsonText = null,
} = {}) {
  if (!zoneGeometryEvidence || !scope || !Array.isArray(selections)) {
    fail('ZONE_PACKAGE_INVALID_INPUT', 'validated zone evidence, scope, and selections are required.');
  }
  const geometries = selections.map((selection) => {
    const geometryId = selection.geometry.geometryObjectId;
    return { geometryId, sourceObjectId: selection.geometry.sourceObjectId,
      occurrenceIds: owningOccurrences(scope, geometryId),
      controlPointsMm: valuesFromSelection(selection, 'control-points-mm'),
      polygonOffsets: valuesFromSelection(selection, 'polygon-offsets'),
      polygonVertexIndices: valuesFromSelection(selection, 'polygon-vertex-indices') };
  });
  const { manifest, buffersByGeometryId } = await buildSelectedZoneGeometryManifest({
    completeSourceGraphSha256: zoneGeometryEvidence.sourceGraphSha256,
    sourceIdentity: zoneGeometryEvidence.sourceIdentity, geometries,
  });
  return { manifest, buffersByGeometryId, stagedJsonText, supportEvidence: null };
}
