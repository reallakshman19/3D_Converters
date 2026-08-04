import assert from 'node:assert/strict';
import { buildFbxGeometryBundle } from '../../tabs/model-converters/converters/fbx/geometry-bundle.js';
import {
  FBX_TRIANGULATION_ERROR_CODES,
  FBX_TRIANGULATION_RULE,
  FBX_UFBX_TRIANGULATION_SCHEMA,
  FbxTriangulationContractError,
  validateFbxUfbxTriangulationEvidence,
} from '../../tabs/model-converters/converters/fbx/triangulation.js';

const hash = (char) => char.repeat(64);
const sourceIdentity = { sha256: hash('a'), byteLength: 256, fbxVersion: 7400 };
const parserIdentity = {
  provenanceSchema: 'UfbxWasmProvenance.v1',
  upstreamRevision: 'b'.repeat(40),
  sourceSha256: hash('c'),
  wasmSha256: hash('d'),
};

function float64(values) {
  const bytes = new ArrayBuffer(values.length * 8);
  const view = new DataView(bytes);
  values.forEach((value, index) => view.setFloat64(index * 8, value, true));
  return bytes;
}

function uint32(values) {
  const bytes = new ArrayBuffer(values.length * 4);
  const view = new DataView(bytes);
  values.forEach((value, index) => view.setUint32(index * 4, value, true));
  return bytes;
}

function sourceObject() {
  return {
    sourceObjectId: '7', ufbxElementId: 7, ufbxTypedId: 0,
    ufbxElementType: 'MESH', ufbxElementTypeValue: 2, domClass: 'Geometry',
    domSubtype: 'Mesh', domSourceName: '', displayName: '', customProperties: [],
    sourceRecordDisposition: 'supported-geometry', nodeAttributeType: null,
    nodeAttributeTypeValue: null, objectPropertyPath: null,
    connectionPropertyNames: [], sourceDocumentOrder: 0,
  };
}

async function geometryFixture() {
  const points = Array.from({ length: 10 }, (_, index) => [index, index % 2, 0]);
  const graph = {
    schema: 'FbxSourceGraph.v2',
    file: { version: 7400, ascii: false, creator: '' },
    documentMetadata: { originalApplication: '', latestApplication: '' },
    globalSettings: { unitMeters: 1, axes: { right: 0, up: 1, front: 2 } },
    sourceObjects: [sourceObject()], occurrences: [],
    geometries: [{
      geometryObjectId: '7', sourceObjectId: '7', kind: 'MESH',
      verticesSource: [], verticesMm: points, ownerOccurrenceIds: [],
    }],
    hierarchyEdges: [], connectionEdges: [], warnings: [], unsupportedRecords: [],
    unresolvedReferences: [], duplicateSourceObjectIds: [],
  };
  return buildFbxGeometryBundle({
    rawTopology: {
      schema: 'FbxRawMeshTopology.v1', sourceGraph: graph,
      geometries: [{
        geometryObjectId: '7', sourceObjectId: '7',
        controlPointCount: 10, polygonCount: 5, polygonVertexCount: 10,
        emptyPolygonCount: 1, pointPolygonCount: 1, linePolygonCount: 1,
        reversedWinding: false,
        bufferIndices: {
          controlPointsMm: 0, polygonOffsets: 1, polygonVertexIndices: 2,
        },
      }],
    },
    buffers: [
      float64(points.flat()),
      uint32([0, 0, 1, 3, 6, 10]),
      uint32([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]),
    ],
    sourceIdentity,
    parserIdentity,
  });
}

function fixture(geometryBundle) {
  return {
    rawTriangulation: {
      schema: FBX_UFBX_TRIANGULATION_SCHEMA,
      rule: FBX_TRIANGULATION_RULE,
      geometryBundleDigest: geometryBundle.manifest.bundleDigest,
      geometries: [{
        geometryObjectId: '7', polygonCount: 5, polygonVertexCount: 10,
        triangleCount: 3,
        bufferIndices: {
          polygonTriangleOffsets: 0,
          trianglePolygonVertexIndices: 1,
        },
      }],
    },
    buffers: [
      uint32([0, 0, 0, 0, 1, 3]),
      uint32([3, 4, 5, 6, 7, 8, 6, 8, 9]),
    ],
  };
}

function rejects(code) {
  return (error) => error instanceof FbxTriangulationContractError
    && error.code === code;
}

const geometryBundle = await geometryFixture();
const input = fixture(geometryBundle);
const accepted = await validateFbxUfbxTriangulationEvidence({ geometryBundle, ...input });
assert.equal(accepted.schema, FBX_UFBX_TRIANGULATION_SCHEMA);
assert.equal(accepted.rule, FBX_TRIANGULATION_RULE);
assert.equal(accepted.geometries[0].triangleCount, 3);
assert.equal(accepted.totalBytes, 60);

new DataView(input.buffers[1]).setUint32(0, 9, true);
assert.equal(
  new DataView(accepted.geometries[0].trianglePolygonVertexIndices).getUint32(0, true),
  3,
);

const wrongRule = fixture(geometryBundle);
wrongRule.rawTriangulation.rule = 'javascript-fan-v1';
await assert.rejects(
  validateFbxUfbxTriangulationEvidence({ geometryBundle, ...wrongRule }),
  rejects(FBX_TRIANGULATION_ERROR_CODES.RAW_INVALID),
);

const wrongDigest = fixture(geometryBundle);
wrongDigest.rawTriangulation.geometryBundleDigest = hash('e');
await assert.rejects(
  validateFbxUfbxTriangulationEvidence({ geometryBundle, ...wrongDigest }),
  rejects(FBX_TRIANGULATION_ERROR_CODES.RAW_INVALID),
);

const wrongFaceCount = fixture(geometryBundle);
wrongFaceCount.rawTriangulation.geometries[0].triangleCount = 2;
wrongFaceCount.buffers[0] = uint32([0, 0, 0, 0, 1, 2]);
wrongFaceCount.buffers[1] = uint32([3, 4, 5, 6, 7, 8]);
await assert.rejects(
  validateFbxUfbxTriangulationEvidence({ geometryBundle, ...wrongFaceCount }),
  rejects(FBX_TRIANGULATION_ERROR_CODES.RAW_INVALID),
);

const crossFace = fixture(geometryBundle);
new DataView(crossFace.buffers[1]).setUint32(0, 6, true);
await assert.rejects(
  validateFbxUfbxTriangulationEvidence({ geometryBundle, ...crossFace }),
  rejects(FBX_TRIANGULATION_ERROR_CODES.RAW_INVALID),
);

const aliased = fixture(geometryBundle);
aliased.buffers[1] = aliased.buffers[0];
await assert.rejects(
  validateFbxUfbxTriangulationEvidence({ geometryBundle, ...aliased }),
  rejects(FBX_TRIANGULATION_ERROR_CODES.BUFFER_INVALID),
);

const wrongGeometry = fixture(geometryBundle);
wrongGeometry.rawTriangulation.geometries[0].geometryObjectId = '8';
await assert.rejects(
  validateFbxUfbxTriangulationEvidence({ geometryBundle, ...wrongGeometry }),
  rejects(FBX_TRIANGULATION_ERROR_CODES.GEOMETRY_MISMATCH),
);

const incomplete = fixture(geometryBundle);
incomplete.buffers.pop();
await assert.rejects(
  validateFbxUfbxTriangulationEvidence({ geometryBundle, ...incomplete }),
  rejects(FBX_TRIANGULATION_ERROR_CODES.RAW_INVALID),
);

console.log('test-triangulation-admission: PASS');
