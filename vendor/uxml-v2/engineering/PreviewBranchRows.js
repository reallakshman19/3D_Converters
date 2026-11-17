// Ported from 3D_Converters v045/tabs/model-converters/converters/xmltocii2019_helper/preview-renderer.js
// (xmlCiiDryRunPreview, branch rows only, and its private helpers lines 29-80): today's dry-run preview branch rows,
// which today's parent run parity writes into the XML (process block and node facts). On PlainElements, no DOM.
// Node rows (weight candidates) are not here: today's parent run parity reads only the branch rows.
import { childText, childrenByName, elementsByName, parsePlainXml } from '../supports/PlainDom.js';
import { buildStagedDtxrIndex, resolveXmlCiiNodeDtxr } from '../supports/dtxr/ResolverCore.js';
import { buildPipingClassIndex, computeLineNoKey, deriveLineKeyFromBranchName, normalizeLineListRow, resolveBranchProcessData,
  resolveLineListDensity, tokenAtPosition } from './index.js';
import { resolveXmlCiiWallThicknessFromDtxr } from './DtxrWallThickness.js';
import { buildXmlCiiStagedGeometryIndex, resolveXmlCiiStagedGeometryForNode } from './StagedGeometryIndex.js';

const toText = (val) => (val === null || val === undefined ? '' : String(val));
function toFiniteNumber(value, fallback) { const numeric = Number(value); return Number.isFinite(numeric) ? numeric : fallback; }
function regexGroup(text, pattern, groupIndex = 1) {
  const source = toText(text), patternText = toText(pattern).trim();
  if (!source || !patternText) return '';
  try { const match = new RegExp(patternText, 'i').exec(source); return toText(match?.[Math.max(0, Number(groupIndex || 0))] || '').trim(); } catch { return ''; }
}
function rowText(row, keys) {
  if (!row || typeof row !== 'object') return '';
  for (const k of keys) { const value = row[k] ?? row._raw?.[k]; if (value !== undefined && value !== null && toText(value).trim()) return toText(value).trim(); }
  return '';
}
function rowNumber(row, keys) { const text = rowText(row, keys); const match = text.match(/[-+]?\d*\.?\d+/); const num = match ? Number(match[0]) : Number(text); return Number.isFinite(num) ? num : null; }
function lineKeyRegexValue(value, pattern, groupIndex) {
  const text = toText(value).trim(); const patternText = toText(pattern).trim();
  if (!text || !patternText) return text;
  return regexGroup(text, patternText, groupIndex || 1) || text;
}
const normalizeLineKey = (value) => toText(value).trim().toUpperCase().replace(/\s+/g, '');
function lineListRowKey(row, config) {
  const mapped = computeLineNoKey(row, config.linelist?.fieldMap || {});
  if (mapped) return mapped;
  const key1 = rowText(row, ['lineKey1', 'Key 1', 'ColumnX1', 'Service', 'Fluid']);
  const key2 = rowText(row, ['lineKey2', 'Key 2', 'ColumnX2', 'Line number', 'Line Number', 'Line No']);
  if (key1 || key2) return `${key1}${key2}`;
  return rowText(row, ['lineNoKey', 'lineNo', 'lineKey', 'LineNo', 'Line No', 'Line Number', 'PipelineReference']);
}
function findLineListRow(branchLineKey, config) {
  const rows = Array.isArray(config.linelist?.masterRows) ? config.linelist.masterRows : [];
  const lookupKey = normalizeLineKey(branchLineKey);
  const columnRegex = config.linelist?.linelistColumnRegex || '';
  const columnGroup = config.linelist?.linelistColumnGroup || 1;
  for (let index = 0; index < rows.length; index += 1) {
    const cleanKey = normalizeLineKey(lineKeyRegexValue(lineListRowKey(rows[index], config), columnRegex, columnGroup));
    if (cleanKey && cleanKey === lookupKey) return { row: rows[index], index };
  }
  return null;
}
function normaliseLineListMatch(match, config) {
  if (!match?.row) return null;
  return { ...normalizeLineListRow(match.row, config.linelist?.fieldMap || {}, match.index), _raw: match.row };
}
function processDefaultValue(config, fieldKey) {
  const defaults = config?.processDefaults && typeof config.processDefaults === 'object' ? config.processDefaults : {};
  return toText(defaults[fieldKey]).trim();
}
// Max of a range like "50.478- 110", "50/110", "50 to 110"; null when the text is already a number.
function temperatureRangeToMax(raw) {
  const s = toText(raw).replace(/\s+/g, ' ').trim();
  if (!s) return null;
  if (Number.isFinite(Number(s))) return null;
  const m = s.match(/^(-?\d+(?:\.\d+)?)\s*(?:-|\/|to)\s*(-?\d+(?:\.\d+)?)$/i);
  if (m) { const a = Number(m[1]), b = Number(m[2]); if (Number.isFinite(a) && Number.isFinite(b)) return Math.max(a, b); }
  const nums = (s.match(/\d+(?:\.\d+)?/g) || []).map(Number).filter((n) => Number.isFinite(n));
  return nums.length >= 2 ? Math.max(...nums) : null;
}
const hasOwn = (obj, key) => !!obj && Object.prototype.hasOwnProperty.call(obj, key);
function processValue(pdOverride, row, overrideKey, rowKeys, config) {
  if (hasOwn(pdOverride, overrideKey)) return toText(pdOverride[overrideKey]).trim();
  const rowVal = rowText(row, rowKeys);
  return rowVal || processDefaultValue(config, overrideKey);
}
function processSource(pdOverride, row, overrideKey, rowKeys, config) {
  if (hasOwn(pdOverride, overrideKey)) return 'override';
  if (rowText(row, rowKeys)) return 'linelist';
  return processDefaultValue(config, overrideKey) ? 'default' : 'none';
}
const looksLikeNpsToken = (value) => /^\s*\d+(?:\.\d+)?\s*(?:"|in|inch|nps)?\s*$/i.test(toText(value));
function numericFromSizeToken(value) { const n = Number(toText(value).replace(/[^0-9.+-]/g, '')); return Number.isFinite(n) ? n : null; }
const isLikelyMaterialToken = (value) => /^(CS|SS|LTCS|DSS|SDSS|ALLOY|GI|CI|DI|PVC|CPVC|HDPE|GRP|GRE)$/i.test(toText(value).trim());
const shiftedTokens = (branchName, d = '-') => ({ fourth: tokenAtPosition(branchName, d, 4), sixth: tokenAtPosition(branchName, d, 6) });
function derivePipingClassFromBranchName(branchName, config) {
  const regexValue = regexGroup(branchName, config.rating?.pipingClassRegex, config.rating?.pipingClassGroup || 1);
  if (regexValue) return regexValue;
  const delimiter = config.rating?.tokenDelimiter || config.linelist?.tokenDelimiter || '-';
  const index = Number(config.rating?.pipingClassTokenIndex || 5);
  const value = tokenAtPosition(branchName, delimiter, index);
  const shifted = shiftedTokens(branchName, delimiter);
  if (index === 5 && isLikelyMaterialToken(value) && looksLikeNpsToken(shifted.fourth) && /^S\d+/i.test(shifted.sixth)) return '';
  return value;
}
function deriveRatingFromPipingClass(pipingClass, config) {
  const text = toText(pipingClass).trim().toUpperCase();
  const sequence = Array.isArray(config.rating?.ratingSequence) ? config.rating.ratingSequence : [];
  for (const pair of sequence) if (Array.isArray(pair) && pair.length >= 2 && text.startsWith(toText(pair[0]).toUpperCase())) return toText(pair[1]);
  return '';
}
function nominalDnFromNps(inches, config) {
  if (!Number.isFinite(inches)) return null;
  const map = config.weight?.npsToDn && typeof config.weight.npsToDn === 'object' ? config.weight.npsToDn : {};
  const mapped = Number(map[String(Number(inches))] ?? map[inches] ?? map[inches.toFixed(3)]);
  return Number.isFinite(mapped) ? mapped : inches * toFiniteNumber(config.weight?.inchToMm, 25.4);
}
function deriveBoreFromBranchName(branchName, config) {
  const regexRaw = regexGroup(branchName, config.weight?.boreRegex, config.weight?.boreGroup || 1);
  const delimiter = config.weight?.tokenDelimiter || config.linelist?.tokenDelimiter || '-';
  const index = Number(config.weight?.boreTokenIndex || 3);
  let raw = regexRaw || tokenAtPosition(branchName, delimiter, index);
  if (!looksLikeNpsToken(raw) && index === 3) {
    const shifted = shiftedTokens(branchName, delimiter);
    if (looksLikeNpsToken(shifted.fourth) && /^S\d+/i.test(shifted.sixth)) raw = shifted.fourth;
  }
  return nominalDnFromNps(numericFromSizeToken(raw), config);
}
// The real component bore from the staged JSON (matched by ComponentRefNo) wins over the branch-name size token.
function stagedBranchBoreMm(branch, index) {
  if (!index?.count) return null;
  for (const node of childrenByName(branch, 'Node')) { const geometry = resolveXmlCiiStagedGeometryForNode(node, index); if (geometry?.boreMm) return geometry.boreMm; }
  return null;
}
const overrideSource = (overrides, bucket, key) => (hasOwn(overrides?.[bucket], key) ? 'override' : 'auto');
const uniqueKeys = (values) => [...new Set(values.map((value) => toText(value).trim()).filter(Boolean))];
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
const ratingOverride = (config, keys) => bucketText(config, 'rating', keys) || processDataText(config, keys, 'rating');
function branchDtxrValues(branch, stagedIndex, config, root) {
  const values = [];
  for (const node of childrenByName(branch, 'Node')) {
    for (const key of ['DTXR', 'DTXR_POS', 'TEEDESC_POS', 'DTXR_PS']) { const value = childText(node, key); if (value) values.push(value); }
    const resolved = resolveXmlCiiNodeDtxr(node, stagedIndex, config, root);
    if (resolved?.value) values.push(resolved.value);
  }
  return uniqueKeys(values);
}

const KEYS = {
  p1: ['p1', 'P1', 'Pressure1', 'Design Pressure', 'DesignPressure', 'Pressure Max kPa(g)', 'Pressure Max', 'PressureMax', 'P1 / Design Pressure'],
  hydroPressure: ['hydroPressure', 'hydro_pressure', 'HydroPressure', 'Hydro Test Pressure', 'Hydrotest Pressure', 'Hydro Pressure', 'Test Pressure', 'Pressure2', 'Hydro/Test Pressure'],
  t1: ['t1', 'T1', 'Temperature1', 'Design Temp', 'Design Temperature', 'Temp Max ºC', 'Temp Max °C', 'Temp Max', 'T1 (ºC)'],
  t2: ['t2', 'T2', 'Temperature2', 'Temp. ºC', 'Temp. °C', 'Operating Temp', 'Operating Temperature', 'T2 (ºC)'],
  t3: ['t3', 'T3', 'Temperature3', 'Temp Min ºC', 'Temp Min °C', 'Temp Min', 'Minimum Temp', 'T3 (ºC)'],
};

/**
 * Today's preview branch rows for an XML (text or PlainElement root), in document order.
 * Each row holds what today's run parity writes: process values with their sources, and the branch's node facts.
 */
export function previewBranchRows(xmlOrRoot, config, stagedJsonText = '') {
  const root = typeof xmlOrRoot === 'string' ? parsePlainXml(xmlOrRoot).root : xmlOrRoot;
  const rows = [];
  const pipingClassIndex = buildPipingClassIndex(config.pipingClass?.masterRows || []);
  const stagedIndex = buildStagedDtxrIndex(stagedJsonText || '', config);
  const stagedGeometryIndex = buildXmlCiiStagedGeometryIndex(stagedJsonText || '');
  const materialMap = config.material?.mapRows || [];
  for (const branch of elementsByName(root, 'Branch')) {
    const branchName = childText(branch, 'Branchname');
    const lineKey = deriveLineKeyFromBranchName(branchName, config);
    const lineListMatch = normaliseLineListMatch(lineKey ? findLineListRow(lineKey, config) : null, config);
    const lineListClass = rowText(lineListMatch, ['pipingClass', 'Piping Class', 'PIPING_CLASS']);
    const derivedClassRaw = lineListClass || derivePipingClassFromBranchName(branchName, config);
    const boreMm = stagedBranchBoreMm(branch, stagedGeometryIndex) ?? (deriveBoreFromBranchName(branchName, config) || rowNumber(lineListMatch, ['convertedBore', 'Bore', 'DN', 'NB']));
    const ratingKeys = uniqueKeys([lineKey, branchName, derivedClassRaw]);
    const manualRating = ratingOverride(config, ratingKeys);
    const rowRating = rowText(lineListMatch, ['rating', 'Rating', 'RATING']);
    const inputRating = manualRating || rowRating || deriveRatingFromPipingClass(derivedClassRaw, config);
    const resolved = resolveBranchProcessData({ branchName, lineKey, lineRow: { ...(lineListMatch || {}), pipingClass: derivedClassRaw }, boreMm,
      componentType: 'PIPE', rating: inputRating, materialMap, pipingClassIndex, overrides: config.overrides || {}, xmlNode: null, xmlBranch: branch, config });
    const branchRating = manualRating || resolved.rating || deriveRatingFromPipingClass(resolved.pipingClass, config) || rowRating;
    const pdOverride = (lineKey && config?.overrides?.processData?.[lineKey]) || {};
    const value = (field) => processValue(pdOverride, lineListMatch, field, KEYS[field], config);
    const source = (field) => processSource(pdOverride, lineListMatch, field, KEYS[field], config);
    const temperature = (field) => { const raw = value(field); const max = temperatureRangeToMax(raw); return max !== null ? String(max) : raw; };
    const hydroPressure = value('hydroPressure');
    const densityInfo = resolveLineListDensity(lineListMatch, pdOverride);
    const density = densityInfo.value || processDefaultValue(config, 'density');
    const dtxrWall = resolveXmlCiiWallThicknessFromDtxr({ boreMm, dtxrValues: branchDtxrValues(branch, stagedIndex, config, root), config });
    // A DTXR schedule (with the real bore) wins over the piping-class wall; a manual override wins over both.
    const dtxrWallMm = Number(dtxrWall?.wallThicknessMm);
    const useDtxrWall = resolved.wallThicknessSource !== 'override' && Number.isFinite(dtxrWallMm) && dtxrWallMm > 0;
    const wallThickness = useDtxrWall ? Number(dtxrWallMm.toPrecision(6)).toString()
      : (resolved.wallThicknessMm != null ? Number(resolved.wallThicknessMm.toPrecision(6)).toString() : '');
    rows.push({
      branchName, lineKey, lineMiss: !lineListMatch, sizeMm: boreMm, pipingClass: resolved.pipingClass || '', rating: branchRating || '',
      material: resolved.material || '', materialCode: resolved.materialCode || '', wallThickness,
      corrosion: resolved.corrosionAllowanceMm != null ? String(resolved.corrosionAllowanceMm) : '',
      p1: value('p1'), p1Source: source('p1'), hydroPressure: hydroPressure || '0', hydroPressureSource: hydroPressure ? source('hydroPressure') : 'default-zero',
      t1: temperature('t1'), t1Source: source('t1'), t2: temperature('t2'), t2Source: source('t2'), t3: temperature('t3'), t3Source: source('t3'),
      density, densitySource: densityInfo.value ? densityInfo.source : (processDefaultValue(config, 'density') ? 'default' : 'none'),
      ratingSource: manualRating ? 'override' : overrideSource(config.overrides, 'rating', lineKey),
    });
  }
  return rows;
}
