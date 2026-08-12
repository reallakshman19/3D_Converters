import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addVibrationIntegrityInputRow,
  createTopologyInputTableFromExchange,
  createVibrationIntegrityInputTable,
  deleteVibrationIntegrityInputRow,
  parseVibrationIntegrityInputCsv,
  serializeVibrationIntegrityInputTable,
  updateVibrationIntegrityInputCell,
} from '../tabs/vibration-integrity-input-model.js';

const OPERATING_HEADER = [
  'Line','Operating Case','Label','Phase','Mass Flow','Mass Flow Unit','Density','Density Unit',
  'Pressure','Pressure Unit','Pressure Reference','Temperature','Temperature Unit',
  'Dynamic Viscosity','Dynamic Viscosity Unit','Velocity','Velocity Unit','Source','Source Revision','Record ID',
];

test('editable operating CSV loads into rows and round-trips quoted values', () => {
  const csv = `${OPERATING_HEADER.join(',')}\r\nL-100,CASE-1,"Normal, wet",GAS,12,kg/s,8,kg/m3,,,,,,0.00002,Pa*s,,,"HMB, issued",R3,REC-1\r\n`;
  const table = parseVibrationIntegrityInputCsv('operating', csv, { sourceName: 'cases.csv' });
  assert.equal(table.rows.length, 1);
  assert.equal(table.rows[0][2], 'Normal, wet');
  assert.equal(table.rows[0][17], 'HMB, issued');
  assert.equal(table.dirty, false);
  assert.match(serializeVibrationIntegrityInputTable(table), /"Normal, wet"/u);
  assert.match(serializeVibrationIntegrityInputTable(table), /"HMB, issued"/u);
});

test('cell edits are immutable and mark working table dirty', () => {
  const original = createVibrationIntegrityInputTable('enrichment', [[
    'CID-1','L-1','','FIT_ASSESSMENT_POINT','true','BOOLEAN','','ENG','','REC-1','','',
  ]);
  const edited = updateVibrationIntegrityInputCell(original, 0, 4, 'false');
  assert.equal(original.rows[0][4], 'true');
  assert.equal(original.dirty, false);
  assert.equal(edited.rows[0][4], 'false');
  assert.equal(edited.dirty, true);
  assert(Object.isFrozen(edited));
  assert(Object.isFrozen(edited.rows));
});

test('add/delete row preserves exact table width', () => {
  const original = createVibrationIntegrityInputTable('operating', []);
  const added = addVibrationIntegrityInputRow(original);
  assert.equal(added.rows.length, 1);
  assert.equal(added.rows[0].length, OPERATING_HEADER.length);
  const removed = deleteVibrationIntegrityInputRow(added, 0);
  assert.equal(removed.rows.length, 0);
  assert.equal(removed.dirty, true);
});

test('parsed complete exchange can populate an editable topology view without mutating authority', () => {
  const exchange = Object.freeze({
    completeExchange: true,
    sourceFormat: 'XLSX',
    sourceFileName: 'certified.xlsx',
    elements: Object.freeze([Object.freeze({
      tag: 'P-1', type: 'PIPE', line: 'L-1', connectFrom: null, connectTo: null,
      dnInMm: 273, dnOutMm: 273, lengthMm: 1000, schedule: '40', material: 'CS',
      pipingClass: 'PC-1', pressureClass: '300', catalogueAuthority: 'CAT',
      sourceStatus: 'CERTIFIED', canonicalId: 'CID-1',
    })]),
  });
  const table = createTopologyInputTableFromExchange(exchange);
  assert.equal(table.originalCertifiedExchange, true);
  assert.equal(table.dirty, false);
  assert.equal(table.rows[0][14], 'CID-1');
  const edited = updateVibrationIntegrityInputCell(table, 0, 2, 'L-1-EDITED');
  assert.equal(edited.originalCertifiedExchange, true);
  assert.equal(edited.dirty, true);
});

test('table constructor fails closed on wrong column count', () => {
  assert.throws(
    () => createVibrationIntegrityInputTable('topology', [['too-short']]),
    (error) => error?.code === 'VIBRATION_INPUT_TABLE_COLUMN_COUNT_MISMATCH',
  );
});
