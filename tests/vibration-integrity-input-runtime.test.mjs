import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildLoadedVibrationIntegrityBenchmark,
  buildVibrationIntegrityFacilityTableInput,
  createVibrationIntegrityInputRuntimeState,
  vibrationIntegrityTopologyExecutionInput,
} from '../tabs/vibration-integrity-input-runtime.js';
import {
  createTopologyInputTableFromExchange,
  revertVibrationIntegrityInputTable,
  updateVibrationIntegrityInputCell,
  VIBRATION_LOCAL_TOPOLOGY_SOURCE_STATUS,
} from '../tabs/vibration-integrity-input-model.js';

function certifiedExchange() {
  return Object.freeze({
    completeExchange: true,
    sourceFormat: 'XLSX',
    sourceFileName: 'plant-certified.xlsx',
    elements: Object.freeze([Object.freeze({
      tag: 'P-1', type: 'PIPE', line: 'L-1', connectFrom: null, connectTo: null,
      dnInMm: 273, dnOutMm: 273, lengthMm: 1000, schedule: '40', material: 'CS',
      pipingClass: 'PC-1', pressureClass: '300', catalogueAuthority: 'CAT',
      sourceStatus: 'CERTIFIED', canonicalId: 'CID-1',
    })]),
  });
}

test('untouched certified XLSX remains the topology execution input', () => {
  const state = createVibrationIntegrityInputRuntimeState();
  const bytes = new Uint8Array([1, 2, 3]);
  state.files.topology = { name: 'plant-certified.xlsx', format: 'XLSX', data: bytes };
  state.tables.topology = createTopologyInputTableFromExchange(certifiedExchange());
  const input = vibrationIntegrityTopologyExecutionInput(state);
  assert.equal(input.format, 'XLSX');
  assert.equal(input.data, bytes);
});

test('first topology edit downgrades certified XLSX to visible local Elements CSV', () => {
  const state = createVibrationIntegrityInputRuntimeState();
  state.files.topology = { name: 'plant-certified.xlsx', format: 'XLSX', data: new Uint8Array([1]) };
  const table = createTopologyInputTableFromExchange(certifiedExchange());
  state.tables.topology = updateVibrationIntegrityInputCell(table, 0, 2, 'L-1-EDITED');
  const input = vibrationIntegrityTopologyExecutionInput(state);
  assert.equal(input.format, 'CSV_ELEMENTS_ONLY');
  assert.equal(input.sourceFileName, 'plant-certified.edited-elements.csv');
  assert.equal(state.tables.topology.rows[0][13], VIBRATION_LOCAL_TOPOLOGY_SOURCE_STATUS);
  assert.match(input.data, /L-1-EDITED/u);
});

test('reverting topology values does not regain complete XLSX execution authority', () => {
  const state = createVibrationIntegrityInputRuntimeState();
  state.files.topology = { name: 'plant-certified.xlsx', format: 'XLSX', data: new Uint8Array([1]) };
  const edited = updateVibrationIntegrityInputCell(createTopologyInputTableFromExchange(certifiedExchange()), 0, 2, 'EDITED');
  state.tables.topology = revertVibrationIntegrityInputTable(edited);
  assert.equal(state.tables.topology.dirty, false);
  assert.equal(state.tables.topology.authorityDowngraded, true);
  const input = vibrationIntegrityTopologyExecutionInput(state);
  assert.equal(input.format, 'CSV_ELEMENTS_ONLY');
  assert.equal(input.sourceFileName, 'plant-certified.edited-elements.csv');
  assert.doesNotMatch(input.data, /,CERTIFIED,/u);
});

test('loaded EI benchmark uses the same limited table workflow input contract', () => {
  const benchmark = buildLoadedVibrationIntegrityBenchmark('EI-D4-FIT-PRODUCED-WATER-10IN');
  const state = {
    ...createVibrationIntegrityInputRuntimeState(),
    files: benchmark.files,
    tables: benchmark.tables,
    benchmark: { selectedId: benchmark.loaded.id, loaded: benchmark.loaded, detachedFromSource: false },
    allowLimitedExchange: benchmark.allowLimitedExchange,
  };
  const input = buildVibrationIntegrityFacilityTableInput(state);
  assert.equal(input.topology.format, 'CSV_ELEMENTS_ONLY');
  assert.match(input.operatingCaseCsv, /EI-REFERENCE/u);
  assert.match(input.enrichmentCsv, /FIT_ASSESSMENT_POINT/u);
});
