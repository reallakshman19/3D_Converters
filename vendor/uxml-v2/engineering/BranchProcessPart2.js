// Ported from 3D_Converters v045/converters/xml-cii2019-core/branch-process-resolver.js (UXML step 4, engineering resolvers): only the code the recorded calls reach.
import { SERVICE_FIELDS, classRowMaterial, directMaterialCode, hasExactLineListEvidence, materialMapResult, materialResolution, numberAny, overrideRecord, readAny, text } from './BranchProcess.js';
import { buildXmlCiiServiceProcessFallback } from './ServiceProcessFallback.js';
import { cleanMaterialCode, cleanMaterialText } from './LineListRows.js';
import { resolveConfiguredMaterialCode } from './ClassMaterialCode.js';

export function ensureServiceFallback({ branchName, lineKey, lineRow, requestedPipingClass, href, tref, config, overrides }) {
  if (hasExactLineListEvidence(lineRow) || !config || typeof config !== 'object') return null;
  const targetKey = text(lineKey) || text(branchName);
  if (!targetKey) return null;
  const fallback = buildXmlCiiServiceProcessFallback({
    branchName, lineRow, requestedPipingClass, href, tref, config, fields: SERVICE_FIELDS,
  });
  if (!fallback?.stats?.resolvedFields) return fallback;
  config.overrides = config.overrides && typeof config.overrides === 'object' ? config.overrides : (overrides || {});
  config.overrides.processData = config.overrides.processData && typeof config.overrides.processData === 'object'
    ? config.overrides.processData
    : {};
  const row = config.overrides.processData[targetKey] && typeof config.overrides.processData[targetKey] === 'object'
    ? config.overrides.processData[targetKey]
    : {};
  let appliedFields = 0;
  for (const [field, info] of Object.entries(fallback.fields || {})) {
    if (text(row[field])) continue;
    row[field] = info.value;
    appliedFields += 1;
  }
  if (appliedFields) {
    row.__source = row.__source || {};
    row.__source.serviceProcessFallback = {
      source: 'service-match',
      service: fallback.service,
      matchedRows: fallback.stats.matchedRows,
      appliedFields,
      needsReview: true,
    };
    config.overrides.processData[targetKey] = row;
  }
  return { ...fallback, appliedFields, targetKey };
}

export function resolveMaterialCodeFromLineMaterial({
  lineRow,
  materialMap,
  pipingClassRow,
  pipingClass,
  overrides = {},
  overrideKeys = [],
  xmlNode,
  xmlBranch,
  config = {},
}) {
  const lineMaterialRaw = readAny(lineRow, [
    'material', 'Material', 'MATERIAL', 'Material_Name', 'Material Name', 'MOC',
  ]);
  const materialOverride = overrideRecord(overrides, 'material', overrideKeys);
  const processMaterial = cleanMaterialText(materialOverride?.value || lineMaterialRaw);
  const codeRecord = overrideRecord(overrides, 'materialCode', [
    ...overrideKeys,
    processMaterial,
    lineMaterialRaw,
  ].filter(Boolean));
  const directLineCode = directMaterialCode(lineRow);

  // Process Line List Material is the governing automatic Material Code authority.
  // A nonblank unresolved Material blocks every Piping Class fallback.
  if (processMaterial) {
    return materialResolution({
      material: processMaterial,
      source: materialOverride ? 'override-material-map' : 'line-list-material-map',
      mapped: materialMapResult(processMaterial, materialMap, config),
      codeRecord,
      directCode: directLineCode,
    });
  }

  // Explicit code remains available when no Process Material exists, but is
  // review-required unless it is carried by the exact Process Line List row.
  if (directLineCode) {
    return {
      material: '', materialCode: directLineCode, source: 'line-list-material-code',
      confidence: 1, matchMethod: 'direct-line-code', needsReview: false,
      conflict: null, matchedRow: lineRow,
    };
  }
  if (codeRecord) {
    return {
      material: '', materialCode: cleanMaterialCode(codeRecord.value), source: 'override-unvalidated',
      confidence: 0, matchMethod: 'override', needsReview: true,
      conflict: null, matchedRow: null,
    };
  }

  // Material evidence from XML is preferred over Piping Class fallback when the
  // Process Line List does not publish Material.
  const xmlMaterial = cleanMaterialText(xmlNode?.material || xmlBranch?.material || '');
  const xmlMapped = materialMapResult(xmlMaterial, materialMap, config);
  if (xmlMapped) {
    return {
      material: xmlMaterial,
      materialCode: xmlMapped.materialCode,
      source: 'xml-material-map',
      confidence: xmlMapped.confidence,
      matchMethod: xmlMapped.method,
      needsReview: false,
      conflict: null,
      matchedRow: xmlMapped.matchedRow,
    };
  }

  // Piping Class is fallback-only. Wildcards are already gated by recognized
  // one- or two-character Rating prefix isolation in the shared class resolver.
  const directClassCode = directMaterialCode(pipingClassRow);
  const classMaterial = cleanMaterialText(classRowMaterial(pipingClassRow));
  if (directClassCode) {
    return {
      material: classMaterial,
      materialCode: directClassCode,
      source: 'piping-class-fallback',
      confidence: 1,
      matchMethod: 'exact-class-row',
      needsReview: false,
      conflict: null,
      matchedRow: pipingClassRow,
    };
  }

  const configured = resolveConfiguredMaterialCode({ pipingClass, config });
  if (configured) {
    return {
      material: cleanMaterialText(configured.materialName),
      materialCode: cleanMaterialCode(configured.materialCode),
      source: 'piping-class-fallback',
      confidence: Number(configured.confidence) / 100,
      matchMethod: configured.method,
      needsReview: configured.method === 'rating-prefix-family-wildcard',
      conflict: null,
      matchedRow: configured.matchedRow,
    };
  }

  const classMapped = materialMapResult(classMaterial, materialMap, config);
  if (classMapped) {
    return {
      material: classMaterial,
      materialCode: classMapped.materialCode,
      source: 'piping-class-fallback',
      confidence: classMapped.confidence,
      matchMethod: classMapped.method,
      needsReview: true,
      conflict: null,
      matchedRow: classMapped.matchedRow,
    };
  }

  return {
    material: xmlMaterial || classMaterial,
    materialCode: '',
    source: xmlMaterial ? 'xml-fallback' : 'blank',
    confidence: 0,
    matchMethod: 'none',
    needsReview: true,
    conflict: null,
    matchedRow: null,
  };
}

export function shouldUseNumericOverride(value, classValue, config) {
  if (value == null) return false;
  if (value !== 0 || config?.allowZeroWallCorrosionOverrides === true) return true;
  return classValue == null || classValue === 0;
}

export function classCorrosion(row) {
  return numberAny(row, [
    'corrosion', 'Corrosion', 'corrosionAllowance', 'Corrosion Allowance',
    'CORROSION_ALLOWANCE', 'CORR_ALLOW', 'CORR', 'CA',
  ]);
}

export function classWall(row) {
  return numberAny(row, [
    'wallThickness', 'WallThickness', 'Wall Thickness', 'Wall thickness',
    'WALL_THICKNESS', 'WALL_THICK', 'WT', 'THK', 'Thickness',
  ]);
}
