import assert from 'node:assert/strict';
import { canonicalJson } from '../../tabs/model-converters/converters/fbx/canonical-json.js';
import { buildFbxGeometryBundle } from '../../tabs/model-converters/converters/fbx/geometry-bundle.js';
import { enforceSourceGraphPolicy } from '../../tabs/model-converters/converters/fbx/source-graph.js';
import { sha256Hex } from '../../tabs/model-converters/converters/fbx/sha256.js';
import { validateSelectedZoneGeometryManifest } from '../../tabs/model-converters/converters/fbx/selected-zone-package/geometry-manifest.js';
import {
  buildSelectedZonePackageCore,
  validateSelectedZonePackageCore,
} from '../../tabs/model-converters/converters/fbx/selected-zone-package/package-builder.js';

const REVISION = 'abebe58f3e3e74d4418f5e977e9cb564728e9f7e';
const SOURCE = Object.freeze({ sha256: 'a'.repeat(64), byteLength: 128, fbxVersion: 7400 });
const PARSER = Object.freeze({
  provenanceSchema: 'FbxParserProvenance.v1',
  upstreamRevision: 'b'.repeat(40),
  sourceSha256: 'c'.repeat(64),
  wasmSha256: 'd'.repeat(64),
});
const MATRIX = Object.freeze([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]);

function sourceObject(id, order) {
  return {
    sourceObjectId: id,
    ufbxElementType: 'MESH',
    domClass: 'Geometry',
    domSubtype: 'Mesh',
    domSourceName: `Geometry::${id}`,
    displayName: `Geometry ${id}`,
    sourceRecordDisposition: 'SUPPORTED',
    ufbxElementId: order,
    ufbxTypedId: order,
    ufbxElementTypeValue: 7,
    sourceDocumentOrder: order,
    customProperties: [],
    connectionPropertyNames: [],
  };
}

function modelSourceObject(id, order) {
  return {
    ...sourceObject(id, order),
    ufbxElementType: 'MODEL',
    domClass: 'Model',
    domSubtype: 'Null',
    domSourceName: `Model::${id}`,
    displayName: `Model ${id}`,
  };
}

function occurrence(id, modelId, geometryId) {
  return {
    sourceOccurrenceId: id,
    sourceModelObjectId: modelId,
    parentOccurrenceId: null,
    geometryObjectIds: [geometryId],
    inheritMode: 0,
    originalInheritMode: 0,
    hasGeometryTransform: false,
    geometryMatrixMm: [...MATRIX],
  };
}

function geometry(id, point) {
  return {
    geometryObjectId: id,
    sourceObjectId: id,
    kind: 'MESH',
    ownerOccurrenceIds: [`occ:${id}`],
    verticesMm: [point],
  };
}

function graphFixture() {
  return enforceSourceGraphPolicy({
    schema: 'FbxSourceGraph.v2',
    file: { version: 7400, ascii: false },
    documentMetadata: {},
    globalSettings: {},
    sourceObjects: [
      sourceObject('10', 0), sourceObject('11', 1),
      modelSourceObject('20', 2), modelSourceObject('21', 3),
    ],
    occurrences: [occurrence('occ:10', '20', '10'), occurrence('occ:11', '21', '11')],
    geometries: [geometry('10', [0, 0, 0]), geometry('11', [1, 0, 0])],
    hierarchyEdges: [],
    connectionEdges: [],
    warnings: [],
    unsupportedRecords: [],
    unresolvedReferences: [],
  });
}

function selectedGraph(fullGraph) {
  return enforceSourceGraphPolicy({
    ...structuredClone(fullGraph),
    sourceObjects: fullGraph.sourceObjects.filter((item) => ['10', '20'].includes(item.sourceObjectId)),
    occurrences: fullGraph.occurrences.filter((item) => item.sourceOccurrenceId === 'occ:10'),
    geometries: fullGraph.geometries.filter((item) => item.geometryObjectId === '10'),
    duplicateSourceObjectIds: [],
  });
}

function pointBuffer(x) {
  const buffer = new ArrayBuffer(24);
  new DataView(buffer).setFloat64(0, x, true);
  return buffer;
}

function topology(fullGraph) {
  const descriptor = (id, offset) => ({
    geometryObjectId: id,
    sourceObjectId: id,
    controlPointCount: 1,
    polygonCount: 0,
    polygonVertexCount: 0,
    emptyPolygonCount: 0,
    pointPolygonCount: 0,
    linePolygonCount: 0,
    reversedWinding: false,
    bufferIndices: { controlPointsMm: offset, polygonOffsets: offset + 1, polygonVertexIndices: offset + 2 },
  });
  return {
    rawTopology: { schema: 'FbxRawMeshTopology.v1', sourceGraph: fullGraph, geometries: [descriptor('10', 0), descriptor('11', 3)] },
    buffers: [pointBuffer(0), new ArrayBuffer(4), new ArrayBuffer(0), pointBuffer(1), new ArrayBuffer(4), new ArrayBuffer(0)],
  };
}

async function evidenceId(body) {
  return `fbx-zone-geometry-evidence:${await sha256Hex(`FbxZoneGeometryEvidence.v1\0${canonicalJson(body)}`)}`;
}

async function zoneEvidence(bundle) {
  const body = {
    sourceIdentity: structuredClone(SOURCE),
    parserIdentity: structuredClone(PARSER),
    sourceGraphSha256: bundle.manifest.sourceGraphSha256,
    geometryBundleDigest: bundle.manifest.bundleDigest,
    coordinateUnit: 'millimetre',
    selectedZone: { zoneId: 'occ:10', label: 'Zone 10' },
    selectedOccurrenceIds: ['occ:10'],
    ancestorOccurrenceIds: [],
    selectedGeometryIds: ['10'],
    sharedGeometryEvidence: [],
    occurrenceEvidence: [occurrence('occ:10', '20', '10')],
    geometryEvidence: [{
      descriptor: structuredClone(bundle.manifest.geometries[0]),
      bufferDescriptors: structuredClone(bundle.manifest.buffers.slice(0, 3)),
    }],
    toleranceProfileVersion: 'FbxDerivedPortToleranceProfile.v1',
    conservation: {
      selectedOccurrenceCount: 1,
      selectedGeometryCount: 1,
      selectedTopologyGeometryCount: 1,
      ancestorEvidenceCount: 0,
      sharedGeometryCount: 0,
      siblingExclusiveGeometryIncludedCount: 0,
      selectedOccurrenceGeometryReferenceCount: 1,
    },
  };
  return { schema: 'FbxZoneGeometryEvidence.v1', artifactId: await evidenceId(body), ...body };
}

function packageMetadata(packageValue) {
  return packageValue.files.map((item) => ({ path: item.path, role: item.role, schema: item.schema || null }));
}

const fullGraph = graphFixture();
const selected = selectedGraph(fullGraph);
const input = topology(fullGraph);
const geometryBundle = await buildFbxGeometryBundle({ ...input, sourceIdentity: SOURCE, parserIdentity: PARSER });
const evidence = await zoneEvidence(geometryBundle);
const context = {
  sourceGraph: selected,
  zoneGeometryEvidence: evidence,
  geometryBundle,
  producerRevision: REVISION,
};

const first = await buildSelectedZonePackageCore(context);
const second = await buildSelectedZonePackageCore(context);
await validateSelectedZonePackageCore(first);
assert.equal(canonicalJson(first.audit), canonicalJson(second.audit));
assert.equal(canonicalJson(first.geometryManifest), canonicalJson(second.geometryManifest));
assert.equal(canonicalJson(packageMetadata(first)), canonicalJson(packageMetadata(second)));
assert.equal(first.geometryManifest.selectedGeometryIds.join(','), '10');
assert.equal(first.geometryManifest.buffers.length, 3);
assert.ok(first.geometryManifest.buffers.every((item) => item.geometryObjectId === '10'));
assert.ok(first.geometryManifest.buffers.every((item) => !item.packagePath.includes('11')));
assert.equal(Object.hasOwn(first.geometryManifest, 'occurrenceEvidence'), false);
assert.equal(Object.hasOwn(first.geometryManifest, 'transform'), false);
assert.equal(first.audit.authority.occurrenceAndTransform, 'zone-geometry-evidence.json');
assert.equal(first.audit.authority.supportSemantics, 'NOT_AUTHORIZED');
assert.equal(first.audit.files.find((item) => item.path === 'support-evidence.json').status, 'OMITTED_BLOCKED');
assert.equal(first.audit.files.find((item) => item.path === 'selected-zone.staged.json').status, 'OMITTED_BLOCKED');

const projectedAuthorityDrift = structuredClone(first.geometryManifest);
projectedAuthorityDrift.occurrenceEvidence = [];
await assert.rejects(
  () => validateSelectedZoneGeometryManifest(projectedAuthorityDrift),
  /BLOCKED_PACKAGE_SHAPE.*fields/,
);

const extraFilePackage = {
  ...first,
  files: [...first.files, { path: 'unbound.bin', role: 'UNBOUND', schema: null, content: new ArrayBuffer(0) }],
};
await assert.rejects(() => validateSelectedZonePackageCore(extraFilePackage), /BLOCKED_PACKAGE_FILE.*unbound/);

const expandedGraph = structuredClone(selected);
expandedGraph.sourceObjects.push(
  structuredClone(fullGraph.sourceObjects.find((item) => item.sourceObjectId === '11')),
  structuredClone(fullGraph.sourceObjects.find((item) => item.sourceObjectId === '21')),
);
expandedGraph.occurrences.push(structuredClone(fullGraph.occurrences[1]));
expandedGraph.geometries.push(structuredClone(fullGraph.geometries[1]));
await assert.rejects(
  () => buildSelectedZonePackageCore({ ...context, sourceGraph: expandedGraph }),
  /BLOCKED_SOURCE_GRAPH_BINDING/,
);

const transformTamper = structuredClone(evidence);
transformTamper.occurrenceEvidence[0].geometryMatrixMm[9] = 99;
await assert.rejects(
  () => buildSelectedZonePackageCore({ ...context, zoneGeometryEvidence: transformTamper }),
  /BLOCKED_ZONE_BINDING.*identity/,
);

const manifestAuthorityDrift = {
  manifest: structuredClone(geometryBundle.manifest),
  buffers: geometryBundle.buffers.map((item) => ({ bufferId: item.bufferId, bytes: item.bytes.slice(0) })),
};
manifestAuthorityDrift.manifest.occurrenceEvidence = [];
await assert.rejects(
  () => buildSelectedZonePackageCore({ ...context, geometryBundle: manifestAuthorityDrift }),
  /FBX_GEOMETRY_BUNDLE_INVALID.*fields/,
);

const bufferTamper = {
  manifest: structuredClone(geometryBundle.manifest),
  buffers: geometryBundle.buffers.map((item) => ({ bufferId: item.bufferId, bytes: item.bytes.slice(0) })),
};
new Uint8Array(bufferTamper.buffers[0].bytes)[0] = 1;
await assert.rejects(
  () => buildSelectedZonePackageCore({ ...context, geometryBundle: bufferTamper }),
  /FBX_GEOMETRY_DIGEST_MISMATCH/,
);

const auditTamper = {
  ...first,
  audit: { ...structuredClone(first.audit), producerRevision: 'f'.repeat(40) },
  files: [...first.files],
};
await assert.rejects(() => validateSelectedZonePackageCore(auditTamper), /BLOCKED_PACKAGE_AUDIT/);

console.log('test-selected-zone-package-core: PASS');
