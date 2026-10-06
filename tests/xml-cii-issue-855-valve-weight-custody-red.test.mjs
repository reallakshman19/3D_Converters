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

function blankContext(appliedWeightRevision = 0) {
  return {
    config: {},
    rawRows: {},
    mappingRows: {},
    datasetRefs: {},
    rowCounts: {},
    previewRows: {},
    sourceMetadata: {},
    appliedMappingRevision: { weight: appliedWeightRevision },
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

const WEIGHT_ROWS = Object.freeze([
  Object.freeze({ Bore: 100, Rating: '150', Length: 240, Weight: 42.5, Type: 'VALV' }),
  Object.freeze({ Bore: 150, Rating: '300', Length: 320, Weight: 78.2, Type: 'VALV' }),
]);

function weightReady(datasetRevision = 5, masterFingerprint = 'fp-c05-4-weight') {
  return {
    metadata: {
      datasetId: `issue855:wt:r${datasetRevision}`,
      datasetRevision,
      rowCount: WEIGHT_ROWS.length,
      masterKey: 'weight',
      fileName: 'wtValveweights.json',
      fieldMap: { bore: 'Bore', rating: 'Rating', length: 'Length', weight: 'Weight', type: 'Type' },
      masterFingerprint,
    },
    previewRows: WEIGHT_ROWS,
    mappingRows: WEIGHT_ROWS,
  };
}

test('C05.4.1 Valve Weight dataset revision is RED across runtime, restart custody and cold hydration', async (t) => {
  const expectedDatasetRevision = 5;
  const expectedFingerprint = 'fp-c05-4-weight';
  const storage = installStorage();
  try {
    const committed = commitDatasetReadyMaster({
      context: blankContext(10),
      config: {},
      key: 'weight',
      ready: weightReady(expectedDatasetRevision, expectedFingerprint),
      sourceMetadata: {
        key: 'weight',
        source: 'wtValveweights.json',
        sourceType: 'worker-import',
        status: 'loaded',
        rowCount: WEIGHT_ROWS.length,
      },
    });

    const custody = JSON.parse(storage.values.get('xml-cii-master-source-weight') || '{}');
    const stateRef = startupState();
    const store = {
      async getMetadata(id) {
        return id === 'issue855:wt:r5'
          ? {
            datasetId: id,
            datasetRevision: expectedDatasetRevision,
            rowCount: WEIGHT_ROWS.length,
            fileName: 'wtValveweights.json',
            mappingRows: WEIGHT_ROWS,
            masterFingerprint: expectedFingerprint,
          }
          : null;
      },
      async getRowsRange(id, offset, limit) {
        return id === 'issue855:wt:r5' ? WEIGHT_ROWS.slice(offset, offset + limit) : null;
      },
      async getRows(id) {
        return id === 'issue855:wt:r5' ? WEIGHT_ROWS : null;
      },
    };

    const changed = await hydratePersistedMasterDatasets(stateRef, { store });
    const coldRef = stateRef.current.masterContext.datasetRefs.weight;
    const observation = {
      commitDatasetRevision: committed.datasetRef?.datasetRevision ?? null,
      custodyDatasetRevision: custody.datasetRevision ?? null,
      coldDatasetRevision: coldRef?.datasetRevision ?? null,
      runtimeFingerprint: committed.datasetRef?.masterFingerprint ?? null,
      custodyFingerprint: custody.masterFingerprint ?? null,
      coldFingerprint: coldRef?.masterFingerprint ?? null,
      commitAppliedRevision: committed.revision,
      commitConfigMasterRevision: committed.config?.weight?.masterRevision ?? null,
      coldAppliedRevision: stateRef.current.masterContext.appliedMappingRevision.weight,
      coldConfigMasterRevision: stateRef.current.masterContext.config?.weight?.masterRevision ?? null,
      datasetIdStable: coldRef?.datasetId === committed.datasetRef?.datasetId,
      rowCountStable: coldRef?.rowCount === WEIGHT_ROWS.length,
      compactNoNormalizedDuplicate: !storage.values.has('xml-cii-master-weight'),
      compactNoRawDuplicate: !storage.values.has('xml-cii-master-raw-weight'),
    };
    t.diagnostic(JSON.stringify(observation));

    assert.equal(changed, true);
    assert.equal(observation.commitDatasetRevision, expectedDatasetRevision, 'weight datasetRef must retain worker datasetRevision');
    assert.equal(observation.custodyDatasetRevision, expectedDatasetRevision, 'weight restart custody must retain datasetRevision');
    assert.equal(observation.coldDatasetRevision, expectedDatasetRevision, 'cold weight datasetRef must restore datasetRevision');
    assert.equal(observation.runtimeFingerprint, expectedFingerprint);
    assert.equal(observation.custodyFingerprint, expectedFingerprint);
    assert.equal(observation.coldFingerprint, expectedFingerprint);
    assert.equal(observation.commitAppliedRevision, 11);
    assert.equal(observation.commitConfigMasterRevision, 11);
    assert.equal(observation.coldAppliedRevision, 11);
    assert.equal(observation.coldConfigMasterRevision, 11);
    assert.notEqual(observation.commitConfigMasterRevision, expectedDatasetRevision, 'applied masterRevision must remain distinct from datasetRevision');
    assert.equal(observation.datasetIdStable, true);
    assert.equal(observation.rowCountStable, true);
    assert.equal(observation.compactNoNormalizedDuplicate, true);
    assert.equal(observation.compactNoRawDuplicate, true);
  } finally {
    storage.restore();
  }
});

test('C05.4.1 protected semantics stay green while only Valve Weight datasetRevision remains RED', async () => {
  const storage = installStorage({
    'xml-cii-master-source-pipingClass': JSON.stringify({
      source: 'Piping class master.xlsx',
      datasetId: 'issue855:pc:r4',
      datasetRevision: 4,
      rowCount: 1,
      fieldMap: {},
      appliedRevision: 2,
      persistenceMode: 'indexeddb',
    }),
    'xml-cii-master-source-materialMap': JSON.stringify({
      source: 'PCF_MAT_MAP.TXT',
      datasetId: 'issue855:mat:r3',
      datasetRevision: 3,
      rowCount: 1,
      fieldMap: {},
      appliedRevision: 3,
      persistenceMode: 'indexeddb',
    }),
    'xml-cii-master-source-weight': JSON.stringify({
      source: 'wtValveweights.json',
      datasetId: 'issue855:wt:r5',
      datasetRevision: 5,
      rowCount: 1,
      fieldMap: {},
      appliedRevision: 11,
      persistenceMode: 'indexeddb',
      masterFingerprint: 'fp-c05-4-weight',
    }),
  });
  const rows = {
    'issue855:pc:r4': [{ Marker: 'PC' }],
    'issue855:mat:r3': [{ Marker: 'MAT' }],
    'issue855:wt:r5': [{ Marker: 'WT' }],
  };
  const store = {
    async getMetadata(id) {
      if (!rows[id]) return null;
      if (id === 'issue855:pc:r4') {
        return { datasetId: id, datasetRevision: 4, rowCount: 1, fileName: 'Piping class master.xlsx', mappingRows: rows[id] };
      }
      if (id === 'issue855:mat:r3') {
        return { datasetId: id, datasetRevision: 3, rowCount: 1, fileName: 'PCF_MAT_MAP.TXT', mappingRows: rows[id] };
      }
      return {
        datasetId: id,
        datasetRevision: 5,
        rowCount: 1,
        fileName: 'wtValveweights.json',
        mappingRows: rows[id],
        masterFingerprint: 'fp-c05-4-weight',
      };
    },
    async getRowsRange(id) { return rows[id] || null; },
    async getRows(id) { return rows[id] || null; },
  };
  const stateRef = startupState();
  try {
    assert.equal(await hydratePersistedMasterDatasets(stateRef, { store }), true);
    const context = stateRef.current.masterContext;
    assert.equal(context.datasetRefs.pipingClass.datasetRevision, 4);
    assert.equal(context.datasetRefs.materialMap.datasetRevision, 3);
    assert.equal(context.datasetRefs.weight.datasetRevision, undefined);
    assert.equal(context.datasetRefs.weight.masterFingerprint, 'fp-c05-4-weight');
    assert.equal(context.appliedMappingRevision.weight, 11);
    assert.equal(context.config.weight.masterRevision, 11);
    assert.notEqual(context.config.weight.masterRevision, 5);
  } finally {
    storage.restore();
  }
});
