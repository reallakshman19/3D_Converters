export function cleanText(value) { return String(value ?? '').trim(); }

export function finiteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function positiveNumber(value, fallback) {
  const number = finiteNumber(value);
  return number !== null && number > 0 ? number : fallback;
}

export function nonNegativeNumber(value, fallback) {
  const number = finiteNumber(value);
  return number !== null && number >= 0 ? number : fallback;
}

export function firstText(attrs, keys) {
  for (const key of keys) {
    const value = cleanText(attrs?.[key]);
    if (value) return value;
  }
  return '';
}

export function sourceAttributes(record) {
  const attrs = record?.attrs || record?.attributes;
  return attrs && typeof attrs === 'object' && !Array.isArray(attrs) ? attrs : {};
}

export function sequenceIndexFromPath(path) {
  if (!Array.isArray(path)) return null;
  for (let index = path.length - 1; index >= 0; index -= 1) {
    const value = finiteNumber(path[index]);
    if (Number.isFinite(value)) return value;
  }
  return null;
}

export function cloneJson(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(cloneJson);
  if (typeof value !== 'object') return value;
  const out = {};
  for (const [key, nested] of Object.entries(value)) out[key] = cloneJson(nested);
  return out;
}

export function clonePoint(point) {
  return point ? { x: Number(point.x), y: Number(point.y), z: Number(point.z) } : null;
}

export function isPoint(value) {
  return value
    && Number.isFinite(Number(value.x))
    && Number.isFinite(Number(value.y))
    && Number.isFinite(Number(value.z));
}

export function round6(value) { return Math.round(Number(value) * 1e6) / 1e6; }
export function nullableRound6(value) { return Number.isFinite(value) ? round6(value) : null; }
export function nullableNumber(value, fallback) { return Number.isFinite(value) ? value : fallback; }
export function unique(values) { return [...new Set(values.filter(Boolean))]; }
