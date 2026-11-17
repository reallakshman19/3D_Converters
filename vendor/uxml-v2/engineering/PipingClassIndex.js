// Ported from 3D_Converters v045/converters/xml-cii2019-core/piping-class-resolver.js (UXML step 4, engineering resolvers): only the code the recorded calls reach.

export const DEFAULT_PIPING_CLASS_MATCH_CONFIG = Object.freeze({
  classExactScore: 1000,
  overrideScore: 1100,
  leadingNumericExactScore: 940,
  prefixBaseScore: 910,
  startsWithScore: 860,
  numericFamilyBaseScore: 800,
  numericFamilyPrefixWeight: 35,
  fuzzyRatioWeight: 780,
  fuzzyMinRatio: 0.60,
  ambiguousScoreDelta: 50,
  minAcceptScore: 760,
  reviewBelowConfidence: 1.0,
  maxCandidates: 8,
  rowScoring: Object.freeze({
    boreToleranceMm: 1.0,
    classExactWeight: 1000,
    boreExactWeight: 300,
    boreNearWeight: 220,
    componentExactWeight: 180,
    pipeRigidWeight: 120,
    ratingExactWeight: 80,
    scheduleExactWeight: 60,
    minAcceptScore: 1000,
    ambiguousScoreDelta: 50,
  }),
});

// Bounded normalization cache: a class label is immutable text, reused across
// thousands of row comparisons. Never cache objects or mutable master rows.

export const normalizedClassStrings = new Map();

export const PIPE_CLASS_CACHE_LIMIT = 16384;

export let normalizeClassMemoHits = 0;

export const indexedClassWork = new WeakMap();

export function text(value) { return value === undefined || value === null ? '' : String(value).trim(); }

export function number(value) {
  const match = text(value).replace(/,/g, '').match(/[-+]?\d*\.?\d+/);
  const numeric = match ? Number(match[0]) : NaN;
  return Number.isFinite(numeric) ? numeric : null;
}

export function normalizePipingClass(value) {
  const raw = text(value);
  if (normalizedClassStrings.has(raw)) {
    normalizeClassMemoHits += 1;
    return normalizedClassStrings.get(raw);
  }
  const result = raw.toUpperCase().replace(/^=/, '').replace(/\s+/g, '').replace(/[^A-Z0-9]/g, '');
  if (normalizedClassStrings.size >= PIPE_CLASS_CACHE_LIMIT) normalizedClassStrings.clear();
  normalizedClassStrings.set(raw, result);
  return result;
}

export function displayPipingClass(value) { return text(value).toUpperCase(); }

export function mergeConfig(config = {}) {
  const supplied = config?.pipingClassMatch || config || {};
  return {
    ...DEFAULT_PIPING_CLASS_MATCH_CONFIG,
    ...supplied,
    rowScoring: {
      ...DEFAULT_PIPING_CLASS_MATCH_CONFIG.rowScoring,
      ...(supplied.rowScoring || config?.rowScoring || {}),
    },
  };
}

export function readClassFromRow(row, fieldMap = {}) {
  return row?.[fieldMap.pipingClass]
    ?? row?.pipingClass
    ?? row?.['Piping Class']
    ?? row?.PIPING_CLASS
    ?? row?.Class
    ?? row?.SPEC
    ?? row?.Spec
    ?? '';
}

export function leadingDigits(value) { return normalizePipingClass(value).match(/^\d+/)?.[0] || ''; }

export function commonPrefixLength(left, right) {
  let index = 0;
  while (index < left.length && index < right.length && left[index] === right[index]) index += 1;
  return index;
}

export function sequenceRatio(left, right) {
  const a = normalizePipingClass(left).toLowerCase();
  const b = normalizePipingClass(right).toLowerCase();
  if (!a || !b) return 0;
  const row = Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = 0;
    for (let j = 1; j <= b.length; j += 1) {
      const prior = row[j];
      row[j] = a[i - 1] === b[j - 1] ? diagonal + 1 : Math.max(row[j], row[j - 1]);
      diagonal = prior;
    }
  }
  return (2 * row[b.length]) / (a.length + b.length);
}

export function overrideForClass(overrides, requestedClass) {
  const bucket = overrides?.pipingClass || overrides?.pipingClassApprox || overrides?.approxPipingClass || {};
  const requested = normalizePipingClass(requestedClass);
  for (const [key, value] of Object.entries(bucket)) {
    if (normalizePipingClass(key) === requested && text(value)) return displayPipingClass(value);
  }
  return '';
}

export function uniqueClasses(values) {
  const output = [];
  const seen = new Set();
  for (const value of values || []) {
    const raw = displayPipingClass(value);
    const normalized = normalizePipingClass(raw);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    output.push(raw);
  }
  return output;
}

export function knownClassesFromIndex(index) {
  if (Array.isArray(index?.knownClasses)) return uniqueClasses(index.knownClasses);
  if (index?.byClass instanceof Map) return uniqueClasses([...index.byClass.keys()]);
  if (index instanceof Map) return uniqueClasses([...index.keys()]);
  return [];
}

export function rowsForClass(index, pipingClass) {
  const key = normalizePipingClass(pipingClass);
  if (!key) return [];
  if (index?.byClass instanceof Map) return index.byClass.get(key) || [];
  if (index instanceof Map) return index.get(key) || [];
  return [];
}

export function familyCandidates(requestedClass, classes) {
  const requestedDigits = leadingDigits(requestedClass);
  if (!requestedDigits) return classes;
  const ranked = classes.map((candidate) => ({
    candidate,
    depth: commonPrefixLength(requestedDigits, leadingDigits(candidate)),
  }));
  const maxDepth = Math.max(0, ...ranked.map((item) => item.depth));
  return maxDepth > 0 ? ranked.filter((item) => item.depth === maxDepth).map((item) => item.candidate) : [];
}
