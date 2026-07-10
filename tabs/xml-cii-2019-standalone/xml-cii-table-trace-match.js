/**
 * Matching rules for table-driven XML node trace resolution.
 * Inputs: normalized XML node rows, mapped table rows, and trace config.
 * Outputs: accepted or rejected rule decisions with candidate evidence.
 * Fallback: ambiguous duplicate candidates are rejected unless configured.
 */
import { activeProfileFor, normalizeTraceTableConfig } from './xml-cii-table-trace-config.js';

function text(value) { return String(value ?? '').trim(); }
function compact(value) { return text(value).toUpperCase().replace(/[^A-Z0-9]/g, ''); }
function normRef(value) { return text(value).replace(/^=/, '').replace(/\s+/g, '').toUpperCase(); }

function parsePoint(value) {
  const directional = {};
  const source = text(value);
  source.replace(/\b([EWSNUD])\s*(-?\d+(?:\.\d+)?)\s*mm\b/gi, (_, axis, numberText) => {
    const numeric = Number(numberText);
    if (!Number.isFinite(numeric)) return '';
    const key = axis.toUpperCase();
    if (key === 'E') directional.x = numeric;
    if (key === 'W') directional.x = -numeric;
    if (key === 'N') directional.y = numeric;
    if (key === 'S') directional.y = -numeric;
    if (key === 'U') directional.z = numeric;
    if (key === 'D') directional.z = -numeric;
    return '';
  });
  if (Number.isFinite(directional.x) && Number.isFinite(directional.y) && Number.isFinite(directional.z)) return directional;
  const numbers = source.match(/-?\d+(?:\.\d+)?(?:[Ee][+-]?\d+)?/g)?.map(Number).filter(Number.isFinite) || [];
  return numbers.length >= 3 ? { x: numbers[0], y: numbers[1], z: numbers[2] } : null;
}

function distance(left, right) {
  if (!left || !right) return Number.POSITIVE_INFINITY;
  const dx = left.x - right.x;
  const dy = left.y - right.y;
  const dz = left.z - right.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function rowWithKeys(row) {
  const positionPoint = parsePoint(row.position);
  return {
    ...row,
    componentRefKey: normRef(row.componentRefNo),
    nodeNameKey: compact(row.nodeName),
    componentTypeKey: compact(row.componentType),
    positionPoint,
  };
}

function duplicateCount(map) {
  return [...map.values()].filter((items) => items.length > 1).length;
}

export function buildTraceTableRowIndex(mappedRows) {
  const rows = (Array.isArray(mappedRows) ? mappedRows : []).map(rowWithKeys);
  const byRef = new Map();
  const byName = new Map();
  for (const row of rows) {
    if (row.componentRefKey) byRef.set(row.componentRefKey, [...(byRef.get(row.componentRefKey) || []), row]);
    if (row.nodeNameKey) byName.set(row.nodeNameKey, [...(byName.get(row.nodeNameKey) || []), row]);
  }
  return { rows, byRef, byName, duplicateRefCount: duplicateCount(byRef), duplicateNameCount: duplicateCount(byName) };
}

function refRows(node, index) {
  return index.byRef.get(normRef(node.componentRefNo)) || [];
}

function shouldUseNameOnly(node, index) {
  return !normRef(node.componentRefNo) || !index.byRef.size;
}

function sameName(row, node) {
  return row.nodeNameKey && row.nodeNameKey === compact(node.nodeName);
}

function samePosition(row, node, tolerance) {
  return distance(row.positionPoint, node.posPoint) <= tolerance;
}

function sameType(row, node) {
  return !row.componentTypeKey || !node.componentType || row.componentTypeKey === compact(node.componentType);
}

function candidatesForRule(ruleId, node, index, config) {
  const tolerance = Number(config.coordinateTolerance) || 0;
  if (ruleId === 'componentRefNo+nodeName') return refRows(node, index).filter((row) => sameName(row, node));
  if (ruleId === 'componentRefNo+position') return refRows(node, index).filter((row) => samePosition(row, node, tolerance));
  if (ruleId === 'nodeName') return shouldUseNameOnly(node, index) ? index.byName.get(compact(node.nodeName)) || [] : [];
  if (ruleId === 'position+componentType') return index.rows.filter((row) => samePosition(row, node, tolerance) && sameType(row, node));
  if (ruleId === 'componentRefNo') return refRows(node, index);
  return [];
}

function resolveCandidates(ruleId, candidates, config) {
  if (!candidates.length) return { status: 'no-match', rows: [], method: ruleId, candidates: [] };
  if (candidates.length === 1) return { status: 'accepted', rows: candidates, method: ruleId, candidates };
  if (config.ambiguityPolicy === 'accept-first') return { status: 'accepted', rows: [candidates[0]], method: `${ruleId}:first`, candidates };
  return { status: config.ambiguityPolicy === 'manual-review' ? 'review' : 'ambiguous', rows: [], method: ruleId, candidates };
}

export function matchTraceTableNode(node, index, traceConfig) {
  const config = normalizeTraceTableConfig(traceConfig);
  for (const rule of config.matchRules.filter((item) => item.enabled !== false)) {
    const decision = resolveCandidates(rule.id, candidatesForRule(rule.id, node, index, config), config);
    if (decision.status !== 'no-match') return decision;
  }
  return { status: 'no-match', rows: [], method: 'none', candidates: [] };
}

export function traceTableMatchSummary(headers, rowIndex, traceConfig) {
  const config = normalizeTraceTableConfig(traceConfig);
  const profile = activeProfileFor(headers, config);
  return {
    profileId: profile.id,
    profileLabel: profile.label,
    profileConfidence: profile.confidence,
    ambiguityPolicy: config.ambiguityPolicy,
    coordinateTolerance: config.coordinateTolerance,
    activeRules: config.matchRules.filter((rule) => rule.enabled !== false).map((rule) => rule.id),
    duplicateRefCount: rowIndex.duplicateRefCount,
    duplicateNameCount: rowIndex.duplicateNameCount,
  };
}
