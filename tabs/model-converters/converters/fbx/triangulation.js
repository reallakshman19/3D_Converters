import { validateFbxGeometryBundle } from './geometry-bundle.js';

export const FBX_UFBX_TRIANGULATION_SCHEMA = 'FbxUfbxTriangulationEvidence.v1';
export const FBX_TRIANGULATION_RULE = 'ufbx-triangulate-face-v1';
export const FBX_TRIANGULATION_LIMITS = Object.freeze({
  individualBufferBytes: 268435456,
  totalBufferBytes: 536870912,
});
export const FBX_TRIANGULATION_ERROR_CODES = Object.freeze({
  RAW_INVALID: 'FBX_TRIANGULATION_EVIDENCE_INVALID',
  BUFFER_INVALID: 'FBX_TRIANGULATION_BUFFER_INVALID',
  LIMIT_EXCEEDED: 'FBX_TRIANGULATION_LIMIT_EXCEEDED',
  INTEGER_OVERFLOW: 'FBX_TRIANGULATION_INTEGER_OVERFLOW',
  GEOMETRY_MISMATCH: 'FBX_TRIANGULATION_GEOMETRY_MISMATCH',
});

const TOP_KEYS = ['schema', 'rule', 'geometryBundleDigest', 'geometries'];
const GEOMETRY_KEYS = [
  'geometryObjectId', 'polygonCount', 'polygonVertexCount', 'triangleCount',
  'bufferIndices',
];
const INDEX_KEYS = ['polygonTriangleOffsets', 'trianglePolygonVertexIndices'];
const HASH = /^[0-9a-f]{64}$/;

export class FbxTriangulationContractError extends Error {
  constructor(code, message) {
    super(`${code} ${message}`);
    this.name = 'FbxTriangulationContractError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new FbxTriangulationContractError(code, message);
}

function exactKeys(value, keys, label, code = FBX_TRIANGULATION_ERROR_CODES.RAW_INVALID) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(code, `${label} must be an object.`);
  }
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.join('\0') !== expected.join('\0')) {
    fail(code, `${label} fields are invalid.`);
  }
}

function checkedProduct(values, label) {
  let result = 1;
  for (const value of values) {
    if (!Number.isSafeInteger(value) || value < 0
      || (value && result > Number.MAX_SAFE_INTEGER / value)) {
      fail(FBX_TRIANGULATION_ERROR_CODES.INTEGER_OVERFLOW, `${label} overflowed.`);
    }
    result *= value;
  }
  return result;
}

function checkedSum(left, right, label) {
  if (!Number.isSafeInteger(left) || !Number.isSafeInteger(right)
    || left < 0 || right < 0 || left > Number.MAX_SAFE_INTEGER - right) {
    fail(FBX_TRIANGULATION_ERROR_CODES.INTEGER_OVERFLOW, `${label} overflowed.`);
  }
  return left + right;
}

function ordinaryBuffer(value, label) {
  if (!(value instanceof ArrayBuffer)
    || (typeof SharedArrayBuffer !== 'undefined' && value instanceof SharedArrayBuffer)) {
    fail(FBX_TRIANGULATION_ERROR_CODES.BUFFER_INVALID, `${label} must be an ordinary ArrayBuffer.`);
  }
  return value.slice(0);
}

function useBuffer(index, buffers, usedIndices, usedBuffers, label) {
  if (!Number.isSafeInteger(index) || index < 0 || index >= buffers.length
    || usedIndices.has(index)) {
    fail(FBX_TRIANGULATION_ERROR_CODES.BUFFER_INVALID, `${label} index is invalid.`);
  }
  const value = buffers[index];
  if (usedBuffers.has(value)) {
    fail(FBX_TRIANGULATION_ERROR_CODES.BUFFER_INVALID, `${label} aliases another buffer.`);
  }
  usedIndices.add(index);
  usedBuffers.add(value);
  return ordinaryBuffer(value, label);
}

function geometryBuffers(geometryBundle) {
  return new Map(geometryBundle.buffers.map((item) => [item.bufferId, item.bytes]));
}

function expectedTriangles(faceSize) {
  return faceSize < 3 ? 0 : faceSize - 2;
}

function validateOffsets({
  geometry, sourceOffsets, triangleOffsets, triangleCount,
}) {
  const source = new DataView(sourceOffsets);
  const derived = new DataView(triangleOffsets);
  let previous = 0;
  for (let polygonIndex = 0; polygonIndex <= geometry.polygonCount; polygonIndex += 1) {
    const value = derived.getUint32(polygonIndex * 4, true);
    if ((polygonIndex === 0 && value !== 0) || value < previous || value > triangleCount) {
      fail(FBX_TRIANGULATION_ERROR_CODES.RAW_INVALID, 'Triangle offsets are invalid.');
    }
    if (polygonIndex > 0) {
      const sourceStart = source.getUint32((polygonIndex - 1) * 4, true);
      const sourceEnd = source.getUint32(polygonIndex * 4, true);
      if (value - previous !== expectedTriangles(sourceEnd - sourceStart)) {
        fail(
          FBX_TRIANGULATION_ERROR_CODES.RAW_INVALID,
          'Face triangle count differs from ufbx-triangulate-face-v1.',
        );
      }
    }
    previous = value;
  }
  if (previous !== triangleCount) {
    fail(FBX_TRIANGULATION_ERROR_CODES.RAW_INVALID, 'Final triangle offset is invalid.');
  }
}

function validateTriangleCorners({
  geometry, sourceOffsets, triangleOffsets, triangleCorners,
}) {
  const source = new DataView(sourceOffsets);
  const derived = new DataView(triangleOffsets);
  const corners = new DataView(triangleCorners);
  for (let polygonIndex = 0; polygonIndex < geometry.polygonCount; polygonIndex += 1) {
    const sourceStart = source.getUint32(polygonIndex * 4, true);
    const sourceEnd = source.getUint32((polygonIndex + 1) * 4, true);
    const triangleStart = derived.getUint32(polygonIndex * 4, true);
    const triangleEnd = derived.getUint32((polygonIndex + 1) * 4, true);
    for (let index = triangleStart * 3; index < triangleEnd * 3; index += 1) {
      const corner = corners.getUint32(index * 4, true);
      if (corner < sourceStart || corner >= sourceEnd) {
        fail(
          FBX_TRIANGULATION_ERROR_CODES.RAW_INVALID,
          'Triangle corner does not belong to its source polygon.',
        );
      }
    }
  }
}

function validateGeometry(value, geometry, buffers, usedIndices, usedBuffers, sourceById) {
  exactKeys(value, GEOMETRY_KEYS, `geometry ${geometry.geometryObjectId}`);
  exactKeys(value.bufferIndices, INDEX_KEYS, `geometry ${geometry.geometryObjectId}.bufferIndices`);
  if (value.geometryObjectId !== geometry.geometryObjectId
    || value.polygonCount !== geometry.polygonCount
    || value.polygonVertexCount !== geometry.polygonVertexCount
    || !Number.isSafeInteger(value.triangleCount) || value.triangleCount < 0
    || value.triangleCount > 0xffffffff) {
    fail(FBX_TRIANGULATION_ERROR_CODES.GEOMETRY_MISMATCH, 'Triangulation geometry differs from geometry evidence.');
  }
  const offsetBytes = checkedProduct([geometry.polygonCount + 1, 4], 'triangle offset bytes');
  const cornerBytes = checkedProduct([value.triangleCount, 3, 4], 'triangle corner bytes');
  if (Math.max(offsetBytes, cornerBytes) > FBX_TRIANGULATION_LIMITS.individualBufferBytes) {
    fail(FBX_TRIANGULATION_ERROR_CODES.LIMIT_EXCEEDED, 'Triangulation buffer exceeds the programme limit.');
  }
  const triangleOffsets = useBuffer(
    value.bufferIndices.polygonTriangleOffsets,
    buffers, usedIndices, usedBuffers, 'polygonTriangleOffsets',
  );
  const triangleCorners = useBuffer(
    value.bufferIndices.trianglePolygonVertexIndices,
    buffers, usedIndices, usedBuffers, 'trianglePolygonVertexIndices',
  );
  if (triangleOffsets.byteLength !== offsetBytes || triangleCorners.byteLength !== cornerBytes) {
    fail(FBX_TRIANGULATION_ERROR_CODES.BUFFER_INVALID, 'Triangulation buffer length is invalid.');
  }
  const sourceOffsets = sourceById.get(geometry.bufferIds.polygonOffsets);
  if (!(sourceOffsets instanceof ArrayBuffer)) {
    fail(FBX_TRIANGULATION_ERROR_CODES.GEOMETRY_MISMATCH, 'Source polygon offsets are unavailable.');
  }
  validateOffsets({ geometry, sourceOffsets, triangleOffsets, triangleCount: value.triangleCount });
  validateTriangleCorners({ geometry, sourceOffsets, triangleOffsets, triangleCorners });
  return {
    geometryObjectId: value.geometryObjectId,
    polygonCount: value.polygonCount,
    polygonVertexCount: value.polygonVertexCount,
    triangleCount: value.triangleCount,
    polygonTriangleOffsets: triangleOffsets,
    trianglePolygonVertexIndices: triangleCorners,
  };
}

export async function validateFbxUfbxTriangulationEvidence({
  geometryBundle, rawTriangulation, buffers,
}) {
  await validateFbxGeometryBundle(geometryBundle);
  exactKeys(rawTriangulation, TOP_KEYS, 'rawTriangulation');
  if (rawTriangulation.schema !== FBX_UFBX_TRIANGULATION_SCHEMA
    || rawTriangulation.rule !== FBX_TRIANGULATION_RULE
    || !HASH.test(rawTriangulation.geometryBundleDigest)
    || rawTriangulation.geometryBundleDigest !== geometryBundle.manifest.bundleDigest
    || !Array.isArray(rawTriangulation.geometries) || !Array.isArray(buffers)) {
    fail(FBX_TRIANGULATION_ERROR_CODES.RAW_INVALID, 'Triangulation envelope is invalid.');
  }
  const geometries = geometryBundle.manifest.geometries;
  if (rawTriangulation.geometries.length !== geometries.length
    || buffers.length !== geometries.length * 2) {
    fail(FBX_TRIANGULATION_ERROR_CODES.RAW_INVALID, 'Triangulation coverage is incomplete.');
  }
  const usedIndices = new Set();
  const usedBuffers = new Set();
  const sourceById = geometryBuffers(geometryBundle);
  const accepted = [];
  let totalBytes = 0;
  for (let index = 0; index < geometries.length; index += 1) {
    const value = validateGeometry(
      rawTriangulation.geometries[index], geometries[index],
      buffers, usedIndices, usedBuffers, sourceById,
    );
    totalBytes = checkedSum(
      totalBytes,
      value.polygonTriangleOffsets.byteLength + value.trianglePolygonVertexIndices.byteLength,
      'total triangulation bytes',
    );
    accepted.push(value);
  }
  if (usedIndices.size !== buffers.length) {
    fail(FBX_TRIANGULATION_ERROR_CODES.BUFFER_INVALID, 'Triangulation buffers are missing or unexpected.');
  }
  if (totalBytes > FBX_TRIANGULATION_LIMITS.totalBufferBytes) {
    fail(FBX_TRIANGULATION_ERROR_CODES.LIMIT_EXCEEDED, 'Triangulation buffers exceed the programme limit.');
  }
  return {
    schema: FBX_UFBX_TRIANGULATION_SCHEMA,
    rule: FBX_TRIANGULATION_RULE,
    geometryBundleDigest: rawTriangulation.geometryBundleDigest,
    geometries: accepted,
    totalBytes,
  };
}
