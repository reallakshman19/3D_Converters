import { elementsByName, textContent, childText, childrenByName } from '../PlainDom.js';

export function toText(value) {
  if (value === undefined || value === null) return '';
  return String(value);
}

export function toFiniteNumber(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function getXmlNodeProperty(node, name) {
  if (!node) return '';
  if (node.__el) return textContent(elementsByName(node, name)[0]).trim();
  return String(node[name] ?? node[name.toLowerCase()] ?? node[name.toUpperCase()] ?? '').trim();
}

export function normalizeSupportTag(value) {
  const text = toText(value).trim().toUpperCase().replace(/^\/+/, '').replace(/\s+/g, ' ');
  const match = text.match(/PS-\d+(?:\.\d+)?/i);
  return match ? match[0].toUpperCase() : '';
}

export function supportTagBase(value) {
  return normalizeSupportTag(value).replace(/\.\d+$/, '');
}

export function supportTagsFromText(value) {
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

export function xmlNodeSupportTags(node) {
  const parts = [];
  if (node?.__el) {
    parts.push(childText(node, 'NodeName'), childText(node, 'ComponentRefNo'));
    for (const child of childrenByName(node, 'SupportTag')) parts.push(toText(textContent(child)));
  } else {
    parts.push(getXmlNodeProperty(node, 'NodeName'), getXmlNodeProperty(node, 'ComponentRefNo'));
    const tagsVal = node?.SupportTag || node?.supportTag || '';
    if (Array.isArray(tagsVal)) parts.push(...tagsVal.map(toText));
    else if (tagsVal) parts.push(toText(tagsVal));
  }
  return [...new Set(parts.flatMap(supportTagsFromText))];
}

function parseNumericMm(value) {
  const text = toText(value).replace(/mm/gi, ' ').trim();
  if (!text) return null;
  const match = text.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const numeric = Number(match[0]);
  return Number.isFinite(numeric) ? numeric : null;
}

export function normalizePoint(point) {
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

function decodeEntities(value) {
  return toText(value).replace(/&quot;/gi, '"').replace(/&#34;/g, '"').replace(/&apos;/gi, "'").replace(/&#39;/g, "'").replace(/&amp;/gi, '&');
}

export function normalizeOwnerBranchName(value) {
  return decodeEntities(value)
    .replace(/<\/?Branchname[^>]*>/gi, '')
    .replace(/^\s*=\s*/, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\s+/g, '')
    .replace(/\/B0*(\d+)$/i, '/B$1')
    .replace(/^\/*/, '/')
    .toUpperCase();
}

export function ownerBranchVariants(value) {
  const full = normalizeOwnerBranchName(value);
  const variants = new Set();
  if (full) variants.add(full);
  if (full.endsWith('/')) variants.add(full.slice(0, -1));
  const noBranch = full.replace(/\/B\d+$/i, '');
  if (noBranch && noBranch !== full) variants.add(noBranch);
  const noQuotes = full.replace(/["']/g, '');
  if (noQuotes && noQuotes !== full) variants.add(noQuotes);
  const noQuotesNoBranch = noQuotes.replace(/\/B\d+$/i, '');
  if (noQuotesNoBranch && noQuotesNoBranch !== noQuotes) variants.add(noQuotesNoBranch);
  return [...variants].filter(Boolean);
}

export function ownerBranchSimilarity(left, right) {
  const a = ownerBranchVariants(left)[0] || '';
  const b = ownerBranchVariants(right)[0] || '';
  if (!a || !b) return 0;
  if (a === b) return 1;
  const aNoB = a.replace(/\/B\d+$/i, '');
  const bNoB = b.replace(/\/B\d+$/i, '');
  if (aNoB && aNoB === bNoB) return 0.98;
  const aNoQ = aNoB.replace(/["']/g, '');
  const bNoQ = bNoB.replace(/["']/g, '');
  if (aNoQ && aNoQ === bNoQ) return 0.95;
  const aTokens = aNoQ.split('-').filter(Boolean);
  const bTokens = new Set(bNoQ.split('-').filter(Boolean));
  if (!aTokens.length || !bTokens.size) return 0;
  const common = aTokens.filter((token) => bTokens.has(token)).length;
  return common / Math.max(aTokens.length, bTokens.size);
}

export function canonicalRoot(branchName) {
  if (!branchName) return '';
  let norm = normalizeOwnerBranchName(branchName);
  norm = norm.replace(/\/B\d+$/i, ''); // Strip trailing /B1, /B2, etc.
  norm = norm.replace(/\/+$/, ''); // Strip any leftover trailing slashes
  return norm;
}

export function euclideanDistance(a, b) {
  if (!a || !b) return Infinity;
  const dx = (a.x || 0) - (b.x || 0);
  const dy = (a.y || 0) - (b.y || 0);
  const dz = (a.z || 0) - (b.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

