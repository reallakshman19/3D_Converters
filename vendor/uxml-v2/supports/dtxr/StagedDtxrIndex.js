import { toText, normalizePoint, normalizeOwnerBranchName, ownerBranchVariants, supportTagsFromAttrs, supportTagBase } from './ResolverPrimitives.js';
import { xmlCiiApplyDtxrPositionOffset } from './PositionOffset.js';

export function walkStagedComponents(value, branchName = '', out = [], _path = '$') {
  if (Array.isArray(value)) {
    value.forEach((item, idx) => walkStagedComponents(item, branchName, out, `${_path}[${idx}]`));
    return out;
  }
  if (!value || typeof value !== 'object') return out;
  const attrs = value.attributes && typeof value.attributes === 'object' ? value.attributes : {};
  const type = toText(value.type || attrs.TYPE).toUpperCase();
  const currentBranch = (type === 'BRANCH' || Array.isArray(value.children)) ? toText(value.name || attrs.NAME || attrs.OWNER || branchName) : branchName;
  out.push({ component: value, attrs, branchName: currentBranch, type, _path });
  if (Array.isArray(value.children)) value.children.forEach((child, idx) => walkStagedComponents(child, currentBranch, out, `${_path}.children[${idx}]`));
  return out;
}

export function stagedAttr(indexed, names = []) {
  const attrs = indexed?.attrs || indexed?.raw?.attrs || {};
  for (const wanted of names) {
    const upper = toText(wanted).toUpperCase();
    for (const [key, value] of Object.entries(attrs)) {
      if (toText(key).toUpperCase() === upper && toText(value).trim()) return toText(value).trim();
    }
  }
  return '';
}

export function stagedComponentDtxr(indexed) {
  const attrs = indexed?.attrs || {};
  return toText(attrs.DTXR_POS || attrs.DTXR || attrs.DESC || attrs.DESCRIPTION || attrs.NAME || indexed?.component?.name || '').trim();
}

export function stagedComponentDtxrPs(indexed) {
  const attrs = indexed?.attrs || {};
  return stagedAttr({ attrs }, ['DTXR_PS', 'DTXRPS', 'DTXR', 'DESC', 'DESCRIPTION']);
}

function stagedOwnerValue(indexed) {
  const attrs = indexed?.attrs || {};
  return toText(attrs.OWNER || attrs.Owner || attrs.owner || indexed?.component?.OWNER || indexed?.branchName || '').trim();
}

export function cleanDtxr(value) {
  return String(value ?? '').replace(/\s+/g, ' ').replace(/[;,/|]+/g, '+').replace(/\++/g, '+').replace(/^\+|\+$/g, '').trim().toUpperCase();
}

export function canonKey(value) {
  return String(value ?? '').trim().replace(/\s+/g, '').replace(/^=/, '').toUpperCase();
}

export function coordKey(coord, precision = 1) {
  if (!coord) return '';
  return [coord.x, coord.y, coord.z].map((v) => Math.round(v / precision)).join('|');
}

function addArrayMap(map, key, item) {
  const cleaned = canonKey(key);
  if (!cleaned) return;
  if (!map.has(cleaned)) map.set(cleaned, []);
  map.get(cleaned).push(item);
}

function addOwnerIndex(map, item, owner) {
  for (const key of ownerBranchVariants(owner)) {
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
}

export function stagedTypeOf(indexed) {
  return toText(indexed?.type || indexed?.raw?.type || indexed?.attrs?.TYPE || indexed?.attrs?.ComponentType || indexed?.attrs?.COMPONENTTYPE || indexed?.component?.type || '').trim().toUpperCase();
}

export function buildStagedDtxrIndex(stagedJson, config = {}) {
  let walked = [];
  try {
    const parsed = typeof stagedJson === 'string' ? JSON.parse(stagedJson) : stagedJson;
    walked = walkStagedComponents(parsed);
  } catch {}

  const byComponentRefNo = new Map();
  const byPsTag = new Map();
  const byPsBaseTag = new Map();
  const byNodeNumber = new Map();
  const byNodeName = new Map();
  const byCoordKey = new Map();
  const byOwnerBranch = new Map();
  const ownerItems = [];
  const items = [];

  for (const item of walked) {
    const dtxr = stagedComponentDtxr(item);
    const dtxrPs = stagedComponentDtxrPs(item);
    const cmpSupGap = stagedAttr(item, ['CMPSUPGAP']);
    if (!dtxr && !dtxrPs && !cmpSupGap) continue;

    const attrs = item.attrs || {};
    const indexedItem = {
      raw: item,
      attrs,
      dtxr,
      dtxrPs,
      cmpSupGap,
      owner: stagedOwnerValue(item),
      ownerNorm: normalizeOwnerBranchName(stagedOwnerValue(item)),
      coord: null,
      type: stagedTypeOf(item),
      component: item.component,
      _path: item._path || '',
      _jsonSeq: items.length,
    };
    items.push(indexedItem);

    for (const ref of [attrs.ComponentRefNo, attrs.COMPONENTREFNO, attrs.componentRefNo, attrs.RefNo, attrs.REFNO, attrs.REF, attrs.NAME, item.componentRefNo, item.refNo, item.component?.refNo]) addArrayMap(byComponentRefNo, ref, indexedItem);
    for (const tag of supportTagsFromAttrs(attrs, item.component?.name || '')) {
      addArrayMap(byPsTag, tag, indexedItem);
      const baseTag = supportTagBase(tag);
      if (baseTag) addArrayMap(byPsBaseTag, baseTag, indexedItem);
    }

    const nodeNo = attrs.NodeNumber || attrs.NODE || '';
    if (nodeNo) byNodeNumber.set(String(nodeNo).trim(), indexedItem);
    const nodeName = attrs.NodeName || '';
    if (nodeName) byNodeName.set(canonKey(nodeName), indexedItem);

    if (indexedItem.ownerNorm && indexedItem.dtxrPs) {
      ownerItems.push(indexedItem);
      addOwnerIndex(byOwnerBranch, indexedItem, indexedItem.owner);
    }

    let coord = null;
    for (const key of ['SUPPORTCOORD', 'POS', 'POSI', 'BPOS', 'APOS', 'LPOS', 'CPOS', 'HPOS', 'TPOS']) {
      const rawCoord = normalizePoint(attrs[key]);
      coord = key === 'POSI' ? xmlCiiApplyDtxrPositionOffset(rawCoord, config) : rawCoord;
      if (coord) break;
    }
    if (coord) {
      indexedItem.coord = coord;
      const precisionKey = coordKey(coord, config.coordinatePrecision ?? 1);
      if (!byCoordKey.has(precisionKey)) byCoordKey.set(precisionKey, []);
      byCoordKey.get(precisionKey).push(indexedItem);
    }
  }

  return { items, byComponentRefNo, byPsTag, byPsBaseTag, byNodeNumber, byNodeName, byCoordKey, byOwnerBranch, ownerItems };
}

export function buildDtxrContext(stagedJsonText, config = {}) {
  const stagedIndex = buildStagedDtxrIndex(stagedJsonText, config);
  return { stagedIndex, ...stagedIndex };
}

