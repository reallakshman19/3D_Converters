import { canonicalJson, deepFreeze } from './canonical-json.js';
import {
  BindingFailure, canonicalDigest, observeSource,
  verifyParserBinding, verifySourceBinding, verifySourceGraphBinding,
} from './mapping-package.js';
import { enforceSourceGraphPolicy } from './source-graph.js';

const WORKLIST_KEYS = Object.freeze([
  'schema', 'worklistId', 'source', 'parser', 'sourceGraph',
  'scopePolicy', 'workItems', 'retainedEvidence',
]);
const WORK_ITEM_KEYS = Object.freeze([
  'workItemId', 'sourceModelObjectId', 'sourceOccurrenceId',
  'sourceGeometryObjectIds', 'typeEvidence', 'nameEvidence',
  'sourceRecordDisposition', 'geometryEvidence', 'reviewState',
]);
const HASH_PATTERN = /^[0-9a-f]{64}$/;
const REVISION_PATTERN = /^[0-9a-f]{40}$/;

export class WorklistFailure extends Error {
  constructor(status, message, evidence = null) {
    super(`${status} ${message}`);
    this.name = 'WorklistFailure';
    this.status = status;
    this.evidence = evidence;
  }
}

function fail(status, message, evidence = null) {
  throw new WorklistFailure(status, message, evidence);
}

function exactKeys(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('BLOCKED_WORKLIST_CONTRACT', `${label} must be an object.`);
  }
  const actual = Object.keys(value).sort().join('\0');
  const expected = [...keys].sort().join('\0');
  if (actual !== expected) fail('BLOCKED_WORKLIST_CONTRACT', `${label} has missing or unexpected fields.`);
  return value;
}

function requireText(value, label) {
  if (typeof value !== 'string' || !value) fail('BLOCKED_WORKLIST_CONTRACT', `${label} is required.`);
  return value;
}

function requireHash(value, label) {
  const text = requireText(value, label);
  if (!HASH_PATTERN.test(text)) fail('BLOCKED_WORKLIST_CONTRACT', `${label} must be lowercase SHA-256.`);
  return text;
}

function compareText(left, right) {
  return String(left) < String(right) ? -1 : String(left) > String(right) ? 1 : 0;
}

function validateParserEvidence(value) {
  const keys = ['provenanceSchema', 'upstreamRevision', 'sourceSha256', 'wasmSha256'];
  exactKeys(value, keys, 'parserEvidence');
  requireText(value.provenanceSchema, 'parserEvidence.provenanceSchema');
  requireHash(value.sourceSha256, 'parserEvidence.sourceSha256');
  requireHash(value.wasmSha256, 'parserEvidence.wasmSha256');
  if (!REVISION_PATTERN.test(requireText(value.upstreamRevision, 'parserEvidence.upstreamRevision'))) {
    fail('BLOCKED_WORKLIST_PARSER_BINDING', 'parserEvidence.upstreamRevision is malformed.');
  }
  return value;
}

function typeEvidence(source) {
  return {
    ufbxElementId: source.ufbxElementId,
    ufbxTypedId: source.ufbxTypedId,
    ufbxElementType: source.ufbxElementType,
    ufbxElementTypeValue: source.ufbxElementTypeValue,
    nodeAttributeType: source.nodeAttributeType,
    nodeAttributeTypeValue: source.nodeAttributeTypeValue,
    sourceDocumentOrder: source.sourceDocumentOrder,
  };
}

function nameEvidence(source) {
  return {
    authority: 'NON_AUTHORITATIVE',
    domClass: source.domClass,
    domSubtype: source.domSubtype,
    domSourceName: source.domSourceName,
    displayName: source.displayName,
  };
}

function geometryEvidence(geometry) {
  const mesh = geometry.kind === 'MESH';
  return {
    geometryObjectId: geometry.geometryObjectId,
    kind: geometry.kind,
    pointAuthority: mesh ? 'MESH_VERTEX' : 'NURBS_CONTROL_POINT',
    governedPointCount: mesh ? geometry.verticesMm.length : geometry.controlPointsMm.length,
  };
}

function scopePolicy() {
  return {
    id: 'SOURCE_GRAPH_SUPPORTED_OCCURRENCES_V1',
    authority: 'FbxSourceGraph.v2',
    requiredElementType: 'NODE',
    requiredDisposition: 'supported-occurrence',
    identityJoin: 'occurrence.sourceModelObjectId',
    namesAuthoritative: false,
    geometryAuthoritativeForClassification: false,
  };
}

function retainedEvidence(source) {
  return {
    sourceObjectId: source.sourceObjectId,
    typeEvidence: typeEvidence(source),
    nameEvidence: nameEvidence(source),
    sourceRecordDisposition: source.sourceRecordDisposition,
    evidenceRole: 'NON_OCCURRENCE_TRACE',
  };
}

function workItemPayload(source, occurrence, geometries) {
  const geometryIds = [...occurrence.geometryObjectIds].map(String).sort();
  return {
    sourceModelObjectId: source.sourceObjectId,
    sourceOccurrenceId: occurrence.sourceOccurrenceId,
    sourceGeometryObjectIds: geometryIds,
    typeEvidence: typeEvidence(source),
    nameEvidence: nameEvidence(source),
    sourceRecordDisposition: source.sourceRecordDisposition,
    geometryEvidence: geometryIds.map((id) => geometryEvidence(geometries.get(id))),
    reviewState: 'PENDING',
  };
}

async function buildWorkItem(source, occurrence, geometries) {
  const payload = workItemPayload(source, occurrence, geometries);
  return { workItemId: `work-${await canonicalDigest(payload)}`, ...payload };
}

function worklistPayload(value) {
  return {
    schema: value.schema,
    source: structuredClone(value.source),
    parser: structuredClone(value.parser),
    sourceGraph: structuredClone(value.sourceGraph),
    scopePolicy: structuredClone(value.scopePolicy),
    workItems: structuredClone(value.workItems),
    retainedEvidence: structuredClone(value.retainedEvidence),
  };
}

export async function calculateWorklistId(value) {
  return canonicalDigest(worklistPayload(value));
}

function sourceIndexes(graph) {
  return {
    sources: new Map(graph.sourceObjects.map((item) => [item.sourceObjectId, item])),
    geometries: new Map(graph.geometries.map((item) => [item.geometryObjectId, item])),
  };
}

function governedOccurrences(graph, sources) {
  return graph.occurrences.filter((occurrence) => {
    const source = sources.get(occurrence.sourceModelObjectId);
    return source?.ufbxElementType === 'NODE' && source.sourceRecordDisposition === 'supported-occurrence';
  });
}

function assertOwnedGeometry(occurrences, geometries) {
  for (const occurrence of occurrences) for (const id of occurrence.geometryObjectIds) {
    const geometry = geometries.get(String(id));
    if (!geometry) fail('BLOCKED_WORKLIST_SOURCE_GRAPH_BINDING', `geometry ${id} is missing.`);
    if (!geometry.ownerOccurrenceIds.includes(occurrence.sourceOccurrenceId)) {
      fail('BLOCKED_WORKLIST_SOURCE_GRAPH_BINDING', `geometry ${id} lacks occurrence ownership.`);
    }
  }
}

export async function buildMappingWorklist({ bytes, graph, parserEvidence }) {
  validateParserEvidence(parserEvidence);
  const canonicalGraph = enforceSourceGraphPolicy(graph);
  const { sources, geometries } = sourceIndexes(canonicalGraph);
  const occurrences = governedOccurrences(canonicalGraph, sources);
  assertOwnedGeometry(occurrences, geometries);
  const workItems = await Promise.all(occurrences.map((occurrence) => (
    buildWorkItem(sources.get(occurrence.sourceModelObjectId), occurrence, geometries)
  )));
  workItems.sort((left, right) => compareText(left.workItemId, right.workItemId));
  const governedIds = new Set(workItems.map((item) => item.sourceModelObjectId));
  const draft = {
    schema: 'FbxMappingWorklist.v1',
    worklistId: '0'.repeat(64),
    source: await observeSource(bytes),
    parser: structuredClone(parserEvidence),
    sourceGraph: { schema: canonicalGraph.schema, canonicalSha256: await canonicalDigest(canonicalGraph) },
    scopePolicy: scopePolicy(),
    workItems,
    retainedEvidence: canonicalGraph.sourceObjects
      .filter((source) => !governedIds.has(source.sourceObjectId))
      .map(retainedEvidence),
  };
  draft.worklistId = await calculateWorklistId(draft);
  return deepFreeze(validateMappingWorklistShape(draft));
}

function validateWorkItem(item, index) {
  exactKeys(item, WORK_ITEM_KEYS, `workItems[${index}]`);
  requireText(item.workItemId, `workItems[${index}].workItemId`);
  requireText(item.sourceModelObjectId, `workItems[${index}].sourceModelObjectId`);
  requireText(item.sourceOccurrenceId, `workItems[${index}].sourceOccurrenceId`);
  if (!Array.isArray(item.sourceGeometryObjectIds) || !Array.isArray(item.geometryEvidence)) {
    fail('BLOCKED_WORKLIST_CONTRACT', `workItems[${index}] geometry evidence must be arrays.`);
  }
  if (item.reviewState !== 'PENDING') fail('BLOCKED_WORKLIST_CONTRACT', `workItems[${index}] must be PENDING.`);
  if (item.sourceRecordDisposition !== 'supported-occurrence') {
    fail('BLOCKED_WORKLIST_CONTRACT', `workItems[${index}] has invalid source disposition.`);
  }
}

export function validateMappingWorklistShape(value) {
  const worklist = exactKeys(value, WORKLIST_KEYS, 'worklist');
  if (worklist.schema !== 'FbxMappingWorklist.v1') fail('BLOCKED_WORKLIST_CONTRACT', 'unsupported worklist schema.');
  requireHash(worklist.worklistId, 'worklist.worklistId');
  if (!Array.isArray(worklist.workItems) || !Array.isArray(worklist.retainedEvidence)) {
    fail('BLOCKED_WORKLIST_CONTRACT', 'worklist arrays are required.');
  }
  worklist.workItems.forEach(validateWorkItem);
  return worklist;
}

function mapBindingError(error, status) {
  if (error instanceof BindingFailure) fail(status, error.message, error.evidence);
  throw error;
}

export async function verifyMappingWorklist({ bytes, graph, parserEvidence, worklist }) {
  validateMappingWorklistShape(worklist);
  const observedId = await calculateWorklistId(worklist);
  if (observedId !== worklist.worklistId) fail('BLOCKED_WORKLIST_CONTRACT', 'worklistId is stale or tampered.');
  try { verifySourceBinding(worklist, await observeSource(bytes)); }
  catch (error) { mapBindingError(error, 'BLOCKED_WORKLIST_SOURCE_BINDING'); }
  try { verifyParserBinding(worklist, parserEvidence); }
  catch (error) { mapBindingError(error, 'BLOCKED_WORKLIST_PARSER_BINDING'); }
  try { await verifySourceGraphBinding(worklist, enforceSourceGraphPolicy(graph)); }
  catch (error) { mapBindingError(error, 'BLOCKED_WORKLIST_SOURCE_GRAPH_BINDING'); }
  const regenerated = await buildMappingWorklist({ bytes, graph, parserEvidence });
  if (canonicalJson(regenerated) !== canonicalJson(worklist)) {
    fail('BLOCKED_WORKLIST_CONTRACT', 'worklist does not match canonical source evidence.');
  }
  return worklist;
}
