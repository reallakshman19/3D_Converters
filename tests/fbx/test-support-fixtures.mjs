import { canonicalJson } from '../../tabs/model-converters/converters/fbx/canonical-json.js';
import { sha256Hex } from '../../tabs/model-converters/converters/fbx/sha256.js';
export const ROOT = new URL('../../', import.meta.url);
export const IDENTITY_MATRIX = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];
const HASH = '0'.repeat(64);

function arrayBuffer(Type, values) {
  return new Type(values).buffer;
}

export function boxSelection(geometryObjectId, minimum, maximum) {
  const [x0, y0, z0] = minimum, [x1, y1, z1] = maximum;
  const points = [x0,y0,z0, x1,y0,z0, x1,y1,z0, x0,y1,z0,
    x0,y0,z1, x1,y0,z1, x1,y1,z1, x0,y1,z1];
  const polygons = [[0,3,2,1], [4,5,6,7], [0,1,5,4],
    [1,2,6,5], [2,3,7,6], [3,0,4,7]];
  const offsets = [0], indices = [];
  for (const polygon of polygons) { indices.push(...polygon); offsets.push(indices.length); }
  const geometry = {
    geometryObjectId: String(geometryObjectId), sourceObjectId: String(geometryObjectId),
    controlPointCount: 8, polygonCount: polygons.length, polygonVertexCount: indices.length,
    emptyPolygonCount: 0, pointPolygonCount: 0, linePolygonCount: 0,
    reversedWinding: false, bufferIds: {
      controlPointsMm: `cp-${geometryObjectId}`,
      polygonOffsets: `po-${geometryObjectId}`,
      polygonVertexIndices: `pi-${geometryObjectId}`,
    },
  };
  const specs = [
    ['control-points-mm', Float64Array, points, 3],
    ['polygon-offsets', Uint32Array, offsets, 1],
    ['polygon-vertex-indices', Uint32Array, indices, 1],
  ];
  return { geometry, buffers: specs.map(([role, Type, values, componentCount]) => {
    const data = arrayBuffer(Type, values);
    return { role, descriptor: { bufferId: geometry.bufferIds[role === 'control-points-mm'
      ? 'controlPointsMm' : role === 'polygon-offsets' ? 'polygonOffsets' : 'polygonVertexIndices'],
      geometryObjectId: String(geometryObjectId), role,
      scalarType: Type === Float64Array ? 'Float64' : 'Uint32', componentCount,
      count: values.length / componentCount, alignment: Type.BYTES_PER_ELEMENT,
      byteLength: data.byteLength, sha256: HASH }, buffer: { bytes: data } };
  }) };
}

export function occurrence(id, modelId, geometryIds, matrix = IDENTITY_MATRIX, parent = 'occ:0') {
  return { sourceOccurrenceId: `occ:${id}`, sourceModelObjectId: String(modelId),
    parentOccurrenceId: parent, geometryObjectIds: geometryIds.map(String),
    inheritMode: 0, originalInheritMode: 0, hasGeometryTransform: false,
    geometryMatrixMm: [...matrix] };
}

export function pipeClassification(overrides = {}) {
  return { admitted: true, status: 'PIPE_INFERENCE_PASS', sourceOccurrenceId: 'occ:1',
    sourceModelObjectId: '101', geometryObjectId: '10',
    A: { centreMm: [0,0,0], radiusMm: 50, normal: [-1,0,0], portEvidenceId: 'a' },
    L: { centreMm: [200,0,0], radiusMm: 50, normal: [1,0,0], portEvidenceId: 'l' },
    spanMm: 200, axis: [1,0,0], ...overrides };
}

export function fixture(options = {}) {
  const pipe = boxSelection(10, [0,-50,-50], [200,50,50]);
  const support = boxSelection(20, options.supportMinimum || [40,-5,-100],
    options.supportMaximum || [160,5,-50]);
  const pipeOccurrence = occurrence(1, 101, [10], options.pipeMatrix || IDENTITY_MATRIX);
  const supportOccurrence = occurrence(2, 202, [20], options.supportMatrix || IDENTITY_MATRIX);
  const extraOccurrences = options.extraOccurrences || [];
  const occurrences = [pipeOccurrence, supportOccurrence, ...extraOccurrences];
  const selectedGeometryCount = 2;
  const zoneGeometryEvidence = {
    schema: 'FbxZoneGeometryEvidence.v1', artifactId: `fbx-zone-geometry-evidence:${HASH}`,
    sourceIdentity: { sha256: HASH, byteLength: 100, fbxVersion: 7400 },
    parserIdentity: { provenanceSchema: 'FbxParserProvenance.v1', upstreamRevision: '0'.repeat(40),
      sourceSha256: HASH, wasmSha256: HASH }, sourceGraphSha256: HASH,
    geometryBundleDigest: HASH, coordinateUnit: 'millimetre',
    selectedZone: { zoneId: 'zone-1', label: '/TEST/ZONE' },
    occurrenceEvidence: occurrences, conservation: { selectedOccurrenceCount: occurrences.length,
      selectedGeometryCount, selectedTopologyGeometryCount: selectedGeometryCount,
      ancestorEvidenceCount: 1, sharedGeometryCount: 0,
      siblingExclusiveGeometryIncludedCount: 0, selectedOccurrenceGeometryReferenceCount: 2 },
  };
  const classifications = options.pipeClassifications === undefined
    ? [pipeClassification(options.pipeOverrides)] : options.pipeClassifications;
  const sourceGraph = { sourceObjects: [
    { sourceObjectId: '101', displayName: 'PIPE-101', domSourceName: 'PIPE-101',
      domClass: 'Model', domSubtype: 'Mesh', customProperties: [] },
    { sourceObjectId: '202', displayName: options.supportDisplayName || 'SUPPORT SHOE 202',
      domSourceName: 'SUPPORT SHOE 202', domClass: 'Model', domSubtype: 'Mesh',
      customProperties: [{ name: 'SupportTag', type: 1, flags: 0, valueInt: 0, valueReal: 0,
        valueVec4: [0,0,0,0], valueString: 'S-202' }] },
  ] };
  const autoPipe = { status: options.autoPipeStatus || 'STAGEDJSON_PASS',
    classificationStatus: 'PIPE_INFERENCE_PASS', connectivityStatus: 'PIPE_CONNECTIVITY_PASS',
    classificationDispositions: classifications, internalPipeMapping: null,
    stagedJsonText: options.stagedJsonText === undefined ? '[]\n' : options.stagedJsonText };
  return { selections: [pipe, support], zoneGeometryEvidence, classifications, autoPipe, sourceGraph,
    derivedPortEvidence: { schema: 'FbxDerivedPortEvidence.v1',
      artifactId: `fbx-derived-port-evidence:${HASH}`, admittedPortCount: 0, rejectedPortCount: 0 },
    sourceGraphSelectedZone: { schema: 'FbxSourceGraph.v2', selectedZone: { zoneId: 'zone-1' } } };
}

export function translatedMatrix(x, y, z) {
  return [1,0,0, 0,1,0, 0,0,1, x,y,z];
}

export async function bindSourceGraph(input) {
  const sourceGraphSha256 = await sha256Hex(canonicalJson(input.sourceGraph));
  return { ...input, zoneGeometryEvidence: { ...input.zoneGeometryEvidence, sourceGraphSha256 } };
}
