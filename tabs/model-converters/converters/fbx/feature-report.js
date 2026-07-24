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
  audio: ['AUDIO_LAYER', 'AUDIO_CLIP'], 'blend-shapes': ['BLEND_DEFORMER', 'BLEND_CHANNEL', 'BLEND_SHAPE'],
  cameras: ['CAMERA', 'STEREO_CAMERA', 'CAMERA_SWITCHER'], constraints: ['CONSTRAINT'], lights: ['LIGHT'],
  'line-curves': ['LINE_CURVE'], materials: ['MATERIAL'], 'metadata-objects': ['METADATA_OBJECT'],
  'nurbs-surfaces': ['NURBS_SURFACE', 'NURBS_TRIM_SURFACE', 'NURBS_TRIM_BOUNDARY'],
  'procedural-geometry': ['PROCEDURAL_GEOMETRY'], rigging: ['BONE', 'CHARACTER', 'POSE'],
  'scene-organization': ['EMPTY', 'MARKER', 'LOD_GROUP', 'DISPLAY_LAYER', 'SELECTION_SET', 'SELECTION_NODE'],
  shaders: ['SHADER', 'SHADER_BINDING'],
  'skinning-and-cache-deformation': ['SKIN_DEFORMER', 'SKIN_CLUSTER', 'CACHE_DEFORMER', 'CACHE_FILE'],
  textures: ['TEXTURE'], video: ['VIDEO'], 'unknown-elements': ['UNKNOWN', 'UNRECOGNIZED_ELEMENT_TYPE'],
});
const COUNT_KEYS = [
  'sourceObjects', 'occurrences', 'geometries', 'meshGeometries', 'nurbsCurveGeometries',
  'meshPointValues', 'nurbsControlPointValues', 'hierarchyEdges', 'connectionEdges',
  'customProperties', 'warnings', 'unsupportedRecords', 'unresolvedReferences', 'duplicateSourceObjectIds',
];
const CAPABILITIES = ['evidence', 'render', 'export', 'engineering-mapping', 'stagedjson'];
const SUMMARY_KEYS = ['presentFeatures','recognizedFeatures','parsedFeatures','retainedEvidenceFeatures','renderableFeatures','exportableFeatures','engineeringMappingEligibleFeatures','stagedJsonPublicationEligibleFeatures','stagedJsonRequiresGovernedMappingFeatures','blockedCapabilities','unknownFeatures'];
const STATUS_SET = new Set(CAPABILITY_STATUS_VOCABULARY);
const MISSING_PAYLOAD = new Set(['mesh-topology', 'nurbs-curve-definition']);

function exactKeys(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${label} must be an object.`);
  const actual = Object.keys(value).sort(), expected = [...keys].sort();
  if (actual.join('\0') !== expected.join('\0')) throw new TypeError(`${label} fields are invalid.`);
}
function validateSourceIdentity(value, expectedVersion = null) {
  exactKeys(value, ['sha256', 'byteLength', 'fbxVersion'], 'sourceIdentity');
  if (!HASH.test(value.sha256) || !Number.isSafeInteger(value.byteLength) || value.byteLength <= 0) throw new TypeError('sourceIdentity is invalid.');
  if (!Number.isInteger(value.fbxVersion) || value.fbxVersion < 3000 || value.fbxVersion > 7700) throw new TypeError('sourceIdentity fbxVersion is invalid.');
  if (expectedVersion !== null && value.fbxVersion !== expectedVersion) throw new TypeError('sourceIdentity fbxVersion does not match the graph.');
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
  const present = count > 0, missingPayload = MISSING_PAYLOAD.has(featureId), unknown = featureId === 'unknown-elements';
  return { recognized: present && !unknown, parsed: present && !missingPayload && !unknown,
    retainedAsEvidence: present && (!missingPayload || unknown), evidenceCount: count,
    stagedJsonStatus: !present ? 'not-applicable' : policy.engineeringMappingStatus === 'supported'
      ? 'requires-governed-mapping' : policy.engineeringMappingStatus };
}
function featureRows(registry, counts) {
  return registry.entries.map((policy) => ({ featureId: policy.featureId,
    ...lifecycle(policy.featureId, counts[policy.featureId] || 0, policy), evidenceStatus: policy.evidenceStatus,
    renderStatus: policy.renderStatus, exportStatus: policy.exportStatus,
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
  const present = features.filter((item) => item.evidenceCount > 0), count = (predicate) => present.filter(predicate).length;
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
  const features = featureRows(registry, evidenceCounts(accepted)), blockedCapabilities = blockedRows(features);
  const report = { schema: 'FbxFeatureReport.v1', registryVersion: registry.registryVersion,
    sourceGraphSchema: accepted.schema, sourceIdentity: structuredClone(sourceIdentity), parserIdentity: structuredClone(parserIdentity),
    counts: graphCounts(accepted), features, unknownElementTypes: unknownTypes(accepted),
    warnings: structuredClone(accepted.warnings), blockedCapabilities, summary: summary(features, blockedCapabilities) };
  return deepFreeze(validateFbxFeatureReport(report));
}
function validateFeatureRows(rows) {
  if (!Array.isArray(rows) || rows.length !== FBX_FEATURE_CAPABILITY_REGISTRY.entries.length) throw new TypeError('Feature rows are incomplete.');
  rows.forEach((item, index) => {
    exactKeys(item, FEATURE_KEYS, `features[${index}]`);
    const policy = FBX_FEATURE_CAPABILITY_REGISTRY.entries[index], expected = lifecycle(policy.featureId, item.evidenceCount, policy);
    if (item.featureId !== policy.featureId || !Number.isSafeInteger(item.evidenceCount) || item.evidenceCount < 0) throw new TypeError('Feature identity or count is invalid.');
    for (const key of ['recognized','parsed','retainedAsEvidence']) if (typeof item[key] !== 'boolean' || item[key] !== expected[key]) throw new TypeError(`${item.featureId}.${key} is invalid.`);
    for (const key of ['evidenceStatus','renderStatus','exportStatus','engineeringMappingStatus','stagedJsonStatus']) if (!STATUS_SET.has(item[key])) throw new TypeError(`${item.featureId}.${key} is invalid.`);
    if (item.evidenceStatus !== policy.evidenceStatus || item.renderStatus !== policy.renderStatus || item.exportStatus !== policy.exportStatus || item.engineeringMappingStatus !== policy.engineeringMappingStatus || item.stagedJsonStatus !== expected.stagedJsonStatus) throw new TypeError(`${item.featureId} policy or publication state differs from the registry.`);
    if (JSON.stringify(item.limitations) !== JSON.stringify(policy.limitations) || item.futureWorkPack !== policy.futureWorkPack) throw new TypeError(`${item.featureId} limitations differ from the registry.`);
  });
}
function validateUnknownTypes(values) {
  if (!Array.isArray(values)) throw new TypeError('unknownElementTypes must be an array.');
  let previous = null, total = 0;
  values.forEach((item, index) => {
    exactKeys(item, ['elementType','elementTypeValue','count'], `unknownElementTypes[${index}]`);
    const pair = item.elementType === 'UNKNOWN' ? item.elementTypeValue === 0
      : item.elementType === 'UNRECOGNIZED_ELEMENT_TYPE' && Number.isInteger(item.elementTypeValue) && item.elementTypeValue >= 42;
    if (!pair || !Number.isSafeInteger(item.count) || item.count < 1) throw new TypeError('Unknown element type evidence is invalid.');
    const key = `${String(item.elementTypeValue).padStart(12, '0')}:${item.elementType}`;
    if (previous !== null && previous >= key) throw new TypeError('unknownElementTypes must be unique and ordered.');
    previous = key; total += item.count;
  });
  return total;
}
function warningOrder(left, right) {
  return left.type - right.type || left.elementId - right.elementId
    || (left.description < right.description ? -1 : left.description > right.description ? 1 : 0) || left.count - right.count;
}
function validateWarnings(values) {
  if (!Array.isArray(values)) throw new TypeError('warnings must be an array.');
  values.forEach((item, index) => {
    exactKeys(item, ['type','description','elementId','count'], `warnings[${index}]`);
    if (!Number.isInteger(item.type) || item.type < 0 || typeof item.description !== 'string'
      || !Number.isInteger(item.elementId) || item.elementId < 0 || !Number.isSafeInteger(item.count) || item.count < 1) throw new TypeError('Warning evidence is invalid.');
    if (index && warningOrder(values[index - 1], item) > 0) throw new TypeError('warnings must be deterministically ordered.');
  });
}
function validateBlockedCapabilities(value) {
  if (!Array.isArray(value.blockedCapabilities)) throw new TypeError('blockedCapabilities must be an array.');
  value.blockedCapabilities.forEach((item, index) => {
    exactKeys(item, ['featureId','capability','status','limitations'], `blockedCapabilities[${index}]`);
    if (!CAPABILITIES.includes(item.capability) || !STATUS_SET.has(item.status)) throw new TypeError('Blocked capability is invalid.');
  });
  if (JSON.stringify(value.blockedCapabilities) !== JSON.stringify(blockedRows(value.features))) throw new TypeError('blockedCapabilities differ from feature policy.');
}
function validateCountRelations(value, unknownCount) {
  const byId = Object.fromEntries(value.features.map((item) => [item.featureId, item]));
  const exact = [['connectionEdges','connection-records'],['customProperties','custom-properties'],['meshPointValues','mesh-points'],
    ['nurbsControlPointValues','nurbs-curve-control-points'],['occurrences','node-transforms']];
  for (const [countKey, featureId] of exact) if (value.counts[countKey] !== byId[featureId].evidenceCount) throw new TypeError(`${countKey} differs from feature evidence.`);
  if (value.counts.geometries !== value.counts.meshGeometries + value.counts.nurbsCurveGeometries) throw new TypeError('Geometry counts are inconsistent.');
  if (value.counts.warnings !== value.warnings.length || unknownCount !== byId['unknown-elements'].evidenceCount) throw new TypeError('Report array counts are inconsistent.');
  if (byId['document-metadata'].evidenceCount !== 1 || value.counts.duplicateSourceObjectIds > value.counts.sourceObjects) throw new TypeError('Report counts are inconsistent.');
  if (byId['mesh-topology'].evidenceCount < value.counts.meshGeometries || byId['nurbs-curve-definition'].evidenceCount < value.counts.nurbsCurveGeometries) throw new TypeError('Geometry feature counts are inconsistent.');
  if (value.counts.occurrences && byId['scene-hierarchy'].evidenceCount !== value.counts.occurrences) throw new TypeError('Scene hierarchy count is inconsistent.');
}
export function validateFbxFeatureReport(value) {
  exactKeys(value, ['schema','registryVersion','sourceGraphSchema','sourceIdentity','parserIdentity','counts','features','unknownElementTypes','warnings','blockedCapabilities','summary'], 'featureReport');
  if (value.schema !== 'FbxFeatureReport.v1' || value.registryVersion !== '1.0.0' || value.sourceGraphSchema !== 'FbxSourceGraph.v2') throw new TypeError('Feature report schema is invalid.');
  validateSourceIdentity(value.sourceIdentity); validateParserIdentity(value.parserIdentity);
  exactKeys(value.counts, COUNT_KEYS, 'featureReport.counts');
  if (Object.values(value.counts).some((item) => !Number.isSafeInteger(item) || item < 0)) throw new TypeError('Feature report counts are invalid.');
  validateFeatureRows(value.features); const unknownCount = validateUnknownTypes(value.unknownElementTypes);
  validateWarnings(value.warnings); validateBlockedCapabilities(value); validateCountRelations(value, unknownCount);
  exactKeys(value.summary, SUMMARY_KEYS, 'featureReport.summary');
  if (JSON.stringify(value.summary) !== JSON.stringify(summary(value.features, value.blockedCapabilities))) throw new TypeError('Feature report summary is inconsistent.');
  return value;
}
