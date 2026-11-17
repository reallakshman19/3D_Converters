import { elementsByName, childText } from '../PlainDom.js';
import { toText, toFiniteNumber, normalizePoint, supportTagsFromAttrs, xmlNodeSupportTags } from './ResolverPrimitives.js';
import { walkStagedComponents, stagedComponentDtxr, stagedComponentDtxrPs, stagedAttr } from './StagedDtxrIndex.js';
import { xmlCiiApplyDtxrPositionOffset, xmlCiiDtxrPositionOffset, pointWithOffset, xmlCiiPositionsMatch } from './PositionOffset.js';
import { annotateComponentDtxr, annotateCmpSupGap } from './ResolverAnnotations.js';

export function buildStagedDtxrPositionIndex(stagedJsonText, config) {
  const empty = { entries: [], byTag: new Map(), count: 0 };
  if (!toText(stagedJsonText).trim()) return empty;
  let parsed = null;
  try { parsed = JSON.parse(stagedJsonText); } catch { return empty; }
  const entries = [];
  const byTag = new Map();
  for (const entry of walkStagedComponents(parsed)) {
    const attrs = entry.attrs || {};
    const dtxrPos = stagedComponentDtxr(entry);
    const dtxrPs = stagedComponentDtxrPs(entry);
    const dtxr = dtxrPos || dtxrPs;
    const cmpSupGap = stagedAttr(entry, ['CMPSUPGAP']);
    const name = toText(attrs.NAME || attrs.name || entry.component?.name || '').trim();
    const rawPoint = normalizePoint(attrs.POSI);
    const point = xmlCiiApplyDtxrPositionOffset(rawPoint, config);
    const supportTags = supportTagsFromAttrs(attrs, entry.component?.name || '');
    if (!dtxr && !cmpSupGap) continue;
    if (!point) continue;
    const indexed = { ...entry, dtxr, dtxrPos, dtxrPs, cmpSupGap, name, point, rawPoint, supportTags, _path: entry._path || '' };
    entries.push(indexed);
    for (const tag of supportTags) {
      if (!byTag.has(tag)) byTag.set(tag, []);
      byTag.get(tag).push(indexed);
    }
  }
  return { entries, byTag, count: entries.length };
}

function xmlCiiDtxrPositionAutoCalibration(config = {}) {
  const option = config?.dtxrPositionOffset || {};
  return {
    enabled: option.enabled !== false && option.autoCalibrate !== false,
    precision: Math.max(toFiniteNumber(option.autoCalibratePrecision, 1), 0.001),
    minSamples: Math.max(Math.round(toFiniteNumber(option.autoCalibrateMinSamples, 2)), 1),
  };
}

function offsetKey(offset, precision) {
  return [offset.x, offset.y, offset.z].map((value) => Math.round(value / precision)).join('|');
}

function inferDtxrPositionOffsetFromXml(root, dtxrPositionIndex, config = {}) {
  const calibration = xmlCiiDtxrPositionAutoCalibration(config);
  if (!calibration.enabled || !root || !dtxrPositionIndex?.byTag) return null;
  const nodes = elementsByName(root, 'Node');
  const grouped = new Map();
  for (const node of nodes) {
    const target = normalizePoint(childText(node, 'Position'));
    if (!target) continue;
    for (const tag of xmlNodeSupportTags(node)) {
      for (const entry of dtxrPositionIndex.byTag.get(tag) || []) {
        if (!entry?.rawPoint) continue;
        const offset = {
          x: target.x - entry.rawPoint.x,
          y: target.y - entry.rawPoint.y,
          z: target.z - entry.rawPoint.z,
        };
        const key = offsetKey(offset, calibration.precision);
        const group = grouped.get(key) || { count: 0, x: 0, y: 0, z: 0, tags: new Set() };
        group.count += 1;
        group.x += offset.x;
        group.y += offset.y;
        group.z += offset.z;
        group.tags.add(tag);
        grouped.set(key, group);
      }
    }
  }

  let best = null;
  for (const [key, group] of grouped.entries()) {
    if (group.count < calibration.minSamples) continue;
    if (!best || group.count > best.group.count) best = { key, group };
  }
  if (!best) return null;
  return {
    x: best.group.x / best.group.count,
    y: best.group.y / best.group.count,
    z: best.group.z / best.group.count,
    samples: best.group.count,
    uniqueTags: best.group.tags.size,
    precision: calibration.precision,
    key: best.key,
  };
}

export function xmlCiiCalibrateDtxrPositionIndex(dtxrPositionIndex, root, config = {}) {
  const inferred = inferDtxrPositionOffsetFromXml(root, dtxrPositionIndex, config);
  if (!inferred) return dtxrPositionIndex;
  const offset = { x: inferred.x, y: inferred.y, z: inferred.z };
  const entries = [];
  const byTag = new Map();
  for (const entry of dtxrPositionIndex.entries || []) {
    const point = pointWithOffset(entry.rawPoint, offset) || entry.point || null;
    const indexed = { ...entry, point, inferredOffset: offset };
    entries.push(indexed);
    for (const tag of indexed.supportTags || []) {
      if (!byTag.has(tag)) byTag.set(tag, []);
      byTag.get(tag).push(indexed);
    }
  }
  return { ...dtxrPositionIndex, entries, byTag, count: entries.length, inferredOffset: offset, calibration: inferred };
}

export function xmlCiiDtxrPosForNode(node, dtxrPositionIndex, config) {
  if (!dtxrPositionIndex || dtxrPositionIndex.count <= 0) return { text: '', values: [] };
  const target = normalizePoint(childText(node, 'Position'));
  if (!target) return { text: '', values: [] };
  const tolerance = xmlCiiDtxrPositionOffset(config).tolerance;
  const seenDtxr = new Set();
  const rawValues = [];
  const labeledValues = [];
  const gapValues = [];
  let matchedPath = '';
  for (const entry of dtxrPositionIndex.entries) {
    if (!xmlCiiPositionsMatch(entry.point, target, tolerance)) continue;
    if (!matchedPath && entry._path) matchedPath = entry._path;
    if (entry.dtxr && !seenDtxr.has(entry.dtxr)) {
      seenDtxr.add(entry.dtxr);
      rawValues.push(entry.dtxr);
      const annotParts = [];
      if (entry.name) annotParts.push(`NAME=${entry.name}`);
      if (entry.cmpSupGap) annotParts.push(`CMPSUPGAP=${entry.cmpSupGap}`);
      const annotation = annotParts.length ? `(${annotParts.join(',')})` : '';
      labeledValues.push(annotation ? `${entry.dtxr}${annotation}` : entry.dtxr);
    }
    if (entry.cmpSupGap && !gapValues.includes(entry.cmpSupGap)) gapValues.push(entry.cmpSupGap);
  }
  if (rawValues[0]) annotateComponentDtxr(node, 'POS', rawValues[0]);
  if (gapValues[0]) annotateCmpSupGap(node, 'POS', gapValues[0]);
  return { text: labeledValues.join('|'), values: rawValues, cmpSupGap: gapValues[0] || '', matchedPath };
}

