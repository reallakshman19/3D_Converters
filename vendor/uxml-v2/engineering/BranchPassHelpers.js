// Ported from 3D_Converters v045/tabs/model-converters/converters/xmltocii2019_helper/enrichment-core.js
// (UXML step 4, branch pass helpers, lines 142-500): line-list lookup, process data, branch-name tokens. PlainElements.
import { childText, childrenByName, firstChild, setChildText, textContent } from '../supports/PlainDom.js';
import { toText, toFiniteNumber } from '../supports/config/EnrichmentConfig.js';
import { normalizeLineListRow } from './LineListRows.js';

export function parseNumericMm(value) {
  const text = toText(value).replace(/mm/gi, ' ').trim();
  if (!text) return null;
  const match = text.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const numeric = Number(match[0]);
  return Number.isFinite(numeric) ? numeric : null;
}

export function rowNumber(row, keys) {
  for (const key of keys) {
    const numeric = parseNumericMm(row?.[key] ?? row?._raw?.[key]);
    if (numeric !== null) return numeric;
  }
  return null;
}

export function rowText(row, keys) {
  for (const key of keys) {
    const value = row?.[key] ?? row?._raw?.[key];
    if (toText(value).trim()) return toText(value).trim();
  }
  return '';
}

/** Today's xmlElementTextMap: child element name -> trimmed text. */
export function elementTextMap(parent) {
  const out = {};
  for (const child of parent?.kids || []) if (child.__el) out[child.__el] = toText(textContent(child)).trim();
  return out;
}

/** Today's xmlEnsureChild. */
export function ensureChild(parent, name) {
  return firstChild(parent, name) || setChildText(parent, name, '');
}

export const xcNorm = (value) => toText(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const normalizeLineKey = (value) => toText(value).trim().toUpperCase().replace(/\s+/g, '');

export function regexGroup(text, pattern, groupIndex = 1) {
  const source = toText(text);
  const patternText = toText(pattern).trim();
  if (!source || !patternText) return '';
  try {
    const match = new RegExp(patternText, 'i').exec(source);
    const index = Math.max(0, Number(groupIndex || 0));
    return toText(match?.[index] || '').trim();
  } catch {
    return '';
  }
}

function lineKeyRegexValue(value, pattern, groupIndex) {
  const text = toText(value).trim();
  if (!text || !toText(pattern).trim()) return text;
  return regexGroup(text, pattern, groupIndex || 1) || text;
}

export function xmlCiiFindLineListRow(branchLineKey, config) {
  const rows = Array.isArray(config.linelist?.masterRows) ? config.linelist.masterRows : [];
  if (!rows.length) return null;
  const lookupKey = normalizeLineKey(branchLineKey);
  const columnRegex = config.linelist?.linelistColumnRegex || '';
  const columnGroup = config.linelist?.linelistColumnGroup || 1;
  for (let index = 0; index < rows.length; index += 1) {
    const rawKey = rowText(rows[index], ['lineNo', 'lineKey', 'LineNo', 'Line No', 'PipelineReference']);
    const cleanKey = normalizeLineKey(lineKeyRegexValue(rawKey, columnRegex, columnGroup));
    if (cleanKey && cleanKey === lookupKey) return normalizeLineListRow(rows[index], config.linelist?.fieldMap || {}, index);
  }
  return null;
}

function processValue(pdOverride, row, overrideKey, rowKeys) {
  if (pdOverride && Object.prototype.hasOwnProperty.call(pdOverride, overrideKey)) {
    const overrideText = toText(pdOverride[overrideKey]).trim();
    if (overrideText !== '') return overrideText;
  }
  return rowText(row, rowKeys);
}

const HYDRO_KEYS = ['hydroPressure', 'Hydro Test Pressure', 'Hydrotest Pressure', 'Hydro Pressure', 'Hydro Pr', 'Hyd Test Pr',
  'Hyd. Test Pressure', 'Test Pressure', 'TEST_PRESSURE', 'HYDRO_TEST_PRESSURE', 'Pressure Test', 'Proof Pressure'];

export function xmlCiiApplyLineListProcessData(branch, row, config, branchLineKey) {
  if (!row) return 0;
  let count = 0;
  const lineKey = branchLineKey || rowText(row, ['lineNo', 'lineSeqNo', 'lineKey']) || '';
  const pdOverride = (lineKey && config?.overrides?.processData?.[lineKey]) || {};
  const p1 = processValue(pdOverride, row, 'p1', ['p1', 'P1']);
  const hydro = processValue(pdOverride, row, 'hydroPressure', HYDRO_KEYS);
  const t1 = processValue(pdOverride, row, 't1', ['t1', 'T1']);
  const t2 = processValue(pdOverride, row, 't2', ['t2', 'T2', 'Temperature2', 'Temperature 2', 'Temp', 'Temp. C', 'Temp °C']);
  const t3 = processValue(pdOverride, row, 't3', ['t3', 'T3', 'Temperature3', 'Temperature 3', 'Temp Min', 'Temp Min C', 'Temp Min °C', 'Min']);
  const insThk = processValue(pdOverride, row, 'insThk', ['insThk', 'InsThk']);
  const density = processValue(pdOverride, row, 'density', ['density', 'Density']);

  const pressure = ensureChild(branch, 'Pressure');
  if (p1) { setChildText(pressure, 'Pressure1', p1); count += 1; }
  if (hydro) { setChildText(pressure, 'HydroPressure', hydro); count += 1; }
  else if (!childText(pressure, 'HydroPressure')) setChildText(pressure, 'HydroPressure', '0');

  const temperature = ensureChild(branch, 'Temperature');
  if (t1) { setChildText(temperature, 'Temperature1', t1); count += 1; }
  if (t2) { setChildText(temperature, 'Temperature2', t2); count += 1; }
  if (t3) { setChildText(temperature, 'Temperature3', t3); count += 1; }
  if (insThk) {
    setChildText(branch, 'InsulationThickness', insThk);
    // Owner, 15 Nov 2026 (GOLDEN-30 finding K): node insulation is "as per linelist", written to every node too.
    for (const node of childrenByName(branch, 'Node')) setChildText(node, 'InsulationThickness', insThk);
    count += 1;
  }
  if (density) { setChildText(branch, 'FluidDensity', density); count += 1; }
  return count;
}

function branchTokens(branchName, delimiter = '-') {
  const cleaned = toText(branchName).trim().replace(/^\/+/, '').replace(/\/B\d+$/i, '');
  return cleaned.split(toText(delimiter) || '-').map((token) => token.trim()).filter(Boolean);
}

function tokenAtPosition(branchName, delimiter, oneBasedIndex) {
  const index = Number(oneBasedIndex);
  if (!Number.isFinite(index) || index <= 0) return '';
  return branchTokens(branchName, delimiter)[Math.round(index) - 1] || '';
}

export function derivePipingClassFromBranchName(branchName, config) {
  return regexGroup(branchName, config.rating?.pipingClassRegex, config.rating?.pipingClassGroup || 1)
    || tokenAtPosition(branchName, config.rating?.tokenDelimiter || '-', config.rating?.pipingClassTokenIndex || 5);
}

export function deriveRatingFromPipingClass(pipingClass, config) {
  const pc = xcNorm(pipingClass);
  if (!pc || !config.rating?.ratingSequence) return '';
  for (const [pattern, rating] of config.rating.ratingSequence) if (pc.includes(xcNorm(pattern))) return toText(rating);
  return '';
}

export function deriveBoreFromBranchName(branchName, config) {
  const raw = regexGroup(branchName, config.weight?.boreRegex, config.weight?.boreGroup || 1)
    || tokenAtPosition(branchName, config.weight?.tokenDelimiter || '-', config.weight?.boreTokenIndex || 3);
  const match = toText(raw).match(/\d+(?:\.\d+)?/);
  const sizeText = match ? match[0] : '';
  const num = Number(sizeText);
  if (!Number.isFinite(num) || num <= 0) return null;
  if (config.weight?.masterLengthUnit !== 'mm' && !toText(raw).includes('mm')) {
    const mmVal = num * toFiniteNumber(config.weight?.inchToMm, 25.4);
    const exact = (config.weight?.npsToDn || {})[sizeText];
    return exact ? Number(exact) : mmVal;
  }
  return num;
}
