// Ported from 3D_Converters v045/converters/xml-cii2019-core/branch-process-resolver.js (UXML step 4, engineering resolvers): only the code the recorded calls reach.
import { numericOverrideValue, overrideValue, readAny, readClassRowRating, smartOverrideKeys, xmlCiiClassKey, xmlCiiClassSizeKey } from './BranchProcess.js';
import { findBestPipingClassRow } from './PipingClassIndexPart2.js';
import { classCorrosion, classWall, ensureServiceFallback, resolveMaterialCodeFromLineMaterial, shouldUseNumericOverride } from './BranchProcessPart2.js';
import { toFiniteNumber } from '../supports/config/EnrichmentConfig.js';
import { selectXmlCiiRequestedPipingClass } from './PipingClassSource.js';
import { resolveXmlCiiAutomaticRating } from './DtxrRating.js';
import { normalizePipingClass } from './PipingClassIndex.js';

export function resolveCorrosionFromPipingClass({
  lineRow, boreMm, componentType, rating, pipingClassIndex,
  overrides = {}, overrideKeys = [], xmlNode, xmlBranch, config = {},
}) {
  const pipingClass = readAny(lineRow, ['pipingClass', 'Piping Class', 'PIPING_CLASS']);
  const match = findBestPipingClassRow({
    pipingClass, boreMm, componentType, rating, pipingClassIndex, overrides, config,
  });
  const fromClass = classCorrosion(match?.row);
  const override = numericOverrideValue(overrides, 'corrosion', overrideKeys);
  if (shouldUseNumericOverride(override, fromClass, config)) {
    return { corrosionAllowanceMm: override, source: 'override', matchedRow: null, needsReview: false };
  }
  const legacyOverride = toFiniteNumber(overrides.corrosionAllowanceMm);
  if (shouldUseNumericOverride(legacyOverride, fromClass, config)) {
    return { corrosionAllowanceMm: legacyOverride, source: 'override', matchedRow: null, needsReview: false };
  }
  if (fromClass != null) {
    return {
      corrosionAllowanceMm: fromClass,
      source: 'piping-class-master',
      matchedPipingClass: pipingClass,
      matchedRow: match.row,
      matchMethod: match.method,
      matchScore: match.score,
      matchReasons: match.reasons,
      needsReview: match.needsReview,
      candidates: match.candidates,
    };
  }
  const fromXml = toFiniteNumber(
    xmlNode?.corrosionAllowance ?? xmlNode?.CorrosionAllowance ?? xmlBranch?.corrosionAllowance,
  );
  if (fromXml != null) {
    return {
      corrosionAllowanceMm: fromXml,
      source: 'xml-fallback',
      matchedPipingClass: pipingClass,
      matchedRow: match?.row || null,
      matchMethod: match?.method || 'none',
      matchScore: match?.score || 0,
      matchReasons: match?.reasons || [],
      needsReview: match?.needsReview ?? true,
      candidates: match?.candidates || [],
    };
  }
  const fallback = toFiniteNumber(config.defaultCorrosionAllowance);
  return {
    corrosionAllowanceMm: fallback ?? 0,
    source: fallback != null ? 'config-default' : 'default-zero',
    matchedPipingClass: pipingClass,
    matchedRow: match?.row || null,
    matchMethod: match?.method || 'none',
    matchScore: match?.score || 0,
    matchReasons: match?.reasons || [],
    needsReview: match?.needsReview ?? true,
    candidates: match?.candidates || [],
  };
}

export function resolveWallThicknessFromPipingClass({
  pipingClassRow, overrides = {}, overrideKeys = [], xmlNode, xmlBranch, config = {},
}) {
  const fromClass = classWall(pipingClassRow);
  const override = numericOverrideValue(overrides, 'wallThickness', overrideKeys);
  const dtxrApplied = override != null && overrideKeys.some((key) => overrides.__dtxrWallKeys?.[key]);
  if (!dtxrApplied && shouldUseNumericOverride(override, fromClass, config)) {
    return { valueMm: override, source: 'override' };
  }
  if (fromClass != null) return { valueMm: fromClass, source: 'piping-class-master' };
  if (shouldUseNumericOverride(override, fromClass, config)) return { valueMm: override, source: 'override' };
  const fromXml = toFiniteNumber(xmlNode?.wallThickness ?? xmlNode?.WallThickness ?? xmlBranch?.wallThickness);
  if (fromXml != null) return { valueMm: fromXml, source: 'xml-fallback' };
  const fallback = toFiniteNumber(config.defaultWallThickness);
  return { valueMm: fallback ?? 0, source: fallback != null ? 'config-default' : 'default-zero' };
}

export function resolveBranchProcessData({
  branchName, lineKey, lineRow, boreMm, componentType, schedule, href, tref,
  materialMap, pipingClassIndex, overrides = {}, xmlNode, xmlBranch, config = {},
}) {
  const lineListPipingClass = readAny(lineRow, ['pipingClass', 'Piping Class', 'PIPING_CLASS']);
  const classSource = selectXmlCiiRequestedPipingClass({ branchName, lineListPipingClass, config });
  const requestedPipingClass = classSource.requestedPipingClass;
  const classMatch = findBestPipingClassRow({
    pipingClass: requestedPipingClass,
    boreMm,
    componentType,
    rating: '',
    schedule,
    pipingClassIndex,
    overrides,
    config,
  });
  const pipingClassRow = classMatch?.row || null;
  const resolvedPipingClass = classMatch?.resolvedPipingClass
    || classMatch?.classMatch?.pipingClass
    || requestedPipingClass;
  const overrideKeys = smartOverrideKeys({
    lineKey, branchName, requestedPipingClass, resolvedPipingClass, boreMm,
  });
  const serviceProcessFallback = ensureServiceFallback({
    branchName, lineKey, lineRow, requestedPipingClass, href, tref, config, overrides,
  });
  const ratingAuthority = resolveXmlCiiAutomaticRating({
    manualRating: overrideValue(overrides, 'rating', overrideKeys),
    pipingClassRating: readClassRowRating(pipingClassRow),
    pipingClass: resolvedPipingClass,
    branchName,
    config,
  });
  const resolverLineRow = { ...(lineRow || {}), pipingClass: resolvedPipingClass };
  const material = resolveMaterialCodeFromLineMaterial({
    lineRow: resolverLineRow,
    materialMap,
    pipingClassRow,
    pipingClass: resolvedPipingClass,
    overrides,
    overrideKeys,
    xmlNode,
    xmlBranch,
    config,
  });
  const corrosion = resolveCorrosionFromPipingClass({
    lineRow: resolverLineRow,
    boreMm,
    componentType,
    rating: ratingAuthority.rating,
    pipingClassIndex,
    overrides,
    overrideKeys,
    xmlNode,
    xmlBranch,
    config,
  });
  const wall = resolveWallThicknessFromPipingClass({
    pipingClassRow, overrides, overrideKeys, xmlNode, xmlBranch, config,
  });
  return {
    branchName,
    lineKey,
    requestedPipingClass,
    branchPipingClass: classSource.branchPipingClass,
    lineListPipingClass: classSource.lineListPipingClass,
    pipingClassSource: classSource.source,
    resolvedPipingClass,
    normalizedPipingClass: normalizePipingClass(resolvedPipingClass),
    pipingClass: resolvedPipingClass,
    rating: ratingAuthority.rating,
    ratingSource: ratingAuthority.source,
    material: material.material,
    materialCode: material.materialCode,
    materialSource: material.source,
    materialCodeConfidence: material.confidence ?? null,
    materialCodeMatchMethod: material.matchMethod || null,
    materialCodeNeedsReview: material.needsReview ?? !material.materialCode,
    materialCodeConflict: material.conflict || null,
    corrosionAllowanceMm: corrosion.corrosionAllowanceMm,
    corrosionSource: corrosion.source,
    wallThicknessMm: wall.valueMm,
    wallThicknessSource: wall.source,
    wallThicknessKey: xmlCiiClassSizeKey(resolvedPipingClass || requestedPipingClass, boreMm)
      || lineKey
      || branchName,
    corrosionKey: xmlCiiClassKey(resolvedPipingClass || requestedPipingClass)
      || lineKey
      || branchName,
    materialCodeKey: material.material
      || xmlCiiClassKey(resolvedPipingClass || requestedPipingClass)
      || lineKey
      || branchName,
    serviceProcessFallback,
    pipingClassMatchedRow: pipingClassRow,
    pipingClassMatchMethod: classMatch.classMatch?.method || classMatch.method,
    pipingClassConfidence: classMatch.classMatch?.confidence ?? classMatch.confidence,
    pipingClassScore: classMatch.classMatch?.score ?? classMatch.score,
    pipingClassRowMethod: classMatch.method,
    pipingClassRowScore: classMatch.score,
    pipingClassRowReasons: classMatch.reasons,
    pipingClassNeedsReview: classMatch.classMatch?.needsReview || classMatch.needsReview,
    pipingClassCandidates: classMatch.classMatch?.candidates || classMatch.candidates || [],
  };
}
