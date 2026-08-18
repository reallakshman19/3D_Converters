import * as legacy from './dtxr-resolver-core-legacy.js';
import {
  canonicalizeStagedAttributes,
  normalizeOwnerBranchName,
  normalizeSupportIdentity,
  ownerBranchVariants,
  parseSourcePoint,
  readSourceField,
  resolveCoordinateAlignment,
  shouldAutoCalibrateCoordinates,
  sourceRelationshipRoots,
  sourceSupportIdentities,
  supportIdentityRoot,
  supportIdentityVariants,
  walkStagedSource,
} from './source-schema-adapter.js';

export * from './dtxr-resolver-core-legacy.js';

function text(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function canonKey(value) {
  return text(value).replace(/\s+/g, '').replace(/^=/, '').toUpperCase();
}

function coordinateKey(point, precision = 1) {
  if (!point) return '';
  const unit = Math.max(Number(precision) || 1, 0.000001);
  return [point.x, point.y, point.z].map((value) => Math.round(value / unit)).join('|');
}

function addMap(map, key, item) {
  const normalized = canonKey(key);
  if (!normalized) return;
  const bucket = map.get(normalized) || [];
  if (!bucket.some((candidate) => candidate._path === item._path)) bucket.push(item);
  map.set(normalized, bucket);
}

function addOwner(map, owner, item) {
  for (const variant of ownerBranchVariants(owner)) {
    const bucket = map.get(variant) || [];
    if (!bucket.some((candidate) => candidate._path === item._path)) bucket.push(item);
    map.set(variant, bucket);
  }
}

function xmlChildrenByName(parent, localName) {
  return [...(parent?.childNodes || [])].filter((child) => child.nodeType === 1 && String(child.localName || child.nodeName).replace(/^.*:/, '') === localName);
}

function xmlText(parent, localName) {
  return text(xmlChildrenByName(parent, localName)[0]?.textContent);
}

export function normalizeSupportTag(value, config = {}) {
  return normalizeSupportIdentity(value, config);
}

export function xmlNodeSupportTags(node, config = {}) {
  const parts = [];
  if (typeof node?.getElementsByTagName === 'function') {
    parts.push(xmlText(node, 'NodeName'), xmlText(node, 'ComponentRefNo'));
    for (const child of xmlChildrenByName(node, 'SupportTag')) parts.push(text(child.textContent));
  } else if (node && typeof node === 'object') {
    parts.push(node.NodeName, node.nodeName, node.ComponentRefNo, node.componentRefNo, node.SupportTag, node.supportTag);
  }
  const tags = [];
  for (const part of parts.flat().filter(Boolean)) {
    for (const variant of supportIdentityVariants(part, config)) if (!tags.includes(variant)) tags.push(variant);
  }
  return tags;
}

function relationshipGroups(items = []) {
  const map = new Map();
  for (const item of items) {
    for (const root of item.relationshipRoots || []) {
      const bucket = map.get(root) || [];
      bucket.push(item);
      map.set(root, bucket);
    }
  }
  return map;
}

function relatedItems(item, groups) {
  const out = [];
  for (const root of item.relationshipRoots || []) out.push(...(groups.get(root) || []));
  const source = out.length ? out : [item];
  const seen = new Set();
  return source.filter((candidate) => {
    const key = candidate._path || candidate;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildStagedDtxrIndex(stagedJson, config = {}) {
  const byComponentRefNo = new Map();
  const byPsTag = new Map();
  const byPsBaseTag = new Map();
  const byNodeNumber = new Map();
  const byNodeName = new Map();
  const byCoordKey = new Map();
  const byOwnerBranch = new Map();
  const ownerItems = [];
  const items = [];

  for (const record of walkStagedSource(stagedJson, config)) {
    const attrs = canonicalizeStagedAttributes(record.attrs, config, record.component);
    const dtxrPos = text(readSourceField({ ...record.component, attributes: attrs }, 'dtxrPosition', config));
    const dtxrPs = text(readSourceField({ ...record.component, attributes: attrs }, 'dtxrPs', config));
    const dtxr = dtxrPos || text(readSourceField({ ...record.component, attributes: attrs }, 'dtxr', config)) || text(record.component?.name);
    const cmpSupGap = text(readSourceField({ ...record.component, attributes: attrs }, 'supportGap', config));
    if (!dtxr && !dtxrPs && !cmpSupGap) continue;

    const position = record.position;
    const owner = text(readSourceField({ ...record.component, attributes: attrs }, 'parentRef', config) || record.branchName);
    const indexed = {
      raw: record,
      attrs,
      dtxr,
      dtxrPos,
      dtxrPs,
      cmpSupGap,
      owner,
      ownerNorm: normalizeOwnerBranchName(owner),
      coord: position?.point || null,
      rawPoint: position?.rawPoint || null,
      positionField: position?.field || '',
      type: text(readSourceField({ ...record.component, attributes: attrs }, 'objectType', config) || record.type).toUpperCase(),
      component: record.component,
      _path: record._path || '',
      _jsonSeq: items.length,
      supportTags: sourceSupportIdentities({ ...record.component, attributes: attrs, component: record.component }, config),
      relationshipRoots: sourceRelationshipRoots({ ...record.component, attributes: attrs, component: record.component }, config),
    };
    items.push(indexed);
  }

  const groups = relationshipGroups(items);
  for (const item of items) {
    const related = relatedItems(item, groups);
    const refs = [
      readSourceField({ ...item.component, attributes: item.attrs }, 'componentRef', config),
      readSourceField({ ...item.component, attributes: item.attrs }, 'objectName', config),
    ];
    for (const ref of refs) for (const candidate of related) addMap(byComponentRefNo, ref, candidate);

    for (const tag of item.supportTags || []) {
      for (const candidate of related) addMap(byPsTag, tag, candidate);
      const root = supportIdentityRoot(tag, config);
      if (root) for (const candidate of related) addMap(byPsBaseTag, root, candidate);
    }

    const nodeNo = text(readSourceField({ ...item.component, attributes: item.attrs }, 'nodeNumber', config));
    if (nodeNo && !byNodeNumber.has(nodeNo)) byNodeNumber.set(nodeNo, item);
    const nodeName = text(readSourceField({ ...item.component, attributes: item.attrs }, 'nodeName', config));
    if (nodeName && !byNodeName.has(canonKey(nodeName))) byNodeName.set(canonKey(nodeName), item);

    if (item.ownerNorm && item.dtxrPs) {
      ownerItems.push(item);
      addOwner(byOwnerBranch, item.owner, item);
    }

    const key = coordinateKey(item.coord, config.coordinatePrecision ?? 1);
    if (key) {
      const bucket = byCoordKey.get(key) || [];
      for (const candidate of related) if (!bucket.some((entry) => entry._path === candidate._path)) bucket.push(candidate);
      byCoordKey.set(key, bucket);
    }
  }

  return {
    items, byComponentRefNo, byPsTag, byPsBaseTag, byNodeNumber, byNodeName,
    byCoordKey, byOwnerBranch, ownerItems, byRelationship: groups,
  };
}

export function buildDtxrContext(stagedJsonText, config = {}) {
  const stagedIndex = buildStagedDtxrIndex(stagedJsonText, config);
  return { stagedIndex, ...stagedIndex };
}

function relationshipDtxrResult(xmlNode, stagedIndex, config = {}) {
  const tags = xmlNodeSupportTags(xmlNode, config);
  for (const tag of tags) {
    const matches = stagedIndex?.byPsTag?.get(canonKey(tag)) || stagedIndex?.byPsTag?.get(tag) || [];
    if (!matches.length) continue;
    const dtxrPos = [...new Set(matches.map((item) => text(item.dtxrPos || item.dtxr)).filter(Boolean))].join('+');
    const dtxrPs = matches.map((item) => text(item.dtxrPs)).find(Boolean) || '';
    const evidence = legacy.selectEffectiveDtxrEvidence(dtxrPos, dtxrPs);
    if (!evidence.effectiveDtxr) continue;
    const gaps = [...new Set(matches.map((item) => text(item.cmpSupGap)).filter(Boolean))];
    return {
      canonicalText: evidence.effectiveDtxr,
      value: evidence.effectiveDtxr,
      ...evidence,
      teeDesc: '',
      cmpSupGap: gaps[0] || '',
      cmpSupGaps: gaps,
      supportTags: tags,
      source: 'staged-support-relationship',
      matchedBy: 'support-relationship',
      matchedKey: tag,
      stagedType: matches.map((item) => item.type).find(Boolean) || '',
      componentRefNo: legacy.getXmlNodeProperty(xmlNode, 'ComponentRefNo'),
      confidence: 1,
      suppressed: false,
      suppressionReason: '',
      candidates: matches,
      relationshipRoots: [...new Set(matches.flatMap((item) => item.relationshipRoots || []))],
    };
  }
  return null;
}

export function resolveDtxrForXmlNode(args = {}) {
  if ((args.purpose || 'component-description') === 'support-restraint') {
    const stagedIndex = args.context?.stagedIndex || args.context;
    const linked = relationshipDtxrResult(args.xmlNode, stagedIndex, args.config || {});
    if (linked) return linked;
  }
  return legacy.resolveDtxrForXmlNode(args);
}

export function xmlCiiDtxrPositionOffset(config = {}) {
  const alignment = resolveCoordinateAlignment(config);
  return {
    enabled: alignment.mode === 'MANUAL',
    xOffset: alignment.offsetMm.x,
    yOffset: alignment.offsetMm.y,
    zOffset: alignment.offsetMm.z,
    tolerance: alignment.matchToleranceMm,
  };
}

export function xmlCiiApplyDtxrPositionOffset(point, config = {}, fieldName = 'POSI') {
  const parsed = parseSourcePoint(point);
  if (!parsed) return null;
  const option = xmlCiiDtxrPositionOffset(config);
  const alignment = resolveCoordinateAlignment(config);
  if (!option.enabled || (alignment.applyToFields.length && !alignment.applyToFields.includes(text(fieldName).toUpperCase()))) return parsed;
  return {
    x: parsed.x + option.xOffset,
    y: parsed.y + option.yOffset,
    z: parsed.z + option.zOffset,
  };
}

export function buildStagedDtxrPositionIndex(stagedJsonText, config = {}) {
  const entries = [];
  const byTag = new Map();
  for (const record of walkStagedSource(stagedJsonText, config)) {
    const attrs = canonicalizeStagedAttributes(record.attrs, config, record.component);
    const dtxrPos = text(readSourceField({ ...record.component, attributes: attrs }, 'dtxrPosition', config));
    const dtxrPs = text(readSourceField({ ...record.component, attributes: attrs }, 'dtxrPs', config));
    const dtxr = dtxrPos || text(readSourceField({ ...record.component, attributes: attrs }, 'dtxr', config));
    const cmpSupGap = text(readSourceField({ ...record.component, attributes: attrs }, 'supportGap', config));
    if ((!dtxr && !cmpSupGap) || !record.position?.point) continue;
    const indexed = {
      ...record,
      attrs,
      dtxr,
      dtxrPos,
      dtxrPs,
      cmpSupGap,
      name: text(readSourceField({ ...record.component, attributes: attrs }, 'objectName', config)),
      point: record.position.point,
      rawPoint: record.position.rawPoint,
      positionField: record.position.field,
      supportTags: sourceSupportIdentities({ ...record.component, attributes: attrs, component: record.component }, config),
      relationshipRoots: sourceRelationshipRoots({ ...record.component, attributes: attrs, component: record.component }, config),
      _path: record._path || '',
    };
    entries.push(indexed);
  }

  const groups = relationshipGroups(entries);
  for (const entry of entries) {
    const related = relatedItems(entry, groups);
    for (const tag of entry.supportTags || []) {
      const key = normalizeSupportIdentity(tag, config);
      if (!key) continue;
      const bucket = byTag.get(key) || [];
      for (const candidate of related) if (!bucket.some((item) => item._path === candidate._path)) bucket.push(candidate);
      byTag.set(key, bucket);
    }
  }
  return { entries, byTag, count: entries.length, byRelationship: groups };
}

export function xmlCiiCalibrateDtxrPositionIndex(dtxrPositionIndex, document, config = {}) {
  if (!shouldAutoCalibrateCoordinates(config) || !document || !dtxrPositionIndex?.byTag) return dtxrPositionIndex;
  const alignment = resolveCoordinateAlignment(config);
  const precision = Math.max(alignment.calibrationToleranceMm || 1, 0.001);
  const minSamples = Math.max(alignment.minimumCalibrationSamples || 2, 1);
  const groups = new Map();
  const nodes = typeof document.getElementsByTagName === 'function'
    ? [...document.getElementsByTagName('Node')]
    : [];

  for (const node of nodes) {
    const target = parseSourcePoint(legacy.getXmlNodeProperty(node, 'Position'));
    if (!target) continue;
    for (const tag of xmlNodeSupportTags(node, config)) {
      const matches = dtxrPositionIndex.byTag.get(normalizeSupportIdentity(tag, config)) || [];
      for (const entry of matches) {
        if (!entry?.rawPoint) continue;
        const offset = {
          x: target.x - entry.rawPoint.x,
          y: target.y - entry.rawPoint.y,
          z: target.z - entry.rawPoint.z,
        };
        const key = [offset.x, offset.y, offset.z].map((value) => Math.round(value / precision)).join('|');
        const group = groups.get(key) || { count: 0, x: 0, y: 0, z: 0, tags: new Set() };
        group.count += 1;
        group.x += offset.x;
        group.y += offset.y;
        group.z += offset.z;
        group.tags.add(tag);
        groups.set(key, group);
      }
    }
  }

  let best = null;
  for (const [key, group] of groups.entries()) {
    if (group.count < minSamples) continue;
    if (!best || group.count > best.group.count || (group.count === best.group.count && group.tags.size > best.group.tags.size)) {
      best = { key, group };
    }
  }
  if (!best) return dtxrPositionIndex;

  const offset = {
    x: best.group.x / best.group.count,
    y: best.group.y / best.group.count,
    z: best.group.z / best.group.count,
  };
  const entries = (dtxrPositionIndex.entries || []).map((entry) => ({
    ...entry,
    point: entry.rawPoint ? {
      x: entry.rawPoint.x + offset.x,
      y: entry.rawPoint.y + offset.y,
      z: entry.rawPoint.z + offset.z,
    } : entry.point,
    inferredOffset: offset,
  }));
  const byTag = new Map();
  for (const entry of entries) {
    for (const tag of entry.supportTags || []) {
      const key = normalizeSupportIdentity(tag, config);
      if (!key) continue;
      const bucket = byTag.get(key) || [];
      if (!bucket.some((candidate) => candidate._path === entry._path)) bucket.push(entry);
      byTag.set(key, bucket);
    }
  }
  return {
    ...dtxrPositionIndex,
    entries,
    byTag,
    count: entries.length,
    inferredOffset: offset,
    calibration: {
      ...offset,
      samples: best.group.count,
      uniqueTags: best.group.tags.size,
      precision,
      key: best.key,
      source: 'source-schema-auto-calibration',
    },
  };
}

export function xmlCiiDtxrPosForNode(node, dtxrPositionIndex, config = {}) {
  const alignment = resolveCoordinateAlignment(config);
  const compatible = {
    ...config,
    dtxrPositionOffset: {
      ...(config.dtxrPositionOffset || {}),
      enabled: false,
      tolerance: alignment.matchToleranceMm,
    },
  };
  return legacy.xmlCiiDtxrPosForNode(node, dtxrPositionIndex, compatible);
}
