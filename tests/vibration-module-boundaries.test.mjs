import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const ROOT = new URL('../', import.meta.url);

function source(path) {
  return fs.readFileSync(new URL(path, ROOT), 'utf8');
}

function physicalLines(path) {
  return source(path).split(/\r?\n/u).length;
}

const SIZE_GUARDED_MODULES = Object.freeze([
  'converters/vibration/facility/fit-plan.js',
  'converters/vibration/facility/fit-plan-contract.js',
  'converters/vibration/facility/fit-plan-context.js',
  'converters/vibration/facility/fit-plan-item.js',
  'converters/vibration/dataset/assemble.js',
  'converters/vibration/dataset/records.js',
  'converters/vibration/exchange/parse.js',
  'converters/vibration/exchange/parse-shared.js',
  'converters/vibration/exchange/parse-workbook.js',
  'converters/vibration/exchange/parse-csv.js',
  'converters/vibration/workspace/model.js',
  'converters/vibration/workspace/query.js',
  'converters/vibration/workspace/detail.js',
  'tabs/vibration-integrity-tab.js',
  'tabs/vibration-integrity-view.js',
  'tabs/vibration-integrity-detail-view.js',
]);

test('new vibration production modules stay below the normal 300-line module target', () => {
  for (const path of SIZE_GUARDED_MODULES) {
    assert(
      physicalLines(path) < 300,
      `${path} has ${physicalLines(path)} physical lines; split consumed responsibilities before adding more.`,
    );
  }
});

test('exchange and dataset public facades preserve stable APIs after structural split', () => {
  const exchangeIndex = source('converters/vibration/exchange/index.js');
  for (const symbol of [
    'assertVibrationTableExchange',
    'parseVibrationTableExchangeCsv',
    'parseVibrationTableExchangeWorkbook',
    'parseVibrationTableExchangeXlsx',
  ]) assert.match(exchangeIndex, new RegExp(`\\b${symbol}\\b`, 'u'));

  const datasetIndex = source('converters/vibration/dataset/index.js');
  assert.match(datasetIndex, /assembleVibrationIntegrityDataset/u);

  const facilityIndex = source('converters/vibration/facility/index.js');
  for (const symbol of [
    'buildVibrationFacilityFitPlan',
    'buildVibrationFacilityFitPreflight',
    'buildVibrationFacilityFitPreflightFromTables',
    'runVibrationFacilityFitBenchmarkFromTables',
  ]) assert.match(facilityIndex, new RegExp(`\\b${symbol}\\b`, 'u'));
});

test('readiness and visible tab remain separated from direct numerical execution', () => {
  const preflight = source('converters/vibration/facility/fit-preflight.js');
  const preflightTabular = source('converters/vibration/facility/fit-preflight-tabular.js');
  const tab = source('tabs/vibration-integrity-tab.js');

  assert.doesNotMatch(preflight, /calculateEngineering|calculateEngineeringBatch|calculateFit\s*\(/u);
  assert.doesNotMatch(preflight, /fit-execute|fit-workflow\.js/u);
  assert.doesNotMatch(preflightTabular, /fit-workflow\.js|fit-workflow-tabular\.js/u);
  assert.doesNotMatch(tab, /calculateEngineering(?:Batch)?\s*\(|calculateFit\s*\(/u);
  assert.match(tab, /await import\(\s*'\.\.\/converters\/vibration\/facility\/fit-workflow-tabular\.js'/u);
});

test('exchange parser facade contains no workbook parsing implementation', () => {
  const facade = source('converters/vibration/exchange/parse.js');
  assert.doesNotMatch(facade, /XLSX\.|sheet_to_json|parseCsvRows/u);
  assert.match(facade, /parse-workbook\.js/u);
  assert.match(facade, /parse-csv\.js/u);
});
