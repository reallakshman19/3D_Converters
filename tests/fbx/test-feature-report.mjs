import assert from 'node:assert/strict';
import { buildFbxFeatureReport, validateFbxFeatureReport } from '../../tabs/model-converters/converters/fbx/feature-report.js';

const identity = [1,0,0,0,1,0,0,0,1,0,0,0];
const transform = { translation: [0,0,0], rotation: [0,0,0,1], scale: [1,1,1] };
const prop = { name: 'Tag', type: 1, flags: 0, valueInt: 1, valueReal: 0, valueVec4: [0,0,0,0], valueString: 'x' };
function source(id, type, value, disposition, options = {}) {
  return { sourceObjectId: id, ufbxElementId: value, ufbxTypedId: 0, ufbxElementType: type,
    ufbxElementTypeValue: value, domClass: options.domClass || type, domSubtype: '', domSourceName: '', displayName: '',
    customProperties: options.customProperties || [], sourceRecordDisposition: disposition,
    nodeAttributeType: options.nodeAttributeType ?? null, nodeAttributeTypeValue: options.nodeAttributeTypeValue ?? null,
    objectPropertyPath: null, connectionPropertyNames: [], sourceDocumentOrder: value };
}
const graph = {
  schema: 'FbxSourceGraph.v2', file: { version: 7400, ascii: false, creator: 'fixture' },
  documentMetadata: { originalApplication: '', latestApplication: '' },
  globalSettings: { unitMeters: 0.01, axes: { right: 0, up: 2, front: 5 } },
  sourceObjects: [
    source('201','NODE',1,'supported-occurrence',{ nodeAttributeType:'MESH', nodeAttributeTypeValue:2, domClass:'Model', customProperties:[prop] }),
    source('101','MESH',2,'supported-geometry',{ domClass:'Geometry' }),
    source('102','NURBS_CURVE',8,'supported-geometry',{ domClass:'Geometry' }),
    source('301','MATERIAL',24,'retained-evidence'), source('302','TEXTURE',25,'retained-evidence'),
    source('303','ANIM_CURVE',32,'retained-evidence'), source('304','UNRECOGNIZED_ELEMENT_TYPE',42,'unresolved-unknown'),
  ],
  occurrences: [{ sourceOccurrenceId:'occ:201', sourceModelObjectId:'201', parentOccurrenceId:null,
    geometryObjectIds:['101','102'], inheritMode:0, originalInheritMode:0, hasGeometryTransform:false,
    localTransformSource:transform, geometryTransformSource:transform, worldMatrixSource:identity,
    geometryMatrixSource:identity, worldMatrixMm:identity, geometryMatrixMm:identity }],
  geometries: [
    { geometryObjectId:'101', sourceObjectId:'101', kind:'MESH', verticesSource:[[0,0,0],[1,0,0]], verticesMm:[[0,0,0],[10,0,0]], ownerOccurrenceIds:['occ:201'] },
    { geometryObjectId:'102', sourceObjectId:'102', kind:'NURBS_CURVE', controlPointsSource:[[0,0,0,1],[1,0,0,1]], controlPointsMm:[[0,0,0,1],[10,0,0,1]], ownerOccurrenceIds:['occ:201'] },
  ], hierarchyEdges: [], connectionEdges: [{ sourceObjectId:'301', destinationObjectId:'201', sourceProperty:'', destinationProperty:'' }],
  warnings: [{ type:1, description:'fixture warning', elementId:1, count:1 }],
  unsupportedRecords: [], unresolvedReferences: [{ sourceObjectId:'304', reason:'unknown-element-type' }], duplicateSourceObjectIds: [],
};
const sourceIdentity = { sha256: '1'.repeat(64), byteLength: 1000, fbxVersion: 7400 };
const parserIdentity = { provenanceSchema:'UfbxParserProvenance.v1', upstreamRevision:'2'.repeat(40), sourceSha256:'3'.repeat(64), wasmSha256:'4'.repeat(64) };
const report = buildFbxFeatureReport({ graph, sourceIdentity, parserIdentity });
validateFbxFeatureReport(report);
assert.equal(report.schema, 'FbxFeatureReport.v1');
assert.equal(report.sourceGraphSchema, 'FbxSourceGraph.v2');
assert.equal(report.counts.meshPointValues, 2);
assert.equal(report.counts.nurbsControlPointValues, 2);
assert.equal(report.counts.customProperties, 1);
assert.equal(report.unknownElementTypes[0].elementTypeValue, 42);
assert.equal(report.warnings[0].description, 'fixture warning');
assert.equal(Object.isFrozen(report), true);

const byId = Object.fromEntries(report.features.map((item) => [item.featureId, item]));
assert.deepEqual({ recognized:byId['mesh-points'].recognized, parsed:byId['mesh-points'].parsed,
  retained:byId['mesh-points'].retainedAsEvidence, render:byId['mesh-points'].renderStatus,
  export:byId['mesh-points'].exportStatus, mapping:byId['mesh-points'].engineeringMappingStatus,
  publish:byId['mesh-points'].stagedJsonStatus },
{ recognized:true, parsed:true, retained:true, render:'blocked-missing-data', export:'blocked-missing-data', mapping:'supported', publish:'requires-governed-mapping' });
assert.equal(byId['mesh-topology'].recognized, true);
assert.equal(byId['mesh-topology'].parsed, false);
assert.equal(byId['mesh-topology'].retainedAsEvidence, false);
assert.equal(byId.materials.evidenceStatus, 'metadata-only');
assert.equal(byId.materials.renderStatus, 'blocked-missing-data');
assert.equal(byId['unknown-elements'].recognized, false);
assert.equal(byId['unknown-elements'].retainedAsEvidence, true);
assert.equal(report.summary.renderableFeatures, 0);
assert.equal(report.summary.exportableFeatures, 0);
assert.equal(report.summary.stagedJsonPublicationEligibleFeatures, 0);
assert.ok(report.summary.stagedJsonRequiresGovernedMappingFeatures >= 1);
assert.ok(report.blockedCapabilities.some((item) => item.featureId === 'materials' && item.capability === 'render'));

assert.throws(() => buildFbxFeatureReport({ graph, sourceIdentity:{...sourceIdentity,fbxVersion:7500}, parserIdentity }), /does not match/);
assert.throws(() => buildFbxFeatureReport({ graph, sourceIdentity, parserIdentity:{...parserIdentity,wasmSha256:'bad'} }), /digest/);
const malformed = structuredClone(report); malformed.runtimeEnvironment = {}; assert.throws(() => validateFbxFeatureReport(malformed), /fields/);
for (const mutate of [
  (value) => { value.sourceIdentity.fbxVersion = 1; },
  (value) => { value.features.find((item) => item.featureId === 'mesh-topology').parsed = true; },
  (value) => { value.features.find((item) => item.featureId === 'mesh-points').stagedJsonStatus = 'supported'; },
  (value) => { value.summary.presentFeatures += 1; },
  (value) => { value.blockedCapabilities.pop(); },
  (value) => { value.unknownElementTypes[0].count += 1; },
  (value) => { value.counts.meshPointValues += 1; },
  (value) => { value.warnings[0].count = 0; },
]) {
  const value = structuredClone(report); mutate(value); assert.throws(() => validateFbxFeatureReport(value));
}
console.log('test-feature-report: PASS');
