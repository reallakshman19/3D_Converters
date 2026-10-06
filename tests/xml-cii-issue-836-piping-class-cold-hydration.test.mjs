import test from 'node:test';
import assert from 'node:assert/strict';

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
    config: {},
    rawRows: {},
    mappingRows: {},
    datasetRefs: {},
    rowCounts: {},
    previewRows: {},
    sourceMetadata: {},
    appliedMappingRevision: {},
  };
}

function startupState() {
  return {
    current: {
      supportConfigJson: '{}',
      masterContext: blankContext(),
    },
  };
}

test('C05.2 piping class keeps dataset revision through compact restart custody and cold hydration', async (t) => {
  const storage = installStorage();
  const rows = [{ Marker: 'PC-1' }, { Marker: 'PC-2' }];
  const expectedRevision = 4;
  try {
    const committed = commitDatasetReadyMaster({
      context: blankContext(),
      config: {},
      key: 'pipingClass',
      ready: {
        metadata: {
          datasetId: 'issue836:pc:r4',
          datasetRevision: expectedRevision,
          rowCount: rows.length,
          masterKey: 'pipingClass',
          fileName: 'Piping class master.xlsx',
          fieldMap: { marker: 'Marker' },
        },
        previewRows: rows,
        mappingRows: rows,
      },
      sourceMetadata: {
        key: 'pipingClass',
        source: 'Piping class master.xlsx',
        sourceType: 'worker-import',
        status: 'loaded',
        rowCount: rows.length,
      },
    });

    const custody = JSON.parse(storage.values.get('xml-cii-master-source-pipingClass') || '{}');
    const stateRef = startupState();
    const store = {
      async getMetadata(id) {
        return id === 'issue836:pc:r4'
          ? {
            datasetId: id,
            datasetRevision: expectedRevision,
            rowCount: rows.length,
            fileName: 'Piping class master.xlsx',
            mappingRows: rows,
          }
          : null;
      },
      async getRowsRange(id, offset, limit) {
        return id === 'issue836:pc:r4' ? rows.slice(offset, offset + limit) : null;
      },
      async getRows(id) {
        return id === 'issue836:pc:r4' ? rows : null;
      },
    };
    const changed = await hydratePersistedMasterDatasets(stateRef, { store });
    const coldRef = stateRef.current.masterContext.datasetRefs.pipingClass;

    const observation = {
      commitDatasetRevision: committed.datasetRef?.datasetRevision ?? null,
      custodyDatasetRevision: custody.datasetRevision ?? null,
      coldDatasetRevision: coldRef?.datasetRevision ?? null,
      datasetIdStable: coldRef?.datasetId === committed.datasetRef?.datasetId,
      appliedRevisionStable:
        stateRef.current.masterContext.appliedMappingRevision.pipingClass === committed.revision,
      rowCountStable: coldRef?.rowCount === rows.length,
      previewRestored: stateRef.current.masterContext.previewRows.pipingClass?.length === rows.length,
      compactNoNormalizedDuplicate: !storage.values.has('xml-cii-master-pipingClass'),
      compactNoRawDuplicate: !storage.values.has('xml-cii-master-raw-pipingClass'),
    };
    t.diagnostic(JSON.stringify(observation));

    assert.equal(changed, true);
    assert.equal(observation.commitDatasetRevision, expectedRevision, 'datasetRef must retain worker datasetRevision');
    assert.equal(observation.custodyDatasetRevision, expectedRevision, 'restart custody must persist datasetRevision');
    assert.equal(observation.coldDatasetRevision, expectedRevision, 'cold datasetRef must restore datasetRevision');
    assert.equal(observation.datasetIdStable, true);
    assert.equal(observation.appliedRevisionStable, true);
    assert.equal(observation.rowCountStable, true);
    assert.equal(observation.previewRestored, true);
    assert.equal(observation.compactNoNormalizedDuplicate, true);
    assert.equal(observation.compactNoRawDuplicate, true);
  } finally {
    storage.restore();
  }
});

test('C05.2 does not pre-complete Mat_Map or Valve Weight revision custody', async () => {
  const storage = installStorage({
    'xml-cii-master-source-materialMap': JSON.stringify({
      source: 'PCF_MAT_MAP.TXT',
      datasetId: 'issue836:mat:r2',
      datasetRevision: 2,
      rowCount: 1,
      fieldMap: {},
      appliedRevision: 3,
      persistenceMode: 'indexeddb',
    }),
    'xml-cii-master-source-weight': JSON.stringify({
      source: 'wtValveweights.xlsx',
      datasetId: 'issue836:wt:r5',
      datasetRevision: 5,
      rowCount: 1,
      fieldMap: {},
      appliedRevision: 6,
      persistenceMode: 'indexeddb',
      masterFingerprint: 'fp',
    }),
  });
  const rows = {
    'issue836:mat:r2': [{ Marker: 'MAT' }],
    'issue836:wt:r5': [{ Marker: 'WT' }],
  };
  const store = {
    async getMetadata(id) {
      return rows[id]
        ? {
          datasetId: id,
          datasetRevision: id.includes(':mat:') ? 2 : 5,
          rowCount: 1,
          fileName: id.includes(':mat:') ? 'PCF_MAT_MAP.TXT' : 'wtValveweights.xlsx',
          mappingRows: rows[id],
          ...(id.includes(':wt:') ? { masterFingerprint: 'fp' } : {}),
        }
        : null;
    },
    async getRowsRange(id) { return rows[id] || null; },
    async getRows(id) { return rows[id] || null; },
  };
  const stateRef = startupState();
  try {
    assert.equal(await hydratePersistedMasterDatasets(stateRef, { store }), true);
    assert.equal(stateRef.current.masterContext.datasetRefs.materialMap.datasetRevision, undefined);
    assert.equal(stateRef.current.masterContext.datasetRefs.weight.datasetRevision, undefined);
  } finally {
    storage.restore();
  }
});
