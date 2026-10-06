import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

import { commitDatasetReadyMaster } from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-dataset-commit.js';
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

function blankContext() {
  return {
    config: {}, rawRows: {}, mappingRows: {}, datasetRefs: {}, rowCounts: {},
    previewRows: {}, sourceMetadata: {}, appliedMappingRevision: {},
  };
}

test('C05.3.2 Mat_Map commit retains datasetRevision in runtime ref and compact restart custody', () => {
  const storage = installStorage();
  const rows = [{ Marker: 'MAT-1' }, { Marker: 'MAT-2' }];
  try {
    const committed = commitDatasetReadyMaster({
      context: blankContext(),
      config: {},
      key: 'materialMap',
      ready: {
        metadata: {
          datasetId: 'issue846:mat:r3',
          datasetRevision: 3,
          rowCount: rows.length,
          masterKey: 'materialMap',
          fileName: 'PCF_MAT_MAP.TXT',
          fieldMap: { marker: 'Marker' },
        },
        previewRows: rows,
        mappingRows: rows,
      },
      sourceMetadata: {
        key: 'materialMap',
        source: 'PCF_MAT_MAP.TXT',
        sourceType: 'worker-import',
        status: 'loaded',
        rowCount: rows.length,
      },
    });

    assert.equal(committed.datasetRef.datasetRevision, 3);
    const custody = JSON.parse(storage.values.get('xml-cii-master-source-materialMap') || '{}');
    assert.equal(custody.datasetId, 'issue846:mat:r3');
    assert.equal(custody.datasetRevision, 3);
    assert.equal(custody.persistenceMode, 'indexeddb');
    assert.equal(storage.values.has('xml-cii-master-materialMap'), false);
    assert.equal(storage.values.has('xml-cii-master-raw-materialMap'), false);
  } finally {
    storage.restore();
  }
});

test('C05.3.2 deliberately leaves materialMap startup hydration revision RED for #847', async () => {
  const storage = installStorage({
    'xml-cii-master-source-materialMap': JSON.stringify({
      source: 'PCF_MAT_MAP.TXT',
      datasetId: 'issue846:mat:r3',
      datasetRevision: 3,
      rowCount: 1,
      fieldMap: {},
      appliedRevision: 4,
      persistenceMode: 'indexeddb',
    }),
  });
  const stateRef = { current: { supportConfigJson: '{}', masterContext: blankContext() } };
  try {
    assert.equal(await hydratePersistedMasterDatasets(stateRef, {
      store: {
        async getMetadata() {
          return {
            datasetId: 'issue846:mat:r3',
            datasetRevision: 3,
            rowCount: 1,
            fileName: 'PCF_MAT_MAP.TXT',
            mappingRows: [{ Marker: 'MAT' }],
          };
        },
        async getRowsRange() { return [{ Marker: 'MAT' }]; },
        async getRows() { return [{ Marker: 'MAT' }]; },
      },
    }), true);
    assert.equal(stateRef.current.masterContext.datasetRefs.materialMap.datasetId, 'issue846:mat:r3');
    assert.equal(stateRef.current.masterContext.datasetRefs.materialMap.datasetRevision, undefined);
  } finally {
    storage.restore();
  }
});

test('C05.3.2 preserves Piping Class revision and leaves Valve Weight revision unchanged', async () => {
  const storage = installStorage({
    'xml-cii-master-source-pipingClass': JSON.stringify({
      source: 'Piping class master.xlsx',
      datasetId: 'issue846:pc:r4',
      datasetRevision: 4,
      rowCount: 1,
      fieldMap: {},
      appliedRevision: 2,
      persistenceMode: 'indexeddb',
    }),
    'xml-cii-master-source-weight': JSON.stringify({
      source: 'wtValveweights.xlsx',
      datasetId: 'issue846:wt:r5',
      datasetRevision: 5,
      rowCount: 1,
      fieldMap: {},
      appliedRevision: 6,
      persistenceMode: 'indexeddb',
      masterFingerprint: 'fp',
    }),
  });
  const rows = {
    'issue846:pc:r4': [{ Marker: 'PC' }],
    'issue846:wt:r5': [{ Marker: 'WT' }],
  };
  const stateRef = { current: { supportConfigJson: '{}', masterContext: blankContext() } };
  try {
    assert.equal(await hydratePersistedMasterDatasets(stateRef, {
      store: {
        async getMetadata(id) {
          if (!rows[id]) return null;
          return {
            datasetId: id,
            datasetRevision: id.includes(':pc:') ? 4 : 5,
            rowCount: 1,
            fileName: id.includes(':pc:') ? 'Piping class master.xlsx' : 'wtValveweights.xlsx',
            mappingRows: rows[id],
            ...(id.includes(':wt:') ? { masterFingerprint: 'fp' } : {}),
          };
        },
        async getRowsRange(id) { return rows[id] || null; },
        async getRows(id) { return rows[id] || null; },
      },
    }), true);
    assert.equal(stateRef.current.masterContext.datasetRefs.pipingClass.datasetRevision, 4);
    assert.equal(stateRef.current.masterContext.datasetRefs.weight.datasetRevision, undefined);
  } finally {
    storage.restore();
  }
});

test('C05.3.2 master runtime source and docs mirror are byte-identical', async () => {
  const sourcePath = 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-runtime.js';
  const [source, docs] = await Promise.all([
    fs.readFile(new URL('../' + sourcePath, import.meta.url), 'utf8'),
    fs.readFile(new URL('../docs/' + sourcePath, import.meta.url), 'utf8'),
  ]);
  assert.equal(source, docs);
});
