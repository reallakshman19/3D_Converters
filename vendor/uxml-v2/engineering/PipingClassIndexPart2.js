// Ported from 3D_Converters v045/converters/xml-cii2019-core/piping-class-resolver.js (UXML step 4, engineering resolvers): only the code the recorded calls reach.
import { commonPrefixLength, displayPipingClass, familyCandidates, indexedClassWork, knownClassesFromIndex, leadingDigits, mergeConfig, normalizePipingClass, number, overrideForClass, readClassFromRow, rowsForClass, sequenceRatio, text, uniqueClasses } from './PipingClassIndex.js';
import { normalizeXmlCiiPipingClassMasterRow } from './NpsBore.js';

export function scorePipingClassCandidatePrepared(requestedClass, candidateClass, cfg) {
  const requested = normalizePipingClass(requestedClass);
  const candidate = normalizePipingClass(candidateClass);
  const result = (score, confidence, method, reasons) => ({
    candidate: displayPipingClass(candidateClass), score, confidence, method, reasons,
  });
  if (!requested || !candidate) return result(-Infinity, 0, 'invalid', ['invalid-empty-class']);
  if (requested === candidate) return result(cfg.classExactScore, 1, 'exact', ['class-exact']);
  if (requested.startsWith(candidate) || candidate.startsWith(requested)) {
    const candidateIsBase = requested.startsWith(candidate);
    const score = candidateIsBase ? cfg.prefixBaseScore : cfg.startsWithScore;
    return result(score, Math.min(0.94, score / cfg.classExactScore), candidateIsBase ? 'prefix-base' : 'starts-with', ['prefix-compatible']);
  }
  const requestedDigits = leadingDigits(requested);
  const candidateDigits = leadingDigits(candidate);
  if (requestedDigits || candidateDigits) {
    const depth = commonPrefixLength(requestedDigits, candidateDigits);
    if (!requestedDigits || !candidateDigits || depth === 0) return result(-Infinity, 0, 'family-mismatch', ['numeric-family-mismatch']);
    const lengthPenalty = Math.abs(requestedDigits.length - candidateDigits.length) * 3;
    const score = cfg.numericFamilyBaseScore + Math.min(5, depth) * cfg.numericFamilyPrefixWeight - lengthPenalty;
    return result(score, Math.min(0.95, score / cfg.classExactScore), 'prefix-base', [`numeric-family-prefix:${requestedDigits.slice(0, depth)}`]);
  }
  const ratio = sequenceRatio(requested, candidate);
  const score = Math.round(ratio * cfg.fuzzyRatioWeight);
  return result(score, Math.max(0, Math.min(ratio >= cfg.fuzzyMinRatio ? 0.8 : 0.6, ratio)), ratio >= cfg.fuzzyMinRatio ? 'fuzzy-ratio' : 'below-threshold', [`ratio:${ratio.toFixed(3)}`]);
}

export function resolveApproximatePipingClass({ requestedClass, knownClasses, pipingClassIndex, overrides = {}, config = {} }) {
  const cfg = mergeConfig(config);
  const rawRequested = displayPipingClass(requestedClass);
  const normalizedRequestedClass = normalizePipingClass(rawRequested);
  // The index is built afresh per calculation. Reuse its unique class list
  // and the class-family shortlist, but NEVER cache config/override-dependent
  // scores, reviews or final selections.
  const cached = !knownClasses && pipingClassIndex && indexedClassWork.get(pipingClassIndex);
  const allClasses = cached?.knownClasses || uniqueClasses(knownClasses || knownClassesFromIndex(pipingClassIndex));
  const candidateKey = normalizePipingClass(rawRequested);
  let candidateClasses = cached?.families?.get(candidateKey);
  if (!candidateClasses) {
    candidateClasses = familyCandidates(rawRequested, allClasses);
    if (cached) cached.families.set(candidateKey, candidateClasses);
  } else if (cached) {
    cached.familyCacheHits += 1;
  }
  const scored = candidateClasses
    .map((candidate) => scorePipingClassCandidatePrepared(rawRequested, candidate, cfg))
    .filter((entry) => Number.isFinite(entry.score))
    .sort((left, right) => right.score - left.score || left.candidate.localeCompare(right.candidate));
  const best = scored[0] || null;
  const second = scored[1] || null;
  const override = overrideForClass(overrides, rawRequested);
  if (!normalizedRequestedClass) return { requestedClass: rawRequested, pipingClass: '', normalizedRequestedClass: '', method: 'none', confidence: 0, score: 0, needsReview: true, reasons: ['missing-requested-class'], candidates: [] };
  if (override) return { requestedClass: rawRequested, pipingClass: override, normalizedRequestedClass, method: 'override', confidence: 1, score: cfg.overrideScore, needsReview: false, reasons: ['manual-override'], candidates: scored.slice(0, cfg.maxCandidates) };
  if (!best || best.score < cfg.minAcceptScore) return { requestedClass: rawRequested, pipingClass: '', normalizedRequestedClass, method: 'none', confidence: best?.confidence ?? 0, score: best?.score ?? 0, needsReview: true, reasons: [candidateClasses.length ? 'below-min-accept-score' : 'numeric-family-not-found', ...(best?.reasons || [])], candidates: scored.slice(0, cfg.maxCandidates) };
  const ambiguous = Boolean(second && Math.abs(best.score - second.score) <= cfg.ambiguousScoreDelta);
  return { requestedClass: rawRequested, pipingClass: best.candidate, normalizedRequestedClass, method: ambiguous ? 'ambiguous-approximate' : best.method, confidence: best.confidence, score: best.score, needsReview: ambiguous || best.confidence < cfg.reviewBelowConfidence || best.method !== 'exact', reasons: best.reasons, candidates: scored.slice(0, cfg.maxCandidates) };
}

export function buildPipingClassIndex(rows, fieldMap = {}) {
  const map = new Map();
  const knownClasses = [];
  const seenClasses = new Set();
  const perf = typeof performance !== 'undefined' ? performance : null;
  perf?.mark?.('xml-cii:piping-class:index:start');
  const safeRows = (Array.isArray(rows) ? rows : []).map(normalizeXmlCiiPipingClassMasterRow);
  for (const row of safeRows) {
    const rawClass = readClassFromRow(row, fieldMap);
    const normalized = normalizePipingClass(rawClass);
    if (!normalized) continue;
    if (!map.has(normalized)) map.set(normalized, []);
    map.get(normalized).push(row);
    if (!seenClasses.has(normalized)) {
      seenClasses.add(normalized);
      knownClasses.push(displayPipingClass(rawClass));
    }
  }
  map.byClass = map;
  map.knownClasses = knownClasses;
  map.rows = safeRows;
  indexedClassWork.set(map, { knownClasses, families: new Map(), familyCacheHits: 0 });
  perf?.mark?.('xml-cii:piping-class:index:end');
  perf?.measure?.('xml-cii:piping-class:index',
    'xml-cii:piping-class:index:start', 'xml-cii:piping-class:index:end');
  return map;
}

export function normalizeComponentType(value) {
  const source = text(value).toUpperCase();
  if (source === 'RIGID' || source.includes('PIPE')) return 'PIPE';
  if (source.includes('ELBOW') || source === 'BEND') return 'BEND';
  if (source.includes('TEE')) return 'TEE';
  if (source.includes('VALVE') || source.startsWith('VLV')) return 'VALVE';
  if (source.includes('FLANGE') || source === 'FLG') return 'FLANGE';
  return source;
}

export function normalizeRating(value) { return text(value).toUpperCase().replace(/CLASS|CL|#|RATING/g, '').replace(/\s+/g, ''); }

export function normalizeSchedule(value) { return text(value).toUpperCase().replace(/\s+/g, ''); }

export function scorePipingClassRowPrepared({ row, pipingClass, boreMm, componentType, rating, schedule }, cfg) {
  const normalizedRow = normalizeXmlCiiPipingClassMasterRow(row);
  const rowClass = normalizePipingClass(readClassFromRow(normalizedRow));
  const requestedClass = normalizePipingClass(pipingClass);
  if (!rowClass || !requestedClass || rowClass !== requestedClass) return { score: -Infinity, confidence: 0, needsReview: true, reasons: ['class-mismatch'] };
  let score = cfg.classExactWeight;
  const reasons = ['class-exact'];
  const rowBore = number(normalizedRow.convertedBore ?? normalizedRow.boreMm);
  const requestedBore = number(boreMm);
  if (requestedBore != null && rowBore != null) {
    const difference = Math.abs(rowBore - requestedBore);
    if (difference <= 0.001) { score += cfg.boreExactWeight; reasons.push('bore-exact'); }
    else if (difference <= cfg.boreToleranceMm) { score += cfg.boreNearWeight; reasons.push(`bore-near:${difference.toFixed(3)}mm`); }
    else { score -= cfg.boreExactWeight; reasons.push(`bore-mismatch:${difference.toFixed(3)}mm`); }
  } else reasons.push('bore-missing');
  const rowComponent = normalizeComponentType(normalizedRow.componentType ?? normalizedRow['Component Type'] ?? normalizedRow.COMPONENT_TYPE ?? normalizedRow.type ?? normalizedRow.itemType);
  const requestedComponent = normalizeComponentType(componentType);
  if (rowComponent && requestedComponent && rowComponent === requestedComponent) { score += cfg.componentExactWeight; reasons.push('component-exact'); }
  else if (rowComponent === 'PIPE' && requestedComponent === 'PIPE') { score += cfg.pipeRigidWeight; reasons.push('pipe-rigid-compatible'); }
  const rowRating = normalizeRating(normalizedRow.rating ?? normalizedRow.Rating ?? normalizedRow.RATING ?? normalizedRow['Pressure Class'] ?? normalizedRow.class);
  const requestedRating = normalizeRating(rating);
  if (rowRating && requestedRating && rowRating === requestedRating) { score += cfg.ratingExactWeight; reasons.push('rating-exact'); }
  const rowSchedule = normalizeSchedule(normalizedRow.schedule ?? normalizedRow.Schedule ?? normalizedRow.SCH);
  const requestedSchedule = normalizeSchedule(schedule);
  if (rowSchedule && requestedSchedule && rowSchedule === requestedSchedule) { score += cfg.scheduleExactWeight; reasons.push('schedule-exact'); }
  const maximum = cfg.classExactWeight + cfg.boreExactWeight + cfg.componentExactWeight + cfg.ratingExactWeight + cfg.scheduleExactWeight;
  return { score, confidence: Math.max(0, Math.min(1, score / maximum)), needsReview: reasons.includes('bore-missing'), reasons };
}

export function findBestPipingClassRow({ pipingClass, boreMm, componentType, rating, schedule, pipingClassIndex, overrides = {}, config = {} }) {
  const cfg = mergeConfig(config).rowScoring;
  const classMatch = resolveApproximatePipingClass({ requestedClass: pipingClass, pipingClassIndex, overrides, config });
  const resolvedPipingClass = normalizePipingClass(classMatch.pipingClass || pipingClass);
  const scored = rowsForClass(pipingClassIndex, resolvedPipingClass)
    .map((row) => ({ row, ...scorePipingClassRowPrepared({ row, pipingClass: resolvedPipingClass, boreMm, componentType, rating, schedule }, cfg) }))
    .filter((entry) => Number.isFinite(entry.score))
    .sort((left, right) => right.score - left.score);
  const best = scored[0] || null;
  const second = scored[1] || null;
  if (!best || best.score < cfg.minAcceptScore) return { row: null, resolvedPipingClass, classMatch, method: 'none', confidence: classMatch.confidence || 0, needsReview: true, score: best?.score ?? 0, reasons: ['row-below-min-accept-score', ...(best?.reasons || [])], candidates: scored.slice(0, mergeConfig(config).maxCandidates) };
  const ambiguous = Boolean(second && Math.abs(best.score - second.score) <= cfg.ambiguousScoreDelta);
  return { row: best.row, resolvedPipingClass, classMatch, method: ambiguous ? 'ambiguous-best-score' : 'best-score', confidence: best.confidence, needsReview: classMatch.needsReview || best.needsReview || ambiguous, score: best.score, reasons: [...(classMatch.reasons || []), ...(best.reasons || [])], candidates: scored.slice(0, mergeConfig(config).maxCandidates) };
}
