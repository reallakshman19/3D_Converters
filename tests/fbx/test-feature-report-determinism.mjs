import assert from 'node:assert/strict';
import { canonicalJson } from '../../tabs/model-converters/converters/fbx/canonical-json.js';
import { buildFbxFeatureReport } from '../../tabs/model-converters/converters/fbx/feature-report.js';

const sourceIdentity = { sha256:'a'.repeat(64), byteLength:27, fbxVersion:7400 };
const parserIdentity = { provenanceSchema:'UfbxParserProvenance.v1', upstreamRevision:'b'.repeat(40), sourceSha256:'c'.repeat(64), wasmSha256:'d'.repeat(64) };
function source(id, type, value) { return { sourceObjectId:id, ufbxElementId:value, ufbxTypedId:0, ufbxElementType:type,
  ufbxElementTypeValue:value, domClass:type, domSubtype:'', domSourceName:'', displayName:'', customProperties:[],
  sourceRecordDisposition:'retained-evidence', nodeAttributeType:null, nodeAttributeTypeValue:null,
  objectPropertyPath:null, connectionPropertyNames:[], sourceDocumentOrder:value }; }
function graph(reverse = false) {
  const sourceObjects = [source('25','TEXTURE',25), source('24','MATERIAL',24), source('32','ANIM_CURVE',32)];
  const warnings = [{type:2,description:'b',elementId:2,count:1},{type:1,description:'a',elementId:1,count:1}];
  return { schema:'FbxSourceGraph.v2', file:{version:7400,ascii:false,creator:''}, documentMetadata:{originalApplication:'',latestApplication:''},
    globalSettings:{unitMeters:1,axes:{right:0,up:1,front:2}}, sourceObjects:reverse?sourceObjects.reverse():sourceObjects,
    occurrences:[], geometries:[], hierarchyEdges:[], connectionEdges:[], warnings:reverse?warnings.reverse():warnings,
    unsupportedRecords:[], unresolvedReferences:[], duplicateSourceObjectIds:[] };
}
const first = buildFbxFeatureReport({ graph:graph(false), sourceIdentity, parserIdentity });
const second = buildFbxFeatureReport({ graph:graph(true), sourceIdentity, parserIdentity });
assert.equal(canonicalJson(first), canonicalJson(second));
assert.deepEqual(first.features.map((item) => item.featureId), [...first.features.map((item) => item.featureId)].sort());
assert.deepEqual(first.blockedCapabilities, [...first.blockedCapabilities].sort((a,b) => a.featureId < b.featureId ? -1 : a.featureId > b.featureId ? 1 : 0));
for (const forbidden of ['workerMode','inputByteLength','progressStages','stageTimingsMs','runtimeEnvironment','runConfiguration','runs','aggregate','timestamp','durationMs']) {
  assert.doesNotMatch(canonicalJson(first), new RegExp(`"${forbidden}"`));
}
console.log('test-feature-report-determinism: PASS');
