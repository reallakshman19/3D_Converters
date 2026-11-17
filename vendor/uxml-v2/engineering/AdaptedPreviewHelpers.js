// Ported from 3D_Converters v045/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-dryrun-core.js lines 15-408
// (the helpers today's standalone dry-run preview calls), on PlainElements, no DOM. UI-only helpers (_esc, the DTXR wall
// candidate index) are not here: today's process parity never calls them.
import { childText, childrenByName } from '../supports/PlainDom.js';
import { computeLineNoKey, normalizeLineListRow, tokenAtPosition } from './index.js';

export const toText = (val) => (val === null || val === undefined ? '' : String(val));
export function toFiniteNumber(value, fallback) { const numeric = Number(value); return Number.isFinite(numeric) ? numeric : fallback; }
/** Today's _xmlText: trimmed text of the first child element named `name`. */
export const xmlText = (parent, name) => childText(parent, name);
export const xmlChildren = (parent, name) => childrenByName(parent, name);

export function normalizePoint(p) {
  if (!p) return null;
  const v = Array.isArray(p) ? p.map(Number) : (typeof p === 'object' ? [p.x ?? p.X, p.y ?? p.Y, p.z ?? p.Z].map(Number) : (toText(p).match(/-?\d+(?:\.\d+)?/g) || []).map(Number));
  return v.length >= 3 && v.slice(0, 3).every(Number.isFinite) ? { x: v[0], y: v[1], z: v[2] } : null;
}
export function pointDistanceMm(a, b) {
  const pa = normalizePoint(a), pb = normalizePoint(b);
  return pa && pb ? Math.sqrt((pa.x - pb.x) ** 2 + (pa.y - pb.y) ** 2 + (pa.z - pb.z) ** 2) : null;
}
export function regexGroup(txt, pat, idx = 1) {
  try { const m = new RegExp(toText(pat).trim(), 'i').exec(toText(txt)); return toText(m?.[Math.max(0, Number(idx || 0))] || '').trim(); } catch { return ''; }
}
export function rowText(row, keys) {
  if (!row || typeof row !== 'object') return '';
  for (const k of keys) { const v = toText(row[k] ?? row._raw?.[k]).trim(); if (v) return v; }
  return '';
}
export function rowNumber(row, keys) {
  const text = rowText(row, keys);
  const match = text.match(/[-+]?\d*\.?\d+/);
  const num = match ? Number(match[0]) : Number(text);
  return Number.isFinite(num) ? num : null;
}
export const uniqueKeys = (values) => [...new Set(values.map((value) => toText(value).trim()).filter(Boolean))];
const hasOwn = (obj, key) => !!obj && Object.hasOwn(obj, key);
export const overrideSource = (overrides, bucket, key) => (hasOwn(overrides?.[bucket], key) ? 'override' : 'auto');

function lineKeyRegexValue(value, pattern, groupIndex) {
  const text = toText(value).trim(), patternText = toText(pattern).trim();
  if (!text || !patternText) return text;
  return regexGroup(text, patternText, groupIndex || 1) || text;
}
export const normalizeLineKey = (value) => toText(value).trim().toUpperCase().replace(/\s+/g, '');
function lineKeyAliases(value) {
  const compact = normalizeLineKey(value);
  if (!compact) return [];
  return uniqueKeys([compact, compact.replace(/^[A-Z](?=\d{5,}$)/, '')]);
}
export function lineListRowKey(row, config) {
  const mapped = computeLineNoKey(row, config.linelist?.fieldMap || {});
  const mappedClean = normalizeLineKey(mapped);
  if (mappedClean && !/^[A-Z]$/.test(mappedClean)) return mapped;
  const mappedSeq = rowText(row, [config.linelist?.fieldMap?.lineSeqNo, 'lineSeqNo', 'Line number', 'Line Number', 'Line No']);
  if (mappedSeq) return mappedSeq;
  const key1 = rowText(row, ['lineKey1', 'Key 1', 'ColumnX1', 'Service', 'Fluid']);
  const key2 = rowText(row, ['lineKey2', 'Key 2', 'ColumnX2', 'Line number', 'Line Number', 'Line No']);
  if (key1 || key2) return `${key1}${key2}`;
  return rowText(row, ['lineKey', 'LineNo', 'Line No', 'Line Number', 'PipelineReference']);
}
export function findLineListRow(branchLineKey, config) {
  const rows = Array.isArray(config.linelist?.masterRows) ? config.linelist.masterRows : [];
  const lookupKey = normalizeLineKey(branchLineKey);
  const lookupAliases = new Set(lineKeyAliases(branchLineKey));
  const columnRegex = config.linelist?.linelistColumnRegex || '', columnGroup = config.linelist?.linelistColumnGroup || 1;
  const aliasMatches = [];
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const cleanKey = normalizeLineKey(lineKeyRegexValue(lineListRowKey(row, config), columnRegex, columnGroup));
    if (cleanKey && cleanKey === lookupKey) return { row, index };
    if (lineKeyAliases(cleanKey).some((key) => lookupAliases.has(key))) aliasMatches.push({ row, index });
  }
  return aliasMatches.length === 1 ? aliasMatches[0] : null;
}
export function rowFromTo(row, config) {
  const fieldMap = config?.linelist?.fieldMap || {};
  const from = rowText(row, [fieldMap.from, 'from', 'From', 'FROM', 'From (Origin)', 'Origin', 'FROM_EQUIP', 'From Equipment'].filter(Boolean));
  const to = rowText(row, [fieldMap.to, 'to', 'To', 'TO', 'To (Destination)', 'Destination', 'TO_EQUIP', 'To Equipment'].filter(Boolean));
  return { from, to };
}

const digitRuns = (value, minLen = 4) => (toText(value).match(new RegExp(`\\d{${minLen},}`, 'g')) || []);
function bigrams(value) {
  const s = normalizeLineKey(value), out = [];
  for (let i = 0; i < s.length - 1; i += 1) out.push(s.slice(i, i + 2));
  return out;
}
function diceSimilarity(a, b) {
  const ba = bigrams(a), bb = bigrams(b);
  if (!ba.length || !bb.length) return 0;
  const counts = new Map();
  for (const g of ba) counts.set(g, (counts.get(g) || 0) + 1);
  let hits = 0;
  for (const g of bb) { const c = counts.get(g) || 0; if (c > 0) { hits += 1; counts.set(g, c - 1); } }
  return (2 * hits) / (ba.length + bb.length);
}
function lineSeqScore(branchDigits, rowDigits) {
  let best = 0;
  for (const bd of branchDigits) for (const rd of rowDigits) {
    if (bd === rd) best = Math.max(best, 1);
    else if (bd.includes(rd) || rd.includes(bd)) best = Math.max(best, 0.85);
    else if (bd.length >= 6 && rd.length >= 6 && bd.slice(-6) === rd.slice(-6)) best = Math.max(best, 0.7);
  }
  return best;
}
export const looksLikeNpsToken = (value) => /^\s*\d+(?:\.\d+)?\s*(?:"|in|inch|nps)?\s*$/i.test(toText(value));
const numericFromSizeToken = (value) => { const n = Number(toText(value).replace(/[^0-9.+-]/g, '')); return Number.isFinite(n) ? n : null; };
export const isLikelyMaterialToken = (value) => /^(CS|SS|LTCS|DSS|SDSS|ALLOY|GI|CI|DI|PVC|CPVC|HDPE|GRP|GRE)$/i.test(toText(value).trim());
function isolateLineKeyToken(branchName, config) {
  const delimiter = config?.rating?.tokenDelimiter || config?.linelist?.tokenDelimiter || '-';
  const tokens = toText(branchName).replace(/^\/+/, '').replace(/\/B\d+$/i, '').split(delimiter).map((t) => t.trim()).filter(Boolean);
  const candidates = tokens.filter((t) => !looksLikeNpsToken(t) && !isLikelyMaterialToken(t) && /\d{4,}/.test(t));
  candidates.sort((a, b) => b.length - a.length);
  return candidates[0] || '';
}
/** Today's similar line-key fallback (line sequence number, then fuzzy key); confidence must exceed 0.55. */
export function findSimilarLineListRow(branchName, lineKey, config) {
  const rows = Array.isArray(config?.linelist?.masterRows) ? config.linelist.masterRows : [];
  if (!rows.length) return null;
  const branchDigits = digitRuns(branchName);
  const lookupKeys = uniqueKeys([lineKey, isolateLineKeyToken(branchName, config)]).filter(Boolean);
  let best = null;
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const rowKey = lineListRowKey(row, config);
    const rowSeq = rowText(row, [config?.linelist?.fieldMap?.lineSeqNo, 'lineSeqNo', 'Line number', 'Line Number', 'Line No'].filter(Boolean));
    const { from, to } = rowFromTo(row, config);
    const seqScore = lineSeqScore(branchDigits, digitRuns(`${rowSeq} ${rowKey}`));
    let keyScore = 0;
    for (const key of lookupKeys) keyScore = Math.max(keyScore, diceSimilarity(key, rowKey), diceSimilarity(key, rowSeq));
    const confidence = Math.max(seqScore, keyScore * 0.95);
    if (confidence <= (best?.confidence || 0.55)) continue;
    best = { row, index, confidence, method: seqScore >= keyScore * 0.95 ? 'similar-lineseq' : 'similar-linekey', proposedKey: toText(rowKey).trim(), from, to };
  }
  return best;
}
export function normaliseLineListMatch(match, config) {
  if (!match?.row) return null;
  return { ...normalizeLineListRow(match.row, config.linelist?.fieldMap || {}, match.index), _raw: match.row };
}

export const processDefaultValue = (config, fieldKey) => toText(config?.processDefaults?.[fieldKey]).trim();
export function resolveTemperatureRangeToMax(raw) {
  const s = toText(raw).replace(/\s+/g, ' ').trim();
  if (!s || Number.isFinite(Number(s))) return null;
  const m = s.match(/^(-?\d+(?:\.\d+)?)\s*(?:-|\/|to)\s*(-?\d+(?:\.\d+)?)$/i);
  if (m) return Math.max(Number(m[1]), Number(m[2]));
  const nums = (s.match(/\d+(?:\.\d+)?/g) || []).map(Number).filter(Number.isFinite);
  return nums.length >= 2 ? Math.max(...nums) : null;
}
export function processValue(pdOverride, row, overrideKey, rowKeys, config) {
  if (pdOverride && Object.hasOwn(pdOverride, overrideKey)) return toText(pdOverride[overrideKey]).trim();
  return rowText(row, rowKeys) || processDefaultValue(config, overrideKey);
}
export function processSource(pdOverride, row, overrideKey, rowKeys, config) {
  if (pdOverride && Object.hasOwn(pdOverride, overrideKey)) return 'override';
  return rowText(row, rowKeys) ? 'linelist' : (processDefaultValue(config, overrideKey) ? 'default' : 'none');
}

function shiftedBranchTokens(branchName, delimiter = '-') {
  return { fourth: tokenAtPosition(branchName, delimiter, 4), sixth: tokenAtPosition(branchName, delimiter, 6) };
}
export function derivePipingClassFromBranchName(branchName, config) {
  const regexValue = regexGroup(branchName, config.rating?.pipingClassRegex, config.rating?.pipingClassGroup || 1);
  if (regexValue) return regexValue;
  const delimiter = config.rating?.tokenDelimiter || config.linelist?.tokenDelimiter || '-';
  const index = Number(config.rating?.pipingClassTokenIndex || 5);
  const value = tokenAtPosition(branchName, delimiter, index);
  const shifted = shiftedBranchTokens(branchName, delimiter);
  if (index === 5 && isLikelyMaterialToken(value) && looksLikeNpsToken(shifted.fourth) && /^S\d+/i.test(shifted.sixth)) return '';
  return value;
}
export function deriveRatingFromPipingClass(pipingClass, config) {
  const text = toText(pipingClass).trim().toUpperCase();
  const pair = (Array.isArray(config.rating?.ratingSequence) ? config.rating.ratingSequence : []).find((p) => Array.isArray(p) && text.startsWith(toText(p[0]).toUpperCase()));
  return pair ? toText(pair[1]) : '';
}
const NPS_TO_DN = { '0.25': 8, '0.375': 10, '0.5': 15, '0.75': 20, '1': 25, '1.25': 32, '1.5': 40, '2': 50, '2.5': 65, '3': 80, '4': 100, '6': 150, '8': 200, '10': 250, '12': 300, '14': 350, '16': 400, '18': 450, '20': 500, '24': 600 };
function nominalDnFromNps(inches, config) {
  if (!Number.isFinite(inches)) return null;
  const map = config?.weight?.npsToDn || NPS_TO_DN;
  const mapped = Number(map[String(Number(inches))] ?? map[inches] ?? map[inches.toFixed(3)]);
  return Number.isFinite(mapped) ? mapped : inches * toFiniteNumber(config?.weight?.inchToMm, 25.4);
}
const OD_TO_DN = [[10.3,6],[13.7,8],[17.1,10],[21.3,15],[26.7,20],[33.4,25],[42.2,32],[48.3,40],[60.3,50],[73.0,65],[88.9,80],[114.3,100],[141.3,125],[168.3,150],[219.1,200],[273.0,250],[273.1,250],[323.8,300],[323.9,300],[355.6,350],[406.4,400],[457.0,450],[457.2,450],[508.0,500],[609.6,600],[610.0,600],[711.0,700],[762.0,750]];
/** Today's preview OD -> DN: the OD itself when no table entry is within tolerance. */
export function nominalDnFromOd(od) {
  if (!Number.isFinite(od)) return null;
  let best = null;
  for (const [x, y] of OD_TO_DN) { const e = Math.abs(od - x); if (!best || e < best.err) best = { od: x, dn: y, err: e }; }
  return best && best.err <= Math.max(1.5, Math.abs(best.od) * 0.006) ? best.dn : od;
}
/** First node's MaterialName, first CorrosionAllowance > 0 and first WallThickness > 0 of the branch. */
export function branchXmlFallbackFacts(branch) {
  const facts = { material: '', corrosionAllowance: undefined, wallThickness: undefined };
  for (const node of xmlChildren(branch, 'Node')) {
    if (!facts.material) facts.material = xmlText(node, 'MaterialName');
    if (facts.corrosionAllowance === undefined) { const c = Number(xmlText(node, 'CorrosionAllowance')); if (Number.isFinite(c) && c > 0) facts.corrosionAllowance = c; }
    if (facts.wallThickness === undefined) { const w = Number(xmlText(node, 'WallThickness')); if (Number.isFinite(w) && w > 0) facts.wallThickness = w; }
    if (facts.material && facts.corrosionAllowance !== undefined && facts.wallThickness !== undefined) break;
  }
  return facts;
}
export function branchBoreFromFirstUsefulNode(branch) {
  for (const n of xmlChildren(branch, 'Node')) {
    const od = Number(xmlText(n, 'OuterDiameter') || xmlText(n, 'OutsideDiameter') || xmlText(n, 'OD'));
    if (Number.isFinite(od) && od > 0) { const d = nominalDnFromOd(od); if (d && d > 0 && d !== od) return d; continue; }
    const bore = Number(xmlText(n, 'BoreMm') || xmlText(n, 'Bore'));
    if (Number.isFinite(bore) && bore > 0) return bore;
  }
  return null;
}
export function deriveBoreFromBranchName(branchName, config) {
  const regexRaw = regexGroup(branchName, config.weight?.boreRegex, config.weight?.boreGroup || 1);
  const delimiter = config.weight?.tokenDelimiter || config.linelist?.tokenDelimiter || '-';
  const index = Number(config.weight?.boreTokenIndex || 3);
  let raw = regexRaw || tokenAtPosition(branchName, delimiter, index);
  if (!looksLikeNpsToken(raw) && index === 3) {
    const shifted = shiftedBranchTokens(branchName, delimiter);
    if (looksLikeNpsToken(shifted.fourth) && /^S\d+/i.test(shifted.sixth)) raw = shifted.fourth;
  }
  return nominalDnFromNps(numericFromSizeToken(raw), config);
}
export const classKey = (row) => { const pc = toText(row?.pipingClass || row?.pipingClassDerived).toUpperCase().replace(/\s+/g, ''); return pc ? `PC:${pc}` : ''; };
export function classSizeKey(row) {
  const cls = classKey(row), bore = Number(row?.sizeMm ?? toText(row?.size).replace(/[^0-9.+-]/g, ''));
  return cls && Number.isFinite(bore) && bore > 0 ? `${cls}|DN:${Math.round(bore)}` : cls;
}
export const ratingKeys = (row, derivedKey = '') => uniqueKeys([derivedKey, classKey(row), row?.pipingClassDerived, row?.pipingClass, row?.lineKey, row?.branchName]);
function bucketText(config, bucketName, keys) {
  const bucket = config?.overrides?.[bucketName];
  if (!bucket || typeof bucket !== 'object' || Array.isArray(bucket)) return '';
  for (const key of uniqueKeys(keys)) if (hasOwn(bucket, key) && toText(bucket[key]).trim()) return toText(bucket[key]).trim();
  return '';
}
function processDataText(config, keys, fieldKey) {
  const bucket = config?.overrides?.processData;
  if (!bucket || typeof bucket !== 'object' || Array.isArray(bucket)) return '';
  for (const key of uniqueKeys(keys)) { const value = bucket[key]?.[fieldKey]; if (toText(value).trim()) return toText(value).trim(); }
  return '';
}
export const ratingOverride = (config, keys) => bucketText(config, 'rating', keys) || processDataText(config, keys, 'rating');
