export const LEDGER_SCHEMA = 'xml-cii-trace-resolution-ledger/v1';

export function text(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

export function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export function decodeEntities(value) {
  return text(value)
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&gt;/gi, '>')
    .replace(/&lt;/gi, '<')
    .replace(/&amp;/gi, '&');
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
  if (!b.full) return { compatible: true, score: 50, method: 'unscoped-source', left: a, right: b };
  if (!a.full) return { compatible: false, score: 0, method: 'missing-xml-branch', left: a, right: b };
  if (a.full === b.full) return { compatible: true, score: 100, method: 'exact', left: a, right: b };
  if (a.root && a.root === b.root) return { compatible: true, score: 95, method: 'same-root', left: a, right: b };
  const aq = a.root.replace(/["']/g, '');
  const bq = b.root.replace(/["']/g, '');
  if (aq && aq === bq) return { compatible: true, score: 92, method: 'same-root-normalized-quotes', left: a, right: b };
  return { compatible: false, score: 0, method: 'different-root', left: a, right: b };
}

export function parseStandaloneDtxrPoint(value) {
  if (value === undefined || value === null || value === '') return null;
  if (Array.isArray(value) && value.length >= 3) {
    const x = Number(value[0]);
    const y = Number(value[1]);
    const z = Number(value[2]);
    return [x, y, z].every(Number.isFinite) ? { x, y, z } : null;
  }
  if (typeof value === 'object') {
    const x = Number(value.x ?? value.X ?? value.E ?? value.east);
    const y = Number(value.y ?? value.Y ?? value.N ?? value.north);
    const z = Number(value.z ?? value.Z ?? value.U ?? value.EL ?? value.elev ?? value.elevation);
    return [x, y, z].every(Number.isFinite) ? { x, y, z } : null;
  }
  const source = text(value);
  if (!source) return null;
  const directional = {};
  source.replace(/\b(E|W|N|S|U|D|EL)\s*[:=]?\s*(-?\d+(?:\.\d+)?(?:[Ee][+-]?\d+)?)/gi, (_, axis, raw) => {
    const numeric = Number(raw);
    if (!Number.isFinite(numeric)) return '';
    const key = axis.toUpperCase();
    if (key === 'E') directional.x = numeric;
    else if (key === 'W') directional.x = -numeric;
    else if (key === 'N') directional.y = numeric;
    else if (key === 'S') directional.y = -numeric;
    else if (key === 'U' || key === 'EL') directional.z = numeric;
    else if (key === 'D') directional.z = -numeric;
    return '';
  });
  if ([directional.x, directional.y, directional.z].every(Number.isFinite)) return directional;
  const values = source.match(/-?\d+(?:\.\d+)?(?:[Ee][+-]?\d+)?/g)?.map(Number).filter(Number.isFinite) || [];
  return values.length >= 3 ? { x: values[0], y: values[1], z: values[2] } : null;
}

export function pointDistanceMm(left, right) {
  if (!left || !right) return Number.POSITIVE_INFINITY;
  return Math.hypot(left.x - right.x, left.y - right.y, left.z - right.z);
}

export function pointLabel(point) {
  if (!point) return '';
  const format = (value) => String(Math.round(value * 1000) / 1000);
  return `E=${format(point.x)} N=${format(point.y)} EL=${format(point.z)}`;
}

export function attrValue(attrs, names) {
  for (const wanted of names) {
    const upper = text(wanted).toUpperCase();
    for (const [key, value] of Object.entries(attrs || {})) {
      if (text(key).toUpperCase() === upper && text(value)) return value;
    }
  }
  return '';
}

export function normalizeSupportTag(value) {
  const match = text(value).toUpperCase().match(/\/?PS-?\d+(?:\.\d+)?/);
  return match ? match[0].replace(/^\/+/, '').replace(/^PS-/i, 'PS') : '';
}

export function supportTags(value) {
  const tags = new Set();
  for (const match of text(value).matchAll(/\/?PS-?\d+(?:\.\d+)?/ig)) {
    const tag = normalizeSupportTag(match[0]);
    if (tag) tags.add(tag);
  }
  return [...tags];
}

export function uniqueValues(values) {
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

export function toleranceFromConfig(config = {}) {
  const parsed = safeObject(config);
  const values = [
    parsed?.resolverJsonTrace?.coordinateTolerance,
    parsed?.jsonTrace?.coordinateTolerance,
    parsed?.dtxrCoordinateToleranceMm,
    parsed?.coordinateTolerance,
    parsed?.dtxrPositionOffset?.tolerance,
  ].map(Number).filter((value) => Number.isFinite(value) && value > 0);
  return values.length ? values[0] : 6;
}

export function configuredPositionOffset(config = {}) {
  const option = safeObject(config?.dtxrPositionOffset);
  if (option.enabled !== true) return null;
  return {
    x: Number(option.xOffset) || 0,
    y: Number(option.yOffset) || 0,
    z: Number(option.zOffset) || 0,
  };
}

export function offsetPoint(point, offset) {
  if (!point || !offset) return point;
  return { x: point.x + offset.x, y: point.y + offset.y, z: point.z + offset.z };
}

