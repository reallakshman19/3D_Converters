/**
 * Parses topology exclusively from generated InputXML into
 * ParsedInputXmlTopology.v1. Missing canonical identities remain explicit
 * parser issues; the parser never reconstructs or repairs them from a ledger,
 * source file, DOM text, branch order, or geometric proximity.
 */

import { hashText, stampArtifactHash, TOPOLOGY_HASH_ALGORITHM } from './topology-deterministic-hash.js';
import { cleanText, uniqueText } from './topology-values.js';

const GLOBAL_DECIMALS = 3;
const DELTA_DECIMALS = 6;

/** @param {string} value @returns {string} */
function decodeXml(value) {
  return String(value ?? '')
    .replaceAll('&quot;', '"').replaceAll('&apos;', "'")
    .replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
}

/** @param {string} source @returns {Record<string,string>} */
function parseAttributes(source) {
  const attributes = {};
  String(source ?? '').replace(/([A-Za-z_][\w:.-]*)\s*=\s*(["'])(.*?)\2/g, (_match, name, _quote, value) => {
    attributes[name.toUpperCase()] = decodeXml(value);
    return '';
  });
  return attributes;
}

/** @param {Record<string,string>} attributes @param {string} name @returns {string} */
function attribute(attributes, name) {
  const target = name.toUpperCase();
  if (Object.hasOwn(attributes, target)) return cleanText(attributes[target]);
  const key = Object.keys(attributes).find((candidate) => candidate.endsWith(`:${target}`));
  return key ? cleanText(attributes[key]) : '';
}

/** @param {unknown} value @returns {number|null} */
function finiteNumber(value) {
  if (value === null || value === undefined || cleanText(value) === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/** @param {unknown} value @returns {string} */
function normalizeNodeId(value) {
  const number = finiteNumber(value);
  if (number === null) return cleanText(value);
  return Math.abs(number - Math.round(number)) < 1e-9 ? String(Math.round(number)) : String(number);
}

/** @param {unknown} value @param {number} decimals @returns {number|null} */
function normalizedNumber(value, decimals) {
  const number = finiteNumber(value);
  return number === null ? null : Number(number.toFixed(decimals));
}

/** @param {Record<string,string>} attrs @param {string} prefix @param {number} decimals @returns {{x:number,y:number,z:number}|null} */
function point(attrs, prefix, decimals) {
  const values = ['X', 'Y', 'Z'].map((axis) => normalizedNumber(attribute(attrs, `${prefix}_${axis}`), decimals));
  return values.every((value) => value !== null) ? { x: values[0], y: values[1], z: values[2] } : null;
}

/** @param {unknown} value @returns {string[]} */
function list(value) {
  return uniqueText(cleanText(value).split(/[|,;\s]+/));
}

/** @param {string} code @param {string} message @param {Record<string,unknown>} context @param {number} sequence @returns {Readonly<Record<string,unknown>>} */
function issue(code, message, context, sequence) {
  return Object.freeze({
    id: `INPUTXML-PARSE-${String(sequence).padStart(6, '0')}`,
    category: code,
    severity: 'ERROR',
    blocking: true,
    message,
    ...context,
  });
}

/** @param {string} body @param {string} elementId @param {Record<string,unknown>[]} issues @param {()=>number} next @returns {{restraints:ReadonlyArray<Record<string,unknown>>,rigids:ReadonlyArray<Record<string,unknown>>,otherChildren:ReadonlyArray<Record<string,unknown>>}} */
function parseChildren(body, elementId, issues, next) {
  const restraints = [], rigids = [], otherChildren = [];
  const pattern = /<([A-Za-z_][\w:.-]*)\b([^>]*)\/?\s*>/g;
  for (const match of String(body ?? '').matchAll(pattern)) {
    const rawTag = cleanText(match[1]);
    const tag = rawTag.includes(':') ? rawTag.split(':').at(-1).toUpperCase() : rawTag.toUpperCase();
    if (tag === 'PIPINGELEMENT') continue;
    const attrs = parseAttributes(match[2]);
    const id = attribute(attrs, 'ID');
    if (tag === 'RESTRAINT') {
      const supportId = attribute(attrs, 'SUPPORT_ID') || id.replace(/^RESTRAINT:/, '').replace(/:\d+$/, '');
      const row = Object.freeze({
        id,
        supportId,
        ownerInputXmlElementId: elementId,
        inputXmlNodeId: normalizeNodeId(attribute(attrs, 'NODE')),
        canonicalNodeId: attribute(attrs, 'CANONICAL_NODE_ID'),
        tag: attribute(attrs, 'TAG'),
        type: attribute(attrs, 'TYPE'),
        sourceEntityIds: Object.freeze(list(attribute(attrs, 'SOURCE_ENTITY_IDS'))),
        sourcePaths: Object.freeze(list(attribute(attrs, 'SOURCE_PATHS'))),
        branchIds: Object.freeze(list(attribute(attrs, 'BRANCH_IDS'))),
        attachmentAuthority: attribute(attrs, 'ATTACHMENT_AUTHORITY'),
        attachmentReferences: Object.freeze(list(attribute(attrs, 'ATTACHMENT_REFERENCES'))),
        connectionResidual: normalizedNumber(attribute(attrs, 'CONNECTION_RESIDUAL'), DELTA_DECIMALS),
        sourcePosition: point(attrs, 'SOURCE', DELTA_DECIMALS),
        attachmentPosition: point(attrs, 'ATTACHMENT', DELTA_DECIMALS),
        attributes: Object.freeze(attrs),
      });
      if (!row.id) issues.push(issue('RESTRAINT_ID_MISSING', `RESTRAINT under ${elementId} has no stable ID.`, { inputXmlElementId: elementId }, next()));
      if (!row.canonicalNodeId) issues.push(issue('RESTRAINT_CANONICAL_NODE_ID_MISSING', `RESTRAINT ${row.id || '(unnamed)'} has no CANONICAL_NODE_ID.`, { inputXmlElementId: elementId, inputXmlChildId: row.id }, next()));
      restraints.push(row);
    } else if (tag === 'RIGID') {
      const row = Object.freeze({
        id,
        ownerInputXmlElementId: elementId,
        canonicalEdgeId: attribute(attrs, 'CANONICAL_EDGE_ID'),
        sourceEntityIds: Object.freeze(list(attribute(attrs, 'SOURCE_ENTITY_IDS'))),
        sourcePaths: Object.freeze(list(attribute(attrs, 'SOURCE_PATHS'))),
        branchIds: Object.freeze(list(attribute(attrs, 'BRANCH_IDS'))),
        assignmentAuthorities: Object.freeze(list(attribute(attrs, 'ASSIGNMENT_AUTHORITY'))),
        connectionResidual: normalizedNumber(attribute(attrs, 'CONNECTION_RESIDUAL'), DELTA_DECIMALS),
        sourceBodyCount: finiteNumber(attribute(attrs, 'SOURCE_BODY_COUNT')),
        weight: finiteNumber(attribute(attrs, 'WEIGHT')),
        attributes: Object.freeze(attrs),
      });
      if (!row.id) issues.push(issue('RIGID_ID_MISSING', `RIGID under ${elementId} has no stable ID.`, { inputXmlElementId: elementId }, next()));
      if (!row.canonicalEdgeId) issues.push(issue('RIGID_CANONICAL_EDGE_ID_MISSING', `RIGID ${row.id || '(unnamed)'} has no CANONICAL_EDGE_ID.`, { inputXmlElementId: elementId, inputXmlChildId: row.id }, next()));
      rigids.push(row);
    } else {
      otherChildren.push(Object.freeze({ id, tag, attributes: Object.freeze(attrs), ownerInputXmlElementId: elementId }));
    }
  }
  return {
    restraints: Object.freeze(restraints),
    rigids: Object.freeze(rigids),
    otherChildren: Object.freeze(otherChildren),
  };
}

/** @param {Record<string,unknown>[]} elements @param {Record<string,unknown>[]} issues @param {()=>number} next @returns {ReadonlyArray<Readonly<Record<string,unknown>>>} */
function buildNodes(elements, issues, next) {
  const byCanonicalId = new Map();
  const inputToCanonical = new Map();
  const endpointRows = elements.flatMap((element) => [
    {
      canonicalNodeId: element.fromCanonicalNodeId,
      inputXmlNodeId: element.fromNode,
      position: element.fromPosition,
      sourceEntityIds: element.fromSourceEntityIds?.length ? element.fromSourceEntityIds : element.sourceEntityIds,
      sourcePortIds: element.fromSourcePortIds?.length ? element.fromSourcePortIds : element.sourcePortIds,
      elementId: element.id,
      role: 'FROM',
    },
    {
      canonicalNodeId: element.toCanonicalNodeId,
      inputXmlNodeId: element.toNode,
      position: element.toPosition,
      sourceEntityIds: element.toSourceEntityIds?.length ? element.toSourceEntityIds : element.sourceEntityIds,
      sourcePortIds: element.toSourcePortIds?.length ? element.toSourcePortIds : element.sourcePortIds,
      elementId: element.id,
      role: 'TO',
    },
  ]);
  for (const endpoint of endpointRows) {
    if (!endpoint.canonicalNodeId) continue;
    const existing = byCanonicalId.get(endpoint.canonicalNodeId);
    if (!existing) {
      byCanonicalId.set(endpoint.canonicalNodeId, {
        id: endpoint.canonicalNodeId,
        canonicalNodeId: endpoint.canonicalNodeId,
        inputXmlNodeId: endpoint.inputXmlNodeId,
        position: endpoint.position,
        sourceEntityIds: [...endpoint.sourceEntityIds],
        sourcePortIds: [...endpoint.sourcePortIds],
        incidentInputXmlElementIds: [endpoint.elementId],
      });
    } else {
      if (existing.inputXmlNodeId !== endpoint.inputXmlNodeId) issues.push(issue(
        'CANONICAL_NODE_INPUT_ID_CONFLICT',
        `Canonical node ${endpoint.canonicalNodeId} maps to multiple InputXML node IDs.`,
        { canonicalNodeId: endpoint.canonicalNodeId, expected: existing.inputXmlNodeId, actual: endpoint.inputXmlNodeId }, next(),
      ));
      if (JSON.stringify(existing.position) !== JSON.stringify(endpoint.position)) issues.push(issue(
        'CANONICAL_NODE_COORDINATE_CONFLICT',
        `Canonical node ${endpoint.canonicalNodeId} has conflicting InputXML global coordinates.`,
        { canonicalNodeId: endpoint.canonicalNodeId, expected: existing.position, actual: endpoint.position }, next(),
      ));
      existing.sourceEntityIds.push(...endpoint.sourceEntityIds);
      existing.sourcePortIds.push(...endpoint.sourcePortIds);
      existing.incidentInputXmlElementIds.push(endpoint.elementId);
    }
    const mapped = inputToCanonical.get(endpoint.inputXmlNodeId);
    if (mapped && mapped !== endpoint.canonicalNodeId) issues.push(issue(
      'INPUT_NODE_CANONICAL_ID_CONFLICT',
      `InputXML node ${endpoint.inputXmlNodeId} maps to multiple canonical node IDs.`,
      { inputXmlNodeId: endpoint.inputXmlNodeId, expected: mapped, actual: endpoint.canonicalNodeId }, next(),
    ));
    else if (endpoint.inputXmlNodeId) inputToCanonical.set(endpoint.inputXmlNodeId, endpoint.canonicalNodeId);
  }
  return Object.freeze([...byCanonicalId.values()].map((row) => Object.freeze({
    ...row,
    sourceEntityIds: Object.freeze(uniqueText(row.sourceEntityIds)),
    sourcePortIds: Object.freeze(uniqueText(row.sourcePortIds)),
    incidentInputXmlElementIds: Object.freeze(uniqueText(row.incidentInputXmlElementIds)),
  })));
}

/** @param {string} xmlText @returns {Readonly<Record<string, unknown>>} */
export function parseTopologyInputXml(xmlText) {
  const xml = String(xmlText ?? '');
  if (!/<CAESARII\b/i.test(xml) || !/<PIPINGMODEL\b/i.test(xml)) throw new TypeError('ParsedInputXmlTopology requires CAESARII/PIPINGMODEL InputXML.');
  const modelMatch = xml.match(/<PIPINGMODEL\b([^>]*)>/i);
  const modelAttributes = parseAttributes(modelMatch?.[1] ?? '');
  const issues = [];
  let sequence = 0;
  const next = () => ++sequence;
  const elements = [];
  const paired = /<PIPINGELEMENT\b([^>]*)>([\s\S]*?)<\/PIPINGELEMENT>/gi;
  let match;
  while ((match = paired.exec(xml))) {
    const attrs = parseAttributes(match[1]);
    const id = attribute(attrs, 'ID');
    const canonicalEdgeId = attribute(attrs, 'CANONICAL_EDGE_ID');
    const fromCanonicalNodeId = attribute(attrs, 'FROM_CANONICAL_NODE_ID');
    const toCanonicalNodeId = attribute(attrs, 'TO_CANONICAL_NODE_ID');
    const children = parseChildren(match[2], id || `PIPINGELEMENT[${elements.length + 1}]`, issues, next);
    const row = Object.freeze({
      id,
      inputXmlElementId: id,
      canonicalEdgeId,
      fromNode: normalizeNodeId(attribute(attrs, 'FROM_NODE')),
      toNode: normalizeNodeId(attribute(attrs, 'TO_NODE')),
      fromCanonicalNodeId,
      toCanonicalNodeId,
      fromPosition: point(attrs, 'FROM_GLOBAL', GLOBAL_DECIMALS),
      toPosition: point(attrs, 'TO_GLOBAL', GLOBAL_DECIMALS),
      delta: Object.freeze({
        x: normalizedNumber(attribute(attrs, 'DELTA_X'), DELTA_DECIMALS),
        y: normalizedNumber(attribute(attrs, 'DELTA_Y'), DELTA_DECIMALS),
        z: normalizedNumber(attribute(attrs, 'DELTA_Z'), DELTA_DECIMALS),
      }),
      sourceEntityIds: Object.freeze(list(attribute(attrs, 'SOURCE_ENTITY_IDS'))),
      sourcePortIds: Object.freeze(list(attribute(attrs, 'SOURCE_PORT_IDS'))),
      fromSourceEntityIds: Object.freeze(list(attribute(attrs, 'FROM_SOURCE_ENTITY_IDS'))),
      toSourceEntityIds: Object.freeze(list(attribute(attrs, 'TO_SOURCE_ENTITY_IDS'))),
      fromSourcePortIds: Object.freeze(list(attribute(attrs, 'FROM_SOURCE_PORT_IDS'))),
      toSourcePortIds: Object.freeze(list(attribute(attrs, 'TO_SOURCE_PORT_IDS'))),
      branchIds: Object.freeze(list(attribute(attrs, 'BRANCH_IDS'))),
      topologyOperation: attribute(attrs, 'TOPOLOGY_OPERATION'),
      projectionCardinality: attribute(attrs, 'PROJECTION_CARDINALITY'),
      mergeAuthority: attribute(attrs, 'MERGE_AUTHORITY'),
      sourceType: attribute(attrs, 'SOURCE_TYPE'),
      attributes: Object.freeze(attrs),
      restraints: children.restraints,
      rigids: children.rigids,
      otherChildren: children.otherChildren,
    });
    if (!id) issues.push(issue('INPUTXML_ELEMENT_ID_MISSING', `PIPINGELEMENT[${elements.length + 1}] has no ID.`, {}, next()));
    if (!canonicalEdgeId) issues.push(issue('CANONICAL_EDGE_ID_MISSING', `PIPINGELEMENT ${id || elements.length + 1} has no CANONICAL_EDGE_ID.`, { inputXmlElementId: id }, next()));
    if (!fromCanonicalNodeId) issues.push(issue('FROM_CANONICAL_NODE_ID_MISSING', `PIPINGELEMENT ${id || elements.length + 1} has no FROM_CANONICAL_NODE_ID.`, { inputXmlElementId: id }, next()));
    if (!toCanonicalNodeId) issues.push(issue('TO_CANONICAL_NODE_ID_MISSING', `PIPINGELEMENT ${id || elements.length + 1} has no TO_CANONICAL_NODE_ID.`, { inputXmlElementId: id }, next()));
    if (!row.fromPosition || !row.toPosition) issues.push(issue('GLOBAL_COORDINATE_MISSING', `PIPINGELEMENT ${id || elements.length + 1} lacks complete global endpoint coordinates.`, { inputXmlElementId: id }, next()));
    elements.push(row);
  }
  if (!elements.length) throw new TypeError('ParsedInputXmlTopology contains no paired PIPINGELEMENT records.');
  const edgeIdCounts = new Map();
  for (const element of elements) if (element.canonicalEdgeId) edgeIdCounts.set(element.canonicalEdgeId, (edgeIdCounts.get(element.canonicalEdgeId) ?? 0) + 1);
  for (const [edgeId, count] of edgeIdCounts) if (count !== 1) issues.push(issue('CANONICAL_EDGE_CARDINALITY_INVALID', `Canonical edge ${edgeId} occurs ${count} times in InputXML; expected exactly one.`, { canonicalEdgeId: edgeId, actual: count }, next()));
  const nodes = buildNodes(elements, issues, next);
  const restraints = Object.freeze(elements.flatMap((element) => element.restraints));
  const rigids = Object.freeze(elements.flatMap((element) => element.rigids));
  const parsed = Object.freeze({
    schema: 'ParsedInputXmlTopology.v1',
    hashAlgorithm: TOPOLOGY_HASH_ALGORITHM,
    inputXmlHash: hashText(xml),
    canonicalTopologyHash: attribute(modelAttributes, 'CANONICAL_TOPOLOGY_HASH'),
    topologyTraceLedgerHash: attribute(modelAttributes, 'TOPOLOGY_TRACE_LEDGER_HASH'),
    serialization: Object.freeze({
      coordinateUnit: 'mm',
      globalCoordinateDecimals: GLOBAL_DECIMALS,
      deltaDecimals: DELTA_DECIMALS,
      coordinateToleranceMm: 0,
    }),
    modelAttributes: Object.freeze(modelAttributes),
    nodes,
    elements: Object.freeze(elements),
    restraints,
    rigids,
    issues: Object.freeze(issues),
    summary: Object.freeze({
      nodes: nodes.length,
      elements: elements.length,
      restraints: restraints.length,
      rigids: rigids.length,
      issues: issues.length,
      blockingIssues: issues.filter((row) => row.blocking).length,
    }),
  });
  return stampArtifactHash(parsed, 'parsedInputXmlTopologyHash');
}

export const INPUTXML_TOPOLOGY_SERIALIZATION = Object.freeze({ globalCoordinateDecimals: GLOBAL_DECIMALS, deltaDecimals: DELTA_DECIMALS, coordinateToleranceMm: 0 });
export const _test = Object.freeze({ decodeXml, parseAttributes, attribute, finiteNumber, normalizeNodeId, normalizedNumber, point, list, parseChildren, buildNodes });
