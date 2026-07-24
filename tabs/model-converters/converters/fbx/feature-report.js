import { deepFreeze } from './canonical-json.js';
import { enforceSourceGraphPolicy } from './source-graph.js';
import {
  CAPABILITY_STATUS_VOCABULARY, FBX_FEATURE_CAPABILITY_REGISTRY, validateFeatureCapabilityRegistry,
} from './feature-capability-registry.js';

const HASH = /^[0-9a-f]{64}$/;
const REVISION = /^[0-9a-f]{40}$/;
const FEATURE_KEYS = [
  'featureId', 'recognized', 'parsed', 'retainedAsEvidence', 'evidenceCount',
  'evidenceStatus', 'renderStatus', 'exportStatus', 'engineeringMappingStatus',
  'stagedJsonStatus', 'limitations', 'futureWorkPack',
];
const TYPE_GROUPS = Object.freeze({
  animation: ['ANIM_STACK', 'ANIM_LAYER', 'ANIM_VALUE', 'ANIM_CURVE'],
  audio: ['AUDIO_LAYER', 'AUDIO_CLIP'],
  'blend-shapes': ['BLEND_DEFORMER', 'BLEND_CHANNEL', 'BLEND_SHAPE'],
  cameras: ['CAMERA', 'STEREO_CAMERA', 'CAMERA_SWITCHER'], constraints: ['CONSTRAINT'],
  lights: ['LIGHT'], 'line-curves': ['LINE_CURVE'], materials: ['MATERIAL'],
  'metadata-objects': ['METADATA_OBJECT'], 'nurbs-surfaces': ['NURBS_SURFACE', 'NURBS_TRIM_SURFACE', 'NURBS_TRIM_BOUNDARY'],
  'procedural-geometry': ['PROCEDURAL_GEOMETRY'], rigging: ['BONE', 'CHARACTER', 'POSE'],
  'scene-organization': ['EMPTY', 'MARKER', 'LOD_GROUP', 'DISPLAY_LAYER', 'SELECTION_SET', 'SELECTION_NODE'],
  shaders: ['SHADER', 'SHADER_BINDING'],
  'skinning-and-cache-deformation': ['SKIN_DEFORMER', 'SKIN_CLUSTER', 'CACHE_DEFORMER', 'CACHE_FILE'],
  textures: ['TEXTURE'], video: ['VIDEO'], 'unknown-elements': ['UNKNOWN', 'UNRECOGNIZED_ELEMENT_TYPE'],
});
const COUNT_KEYS = [
  'sourceObjects', 'occurrences', 'geometries', 'meshGeometries', 'nurbsCurveGeometries',
  'meshPointValues', 'nurbsControlPointValues', 'hierarchyEdges', 'connectionEdges',
  'customProperties', 'warnings', 'unsupportedRecords', 'unresolvedReferences',
  'duplicateSourceObjectIds',
];
const CAPABILITIES = ['evidence', 'render', 'export', 'engineering-mapping', 'stagedjson'];
const SUMMARY_KEYS = ['presentFeatures','recognizedFeatures','parsedFeatures','retainedEvidenceFeatures','renderableFeatures','exportableFeatures','engineeringMappingEligibleFeatures','stagedJsonPublicationEligibleFeatures','stagedJsonRequiresGovernedMappingFeatures','blockedCapabilities','unknownFeatures'];
const STATUS_SET = new Set(CAPABILITY_STATUS_VOCABULARY);

function exactKeys(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${label} must be an object.`);
  const actual = Object.keys(value).sort(), expected = [...keys].sort();
  if (actual.join('\0') !== expected.join('\0')) throw new TypeError(`${label} fields are invalid.`);
}
function validateSourceIdentity(value, version) {
  exactKeys(value, ['sha256', 'byteLength', 'fbxVersion'], 'sourceIdentity');
  if (!HASH.test(value.sha256) || !Number.isSafeInteger(value.byteLength) || value.byteLength <= 0) throw new TypeError('sourceIdentity is invalid.');
  if (!Number.isInteger(value.fbxVersion) || value.fbxVersion !== version) throw new TypeError('sourceIdentity fbxVersion does not match the graph.');
}
function validateParserIdentity(value) {
  exactKeys(value, ['provenanceSchema', 'upstreamRevision', 'sourceSha256', 'wasmSha256'], 'parserIdentity');
  if (typeof value.provenanceSchema !== 'string' || !value.provenanceSchema || !REVISION.test(value.upstreamRevision)) throw new TypeError('parserIdentity is invalid.');
  if (!HASH.test(value.sourceSha256) || !HASH.test(value.wasmSha256)) throw new TypeError('parserIdentity digests are invalid.');
}
function typeCounts(graph) {
  const counts = new Map();
  for (const source of graph.sourceObjects) counts.set(source.ufbxElementType, (counts.get(source.ufbxElementType) || 0) + 1);
  return counts;
}
function totalTypes(counts, types) { return types.reduce((sum, type) => sum + (counts.get(type) || 0), 0); }
function evidenceCounts(graph) {
  const types = typeCounts(graph), mesh = graph.geometries.filter((item) => item.kind === 'MESH');
  const curves = graph.geometries.filter((item) => item.kind === 'NURBS_CURVE');
  const values = Object.fromEntries(Object.entries(TYPE_GROUPS).map(([id, names]) => [id, totalTypes(types, names)]));
  return { ...values, 'document-metadata': 1, 'scene-hierarchy': graph.occurrences.length || (types.get('NODE') || 0),
    'node-transforms': graph.occurrences.length, 'connection-records': graph.connectionEdges.length,
    'custom-properties': graph.sourceObjects.reduce((sum, item) => sum + item.customProperties.length, 0),
    'mesh-points': mesh.reduce((sum, item) => sum + item.verticesMm.length, 0),
    'mesh-topology': mesh.length || (types.get('MESH') || 0),
    'nurbs-curve-control-points': curves.reduce((sum, item) => sum + item.controlPointsMm.length, 0),
    'nurbs-curve-definition': curves.length || (types.get('NURBS_CURVE') || 0) };
}
function graphCounts(graph) {
  const mesh = graph.geometries.filter((item) => item.kind === 'MESH');
  const curves = graph.geometries.filter((item) => item.kind === 'NURBS_CURVE');
  return { sourceObjects: graph.sourceObjects.length, occurrences: graph.occurrences.length, geometries: graph.geometries.length,
    meshGeometries: mesh.length, nurbsCurveGeometries: curves.length,
    meshPointValues: mesh.reduce((sum, item) => sum + item.verticesMm.length, 0),
    nurbsControlPointValues: curves.reduce((sum, item) => sum + item.controlPointsMm.length, 0),
    hierarchyEdges: graph.hierarchyEdges.length, connectionEdges: graph.connectionEdges.length,
    customProperties: graph.sourceObjects.reduce((sum, item) => sum + item.customProperties.length, 0), warnings: graph.warnings.length,
    unsupportedRecords: graph.unsupportedRecords.length, unresolvedReferences: graph.unresolvedReferences.length,
    duplicateSourceObjectIds: graph.duplicateSourceObjectIds.length };
}
function lifecycle(featureId, count, policy) {
  const present = count > 0, missingPayload = ['mesh-topology', 'nurbs-curve-definition'].includes(featureId);
  const unknown = featureId === 'unknown-elements';
  return { recognized: present && !unknown, parsed: present && !missingPayload && !unknown,
    retainedAsEvidence: present && (!missingPayload || unknown), evidenceCount: count,
    stagedJsonStatus: !present ? 'not-applicable' : policy.engineeringMappingStatus === 'supported'
      ? 'requires-governed-mapping' : policy.engineeringMappingStatus };
}
function featureRows(registry, counts) {
  return registry.entries.map((policy) => ({ featureId: policy.featureId,
    ...lifecycle(policy.featureId, counts[policy.featureId] || 0, policy),
    evidenceStatus: policy.evidenceStatus, renderStatus: policy.renderStatus, exportStatus: policy.exportStatus,
    engineeringMappingStatus: policy.engineeringMappingStatus, limitations: [...policy.limitations], futureWorkPack: policy.futureWorkPack }));
}
function unknownTypes(graph) {
  const values = new Map();
  for (const item of graph.sourceObjects.filter((value) => ['UNKNOWN', 'UNRECOGNIZED_ELEMENT_TYPE'].includes(value.ufbxElementType))) {
    const key = `${item.ufbxElementTypeValue}:${item.ufbxElementType}`;
    const current = values.get(key) || { elementType: item.ufbxElementType, elementTypeValue: item.ufbxElementTypeValue, count: 0 };
    current.count += 1; values.set(key, current);
  }
  return [...values.values()].sort((a, b) => a.elementTypeValue - b.elementTypeValue || (a.elementType < b.elementType ? -1 : 1));
}
function blockedRows(features) {
  const fields = [['evidence','evidenceStatus'],['render','renderStatus'],['export','exportStatus'],['engineering-mapping','engineeringMappingStatus'],['stagedjson','stagedJsonStatus']];
  const rows = [];
  for (const feature of features.filter((item) => item.evidenceCount > 0)) for (const [capability, field] of fields) {
    if (['supported', 'not-applicable', 'requires-governed-mapping'].includes(feature[field])) continue;
    rows.push({ featureId: feature.featureId, capability, status: feature[field], limitations: [...feature.limitations] });
  }
  return rows.sort((a, b) => (a.featureId < b.featureId ? -1 : a.featureId > b.featureId ? 1 : 0) || CAPABILITIES.indexOf(a.capability) - CAPABILITIES.indexOf(b.capability));
}
function summary(features, blockedCapabilities) {
  const present = features.filter((item) => item.evidenceCount > 0);
  const count = (predicate) => present.filter(predicate).length;
  return { presentFeatures: present.length, recognizedFeatures: count((item) => item.recognized), parsedFeatures: count((item) => item.parsed),
    retainedEvidenceFeatures: count((item) => item.retainedAsEvidence), renderableFeatures: count((item) => item.renderStatus === 'supported'),
    exportableFeatures: count((item) => item.exportStatus === 'supported'), engineeringMappingEligibleFeatures: count((item) => item.engineeringMappingStatus === 'supported'),
    stagedJsonPublicationEligibleFeatures: count((item) => item.stagedJsonStatus === 'supported'),
    stagedJsonRequiresGovernedMappingFeatures: count((item) => item.stagedJsonStatus === 'requires-governed-mapping'),
    blockedCapabilities: blockedCapabilities.length, unknownFeatures: count((item) => item.evidenceStatus === 'unknown') };
}

export function buildFbxFeatureReport({ graph, sourceIdentity, parserIdentity, registry = FBX_FEATURE_CAPABILITY_REGISTRY }) {
  validateFeatureCapabilityRegistry(registry);
  const accepted = enforceSourceGraphPolicy(graph);
  validateSourceIdentity(sourceIdentity, accepted.file.version); validateParserIdentity(parserIdentity);
  const features = featureRows(registry, evidenceCounts(accepted));
  const blockedCapabilities = blockedRows(features);
  return deepFreeze({ schema: 'FbxFeatureReport.v1', registryVersion: registry.registryVersion,
    sourceGraphSchema: accepted.schema, sourceIdentity: structuredClone(sourceIdentity), parserIdentity: structuredClone(parserIdentity),
    counts: graphCounts(accepted), features, unknownElementTypes: unknownTypes(accepted),
    warnings: structuredClone(accepted.warnings), blockedCapabilities, summary: summary(features, blockedCapabilities) });
}

function validateFeatureRows(rows) {
  if (!Array.isArray(rows) || rows.length !== FBX_FEATURE_CAPABILITY_REGISTRY.entries.length) throw new TypeError('Feature rows are incomplete.');
  rows.forEach((item, index) => {
    exactKeys(item, FEATURE_KEYS, `features[${index}]`);
    const policy = FBX_FEATURE_CAPABILITY_REGISTRY.entries[index];
    if (item.featureId !== policy.featureId || !Number.isSafeInteger(item.evidenceCount) || item.evidenceCount < 0) throw new TypeError('Feature identity or count is invalid.');
    for (const key of ['recognized','parsed','retainedAsEvidence']) if (typeof item[key] !== 'boolean') throw new TypeError(`${item.featureId}.${key} is invalid.`);
    for (const key of ['evidenceStatus','renderStatus','exportStatus','engineeringMappingStatus','stagedJsonStatus']) if (!STATUS_SET.has(item[key])) throw new TypeError(`${item.featureId}.${key} is invalid.`);
    if (item.evidenceStatus !== policy.evidenceStatus || item.renderStatus !== policy.renderStatus || item.exportStatus !== policy.exportStatus || item.engineeringMappingStatus !== policy.engineeringMappingStatus) throw new TypeError(`${item.featureId} policy differs from the registry.`);
    if (JSON.stringify(item.limitations) !== JSON.stringify(policy.limitations) || item.futureWorkPack !== policy.futureWorkPack) throw new TypeError(`${item.featureId} limitations differ from the registry.`);
  });
}
function validateReportArrays(value) {
  if (!Array.isArray(value.unknownElementTypes) || !Array.isArray(value.warnings) || !Array.isArray(value.blockedCapabilities)) throw new TypeError('Feature report arrays are invalid.');
  value.unknownElementTypes.forEach((item, index) => { exactKeys(item, ['elementType','elementTypeValue','count'], `unknownElementTypes[${index}]`); });
  value.warnings.forEach((item, index) => { exactKeys(item, ['type','description','elementId','count'], `warnings[${index}]`); });
  value.blockedCapabilities.forEach((item, index) => { exactKeys(item, ['featureId','capability','status','limitations'], `blockedCapabilities[${index}]`); if (!CAPABILITIES.includes(item.capability) || !STATUS_SET.has(item.status)) throw new TypeError('Blocked capability is invalid.'); });
}
export function validateFbxFeatureReport(value) {
  exactKeys(value, ['schema','registryVersion','sourceGraphSchema','sourceIdentity','parserIdentity','counts','features','unknownElementTypes','warnings','blockedCapabilities','summary'], 'featureReport');
  if (value.schema !== 'FbxFeatureReport.v1' || value.registryVersion !== '1.0.0' || value.sourceGraphSchema !== 'FbxSourceGraph.v2') throw new TypeError('Feature report schema is invalid.');
  validateSourceIdentity(value.sourceIdentity, value.sourceIdentity.fbxVersion); validateParserIdentity(value.parserIdentity);
  exactKeys(value.counts, COUNT_KEYS, 'featureReport.counts');
  if (Object.values(value.counts).some((item) => !Number.isSafeInteger(item) || item < 0)) throw new TypeError('Feature report counts are invalid.');
  validateFeatureRows(value.features); validateReportArrays(value);
  exactKeys(value.summary, SUMMARY_KEYS, 'featureReport.summary');
  if (Object.values(value.summary).some((item) => !Number.isSafeInteger(item) || item < 0)) throw new TypeError('Feature report summary is invalid.');
  return value;
}
