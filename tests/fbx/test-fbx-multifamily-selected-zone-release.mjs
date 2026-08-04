import assert from 'node:assert/strict';
import {
  BLOCKED_MANAGED_MULTI_FAMILY_RELEASE,
  MANAGED_MULTI_FAMILY_STAGEDJSON_PASS,
  countSelectedZoneFamilies,
  promoteManagedMultiFamilyResult,
} from '../../tabs/model-converters/fbx-multifamily-release-addon.js';
import { listFbxSourceGraphPreviewZones } from '../../tabs/model-converters/fbx-source-graph-preview.js';
import { enforceSourceGraphPolicy } from '../../tabs/model-converters/converters/fbx/source-graph.js';

const matrix = () => [1,0,0,0,1,0,0,0,1,0,0,0];
const transform = { translation:[0,0,0], rotation:[0,0,0,1], scale:[1,1,1] };
function source(id, name, subtype = 'Null', mesh = false) {
  return {
    sourceObjectId:id, ufbxElementId:Number(id), ufbxTypedId:Number(id),
    ufbxElementType:mesh ? 'MESH' : 'NODE', ufbxElementTypeValue:mesh ? 2 : 1,
    domClass:mesh ? 'Geometry' : 'Model', domSubtype:subtype,
    domSourceName:`${mesh ? 'Geometry' : 'Model'}::${name}`,
    displayName:`${mesh ? 'Geometry' : 'Model'}::${name}`,
    customProperties:[], sourceRecordDisposition:mesh ? 'supported-geometry' : 'supported-occurrence',
    nodeAttributeType:null, nodeAttributeTypeValue:null, objectPropertyPath:null,
    connectionPropertyNames:[], sourceDocumentOrder:Number(id),
  };
}
function occurrence(id, model, parent, geometryObjectIds = []) {
  return {
    sourceOccurrenceId:id, sourceModelObjectId:model, parentOccurrenceId:parent,
    geometryObjectIds, inheritMode:0, originalInheritMode:0, hasGeometryTransform:false,
    localTransformSource:transform, geometryTransformSource:transform,
    worldMatrixSource:matrix(), geometryMatrixSource:matrix(),
    worldMatrixMm:matrix(), geometryMatrixMm:matrix(),
  };
}
function child(type, occurrenceId, extra = {}) {
  return {
    type,
    id:`${type}-${occurrenceId || 'generated'}`,
    name:`${type}-${occurrenceId || 'generated'}`,
    attributes:{
      REF:`${type}-${occurrenceId || 'generated'}`,
      ...(occurrenceId ? { sourceOccurrenceId:occurrenceId } : {}),
      ...extra,
    },
    children:[],
  };
}

const graph = enforceSourceGraphPolicy({
  schema:'FbxSourceGraph.v2', file:{ version:7500, ascii:false, creator:'test' },
  documentMetadata:{ originalApplication:'test', latestApplication:'test' },
  globalSettings:{ unitMeters:1, axes:{ right:1, up:2, front:-3 } },
  sourceObjects:[
    source('1','Scene'), source('2','Project'), source('3','Zone A'), source('4','Zone B'),
    source('5','Pipe','Mesh',true), source('6','Elbow','Mesh',true),
    source('7','Tee','Mesh',true), source('8','Valve','Mesh',true),
    source('9','Flange','Mesh',true), source('10','Other','Mesh',true),
  ],
  occurrences:[
    occurrence('occ:1','1',null), occurrence('occ:2','2','occ:1'),
    occurrence('occ:3','3','occ:2'), occurrence('occ:4','4','occ:2'),
    occurrence('occ:5','5','occ:3',['5']), occurrence('occ:6','6','occ:3',['6']),
    occurrence('occ:7','7','occ:3',['7']), occurrence('occ:8','8','occ:3',['8']),
    occurrence('occ:9','9','occ:3',['9']), occurrence('occ:10','10','occ:4',['10']),
  ],
  geometries:['5','6','7','8','9','10'].map((id) => ({
    geometryObjectId:id, sourceObjectId:id, kind:'MESH',
    verticesSource:[[0,0,0],[1,0,0]], verticesMm:[[0,0,0],[1,0,0]],
    ownerOccurrenceIds:[`occ:${id}`],
  })),
  hierarchyEdges:[
    ['occ:1','occ:2'], ['occ:2','occ:3'], ['occ:2','occ:4'],
    ['occ:3','occ:5'], ['occ:3','occ:6'], ['occ:3','occ:7'],
    ['occ:3','occ:8'], ['occ:3','occ:9'], ['occ:4','occ:10'],
  ].map(([parentOccurrenceId, childOccurrenceId]) => ({ parentOccurrenceId, childOccurrenceId })),
  connectionEdges:[], warnings:[], unsupportedRecords:[], unresolvedReferences:[],
  duplicateSourceObjectIds:[],
});
const zoneA = listFbxSourceGraphPreviewZones(graph).find((item) => item.label === 'Zone A');
assert.ok(zoneA?.zoneId);

const managed = [{
  type:'BRANCH', id:'B1', name:'B1', attributes:{ REF:'B1' },
  children:[
    child('PIPE','occ:5'), child('ELBO','occ:6'), child('TEE','occ:7'),
    child('VALV','occ:8'), child('FLAN','occ:9'),
    child('PIPE',null,{
      mappingEngineering:{ generationProvenance:{ generated:true, sourceOccurrenceIds:['occ:5'] } },
    }),
    child('PIPE','occ:10'),
  ],
}];
const context = {
  inputFiles:[
    { role:'primary', name:'sample.fbx', bytes:new Uint8Array([1,2,3]) },
    { role:'secondary', name:'sample_managed_stage.json',
      bytes:new TextEncoder().encode(JSON.stringify(managed)) },
  ],
};
const result = {
  ok:true, blocked:false, conversionStatus:'STAGEDJSON_SELECTED_ZONE_PASS',
  outputs:[
    { name:'sample.selected-zone.json', text:'[{"type":"BRANCH","children":[{"type":"PIPE"}]}]' },
    { name:'sample.fbx-source-graph.json', text:JSON.stringify(graph) },
  ],
  logs:{ stdout:[`SELECTED_ZONE_ID:${zoneA.zoneId}`], stderr:[] },
};

const promoted = await promoteManagedMultiFamilyResult(context, result);
assert.equal(promoted.conversionStatus, 'STAGEDJSON_SELECTED_ZONE_PASS');
assert.equal(promoted.selectedZoneRelease.status, MANAGED_MULTI_FAMILY_STAGEDJSON_PASS);
assert.equal(promoted.selectedZoneRelease.authority, 'APPROVED_MANAGED_STAGE');
const released = JSON.parse(promoted.outputs.find((item) => /selected-zone\.json$/.test(item.name)).text);
const types = released.flatMap((branch) => branch.children.map((item) => item.type));
assert.deepEqual(types, ['PIPE','ELBO','TEE','VALV','FLAN','PIPE']);
assert.equal(types.includes('PIPE') && types.includes('ELBO') && types.includes('TEE'), true);
assert.equal(types.includes('VALV') && types.includes('FLAN'), true);
assert.equal(types.some((type) => type === 'PIPE' && types.length === 6), true);
assert.equal(promoted.logs.stdout.includes('SELECTED_ZONE_RELEASE:MANAGED_MULTI_FAMILY'), true);
const summary = countSelectedZoneFamilies(released);
assert.deepEqual(summary.familyCounts, {
  ELBOW:1, FLANGE:1, PIPE:2, TEE:1, VALVE:1,
});

const emptyContext = {
  ...context,
  inputFiles:[context.inputFiles[0], {
    role:'secondary', name:'empty_managed_stage.json',
    bytes:new TextEncoder().encode(JSON.stringify([{
      type:'BRANCH', id:'B2', name:'B2', attributes:{ REF:'B2' }, children:[child('PIPE','occ:10')],
    }])) ,
  }],
};
const blocked = await promoteManagedMultiFamilyResult(emptyContext, result);
assert.equal(blocked.conversionStatus, BLOCKED_MANAGED_MULTI_FAMILY_RELEASE);
assert.equal(blocked.blocked, true);
assert.equal(blocked.outputs.some((item) => /selected-zone\.json$/.test(item.name)), false);

console.log('test-fbx-multifamily-selected-zone-release: PASS');
