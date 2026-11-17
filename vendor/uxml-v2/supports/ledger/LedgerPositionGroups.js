import { text, attrValue, parseStandaloneDtxrPoint, configuredPositionOffset, offsetPoint, canonicalStandaloneDtxrBranch, supportTags, pointDistanceMm, uniqueValues } from './LedgerPrimitives.js';

const POSITION_ALIASES = Object.freeze(['SUPPORTCOORD', 'SUPPORT_COORD', 'POS', 'POSI', 'BPOS', 'APOS', 'LPOS', 'CPOS', 'HPOS', 'TPOS', 'SPOS', 'EPOS', 'DTXR_POS']);

function ownPosition(attrs, value, config) {
  const configuredOffset = configuredPositionOffset(config);
  for (const alias of POSITION_ALIASES) {
    const raw = attrValue(attrs, [alias]);
    const parsed = parseStandaloneDtxrPoint(raw);
    if (!parsed) continue;
    return alias === 'POSI' ? offsetPoint(parsed, configuredOffset) : parsed;
  }
  return parseStandaloneDtxrPoint(value?.position || value?.point || '');
}

function descriptionParts(value, attrs, type, hasChildren) {
  const rawDtxrPos = attrValue(attrs, ['DTXR_POS']);
  const explicitDtxrPos = parseStandaloneDtxrPoint(rawDtxrPos)
    ? text(attrValue(attrs, ['DTXR', 'DESC', 'DESCRIPTION', 'RTEXT', 'SPRE']))
    : text(rawDtxrPos || attrValue(attrs, ['DTXR', 'DESC', 'DESCRIPTION', 'RTEXT', 'SPRE']));
  const description = explicitDtxrPos || (hasChildren ? '' : text(value?.name || type));
  const dtxrPs = text(attrValue(attrs, ['DTXR_PS', 'DTXRPS']));
  const name = text(attrValue(attrs, ['NAME', 'NodeName', 'SupportTag']));
  const componentRef = text(attrValue(attrs, ['ComponentRefNo', 'COMPONENTREFNO', 'REF', 'RefNo']));
  const labeled = description && name && !description.toUpperCase().includes('NAME=')
    ? `${description}(NAME=${name})`
    : description;
  return { description, dtxrPs, labeled, name, componentRef };
}

function sourceNodeNo(attrs, sequence) {
  const explicit = text(attrValue(attrs, ['JsonNodeNo', 'JSON_NODE_NO', 'NODE_NO', 'NodeNumber', 'NODE', 'SEQ', 'SEQUENCE']));
  return explicit || String(sequence);
}

function walkStaged(value, context, out, path, sequenceRef, config) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkStaged(item, context, out, `${path}[${index}]`, sequenceRef, config));
    return;
  }
  if (!value || typeof value !== 'object') return;
  sequenceRef.value += 1;
  const sequence = sequenceRef.value;
  const attrs = value.attributes && typeof value.attributes === 'object' ? value.attributes : {};
  const type = text(value.type || attrs.TYPE).toUpperCase();
  const hasChildren = Array.isArray(value.children) && value.children.length > 0;
  const branchName = type === 'BRANCH'
    ? text(value.name || attrValue(attrs, ['OWNER', 'BRANCH', 'PIPE']) || context.branchName)
    : context.branchName;
  const directPoint = ownPosition(attrs, value, config);
  const point = directPoint || context.point || null;
  const bore = text(attrValue(attrs, ['ABORE', 'LBORE', 'HBORE', 'BORE']) || value.bore || context.bore);
  const parts = descriptionParts(value, attrs, type, hasChildren);
  const psAliasValue = text(attrValue(attrs, ['PS', 'supportPs', 'psNo']));
  const tags = supportTags([parts.name, parts.description, parts.dtxrPs, parts.labeled, psAliasValue].join(' '));
  const cmpSupGap = text(attrValue(attrs, ['CMPSUPGAP', 'SUPPORT GAP']));
  const isBranchContainer = type === 'BRANCH';
  const isCoordinateContainer = !!directPoint && hasChildren && !parts.description && !parts.dtxrPs;
  if (!isBranchContainer && !isCoordinateContainer && (parts.description || parts.dtxrPs || cmpSupGap) && point) {
    out.push({
      jsonNodeNo: sourceNodeNo(attrs, sequence),
      jsonSequence: sequence,
      branchName,
      branch: canonicalStandaloneDtxrBranch(branchName),
      point,
      bore,
      type,
      description: parts.description,
      dtxrPs: parts.dtxrPs,
      labeled: parts.labeled || parts.description,
      name: parts.name,
      componentRef: parts.componentRef,
      tags,
      cmpSupGap,
      path,
      raw: value,
    });
  }
  if (hasChildren) {
    const next = { branchName, point, bore };
    value.children.forEach((child, index) => walkStaged(child, next, out, `${path}.children[${index}]`, sequenceRef, config));
  }
}

export function buildStandaloneDtxrPositionGroups(stagedJsonText, toleranceMm = 6, config = {}) {
  let parsed;
  try { parsed = typeof stagedJsonText === 'string' ? JSON.parse(stagedJsonText) : stagedJsonText; } catch { return []; }
  const entries = [];
  walkStaged(parsed, { branchName: '', point: null, bore: '' }, entries, '$', { value: 0 }, config);
  const groups = [];
  for (const entry of entries) {
    let selected = null;
    let selectedDistance = Number.POSITIVE_INFINITY;
    for (const group of groups) {
      const sameRoot = group.branch.root === entry.branch.root;
      if (!sameRoot) continue;
      const distance = pointDistanceMm(group.anchor, entry.point);
      if (distance <= toleranceMm && distance < selectedDistance) {
        selected = group;
        selectedDistance = distance;
      }
    }
    if (!selected) {
      selected = {
        id: `DTXR-G${groups.length + 1}`,
        branch: entry.branch,
        anchor: entry.point,
        anchorJsonNodeNo: entry.jsonNodeNo,
        entries: [],
      };
      groups.push(selected);
    }
    selected.entries.push(entry);
  }
  return groups.map((group) => ({
    ...group,
    jsonNodeNos: uniqueValues(group.entries.map((entry) => entry.jsonNodeNo)),
    maxInternalDistanceMm: Math.max(0, ...group.entries.map((entry) => pointDistanceMm(group.anchor, entry.point))),
  }));
}

