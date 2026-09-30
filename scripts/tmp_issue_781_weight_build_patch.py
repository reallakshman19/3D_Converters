from pathlib import Path

ROOT = Path('.')


def replace_once(path, old, new):
    p = ROOT / path
    text = p.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one exact match, found {count}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')


def mirror(src):
    source = (ROOT / src).read_text(encoding='utf-8')
    dst = ROOT / 'docs' / src
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(source, encoding='utf-8')

# 1) Ordinary Weight Match build must not implicitly request empirical validation.
validation_path = 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-weight-validation-report.js'
replace_once(
    validation_path,
    "  card.addEventListener('click', (event) => {\n    if (event.target?.closest?.('#mc-wm-refresh') && typeof window !== 'undefined') window.__xmlCiiPendingValidation = true;\n  }, true);\n\n",
    "",
)
mirror(validation_path)

# 2) Shared Weight Match build is single-flight. Keep compute body byte-for-byte otherwise.
renderer_path = 'tabs/model-converters/converters/xmltocii2019_helper/weight-match-renderer.js'
replace_once(renderer_path, "  const compute = async (opts = {}) => {", "  const computeCore = async (opts = {}) => {")
replace_once(
    renderer_path,
    "  };\n  detailEl.querySelector('#mc-wm-refresh')?.addEventListener('click', () => compute({ force: true }));",
    "  };\n  const refreshEl = detailEl.querySelector('#mc-wm-refresh');\n  let activeComputePromise = null;\n  const compute = (opts = {}) => {\n    if (activeComputePromise) {\n      status('Weight Match build already running…');\n      return activeComputePromise;\n    }\n    if (refreshEl) {\n      refreshEl.disabled = true;\n      refreshEl.dataset.wmBusy = 'true';\n    }\n    activeComputePromise = computeCore(opts).finally(() => {\n      activeComputePromise = null;\n      if (refreshEl) {\n        refreshEl.disabled = false;\n        delete refreshEl.dataset.wmBusy;\n      }\n    });\n    return activeComputePromise;\n  };\n  refreshEl?.addEventListener('click', () => compute({ force: true }));",
)
mirror(renderer_path)

# 3) Index the existing bore/rating eligibility boundary by immutable masterRows array identity.
hints_path = 'converters/xml-cii2019-core/weight-valve-hints.js'
index_helper = r'''const weightMasterEligibilityIndexCache = new WeakMap();
const WEIGHT_MASTER_BORE_KEYS = ['boreMm', 'convertedBore', 'Converted Bore', 'bore', 'Bore', 'BORE', 'DN', 'NB', 'NPS'];
const WEIGHT_MASTER_RATING_KEYS = ['ratingClass', 'rating', 'Rating', 'RATING', 'Class', 'CLASS', 'Pressure Class'];
function weightMasterEligibilityIndex(rows) {
  if (!Array.isArray(rows)) return { byBoreBucket: new Map() };
  const cached = weightMasterEligibilityIndexCache.get(rows);
  if (cached) return cached;
  const byBoreBucket = new Map();
  rows.forEach((row, index) => {
    const rowBore = pickNumber(row, WEIGHT_MASTER_BORE_KEYS);
    const rowRating = normalizedRating(pickText(row, WEIGHT_MASTER_RATING_KEYS));
    if (!Number.isFinite(Number(rowBore)) || !rowRating) return;
    const bucket = Math.floor(Number(rowBore));
    const entries = byBoreBucket.get(bucket) || [];
    entries.push({ row, index, rowBore: Number(rowBore), rowRating });
    byBoreBucket.set(bucket, entries);
  });
  const built = { byBoreBucket };
  weightMasterEligibilityIndexCache.set(rows, built);
  return built;
}
export function weightMasterEligibleRows(rows, boreMm, rating) {
  if (!Array.isArray(rows) || !rows.length) return [];
  const bore = Number(boreMm);
  const wantedRating = normalizedRating(rating);
  if (!Number.isFinite(bore) || !wantedRating) return [];
  const { byBoreBucket } = weightMasterEligibilityIndex(rows);
  const entries = [];
  for (let bucket = Math.floor(bore - 1); bucket <= Math.floor(bore + 1); bucket += 1) {
    entries.push(...(byBoreBucket.get(bucket) || []));
  }
  return entries
    .filter((entry) => {
      const boreDelta = Math.abs(entry.rowBore - bore);
      if (!Number.isFinite(boreDelta) || boreDelta >= 1) return false;
      const ratingExact = entry.rowRating === wantedRating;
      const ratingPartial = !ratingExact && entry.rowRating && wantedRating
        && (entry.rowRating.includes(wantedRating) || wantedRating.includes(entry.rowRating));
      return ratingExact || ratingPartial;
    })
    .sort((left, right) => left.index - right.index)
    .map((entry) => entry.row);
}
'''
needle = "function sameBoreRatingRows(rows, config, { boreMm, wantedRating, lengthMm }) {"
replace_once(hints_path, needle, index_helper + needle)
replace_once(
    hints_path,
    "const toleranceMm = valveHintLengthToleranceMm(config); const includeRejected = options.includeRejected !== false && config?.weight?.showLengthRejectedSemanticMatches !== false; const ranked = []; const rejected = []; for (const row of rows) {",
    "const eligibleRows = weightMasterEligibleRows(rows, boreMm, wantedRating); const toleranceMm = valveHintLengthToleranceMm(config); const includeRejected = options.includeRejected !== false && config?.weight?.showLengthRejectedSemanticMatches !== false; const ranked = []; const rejected = []; for (const row of eligibleRows) {",
)
replace_once(
    hints_path,
    "const special = specialValveFactorCandidate({ rows, context: { ...(context || {}), boreMm, lengthMm }, config, wantedRating, nodeHint, toleranceMm });",
    "const special = specialValveFactorCandidate({ rows: eligibleRows, context: { ...(context || {}), boreMm, lengthMm }, config, wantedRating, nodeHint, toleranceMm });",
)
replace_once(
    hints_path,
    "const fallback = sameBoreRatingInterpolationFallback({ rows, context, config, wantedRating, nodeHint, toleranceMm });",
    "const fallback = sameBoreRatingInterpolationFallback({ rows: eligibleRows, context, config, wantedRating, nodeHint, toleranceMm });",
)
mirror(hints_path)

# Focused regression for the user-reported apparent loop and large-master scaling.
test_path = ROOT / 'tests/xml-cii-issue-781-weight-build-performance.test.mjs'
test_path.write_text(r'''import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  rankXmlCiiWeightCandidates,
  weightMasterEligibleRows,
} from '../converters/xml-cii2019-core/weight-valve-hints.js';

function normRating(value) {
  return String(value ?? '').replace(/#/g, '').trim().toUpperCase();
}
function boreOf(row) {
  for (const key of ['boreMm', 'convertedBore', 'Converted Bore', 'bore', 'Bore', 'BORE', 'DN', 'NB', 'NPS']) {
    const match = String(row?.[key] ?? row?._raw?.[key] ?? '').replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
    if (match && Number.isFinite(Number(match[0]))) return Number(match[0]);
  }
  return null;
}
function ratingOf(row) {
  for (const key of ['ratingClass', 'rating', 'Rating', 'RATING', 'Class', 'CLASS', 'Pressure Class']) {
    const value = row?.[key] ?? row?._raw?.[key];
    if (String(value ?? '').trim()) return normRating(value);
  }
  return '';
}
function bruteEligible(rows, bore, rating) {
  const wanted = normRating(rating);
  return rows.filter((row) => {
    const rowBore = boreOf(row);
    if (!Number.isFinite(rowBore) || Math.abs(rowBore - Number(bore)) >= 1) return false;
    const rowRating = ratingOf(row);
    const exact = rowRating === wanted;
    const partial = !exact && rowRating && wanted && (rowRating.includes(wanted) || wanted.includes(rowRating));
    return exact || partial;
  });
}
function signature(result) {
  return {
    candidates: (result.candidates || []).map((row) => [row.rowData?.id, row.selectedWeight, row.weightMethod, row.preferred, row.semanticTier, row.lengthDelta]),
    rejected: (result.rejectedCandidates || []).map((row) => [row.rowData?.id, row.selectedWeight, row.weightMethod, row.semanticPotentialTier, row.lengthDelta]),
    best: result.best?.rowData?.id || null,
  };
}

test('indexed Weight eligibility preserves exact existing bore/rating semantics and source order', () => {
  const rows = [
    { id: 'far-bore', boreMm: 98.99, rating: '150', lengthMm: 100, weight: 1, typeDesc: 'Gate Valve' },
    { id: 'exact', boreMm: 100, rating: '150', lengthMm: 100, weight: 10, typeDesc: 'Gate Valve' },
    { id: 'partial', boreMm: 100.4, rating: 'CL150', lengthMm: 101, weight: 11, typeDesc: 'Gate Valve' },
    { id: 'boundary-in', boreMm: 100.999, rating: '150', lengthMm: 102, weight: 12, typeDesc: 'Gate Valve' },
    { id: 'boundary-out', boreMm: 101, rating: '150', lengthMm: 103, weight: 13, typeDesc: 'Gate Valve' },
    { id: 'wrong-rating', boreMm: 100, rating: '300', lengthMm: 100, weight: 14, typeDesc: 'Gate Valve' },
  ];
  const expected = bruteEligible(rows, 100, '150');
  const actual = weightMasterEligibleRows(rows, 100, '150');
  assert.deepEqual(actual.map((row) => row.id), expected.map((row) => row.id));
});

test('indexed full-master ranking is semantically identical to brute-force eligible subset ranking', () => {
  const rows = [
    { id: 'noise-1', boreMm: 50, rating: '150', lengthMm: 100, weight: 3, typeDesc: 'Gate Valve' },
    { id: 'exact-gate', boreMm: 100, rating: '150', lengthMm: 100, weight: 10, typeDesc: 'Gate Valve' },
    { id: 'partial-ball', boreMm: 100.2, rating: 'CL150', lengthMm: 101, weight: 11, typeDesc: 'Ball Valve' },
    { id: 'rejected-gate', boreMm: 100, rating: '150', lengthMm: 140, weight: 15, typeDesc: 'Gate Valve' },
    { id: 'noise-2', boreMm: 100, rating: '300', lengthMm: 100, weight: 30, typeDesc: 'Gate Valve' },
  ];
  const context = { boreMm: 100, rating: '150', lengthMm: 100, nodeName: 'VGT-01', componentType: 'VALV' };
  const config = { weight: { masterRows: rows, valveHintLengthToleranceMm: 6 } };
  const full = rankXmlCiiWeightCandidates(context, config, { includeRejected: true });
  const subset = bruteEligible(rows, context.boreMm, context.rating);
  const brute = rankXmlCiiWeightCandidates(context, { weight: { ...config.weight, masterRows: subset } }, { includeRejected: true });
  assert.deepEqual(signature(full), signature(brute));
});

test('repeated ranking reuses the master eligibility index instead of rescanning 10k master rows', () => {
  let accesses = 0;
  const rows = Array.from({ length: 10000 }, (_, index) => {
    const bore = index * 3;
    return {
      id: `row-${index}`,
      get boreMm() { accesses += 1; return bore; },
      get rating() { accesses += 1; return '150'; },
      lengthMm: 100,
      weight: 10 + index / 100,
      typeDesc: 'Gate Valve',
    };
  });
  const context = { boreMm: 15000, rating: '150', lengthMm: 100, componentType: 'VALV' };
  const config = { weight: { masterRows: rows, valveHintLengthToleranceMm: 6 } };
  rankXmlCiiWeightCandidates(context, config, { includeRejected: true });
  accesses = 0;
  const result = rankXmlCiiWeightCandidates(context, config, { includeRejected: true });
  assert.ok(result.candidates.length > 0);
  assert.ok(accesses < 100, `expected indexed repeat scan below 100 getter reads, received ${accesses}`);
});

test('normal Build Weight Data no longer arms empirical validation; Build report remains explicit authority', () => {
  const report = fs.readFileSync('tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-weight-validation-report.js', 'utf8');
  const pendingAssignments = report.match(/__xmlCiiPendingValidation\s*=\s*true/g) || [];
  assert.equal(pendingAssignments.length, 1, 'only explicit Build report may arm empirical validation');
  assert.match(report, /section\.querySelector\('\[data-ewv-build\]'\)\?\.addEventListener\('click',[\s\S]*?__xmlCiiPendingValidation\s*=\s*true[\s\S]*?refresh\.click\(\)/);
  assert.doesNotMatch(report, /card\.addEventListener\('click',[\s\S]{0,300}#mc-wm-refresh/);
});

test('shared Weight Match compute is single-flight and exposes busy state', () => {
  const renderer = fs.readFileSync('tabs/model-converters/converters/xmltocii2019_helper/weight-match-renderer.js', 'utf8');
  assert.match(renderer, /const computeCore = async \(opts = \{\}\) => \{/);
  assert.match(renderer, /let activeComputePromise = null;/);
  assert.match(renderer, /if \(activeComputePromise\)[\s\S]*?return activeComputePromise;/);
  assert.match(renderer, /refreshEl\.disabled = true;/);
  assert.match(renderer, /refreshEl\.dataset\.wmBusy = 'true';/);
  assert.match(renderer, /computeCore\(opts\)\.finally\(\(\) => \{/);
  assert.match(renderer, /refreshEl\.disabled = false;/);
});

test('modified Weight Build runtime files remain byte-identical to docs mirrors', () => {
  for (const path of [
    'converters/xml-cii2019-core/weight-valve-hints.js',
    'tabs/model-converters/converters/xmltocii2019_helper/weight-match-renderer.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-weight-validation-report.js',
  ]) {
    assert.equal(fs.readFileSync(path, 'utf8'), fs.readFileSync(`docs/${path}`, 'utf8'), path);
  }
});
''', encoding='utf-8')

print('Issue #781 Weight Build patch applied')
