import { SUPPORT_KINDS } from './SupportKindResolver.js';

export function toText(value) {
  if (value === undefined || value === null) return '';
  return String(value);
}

export function toFiniteNumber(value, fallback = null) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function parseNumericMm(value) {
  const text = toText(value).replace(/mm/gi, ' ').trim();
  if (!text) return null;
  const match = text.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const numeric = Number(match[0]);
  return Number.isFinite(numeric) ? numeric : null;
}

export function parseGapValue(value) {
  const numeric = parseNumericMm(value);
  return Number.isFinite(numeric) ? String(numeric) : '';
}

export function normalizeCoordinatePoint(point) {
  if (point === undefined || point === null || point === '') return null;

  if (Array.isArray(point) && point.length >= 3) {
    const x = Number(point[0]);
    const y = Number(point[1]);
    const z = Number(point[2]);
    return [x, y, z].every(Number.isFinite) ? { x, y, z } : null;
  }

  if (typeof point === 'object') {
    const x = Number(point.x ?? point.X);
    const y = Number(point.y ?? point.Y);
    const z = Number(point.z ?? point.Z);
    return [x, y, z].every(Number.isFinite) ? { x, y, z } : null;
  }

  const text = toText(point).trim();
  if (!text) return null;

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

export function normalizeDirectionVector(value) {
  if (!value) return null;
  const x = Number(value.x ?? value.X ?? value[0]);
  const y = Number(value.y ?? value.Y ?? value[1]);
  const z = Number(value.z ?? value.Z ?? value[2]);
  if (![x, y, z].every(Number.isFinite)) return null;
  const length = Math.sqrt((x * x) + (y * y) + (z * z));
  if (length <= 1e-9) return null;
  return { x: x / length, y: y / length, z: z / length };
}

export function parseDirectionVectorText(value) {
  const nums = toText(value).match(/[-+]?\d*\.?\d+(?:[Ee][-+]?\d+)?/g)?.map(Number).filter(Number.isFinite) || [];
  return nums.length >= 3 ? normalizeDirectionVector({ x: nums[0], y: nums[1], z: nums[2] }) : null;
}

export function xmlPositionKey(positionText, tolerance) {
  const point = normalizeCoordinatePoint(positionText);
  if (!point) return '';
  const tol = toFiniteNumber(tolerance, 1) || 1;
  return [point.x, point.y, point.z]
    .map((value) => Math.round(value / tol))
    .join('|');
}

export function walkStagedComponents(value, branchName = '', out = [], path = '$') {
  if (Array.isArray(value)) {
    value.forEach((item,index) => walkStagedComponents(item, branchName, out,`${path}[${index}]`));
    return out;
  }
  if (!value || typeof value !== 'object') return out;
  const attrs = value.attributes && typeof value.attributes === 'object' ? value.attributes : {};
  const type = toText(value.type || attrs.TYPE).toUpperCase();
  const currentBranch = (type === 'BRANCH' || Array.isArray(value.children))
    ? toText(value.name || attrs.NAME || branchName)
    : branchName;
  out.push({ component: value, attrs, branchName: currentBranch, path });
  if (Array.isArray(value.children)) value.children.forEach((child,index) => walkStagedComponents(child, currentBranch, out,`${path}.children[${index}]`));
  return out;
}

export function normalizeSupportTag(value) {
  const text = toText(value).trim().toUpperCase().replace(/^\/+/, '').replace(/\s+/g, ' ');
  const match = text.match(/PS-\d+(?:\.\d+)?/i);
  return match ? match[0].toUpperCase() : '';
}

export function supportTagBase(value) {
  return normalizeSupportTag(value).replace(/\.\d+$/, '');
}

function supportTagsFromText(value) {
  const tags = new Set();
  for (const match of toText(value).matchAll(/\/?PS-\d+(?:\.\d+)?/ig)) {
    const tag = normalizeSupportTag(match[0]);
    if (tag) tags.add(tag);
  }
  return [...tags];
}

export function supportTagsFromAttrs(attrs, componentName = '') {
  const tags = new Set(supportTagsFromText(componentName));
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value && typeof value === 'object') continue;
    for (const tag of supportTagsFromText(`${key} ${value}`)) tags.add(tag);
  }
  return [...tags];
}

function dtxrPositionOffset(config = {}) {
  const option = config?.dtxrPositionOffset || {};
  return {
    enabled: option.enabled === true,
    xOffset: toFiniteNumber(option.xOffset, 0),
    yOffset: toFiniteNumber(option.yOffset, 0),
    zOffset: toFiniteNumber(option.zOffset, 0),
  };
}

export function applyDtxrPositionOffset(point, config = {}) {
  if (!point) return null;
  const option = dtxrPositionOffset(config);
  if (!option.enabled) return point;
  return { x: point.x + option.xOffset, y: point.y + option.yOffset, z: point.z + option.zOffset };
}

export function pointWithOffset(point, offset) {
  if (!point || !offset) return null;
  return { x: point.x + offset.x, y: point.y + offset.y, z: point.z + offset.z };
}

export function attrsWithoutGeneratedSupportKind(attrs = {}) {
  const stripped = {};
  for (const [key, value] of Object.entries(attrs || {})) {
    const normalized = toText(key).toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (['SUPPORTKIND', 'SUPPORTMAPPERKIND', 'SUPPORTTYPE'].includes(normalized)) continue;
    stripped[key] = value;
  }
  return stripped;
}

export function normalizeSupportKind(value) {
  const kind = toText(value).toUpperCase().replace(/\s+/g, '');
  return SUPPORT_KINDS.includes(kind) ? kind : '';
}
