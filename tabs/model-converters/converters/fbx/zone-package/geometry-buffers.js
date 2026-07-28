import { sha256Hex } from '../sha256.js';
import { FBX_ZONE_PACKAGE_ROLE_SPECS, fail } from './constants.js';

function numberArray(value, label) {
  if (!Array.isArray(value) && !ArrayBuffer.isView(value)) fail('ZONE_PACKAGE_INVALID_BUFFER', `${label} must be an array.`);
  const values = Array.from(value);
  if (values.some((item) => !Number.isFinite(item))) fail('ZONE_PACKAGE_INVALID_BUFFER', `${label} must contain only finite numbers.`);
  return values;
}

function typedArrayFor(role, values) {
  if (role === 'control-points-mm') return Float64Array.from(values);
  return Uint32Array.from(values);
}

async function encodeRole(role, values) {
  const spec = FBX_ZONE_PACKAGE_ROLE_SPECS[role];
  const typed = typedArrayFor(role, values);
  const bytes = new Uint8Array(typed.buffer, typed.byteOffset, typed.byteLength);
  return {
    role,
    scalarType: spec.scalarType,
    componentCount: spec.componentCount,
    count: typed.length / spec.componentCount,
    byteLength: bytes.byteLength,
    sha256: await sha256Hex(bytes),
    bytes,
  };
}

/**
 * Derives the three authoritative geometry buffers (control points, polygon
 * offsets, polygon vertex indices) plus their exact byte encodings from a
 * plain-array selected-geometry description. This is the single source of
 * truth every downstream Phase (manifest, package, diagnostics) reads from,
 * so digests and topology facts can never drift between them.
 */
export async function encodeSelectedGeometryBuffers(geometry) {
  const controlPointsMm = numberArray(geometry.controlPointsMm, 'controlPointsMm');
  const polygonOffsets = numberArray(geometry.polygonOffsets, 'polygonOffsets');
  const polygonVertexIndices = numberArray(geometry.polygonVertexIndices, 'polygonVertexIndices');
  if (controlPointsMm.length % 3 !== 0) fail('ZONE_PACKAGE_INVALID_BUFFER', 'controlPointsMm length must be a multiple of 3.');
  if (polygonOffsets.length < 1 || polygonOffsets[0] !== 0) fail('ZONE_PACKAGE_INVALID_BUFFER', 'polygonOffsets must start at 0.');
  for (let index = 1; index < polygonOffsets.length; index += 1) {
    if (polygonOffsets[index] < polygonOffsets[index - 1]) fail('ZONE_PACKAGE_INVALID_BUFFER', 'polygonOffsets must be non-decreasing.');
  }
  if (polygonOffsets[polygonOffsets.length - 1] !== polygonVertexIndices.length) {
    fail('ZONE_PACKAGE_INVALID_BUFFER', 'polygonOffsets must terminate at polygonVertexIndices length.');
  }
  const controlPointCount = controlPointsMm.length / 3;
  for (const index of polygonVertexIndices) {
    if (!Number.isInteger(index) || index < 0 || index >= controlPointCount) {
      fail('ZONE_PACKAGE_INVALID_BUFFER', 'polygonVertexIndices references an out-of-range control point.');
    }
  }
  const [controlPoints, offsets, indices] = await Promise.all([
    encodeRole('control-points-mm', controlPointsMm),
    encodeRole('polygon-offsets', polygonOffsets),
    encodeRole('polygon-vertex-indices', polygonVertexIndices),
  ]);
  return {
    controlPointCount,
    polygonCount: polygonOffsets.length - 1,
    buffers: { 'control-points-mm': controlPoints, 'polygon-offsets': offsets, 'polygon-vertex-indices': indices },
  };
}
