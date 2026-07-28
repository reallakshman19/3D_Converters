import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { canonicalJson } from '../../tabs/model-converters/converters/fbx/canonical-json.js';
import { buildFbxGeometryBundle } from '../../tabs/model-converters/converters/fbx/geometry-bundle.js';
import { sha256Hex } from '../../tabs/model-converters/converters/fbx/sha256.js';
import { enforceSourceGraphPolicy } from '../../tabs/model-converters/converters/fbx/source-graph.js';
import {
  FBX_SELECTED_ZONE_GEOMETRY_MANIFEST_SCHEMA,
  FBX_SELECTED_ZONE_PACKAGE_AUDIT_SCHEMA,
} from '../../tabs/model-converters/converters/fbx/selected-zone-package/constants.js';
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

function schemaErrors(schema, instances) {
  const program = String.raw`
import json, sys
from jsonschema import Draft202012Validator
payload = json.load(sys.stdin)
Draft202012Validator.check_schema(payload["schema"])
validator = Draft202012Validator(payload["schema"])
print(json.dumps([[error.message for error in validator.iter_errors(item)] for item in payload["instances"]]))
`;
  const result = spawnSync(process.env.FBX_SCHEMA_PYTHON || 'python3', ['-c', program], {
    input: JSON.stringify({ schema, instances }),
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) throw new Error(result.error?.message || result.stderr);
  return JSON.parse(result.stdout);
}

function sourceObject(id, order, model = false) {
  return {
    sourceObjectId: id,
    ufbxElementType: model ? 'MODEL' : 'MESH',
    domClass: model ? 'Model' : 'Geometry',
    domSubtype: model ? 'Null' : 'Mesh',
    domSourceName: `${model ? 'Model' : 'Geometry'}::${id}`,
    displayName: `${model ? 'Model' : 'Geometry'} ${id}`,
    sourceRecordDisposition: 'SUPPORTED',
    ufbxElementId: order,
    ufbxTypedId: order,
    ufbxElementTypeValue: model ? 5 : 7,
    sourceDocumentOrder: order,
    customProperties: [],
    connectionPropertyNames: [],
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

function graphFixture() {
  return enforceSourceGraphPolicy({
    schema: 'FbxSourceGraph.v2',
    file: { version: 7400, ascii: false },
    documentMetadata: {},
    globalSettings: {},
    sourceObjects: [
      sourceObject('10', 0), sourceObject('11', 1),
      sourceObject('20', 2, true), sourceObject('21', 3, true),
    ],
    occurrences: [occurrence('occ:10', '20', '10'), occurrence('occ:11', '21', '11')],
    geometries: [
      { geometryObjectId: '10', sourceObjectId: '10', kind: 'MESH', ownerOccurrenceIds: ['occ:10'], verticesMm: [[0, 0, 0]] },
      { geometryObjectId: '11', sourceObjectId: '11', kind: 'MESH', ownerOccurrenceIds: ['occ:11'], verticesMm: [[1, 0, 0]] },
    ],
    hierarchyEdges: [], connectionEdges: [], warnings: [], unsupportedRecords: [], unresolvedReferences: [],
  });
}

function selectedGraph(graph) {
  return enforceSourceGraphPolicy({
    ...structuredClone(graph),
    sourceObjects: graph.sourceObjects.filter((item) => ['10', '20'].includes(item.sourceObjectId)),
    occurrences: graph.occurrences.filter((item) => item.sourceOccurrenceId === 'occ:10'),
    geometries: graph.geometries.filter((item) => item.geometryObjectId === '10'),
    duplicateSourceObjectIds: [],
  });
}

function pointBuffer(x) {
  const buffer = new ArrayBuffer(24);
  new DataView(buffer).setFloat64(0, x, true);
  return buffer;
}

function topology(graph) {
  const descriptor = (id, offset) => ({
    geometryObjectId: id, sourceObjectId: id, controlPointCount: 1,
    polygonCount: 0, polygonVertexCount: 0, emptyPolygonCount: 0,
    pointPolygonCount: 0, linePolygonCount: 0, reversedWinding: false,
    bufferIndices: { controlPointsMm: offset, polygonOffsets: offset + 1, polygonVertexIndices: offset + 2 },
  });
  return {
    rawTopology: { schema: 'FbxRawMeshTopology.v1', sourceGraph: graph, geometries: [descriptor('10', 0), descriptor('11', 3)] },
    buffers: [pointBuffer(0), new ArrayBuffer(4), new ArrayBuffer(0), pointBuffer(1), new ArrayBuffer(4), new ArrayBuffer(0)],
  };
}

async function zoneEvidence(bundle) {
  const body = {
    sourceIdentity: structuredClone(SOURCE), parserIdentity: structuredClone(PARSER),
    sourceGraphSha256: bundle.manifest.sourceGraphSha256,
    geometryBundleDigest: bundle.manifest.bundleDigest,
    coordinateUnit: 'millimetre', selectedZone: { zoneId: 'occ:10', label: 'Zone 10' },
    selectedOccurrenceIds: ['occ:10'], ancestorOccurrenceIds: [], selectedGeometryIds: ['10'],
    sharedGeometryEvidence: [], occurrenceEvidence: [occurrence('occ:10', '20', '10')],
    geometryEvidence: [{ descriptor: structuredClone(bundle.manifest.geometries[0]), bufferDescriptors: structuredClone(bundle.manifest.buffers.slice(0, 3)) }],
    toleranceProfileVersion: 'FbxDerivedPortToleranceProfile.v1',
    conservation: { selectedOccurrenceCount: 1, selectedGeometryCount: 1, selectedTopologyGeometryCount: 1,
      ancestorEvidenceCount: 0, sharedGeometryCount: 0, siblingExclusiveGeometryIncludedCount: 0,
      selectedOccurrenceGeometryReferenceCount: 1 },
  };
  const artifactId = `fbx-zone-geometry-evidence:${await sha256Hex(`FbxZoneGeometryEvidence.v1\0${canonicalJson(body)}`)}`;
  return { schema: 'FbxZoneGeometryEvidence.v1', artifactId, ...body };
}

async function packageFixture() {
  const graph = graphFixture();
  const geometryBundle = await buildFbxGeometryBundle({
    ...topology(graph), sourceIdentity: SOURCE, parserIdentity: PARSER,
  });
  return buildSelectedZonePackageCore({
    sourceGraph: selectedGraph(graph),
    zoneGeometryEvidence: await zoneEvidence(geometryBundle),
    geometryBundle,
    producerRevision: REVISION,
  });
}

function mutate(value, change) {
  const clone = structuredClone(value);
  change(clone);
  return clone;
}

function assertRejected(results, label) {
  assert.equal(results[0].length, 0, `${label} authentic artifact failed: ${JSON.stringify(results[0])}`);
  results.slice(1).forEach((errors, index) => assert.notEqual(errors.length, 0, `${label} mutation ${index + 1} passed`));
}

const manifestSchema = JSON.parse(await readFile(
  new URL('../../contracts/fbx/fbx-selected-zone-geometry-manifest.v1.schema.json', import.meta.url), 'utf8',
));
const auditSchema = JSON.parse(await readFile(
  new URL('../../contracts/fbx/fbx-selected-zone-package-audit.v1.schema.json', import.meta.url), 'utf8',
));
assert.equal(manifestSchema.$id, FBX_SELECTED_ZONE_GEOMETRY_MANIFEST_SCHEMA);
assert.equal(manifestSchema.properties.schema.const, FBX_SELECTED_ZONE_GEOMETRY_MANIFEST_SCHEMA);
assert.equal(auditSchema.$id, FBX_SELECTED_ZONE_PACKAGE_AUDIT_SCHEMA);
assert.equal(auditSchema.properties.schema.const, FBX_SELECTED_ZONE_PACKAGE_AUDIT_SCHEMA);
for (const key of ['selectedSourceGraphSha256', 'sourceGeometryBundleSourceGraphSha256']) {
  assert.ok(manifestSchema.required.includes(key), `manifest schema lost ${key}`);
  assert.ok(auditSchema.required.includes(key), `audit schema lost ${key}`);
}

const first = await packageFixture();
const second = await packageFixture();
assert.equal(canonicalJson(first.geometryManifest), canonicalJson(second.geometryManifest));
assert.equal(canonicalJson(first.audit), canonicalJson(second.audit));
assert.equal(first.geometryManifest.manifestDigest, second.geometryManifest.manifestDigest);
assert.equal(first.audit.auditId, second.audit.auditId);

const manifestCases = [
  first.geometryManifest,
  mutate(first.geometryManifest, (item) => { item.unexpected = true; }),
  mutate(first.geometryManifest, (item) => { item.geometries[0].sourceOccurrenceId = 'occ:10'; }),
  mutate(first.geometryManifest, (item) => { item.geometries[0].geometryMatrixMm = [...MATRIX]; }),
  mutate(first.geometryManifest, (item) => { item.geometries[0].supportEvidence = {}; }),
  mutate(first.geometryManifest, (item) => { item.geometries[0].pipeHost = 'pipe:1'; }),
  mutate(first.geometryManifest, (item) => { item.buffers[0].role = 'normal-vectors'; }),
  mutate(first.geometryManifest, (item) => { item.buffers[0].packagePath = '../escape.bin'; }),
  mutate(first.geometryManifest, (item) => { delete item.selectedSourceGraphSha256; }),
  mutate(first.geometryManifest, (item) => { delete item.sourceGeometryBundleSourceGraphSha256; }),
];
assertRejected(schemaErrors(manifestSchema, manifestCases), 'geometry manifest');

const auditCases = [
  first.audit,
  mutate(first.audit, (item) => { item.unexpected = true; }),
  mutate(first.audit, (item) => { item.files[0].status = 'UNKNOWN'; }),
  mutate(first.audit, (item) => { delete item.authority.occurrenceAndTransform; }),
  mutate(first.audit, (item) => { item.auditId = 'x'.repeat(64); }),
  mutate(first.audit, (item) => { item.producerRevision = 'x'.repeat(40); }),
  mutate(first.audit, (item) => { item.files = item.files.filter((file) => file.role !== 'SOURCE_GRAPH'); }),
  mutate(first.audit, (item) => { item.files = item.files.filter((file) => file.role !== 'SUPPORT_EVIDENCE'); }),
  mutate(first.audit, (item) => { item.files.find((file) => file.role === 'SUPPORT_EVIDENCE').status = 'PRESENT'; }),
];
assertRejected(schemaErrors(auditSchema, auditCases), 'package audit');

const omitLeak = {
  ...first,
  files: [...first.files, { path: 'support-evidence.json', role: 'SUPPORT_EVIDENCE', schema: null, content: '{}' }],
};
await assert.rejects(() => validateSelectedZonePackageCore(omitLeak), /BLOCKED_PACKAGE_FILE/);
console.log('test-selected-zone-package-contracts: PASS');
