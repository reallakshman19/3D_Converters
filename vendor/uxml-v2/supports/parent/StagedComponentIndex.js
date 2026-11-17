function toText(value) {
  return value === undefined || value === null ? '' : String(value);
}

function toFiniteNumber(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function parseNumericMm(value) {
  const match = toText(value).replace(/mm/gi, ' ').match(/-?\d+(?:\.\d+)?/);
  const numeric = match ? Number(match[0]) : NaN;
  return Number.isFinite(numeric) ? numeric : null;
}
function normalizePoint(point) {
  if (point === undefined || point === null || point === '') return null;
  if (Array.isArray(point) && point.length >= 3) {
    const x = Number(point[0]);
    const y = Number(point[1]);
    const z = Number(point[2]);
    return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z) ? { x, y, z } : null;
  }
  if (typeof point === 'object') {
    const x = Number(point.x ?? point.X);
    const y = Number(point.y ?? point.Y);
    const z = Number(point.z ?? point.Z);
    return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z) ? { x, y, z } : null;
  }
  const text = toText(point).trim();
  const tokens = text.split(/\s+/g);
  const directional = { x: 0, y: 0, z: 0 };
  let parsedDirectional = false;
  for (let i = 0; i < tokens.length - 1; i += 2) {
    const axis = tokens[i].toUpperCase();
    const value = parseNumericMm(tokens[i + 1]);
    if (!Number.isFinite(value)) continue;
    if (axis === 'E') { directional.x = value; parsedDirectional = true; }
    else if (axis === 'W') { directional.x = -value; parsedDirectional = true; }
    else if (axis === 'N') { directional.y = value; parsedDirectional = true; }
    else if (axis === 'S') { directional.y = -value; parsedDirectional = true; }
    else if (axis === 'U') { directional.z = value; parsedDirectional = true; }
    else if (axis === 'D') { directional.z = -value; parsedDirectional = true; }
  }
  if (parsedDirectional) return directional;
  const values = text.match(/-?\d+(?:\.\d+)?/g)?.map(Number).filter(Number.isFinite) || [];
  return values.length >= 3 ? { x: values[0], y: values[1], z: values[2] } : null;
}

function xmlPositionKey(positionText, tolerance) {
  const point = normalizePoint(positionText);
  if (!point) return '';
  const tol = toFiniteNumber(tolerance, 1) || 1;
  return [point.x, point.y, point.z].map((value) => Math.round(value / tol)).join('|');
}

export function normalizeSupportTag(value) {
  const text = toText(value).trim().toUpperCase().replace(/^\/+/, '').replace(/\s+/g, ' ');
  const match = text.match(/PS-\d+(?:\.\d+)?/i);
  return match ? match[0].toUpperCase() : '';
}

function supportTagsFromText(value) {
  const tags = new Set();
  for (const match of toText(value).matchAll(/\/?PS-\d+(?:\.\d+)?/ig)) {
    const tag = normalizeSupportTag(match[0]);
    if (tag) tags.add(tag);
  }
  return [...tags];
}

function supportTagsFromAttrs(attrs, componentName = '') {
  const tags = new Set(supportTagsFromText(componentName));
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value && typeof value === 'object') continue;
    for (const tag of supportTagsFromText(`${key} ${value}`)) tags.add(tag);
  }
  return [...tags];
}

function walkStagedComponents(value, branchName = '', out = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => walkStagedComponents(item, branchName, out));
    return out;
  }
  if (!value || typeof value !== 'object') return out;
  const attrs = value.attributes && typeof value.attributes === 'object' ? value.attributes : {};
  const type = toText(value.type || attrs.TYPE).toUpperCase();
  const currentBranch = type === 'BRANCH' || Array.isArray(value.children) ? toText(value.name || attrs.NAME || attrs.OWNER || branchName) : branchName;
  out.push({ component: value, attrs, branchName: currentBranch });
  if (Array.isArray(value.children)) value.children.forEach((child) => walkStagedComponents(child, currentBranch, out));
  return out;
}

export function buildStagedComponentIndex(stagedJsonText, config = {}) {
  const empty = { byCoord: new Map(), byTag: new Map(), count: 0 };
  if (!toText(stagedJsonText).trim()) return empty;
  let parsed = null;
  try { parsed = JSON.parse(stagedJsonText); } catch { return empty; }
  const byCoord = new Map();
  const byTag = new Map();
  let count = 0;
  for (const entry of walkStagedComponents(parsed)) {
    const attrs = entry.attrs || {};
    let point = null;
    for (const key of ['SUPPORTCOORD', 'POS', 'BPOS', 'APOS', 'LPOS', 'CPOS', 'HPOS', 'TPOS']) {
      point = normalizePoint(attrs[key]);
      if (point) break;
    }
    const indexed = { ...entry, point };
    if (point) {
      const key = xmlPositionKey(`${point.x} ${point.y} ${point.z}`, toFiniteNumber(config.coordinateTolerance, 1));
      if (key) {
        if (!byCoord.has(key)) byCoord.set(key, []);
        byCoord.get(key).push(indexed);
      }
    }
    for (const tag of supportTagsFromAttrs(attrs, entry.component?.name || '')) {
      if (!byTag.has(tag)) byTag.set(tag, []);
      byTag.get(tag).push(indexed);
    }
    count += 1;
  }
  return { byCoord, byTag, count };
}
