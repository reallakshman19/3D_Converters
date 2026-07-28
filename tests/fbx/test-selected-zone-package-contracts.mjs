import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalJson } from '../../tabs/model-converters/converters/fbx/canonical-json.js';
import { buildFbxGeometryBundle } from '../../tabs/model-converters/converters/fbx/geometry-bundle.js';
import { enforceSourceGraphPolicy } from '../../tabs/model-converters/converters/fbx/source-graph.js';
import { sha256Hex } from '../../tabs/model-converters/converters/fbx/sha256.js';
import {
  FBX_SELECTED_ZONE_GEOMETRY_MANIFEST_SCHEMA,
  FBX_SELECTED_ZONE_PACKAGE_AUDIT_SCHEMA,
} from '../../tabs/model-converters/converters/fbx/selected-zone-package/constants.js';
import { buildSelectedZonePackageCore } from '../../tabs/model-converters/converters/fbx/selected-zone-package/package-builder.js';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const REVISION = 'abebe58f3e3e74d4418f5e977e9cb564728e9f7e';
const SOURCE = Object.freeze({ sha256: 'a'.repeat(64), byteLength: 128, fbxVersion: 7400 });
const PARSER = Object.freeze({
  provenanceSchema: 'FbxParserProvenance.v1', upstreamRevision: 'b'.repeat(40),
  sourceSha256: 'c'.repeat(64), wasmSha256: 'd'.repeat(64),
});
const MATRIX = Object.freeze([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]);

function loadSchema(filename) {
  return JSON.parse(readFileSync(join(ROOT, 'contracts/fbx', filename), 'utf8'));
}

function runValidator(cases) {
  const script = String.raw`
import json, sys
from jsonschema import Draft202012Validator
payload = json.load(sys.stdin)
results = []
for case in payload['cases']:
    Draft202012Validator.check_schema(case['schema'])
    validator = Draft202012Validator(case['schema'])
    errors = [error.message for error in validator.iter_errors(case['artifact'])]
    results.append({'id': case['id'], 'valid': not errors, 'errors': errors})
json.dump(results, sys.stdout)
`;
  const input = JSON.stringify({ cases });
  let res = spawnSync('python', ['-c', script], { input, encoding: 'utf8', maxBuffer: 1024 * 1024 });
  if (res.status !== 0 && res.error?.code === 'ENOENT') {
    res = spawnSync('python3', ['-c', script], { input, encoding: 'utf8', maxBuffer: 1024 * 1024 });
  }
  assert.equal(res.status, 0, res.stderr || 'python execution failed');
  return JSON.parse(res.stdout);
}

function assertValid(schema, artifact, id) {
  const [res] = runValidator([{ id, schema, artifact }]);
  assert.ok(res.valid, `Expected valid schema for ${id}, got: ${res.errors.join(', ')}`);
}

function assertInvalid(schema, artifact, id) {
  const [res] = runValidator([{ id, schema, artifact }]);
  assert.equal(res.valid, false, `Expected invalid schema for ${id}, but it passed`);
}

function sourceObject(id, order) {
  return {
    sourceObjectId: id, ufbxElementType: 'MESH', domClass: 'Geometry', domSubtype: 'Mesh',
    domSourceName: `Geometry::${id}`, displayName: `Geometry ${id}`, sourceRecordDisposition: 'SUPPORTED',
    ufbxElementId: order, ufbxTypedId: order, ufbxElementTypeValue: 7, sourceDocumentOrder: order,
    customProperties: [], connectionPropertyNames: [],
  };
}

function modelObject(id, order) {
  return { ...sourceObject(id, order), ufbxElementType: 'MODEL', domClass: 'Model', domSubtype: 'Null' };
}

function baseGraph() {
  return enforceSourceGraphPolicy({
    schema: 'FbxSourceGraph.v2', file: { version: 7400, ascii: false }, documentMetadata: {}, globalSettings: {},
    sourceObjects: [sourceObject('10', 0), sourceObject('11', 1), modelObject('20', 2), modelObject('21', 3)],
    occurrences: [
      { sourceOccurrenceId: 'occ:10', sourceModelObjectId: '20', parentOccurrenceId: null, geometryObjectIds: ['10'], inheritMode: 0, originalInheritMode: 0, hasGeometryTransform: false, geometryMatrixMm: [...MATRIX] },
      { sourceOccurrenceId: 'occ:11', sourceModelObjectId: '21', parentOccurrenceId: null, geometryObjectIds: ['11'], inheritMode: 0, originalInheritMode: 0, hasGeometryTransform: false, geometryMatrixMm: [...MATRIX] },
    ],
    geometries: [
      { geometryObjectId: '10', sourceObjectId: '10', kind: 'MESH', ownerOccurrenceIds: ['occ:10'], verticesMm: [[0, 0, 0]] },
      { geometryObjectId: '11', sourceObjectId: '11', kind: 'MESH', ownerOccurrenceIds: ['occ:11'], verticesMm: [[1, 0, 0]] },
    ],
    hierarchyEdges: [], connectionEdges: [], warnings: [], unsupportedRecords: [], unresolvedReferences: [],
  });
}

function selectedGraph(full) {
  return enforceSourceGraphPolicy({
    ...structuredClone(full),
    sourceObjects: full.sourceObjects.filter((item) => ['10', '20'].includes(item.sourceObjectId)),
    occurrences: full.occurrences.filter((item) => item.sourceOccurrenceId === 'occ:10'),
    geometries: full.geometries.filter((item) => item.geometryObjectId === '10'),
    duplicateSourceObjectIds: [],
  });
}

function topology(full) {
  const pt = (x) => { const b = new ArrayBuffer(24); new DataView(b).setFloat64(0, x, true); return b; };
  const desc = (id, off) => ({ geometryObjectId: id, sourceObjectId: id, controlPointCount: 1, polygonCount: 0, polygonVertexCount: 0, emptyPolygonCount: 0, pointPolygonCount: 0, linePolygonCount: 0, reversedWinding: false, bufferIndices: { controlPointsMm: off, polygonOffsets: off + 1, polygonVertexIndices: off + 2 } });
  return { rawTopology: { schema: 'FbxRawMeshTopology.v1', sourceGraph: full, geometries: [desc('10', 0), desc('11', 3)] }, buffers: [pt(0), new ArrayBuffer(4), new ArrayBuffer(0), pt(1), new ArrayBuffer(4), new ArrayBuffer(0)] };
}

async function evidence(bundle) {
  const body = {
    sourceIdentity: structuredClone(SOURCE), parserIdentity: structuredClone(PARSER),
    sourceGraphSha256: bundle.manifest.sourceGraphSha256, geometryBundleDigest: bundle.manifest.bundleDigest,
    coordinateUnit: 'millimetre', selectedZone: { zoneId: 'occ:10', label: 'Zone 10' },
    selectedOccurrenceIds: ['occ:10'], ancestorOccurrenceIds: [], selectedGeometryIds: ['10'], sharedGeometryEvidence: [],
    occurrenceEvidence: [{ sourceOccurrenceId: 'occ:10', sourceModelObjectId: '20', parentOccurrenceId: null, geometryObjectIds: ['10'], inheritMode: 0, originalInheritMode: 0, hasGeometryTransform: false, geometryMatrixMm: [...MATRIX] }],
    geometryEvidence: [{ descriptor: structuredClone(bundle.manifest.geometries[0]), bufferDescriptors: structuredClone(bundle.manifest.buffers.slice(0, 3)) }],
    toleranceProfileVersion: 'FbxDerivedPortToleranceProfile.v1',
    conservation: { selectedOccurrenceCount: 1, selectedGeometryCount: 1, selectedTopologyGeometryCount: 1, ancestorEvidenceCount: 0, sharedGeometryCount: 0, siblingExclusiveGeometryIncludedCount: 0, selectedOccurrenceGeometryReferenceCount: 1 },
  };
  return { schema: 'FbxZoneGeometryEvidence.v1', artifactId: `fbx-zone-geometry-evidence:${await sha256Hex(`FbxZoneGeometryEvidence.v1\0${canonicalJson(body)}`)}`, ...body };
}

async function testContext() {
  const graph = baseGraph();
  const bundle = await buildFbxGeometryBundle({ ...topology(graph), sourceIdentity: SOURCE, parserIdentity: PARSER });
  return { sourceGraph: selectedGraph(graph), zoneGeometryEvidence: await evidence(bundle), geometryBundle: bundle, producerRevision: REVISION };
}

const manifestSchema = loadSchema('fbx-selected-zone-geometry-manifest.v1.schema.json');
const auditSchema = loadSchema('fbx-selected-zone-package-audit.v1.schema.json');
assert.equal(manifestSchema.properties.schema.const, FBX_SELECTED_ZONE_GEOMETRY_MANIFEST_SCHEMA);
assert.equal(auditSchema.properties.schema.const, FBX_SELECTED_ZONE_PACKAGE_AUDIT_SCHEMA);

const ctx = await testContext();
const pkg1 = await buildSelectedZonePackageCore(ctx);
const pkg2 = await buildSelectedZonePackageCore(ctx);

assert.equal(canonicalJson(pkg1.geometryManifest), canonicalJson(pkg2.geometryManifest));
assert.equal(canonicalJson(pkg1.audit), canonicalJson(pkg2.audit));
assertValid(manifestSchema, pkg1.geometryManifest, 'real-manifest');
assertValid(auditSchema, pkg1.audit, 'real-audit');

assertInvalid(manifestSchema, { ...pkg1.geometryManifest, extraField: true }, 'unexpected-manifest-root');
assertInvalid(auditSchema, { ...pkg1.audit, extraField: true }, 'unexpected-audit-root');

const occLeak = structuredClone(pkg1.geometryManifest); occLeak.geometries[0].occurrenceId = 'occ:10';
assertInvalid(manifestSchema, occLeak, 'occurrence-in-geometry');

const matLeak = structuredClone(pkg1.geometryManifest); matLeak.geometries[0].matrix = [...MATRIX];
assertInvalid(manifestSchema, matLeak, 'transform-in-geometry');

const suppLeak = structuredClone(pkg1.geometryManifest); suppLeak.geometries[0].supportSemantics = 'anchor';
assertInvalid(manifestSchema, suppLeak, 'support-in-geometry');

const badRole = structuredClone(pkg1.geometryManifest); badRole.buffers[0].role = 'normal-vectors';
assertInvalid(manifestSchema, badRole, 'unknown-buffer-role');

const badPath = structuredClone(pkg1.geometryManifest); badPath.buffers[0].packagePath = '../../unsafe.bin';
assertInvalid(manifestSchema, badPath, 'unsafe-package-path');

const badStatus = structuredClone(pkg1.audit); badStatus.packageStatus = 'PARTIAL_RECOVERY';
assertInvalid(auditSchema, badStatus, 'unknown-package-status');

const missingAuth = structuredClone(pkg1.audit); delete missingAuth.authority.supportSemantics;
assertInvalid(auditSchema, missingAuth, 'missing-authority-declaration');

const badRev = structuredClone(pkg1.audit); badRev.producerRevision = 'invalid-rev';
assertInvalid(auditSchema, badRev, 'malformed-revision');

const silentOmit = structuredClone(pkg1.audit); silentOmit.files[0].status = 'OMITTED_BLOCKED'; silentOmit.files[0].reason = null;
assertInvalid(auditSchema, silentOmit, 'silently-missing-reason');

console.log('test-selected-zone-package-contracts: PASS');
