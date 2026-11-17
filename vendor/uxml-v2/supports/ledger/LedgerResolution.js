import { LEDGER_SCHEMA, text, normalizeSupportTag, uniqueValues, standaloneDtxrBranchRelationship, pointDistanceMm, configuredPositionOffset, offsetPoint, toleranceFromConfig } from './LedgerPrimitives.js';
import { buildStandaloneDtxrPositionGroups } from './LedgerPositionGroups.js';
import { parseStandaloneDtxrXmlNodes } from './LedgerXmlNodes.js';

function groupCandidate(xmlBranch, xmlPoint, xmlTag, groups, toleranceMm) {
  const candidates = [];
  for (const group of groups) {
    const relationship = standaloneDtxrBranchRelationship(xmlBranch, group.branch.full);
    if (!relationship.compatible) continue;
    const distance = pointDistanceMm(xmlPoint, group.anchor);
    if (distance > toleranceMm) continue;
    const tagMatch = !!xmlTag && group.entries.some((entry) => entry.tags.includes(xmlTag));
    candidates.push({ group, relationship, distance, tagMatch });
  }
  candidates.sort((a, b) => b.relationship.score - a.relationship.score
    || Number(b.tagMatch) - Number(a.tagMatch)
    || a.distance - b.distance
    || a.group.id.localeCompare(b.group.id));
  const best = candidates[0] || null;
  if (!best) return { best: null, ambiguous: false, candidates };
  const second = candidates[1];
  const ambiguous = !!second
    && second.relationship.score === best.relationship.score
    && second.tagMatch === best.tagMatch
    && Math.abs(second.distance - best.distance) < 0.001;
  return { best: ambiguous ? null : best, ambiguous, candidates };
}

function globalPsFallback(xmlBranch, xmlTag, groups) {
  if (!xmlTag) return null;
  const hits = [];
  for (const group of groups) {
    const relationship = standaloneDtxrBranchRelationship(xmlBranch, group.branch.full);
    if (!relationship.compatible) continue;
    for (const entry of group.entries) {
      if (entry.tags.includes(xmlTag)) hits.push({ group, entry, relationship });
    }
  }
  hits.sort((a, b) => b.relationship.score - a.relationship.score
    || Number(a.entry.jsonSequence) - Number(b.entry.jsonSequence));
  if (!hits.length) return null;
  if (hits.length === 1) return hits[0];
  const top = hits[0];
  const second = hits[1];
  return top.relationship.score > second.relationship.score ? top : null;
}

function supportKinds(value) {
  const source = text(value).toUpperCase();
  const kinds = [];
  if (/\b(PIPE\s*STOP|LINE\s*STOP|LINESTOP|LIMIT)\b/.test(source)) kinds.push('LINESTOP');
  if (/\bGUIDE\b/.test(source)) kinds.push('GUIDE');
  if (/\b(ANCHOR|FIXED)\b/.test(source)) kinds.push('ANCHOR');
  if (/\b(REST|PIPE\s*REST|WEAR\s*PLATE|SHOE)\b/.test(source)) kinds.push('REST');
  return uniqueValues(kinds);
}

function recordForNode(node, groups, toleranceMm) {
  const xmlTag = normalizeSupportTag(node.xmlNodeName || node.psKey || node.componentRefNo);
  const selected = node.xmlPoint
    ? groupCandidate(node.xmlBranch, node.xmlPoint, xmlTag, groups, toleranceMm)
    : { best: null, ambiguous: false, candidates: [] };
  const positional = selected.best;
  const group = positional?.group || null;
  const dtxrPosValues = group ? uniqueValues(group.entries.map((entry) => entry.labeled || entry.description)) : [];
  const psEntry = group?.entries.find((entry) => xmlTag && entry.tags.includes(xmlTag)) || null;
  const fallback = !psEntry ? globalPsFallback(node.xmlBranch, xmlTag, groups) : null;
  const effectivePsEntry = psEntry || fallback?.entry || null;
  const dtxrPsValue = effectivePsEntry ? text(effectivePsEntry.dtxrPs || effectivePsEntry.description) : '';
  const dtxrPosValue = dtxrPosValues.join(' | ');
  const effectiveDtxr = dtxrPosValue || dtxrPsValue;
  const effectiveSource = dtxrPosValue ? 'DTXR_POS' : (dtxrPsValue ? 'DTXR_PS_FALLBACK' : 'NONE');
  const fallbackUsed = effectiveSource === 'DTXR_PS_FALLBACK';
  const matchType = selected.ambiguous
    ? 'POS_AMBIGUOUS'
    : (dtxrPosValue && dtxrPsValue ? 'POS_PS' : (dtxrPosValue ? 'POS' : (dtxrPsValue ? 'PS_FALLBACK' : 'NONE')));
  const status = selected.ambiguous
    ? 'AMBIGUOUS_REVIEW'
    : (matchType === 'POS_PS' ? 'RESOLVED_POS_PS'
      : (matchType === 'POS' ? 'RESOLVED_POS'
        : (matchType === 'PS_FALLBACK' ? 'RESOLVED_PS_FALLBACK' : 'UNRESOLVED')));
  const relationship = positional?.relationship || fallback?.relationship || null;
  const selectedGroup = group || fallback?.group || null;
  const members = group?.entries || (fallback ? [fallback.entry] : []);
  return {
    schema: LEDGER_SCHEMA,
    xmlIndex: node.xmlIndex,
    xmlNodeNumber: node.xmlNodeNumber,
    nodeNumber: node.xmlNodeNumber,
    xmlNodeName: node.xmlNodeName,
    nodeName: node.xmlNodeName,
    componentType: node.componentType,
    componentRefNo: node.componentRefNo,
    xmlBranch: node.xmlBranch,
    branchName: node.xmlBranch,
    xmlPosition: node.xmlPosition,
    xmlPoint: node.xmlPoint,
    sourceKind: 'staged-json',
    sourceBranch: selectedGroup?.branch?.original || '',
    stagedBranch: selectedGroup?.branch?.original || '',
    branchRelationship: relationship?.method || '',
    coordinateToleranceMm: toleranceMm,
    toleranceMm,
    matchedPosition: selectedGroup?.anchor || null,
    positionDistanceMm: positional?.distance ?? null,
    distanceMm: positional?.distance ?? null,
    maxInternalDistanceMm: selectedGroup?.maxInternalDistanceMm ?? null,
    dtxrPosNodeNumbers: group ? group.jsonNodeNos : [],
    dtxrPsNodeNumbers: effectivePsEntry ? [effectivePsEntry.jsonNodeNo] : [],
    positionMembers: members.map((entry) => ({
      jsonNodeNo: entry.jsonNodeNo,
      sourcePath: entry.path,
      branchName: entry.branchName,
      bore: entry.bore,
      point: entry.point,
      type: entry.type,
      name: entry.name,
      dtxrPosValue: entry.labeled || entry.description,
      dtxrPsValue: entry.dtxrPs || '',
      cmpSupGap: entry.cmpSupGap,
    })),
    sourcePaths: members.map((entry) => entry.path),
    dtxrPosValue,
    dtxrPos: dtxrPosValue,
    dtxrPosValues,
    dtxrPsName: xmlTag,
    dtxrPsValue,
    dtxrPs: dtxrPsValue,
    effectiveDtxr,
    effectiveSource,
    fallbackUsed,
    derivedSupportTypes: supportKinds(effectiveDtxr),
    matchType,
    status,
    candidateCount: selected.candidates.length,
    groupId: selectedGroup?.id || '',
  };
}

function inferPositionOffset(nodes, groups, config = {}) {
  if (configuredPositionOffset(config)) return null;
  const precision = Math.max(Number(config?.resolverJsonTrace?.autoCalibratePrecision) || 0.1, 0.001);
  const minVotes = Math.max(Math.round(Number(config?.resolverJsonTrace?.autoCalibrateMinSamples) || 2), 1);
  const buckets = new Map();
  for (const node of nodes) {
    if (!node.xmlPoint) continue;
    for (const group of groups) {
      const relationship = standaloneDtxrBranchRelationship(node.xmlBranch, group.branch.full);
      if (!relationship.compatible) continue;
      const offset = {
        x: node.xmlPoint.x - group.anchor.x,
        y: node.xmlPoint.y - group.anchor.y,
        z: node.xmlPoint.z - group.anchor.z,
      };
      const key = [offset.x, offset.y, offset.z].map((value) => Math.round(value / precision)).join('|');
      const bucket = buckets.get(key) || { count: 0, x: 0, y: 0, z: 0 };
      bucket.count += 1;
      bucket.x += offset.x;
      bucket.y += offset.y;
      bucket.z += offset.z;
      buckets.set(key, bucket);
    }
  }
  const best = [...buckets.values()].sort((a, b) => b.count - a.count)[0];
  if (!best || best.count < minVotes) return null;
  return { x: best.x / best.count, y: best.y / best.count, z: best.z / best.count, votes: best.count };
}

function applyGroupOffset(groups, offset) {
  if (!offset) return groups;
  return groups.map((group) => ({
    ...group,
    anchor: offsetPoint(group.anchor, offset),
    entries: group.entries.map((entry) => ({ ...entry, point: offsetPoint(entry.point, offset) })),
  }));
}

export function buildStandaloneDtxrResolutionLedger(sourceText, stagedJsonText, config = {}) {
  const toleranceMm = toleranceFromConfig(config);
  const nodes = parseStandaloneDtxrXmlNodes(sourceText);
  let groups = buildStandaloneDtxrPositionGroups(stagedJsonText, toleranceMm, config);
  let records = nodes.map((node) => recordForNode(node, groups, toleranceMm));
  let calibration = null;
  if (!records.some((record) => record.effectiveSource === 'DTXR_POS')) {
    calibration = inferPositionOffset(nodes, groups, config);
    if (calibration) {
      groups = applyGroupOffset(groups, calibration);
      records = nodes.map((node) => recordForNode(node, groups, toleranceMm));
    }
  }
  const diagnostics = [
    { type: 'trace-resolution-ledger', schema: LEDGER_SCHEMA, rows: records.length },
    { type: 'trace-resolution-position-groups', groups: groups.length, toleranceMm },
    { type: 'trace-resolution-status-counts', counts: records.reduce((out, record) => { out[record.status] = (out[record.status] || 0) + 1; return out; }, {}) },
  ];
  if (calibration) diagnostics.push({ type: 'trace-resolution-auto-position-offset', ...calibration });
  for (const record of records) {
    if (record.status !== 'UNRESOLVED' || record.xmlNodeName || record.xmlPoint) diagnostics.push({ type: 'standalone-dtxr-node-resolution', ...record });
  }
  return {
    schema: LEDGER_SCHEMA,
    sourceKind: 'staged-json',
    toleranceMm,
    nodes,
    groups,
    records,
    ledger: records,
    calibration,
    diagnostics,
  };
}

export { LEDGER_SCHEMA as TRACE_RESOLUTION_LEDGER_SCHEMA };
