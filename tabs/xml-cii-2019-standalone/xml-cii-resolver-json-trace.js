import { detectXmlCiiWorkflowSourceKind } from './xml-cii-workflow-source-detect.js';

const PREVIEW_LIMIT = 25;

export function createDefaultResolverJsonTraceConfig() {
  return {
    nodeAliases: ['node', 'nodeKey', 'NODE', 'Node', 'FROM_NODE', 'TO_NODE'],
    psAliases: ['ps', 'PS', 'DTXR_PS', 'supportPs', 'psNo'],
    posAliases: ['DTXR_POS', 'POSI', 'POS', 'APOS', 'LPOS', 'BPOS', 'HPOS', 'TPOS', 'SPOS', 'EPOS', 'SUPPORTCOORD'],
    coordinateTolerance: 6.0,
  };
}

function text(value) { return String(value ?? '').trim(); }
function safeObject(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
function norm(value) { return text(value).toUpperCase().replace(/\s+/g, '').replace(/[()]/g, ''); }
function decodeXml(value) {
  return String(value ?? '').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
}

// ── Coordinate helpers (mirrors normalizePoint in dtxr-resolver.js) ──────────

function parseNumericMm(value) {
  const t = String(value ?? '').replace(/mm/gi, ' ').trim();
  const m = t.match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

function normalizePoint(raw) {
  if (raw === null || raw === undefined) return null;
  // Object form: {x, y, z} or {X, Y, Z} (from parsed JSON)
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const x = Number(raw.x ?? raw.X ?? raw.E ?? raw.east ?? '');
    const y = Number(raw.y ?? raw.Y ?? raw.N ?? raw.north ?? '');
    const z = Number(raw.z ?? raw.Z ?? raw.U ?? raw.elev ?? raw.elevation ?? '');
    return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z) ? { x, y, z } : null;
  }
  // Array form: [x, y, z]
  if (Array.isArray(raw)) {
    const nums = raw.map(Number).filter(Number.isFinite);
    return nums.length >= 3 ? { x: nums[0], y: nums[1], z: nums[2] } : null;
  }
  const str = text(raw);
  if (!str) return null;
  // Try directional pairs: "E 100mm N 200mm U 300mm"
  const tokens = str.split(/\s+/g);
  const d = { x: null, y: null, z: null };
  let foundDir = false;
  for (let i = 0; i < tokens.length - 1; i += 2) {
    const axis = tokens[i].replace(/[:=]/g, '').toUpperCase();
    const val = parseNumericMm(tokens[i + 1]);
    if (!Number.isFinite(val)) continue;
    if (axis === 'E') { d.x = val; foundDir = true; }
    else if (axis === 'W') { d.x = -val; foundDir = true; }
    else if (axis === 'N') { d.y = val; foundDir = true; }
    else if (axis === 'S') { d.y = -val; foundDir = true; }
    else if (axis === 'U') { d.z = val; foundDir = true; }
    else if (axis === 'D') { d.z = -val; foundDir = true; }
  }
  if (foundDir && (d.x !== null || d.y !== null || d.z !== null)) {
    return { x: d.x ?? 0, y: d.y ?? 0, z: d.z ?? 0 };
  }
  // Fallback: extract all numbers from string (handles "593473.15 -1122803.20 103209.55")
  const nums = str.match(/-?\d+(?:\.\d+)?(?:[Ee][+-]?\d+)?/g)?.map(Number).filter(Number.isFinite) || [];
  return nums.length >= 3 ? { x: nums[0], y: nums[1], z: nums[2] } : null;
}

function pointDist(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function pointLabel(p) {
  const fmt = (v) => String(Math.round(v * 100) / 100);
  return `E=${fmt(p.x)} N=${fmt(p.y)} EL=${fmt(p.z)}`;
}

function applyConfiguredPosiOffset(point, config) {
  const option = safeObject(config?.dtxrPositionOffset);
  if (!point || option.enabled !== true) return point;
  return {
    x: point.x + (Number(option.xOffset) || 0),
    y: point.y + (Number(option.yOffset) || 0),
    z: point.z + (Number(option.zOffset) || 0),
  };
}

// ── Staged JSON: walk all components and build position → DTXR index ─────────

function branchIndexKey(value) {
  return decodeXml(text(value)).replace(/\s+/g, '').toUpperCase();
}

function offsetBucketKey(offset, precision) {
  return [offset.x, offset.y, offset.z].map((value) => Math.round(value / precision)).join('|');
}

function inferJsonPositionOffset(nodes, entries, precision = 0.1, minVotes = 2) {
  const byBranch = new Map();
  for (const entry of entries) {
    const key = branchIndexKey(entry.branchName);
    if (!entry.point || !key) continue;
    if (!byBranch.has(key)) byBranch.set(key, []);
    byBranch.get(key).push(entry);
  }

  const buckets = new Map();
  for (const node of nodes) {
    const candidates = byBranch.get(branchIndexKey(node.branchName)) || [];
    if (!node.posPoint || !candidates.length) continue;
    for (const entry of candidates) {
      const offset = {
        x: node.posPoint.x - entry.point.x,
        y: node.posPoint.y - entry.point.y,
        z: node.posPoint.z - entry.point.z,
      };
      const key = offsetBucketKey(offset, precision);
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

function applyInferredPositionOffset(positionIndex, offset) {
  const byCoordKey = new Map();
  const entries = positionIndex.entries.map((entry) => {
    if (!entry.point) return entry;
    const point = { x: entry.point.x + offset.x, y: entry.point.y + offset.y, z: entry.point.z + offset.z };
    const next = { ...entry, point };
    const key = coordKey(point);
    if (!byCoordKey.has(key)) byCoordKey.set(key, []);
    byCoordKey.get(key).push(next);
    return next;
  });
  return { ...positionIndex, entries, byCoordKey };
}

function autoCalibratePositionIndex(nodes, positionIndex, config) {
  if (safeObject(config?.dtxrPositionOffset).enabled === true) {
    return { positionIndex, calibration: null };
  }
  const offset = inferJsonPositionOffset(nodes, positionIndex.entries);
  if (!offset) return { positionIndex, calibration: null };
  return { positionIndex: applyInferredPositionOffset(positionIndex, offset), calibration: offset };
}

function walkStagedComponents(value, branchName = '', bore = '', out = [], _path = '$') {
  if (Array.isArray(value)) {
    value.forEach((item, idx) => walkStagedComponents(item, branchName, bore, out, `${_path}[${idx}]`));
    return out;
  }
  if (!value || typeof value !== 'object') return out;
  const attrs = value.attributes && typeof value.attributes === 'object' ? value.attributes : {};
  const type = text(value.type || attrs.TYPE || '').toUpperCase();
  const name = text(value.name || attrs.NAME || attrs.OWNER || '');
  const currentBranch = (type === 'BRANCH' || Array.isArray(value.children))
    ? (name || branchName) : branchName;
  const boreVal = text(attrs.ABORE || attrs.LBORE || attrs.HBORE || attrs.BORE || value.bore || bore || '');
  const currentBore = boreVal || bore;
  out.push({ component: value, attrs, branchName: currentBranch, bore: currentBore, type, _path });
  if (Array.isArray(value.children)) {
    value.children.forEach((child, idx) =>
      walkStagedComponents(child, currentBranch, currentBore, out, `${_path}.children[${idx}]`));
  }
  return out;
}

function stagedAttrPick(attrs, names) {
  for (const wanted of names) {
    const upper = wanted.toUpperCase();
    for (const [key, value] of Object.entries(attrs)) {
      if (key.toUpperCase() === upper && text(value)) return text(value);
    }
  }
  return '';
}

function stagedDtxr(entry) {
  const a = entry.attrs || {};
  return text(a.DTXR_POS || a.DTXR || a.DESC || a.DESCRIPTION || a.NAME || entry.component?.name || '');
}

function stagedDtxrPs(entry) {
  return stagedAttrPick(entry.attrs || {}, ['DTXR_PS', 'DTXRPS', 'DTXR', 'DESC', 'DESCRIPTION']);
}

/**
 * Mirrors buildStagedDtxrPositionIndex from dtxr-resolver.js.
 * Returns { entries[], byCoordKey Map, count }.
 * Each entry: { dtxr, dtxrPs, cmpSupGap, point, branchName, bore, _path }
 */
function buildJsonPositionIndex(stagedJsonText, config, tolerance) {
  const empty = { entries: [], byCoordKey: new Map(), byNodeKey: new Map(), byPsKey: new Map(), count: 0 };
  if (!text(stagedJsonText)) return empty;
  let parsed;
  try { parsed = JSON.parse(stagedJsonText); } catch { return empty; }
  const entries = [];
  const byCoordKey = new Map();
  const byNodeKey = new Map();
  const byPsKey = new Map();
  for (const item of walkStagedComponents(parsed)) {
    const attrs = item.attrs || {};
    const dtxr = stagedDtxr(item);
    const dtxrPs = stagedDtxrPs(item);
    const cmpSupGap = stagedAttrPick(attrs, ['CMPSUPGAP']);
    if (!dtxr && !dtxrPs && !cmpSupGap) continue;
    // Try every POS alias - value can be a string OR an {x,y,z} object
    let point = null;
    for (const alias of config.posAliases) {
      // Case-insensitive key search
      let rawVal = null;
      for (const [k, v] of Object.entries(attrs)) {
        if (k.toUpperCase() === alias.toUpperCase()) { rawVal = v; break; }
      }
      if (rawVal !== null && rawVal !== undefined) {
        point = normalizePoint(rawVal);
        if (point && alias.toUpperCase() === 'POSI') point = applyConfiguredPosiOffset(point, config);
        if (point) break;
      }
    }
    const nodeKey = stagedAttrPick(attrs, config.nodeAliases);
    const psKey = stagedAttrPick(attrs, config.psAliases);
    
    if (!point && !nodeKey && !psKey) continue;
    
    const indexed = { dtxr, dtxrPs, cmpSupGap, point, nodeKey, psKey, branchName: item.branchName, bore: item.bore, _path: item._path, raw: item.component };
    entries.push(indexed);
    
    if (point) {
      const key = coordKey(point);
      if (!byCoordKey.has(key)) byCoordKey.set(key, []);
      byCoordKey.get(key).push(indexed);
    }
    if (nodeKey) {
      const k = norm(nodeKey);
      if (!byNodeKey.has(k)) byNodeKey.set(k, []);
      byNodeKey.get(k).push(indexed);
    }
    if (psKey) {
      const k = norm(psKey);
      if (!byPsKey.has(k)) byPsKey.set(k, []);
      byPsKey.get(k).push(indexed);
    }
  }
  return { entries, byCoordKey, byNodeKey, byPsKey, count: entries.length };
}

function coordKey(point, precision = 1) {
  return [point.x, point.y, point.z].map(v => Math.round(v / precision)).join('|');
}

/**
 * For a given XML node Position point, find all staged JSON entries within tolerance.
 * Mirrors xmlCiiDtxrPosForNode from dtxr-resolver.js.
 */
function findMatchingEntriesJson(row, positionIndex, tolerance = 2.0) {
  if (positionIndex.count <= 0) return [];
  const hits = [];

  for (const nk of row.nodeKeys) {
    const jsonEntries = positionIndex.byNodeKey.get(norm(nk)) || [];
    for (const e of jsonEntries) hits.push({ entry: e, matchedBy: 'node' });
  }

  const jsonPsEntries = positionIndex.byPsKey.get(norm(row.psKey)) || [];
  for (const e of jsonPsEntries) hits.push({ entry: e, matchedBy: 'ps' });

  if (row.posPoint) {
    const key = coordKey(row.posPoint);
    const exact = positionIndex.byCoordKey.get(key) || [];
    if (exact.length) {
      for (const e of exact) hits.push({ entry: e, matchedBy: 'pos' });
    } else {
      const close = positionIndex.entries.filter(e => e.point && pointDist(e.point, row.posPoint) <= tolerance);
      for (const e of close) hits.push({ entry: e, matchedBy: 'pos' });
    }
  }

  const uniqueMap = new Map();
  for (const hit of hits) {
    const existing = uniqueMap.get(hit.entry);
    if (existing) {
      if (!existing.includes(hit.matchedBy)) existing.push(hit.matchedBy);
    } else {
      uniqueMap.set(hit.entry, [hit.matchedBy]);
    }
  }

  return Array.from(uniqueMap.entries()).map(([entry, matchedByArray]) => ({
    entry,
    matchedBy: matchedByArray
  }));
}

// ── XML parsing helpers ───────────────────────────────────────────────────────

function attrsFromTag(tag) {
  const attrs = {};
  String(tag || '').replace(/([A-Za-z_][\w:.-]*)\s*=\s*["']([^"']*)['"]/g, (_, key, value) => {
    attrs[key] = decodeXml(value);
    return '';
  });
  return attrs;
}

function tagName(tag) {
  const match = String(tag || '').match(/^<\s*\/?s*(?:[A-Za-z_][\w.-]*:)?([A-Za-z_][\w.-]*)/);
  return match?.[1] || '';
}

function xmlTags(sourceText) {
  return [...String(sourceText || '').matchAll(/<\s*(?!\/|\?|!)(?:[A-Za-z_][\w.-]*:)?[A-Za-z_][\w.-]*\b[^>]*>/g)];
}

function nodeKeys(attrs) {
  return ['NODE', 'Node', 'node', 'FROM_NODE', 'TO_NODE', 'FromNode', 'ToNode']
    .map(key => text(attrs[key])).filter(Boolean);
}

function firstAttr(attrs, keys) {
  for (const key of keys) if (text(attrs[key])) return text(attrs[key]);
  return '';
}

function findXmlBranchPositions(sourceText) {
  const matches = [];
  const re = /<(Branchname|LineNo|LineKey|BranchName)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;
  while ((match = re.exec(sourceText))) matches.push({ name: match[2].trim(), index: match.index });
  return matches;
}

function findActiveBranch(nodeCharIndex, branchPositions) {
  let activeBranch = 'Unassigned branch';
  let maxIdx = -1;
  for (const b of branchPositions) {
    if (b.index < nodeCharIndex && b.index > maxIdx) { activeBranch = b.name; maxIdx = b.index; }
  }
  if (activeBranch === 'Unassigned branch' && branchPositions.length) activeBranch = branchPositions[0].name;
  return activeBranch;
}

// ── Build XML resolver index ──────────────────────────────────────────────────

export function buildStandaloneXmlResolverIndex(sourceText) {
  const nodeIndex = {};
  const psIndex = {};
  const posIndex = {};
  const branchPositions = findXmlBranchPositions(sourceText);
  const nodes = [];
  let xmlIndex = 1;

  // Primary: <Node>…</Node> blocks (PSI116 Aveva XML)
  const nodeBlockRe = /<Node\b[^>]*>([\s\S]*?)<\/Node>/gi;
  let blockMatch;
  while ((blockMatch = nodeBlockRe.exec(sourceText))) {
    const body = blockMatch[1];
    const charIndex = blockMatch.index;
    const getTag = (tag) => {
      const m = body.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
      return m ? m[1].trim() : '';
    };
    const posRaw = getTag('Position') || getTag('DTXR_POS') || getTag('DtxrPos') || '';
    const posPoint = normalizePoint(posRaw);
    const posKey = posPoint ? pointLabel(posPoint) : posRaw;
    const psKey = getTag('DTXR_PS') || getTag('DtxrPs') || getTag('NodeName') || getTag('ComponentRefNo') || '';
    const nodeKeysList = [getTag('NodeNumber')].filter(Boolean);
    const row = {
      xmlIndex: xmlIndex++, tagName: 'Node', nodeKeys: nodeKeysList,
      psKey, posKey, posPoint: posPoint || null,
      branchName: findActiveBranch(charIndex, branchPositions)
    };
    nodes.push(row);
    for (const k of row.nodeKeys) { const id = norm(k); if (id) { if (!nodeIndex[id]) nodeIndex[id] = []; nodeIndex[id].push(row); } }
    const psId = norm(psKey); if (psId) { if (!psIndex[psId]) psIndex[psId] = []; psIndex[psId].push(row); }
    const posId = norm(posKey); if (posId) { if (!posIndex[posId]) posIndex[posId] = []; posIndex[posId].push(row); }
  }

  // Fallback: attribute-based tags (InputXML style)
  if (nodes.length === 0) {
    xmlTags(sourceText).forEach((match, idx) => {
      const attrs = attrsFromTag(match[0]);
      const posRaw = firstAttr(attrs, ['DTXR_POS', 'POS', 'Pos', 'position', 'Position']);
      const posPoint = normalizePoint(posRaw) || (attrs.X && attrs.Y && attrs.Z ? { x: Number(attrs.X), y: Number(attrs.Y), z: Number(attrs.Z) } : null);
      const posKey = posPoint ? pointLabel(posPoint) : posRaw;
      const row = {
        xmlIndex: xmlIndex++, tagName: tagName(match[0]), attrs,
        nodeKeys: nodeKeys(attrs),
        psKey: firstAttr(attrs, ['DTXR_PS', 'PS', 'Ps', 'supportPs', 'psNo']),
        posKey, posPoint: posPoint || null,
        branchName: findActiveBranch(match.index, branchPositions)
      };
      if (row.nodeKeys.length || row.psKey || row.posKey) {
        nodes.push(row);
        for (const k of row.nodeKeys) { const id = norm(k); if (id) { if (!nodeIndex[id]) nodeIndex[id] = []; nodeIndex[id].push(row); } }
        const psId = norm(row.psKey); if (psId) { if (!psIndex[psId]) psIndex[psId] = []; psIndex[psId].push(row); }
        const pid = norm(posKey); if (pid) { if (!posIndex[pid]) posIndex[pid] = []; posIndex[pid].push(row); }
      }
    });
  }

  return { nodes, nodeIndex, psIndex, posIndex, indexStats: { xmlNodeCount: nodes.length, nodeKeyCount: Object.keys(nodeIndex).length, psKeyCount: Object.keys(psIndex).length, posKeyCount: Object.keys(posIndex).length } };
}

// ── Resolve: for each XML node, find matching JSON entries by position ────────

/**
 * Main resolver: mirrors the dtxr-resolver direction.
 * For each XML node with a <Position>, look up staged JSON components by POSI coordinate.
 * Returns resolvedFacts shaped for the UI table.
 */
function resolveNodesFromPositionIndex(nodes, positionIndex, tolerance) {
  const matchedFacts = [];
  const rejectedFacts = [];

  for (const node of nodes) {
    const matchedEntries = findMatchingEntriesJson(node, positionIndex, tolerance);

    if (matchedEntries.length === 0) {
      rejectedFacts.push({
        ...node,
        matchedBy: [],
        hitCount: 0,
        xmlHits: [],
        stagedBranchKey: '',
        stagedBore: '',
        dtxrPosValue: '',
        dtxrPsValue: '',
        cmpSupGap: '',
      });
      continue;
    }

    for (const match of matchedEntries) {
      const entry = match.entry;
      matchedFacts.push({
        ...node,
        matchedBy: match.matchedBy,
        hitCount: matchedEntries.length,
        xmlHits: [node.xmlIndex],
        stagedBranchKey: entry.branchName,
        stagedBore: entry.bore,
        dtxrPosValue: entry.dtxr,
        dtxrPsValue: entry.dtxrPs,
        cmpSupGap: entry.cmpSupGap,
        raw: entry.raw,
      });
    }
  }

  return [...matchedFacts, ...rejectedFacts].sort((a, b) => a.xmlIndex - b.xmlIndex);
}

// ── Config / support config helpers ──────────────────────────────────────────

function parseSupportConfig(rawJson) {
  try { return safeObject(JSON.parse(text(rawJson) || '{}')); } catch { return {}; }
}

function arrayOr(value, fallback) {
  return Array.isArray(value) && value.length ? value.map(text).filter(Boolean) : [...fallback];
}

function configFrom(input = {}) {
  const parsed = parseSupportConfig(input.supportConfigJson);
  const source = safeObject(input.jsonConfig || parsed.jsonTrace || parsed.resolverJsonTrace);
  const defaults = createDefaultResolverJsonTraceConfig();
  return {
    nodeAliases: arrayOr(source.nodeAliases, defaults.nodeAliases),
    psAliases: arrayOr(source.psAliases, defaults.psAliases),
    posAliases: arrayOr(source.posAliases, defaults.posAliases),
    coordinateTolerance: Number(source.coordinateTolerance ?? defaults.coordinateTolerance) || 2.0,
    dtxrPositionOffset: safeObject(source.dtxrPositionOffset || parsed.dtxrPositionOffset),
  };
}

function writeSupportConfig(supportConfigJson, jsonConfig) {
  const config = parseSupportConfig(supportConfigJson);
  config.jsonTrace = { ...config.jsonTrace, ...jsonConfig };
  return JSON.stringify(config, null, 2);
}

// ── Public API ────────────────────────────────────────────────────────────────

export function runStandaloneResolverJsonTrace(input = {}) {
  const sourceText = String(input.sourceText || '');
  const sourceKind = input.sourceKind === 'auto'
    ? detectXmlCiiWorkflowSourceKind(sourceText) : (input.sourceKind || 'xml');
  const jsonConfig = configFrom(input);
  if (sourceKind === 'inputxml') return inputXmlNotRequired(jsonConfig, input.supportConfigJson);

  const indexes = buildStandaloneXmlResolverIndex(sourceText);
  let positionIndex = buildJsonPositionIndex(input.stagedJsonText, jsonConfig, jsonConfig.coordinateTolerance);

  let resolvedFacts = resolveNodesFromPositionIndex(indexes.nodes, positionIndex, jsonConfig.coordinateTolerance);
  let matchedFacts = resolvedFacts.filter(f => f.hitCount > 0);
  let calibration = null;
  if (matchedFacts.length === 0) {
    const calibrated = autoCalibratePositionIndex(indexes.nodes, positionIndex, jsonConfig);
    positionIndex = calibrated.positionIndex;
    calibration = calibrated.calibration;
    if (calibration) {
      resolvedFacts = resolveNodesFromPositionIndex(indexes.nodes, positionIndex, jsonConfig.coordinateTolerance);
      matchedFacts = resolvedFacts.filter(f => f.hitCount > 0);
    }
  }
  const rejectedFacts = resolvedFacts.filter(f => f.hitCount <= 0);

  const diagnostics = [
    { type: 'resolver-json-trace-source-kind', sourceKind },
    { type: 'resolver-json-trace-index-stats', ...indexes.indexStats },
    { type: 'resolver-json-trace-position-index', count: positionIndex.count },
    { type: 'resolver-json-trace-matched-facts', rows: matchedFacts.length },
    { type: 'resolver-json-trace-rejected-facts', rows: rejectedFacts.length },
  ];
  if (calibration) {
    diagnostics.splice(3, 0, { type: 'resolver-json-trace-auto-position-offset', ...calibration });
  }

  return { ...indexes, jsonConfig, positionIndex, resolvedFacts, matchedFacts, rejectedFacts, diagnostics, supportConfigJson: writeSupportConfig(input.supportConfigJson, jsonConfig) };
}

function inputXmlNotRequired(jsonConfig, supportConfigJson) {
  return {
    indexStats: { xmlNodeCount: 0, nodeKeyCount: 0, psKeyCount: 0, posKeyCount: 0 },
    nodeIndex: {}, psIndex: {}, posIndex: {}, nodes: [], jsonConfig,
    positionIndex: { entries: [], byCoordKey: new Map(), count: 0 },
    resolvedFacts: [], matchedFacts: [], rejectedFacts: [],
    diagnostics: [{ type: 'resolver-json-trace-inputxml-not-required', sourceKind: 'inputxml' }],
    supportConfigJson: writeSupportConfig(supportConfigJson, jsonConfig),
  };
}
