// Ported from 3D_Converters v045/converters/xml-cii2019-core/weight-valve-hints.js (UXML step 4, engineering resolvers): only the code the recorded calls reach.
import { baseCandidateFromRow, classifyWeightMasterCandidate, ensureValveHintConfig, formatValveHint, interpolateBetween, keywordMatches, matchedSpecialFactorRule, normalizedRating, numberOr, pickNumber, ratioFromNearest, resolveCandidateWeight, resolveNodeNameValveHint, roundWeight, sameBoreRatingRows, scoreSemanticSource, scoreValveHintAgainstCandidate, semanticSourceForContext, text, useNodeNameValveHints, valveHintLengthToleranceMm } from './WeightValveHints.js';

export function candidateMatchesSemanticCode(candidate, code, config) {
  const wanted = text(code).trim().toUpperCase();
  const candidateText = `${candidate?.type || ''} ${candidate?.typeDesc || ''} ${candidate?.valveType || ''}`;
  if (keywordMatches(candidateText, config).some((hit) => hit.code === wanted)) return true;
  const candidateClass = classifyWeightMasterCandidate(candidate);
  if (wanted === 'CONTROL') return candidateClass.subtype === 'CONTROL';
  if (wanted === 'BALL') return candidateClass.subtype === 'BALL';
  if (wanted === 'GATE') return candidateClass.subtype === 'GATE';
  if (wanted === 'GLOBE') return candidateClass.subtype === 'GLOBE';
  if (wanted === 'CHECK') return candidateClass.subtype === 'CHECK';
  if (wanted === 'BUTTERFLY') return candidateClass.subtype === 'BUTTERFLY';
  return false;
}

export function estimateFromSortedRows(matches, targetLength, config) {
  const target = Number(targetLength);
  if (!matches.length || !Number.isFinite(target)) return null;
  let method = 'length-extrapolated';
  let selected = null;
  let reference = matches[0];
  let referenceLabel = '';
  if (matches.length === 1) {
    reference = matches[0];
    selected = ratioFromNearest(reference, target);
    referenceLabel = `${Number(reference.rowLength).toFixed(1)}mm`;
  } else {
    let lower = null;
    let upper = null;
    for (const candidate of matches) {
      if (Number(candidate.rowLength) <= target) lower = candidate;
      if (Number(candidate.rowLength) >= target && !upper) upper = candidate;
    }
    if (lower && upper && lower !== upper) {
      method = 'length-interpolated';
      selected = interpolateBetween(lower, upper, target);
      reference = Math.abs(Number(lower.rowLength) - target) <= Math.abs(Number(upper.rowLength) - target) ? lower : upper;
      referenceLabel = `${Number(lower.rowLength).toFixed(1)}-${Number(upper.rowLength).toFixed(1)}mm`;
    } else {
      const pair = target < Number(matches[0].rowLength) ? [matches[0], matches[1]] : [matches[matches.length - 2], matches[matches.length - 1]];
      selected = interpolateBetween(pair[0], pair[1], target);
      reference = Math.abs(Number(pair[0].rowLength) - target) <= Math.abs(Number(pair[1].rowLength) - target) ? pair[0] : pair[1];
      referenceLabel = `${Number(pair[0].rowLength).toFixed(1)}-${Number(pair[1].rowLength).toFixed(1)}mm`;
    }
    if (!Number.isFinite(selected) || selected <= 0) selected = ratioFromNearest(reference, target);
  }
  const ratio = target / Number(reference.rowLength);
  const minRatio = numberOr(config?.weight?.extrapolationMinRatio, 0.65);
  const maxRatio = numberOr(config?.weight?.extrapolationMaxRatio, 1.6);
  return { reference, selectedWeight: roundWeight(selected), method, referenceLabel, lengthDelta: Math.abs(Number(reference.rowLength) - target), oddEntry: method === 'length-extrapolated' && (ratio < minRatio || ratio > maxRatio), ratio };
}

export function specialValveFactorCandidate({ rows, context, config, wantedRating, nodeHint, toleranceMm }) {
  const rule = matchedSpecialFactorRule(context, config);
  if (!rule) return null;
  const baseRows = sameBoreRatingRows(rows, config, { boreMm: context?.boreMm, wantedRating, lengthMm: context?.lengthMm });
  const targetCandidates = [];
  for (const target of rule.targets) {
    const subset = baseRows.filter((candidate) => candidateMatchesSemanticCode(candidate, target.code, config));
    const estimate = estimateFromSortedRows(subset, context?.lengthMm, config);
    if (!estimate || !Number.isFinite(estimate.selectedWeight) || estimate.selectedWeight <= 0) continue;
    const selectedWeight = roundWeight(estimate.selectedWeight * target.factor);
    targetCandidates.push({ target, estimate, selectedWeight });
  }
  targetCandidates.sort((a, b) => b.selectedWeight - a.selectedWeight);
  const best = targetCandidates[0];
  if (!best) {
    // No target-semantic-code rows for this bore/rating (e.g. no CONTROL/BALL in master).
    // Apply the rule factor to the nearest available same-bore-rating row as a fallback.
    const fe = estimateFromSortedRows(baseRows, context?.lengthMm, config);
    if (!fe || !Number.isFinite(fe.selectedWeight) || fe.selectedWeight <= 0) return null;
    const ft = rule.targets[0];
    const fw = roundWeight(fe.selectedWeight * ft.factor);
    const fr = fe.reference;
    const fl = `${rule.label}: ${ft.factor}x (no ${ft.label || ft.code} in master, applied to nearest valve)`;
    return { ...fr, masterWeight: Number(fr.weight), selectedWeight: fw, suggestedWeight: fw, weight: fw, weightMethod: 'special-factor', weightWarning: `${fl}; ${fe.method} within ${fe.referenceLabel}${fe.oddEntry ? '; odd extrapolation ratio flagged' : ''}.`, inferredWeight: true, fallbackSuggestion: true, specialFactorRule: true, specialFactorCode: rule.code, oddEntry: fe.oddEntry, extrapolationRatio: fe.ratio, rowBore: Number(context?.boreMm), rowRating: wantedRating, lengthDelta: fe.lengthDelta, boreDelta: 0, ratingExact: true, ratingScore: 1, score: 0.75, candidateClass: classifyWeightMasterCandidate(fr), lengthQualified: false, lengthToleranceMm: toleranceMm, nodeValveHint: nodeHint, valveHintLabel: formatValveHint(nodeHint), semanticTier: 5000 - rule.priority, semanticPotentialTier: 5000 - rule.priority, semanticReason: fl, semanticSource: 'DTXR factor', rejectedReason: '', preferred: false, type: fr.type || rule.label, valveType: fr.valveType || rule.label, typeDesc: fl };
  }
  const reference = best.estimate.reference;
  const label = `${rule.label}: ${best.target.factor} x ${best.target.label || best.target.code}`;
  return { ...reference, masterWeight: Number(reference.weight), selectedWeight: best.selectedWeight, suggestedWeight: best.selectedWeight, weight: best.selectedWeight, weightMethod: 'special-factor', weightWarning: `${label}; ${best.estimate.method} within ${best.estimate.referenceLabel}${best.estimate.oddEntry ? '; odd extrapolation ratio flagged' : ''}.`, inferredWeight: true, fallbackSuggestion: true, specialFactorRule: true, specialFactorCode: rule.code, oddEntry: best.estimate.oddEntry, extrapolationRatio: best.estimate.ratio, rowBore: Number(context?.boreMm), rowRating: wantedRating, lengthDelta: best.estimate.lengthDelta, boreDelta: 0, ratingExact: true, ratingScore: 1, score: 0.75, candidateClass: classifyWeightMasterCandidate(reference), lengthQualified: false, lengthToleranceMm: toleranceMm, nodeValveHint: nodeHint, valveHintLabel: formatValveHint(nodeHint), semanticTier: 5000 - rule.priority, semanticPotentialTier: 5000 - rule.priority, semanticReason: label, semanticSource: 'DTXR factor', rejectedReason: '', preferred: false, type: reference.type || rule.label, valveType: reference.valveType || rule.label, typeDesc: label };
}

export function zeroWeightFallback({ boreMm, wantedRating, lengthMm, nodeHint }) { const length = Number(lengthMm); return { weight: 0, masterWeight: 0, selectedWeight: 0, suggestedWeight: 0, weightMethod: 'no-same-bore-rating', weightWarning: 'No matching weight master rows with the same bore and rating; defaulted to 0 kg for explicit review.', inferredWeight: true, fallbackSuggestion: true, zeroFallback: true, rowBore: Number(boreMm), rowRating: wantedRating, rowLength: Number.isFinite(length) ? length : 0, type: 'Fallback', valveType: 'Fallback', typeDesc: 'No same Bore/Rating master row', rowData: null, lengthDelta: 0, boreDelta: 0, ratingExact: Boolean(wantedRating), ratingScore: wantedRating ? 1 : 0, score: 0, candidateClass: { family: '', subtype: '' }, lengthQualified: false, lengthToleranceMm: 0, nodeValveHint: nodeHint, valveHintLabel: formatValveHint(nodeHint), semanticTier: 0, semanticPotentialTier: 0, semanticReason: 'No same bore/rating master rows', semanticSource: '', rejectedReason: '', preferred: false }; }

export function sameBoreRatingInterpolationFallback({ rows, context, config, wantedRating, nodeHint, toleranceMm }) { const { boreMm, lengthMm } = context || {}; const target = Number(lengthMm); if (boreMm === null || boreMm === undefined || !wantedRating || !Number.isFinite(target)) return null; const matches = sameBoreRatingRows(rows, config, { boreMm, wantedRating, lengthMm }); if (!matches.length) return zeroWeightFallback({ boreMm, wantedRating, lengthMm, nodeHint }); let method = 'length-extrapolated'; let selected = null; let reference = matches[0]; let referenceLabel = ''; if (matches.length === 1) { reference = matches[0]; selected = ratioFromNearest(reference, target); referenceLabel = `${Number(reference.rowLength).toFixed(1)}mm`; } else { let lower = null; let upper = null; for (const candidate of matches) { if (Number(candidate.rowLength) <= target) lower = candidate; if (Number(candidate.rowLength) >= target && !upper) upper = candidate; } if (lower && upper && lower !== upper) { method = 'length-interpolated'; selected = interpolateBetween(lower, upper, target); reference = Math.abs(Number(lower.rowLength) - target) <= Math.abs(Number(upper.rowLength) - target) ? lower : upper; referenceLabel = `${Number(lower.rowLength).toFixed(1)}-${Number(upper.rowLength).toFixed(1)}mm`; } else { const pair = target < Number(matches[0].rowLength) ? [matches[0], matches[1]] : [matches[matches.length - 2], matches[matches.length - 1]]; selected = interpolateBetween(pair[0], pair[1], target); reference = Math.abs(Number(pair[0].rowLength) - target) <= Math.abs(Number(pair[1].rowLength) - target) ? pair[0] : pair[1]; referenceLabel = `${Number(pair[0].rowLength).toFixed(1)}-${Number(pair[0].rowLength).toFixed(1)}mm`; } if (!Number.isFinite(selected) || selected <= 0) selected = ratioFromNearest(reference, target); } const selectedWeight = roundWeight(selected); if (!Number.isFinite(selectedWeight) || selectedWeight <= 0) return zeroWeightFallback({ boreMm, wantedRating, lengthMm, nodeHint }); const lengthDelta = Math.abs(Number(reference.rowLength) - target); const label = method === 'length-interpolated' ? 'Interpolated' : 'Extrapolated'; return { ...reference, masterWeight: Number(reference.weight), selectedWeight, suggestedWeight: selectedWeight, weight: selectedWeight, weightMethod: method, weightWarning: `${label} from same Bore ${Number(boreMm).toFixed(0)} / Rating ${wantedRating} master row(s) at ${referenceLabel}.`, inferredWeight: true, fallbackSuggestion: true, zeroFallback: false, rowBore: Number(boreMm), rowRating: wantedRating, lengthDelta, boreDelta: 0, ratingExact: true, ratingScore: 1, score: 0.5, candidateClass: classifyWeightMasterCandidate(reference), lengthQualified: false, lengthToleranceMm: toleranceMm, nodeValveHint: nodeHint, valveHintLabel: formatValveHint(nodeHint), semanticTier: 0, semanticPotentialTier: 0, semanticReason: label, semanticSource: '', rejectedReason: '', preferred: false, type: reference.type || label, valveType: reference.valveType || label, typeDesc: `${label} from same Bore/Rating` }; }

export function enrichWeightCandidate({ candidate, nodeHint, semanticSource, xmlLengthMm, toleranceMm, config, wantedRating, boreMm }) { const lengthDelta = Number.isFinite(candidate.lengthDelta) ? candidate.lengthDelta : Math.abs(Number(candidate.rowLength) - Number(xmlLengthMm)); const boreDelta = Number.isFinite(candidate.boreDelta) ? candidate.boreDelta : Math.abs(Number(candidate.rowBore) - Number(boreMm)); const ratingExact = candidate.rowRating === wantedRating; const ratingPartial = !ratingExact && candidate.rowRating && wantedRating && (candidate.rowRating.includes(wantedRating) || wantedRating.includes(candidate.rowRating)); const ratingScore = ratingExact ? 1 : (ratingPartial ? 0.65 : 0); const lengthQualified = Number.isFinite(lengthDelta) && lengthDelta <= toleranceMm; const candidateClass = classifyWeightMasterCandidate(candidate); const semantic = scoreSemanticSource(semanticSource, candidate, config); const oldHintSemantic = semantic.tier ? semantic : scoreValveHintAgainstCandidate(nodeHint, candidateClass, candidate); const weightInfo = resolveCandidateWeight(candidate, xmlLengthMm, config); const boreScore = Math.max(0, 1 - Math.min(boreDelta / Math.max(Math.abs(Number(boreMm)) * 0.25, 25), 1)); const lengthScore = 1 - Math.min(lengthDelta / Math.max(toleranceMm, 1), 1); const score = ((ratingScore * 3) + (boreScore * 2) + lengthScore) / 6; return { ...candidate, ...weightInfo, lengthDelta, boreDelta, ratingExact, ratingScore, score, candidateClass, lengthQualified, lengthToleranceMm: toleranceMm, nodeValveHint: nodeHint, valveHintLabel: formatValveHint(nodeHint), semanticTier: lengthQualified ? oldHintSemantic.tier : 0, semanticPotentialTier: oldHintSemantic.tier, semanticReason: oldHintSemantic.reason, semanticSource: semanticSource?.source || '', rejectedReason: lengthQualified ? '' : `length failed, Δ${lengthDelta.toFixed(1)}mm > ±${toleranceMm}mm`, preferred: ratingExact && boreDelta < 1 && lengthQualified && Number(weightInfo.selectedWeight) > 0 }; }

export function compareRankedWeightCandidates(a, b) { return (b.semanticTier - a.semanticTier) || (Number(b.preferred) - Number(a.preferred)) || (b.score - a.score) || (a.lengthDelta - b.lengthDelta) || (a.boreDelta - b.boreDelta); }

export function compareRejectedWeightCandidates(a, b) { return (b.semanticPotentialTier - a.semanticPotentialTier) || (a.lengthDelta - b.lengthDelta) || (b.score - a.score) || (a.boreDelta - b.boreDelta); }
// This index lives for exactly one Preview calculation. Filtering by the
// same bore predicate as the ranker preserves master row order and every
// selected candidate, including fallback and special-factor candidates.

export function createXmlCiiWeightBoreIndex(config = {}) {
  const rows = Array.isArray(config?.weight?.masterRows) ? config.weight.masterRows : [];
  const memo = new Map();
  return {
    forBore(boreMm) {
      const bore = Number(boreMm);
      if (!Number.isFinite(bore)) return rows;
      if (!memo.has(bore)) {
        memo.set(bore, rows.filter((row) => {
          const rowBore = pickNumber(row, ['boreMm', 'convertedBore', 'Converted Bore', 'bore', 'Bore', 'BORE', 'DN', 'NB', 'NPS']);
          return rowBore !== null && Number.isFinite(rowBore) && Math.abs(rowBore - bore) < 1;
        }));
      }
      return memo.get(bore);
    },
  };
}

export function rankXmlCiiWeightCandidatesCore(context, config, options = {}) { ensureValveHintConfig(config || {}); const { boreMm, rating, lengthMm, nodeName = '' } = context || {}; if (boreMm === null || boreMm === undefined || lengthMm === null || lengthMm === undefined) return { nodeHint: null, candidates: [], rejectedCandidates: [], best: null }; const rows = Array.isArray(config?.weight?.masterRows) ? config.weight.masterRows : []; const candidateRows = options.candidateRows || rows; const wantedRating = normalizedRating(rating); const nodeHint = useNodeNameValveHints(config) ? resolveNodeNameValveHint(nodeName, config) : null; const semanticSource = semanticSourceForContext(context, nodeHint, config); if (!rows.length) { const zero = zeroWeightFallback({ boreMm, wantedRating, lengthMm, nodeHint }); return { nodeHint, semanticSource, candidates: [zero], rejectedCandidates: [], best: zero }; } const toleranceMm = valveHintLengthToleranceMm(config); const includeRejected = options.includeRejected !== false && config?.weight?.showLengthRejectedSemanticMatches !== false; const ranked = []; const rejected = []; for (const row of candidateRows) { const base = baseCandidateFromRow(row, config, lengthMm); if (!base) continue; const boreDelta = Math.abs(base.rowBore - Number(boreMm)); if (!Number.isFinite(boreDelta) || boreDelta >= 1) continue; const ratingExact = base.rowRating === wantedRating; const ratingPartial = !ratingExact && base.rowRating && wantedRating && (base.rowRating.includes(wantedRating) || wantedRating.includes(base.rowRating)); if (!ratingExact && !ratingPartial) continue; const enriched = enrichWeightCandidate({ candidate: { ...base, boreDelta }, nodeHint, semanticSource, xmlLengthMm: lengthMm, toleranceMm, config, wantedRating, boreMm }); if (enriched.lengthQualified) ranked.push(enriched); else if (includeRejected && enriched.semanticPotentialTier > 0) rejected.push(enriched); } const special = specialValveFactorCandidate({ rows: candidateRows, context: { ...(context || {}), boreMm, lengthMm }, config, wantedRating, nodeHint, toleranceMm }); if (special) ranked.push(special); ranked.sort(compareRankedWeightCandidates); rejected.sort(compareRejectedWeightCandidates); if (!ranked.length) { const fallback = sameBoreRatingInterpolationFallback({ rows: candidateRows, context, config, wantedRating, nodeHint, toleranceMm }); if (fallback) ranked.push(fallback); } return { nodeHint, semanticSource, candidates: ranked, rejectedCandidates: rejected, best: ranked[0] || null }; }

export let weightHintRankCalls = 0;

export function rankXmlCiiWeightCandidates(context, config, options = {}) {
  // One mark per 256 calls avoids making profiling itself a hot path.
  const sample = (++weightHintRankCalls % 256) === 0;
  const perf = sample && typeof performance !== 'undefined' ? performance : null;
  perf?.mark?.('xml-cii:weight-hints:rank:start');
  try { return rankXmlCiiWeightCandidatesCore(context, config, options); }
  finally {
    perf?.mark?.('xml-cii:weight-hints:rank:end');
    perf?.measure?.('xml-cii:weight-hints:rank',
      'xml-cii:weight-hints:rank:start', 'xml-cii:weight-hints:rank:end');
  }
}
