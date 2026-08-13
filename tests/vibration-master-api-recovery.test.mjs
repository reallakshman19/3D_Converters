import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  VIBRATION_MASTER_API_CONVERSION_SCHEMA,
  VIBRATION_MASTER_API_DISCOVERY_SCHEMA,
  VIBRATION_MASTER_API_SOURCE_PATH,
  VIBRATION_MASTER_API_TARGETS,
  buildConvertPayload,
  buildSearchPayload,
  convertVibrationMasterSelections,
  discoverVibrationMasterSources,
  sanitizeConversionResult,
  sanitizeSearchResult,
} from '../scripts/fetch-vibration-master-sections-via-api.mjs';

const ROOT = new URL('../', import.meta.url);
const source = (filePath) => fs.readFileSync(new URL(filePath, ROOT), 'utf8');

const EXPECTED_BLOB = '9d3eccc56429411e17c07a579bdebbd13cb0bdc5';
const EXPECTED_SIZE = 10348594;
const SOURCE_SHA = `sha256:${'a'.repeat(64)}`;

function searchResult({ page = 82, extraction = 'embedded-text' } = {}) {
  return {
    searchHash: `sha256:${'b'.repeat(64)}`,
    indexId: `sha256:${'c'.repeat(64)}`,
    source: { logicalPath: VIBRATION_MASTER_API_SOURCE_PATH, sizeBytes: EXPECTED_SIZE, sha256: SOURCE_SHA },
    index: { cacheSource: 'built', totalPages: 180 },
    matches: [{
      id: 'pdf-search:fixture', page, itemId: `native:p${page}:l1`, matchText: 'Table T3-1',
      lineText: 'licensed source text must not enter the public receipt', snippet: 'licensed snippet',
      bbox: [1, 2, 3, 4], bboxPrecision: 'line', extraction,
    }],
    summary: { totalMatches: 1, pagesWithMatches: [{ page, matches: 1 }] },
  };
}

function conversionResult({ start = 81, end = 81, blob = EXPECTED_BLOB } = {}) {
  return {
    requestHash: `sha256:${'d'.repeat(64)}`,
    markdownSha256: `sha256:${'e'.repeat(64)}`,
    converterOptionsHash: `sha256:${'f'.repeat(64)}`,
    markdown: '**Row 1**\n- C1: source-derived review text',
    source: { logicalPath: VIBRATION_MASTER_API_SOURCE_PATH, sizeBytes: EXPECTED_SIZE, sha256: SOURCE_SHA },
    pageRange: { start, end, count: end - start + 1 },
    evidence: {
      sourceGitBlobSha: blob,
      tableRendering: [{ blockId: 'pdf:p81:t1', requestedMode: 'records', renderer: 'records' }],
      blocks: [{ blockId: 'pdf:p81:t1', kind: 'table' }],
    },
    diagnostics: [{ code: 'PDF_PAGE_RANGE_CONTEXT_LIMITED', severity: 'INFO', provenance: { page: start } }],
  };
}

function response(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

test('API discovery catalogue covers T3 tables/figures and unresolved T2.8/T2.9 families', () => {
  const ids = new Set(VIBRATION_MASTER_API_TARGETS.map((target) => target.masterId));
  for (const id of [
    'EI_AVIFF.T3.SBC.FITTING_SPAN_FACTORS.v1',
    'EI_AVIFF.T3.SBC.FIGURE_T3_1.v1',
    'EI_AVIFF.T3.SBC.FIGURE_T3_4.v1',
    'EI_AVIFF.T2.8.VALVE_CLOSURE_CHARACTERISTICS.v1',
    'EI_AVIFF.T2.9.VALVE_RECOVERY_FACTORS.v1',
    'EI_AVIFF.T4.WALL_MODIFIER.v1',
  ]) assert(ids.has(id));
});

test('search payload follows merged DocumentConversionApi.v1 literal/OCR contract', () => {
  const payload = buildSearchPayload(VIBRATION_MASTER_API_TARGETS[2]);
  assert.equal(payload.sourcePath, VIBRATION_MASTER_API_SOURCE_PATH);
  assert.equal(payload.query, 'Table T3-1');
  assert.deepEqual(payload.options, {
    caseSensitive: false, wholeWord: false, useRegex: false,
    ocr: 'auto', ocrLanguage: 'eng', ocrConfidenceMin: 0.70,
  });
});

test('search receipt strips extracted source text but retains page/bbox/provenance', () => {
  const target = VIBRATION_MASTER_API_TARGETS[2];
  const receipt = sanitizeSearchResult(target, searchResult());
  assert.deepEqual(receipt.pagesWithMatches, [82]);
  assert.equal(receipt.hitCount, 1);
  assert.equal(receipt.hits[0].page, 82);
  assert.deepEqual(receipt.hits[0].bbox, [1, 2, 3, 4]);
  assert.equal(JSON.stringify(receipt).includes('licensed source text'), false);
  assert.equal(JSON.stringify(receipt).includes('licensed snippet'), false);
});

test('bounded conversion uses explicit pages, records tables, and never requests figure transport', () => {
  const payload = buildConvertPayload({ masterId: 'X', start: 81, end: 82 });
  assert.deepEqual(payload.pages, { start: 81, end: 82 });
  assert.equal(payload.options.tableMode, 'records');
  assert.equal(payload.options.images, 'skip');
  assert.equal(payload.options.engineeringRegions, 'auto');
});

test('conversion receipt requires exact Git blob and preserves frozen authority', () => {
  const selection = { masterId: 'EI_AVIFF.T3.SBC.FITTING_SPAN_FACTORS.v1', dataType: 'TABLE', start: 81, end: 81 };
  const receipt = sanitizeConversionResult(selection, conversionResult());
  assert.equal(receipt.sourceGitBlobSha, EXPECTED_BLOB);
  assert.deepEqual(receipt.pageRange, { start: 81, end: 81, count: 1 });
  assert.deepEqual(receipt.authority, {
    engineeringAuthority: 'NONE', screeningAuthority: 'NOT_AUTHORIZED', designAuthority: false,
  });
  assert.equal(receipt.figureDigitizationRequired, false);
  assert.throws(() => sanitizeConversionResult(selection, conversionResult({ blob: '0'.repeat(40) })), /GIT_BLOB_MISMATCH/u);
});

test('curve conversion receipt never claims curve-point recovery', () => {
  const selection = { masterId: 'EI_AVIFF.T3.SBC.FIGURE_T3_1.v1', dataType: 'CURVE', start: 82, end: 82 };
  const receipt = sanitizeConversionResult(selection, conversionResult({ start: 82, end: 82 }));
  assert.equal(receipt.figureDigitizationRequired, true);
});

test('discovery accepts only one consistent controlled source identity across searches', async () => {
  const targets = VIBRATION_MASTER_API_TARGETS.slice(2, 4);
  const seen = [];
  const fetchImpl = async (_url, options) => {
    const request = JSON.parse(options.body);
    seen.push(request.query);
    return response(searchResult({ page: request.query === 'Table T3-1' ? 81 : 82 }));
  };
  const discovery = await discoverVibrationMasterSources({ targets, fetchImpl, baseUrl: 'http://fixture' });
  assert.equal(discovery.schema, VIBRATION_MASTER_API_DISCOVERY_SCHEMA);
  assert.deepEqual(seen, ['Table T3-1', 'Table T3-2']);
  assert.equal(discovery.source.sha256, SOURCE_SHA);
  assert.equal(discovery.selectionAuthority, 'EXPLICIT_CALLER_PAGE_SELECTION_REQUIRED');
});

test('wrong conversion blob fails before raw Markdown/evidence review files are written', async () => {
  const reviewDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vibration-api-review-'));
  fs.rmSync(reviewDir, { recursive: true, force: true });
  const selection = { masterId: 'EI_AVIFF.T3.SBC.FITTING_SPAN_FACTORS.v1', start: 81, end: 81 };
  const fetchImpl = async () => response(conversionResult({ blob: '0'.repeat(40) }));
  await assert.rejects(
    () => convertVibrationMasterSelections({ selections: [selection], reviewDir, fetchImpl, baseUrl: 'http://fixture' }),
    /GIT_BLOB_MISMATCH/u,
  );
  assert.equal(fs.existsSync(reviewDir), false);
});

test('accepted conversion writes private review bundle only after source identity passes', async () => {
  const reviewDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vibration-api-review-'));
  const selection = { masterId: 'EI_AVIFF.T3.SBC.FITTING_SPAN_FACTORS.v1', start: 81, end: 81 };
  const fetchImpl = async () => response(conversionResult());
  try {
    const result = await convertVibrationMasterSelections({ selections: [selection], reviewDir, fetchImpl, baseUrl: 'http://fixture' });
    assert.equal(result.schema, VIBRATION_MASTER_API_CONVERSION_SCHEMA);
    const files = fs.readdirSync(reviewDir);
    assert.equal(files.some((name) => name.endsWith('.md')), true);
    assert.equal(files.some((name) => name.endsWith('.evidence.json')), true);
  } finally {
    fs.rmSync(reviewDir, { recursive: true, force: true });
  }
});

test('package command and FIT/VIB release manifest include API recovery gate', async () => {
  const pkg = JSON.parse(source('package.json'));
  assert.equal(
    pkg.scripts['recover:vibration-master-sources-via-api'],
    'node scripts/fetch-vibration-master-sections-via-api.mjs',
  );
  const release = await import('../scripts/verify-vibration-fit-release.mjs');
  assert(release.listVibrationFitReleaseTests().includes('tests/vibration-master-api-recovery.test.mjs'));
});
