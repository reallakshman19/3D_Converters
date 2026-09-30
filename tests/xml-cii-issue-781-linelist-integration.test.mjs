import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { detectLineListHeaderBand, refineLineListFieldMap } from '../tabs/xml-cii-2019-standalone/xml-cii-linelist-header-band.js';
import { recoverMasterDatasetRawRows } from '../tabs/xml-cii-2019-standalone/workers/master-dataset-remap-custody.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function reportedRealLayoutRows() {
  return [
    { __EMPTY_1: 'Notes', __EMPTY_2: 'FOR GENERAL NOTES, HOLDS AND ABBREVIATIONS REFER SHEET-2' },
    { __EMPTY_1: '1' },
    {
      __EMPTY_1: 'Service', __EMPTY_2: 'Line Number', __EMPTY_3: 'From', __EMPTY_4: 'To',
      __EMPTY_7: 'Fluid', __EMPTY_12: 'Density', __EMPTY_20: 'Nominal Pipe size',
      __EMPTY_21: 'Piping class', __EMPTY_22: 'DESIGN CONDITIONS', __EMPTY_24: 'Temp. Max',
      __EMPTY_25: 'Temp. Min', __EMPTY_26: 'Material', __EMPTY_28: 'Insulation Thickness',
      __EMPTY_31: 'Test Pressure (Kpa)',
    },
    { __EMPTY_22: 'Pressure Max' },
    {
      __EMPTY_11: 'Temp.', __EMPTY_20: 'inch', __EMPTY_22: 'kPa(g)', __EMPTY_24: 'ºC',
      __EMPTY_25: 'ºC', __EMPTY_31: 'kPa(g)',
    },
    { __EMPTY_12: 'Gas', __EMPTY_13: 'Liquid', __EMPTY_14: 'Mixed' },
    { __EMPTY_12: 'kg/m³', __EMPTY_13: 'kg/m³', __EMPTY_14: 'kg/m³' },
    {
      __EMPTY_1: 'P', __EMPTY_2: '0310051',
      __EMPTY_3: 'MOL-32 Pig Receiver R-3001 bypass line Tie in T-03606A',
      __EMPTY_4: 'TO MOL-07 AT KP-103.5 Tie in T-03606D', __EMPTY_7: 'HC',
      __EMPTY_11: '35- 38', __EMPTY_12: '4.2', __EMPTY_13: '800', __EMPTY_14: '600',
      __EMPTY_20: '10', __EMPTY_21: '61440', __EMPTY_22: '9440', __EMPTY_24: '82',
      __EMPTY_25: '5', __EMPTY_26: 'CS', __EMPTY_28: '50', __EMPTY_31: '15315',
    },
  ];
}

const expected = Object.freeze({
  lineKey1: '__EMPTY_1', lineKey2: '__EMPTY_2', pipingClass: '__EMPTY_21', material: '__EMPTY_26',
  convertedBore: '__EMPTY_20', p1: '__EMPTY_22', hydroPressure: '__EMPTY_31', t1: '__EMPTY_24',
  t2: '__EMPTY_11', t3: '__EMPTY_25', insThk: '__EMPTY_28', densityGas: '__EMPTY_12',
  densityLiquid: '__EMPTY_13', densityMixed: '__EMPTY_14', phase: '__EMPTY_7', from: '__EMPTY_3', to: '__EMPTY_4',
});

test('reported vertical Line List header band resolves exact engineering columns', () => {
  const rows = reportedRealLayoutRows();
  const headerBand = detectLineListHeaderBand(rows);
  assert.deepEqual(headerBand.fieldMap, expected);
  assert.deepEqual(new Set(headerBand.suppressedFields), new Set(['lineSeqNo', 'density']));

  const map = refineLineListFieldMap(rows, {});
  for (const [field, header] of Object.entries(expected)) assert.equal(map[field], header, field);
  assert.equal(map.lineSeqNo, undefined, 'general Line List notes must not become Line Seq authority');
  assert.equal(map.density, undefined, 'qualified Gas/Liquid/Mixed density columns must not alias generic Density');
  assert.equal(map.rating, undefined);
});

test('strong header-band evidence replaces stale bad applied-map hints without auto-applying them', () => {
  const map = refineLineListFieldMap(reportedRealLayoutRows(), {
    lineSeqNo: '__EMPTY_2', lineKey2: '__EMPTY_21', density: '__EMPTY_12', pipingClass: '__EMPTY_2',
  });
  assert.equal(map.lineKey2, '__EMPTY_2');
  assert.equal(map.pipingClass, '__EMPTY_21');
  assert.equal(map.lineSeqNo, undefined);
  assert.equal(map.density, undefined);
  assert.equal(map.densityGas, '__EMPTY_12');
});

test('restored Line List dataset can recover remap source rows from persisted normalized _raw custody', () => {
  const raw = [{ A: 'P', B: '0310051' }, { A: 'P', B: '0310052' }];
  assert.equal(recoverMasterDatasetRawRows({ rawRows: raw }), raw, 'live session raw rows retain priority');
  assert.deepEqual(recoverMasterDatasetRawRows({
    metadata: { masterKey: 'lineList' }, rows: raw.map((row) => ({ lineKey: `${row.A}${row.B}`, _raw: row })),
  }), raw);
  assert.equal(recoverMasterDatasetRawRows({ metadata: { masterKey: 'pipingClass' }, rows: [{ _raw: raw[0] }] }), null);
  assert.equal(recoverMasterDatasetRawRows({ metadata: { masterKey: 'lineList' }, rows: [{ lineKey: 'P0310051' }] }), null);
});

test('restored workbook sheet selector fails visibly instead of silently switching UI only', () => {
  const source = fs.readFileSync(path.join(root, 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-worker-events.js'), 'utf8');
  assert.doesNotMatch(source, /const source = importSources\.get\(key\);\s*if \(!source\) return;/);
  assert.match(source, /Re-import .* before switching worksheets/);
  assert.match(source, /select\.value = activeSheet/);
  assert.match(source, /current applied dataset and Preview remain unchanged/);
});

test('both worker import and UI Auto Map apply the same header-band refinement', () => {
  const worker = fs.readFileSync(path.join(root, 'tabs/xml-cii-2019-standalone/workers/master-dataset-normalize.js'), 'utf8');
  const ui = fs.readFileSync(path.join(root, 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-mapping-events.js'), 'utf8');
  assert.match(worker, /refineLineListFieldMap\(rawRows, merged/);
  assert.match(ui, /refineLineListFieldMap\(rawRows, merged/);
});

test('worker remap path uses recovered Line List raw custody and remains fail-closed otherwise', () => {
  const source = fs.readFileSync(path.join(root, 'tabs/xml-cii-2019-standalone/workers/master-dataset-service.js'), 'utf8');
  assert.match(source, /recoverMasterDatasetRawRows\(dataset\)/);
  assert.match(source, /finalizeDataset\(source, rawRows, base\.sheetName \|\| ''\)/);
  assert.match(source, /if \(!rawRows\)/);
});

test('runtime and deployed docs mirrors stay byte-identical for integration repair', () => {
  const pairs = [
    ['tabs/xml-cii-2019-standalone/xml-cii-linelist-header-band.js', 'docs/tabs/xml-cii-2019-standalone/xml-cii-linelist-header-band.js'],
    ['tabs/xml-cii-2019-standalone/workers/master-dataset-normalize.js', 'docs/tabs/xml-cii-2019-standalone/workers/master-dataset-normalize.js'],
    ['tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-mapping-events.js', 'docs/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-mapping-events.js'],
    ['tabs/xml-cii-2019-standalone/workers/master-dataset-service.js', 'docs/tabs/xml-cii-2019-standalone/workers/master-dataset-service.js'],
    ['tabs/xml-cii-2019-standalone/workers/master-dataset-remap-custody.js', 'docs/tabs/xml-cii-2019-standalone/workers/master-dataset-remap-custody.js'],
    ['tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-worker-events.js', 'docs/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-worker-events.js'],
  ];
  for (const [runtime, deployed] of pairs) {
    assert.equal(fs.readFileSync(path.join(root, runtime), 'utf8'), fs.readFileSync(path.join(root, deployed), 'utf8'), runtime);
  }
});
