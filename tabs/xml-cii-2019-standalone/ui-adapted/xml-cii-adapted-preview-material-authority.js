import { DEFAULT_MATERIAL_MAP_ROWS } from '../../../converters/xml-cii2019-core/default-material-map-rows.js';
import {
  normalizeXmlCiiMaterialIdentity,
  resolveXmlCiiMaterialCodeFromMap,
} from '../../../converters/xml-cii2019-core/material-code-fuzzy-resolver.js';

function text(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function normalKey(value) {
  return text(value).toUpperCase().replace(/\s+/g, '');
}

function classKey(row) {
  const pipingClass = normalKey(row?.pipingClass || row?.pipingClassDerived || row?.resolvedPipingClass);
  return pipingClass ? `PC:${pipingClass}` : '';
}

function classSizeKey(row) {
  const key = classKey(row);
  const bore = Number(row?.sizeMm ?? text(row?.size).replace(/[^0-9.+-]/g, ''));
  return key && Number.isFinite(bore) && bore > 0 ? `${key}|DN:${Math.round(bore)}` : key;
}

function overrideRecord(config, row) {
  const bucket = config?.overrides?.materialCode;
  if (!bucket || typeof bucket !== 'object' || Array.isArray(bucket)) return null;
  const keys = [...new Set([
    row?.materialCodeKey,
    classSizeKey(row),
    classKey(row),
    row?.lineKey,
    row?.branchName,
    row?.material,
  ].map(text).filter(Boolean))];
  for (const key of keys) {
    const value = text(bucket[key]);
    if (value) return { key, value };
  }
  return null;
}

function materialScopedOverride(record, material) {
  if (!record?.key || !material) return false;
  const identity = normalizeXmlCiiMaterialIdentity(material);
  const key = normalKey(record.key).replace(/^MAT(?:ERIAL)?:/, '');
  return key === normalKey(material)
    || key === identity.compact
    || key === normalKey(identity.canonical);
}

function displayMethod(method) {
  if (method === 'exact' || method === 'designation-exact' || method === 'known-alias') return 'exact';
  if (method === 'ambiguous') return 'ambiguous';
  if (method === 'none' || method === 'below-threshold') return 'none';
  return 'fuzzy';
}

export function resolvePreviewMaterialCodeAuthority(row, config = {}) {
  const material = text(row?.material);
  const materialRows = Array.isArray(config?.material?.mapRows) && config.material.mapRows.length
    ? config.material.mapRows
    : DEFAULT_MATERIAL_MAP_ROWS;
  const fuzzyConfig = config?.materialCodeFuzzy || config?.material?.fuzzy || {};
  const resolved = resolveXmlCiiMaterialCodeFromMap(material, materialRows, fuzzyConfig);
  const override = overrideRecord(config, row);
  const currentCode = text(row?.materialCode);
  const strongThreshold = Number.isFinite(Number(fuzzyConfig.overrideConflictThreshold))
    ? Number(fuzzyConfig.overrideConflictThreshold)
    : 0.92;
  const strong = !!resolved.materialCode && resolved.confidence >= strongThreshold && !resolved.ambiguous;
  const pinnedOverride = materialScopedOverride(override, material);

  if (override && pinnedOverride) {
    const conflict = !!resolved.materialCode && resolved.materialCode !== override.value;
    return {
      materialCode: override.value,
      materialCodeSource: conflict ? 'material-scoped-override-conflict' : 'material-scoped-override',
      materialCodeMethod: 'override',
      materialCodeResolutionMethod: resolved.method,
      materialCodeConfidence: conflict ? resolved.confidence : 1,
      materialCodeNeedsReview: conflict,
      materialCodeConflict: conflict ? { overrideCode: override.value, resolvedCode: resolved.materialCode, overrideKey: override.key } : null,
      materialCodeMatchedMaterial: resolved.matchedMaterial || '',
      materialCodeMatchReasons: resolved.reasons || [],
      materialCodeCandidates: resolved.candidates || [],
    };
  }

  if (strong) {
    const conflictingOverride = override && override.value !== resolved.materialCode;
    const conflictingCurrent = !override && currentCode && currentCode !== resolved.materialCode;
    return {
      materialCode: resolved.materialCode,
      materialCodeSource: conflictingOverride || conflictingCurrent ? 'material-evidence-corrected' : 'material-map-auto',
      materialCodeMethod: displayMethod(resolved.method),
      materialCodeResolutionMethod: resolved.method,
      materialCodeConfidence: resolved.confidence,
      materialCodeNeedsReview: false,
      materialCodeConflict: conflictingOverride || conflictingCurrent ? {
        overrideCode: override?.value || currentCode,
        resolvedCode: resolved.materialCode,
        overrideKey: override?.key || '',
      } : null,
      materialCodeMatchedMaterial: resolved.matchedMaterial || '',
      materialCodeMatchReasons: resolved.reasons || [],
      materialCodeCandidates: resolved.candidates || [],
    };
  }

  if (override) {
    return {
      materialCode: override.value,
      materialCodeSource: 'override-unvalidated',
      materialCodeMethod: 'override',
      materialCodeResolutionMethod: resolved.method,
      materialCodeConfidence: resolved.confidence || 0,
      materialCodeNeedsReview: true,
      materialCodeConflict: null,
      materialCodeMatchedMaterial: resolved.matchedMaterial || '',
      materialCodeMatchReasons: resolved.reasons || [],
      materialCodeCandidates: resolved.candidates || [],
    };
  }

  return {
    materialCode: resolved.materialCode || currentCode || '',
    materialCodeSource: resolved.materialCode ? 'material-map-fuzzy-review' : (currentCode ? 'existing-unvalidated' : 'unresolved'),
    materialCodeMethod: displayMethod(resolved.method),
    materialCodeResolutionMethod: resolved.method,
    materialCodeConfidence: resolved.confidence || 0,
    materialCodeNeedsReview: true,
    materialCodeConflict: null,
    materialCodeMatchedMaterial: resolved.matchedMaterial || '',
    materialCodeMatchReasons: resolved.reasons || [],
    materialCodeCandidates: resolved.candidates || [],
  };
}

export function applyPreviewMaterialCodeAuthority({ config = {}, result } = {}) {
  const branchRows = Array.isArray(result?.branchRows) ? result.branchRows : [];
  if (!branchRows.length) return result || { branchRows: [], nodeRows: [] };
  return {
    ...(result || {}),
    branchRows: branchRows.map((row) => ({
      ...row,
      ...resolvePreviewMaterialCodeAuthority(row, config),
    })),
  };
}
