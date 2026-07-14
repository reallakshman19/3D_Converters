// Standalone staged-JSON DTXR enrichment
// --------------------------------------
// Builds one deterministic position-group ledger and writes the same resolved
// DTXR_POS / DTXR_PS evidence into the enriched XML used by the CII engine.
// Branch matching accepts an exact branch or a parent/root branch such as
// `/LINE` for XML child `/LINE/B3`; coordinates and PS evidence still select
// the individual XML node, preventing cross-branch propagation.

function text(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function decodeEntities(value) {
  return text(value)
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&amp;/gi, '&');
}

function localName(node) {
  return text(node?.localName || node?.nodeName).replace(/^.*:/, '');
}

function childrenByName(parent, name) {
  return [...(parent?.childNodes || parent?.children || [])]
    .filter((node) => node?.nodeType === undefined || node.nodeType === 1)
    .filter((node) => localName(node) === name);
}

function firstChild(parent, name) {
  return childrenByName(parent, name)[0] || null;
}

function childText(parent, name) {
  return text(firstChild(parent, name)?.textContent);
}

function ensureChild(document, parent, name) {
  let child = firstChild(parent, name);
  if (child) return child;
  child = parent?.namespaceURI
    ? document.createElementNS(parent.namespaceURI, name)
    : document.createElement(name);
  parent.appendChild(child);
  return child;
}

function setChildText(document, parent, name, value) {
  const clean = text(value);
  if (!clean) return false;
  const child = ensureChild(document, parent, name);
  const changed = text(child.textContent) !== clean;
  child.textContent = clean;
  return changed;
}

export function canonicalStandaloneDtxrBranch(value) {
  const full = decodeEntities(value)
    .replace(/<\/?Branchname[^>]*>/gi, '')
    .replace(/^\s*=\s*/, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\+/g, '/')
    .replace(/\/{2,}/g, '/')
    .replace(/\s+/g, '')
    .replace(/^\/*/, '/')
    .replace(/\/$/, '')
    .replace(/\/B0*(\d+)$/i, '/B$1')
    .toUpperCase();
  const root = full.replace(/\/B\d+$/i, '');
  const suffix = full.match(/\/(B\d+)$/i)?.[1]?.toUpperCase() || '';
  return { original: text(value), full, root, suffix };
}

export function standaloneDtxrBranchRelationship(left, right) {
  const a = canonicalStandaloneDtxrBranch(left);
  const b = canonicalStandaloneDtxrBranch(right);
  if (!a.full || !b.full) return { compatible: false, score: 0, method: 'missing', left: a, right: b };
  if (a.full === b.full) return { compatible: true, score: 100, method: 'exact', left: a, right: b };
  if (a.root && a.root === b.root) return { compatible: true, score: 95, method: 'same-root', left: a, right: b };
  const aq = a.root.replace(/["']/g, '');
  const bq = b.root.replace(/["']/g, '');
  if (aq && aq === bq) return { compatible: true, score: 92, method: 'same-root-normalized-quotes', left: a, right: b };
  return { compatible: false, score: 0, method: 'different-root', left: a, right: b };
}

function parsePoint(value) {
  if (value === undefined || value === null || value === '') return null;
  if (Array.isArray(value) && value.length >= 3) {
    const [x, y, z] = value.map(Number);
    return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z) ? { x, y, z } : null;
  }
  if (typeof value === 'object') {
    const x = Number(value.x ?? value.X ?? value.E ?? value.east);
    const y = Number(value.y ?? value.Y ?? value.N ?? value.north);
    const z = Number(value.z ?? value.Z ?? value.U ?? value.EL ?? value.elevation);
    return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z) ? { x, y, z } : null;
  }
  const source = text(value);
  const directional = {};
  source.replace(/\b(E|W|N|S|U|D|EL)\s*[:=]?\s*(-?\d+(?:\.\d+)?)/gi, (_, axis, raw) => {
    const numeric = Number(raw);
    if (!Number.isFinite(numeric)) return '';
    const key = axis.toUpperCase();
    if (key === 'E') directional.x = numeric;
    if (key === 'W') directional.x = -numeric;
    if (key === 'N') directional.y = numeric;
    if (key === 'S') directional.y = -numeric;
    if (key === 'U' || key === 'EL') directional.z = numeric;
    if (key === 'D') directional.z = -numeric;
    return '';
  });
  if (Number.isFinite(directional.x) && Number.isFinite(directional.y) && Number.isFinite(directional.z)) return directional;
  const values = source.match(/-?\d+(?:\.\d+)?(?:[Ee][+-]?\d+)?/g)?.map(Number).filter(Number.isFinite) || [];
  return values.length >= 3 ? { x: values[0], y: values[1], z: values[2] } : null;
}

function distanceMm(left, right) {
  if (!left || !right) return Number.POSITIVE_INFINITY;
  return Math.hypot(left.x - right.x, left.y - right.y, left.z - right.z);
}

function attrValue(attrs, names) {
  for (const wanted of names) {
    const upper = wanted.toUpperCase();
    for (const [key, value] of Object.entries(attrs || {})) {
      if (key.toUpperCase() === upper && text(value)) return value;
    }
  }
  return '';
}

function supportTags(value) {
  const tags = new Set();
  for (const match of text(value).matchAll(/\/?PS-?\d+(?:\.\d+)?/ig)) {
    const tag = match[0].replace(/^\/+/, '').replace(/^PS-/i, 'PS').toUpperCase();
    if (tag) tags.add(tag);
  }
  return [...tags];
}

function descriptionParts(value, attrs, type, hasChildren) {
  const rawDtxrPos = attrValue(attrs, ['DTXR_POS']);
  const explicitDescription = parsePoint(rawDtxrPos)
    ? text(attrValue(attrs, ['DTXR', 'DESC', 'DESCRIPTION', 'RTEXT', 'SPRE']))
    : text(rawDtxrPos || attrValue(attrs, ['DTXR', 'DESC', 'DESCRIPTION', 'RTEXT', 'SPRE']));
  const fallbackDescription = hasChildren ? '' : text(value?.name || type);
  const description = explicitDescription || fallbackDescription;
  const name = text(attrValue(attrs, ['NAME', 'NodeName', 'SupportTag']));
  const componentRef = text(attrValue(attrs, ['ComponentRefNo', 'COMPONENTREFNO', 'REF', 'RefNo']));
  const labeled = description && name && !description.toUpperCase().includes('NAME=')
    ? `${description}(NAME=${name})`
    : description;
  return { description, labeled, name, componentRef };
}

const POSITION_ALIASES = Object.freeze(['SUPPORTCOORD', 'POS', 'POSI', 'BPOS', 'APOS', 'LPOS', 'CPOS', 'HPOS', 'TPOS', 'SPOS', 'EPOS', 'DTXR_POS']);

function ownPosition(attrs, value) {
  for (const alias of POSITION_ALIASES) {
    const raw = attrValue(attrs, [alias]);
    const point = parsePoint(raw);
    if (point) return point;
  }
  return parsePoint(value?.position || value?.point || '');
}

function walkStaged(value, context, out, path) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkStaged(item, context, out, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  const attrs = value.attributes && typeof value.attributes === 'object' ? value.attributes : {};
  const type = text(value.type || attrs.TYPE).toUpperCase();
  const hasChildren = Array.isArray(value.children) && value.children.length > 0;
  const branchName = type === 'BRANCH'
    ? text(value.name || attrValue(attrs, ['OWNER', 'BRANCH', 'PIPE']) || context.branchName)
    : context.branchName;
  const directPoint = ownPosition(attrs, value);
  const point = directPoint || context.point || null;
  const parts = descriptionParts(value, attrs, type, hasChildren);
  const tags = supportTags([parts.name, parts.description, parts.labeled].join(' '));
  const cmpSupGap = text(attrValue(attrs, ['CMPSUPGAP', 'SUPPORT GAP']));
  const isBranchContainer = type === 'BRANCH';
  const isCoordinateContainer = !!directPoint && hasChildren && !parts.description;
  if (!isBranchContainer && !isCoordinateContainer && (parts.description || cmpSupGap) && point) {
    out.push({
      branchName,
      branch: canonicalStandaloneDtxrBranch(branchName),
      point,
      type,
      description: parts.description,
      labeled: parts.labeled || parts.description,
      name: parts.name,
      componentRef: parts.componentRef,
      tags,
      cmpSupGap,
      path,
      raw: value,
    });
  }
  const next = { branchName, point };
  if (hasChildren) value.children.forEach((child, index) => walkStaged(child, next, out, `${path}.children[${index}]`));
}

export function buildStandaloneDtxrPositionGroups(stagedJsonText, toleranceMm = 6) {
  let parsed;
  try { parsed = typeof stagedJsonText === 'string' ? JSON.parse(stagedJsonText) : stagedJsonText; } catch { return []; }
  const entries = [];
  walkStaged(parsed, { branchName: '', point: null }, entries, '$');
  const groups = [];
  for (const entry of entries) {
    let selected = null;
    let selectedDistance = Number.POSITIVE_INFINITY;
    for (const group of groups) {
      if (group.branch.root !== entry.branch.root) continue;
      const distance = distanceMm(group.anchor, entry.point);
      if (distance <= toleranceMm && distance < selectedDistance) {
        selected = group;
        selectedDistance = distance;
      }
    }
    if (!selected) {
      selected = { id: `DTXR-G${groups.length + 1}`, branch: entry.branch, anchor: entry.point, entries: [] };
      groups.push(selected);
    }
    selected.entries.push(entry);
  }
  return groups.map((group) => ({
    ...group,
    maxInternalDistanceMm: Math.max(0, ...group.entries.map((entry) => distanceMm(group.anchor, entry.point))),
  }));
}

function uniqueValues(values) {
  const seen = new Set();
  const out = [];
  for (const value of values.map(text).filter(Boolean)) {
    const key = value.toUpperCase().replace(/\s+/g, ' ');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function groupCandidate(xmlBranch, xmlPoint, xmlTag, groups, toleranceMm) {
  const candidates = [];
  for (const group of groups) {
    const relationship = standaloneDtxrBranchRelationship(xmlBranch, group.branch.full);
    if (!relationship.compatible) continue;
    const distance = distanceMm(xmlPoint, group.anchor);
    if (distance > toleranceMm) continue;
    const tagMatch = xmlTag && group.entries.some((entry) => entry.tags.includes(xmlTag));
    candidates.push({ group, relationship, distance, tagMatch });
  }
  candidates.sort((a, b) => b.relationship.score - a.relationship.score
    || Number(b.tagMatch) - Number(a.tagMatch)
    || a.distance - b.distance
    || a.group.id.localeCompare(b.group.id));
  const best = candidates[0] || null;
  if (!best) return { best: null, ambiguous: false, candidates: [] };
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
    for (const entry of group.entries) if (entry.tags.includes(xmlTag)) hits.push({ group, entry, relationship });
  }
  hits.sort((a, b) => b.relationship.score - a.relationship.score || a.group.id.localeCompare(b.group.id));
  return hits.length === 1 ? hits[0] : null;
}

function resolveNode(node, branchName, groups, toleranceMm) {
  const xmlPoint = parsePoint(childText(node, 'Position'));
  const nodeName = childText(node, 'NodeName');
  const xmlTag = supportTags(nodeName)[0] || '';
  const selected = xmlPoint ? groupCandidate(branchName, xmlPoint, xmlTag, groups, toleranceMm) : { best: null, ambiguous: false, candidates: [] };
  const positional = selected.best;
  const group = positional?.group || null;
  const posValues = group ? uniqueValues(group.entries.map((entry) => entry.labeled || entry.description)) : [];
  const psEntry = group?.entries.find((entry) => xmlTag && entry.tags.includes(xmlTag)) || null;
  const fallback = !psEntry ? globalPsFallback(branchName, xmlTag, groups) : null;
  const effectivePsEntry = psEntry || fallback?.entry || null;
  const dtxrPs = effectivePsEntry?.description || '';
  return {
    nodeNumber: childText(node, 'NodeNumber'),
    nodeName,
    branchName,
    xmlPoint,
    toleranceMm,
    groupId: group?.id || fallback?.group?.id || '',
    stagedBranch: group?.branch?.original || fallback?.group?.branch?.original || '',
    branchRelationship: positional?.relationship?.method || fallback?.relationship?.method || '',
    distanceMm: positional?.distance ?? null,
    maxInternalDistanceMm: group?.maxInternalDistanceMm ?? null,
    sourcePaths: group ? group.entries.map((entry) => entry.path) : (fallback ? [fallback.entry.path] : []),
    dtxrPos: posValues.join(' | '),
    dtxrPosValues: posValues,
    dtxrPs,
    dtxrPsName: xmlTag,
    effectiveSource: posValues.length ? 'DTXR_POS' : (dtxrPs ? 'DTXR_PS_FALLBACK' : ''),
    status: selected.ambiguous ? 'POSITION_AMBIGUOUS' : (posValues.length ? 'RESOLVED_POS' : (dtxrPs ? 'RESOLVED_PS_FALLBACK' : 'UNRESOLVED')),
    candidateCount: selected.candidates?.length || 0,
  };
}

function toleranceFromConfig(config) {
  const values = [
    config?.resolverJsonTrace?.coordinateTolerance,
    config?.dtxrCoordinateToleranceMm,
    config?.coordinateTolerance,
    config?.dtxrPositionOffset?.tolerance,
  ].map(Number).filter((value) => Number.isFinite(value) && value > 0);
  return values.length ? values[0] : 6;
}

export function enrichStandaloneDtxrAnnotations(xmlText, stagedJsonText, config = {}) {
  const source = String(xmlText ?? '');
  const diagnostics = [];
  const stats = { dtxrPositionGroups: 0, dtxrPosAnnotations: 0, dtxrPsAnnotations: 0, dtxrUnresolvedNodes: 0, dtxrAmbiguousNodes: 0 };
  if (!source.trim() || !text(stagedJsonText)) return { text: source, diagnostics, stats, ledger: [] };
  if (typeof DOMParser === 'undefined' || typeof XMLSerializer === 'undefined') return { text: source, diagnostics: [{ type: 'standalone-dtxr-enrichment-skipped', reason: 'DOM unavailable' }], stats, ledger: [] };
  const toleranceMm = toleranceFromConfig(config);
  const groups = buildStandaloneDtxrPositionGroups(stagedJsonText, toleranceMm);
  stats.dtxrPositionGroups = groups.length;
  const document = new DOMParser().parseFromString(source, 'application/xml');
  if (document.querySelector?.('parsererror') || document.getElementsByTagName?.('parsererror')?.length) {
    return { text: source, diagnostics: [{ type: 'standalone-dtxr-enrichment-skipped', reason: 'XML parse failed' }], stats, ledger: [] };
  }
  const ledger = [];
  for (const branch of [...document.getElementsByTagName('Branch')]) {
    const branchName = childText(branch, 'Branchname');
    for (const node of childrenByName(branch, 'Node')) {
      const resolved = resolveNode(node, branchName, groups, toleranceMm);
      ledger.push(resolved);
      if (resolved.dtxrPos) {
        if (setChildText(document, node, 'DTXR_POS', resolved.dtxrPos)) stats.dtxrPosAnnotations += 1;
        setChildText(document, node, 'DTXR_SOURCE', 'staged-json-position-group');
      }
      if (resolved.dtxrPs) {
        if (setChildText(document, node, 'DTXR_PS', resolved.dtxrPs)) stats.dtxrPsAnnotations += 1;
        if (!resolved.dtxrPos) setChildText(document, node, 'DTXR_SOURCE', 'staged-json-ps-fallback');
      }
      if (resolved.status === 'UNRESOLVED') stats.dtxrUnresolvedNodes += 1;
      if (resolved.status === 'POSITION_AMBIGUOUS') stats.dtxrAmbiguousNodes += 1;
      if (resolved.status !== 'UNRESOLVED' || resolved.nodeName || resolved.xmlPoint) diagnostics.push({ type: 'standalone-dtxr-node-resolution', ...resolved });
    }
  }
  return { text: new XMLSerializer().serializeToString(document), diagnostics, stats, ledger };
}
