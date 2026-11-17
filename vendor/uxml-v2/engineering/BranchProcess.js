// Ported from 3D_Converters v045/converters/xml-cii2019-core/branch-process-resolver.js (UXML step 4, engineering resolvers): only the code the recorded calls reach.
import { toFiniteNumber } from '../supports/config/EnrichmentConfig.js';
import { cleanMaterialCode } from './LineListRows.js';
import { normalizeXmlCiiMaterialIdentity, resolveXmlCiiMaterialCodeFromMap } from './MaterialCodeFuzzy.js';

export function text(value) { return value === undefined || value === null ? '' : String(value).trim(); }

export function headerKey(value) { return text(value).toUpperCase().replace(/[^A-Z0-9]+/g, ''); }

export function readAny(row, keys) {
  if (!row || typeof row !== 'object') return '';
  const wanted = (keys || []).map(headerKey).filter(Boolean);
  for (const source of [row, row._raw]) {
    if (!source || typeof source !== 'object') continue;
    for (const key of keys || []) if (text(source[key])) return text(source[key]);
    for (const [key, value] of Object.entries(source)) {
      if (wanted.includes(headerKey(key)) && text(value)) return text(value);
    }
  }
  return '';
}

export function numberAny(row, keys) {
  const match = readAny(row, keys).replace(/,/g, '').match(/[-+]?\d*\.?\d+/);
  const value = match ? Number(match[0]) : NaN;
  return Number.isFinite(value) ? value : null;
}

export function overrideRecord(overrides, bucketName, keys = []) {
  const bucket = overrides?.[bucketName];
  if (bucket && typeof bucket === 'object' && !Array.isArray(bucket)) {
    for (const key of keys) {
      if (key && Object.hasOwn(bucket, key) && text(bucket[key])) {
        return { key: text(key), value: text(bucket[key]) };
      }
    }
    return null;
  }
  const value = bucket !== undefined && (typeof bucket !== 'object' || bucket === null)
    ? text(bucket)
    : '';
  return value ? { key: '', value } : null;
}

export function overrideValue(overrides, bucketName, keys = []) {
  return overrideRecord(overrides, bucketName, keys)?.value || '';
}

export function numericOverrideValue(overrides, bucketName, keys = []) {
  const value = toFiniteNumber(overrideValue(overrides, bucketName, keys));
  return value == null ? null : value;
}

export function readClassRowRating(row) {
  return readAny(row, ['rating', 'Rating', 'RATING', 'Pressure Class', 'classRating', 'Class Rating', 'PRESSURE_CLASS']);
}

export function classRowMaterial(row) {
  return readAny(row, ['materialName', 'Material_Name', 'Material Name', 'Material', 'material', 'MATERIAL', 'Mat', 'MAT', 'MOC']);
}

export function directMaterialCode(row) {
  return cleanMaterialCode(readAny(row, [
    'materialCode', 'Material Code', 'MATERIAL_CODE', 'MAT_CODE',
    'Mat Code', 'MatID', 'MaterialCode', 'CA3',
  ]));
}

export function normalKey(value) { return text(value).toUpperCase().replace(/\s+/g, ''); }

export function xmlCiiClassKey(pipingClass) {
  const value = normalKey(pipingClass);
  return value ? `PC:${value}` : '';
}

export function xmlCiiClassSizeKey(pipingClass, boreMm) {
  const value = normalKey(pipingClass);
  const bore = Number(boreMm);
  return value && Number.isFinite(bore) && bore > 0 ? `PC:${value}|DN:${Math.round(bore)}` : '';
}

export function smartOverrideKeys({ lineKey, branchName, requestedPipingClass, resolvedPipingClass, boreMm }) {
  return [
    lineKey, branchName, requestedPipingClass, resolvedPipingClass,
    xmlCiiClassSizeKey(resolvedPipingClass, boreMm),
    xmlCiiClassSizeKey(requestedPipingClass, boreMm),
    xmlCiiClassKey(resolvedPipingClass),
    xmlCiiClassKey(requestedPipingClass),
  ].map(text).filter(Boolean);
}

export function materialScopedCodeOverride(record, material) {
  if (!record || !material) return false;
  const identity = normalizeXmlCiiMaterialIdentity(material);
  const key = normalKey(record.key).replace(/^MAT(?:ERIAL)?:/, '');
  return key === normalKey(material)
    || key === identity.compact
    || key === normalKey(identity.canonical);
}

export function materialMapResult(material, materialMap, config) {
  if (!material) return null;
  const fuzzyConfig = config?.materialCodeFuzzy || config?.material?.fuzzy || {};
  const result = resolveXmlCiiMaterialCodeFromMap(material, materialMap, fuzzyConfig);
  return result.materialCode ? result : null;
}

export function materialResolution({ material, source, mapped, codeRecord, directCode }) {
  const pinned = materialScopedCodeOverride(codeRecord, material);
  if (pinned) {
    const conflict = !!mapped && mapped.materialCode !== cleanMaterialCode(codeRecord.value);
    return {
      material,
      materialCode: cleanMaterialCode(codeRecord.value),
      source: conflict ? 'material-scoped-override-conflict' : 'material-scoped-override',
      confidence: conflict ? mapped.confidence : 1,
      matchMethod: 'override',
      needsReview: conflict,
      conflict: conflict ? {
        overrideCode: cleanMaterialCode(codeRecord.value),
        resolvedCode: mapped.materialCode,
        overrideKey: codeRecord.key,
      } : null,
      matchedRow: mapped?.matchedRow || null,
    };
  }
  if (mapped) {
    const overrideCode = cleanMaterialCode(codeRecord?.value);
    const conflict = !!overrideCode && overrideCode !== mapped.materialCode;
    return {
      material,
      materialCode: mapped.materialCode,
      source: conflict ? 'material-evidence-corrected' : source,
      confidence: mapped.confidence,
      matchMethod: mapped.method,
      needsReview: false,
      conflict: conflict ? {
        overrideCode,
        resolvedCode: mapped.materialCode,
        overrideKey: codeRecord?.key || '',
      } : null,
      matchedRow: mapped.matchedRow,
    };
  }
  if (directCode) {
    return {
      material,
      materialCode: directCode,
      source: 'line-list-material-code',
      confidence: 1,
      matchMethod: 'direct-line-code',
      needsReview: false,
      conflict: null,
      matchedRow: null,
    };
  }
  if (codeRecord) {
    return {
      material,
      materialCode: '',
      source: 'process-material-unresolved',
      confidence: 0,
      matchMethod: 'none',
      needsReview: true,
      conflict: {
        overrideCode: cleanMaterialCode(codeRecord.value),
        resolvedCode: '',
        overrideKey: codeRecord.key,
      },
      matchedRow: null,
    };
  }
  return {
    material,
    materialCode: '',
    source: 'process-material-unresolved',
    confidence: 0,
    matchMethod: 'none',
    needsReview: true,
    conflict: null,
    matchedRow: null,
  };
}

export const SERVICE_FIELDS = Object.freeze(['p1', 'hydroPressure', 't1', 't2', 't3', 'density']);

export function hasExactLineListEvidence(lineRow) {
  if (!lineRow || typeof lineRow !== 'object') return false;
  if (lineRow._raw && typeof lineRow._raw === 'object') return true;
  return Object.keys(lineRow).some((key) => !['pipingClass', 'Piping Class', 'PIPING_CLASS'].includes(key) && text(lineRow[key]));
}
