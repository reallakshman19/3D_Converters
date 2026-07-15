/**
 * Exact three-way topology parity engine for CanonicalTopology.v1,
 * ParsedInputXmlTopology.v1, and TopologySvgScene.v1. Identity and incidence are
 * exact. Coordinates are compared only after applying the writer's declared
 * serialization precision; the exported tolerance is zero.
 */

import { deterministicHash, stampArtifactHash, TOPOLOGY_HASH_ALGORITHM } from './topology-deterministic-hash.js';
import { cleanText, uniqueText } from './topology-values.js';

const GLOBAL_DECIMALS = 3;
const DELTA_DECIMALS = 6;

/** @param {unknown[]} values @returns {string[]} */
function sortedText(values) {
  return uniqueText(values ?? []).sort((left, right) => left.localeCompare(right));
}

/** @param {unknown} value @param {number} decimals @returns {number|null} */
function numberAt(value, decimals) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(decimals)) : null;
}

/** @param {Record<string,unknown>|null|undefined} value @param {number} [decimals] @returns {{x:number,y:number,z:number}|null} */
function pointAt(value, decimals = GLOBAL_DECIMALS) {
  if (!value) return null;
  const point = { x: numberAt(value.x, decimals), y: numberAt(value.y, decimals), z: numberAt(value.z, decimals) };
  return Object.values(point).every((item) => item !== null) ? point : null;
}

/** @param {Record<string,unknown>} from @param {Record<string,unknown>} to @returns {{x:number,y:number,z:number}} */
function deltaAt(from, to) {
  return {
    x: numberAt(Number(to.x) - Number(from.x), DELTA_DECIMALS),
    y: numberAt(Number(to.y) - Number(from.y), DELTA_DECIMALS),
    z: numberAt(Number(to.z) - Number(from.z), DELTA_DECIMALS),
  };
}

/** @param {unknown} left @param {unknown} right @returns {boolean} */
function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

/** @param {Record<string,unknown>} context @returns {Record<string,unknown>} */
function mismatch(context) {
  return {
    category: cleanText(context.category),
    severity: cleanText(context.severity) || 'ERROR',
    canonicalIdentity: context.canonicalIdentity ?? null,
    inputXmlIdentity: context.inputXmlIdentity ?? null,
    svgIdentity: context.svgIdentity ?? null,
    expected: context.expected ?? null,
    actual: context.actual ?? null,
    sourceEntities: sortedText(context.sourceEntities ?? []),
    sourcePaths: sortedText(context.sourcePaths ?? []),
    decisionTrace: context.decisionTrace ?? [],
    recommendedOwnerModule: cleanText(context.recommendedOwnerModule),
    message: cleanText(context.message),
  };
}

/** @param {Record<string,unknown>} ledger @param {string[]} sourceIds @param {string[]} canonicalIds @returns {Record<string,unknown>[]} */
function decisionTrace(ledger, sourceIds, canonicalIds) {
  const sourceSet = new Set(sourceIds);
  const canonicalSet = new Set(canonicalIds);
  return (ledger.records ?? []).filter((record) => (
    sourceSet.has(record.sourceEntityId)
    || (record.canonicalEdgeIds ?? []).some((id) => canonicalSet.has(id))
    || (record.canonicalNodeIds ?? []).some((id) => canonicalSet.has(id))
  )).map((record) => ({
    ledgerRecordId: record.id,
    sourceEntityId: record.sourceEntityId,
    sourcePath: record.sourcePath,
    disposition: record.primaryDisposition,
    operation: record.operation,
    projectionCardinality: record.projectionCardinality,
    status: record.status,
  }));
}

/** @param {Record<string,unknown>[]} rows @param {(row:Record<string,unknown>)=>string} key @returns {Map<string,Record<string,unknown>>} */
function rowMap(rows, key) {
  const map = new Map();
  for (const row of rows ?? []) {
    const id = cleanText(key(row));
    if (id) map.set(id, row);
  }
  return map;
}

/** @param {Record<string,unknown>} canonical @returns {Map<string,Record<string,unknown>>} */
function canonicalNodeMap(canonical) {
  return rowMap(canonical.nodes, (row) => row.id);
}

/** @param {Record<string,unknown>} canonical @param {Record<string,unknown>} parsed @param {Record<string,unknown>} ledger @returns {Record<string,unknown>[]} */
export function compareCanonicalToInputXml(canonical, parsed, ledger = { records: [] }) {
  const mismatches = [];
  const canonicalNodes = canonicalNodeMap(canonical);
  const inputNodes = rowMap(parsed.nodes, (row) => row.canonicalNodeId);
  const canonicalEdges = rowMap(canonical.edges, (row) => row.id);
  const inputEdges = rowMap(parsed.elements, (row) => row.canonicalEdgeId);

  for (const edge of canonical.edges ?? []) {
    const actual = inputEdges.get(edge.id);
    const sourceEntities = sortedText(edge.sourceEntityIds ?? []);
    const trace = decisionTrace(ledger, sourceEntities, [edge.id, edge.fromNodeId, edge.toNodeId]);
    if (!actual) {
      mismatches.push(mismatch({
        category: 'MISSING_IN_INPUTXML_EDGE', canonicalIdentity: edge.id,
        expected: edge.inputXmlElementIds?.[0] ?? edge.id, actual: null,
        sourceEntities, sourcePaths: edge.sourcePaths, decisionTrace: trace,
        recommendedOwnerModule: 'topology-inputxml-writer.js',
        message: `Canonical edge ${edge.id} has no InputXML PIPINGELEMENT.`,
      }));
      continue;
    }
    const expectedIncidence = { from: edge.fromNodeId, to: edge.toNodeId };
    const actualIncidence = { from: actual.fromCanonicalNodeId, to: actual.toCanonicalNodeId };
    if (!same(expectedIncidence, actualIncidence)) mismatches.push(mismatch({
      category: 'INCIDENCE_MISMATCH_INPUTXML_EDGE', canonicalIdentity: edge.id, inputXmlIdentity: actual.id,
      expected: expectedIncidence, actual: actualIncidence, sourceEntities, sourcePaths: edge.sourcePaths,
      decisionTrace: trace, recommendedOwnerModule: 'topology-inputxml-writer.js',
      message: `InputXML incidence for ${edge.id} does not match canonical FROM/TO.`,
    }));
    const from = canonicalNodes.get(edge.fromNodeId), to = canonicalNodes.get(edge.toNodeId);
    const expectedGeometry = {
      from: pointAt(from?.position), to: pointAt(to?.position),
      delta: from && to ? deltaAt(from.position, to.position) : null,
    };
    const actualGeometry = { from: actual.fromPosition, to: actual.toPosition, delta: actual.delta };
    if (!same(expectedGeometry, actualGeometry)) mismatches.push(mismatch({
      category: 'COORDINATE_MISMATCH_INPUTXML_EDGE', canonicalIdentity: edge.id, inputXmlIdentity: actual.id,
      expected: expectedGeometry, actual: actualGeometry, sourceEntities, sourcePaths: edge.sourcePaths,
      decisionTrace: trace, recommendedOwnerModule: 'topology-inputxml-writer.js',
      message: `InputXML world geometry for ${edge.id} differs after writer-precision normalization.`,
    }));
    const expectedIdentity = {
      sourceEntityIds: sortedText(edge.sourceEntityIds),
      sourcePortIds: sortedText(edge.sourcePortIds),
      branchIds: sortedText(edge.branchIds),
      topologyOperation: cleanText(edge.topologyOperation ?? edge.segmentRole),
      projectionCardinality: cleanText(edge.projectionCardinality || 'ONE_TO_ONE'),
      mergeAuthority: cleanText(edge.projectionMergeAuthority),
    };
    const actualIdentity = {
      sourceEntityIds: sortedText(actual.sourceEntityIds),
      sourcePortIds: sortedText(actual.sourcePortIds),
      branchIds: sortedText(actual.branchIds),
      topologyOperation: cleanText(actual.topologyOperation),
      projectionCardinality: cleanText(actual.projectionCardinality),
      mergeAuthority: cleanText(actual.mergeAuthority),
    };
    if (!same(expectedIdentity, actualIdentity)) mismatches.push(mismatch({
      category: 'IDENTITY_MISMATCH_INPUTXML_EDGE', canonicalIdentity: edge.id, inputXmlIdentity: actual.id,
      expected: expectedIdentity, actual: actualIdentity, sourceEntities, sourcePaths: edge.sourcePaths,
      decisionTrace: trace, recommendedOwnerModule: 'topology-inputxml-trace-attributes.js',
      message: `InputXML trace identity for ${edge.id} differs from canonical topology.`,
    }));
  }
  for (const element of parsed.elements ?? []) if (!canonicalEdges.has(element.canonicalEdgeId)) mismatches.push(mismatch({
    category: 'EXTRA_IN_INPUTXML_EDGE', inputXmlIdentity: element.id,
    expected: null, actual: element.canonicalEdgeId || element.id,
    sourceEntities: element.sourceEntityIds, recommendedOwnerModule: 'topology-inputxml-writer.js',
    message: `InputXML element ${element.id} has no canonical edge.`,
  }));

  for (const node of canonical.nodes ?? []) {
    const actual = inputNodes.get(node.id);
    const sourceEntities = sortedText(node.sourceEntityIds ?? []);
    if (!actual) {
      mismatches.push(mismatch({
        category: 'MISSING_IN_INPUTXML_NODE', canonicalIdentity: node.id,
        expected: node.inputXmlNodeIds?.[0] ?? node.id, actual: null,
        sourceEntities, sourcePaths: node.sourcePaths,
        decisionTrace: decisionTrace(ledger, sourceEntities, [node.id]),
        recommendedOwnerModule: 'topology-inputxml-writer.js',
        message: `Canonical node ${node.id} is not recoverable from InputXML.`,
      }));
      continue;
    }
    const expected = {
      inputXmlNodeId: cleanText(node.inputXmlNodeIds?.[0]),
      position: pointAt(node.position),
      sourceEntityIds: sortedText(node.sourceEntityIds),
      sourcePortIds: sortedText(node.sourcePortIds),
    };
    const actualValue = {
      inputXmlNodeId: cleanText(actual.inputXmlNodeId),
      position: actual.position,
      sourceEntityIds: sortedText(actual.sourceEntityIds),
      sourcePortIds: sortedText(actual.sourcePortIds),
    };
    if (!same(expected, actualValue)) mismatches.push(mismatch({
      category: same(expected.position, actualValue.position) ? 'IDENTITY_MISMATCH_INPUTXML_NODE' : 'COORDINATE_MISMATCH_INPUTXML_NODE',
      canonicalIdentity: node.id, inputXmlIdentity: actual.inputXmlNodeId,
      expected, actual: actualValue, sourceEntities, sourcePaths: node.sourcePaths,
      decisionTrace: decisionTrace(ledger, sourceEntities, [node.id]),
      recommendedOwnerModule: 'topology-inputxml-trace-attributes.js',
      message: `InputXML node ${actual.inputXmlNodeId} does not exactly match canonical node ${node.id}.`,
    }));
  }
  for (const node of parsed.nodes ?? []) if (!canonicalNodes.has(node.canonicalNodeId)) mismatches.push(mismatch({
    category: 'EXTRA_IN_INPUTXML_NODE', inputXmlIdentity: node.inputXmlNodeId,
    expected: null, actual: node.canonicalNodeId, sourceEntities: node.sourceEntityIds,
    recommendedOwnerModule: 'topology-inputxml-topology-parser.js',
    message: `InputXML node ${node.inputXmlNodeId} references unknown canonical node ${node.canonicalNodeId}.`,
  }));

  mismatches.push(...compareSupportsToInput(canonical, parsed, ledger));
  mismatches.push(...compareRigidsToInput(canonical, parsed, ledger));
  mismatches.push(...compareJunctionsToInput(canonical, parsed, ledger));
  mismatches.push(...compareBoundariesToInput(canonical, parsed, ledger));
  mismatches.push(...compareDeferredToInput(canonical, parsed, ledger));
  return mismatches;
}

/** @param {Record<string,unknown>} canonical @param {Record<string,unknown>} scene @param {Record<string,unknown>} ledger @returns {Record<string,unknown>[]} */
export function compareCanonicalToSvgScene(canonical, scene, ledger = { records: [] }) {
  const mismatches = [];
  const canonicalNodes = canonicalNodeMap(canonical);
  const sceneNodes = rowMap(scene.nodes, (row) => row.canonicalNodeId);
  const canonicalEdges = rowMap(canonical.edges, (row) => row.id);
  const sceneEdges = rowMap(scene.edges, (row) => row.canonicalEdgeId);
  for (const edge of canonical.edges ?? []) {
    const actual = sceneEdges.get(edge.id);
    const sourceEntities = sortedText(edge.sourceEntityIds ?? []);
    if (!actual) {
      mismatches.push(mismatch({
        category: 'MISSING_IN_SVG_EDGE', canonicalIdentity: edge.id,
        expected: edge.id, actual: null, sourceEntities, sourcePaths: edge.sourcePaths,
        decisionTrace: decisionTrace(ledger, sourceEntities, [edge.id]),
        recommendedOwnerModule: 'topology-svg-scene-builder.js',
        message: `Canonical edge ${edge.id} has no TopologySvgScene edge.`,
      }));
      continue;
    }
    const expected = {
      fromCanonicalNodeId: edge.fromNodeId,
      toCanonicalNodeId: edge.toNodeId,
      fromPosition: pointAt(canonicalNodes.get(edge.fromNodeId)?.position),
      toPosition: pointAt(canonicalNodes.get(edge.toNodeId)?.position),
      inputXmlElementId: cleanText(edge.inputXmlElementIds?.[0]),
      sourceEntityIds: sortedText(edge.sourceEntityIds),
      sourcePortIds: sortedText(edge.sourcePortIds),
      branchIds: sortedText(edge.branchIds),
      topologyOperation: cleanText(edge.topologyOperation ?? edge.segmentRole),
      projectionCardinality: cleanText(edge.projectionCardinality || 'ONE_TO_ONE'),
      mergeAuthority: cleanText(edge.projectionMergeAuthority),
    };
    const actualValue = {
      fromCanonicalNodeId: actual.fromCanonicalNodeId,
      toCanonicalNodeId: actual.toCanonicalNodeId,
      fromPosition: pointAt(actual.fromPosition),
      toPosition: pointAt(actual.toPosition),
      inputXmlElementId: cleanText(actual.inputXmlElementId),
      sourceEntityIds: sortedText(actual.sourceEntityIds),
      sourcePortIds: sortedText(actual.sourcePortIds),
      branchIds: sortedText(actual.branchIds),
      topologyOperation: cleanText(actual.topologyOperation),
      projectionCardinality: cleanText(actual.projectionCardinality),
      mergeAuthority: cleanText(actual.mergeAuthority),
    };
    if (!same(expected, actualValue)) mismatches.push(mismatch({
      category: !same({ from: expected.fromCanonicalNodeId, to: expected.toCanonicalNodeId }, { from: actualValue.fromCanonicalNodeId, to: actualValue.toCanonicalNodeId })
        ? 'INCIDENCE_MISMATCH_SVG_EDGE'
        : !same({ from: expected.fromPosition, to: expected.toPosition }, { from: actualValue.fromPosition, to: actualValue.toPosition })
          ? 'COORDINATE_MISMATCH_SVG_EDGE' : 'IDENTITY_MISMATCH_SVG_EDGE',
      canonicalIdentity: edge.id, svgIdentity: actual.id,
      expected, actual: actualValue, sourceEntities, sourcePaths: edge.sourcePaths,
      decisionTrace: decisionTrace(ledger, sourceEntities, [edge.id]),
      recommendedOwnerModule: 'topology-svg-scene-builder.js',
      message: `SVG scene edge ${actual.id} does not exactly match canonical edge ${edge.id}.`,
    }));
  }
  for (const edge of scene.edges ?? []) if (!canonicalEdges.has(edge.canonicalEdgeId)) mismatches.push(mismatch({
    category: 'EXTRA_IN_SVG_EDGE', svgIdentity: edge.id,
    expected: null, actual: edge.canonicalEdgeId || edge.id,
    sourceEntities: edge.sourceEntityIds, sourcePaths: edge.sourcePaths,
    recommendedOwnerModule: 'topology-svg-scene-builder.js',
    message: `SVG scene edge ${edge.id} has no canonical edge.`,
  }));

  for (const node of canonical.nodes ?? []) {
    const actual = sceneNodes.get(node.id);
    if (!actual) {
      mismatches.push(mismatch({
        category: 'MISSING_IN_SVG_NODE', canonicalIdentity: node.id,
        expected: node.id, actual: null, sourceEntities: node.sourceEntityIds, sourcePaths: node.sourcePaths,
        decisionTrace: decisionTrace(ledger, node.sourceEntityIds ?? [], [node.id]),
        recommendedOwnerModule: 'topology-svg-scene-builder.js',
        message: `Canonical node ${node.id} has no TopologySvgScene node.`,
      }));
      continue;
    }
    const expected = {
      position: pointAt(node.position),
      inputXmlNodeId: cleanText(node.inputXmlNodeIds?.[0]),
      sourceEntityIds: sortedText(node.sourceEntityIds),
      sourcePortIds: sortedText(node.sourcePortIds),
      branchIds: sortedText(node.branchIds),
    };
    const actualValue = {
      position: pointAt(actual.position),
      inputXmlNodeId: cleanText(actual.inputXmlNodeId),
      sourceEntityIds: sortedText(actual.sourceEntityIds),
      sourcePortIds: sortedText(actual.sourcePortIds),
      branchIds: sortedText(actual.branchIds),
    };
    if (!same(expected, actualValue)) mismatches.push(mismatch({
      category: same(expected.position, actualValue.position) ? 'IDENTITY_MISMATCH_SVG_NODE' : 'COORDINATE_MISMATCH_SVG_NODE',
      canonicalIdentity: node.id, svgIdentity: actual.id,
      expected, actual: actualValue, sourceEntities: node.sourceEntityIds, sourcePaths: node.sourcePaths,
      decisionTrace: decisionTrace(ledger, node.sourceEntityIds ?? [], [node.id]),
      recommendedOwnerModule: 'topology-svg-scene-builder.js',
      message: `SVG scene node ${actual.id} does not exactly match canonical node ${node.id}.`,
    }));
  }
  for (const node of scene.nodes ?? []) if (!canonicalNodes.has(node.canonicalNodeId)) mismatches.push(mismatch({
    category: 'EXTRA_IN_SVG_NODE', svgIdentity: node.id,
    expected: null, actual: node.canonicalNodeId, sourceEntities: node.sourceEntityIds,
    recommendedOwnerModule: 'topology-svg-scene-builder.js',
    message: `SVG scene node ${node.id} has no canonical node.`,
  }));

  mismatches.push(...compareSupportsToScene(canonical, scene, ledger));
  mismatches.push(...compareRigidsToScene(canonical, scene, ledger));
  mismatches.push(...compareJunctionsToScene(canonical, scene, ledger));
  mismatches.push(...compareBoundariesToScene(canonical, scene, ledger));
  mismatches.push(...comparePointFeaturesToScene(canonical, scene, ledger));
  mismatches.push(...compareDeferredToScene(canonical, scene, ledger));
  return mismatches;
}

/** @param {Record<string,unknown>} parsed @param {Record<string,unknown>} scene @returns {Record<string,unknown>[]} */
export function compareInputXmlToSvgScene(parsed, scene) {
  const mismatches = [];
  const inputEdges = rowMap(parsed.elements, (row) => row.canonicalEdgeId);
  const sceneEdges = rowMap(scene.edges, (row) => row.canonicalEdgeId);
  for (const element of parsed.elements ?? []) {
    const edge = sceneEdges.get(element.canonicalEdgeId);
    if (!edge) continue;
    const inputValue = {
      inputXmlElementId: element.id,
      fromCanonicalNodeId: element.fromCanonicalNodeId,
      toCanonicalNodeId: element.toCanonicalNodeId,
      fromPosition: element.fromPosition,
      toPosition: element.toPosition,
      sourceEntityIds: sortedText(element.sourceEntityIds),
      sourcePortIds: sortedText(element.sourcePortIds),
      branchIds: sortedText(element.branchIds),
      topologyOperation: cleanText(element.topologyOperation),
      projectionCardinality: cleanText(element.projectionCardinality),
      mergeAuthority: cleanText(element.mergeAuthority),
    };
    const svgValue = {
      inputXmlElementId: cleanText(edge.inputXmlElementId),
      fromCanonicalNodeId: edge.fromCanonicalNodeId,
      toCanonicalNodeId: edge.toCanonicalNodeId,
      fromPosition: pointAt(edge.fromPosition),
      toPosition: pointAt(edge.toPosition),
      sourceEntityIds: sortedText(edge.sourceEntityIds),
      sourcePortIds: sortedText(edge.sourcePortIds),
      branchIds: sortedText(edge.branchIds),
      topologyOperation: cleanText(edge.topologyOperation),
      projectionCardinality: cleanText(edge.projectionCardinality),
      mergeAuthority: cleanText(edge.mergeAuthority),
    };
    if (!same(inputValue, svgValue)) mismatches.push(mismatch({
      category: 'INPUTXML_SVG_EDGE_MISMATCH', inputXmlIdentity: element.id, svgIdentity: edge.id,
      expected: inputValue, actual: svgValue, sourceEntities: element.sourceEntityIds,
      recommendedOwnerModule: 'topology-svg-scene-builder.js',
      message: `InputXML and SVG scene disagree for canonical edge ${element.canonicalEdgeId}.`,
    }));
  }
  for (const edge of scene.edges ?? []) if (!inputEdges.has(edge.canonicalEdgeId)) continue;
  return mismatches;
}

function compareSupportsToInput(canonical, parsed, ledger) {
  const rows = [];
  const bySupport = new Map();
  for (const restraint of parsed.restraints ?? []) bySupport.set(restraint.supportId, [...(bySupport.get(restraint.supportId) ?? []), restraint]);
  const canonicalIds = new Set((canonical.supports ?? []).map((row) => row.id));
  for (const support of canonical.supports ?? []) {
    const actual = bySupport.get(support.id) ?? [];
    const expected = {
      canonicalNodeId: support.nodeId,
      inputXmlNodeId: cleanText(support.inputXmlNodeId),
      restraintCount: support.restraints?.length ?? 0,
      tag: cleanText(support.tag),
      sourceEntityIds: sortedText(support.sourceEntityIds),
      attachmentAuthority: cleanText(support.attachmentAuthority),
      attachmentReferences: sortedText(support.attachmentReferences),
      sourcePosition: pointAt(support.sourcePosition, DELTA_DECIMALS),
      attachmentPosition: pointAt(support.attachmentPosition ?? support.position, DELTA_DECIMALS),
      connectionResidual: numberAt(support.connectionResidual, DELTA_DECIMALS),
    };
    const first = actual[0] ?? {};
    const actualValue = {
      canonicalNodeId: cleanText(first.canonicalNodeId),
      inputXmlNodeId: cleanText(first.inputXmlNodeId),
      restraintCount: actual.length,
      tag: cleanText(first.tag),
      sourceEntityIds: sortedText(actual.flatMap((row) => row.sourceEntityIds ?? [])),
      attachmentAuthority: cleanText(first.attachmentAuthority),
      attachmentReferences: sortedText(first.attachmentReferences),
      sourcePosition: first.sourcePosition ?? null,
      attachmentPosition: first.attachmentPosition ?? null,
      connectionResidual: first.connectionResidual ?? null,
    };
    if (!same(expected, actualValue)) rows.push(mismatch({
      category: 'SUPPORT_MISMATCH_INPUTXML', canonicalIdentity: support.id,
      inputXmlIdentity: actual.map((row) => row.id), expected, actual: actualValue,
      sourceEntities: support.sourceEntityIds, sourcePaths: support.sourcePaths,
      decisionTrace: decisionTrace(ledger, support.sourceEntityIds ?? [], [support.nodeId]),
      recommendedOwnerModule: 'topology-inputxml-writer.js',
      message: `InputXML restraint projection for support ${support.id} does not match canonical attachment evidence.`,
    }));
  }
  for (const [supportId, actual] of bySupport) if (!canonicalIds.has(supportId)) rows.push(mismatch({
    category: 'EXTRA_IN_INPUTXML_SUPPORT', inputXmlIdentity: actual.map((row) => row.id),
    expected: null, actual: supportId, sourceEntities: actual.flatMap((row) => row.sourceEntityIds ?? []),
    recommendedOwnerModule: 'topology-inputxml-writer.js',
    message: `InputXML support ${supportId} has no canonical support.`,
  }));
  return rows;
}

function compareSupportsToScene(canonical, scene, ledger) {
  const rows = [];
  const map = rowMap(scene.supports, (row) => row.canonicalSupportId);
  const canonicalIds = new Set((canonical.supports ?? []).map((row) => row.id));
  for (const support of canonical.supports ?? []) {
    const actual = map.get(support.id);
    const expected = {
      canonicalNodeId: support.nodeId,
      inputXmlNodeId: cleanText(support.inputXmlNodeId),
      position: pointAt(support.position, DELTA_DECIMALS),
      sourcePosition: pointAt(support.sourcePosition, DELTA_DECIMALS),
      attachmentPosition: pointAt(support.attachmentPosition ?? support.position, DELTA_DECIMALS),
      sourceEntityIds: sortedText(support.sourceEntityIds),
      sourcePaths: sortedText(support.sourcePaths),
      branchIds: sortedText(support.branchIds),
      attachmentAuthority: cleanText(support.attachmentAuthority),
      attachmentReferences: sortedText(support.attachmentReferences),
      connectionResidual: numberAt(support.connectionResidual, DELTA_DECIMALS),
      restraintCount: support.restraints?.length ?? 0,
    };
    const actualValue = actual ? {
      canonicalNodeId: actual.canonicalNodeId,
      inputXmlNodeId: cleanText(actual.inputXmlNodeId),
      position: pointAt(actual.position, DELTA_DECIMALS),
      sourcePosition: pointAt(actual.sourcePosition, DELTA_DECIMALS),
      attachmentPosition: pointAt(actual.attachmentPosition, DELTA_DECIMALS),
      sourceEntityIds: sortedText(actual.sourceEntityIds),
      sourcePaths: sortedText(actual.sourcePaths),
      branchIds: sortedText(actual.branchIds),
      attachmentAuthority: cleanText(actual.attachmentAuthority),
      attachmentReferences: sortedText(actual.attachmentReferences),
      connectionResidual: numberAt(actual.connectionResidual, DELTA_DECIMALS),
      restraintCount: Number(actual.restraintCount ?? 0),
    } : null;
    if (!same(expected, actualValue)) rows.push(mismatch({
      category: actual ? 'SUPPORT_MISMATCH_SVG' : 'MISSING_IN_SVG_SUPPORT',
      canonicalIdentity: support.id, svgIdentity: actual?.id ?? null,
      expected, actual: actualValue, sourceEntities: support.sourceEntityIds, sourcePaths: support.sourcePaths,
      decisionTrace: decisionTrace(ledger, support.sourceEntityIds ?? [], [support.nodeId]),
      recommendedOwnerModule: 'topology-svg-scene-builder.js',
      message: `SVG support projection for ${support.id} does not match canonical attachment evidence.`,
    }));
  }
  for (const support of scene.supports ?? []) if (!canonicalIds.has(support.canonicalSupportId)) rows.push(mismatch({
    category: 'EXTRA_IN_SVG_SUPPORT', svgIdentity: support.id,
    expected: null, actual: support.canonicalSupportId, sourceEntities: support.sourceEntityIds,
    recommendedOwnerModule: 'topology-svg-scene-builder.js',
    message: `SVG support ${support.id} has no canonical support.`,
  }));
  return rows;
}

function canonicalRigidGroups(canonical) {
  const groups = new Map();
  for (const rigid of canonical.rigids ?? []) groups.set(rigid.edgeId, [...(groups.get(rigid.edgeId) ?? []), rigid]);
  return new Map([...groups.entries()].map(([edgeId, rows]) => [edgeId, {
    canonicalEdgeId: edgeId,
    sourceEntityIds: sortedText(rows.flatMap((row) => row.sourceEntityIds ?? [row.sourceEntityId])),
    assignmentAuthorities: sortedText(rows.map((row) => row.assignmentAuthority)),
    sourceBodyCount: rows.length,
  }]));
}

function compareRigidsToInput(canonical, parsed, ledger) {
  const rows = [];
  const expectedMap = canonicalRigidGroups(canonical);
  const actualMap = rowMap(parsed.rigids, (row) => row.canonicalEdgeId);
  for (const [edgeId, expected] of expectedMap) {
    const actual = actualMap.get(edgeId);
    const actualValue = actual ? {
      canonicalEdgeId: actual.canonicalEdgeId,
      sourceEntityIds: sortedText(actual.sourceEntityIds),
      assignmentAuthorities: sortedText(actual.assignmentAuthorities),
      sourceBodyCount: Number(actual.sourceBodyCount),
    } : null;
    if (!same(expected, actualValue)) rows.push(mismatch({
      category: 'RIGID_MISMATCH_INPUTXML', canonicalIdentity: edgeId,
      inputXmlIdentity: actual?.id ?? null, expected, actual: actualValue,
      sourceEntities: expected.sourceEntityIds,
      decisionTrace: decisionTrace(ledger, expected.sourceEntityIds, [edgeId]),
      recommendedOwnerModule: 'topology-inputxml-writer.js',
      message: `InputXML rigid assignment on ${edgeId} differs from canonical assignment.`,
    }));
  }
  for (const rigid of parsed.rigids ?? []) if (!expectedMap.has(rigid.canonicalEdgeId)) rows.push(mismatch({
    category: 'EXTRA_IN_INPUTXML_RIGID', inputXmlIdentity: rigid.id,
    expected: null, actual: rigid.canonicalEdgeId, sourceEntities: rigid.sourceEntityIds,
    recommendedOwnerModule: 'topology-inputxml-writer.js',
    message: `InputXML RIGID ${rigid.id} has no canonical rigid assignment.`,
  }));
  return rows;
}

function compareRigidsToScene(canonical, scene, ledger) {
  const rows = [];
  const expectedMap = canonicalRigidGroups(canonical);
  const actualMap = rowMap(scene.rigids, (row) => row.canonicalEdgeId);
  for (const [edgeId, expected] of expectedMap) {
    const actual = actualMap.get(edgeId);
    const actualValue = actual ? {
      canonicalEdgeId: actual.canonicalEdgeId,
      sourceEntityIds: sortedText(actual.sourceEntityIds),
      assignmentAuthorities: sortedText(actual.assignmentAuthorities),
      sourceBodyCount: Number(actual.sourceBodyCount),
    } : null;
    if (!same(expected, actualValue)) rows.push(mismatch({
      category: 'RIGID_MISMATCH_SVG', canonicalIdentity: edgeId,
      svgIdentity: actual?.id ?? null, expected, actual: actualValue,
      sourceEntities: expected.sourceEntityIds,
      decisionTrace: decisionTrace(ledger, expected.sourceEntityIds, [edgeId]),
      recommendedOwnerModule: 'topology-svg-scene-builder.js',
      message: `SVG rigid overlay on ${edgeId} differs from canonical assignment.`,
    }));
  }
  return rows;
}

function parsedIncidentEdges(parsed, canonicalNodeId) {
  return sortedText((parsed.elements ?? []).filter((edge) => edge.fromCanonicalNodeId === canonicalNodeId || edge.toCanonicalNodeId === canonicalNodeId).map((edge) => edge.canonicalEdgeId));
}

function compareJunctionsToInput(canonical, parsed, ledger) {
  return (canonical.junctions ?? []).flatMap((junction) => {
    const expected = sortedText(junction.participatingEdgeIds ?? (canonical.edges ?? []).filter((edge) => edge.fromNodeId === junction.nodeId || edge.toNodeId === junction.nodeId).map((edge) => edge.id));
    const actual = parsedIncidentEdges(parsed, junction.nodeId);
    return same(expected, actual) ? [] : [mismatch({
      category: 'JUNCTION_MISMATCH_INPUTXML', canonicalIdentity: junction.id,
      expected: { canonicalNodeId: junction.nodeId, participatingEdgeIds: expected },
      actual: { canonicalNodeId: junction.nodeId, participatingEdgeIds: actual },
      sourceEntities: junction.sourceEntityIds, sourcePaths: junction.sourcePaths,
      decisionTrace: decisionTrace(ledger, junction.sourceEntityIds ?? [], [junction.id, junction.nodeId, ...expected]),
      recommendedOwnerModule: 'topology-inputxml-writer.js',
      message: `InputXML graph participation for junction ${junction.id} differs from canonical topology.`,
    })];
  });
}

function compareJunctionsToScene(canonical, scene, ledger) {
  const sceneMap = rowMap(scene.junctions, (row) => row.canonicalJunctionId);
  return (canonical.junctions ?? []).flatMap((junction) => {
    const actual = sceneMap.get(junction.id);
    const expectedValue = {
      canonicalNodeId: junction.nodeId,
      kind: cleanText(junction.kind),
      participatingEdgeIds: sortedText(junction.participatingEdgeIds),
      sourceEntityIds: sortedText(junction.sourceEntityIds),
    };
    const actualValue = actual ? {
      canonicalNodeId: actual.canonicalNodeId,
      kind: cleanText(actual.kind),
      participatingEdgeIds: sortedText(actual.participatingCanonicalEdgeIds),
      sourceEntityIds: sortedText(actual.sourceEntityIds),
    } : null;
    return same(expectedValue, actualValue) ? [] : [mismatch({
      category: 'JUNCTION_MISMATCH_SVG', canonicalIdentity: junction.id, svgIdentity: actual?.id ?? null,
      expected: expectedValue, actual: actualValue,
      sourceEntities: junction.sourceEntityIds, sourcePaths: junction.sourcePaths,
      decisionTrace: decisionTrace(ledger, junction.sourceEntityIds ?? [], [junction.id, junction.nodeId]),
      recommendedOwnerModule: 'topology-svg-scene-builder.js',
      message: `SVG junction ${junction.id} differs from canonical junction participation.`,
    })];
  });
}

function compareBoundariesToInput(canonical, parsed, ledger) {
  return (canonical.boundaries ?? []).flatMap((boundary) => {
    const expected = sortedText(boundary.participatingEdgeIds ?? (canonical.edges ?? []).filter((edge) => edge.fromNodeId === boundary.nodeId || edge.toNodeId === boundary.nodeId).map((edge) => edge.id));
    const actual = parsedIncidentEdges(parsed, boundary.nodeId);
    return same(expected, actual) ? [] : [mismatch({
      category: 'BOUNDARY_MISMATCH_INPUTXML', canonicalIdentity: boundary.id,
      expected: { canonicalNodeId: boundary.nodeId, participatingEdgeIds: expected, relationship: boundary.relationship },
      actual: { canonicalNodeId: boundary.nodeId, participatingEdgeIds: actual },
      sourceEntities: boundary.sourceEntityIds, sourcePaths: boundary.sourcePaths,
      decisionTrace: decisionTrace(ledger, boundary.sourceEntityIds ?? [], [boundary.id, boundary.nodeId]),
      recommendedOwnerModule: 'topology-inputxml-writer.js',
      message: `InputXML terminal incidence for boundary ${boundary.id} differs from canonical topology.`,
    })];
  });
}

function compareBoundariesToScene(canonical, scene, ledger) {
  const map = rowMap(scene.boundaries, (row) => row.canonicalBoundaryId);
  return (canonical.boundaries ?? []).flatMap((boundary) => {
    const actual = map.get(boundary.id);
    const expected = {
      canonicalNodeId: boundary.nodeId,
      position: pointAt(boundary.position),
      relationship: cleanText(boundary.relationship),
      participatingEdgeIds: sortedText(boundary.participatingEdgeIds),
    };
    const actualValue = actual ? {
      canonicalNodeId: actual.canonicalNodeId,
      position: pointAt(actual.position),
      relationship: cleanText(actual.relationship),
      participatingEdgeIds: sortedText(actual.participatingCanonicalEdgeIds),
    } : null;
    return same(expected, actualValue) ? [] : [mismatch({
      category: actual ? 'BOUNDARY_MISMATCH_SVG' : 'MISSING_IN_SVG_BOUNDARY',
      canonicalIdentity: boundary.id, svgIdentity: actual?.id ?? null,
      expected, actual: actualValue, sourceEntities: boundary.sourceEntityIds, sourcePaths: boundary.sourcePaths,
      decisionTrace: decisionTrace(ledger, boundary.sourceEntityIds ?? [], [boundary.id, boundary.nodeId]),
      recommendedOwnerModule: 'topology-svg-scene-builder.js',
      message: `SVG boundary ${boundary.id} differs from canonical boundary.`,
    })];
  });
}

function comparePointFeaturesToScene(canonical, scene, ledger) {
  const map = rowMap(scene.pointFeatures, (row) => row.canonicalPointFeatureId);
  return (canonical.pointFeatures ?? []).flatMap((feature) => {
    const actual = map.get(feature.id);
    const expected = { kind: feature.kind, position: pointAt(feature.position), sourceEntityIds: sortedText(feature.sourceEntityIds) };
    const actualValue = actual ? { kind: actual.kind, position: pointAt(actual.position), sourceEntityIds: sortedText(actual.sourceEntityIds) } : null;
    return same(expected, actualValue) ? [] : [mismatch({
      category: actual ? 'POINT_FEATURE_MISMATCH_SVG' : 'MISSING_IN_SVG_POINT_FEATURE',
      canonicalIdentity: feature.id, svgIdentity: actual?.id ?? null,
      expected, actual: actualValue, sourceEntities: feature.sourceEntityIds, sourcePaths: feature.sourcePaths,
      decisionTrace: decisionTrace(ledger, feature.sourceEntityIds ?? [], [feature.id]),
      recommendedOwnerModule: 'topology-svg-scene-builder.js',
      message: `SVG point feature ${feature.id} differs from canonical point-feature disposition.`,
    })];
  });
}

function deferredRecords(ledger) {
  return (ledger.records ?? []).filter((record) => record.primaryDisposition === 'DEFER_SUPPORT');
}

function compareDeferredToInput(canonical, parsed, ledger) {
  const rows = [];
  for (const record of deferredRecords(ledger)) {
    const canonicalSupport = (canonical.supports ?? []).find((support) => (support.sourceEntityIds ?? []).includes(record.sourceEntityId));
    const restraints = (parsed.restraints ?? []).filter((restraint) => (restraint.sourceEntityIds ?? []).includes(record.sourceEntityId));
    if (canonicalSupport || restraints.length) rows.push(mismatch({
      category: 'SUPPORT_MISMATCH_DEFERRED_INPUTXML', canonicalIdentity: canonicalSupport?.id ?? null,
      inputXmlIdentity: restraints.map((row) => row.id),
      expected: { canonicalSupport: null, restraints: 0, disposition: 'DEFER_SUPPORT' },
      actual: { canonicalSupport: canonicalSupport?.id ?? null, restraints: restraints.length },
      sourceEntities: [record.sourceEntityId], sourcePaths: [record.sourcePath],
      decisionTrace: [record], recommendedOwnerModule: 'topology-inputxml-writer.js',
      message: `Deferred support ${record.sourceRef || record.sourceEntityId} emitted forbidden topology.`,
    }));
  }
  return rows;
}

function compareDeferredToScene(canonical, scene, ledger) {
  const rows = [];
  const sceneBySource = new Map((scene.deferredSupports ?? []).map((row) => [row.sourceEntityId, row]));
  for (const record of deferredRecords(ledger)) {
    const actual = sceneBySource.get(record.sourceEntityId);
    const expected = {
      sourceEntityId: record.sourceEntityId,
      sourcePath: record.sourcePath,
      sourceRef: record.sourceRef,
      primaryDisposition: 'DEFER_SUPPORT',
      projectionCardinality: 'DEFERRED',
      lossClassification: 'DEFERRED_NON_RESTRAINT_ATTACHMENT',
      topologyBearing: false,
    };
    const actualValue = actual ? {
      sourceEntityId: actual.sourceEntityId,
      sourcePath: actual.sourcePath,
      sourceRef: actual.sourceRef,
      primaryDisposition: actual.primaryDisposition,
      projectionCardinality: actual.projectionCardinality,
      lossClassification: actual.lossClassification,
      topologyBearing: actual.topologyBearing,
    } : null;
    if (!same(expected, actualValue)) rows.push(mismatch({
      category: actual ? 'SUPPORT_MISMATCH_DEFERRED_SVG' : 'MISSING_IN_SVG_DEFERRED_SUPPORT',
      svgIdentity: actual?.id ?? null, expected, actual: actualValue,
      sourceEntities: [record.sourceEntityId], sourcePaths: [record.sourcePath],
      decisionTrace: [record], recommendedOwnerModule: 'topology-svg-scene-builder.js',
      message: `Deferred support ${record.sourceRef || record.sourceEntityId} is not represented correctly in the SVG scene.`,
    }));
  }
  return rows;
}

/** @param {Record<string,unknown>} input @returns {Readonly<Record<string,unknown>>} */
export function buildTopologyParityReport(input) {
  const canonical = input.canonicalTopology ?? input.canonical;
  const parsed = input.parsedInputXmlTopology ?? input.parsedInputXml ?? input.inputXml;
  const scene = input.topologySvgScene ?? input.svgScene;
  const ledger = input.traceLedger ?? input.ledger ?? { records: [] };
  if (canonical?.schema !== 'CanonicalTopology.v1') throw new TypeError('Topology parity requires CanonicalTopology.v1.');
  if (parsed?.schema !== 'ParsedInputXmlTopology.v1') throw new TypeError('Topology parity requires ParsedInputXmlTopology.v1.');
  if (scene?.schema !== 'TopologySvgScene.v1') throw new TypeError('Topology parity requires TopologySvgScene.v1.');
  const raw = [
    ...compareCanonicalToInputXml(canonical, parsed, ledger),
    ...compareCanonicalToSvgScene(canonical, scene, ledger),
    ...compareInputXmlToSvgScene(parsed, scene),
  ];
  if (cleanText(canonical.canonicalTopologyHash) !== cleanText(parsed.canonicalTopologyHash)) raw.unshift(mismatch({
    category: 'STALE_HASH_INPUTXML', canonicalIdentity: canonical.canonicalTopologyHash,
    inputXmlIdentity: parsed.canonicalTopologyHash,
    expected: canonical.canonicalTopologyHash, actual: parsed.canonicalTopologyHash,
    recommendedOwnerModule: 'topology-inputxml-writer.js',
    message: 'InputXML canonical topology hash is missing or stale.',
  }));
  if (cleanText(canonical.canonicalTopologyHash) !== cleanText(scene.canonicalTopologyHash)) raw.unshift(mismatch({
    category: 'STALE_HASH_SVG', canonicalIdentity: canonical.canonicalTopologyHash,
    svgIdentity: scene.canonicalTopologyHash,
    expected: canonical.canonicalTopologyHash, actual: scene.canonicalTopologyHash,
    recommendedOwnerModule: 'topology-svg-scene-builder.js',
    message: 'SVG scene canonical topology hash is missing or stale.',
  }));
  for (const parserIssue of parsed.issues ?? []) raw.push(mismatch({
    category: `INPUTXML_PARSE_${parserIssue.category}`,
    inputXmlIdentity: parserIssue.inputXmlElementId ?? parserIssue.inputXmlChildId ?? null,
    expected: 'complete explicit topology identity', actual: parserIssue,
    recommendedOwnerModule: 'topology-inputxml-topology-parser.js', message: parserIssue.message,
  }));
  const mismatches = Object.freeze(raw.map((row, index) => Object.freeze({ id: `TPM-${String(index + 1).padStart(6, '0')}`, ...row })));
  const count = (predicate) => mismatches.filter(predicate).length;
  const summary = Object.freeze({
    canonicalNodes: canonical.nodes?.length ?? 0,
    canonicalEdges: canonical.edges?.length ?? 0,
    inputXmlNodes: parsed.nodes?.length ?? 0,
    inputXmlElements: parsed.elements?.length ?? 0,
    svgNodes: scene.nodes?.length ?? 0,
    svgEdges: scene.edges?.length ?? 0,
    supports: canonical.supports?.length ?? 0,
    rigids: canonicalRigidGroups(canonical).size,
    junctions: canonical.junctions?.length ?? 0,
    deferredRecords: deferredRecords(ledger).length,
    topologyMismatchCount: mismatches.length,
    missingInInputXml: count((row) => row.category.includes('MISSING_IN_INPUTXML')),
    missingInSvg: count((row) => row.category.includes('MISSING_IN_SVG')),
    extraInInputXml: count((row) => row.category.includes('EXTRA_IN_INPUTXML')),
    extraInSvg: count((row) => row.category.includes('EXTRA_IN_SVG')),
    incidenceMismatch: count((row) => row.category.includes('INCIDENCE_MISMATCH')),
    coordinateMismatch: count((row) => row.category.includes('COORDINATE_MISMATCH')),
    supportMismatch: count((row) => row.category.includes('SUPPORT')),
    rigidMismatch: count((row) => row.category.includes('RIGID')),
    junctionMismatch: count((row) => row.category.includes('JUNCTION')),
    mismatches: mismatches.length,
  });
  const report = Object.freeze({
    schema: 'TopologyParityReport.v1',
    hashAlgorithm: TOPOLOGY_HASH_ALGORITHM,
    canonicalTopologyHash: canonical.canonicalTopologyHash || deterministicHash(canonical),
    inputXmlHash: parsed.inputXmlHash,
    parsedInputXmlTopologyHash: parsed.parsedInputXmlTopologyHash,
    svgSceneHash: scene.svgSceneHash,
    topologyTraceLedgerHash: ledger.topologyTraceLedgerHash || deterministicHash(ledger),
    normalization: Object.freeze({
      coordinateUnit: 'mm',
      inputXmlGlobalCoordinateDecimals: GLOBAL_DECIMALS,
      inputXmlDeltaDecimals: DELTA_DECIMALS,
      svgWorldCoordinates: 'CanonicalTopology.v1 unprojected world coordinates',
      toleranceMm: 0,
      toleranceJustification: 'Exact equality after deterministic writer-precision normalization.',
    }),
    ok: mismatches.length === 0,
    status: mismatches.length === 0 ? 'PASS' : 'FAIL',
    summary,
    nodeComparison: Object.freeze({ canonical: summary.canonicalNodes, inputXml: summary.inputXmlNodes, svg: summary.svgNodes }),
    edgeComparison: Object.freeze({ canonical: summary.canonicalEdges, inputXml: summary.inputXmlElements, svg: summary.svgEdges }),
    supportComparison: Object.freeze({ canonical: summary.supports, mismatchCount: summary.supportMismatch }),
    rigidComparison: Object.freeze({ canonical: summary.rigids, mismatchCount: summary.rigidMismatch }),
    junctionComparison: Object.freeze({ canonical: summary.junctions, mismatchCount: summary.junctionMismatch }),
    mismatches,
  });
  return stampArtifactHash(report, 'topologyParityReportHash');
}

/** @param {Record<string,unknown>} report @returns {string} */
export function topologyParityMismatchesCsv(report) {
  const headers = ['Mismatch ID', 'Severity', 'Category', 'Canonical ID', 'InputXML ID', 'SVG ID', 'Expected', 'Actual', 'Source entities', 'Source paths', 'Recommended owner'];
  const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const rows = (report.mismatches ?? []).map((row) => [
    row.id, row.severity, row.category,
    typeof row.canonicalIdentity === 'string' ? row.canonicalIdentity : JSON.stringify(row.canonicalIdentity),
    typeof row.inputXmlIdentity === 'string' ? row.inputXmlIdentity : JSON.stringify(row.inputXmlIdentity),
    typeof row.svgIdentity === 'string' ? row.svgIdentity : JSON.stringify(row.svgIdentity),
    JSON.stringify(row.expected), JSON.stringify(row.actual),
    (row.sourceEntities ?? []).join('|'), (row.sourcePaths ?? []).join('|'), row.recommendedOwnerModule,
  ]);
  return `${[headers, ...rows].map((row) => row.map(quote).join(',')).join('\n')}\n`;
}

export class TopologyParityError extends Error {
  /** @param {Record<string,unknown>} report */
  constructor(report) {
    super(`Topology parity failed with ${report.summary?.topologyMismatchCount ?? report.mismatches?.length ?? 'unknown'} mismatch(es).`);
    this.name = 'TopologyParityError';
    this.report = report;
  }
}

export const TOPOLOGY_PARITY_NORMALIZATION = Object.freeze({ globalCoordinateDecimals: GLOBAL_DECIMALS, deltaDecimals: DELTA_DECIMALS, toleranceMm: 0 });
export const _test = Object.freeze({ sortedText, numberAt, pointAt, deltaAt, same, mismatch, decisionTrace, rowMap, canonicalRigidGroups, parsedIncidentEdges, deferredRecords });
