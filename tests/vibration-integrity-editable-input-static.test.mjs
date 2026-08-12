import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { buildVibrationFitUiBenchmarkCase } from '../tabs/vibration-integrity-benchmarks.js';
import { renderVibrationIntegrityHtml } from '../tabs/vibration-integrity-view.js';

const controllerSource = fs.readFileSync(new URL('../tabs/vibration-integrity-tab.js', import.meta.url), 'utf8');
const inputViewSource = fs.readFileSync(new URL('../tabs/vibration-integrity-input-view.js', import.meta.url), 'utf8');
const snapshotSource = fs.readFileSync(new URL('../tabs/vibration-integrity-run-snapshot.js', import.meta.url), 'utf8');

function benchmarkState({ modified = false, actual = null, resultState = 'UNRUN' } = {}) {
  const loadedRaw = buildVibrationFitUiBenchmarkCase('EI-D4-FIT-PRODUCED-WATER-10IN');
  const loaded = modified ? Object.freeze({ ...loadedRaw, modified: true }) : loadedRaw;
  const registerRows = actual ? [{
    canonicalId: loaded.identity.canonicalId,
    line: loaded.identity.line,
    caseId: loaded.identity.caseId,
    standardLof: actual.standardLof,
    referenceBand: actual.referenceBand,
  }] : [];
  return {
    files: {
      topology: { name: `${loaded.id}.csv`, format: 'CSV_ELEMENTS_ONLY', kind: 'EI benchmark Elements working table' },
      operating: { name: `${loaded.id}-operating.csv`, kind: 'EI benchmark operating table' },
      enrichment: { name: `${loaded.id}-enrichment.csv`, kind: 'EI benchmark enrichment table' },
    },
    tables: { ...loaded.tables },
    benchmark: { selectedId: loaded.id, loaded, detachedFromSource: false },
    allowLimitedExchange: true,
    preflight: null,
    envelope: actual ? { workflow: { register: { rows: registerRows } }, imports: null } : null,
    workspace: null,
    resultState,
    runSnapshot: null,
    filters: { line: '', completeness: '', band: '', candidate: '' },
    sort: { field: 'line', direction: 'asc' },
    detailTab: 'summary',
    busy: false,
    busyAction: null,
    error: null,
  };
}

test('FIT workspace exposes benchmark and original/working editable tables', () => {
  const html = renderVibrationIntegrityHtml(benchmarkState());
  assert.match(html, /Load BENCHMARK/u);
  assert.match(html, /FIT validation benchmark/u);
  assert.match(html, /Topology · Elements working table/u);
  assert.match(html, /Operating cases/u);
  assert.match(html, /Vibration enrichment/u);
  assert.match(html, /data-vi-table-cell="topology"/u);
  assert.match(html, /Original:/u);
  assert.match(html, /Working edits:/u);
});

test('untouched EI case displays published target and benchmark parity PASS after current matching run', () => {
  const html = renderVibrationIntegrityHtml(benchmarkState({
    resultState: 'CURRENT_RESULT',
    actual: { standardLof: 3.15195, referenceBand: 'LOF_GE_1' },
  }));
  assert.match(html, /Target standard LOF: <strong>3\.15/u);
  assert.match(html, /Actual standard LOF: <strong>3\.15195/u);
  assert.match(html, /Benchmark parity PASS/u);
});

test('stale benchmark result cannot claim current parity', () => {
  const html = renderVibrationIntegrityHtml(benchmarkState({
    resultState: 'STALE_RESULT',
    actual: { standardLof: 3.15195, referenceBand: 'LOF_GE_1' },
  }));
  assert.match(html, /Stale result · rerun required/u);
  assert.doesNotMatch(html, /Benchmark parity PASS/u);
});

test('modified EI inputs retain target as reference but suppress official parity claim', () => {
  const html = renderVibrationIntegrityHtml(benchmarkState({
    modified: true,
    resultState: 'CURRENT_RESULT',
    actual: { standardLof: 3.15195, referenceBand: 'LOF_GE_1' },
  }));
  assert.match(html, /Benchmark inputs modified/u);
  assert.match(html, /Not applicable · inputs modified/u);
  assert.doesNotMatch(html, /Benchmark parity PASS/u);
});

test('editable FIT UI remains an input/preparation layer with no direct numerical authority', () => {
  const combined = `${controllerSource}\n${inputViewSource}`;
  assert.doesNotMatch(combined, /calculateFit\s*\(/u);
  assert.doesNotMatch(combined, /calculateEngineering(?:Batch)?\s*\(/u);
  assert.doesNotMatch(combined, /<canvas|createElement\(['"]canvas/iu);
  assert.doesNotMatch(combined, /riskScore|Vibration Score|confidenceScore/u);
  assert.match(controllerSource, /buildVibrationIntegrityFacilityTableInput/u);
  assert.match(controllerSource, /runVibrationFacilityFitBenchmarkFromTables/u);
});

test('controller preserves stale results and creates deterministic run snapshots', () => {
  assert.match(controllerSource, /function staleCalculatedState/u);
  assert.match(controllerSource, /'STALE_RESULT'/u);
  assert.match(controllerSource, /buildVibrationIntegrityRunSnapshot/u);
  assert.match(controllerSource, /state\.resultState = 'CURRENT_RESULT'/u);
  assert.match(controllerSource, /state\.resultState !== 'CURRENT_RESULT'/u);
  assert.match(snapshotSource, /FitWorkingInputState\.v1/u);
  assert.match(snapshotSource, /FitRunSnapshot\.v1/u);
  assert.match(snapshotSource, /SHA-256/u);
});

test('UI exposes cell/table revert while topology authority remains a separate latch', () => {
  assert.match(inputViewSource, /data-vi-cell-revert/u);
  assert.match(inputViewSource, /data-vi-table-revert/u);
  assert.match(inputViewSource, /authority remains downgraded until reload/u);
  assert.match(controllerSource, /revertVibrationIntegrityInputCell/u);
  assert.match(controllerSource, /revertVibrationIntegrityInputTable/u);
});
