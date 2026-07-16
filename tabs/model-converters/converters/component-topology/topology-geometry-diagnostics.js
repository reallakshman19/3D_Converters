/**
 * Dedicated engineering-geometry diagnostics for CanonicalTopology.v1.
 * Inputs are immutable canonical records and explicit thresholds. Output is a
 * deterministic report with fixability metadata; no geometry is mutated and
 * no physical-clearance fallback is inferred when pipe OD is unavailable.
 */

import { cleanText } from './topology-values.js';

export const TOPOLOGY_GEOMETRY_ISSUE_STYLES = Object.freeze({
  BRANCH_DISCONNECTED: { color: '#2563eb', icon: 'unlink', canvasFix: 'BRIDGE_GAP_OR_MERGE_NODES' },
  ISOLATED_ELEMENT: { color: '#1d4ed8', icon: 'plug-zap', canvasFix: 'BRIDGE_GAP_OR_DELETE_EDGE' },
  SHORT_ELEMENT: { color: '#f97316', icon: 'ruler', canvasFix: 'MERGE_NODES_OR_DELETE_EDGE' },
  CENTERLINE_CLASH: { color: '#dc2626', icon: 'collision', canvasFix: 'MOVE_NODE_OR_SPLIT_EDGE' },
  OVERLAPPING_ELEMENTS: { color: '#be123c', icon: 'layers', canvasFix: 'DELETE_EDGE_OR_DISCONNECT_ENDPOINT' },
  SNAP_GAP: { color: '#0ea5e9', icon: 'magnet', canvasFix: 'MERGE_NODES_OR_BRIDGE_GAP' },
  PIPE_BACKTRACK: { color: '#7c3aed', icon: 'undo-2', canvasFix: 'MOVE_NODE_OR_DELETE_EDGE' },
  RIGHT_ANGLE_WITHOUT_BEND: { color: '#eab308', icon: 'corner-down-right', canvasFix: '' },
  BEND_WITHOUT_DIRECTION_CHANGE: { color: '#a855f7', icon: 'corner-up-right', canvasFix: '' },
  UNDEFINED_KINK: { color: '#d97706', icon: 'git-commit-horizontal', canvasFix: 'MOVE_NODE' },
  MULTIWAY_WITHOUT_JUNCTION: { color: '#db2777', icon: 'git-fork', canvasFix: '' },
  JUNCTION_WITHOUT_MULTIWAY: { color: '#c026d3', icon: 'split', canvasFix: '' },
  BEND_AT_JUNCTION: { color: '#9333ea', icon: 'triangle-alert', canvasFix: '' },
  ORPHAN_EDGE_ENDPOINT: { color: '#991b1b', icon: 'circle-off', canvasFix: 'DELETE_EDGE_OR_ADD_STRAIGHT_ELEMENT' },
  ORPHAN_NODE: { color: '#b91c1c', icon: 'circle-dot', canvasFix: 'DELETE_OR_CONNECT' },
  ORIGIN_DEFAULTED: { color: '#475569', icon: 'map-pin-off', canvasFix: 'MOVE_NODE' },
});

/** @param {Record<string, unknown>} point @returns {number[]} */
function xyz(point) { return [Number(point.x), Number(point.y), Number(point.z)]; }
/** @param {number[]} left @param {number[]} right @returns {number[]} */
function subtract(left, right) { return left.map((value, index) => value - right[index]); }
/** @param {number[]} left @param {number[]} right @returns {number} */
function dot(left, right) { return left.reduce((sum, value, index) => sum + (value * right[index]), 0); }
/** @param {number[]} value @returns {number} */
function length(value) { return Math.hypot(...value); }
/** @param {number[]} value @returns {number[]|null} */
function unit(value) { const size = length(value); return size > 1e-12 ? value.map((part) => part / size) : null; }
/** @param {number} value @param {number} minimum @param {number} maximum @returns {number} */
function clamp(value, minimum, maximum) { return Math.max(minimum, Math.min(maximum, value)); }
/** @param {number[]} left @param {number[]} right @returns {number} */
function pointDistance(left, right) { return length(subtract(left, right)); }

/** @param {number[]} first @param {number[]} second @returns {number} */
function angleDegrees(first, second) {
  const left = unit(first), right = unit(second);
  return left && right ? Math.acos(clamp(dot(left, right), -1, 1)) * (180 / Math.PI) : Number.NaN;
}

/** @param {number[]} p1 @param {number[]} q1 @param {number[]} p2 @param {number[]} q2 @returns {number} */
function segmentDistance(p1, q1, p2, q2) {
  const u = subtract(q1, p1), v = subtract(q2, p2), w = subtract(p1, p2);
  const a = dot(u, u), b = dot(u, v), c = dot(v, v), d = dot(u, w), e = dot(v, w), denominator = (a * c) - (b * b);
  let sNumerator = denominator, sDenominator = denominator, tNumerator = denominator, tDenominator = denominator;
  if (denominator < 1e-12) { sNumerator = 0; sDenominator = 1; tNumerator = e; tDenominator = c; }
  else {
    sNumerator = (b * e) - (c * d); tNumerator = (a * e) - (b * d);
    if (sNumerator < 0) { sNumerator = 0; tNumerator = e; tDenominator = c; }
    else if (sNumerator > sDenominator) { sNumerator = sDenominator; tNumerator = e + b; tDenominator = c; }
  }
  if (tNumerator < 0) {
    tNumerator = 0;
    if (-d < 0) sNumerator = 0; else if (-d > a) sNumerator = sDenominator; else { sNumerator = -d; sDenominator = a; }
  } else if (tNumerator > tDenominator) {
    tNumerator = tDenominator;
    if ((-d + b) < 0) sNumerator = 0; else if ((-d + b) > a) sNumerator = sDenominator; else { sNumerator = -d + b; sDenominator = a; }
  }
  const sc = Math.abs(sNumerator) < 1e-12 ? 0 : sNumerator / sDenominator, tc = Math.abs(tNumerator) < 1e-12 ? 0 : tNumerator / tDenominator;
  return length(w.map((value, index) => value + (sc * u[index]) - (tc * v[index])));
}

/** @param {Record<string, unknown>} left @param {Record<string, unknown>} right @param {number} tolerance @returns {number} */
function overlapLength(left, right, tolerance) {
  const a = left.start, b = left.end, c = right.start, d = right.end, axis = subtract(b, a), axisLength = length(axis), direction = unit(axis);
  if (!direction || segmentDistance(a, b, c, d) > tolerance) return 0;
  const rightDirection = unit(subtract(d, c));
  if (!rightDirection || Math.abs(Math.abs(dot(direction, rightDirection)) - 1) > 1e-6) return 0;
  const cOffset = dot(subtract(c, a), direction), dOffset = dot(subtract(d, a), direction);
  return Math.max(0, Math.min(axisLength, Math.max(cOffset, dOffset)) - Math.max(0, Math.min(cOffset, dOffset)));
}

/** @param {Record<string, unknown>} edge @returns {boolean} */
function hasBendEvidence(edge) { return /BEND|ELBO/.test(`${cleanText(edge.segmentRole)} ${edge.sourceTypes?.join(' ')}`.toUpperCase()); }
/** @param {Record<string, unknown>[]} edges @returns {boolean} */
function hasBendPairEvidence(edges) {
  for (let leftIndex = 0; leftIndex < edges.length; leftIndex += 1) for (let rightIndex = leftIndex + 1; rightIndex < edges.length; rightIndex += 1) {
    const left = edges[leftIndex], right = edges[rightIndex], roles = `${cleanText(left.segmentRole)}|${cleanText(right.segmentRole)}`.toUpperCase();
    if (!roles.includes('RUN_IN') || !roles.includes('RUN_OUT')) continue;
    const excluded = new Set([...(left.branchIds ?? []), ...(right.branchIds ?? [])].map(cleanText));
    const rightSources = new Set((right.sourceEntityIds ?? []).map(cleanText).filter((id) => !excluded.has(id)));
    if ((left.sourceEntityIds ?? []).map(cleanText).some((id) => !excluded.has(id) && rightSources.has(id))) return true;
  }
  return false;
}
/** @param {string} code @param {string} message @param {string[]} objectIds @param {Record<string, unknown>} details @returns {Readonly<Record<string, unknown>>} */
function finding(code, message, objectIds, details) {
  const style = TOPOLOGY_GEOMETRY_ISSUE_STYLES[code];
  return Object.freeze({ code, severity: 'WARNING', blocking: false, message, objectIds: Object.freeze([...objectIds]), details: Object.freeze({ ...details }), color: style.color, icon: style.icon, canvasFix: style.canvasFix });
}

/** @param {Record<string, unknown>[]} edges @returns {Record<string, unknown>[][]} */
function edgeComponents(edges) {
  const byNode = new Map();
  for (const edge of edges) for (const nodeId of [edge.fromNodeId, edge.toNodeId]) byNode.set(nodeId, [...(byNode.get(nodeId) ?? []), edge]);
  const remaining = new Set(edges), components = [];
  while (remaining.size) {
    const first = remaining.values().next().value, stack = [first], rows = []; remaining.delete(first);
    while (stack.length) {
      const edge = stack.pop(); rows.push(edge);
      for (const nodeId of [edge.fromNodeId, edge.toNodeId]) for (const next of byNode.get(nodeId) ?? []) if (remaining.delete(next)) stack.push(next);
    }
    components.push(rows);
  }
  return components;
}

/** @param {Record<string, unknown>[]} geometry @param {number} tolerance @returns {Record<string, unknown>[][]} */
function candidatePairs(geometry, tolerance) {
  if (geometry.length < 2) return [];
  const ranges = [0, 1, 2].map((axis) => Math.max(...geometry.map((row) => row.max[axis])) - Math.min(...geometry.map((row) => row.min[axis]))), sweepAxis = ranges.indexOf(Math.max(...ranges));
  const sorted = [...geometry].sort((left, right) => left.min[sweepAxis] - right.min[sweepAxis]), pairs = [];
  for (let leftIndex = 0; leftIndex < sorted.length; leftIndex += 1) for (let rightIndex = leftIndex + 1; rightIndex < sorted.length; rightIndex += 1) {
    const left = sorted[leftIndex], right = sorted[rightIndex];
    if (right.min[sweepAxis] > left.max[sweepAxis] + tolerance) break;
    if ([0, 1, 2].every((axis) => right.min[axis] <= left.max[axis] + tolerance && right.max[axis] >= left.min[axis] - tolerance)) pairs.push([left, right]);
  }
  return pairs;
}

/**
 * @param {Record<string, unknown>} canonical
 * @param {{shortElementMm:number,toleranceMm:number,snapToleranceMm:number,angleToleranceDeg:number,originToleranceMm:number}} options
 * @returns {Readonly<Record<string, unknown>>}
 */
export function validateTopologyGeometry(canonical, options) {
  if (canonical?.schema !== 'CanonicalTopology.v1') throw new TypeError('Geometry diagnostics require CanonicalTopology.v1.');
  for (const [key, value] of Object.entries(options)) if (!Number.isFinite(Number(value)) || Number(value) < 0) throw new TypeError(`Geometry diagnostic option ${key} must be a non-negative finite number.`);
  const findings = [], nodes = new Map(canonical.nodes.map((node) => [cleanText(node.id), node])), degree = new Map(), incident = new Map(), geometry = [];
  for (const edge of canonical.edges) {
    const from = nodes.get(cleanText(edge.fromNodeId)), to = nodes.get(cleanText(edge.toNodeId));
    if (!from || !to) { findings.push(finding('ORPHAN_EDGE_ENDPOINT', `Element ${edge.id} references a missing endpoint.`, [edge.id], {})); continue; }
    for (const nodeId of [edge.fromNodeId, edge.toNodeId]) { degree.set(nodeId, (degree.get(nodeId) ?? 0) + 1); incident.set(nodeId, [...(incident.get(nodeId) ?? []), edge]); }
    const start = xyz(from.position), end = xyz(to.position), edgeLength = pointDistance(start, end);
    if (edgeLength > options.toleranceMm && edgeLength < options.shortElementMm) findings.push(finding('SHORT_ELEMENT', `Element ${edge.id} is ${edgeLength.toFixed(3)} mm; threshold is ${options.shortElementMm} mm.`, [edge.id], { lengthMm: edgeLength }));
    geometry.push({ edge, start, end, min: start.map((value, axis) => Math.min(value, end[axis])), max: start.map((value, axis) => Math.max(value, end[axis])) });
  }
  for (const node of canonical.nodes) {
    const nodeId = cleanText(node.id), nodeDegree = degree.get(nodeId) ?? 0;
    if (!nodeDegree) findings.push(finding('ORPHAN_NODE', `Node ${nodeId} has no incident element.`, [nodeId], {}));
    const authority = cleanText(node.positionAuthority).toUpperCase(), atOrigin = length(xyz(node.position)) <= options.originToleranceMm;
    if (atOrigin && (!node.sourcePortIds?.length || /DEFAULT|UNKNOWN|MISSING/.test(authority))) findings.push(finding('ORIGIN_DEFAULTED', `Node ${nodeId} is at 0,0,0 without authoritative source-port geometry.`, [nodeId], { positionAuthority: node.positionAuthority }));
    const rows = incident.get(nodeId) ?? [], junction = canonical.junctions.find((row) => cleanText(row.nodeId) === nodeId), bendAtNode = hasBendPairEvidence(rows);
    if (rows.length === 2) {
      const vectors = rows.map((edge) => { const other = cleanText(edge.fromNodeId) === nodeId ? nodes.get(cleanText(edge.toNodeId)) : nodes.get(cleanText(edge.fromNodeId)); return subtract(xyz(other.position), xyz(node.position)); });
      const angle = angleDegrees(vectors[0], vectors[1]);
      if (angle <= options.angleToleranceDeg) findings.push(finding('PIPE_BACKTRACK', `Pipe reverses onto the same ray at ${nodeId} (${angle.toFixed(2)}°).`, [nodeId, rows[0].id, rows[1].id], { angleDeg: angle }));
      else if (bendAtNode && Math.abs(180 - angle) <= options.angleToleranceDeg) findings.push(finding('BEND_WITHOUT_DIRECTION_CHANGE', `Bend evidence at ${nodeId} has no direction change (${angle.toFixed(2)}°).`, [nodeId, ...rows.map((row) => row.id)], { angleDeg: angle }));
      else if (!bendAtNode && Math.abs(90 - angle) <= options.angleToleranceDeg) findings.push(finding('RIGHT_ANGLE_WITHOUT_BEND', `A ${angle.toFixed(2)}° direction change at ${nodeId} has no bend evidence.`, [nodeId, ...rows.map((row) => row.id)], { angleDeg: angle }));
      else if (!bendAtNode && Math.abs(180 - angle) > options.angleToleranceDeg) findings.push(finding('UNDEFINED_KINK', `Undefined ${angle.toFixed(2)}° kink at ${nodeId} has no bend evidence.`, [nodeId, ...rows.map((row) => row.id)], { angleDeg: angle }));
    }
    if (rows.length >= 3 && !junction) findings.push(finding('MULTIWAY_WITHOUT_JUNCTION', `${nodeId} has degree ${rows.length} but no TEE/OLET junction record.`, [nodeId, ...rows.map((row) => row.id)], { degree: rows.length }));
    if (junction && rows.length < 3) findings.push(finding('JUNCTION_WITHOUT_MULTIWAY', `${junction.kind} ${junction.id} is defined at degree-${rows.length} node ${nodeId}.`, [junction.id, nodeId], { degree: rows.length }));
    if (junction && bendAtNode) findings.push(finding('BEND_AT_JUNCTION', `Bend evidence and ${junction.kind} ${junction.id} share node ${nodeId}.`, [junction.id, nodeId, ...rows.filter(hasBendEvidence).map((row) => row.id)], {}));
  }
  const byBranch = new Map();
  for (const edge of canonical.edges) for (const branchId of edge.branchIds ?? []) byBranch.set(branchId, [...(byBranch.get(branchId) ?? []), edge]);
  for (const [branchId, edges] of byBranch) {
    const components = edgeComponents(edges);
    if (components.length > 1) for (const rows of components.slice(1)) findings.push(finding('BRANCH_DISCONNECTED', `Branch ${branchId} contains ${components.length} disconnected route components.`, rows.map((row) => row.id), { branchId, componentCount: components.length }));
    for (const edge of edges) if (edges.length > 1 && (degree.get(edge.fromNodeId) ?? 0) === 1 && (degree.get(edge.toNodeId) ?? 0) === 1) findings.push(finding('ISOLATED_ELEMENT', `Element ${edge.id} is isolated from the rest of branch ${branchId}.`, [edge.id], { branchId }));
  }
  for (const [left, right] of candidatePairs(geometry, options.snapToleranceMm)) {
    const leftNodes = [left.edge.fromNodeId, left.edge.toNodeId]; if (leftNodes.includes(right.edge.fromNodeId) || leftNodes.includes(right.edge.toNodeId)) continue;
    const overlap = overlapLength(left, right, options.toleranceMm);
    if (overlap > options.toleranceMm) { findings.push(finding('OVERLAPPING_ELEMENTS', `Elements ${left.edge.id} and ${right.edge.id} overlap by ${overlap.toFixed(3)} mm.`, [left.edge.id, right.edge.id], { overlapMm: overlap })); continue; }
    const closestEndpoints = Math.min(...leftNodes.flatMap((leftId) => [right.edge.fromNodeId, right.edge.toNodeId].map((rightId) => pointDistance(xyz(nodes.get(leftId).position), xyz(nodes.get(rightId).position)))));
    if (closestEndpoints > options.toleranceMm && closestEndpoints <= options.snapToleranceMm) findings.push(finding('SNAP_GAP', `Elements ${left.edge.id} and ${right.edge.id} have unsnapped endpoints ${closestEndpoints.toFixed(3)} mm apart.`, [left.edge.id, right.edge.id], { gapMm: closestEndpoints }));
    else if (segmentDistance(left.start, left.end, right.start, right.end) <= options.toleranceMm) findings.push(finding('CENTERLINE_CLASH', `Elements ${left.edge.id} and ${right.edge.id} intersect without a shared canonical node.`, [left.edge.id, right.edge.id], { clearanceAuthority: 'CENTERLINE_ONLY' }));
  }
  const countsByCode = Object.freeze(Object.fromEntries([...new Set(findings.map((row) => row.code))].map((code) => [code, findings.filter((row) => row.code === code).length])));
  return Object.freeze({ schema: 'TopologyGeometryDiagnostics.v1', options: Object.freeze({ ...options }), findings: Object.freeze(findings), summary: Object.freeze({ findingCount: findings.length, countsByCode }) });
}

export const _test = Object.freeze({ xyz, subtract, dot, length, unit, angleDegrees, segmentDistance, overlapLength, hasBendEvidence, hasBendPairEvidence, edgeComponents, candidatePairs });
