import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { buildVibrationFitUiBenchmarkCase } from '../tabs/vibration-integrity-benchmarks.js';
import { renderVibrationIntegrityHtml } from '../tabs/vibration-integrity-view.js';

const controllerSource = fs.readFileSync(new URL('../tabs/vibration-integrity-tab.js', import.meta.url), 'utf8');
const inputViewSource = fs.readFileSync(new URL('../tabs/vibration-integrity-input-view.js', import.meta.url), 'utf8');

function benchmarkState({ modified = false, actual = null } = {}) {
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
    benchmark: { selectedId: loaded.id, loaded },
    allowLimitedExchange: true,
    preflight: null,
    envelope: actual ? { workflow: { register: { rows: registerRows } }, imports: null } : null,
    workspace: null,
    filters: { line: '', completeness: '', band: '', candidate: '' },
    sort: { field: 'line', direction: 'asc' },
    detailTab: 'summary',
    busy: false,
    busyAction: null,
    error: null,
  };
}

test('FIT workspace exposes Load BENCHMARK and three editable working tables', () => {
  const html = renderVibrationIntegrityHtml(benchmarkState());
  assert.match(html, /Load BENCHMARK/u);
  assert.match(html, /FIT validation benchmark/u);
  assert.match(html, /EI D4 · Produced water · 10 in liquid/u);
  assert.match(html, /Topology · Elements working table/u);
  assert.match(html, /Operating cases/u);
  assert.match(html, /Vibration enrichment/u);
  assert.match(html, /data-vi-table-cell="topology"/u);
  assert.match(html, /data-vi-table-cell="operating"/u);
  assert.match(html, /data-vi-table-cell="enrichment"/u);
  assert.match(html, /data-vi-table-add="topology"/u);
  assert.match(html, /Delete/u);
  assert.match(html, /Files load into the editable tables below/u);
});

test('untouched EI case displays published target and benchmark parity PASS after matching run', () => {
  const html = renderVibrationIntegrityHtml(benchmarkState({
    actual: { standardLof: 3.15195, referenceBand: 'LOF_GE_1' },
  }));
  assert.match(html, /Target standard LOF: <strong>3\.15/u);
  assert.match(html, /Actual standard LOF: <strong>3\.15195/u);
  assert.match(html, /Benchmark parity PASS/u);
  assert.match(html, /LOF_GE_1/u);
});

test('modified EI inputs retain target as reference but suppress official parity claim', () => {
  const html = renderVibrationIntegrityHtml(benchmarkState({
    modified: true,
    actual: { standardLof: 3.15195, referenceBand: 'LOF_GE_1' },
  }));
  assert.match(html, /Benchmark inputs modified/u);
  assert.match(html, /Not applicable · inputs modified/u);
  assert.doesNotMatch(html, /Benchmark parity PASS/u);
  assert.match(html, /original-case reference/u);
});

test('editable FIT UI remains an input/preparation layer with no direct numerical authority', () => {
  const combined = `${controllerSource}\n${inputViewSource}`;
  assert.doesNotMatch(combined, /calculateFit\s*\(/u);
  assert.doesNotMatch(combined, /calculateEngineering(?:Batch)?\s*\(/u);
  assert.doesNotMatch(combined, /<canvas|createElement\(['"]canvas/iu);
  assert.doesNotMatch(combined, /riskScore|Vibration Score|confidenceScore/u);
  assert.match(controllerSource, /buildVibrationIntegrityFacilityTableInput/u);
  assert.match(controllerSource, /runVibrationFacilityFitBenchmarkFromTables/u);
  assert.match(controllerSource, /await import\(\s*'\.\.\/converters\/vibration\/facility\/fit-workflow-tabular\.js'/u);
});

test('controller invalidates benchmark parity and stale result state on table mutation', () => {
  assert.match(controllerSource, /function markBenchmarkModified/u);
  assert.match(controllerSource, /function clearCalculatedState/u);
  assert.match(controllerSource, /applyTableMutation/u);
  assert.match(controllerSource, /state\.allowLimitedExchange = true/u);
  assert.match(inputViewSource, /Not applicable · inputs modified/u);
});
