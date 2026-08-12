import assert from 'node:assert/strict';
import test from 'node:test';
import { buildVibrationIntegrityRunSnapshot } from '../tabs/vibration-integrity-run-snapshot.js';

function table(kind, rows) {
  return {
    kind,
    contract: `${kind}.v1`,
    header: ['A', 'B'],
    rowIds: rows.map((_, index) => `${kind}:source:${index + 1}`),
    rows,
    sourceName: `${kind}.csv`,
    sourceKind: 'CSV',
    authorityDowngraded: false,
  };
}

function state(value = '1') {
  return {
    allowLimitedExchange: true,
    benchmark: { loaded: { id: 'CASE-1', modified: false } },
    tables: {
      topology: table('topology', [['P', value]]),
      operating: table('operating', [['O', '2']]),
      enrichment: table('enrichment', [['E', '3']]),
    },
  };
}

test('run snapshot is deterministic and SHA-256-addressed', async () => {
  const first = await buildVibrationIntegrityRunSnapshot(state());
  const second = await buildVibrationIntegrityRunSnapshot(state());
  assert.equal(first.schema, 'FitRunSnapshot.v1');
  assert.equal(first.workingInputSchema, 'FitWorkingInputState.v1');
  assert.match(first.snapshotHash, /^[0-9a-f]{64}$/u);
  assert.equal(first.snapshotHash, second.snapshotHash);
  assert.equal(first.canonicalInput, second.canonicalInput);
});

test('engineering-working input changes alter the snapshot hash', async () => {
  const first = await buildVibrationIntegrityRunSnapshot(state('1'));
  const changed = await buildVibrationIntegrityRunSnapshot(state('1.1'));
  assert.notEqual(first.snapshotHash, changed.snapshotHash);
});
