import { childText, childrenByName, textContent } from '../PlainDom.js';

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
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return null;
    return { x, y, z };
  }
  const text = String(point).trim();
  if (!text) return null;
  const tokens = text.split(/\s+/g);
  const directional = { x: 0, y: 0, z: 0 };
  let parsedDirectional = false;
  for (let i = 0; i < tokens.length - 1; i += 2) {
    const axis = tokens[i].toUpperCase();
    const val = parseNumericMm(tokens[i + 1]);
    if (!Number.isFinite(val)) continue;
    if (axis === 'E') { directional.x = val; parsedDirectional = true; }
    else if (axis === 'W') { directional.x = -val; parsedDirectional = true; }
    else if (axis === 'N') { directional.y = val; parsedDirectional = true; }
    else if (axis === 'S') { directional.y = -val; parsedDirectional = true; }
    else if (axis === 'U') { directional.z = val; parsedDirectional = true; }
    else if (axis === 'D') { directional.z = -val; parsedDirectional = true; }
  }
  if (parsedDirectional) return directional;
  const values = text.match(/-?\d+(?:\.\d+)?/g)?.map(Number).filter(Number.isFinite) || [];
  return values.length >= 3 ? { x: values[0], y: values[1], z: values[2] } : null;
}

export function xmlPositionKey(positionText, tolerance) {
  const point = normalizePoint(positionText);
  if (!point) return '';
  const tol = toFiniteNumber(tolerance, 1) || 1;
  return [point.x, point.y, point.z].map((val) => Math.round(val / tol)).join('|');
}

// Helper utilities
function toText(value) {
  if (value === undefined || value === null) return '';
  return String(value);
}

function toFiniteNumber(value, fallback) {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric;
  return fallback;
}

function parseNumericMm(value) {
  const text = toText(value).replace(/mm/gi, ' ').trim();
  if (!text) return null;
  const match = text.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const numeric = Number(match[0]);
  if (!Number.isFinite(numeric)) return null;
  return numeric;
}
export function xmlNodeSupportTags(node) {
  const parts = [childText(node, 'NodeName'), childText(node, 'ComponentRefNo')];
  for (const child of childrenByName(node, 'SupportTag')) parts.push(toText(textContent(child)));
  const tags = new Set();
  for (const text of parts) {
    for (const match of text.matchAll(/\/?PS-\d+(?:\.\d+)?/ig)) {
      const cleanTag = match[0].trim().toUpperCase().replace(/^\/+/, '');
      if (cleanTag) tags.add(cleanTag);
    }
  }
  return [...tags];
}

function supportTagBase(value) {
  return toText(value).trim().toUpperCase().replace(/^\/+/, '').replace(/\.\d+$/, '');
}

export function relaxedSameDtxrPosSupportMatches(xmlSupportTags, coordMatches) {
  if (!Array.isArray(coordMatches) || !coordMatches.length) return [];
  const baseTags = new Set(xmlSupportTags.map(supportTagBase).filter(Boolean));
  if (!baseTags.size) return [];
  return coordMatches.filter((match) => {
    const stagedBaseTags = Array.isArray(match?.supportBaseTags) ? match.supportBaseTags : [];
    return stagedBaseTags.some((tag) => baseTags.has(tag));
  });
}

export function stagedSupportMatchKey(match) {
  const attrs = match?.attrs || {};
  return [
    attrs.REF,
    attrs.NAME,
    attrs.CMPSUPREFN,
    match?.component?.name,
    match?.primaryKind || match?.kind,
  ].map(toText).join('|');
}
