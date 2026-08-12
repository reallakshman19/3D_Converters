import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addVibrationWorkingRow,
  createVibrationWorkingRecords,
  deleteVibrationWorkingRow,
  revertVibrationWorkingCell,
  revertVibrationWorkingTable,
  updateVibrationWorkingCell,
  vibrationWorkingCellState,
  vibrationWorkingRecordsDirty,
  visibleVibrationWorkingRowIds,
  visibleVibrationWorkingRows,
} from '../tabs/vibration-integrity-working-state.js';

test('source rows receive stable IDs and retain original/working cell state', () => {
  const records = createVibrationWorkingRecords('operating', [['A', 'B'], ['C', 'D']]);
  assert.deepEqual(visibleVibrationWorkingRowIds(records), [
    'operating:source:0001', 'operating:source:0002',
  ]);
  const edited = updateVibrationWorkingCell(records, 0, 1, 'B2');
  assert.equal(vibrationWorkingCellState(edited, 0, 1).originalValue, 'B');
  assert.equal(vibrationWorkingCellState(edited, 0, 1).workingValue, 'B2');
  assert.equal(vibrationWorkingRecordsDirty(edited), true);
  assert.equal(vibrationWorkingRecordsDirty(records), false);
});

test('cell and table revert restore exact original values', () => {
  let records = createVibrationWorkingRecords('enrichment', [['CID', 'VALUE']]);
  records = updateVibrationWorkingCell(records, 0, 1, 'EDITED');
  records = revertVibrationWorkingCell(records, 0, 1);
  assert.deepEqual(visibleVibrationWorkingRows(records), [['CID', 'VALUE']]);
  assert.equal(vibrationWorkingRecordsDirty(records), false);

  records = updateVibrationWorkingCell(records, 0, 1, 'EDITED');
  records = deleteVibrationWorkingRow(records, 0);
  records = revertVibrationWorkingTable(records);
  assert.deepEqual(visibleVibrationWorkingRows(records), [['CID', 'VALUE']]);
  assert.equal(vibrationWorkingRecordsDirty(records), false);
});

test('added rows keep stable local IDs and disappear on full revert', () => {
  const original = createVibrationWorkingRecords('topology', [['P-1', 'PIPE']]);
  const added = addVibrationWorkingRow(original, 'topology', 2, 1);
  assert.deepEqual(visibleVibrationWorkingRowIds(added.records), [
    'topology:source:0001', 'topology:local:0001',
  ]);
  const reverted = revertVibrationWorkingTable(added.records);
  assert.deepEqual(visibleVibrationWorkingRowIds(reverted), ['topology:source:0001']);
  assert.equal(vibrationWorkingRecordsDirty(reverted), false);
});
