import test from 'node:test';
import assert from 'node:assert/strict';

import { hydratePersistedMasterDatasets } from '../tabs/xml-cii-2019-standalone/workers/master-dataset-startup-hydration.js';

function installStorage(entries = {}) {
  const previous = globalThis.localStorage;
  const values = new Map(Object.entries(entries));
  globalThis.localStorage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
  return { values, restore: () => { globalThis.localStorage = previous; } };
}

function activeState() {
  const activeContext = {
    config: {
      weight: {
        masterRevision: 11,
        masterFingerprint: 'active-weight-fp',
      },
    },
    datasetRefs: {
      weight: {
        datasetId: 'active:wt:r5',
        datasetRevision: 5,
        rowCount: 2,
        masterKey: 'weight',
        masterFingerprint: 'active-weight-fp',
        persistence: 'session',
      },
    },
    rowCounts: { weight: 2 },
    previewRows: { weight: [{ Marker: 'WT-1' }] },
    sourceMetadata: { weight: { source: 'active-session', status: 'loaded', rowCount: 2 } },
    appliedMappingRevision: { weight: 11 },
    rawRows: { weight: [] },
    mappingRows: { weight: [] },
  };
  return {
    current: {
      supportConfigJson: JSON.stringify(activeContext.config),
      masterContext: activeContext,
    },
  };
}

function custody(masterKey, overrides = {}) {
  const defaults = {
    source: masterKey === 'pipingClass' ? 'Piping_class_master.json' : 'PCF_MAT_MAP.TXT',
    datasetId: `issue880:${masterKey}:r3`,
    datasetRevision: 3,
    rowCount: 2,
    fieldMap: {},
    appliedRevision: 3,
    persistenceMode: 'indexeddb',
  };
  return JSON.stringify({ ...defaults, ...overrides });
}

async function expectRestoreFailure({ name, custodyEntries, store, pattern }) {
  const storage = installStorage(custodyEntries);
  const stateRef = activeState();
  const before = JSON.parse(JSON.stringify(stateRef.current));
  try {
    let observed = null;
    await assert.rejects(
      hydratePersistedMasterDatasets(stateRef, { store }),
      (error) => {
        observed = String(error?.message || error);
        assert.match(observed, pattern);
        return true;
      },
    );
    assert.deepEqual(stateRef.current, before, `${name}: active-session authority mutated on rejected restore`);
    return {
      case: name,
      rejected: true,
      activeSessionPreserved: true,
      failedPersistedAuthorityAttached: false,
      message: observed,
      failureDomain: 'RESTORE_STORAGE',
      parseFailure: false,
    };
  } finally {
    storage.restore();
  }
}

test('C05.5.4.1 RED matrix: corrupt persisted restore failures reject before mutation', async (t) => {
  const rows = [{ Marker: 'A' }, { Marker: 'B' }];

  const results = [];

  results.push(await expectRestoreFailure({
    name: 'MISSING_METADATA',
    custodyEntries: {
      'xml-cii-master-source-materialMap': custody('materialMap'),
    },
    store: {
      async getMetadata() { return null; },
      async getRowsRange() { throw new Error('rows must not be read after missing metadata'); },
      async getRows() { throw new Error('rows must not be read after missing metadata'); },
    },
    pattern: /Persisted materialMap dataset is unavailable/,
  }));

  results.push(await expectRestoreFailure({
    name: 'ROW_COUNT_MISMATCH',
    custodyEntries: {
      'xml-cii-master-source-materialMap': custody('materialMap', { rowCount: 2 }),
    },
    store: {
      async getMetadata() {
        return {
          datasetId: 'issue880:materialMap:r3',
          datasetRevision: 3,
          rowCount: 3,
          fileName: 'PCF_MAT_MAP.TXT',
        };
      },
      async getRowsRange() { throw new Error('rows must not be read after row-count mismatch'); },
      async getRows() { throw new Error('rows must not be read after row-count mismatch'); },
    },
    pattern: /row count mismatch: expected 2, received 3/,
  }));

  results.push(await expectRestoreFailure({
    name: 'REVISION_MISMATCH',
    custodyEntries: {
      'xml-cii-master-source-materialMap': custody('materialMap', { datasetRevision: 3 }),
    },
    store: {
      async getMetadata() {
        return {
          datasetId: 'issue880:materialMap:r3',
          datasetRevision: 4,
          rowCount: 2,
          fileName: 'PCF_MAT_MAP.TXT',
        };
      },
      async getRowsRange() { throw new Error('rows must not be read after revision mismatch'); },
      async getRows() { throw new Error('rows must not be read after revision mismatch'); },
    },
    pattern: /dataset revision mismatch: expected 3, received 4/,
  }));

  results.push(await expectRestoreFailure({
    name: 'PREVIEW_UNAVAILABLE',
    custodyEntries: {
      'xml-cii-master-source-materialMap': custody('materialMap'),
    },
    store: {
      async getMetadata() {
        return {
          datasetId: 'issue880:materialMap:r3',
          datasetRevision: 3,
          rowCount: 2,
          fileName: 'PCF_MAT_MAP.TXT',
          mappingRows: rows,
        };
      },
      async getRowsRange() { return null; },
      async getRows() { return rows; },
    },
    pattern: /Persisted materialMap preview is unavailable/,
  }));

  t.diagnostic(JSON.stringify(results));
  assert.equal(results.length, 4);
  assert.ok(results.every((entry) => entry.rejected));
  assert.ok(results.every((entry) => entry.activeSessionPreserved));
  assert.ok(results.every((entry) => entry.failureDomain === 'RESTORE_STORAGE'));
  assert.ok(results.every((entry) => entry.parseFailure === false));
});

test('C05.5.4.1 RED: one corrupt persisted master suppresses an otherwise valid sibling restore', async (t) => {
  const storage = installStorage({
    'xml-cii-master-source-pipingClass': custody('pipingClass', {
      datasetId: 'issue880:pipingClass:r4',
      datasetRevision: 4,
      appliedRevision: 2,
      source: 'Piping_class_master.json',
    }),
    'xml-cii-master-source-materialMap': custody('materialMap', {
      datasetId: 'issue880:materialMap:r3',
      datasetRevision: 3,
      appliedRevision: 3,
    }),
  });

  const stateRef = activeState();
  const before = JSON.parse(JSON.stringify(stateRef.current));
  const pipingRows = [{ Marker: 'PC-1' }, { Marker: 'PC-2' }];

  try {
    await assert.rejects(
      hydratePersistedMasterDatasets(stateRef, {
        store: {
          async getMetadata(id) {
            if (id === 'issue880:pipingClass:r4') {
              return {
                datasetId: id,
                datasetRevision: 4,
                rowCount: 2,
                fileName: 'Piping_class_master.json',
                mappingRows: pipingRows,
              };
            }
            if (id === 'issue880:materialMap:r3') return null;
            return null;
          },
          async getRowsRange(id, offset, limit) {
            if (id === 'issue880:pipingClass:r4') return pipingRows.slice(offset, offset + limit);
            throw new Error('corrupt materialMap rows must not be read');
          },
          async getRows(id) {
            return id === 'issue880:pipingClass:r4' ? pipingRows : null;
          },
        },
      }),
      /Persisted materialMap dataset is unavailable/,
    );

    // Current RED: Promise.all rejects before applyLoadedDatasets(), so valid pipingClass is not restored either.
    assert.equal(stateRef.current.masterContext.datasetRefs.pipingClass, undefined);
    assert.deepEqual(stateRef.current, before);

    t.diagnostic(JSON.stringify({
      validSibling: 'pipingClass',
      corruptSibling: 'materialMap',
      validSiblingSuppressed: true,
      corruptAuthorityAttached: false,
      preExistingActiveWeightPreserved: true,
      failureClass: 'ALL_OR_NOTHING_RESTORE_COUPLING',
      repairOwner: 881,
    }));
  } finally {
    storage.restore();
  }
});

test('C05.5.4.1 RED: legacy Weight fingerprint migration row failure is restore/storage, not parse', async (t) => {
  const storage = installStorage({
    'xml-cii-master-source-weight': JSON.stringify({
      source: 'wtValveweights.json',
      datasetId: 'issue880:weight:r5',
      datasetRevision: 5,
      rowCount: 2,
      fieldMap: {},
      appliedRevision: 11,
      persistenceMode: 'indexeddb',
      masterFingerprint: '',
    }),
  });
  const stateRef = activeState();
  const before = JSON.parse(JSON.stringify(stateRef.current));

  try {
    await assert.rejects(
      hydratePersistedMasterDatasets(stateRef, {
        store: {
          async getMetadata() {
            return {
              datasetId: 'issue880:weight:r5',
              datasetRevision: 5,
              rowCount: 2,
              fileName: 'wtValveweights.json',
              masterFingerprint: '',
            };
          },
          async getRowsRange() { return [{ Marker: 'WT-1' }]; },
          async getRows() { return [{ Marker: 'WT-1' }]; },
        },
      }),
      /fingerprint migration requires 2 rows/,
    );

    assert.deepEqual(stateRef.current, before);
    t.diagnostic(JSON.stringify({
      case: 'WEIGHT_FINGERPRINT_MIGRATION_ROWS_UNAVAILABLE',
      activeSessionPreserved: true,
      failureDomain: 'RESTORE_STORAGE',
      parseFailure: false,
      classificationOwner: 883,
    }));
  } finally {
    storage.restore();
  }
});
