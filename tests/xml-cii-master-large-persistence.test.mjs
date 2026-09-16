import assert from 'node:assert/strict';
import test from 'node:test';

import { persistChangedMaster } from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-runtime.js';

function storageWithQuota(limitBytes) {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    removeItem(key) { values.delete(key); },
    setItem(key, value) {
      const next = String(value);
      const other = [...values.entries()].filter(([entry]) => entry !== key).reduce((sum, [, item]) => sum + item.length, 0);
      if (other + next.length > limitBytes) {
        const error = new Error("Failed to execute 'setItem' on 'Storage': Setting the value exceeded the quota.");
        error.name = 'QuotaExceededError';
        throw error;
      }
      values.set(key, next);
    },
    values,
  };
}

function context(rowCount = 11000) {
  const rows = Array.from({ length: rowCount }, (_, index) => ({
    pipingClass: `P${String(index).padStart(7, '0')}`,
    convertedBore: 100,
    materialName: 'LTCS',
    rating: 600,
    schedule: 'STD',
    wallThickness: 8.56,
    corrosion: 3,
    note: 'representative-large-master-row'.repeat(3),
  }));
  return {
    pipingClassRows: rows,
    rawRows: { pipingClass: rows.map((row) => ({ ...row })) },
    config: { pipingClass: { fieldMap: { pipingClass: 'pipingClass' } } },
    appliedMappingRevision: { pipingClass: 1 },
    sheetNames: { pipingClass: ['Sheet1'] },
    activeSheet: { pipingClass: 'Sheet1' },
    workbookData: { pipingClass: { Sheet1: rows.map((row) => ({ ...row })) } },
  };
}

test('large piping-class persistence never converts storage quota into an import failure', () => {
  const prior = globalThis.localStorage;
  const storage = storageWithQuota(512_000);
  globalThis.localStorage = storage;
  try {
    assert.doesNotThrow(() => persistChangedMaster('pipingClass', context()));
    assert.equal(storage.getItem('xml-cii-master-raw-pipingClass'), null);
    assert.equal(storage.getItem('xml-cii-master-workbook-pipingClass'), null);
  } finally {
    globalThis.localStorage = prior;
  }
});
