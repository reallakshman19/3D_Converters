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
    config: {}, rawRows: {}, mappingRows: {}, datasetRefs: {}, rowCounts: {},
    previewRows: {}, sourceMetadata: {}, appliedMappingRevision: {},
  };
}

function startupState() {
  return { current: { supportConfigJson: '{}', masterContext: blankContext() } };
}

test('C05.4.1 Valve Weight RED baseline isolates datasetRevision loss without disturbing weight identity semantics', async (t) => {
  const storage = installStorage();
  const rows = [{ Marker: 'WT-1' }, { Marker: 'WT-2' }];
  const expectedDatasetRevision = 5;
  const expectedFingerprint = 'issue855-weight-fingerprint';
  try {
    const committed = commitDatasetReadyMaster({
      context: blankContext(),
      config: {},
      key: 'weight',
      ready: {
        metadata: {
          datasetId: 'issue855:wt:r5',
          datasetRevision: expectedDatasetRevision,
          rowCount: rows.length,
          masterKey: 'weight',
          fileName: 'wtValveweights.xlsx',
          fieldMap: { marker: 'Marker' },
          masterFingerprint: expectedFingerprint,
        },
        previewRows: rows,
        mappingRows: rows,
      },
      sourceMetadata: {
        key: 'weight',
        source: 'wtValveweights.xlsx',
        sourceType: 'worker-import',
        status: 'loaded',
        rowCount: rows.length,
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
            rowCount: rows.length,
            fileName: 'wtValveweights.xlsx',
            mappingRows: rows,
            masterFingerprint: expectedFingerprint,
          }
          : null;
      },
      async getRowsRange(id, offset, limit) {
        return id === 'issue855:wt:r5' ? rows.slice(offset, offset + limit) : null;
      },
      async getRows(id) { return id === 'issue855:wt:r5' ? rows : null; },
    };

    const changed = await hydratePersistedMasterDatasets(stateRef, { store });
    const coldRef = stateRef.current.masterContext.datasetRefs.weight;
    const observation = {
      commitDatasetRevision: committed.datasetRef?.datasetRevision ?? null,
      custodyDatasetRevision: custody.datasetRevision ?? null,
      coldDatasetRevision: coldRef?.datasetRevision ?? null,
      datasetIdStable: coldRef?.datasetId === committed.datasetRef?.datasetId,
      fingerprintCommit: committed.datasetRef?.masterFingerprint ?? null,
      fingerprintCustody: custody.masterFingerprint ?? null,
      fingerprintCold: coldRef?.masterFingerprint ?? null,
      appliedRevisionCommit: committed.revision,
      configMasterRevisionCommit: committed.config.weight?.masterRevision ?? null,
      appliedRevisionCold: stateRef.current.masterContext.appliedMappingRevision.weight,
      configMasterRevisionCold: stateRef.current.masterContext.config.weight?.masterRevision ?? null,
      rowCountStable: coldRef?.rowCount === rows.length,
      compactNoNormalizedDuplicate: !storage.values.has('xml-cii-master-weight'),
      compactNoRawDuplicate: !storage.values.has('xml-cii-master-raw-weight'),
    };
    t.diagnostic(JSON.stringify(observation));

    assert.equal(changed, true);
    assert.equal(observation.commitDatasetRevision, null, 'RED: weight datasetRef currently drops worker datasetRevision');
    assert.equal(observation.custodyDatasetRevision, null, 'RED: restart custody currently drops weight datasetRevision');
    assert.equal(observation.coldDatasetRevision, null, 'RED: cold weight datasetRef currently drops datasetRevision');

    assert.equal(observation.datasetIdStable, true);
    assert.equal(observation.fingerprintCommit, expectedFingerprint);
    assert.equal(observation.fingerprintCustody, expectedFingerprint);
    assert.equal(observation.fingerprintCold, expectedFingerprint);
    assert.equal(observation.configMasterRevisionCommit, observation.appliedRevisionCommit);
    assert.equal(observation.configMasterRevisionCold, observation.appliedRevisionCold);
    assert.notEqual(observation.configMasterRevisionCommit, expectedDatasetRevision);
    assert.equal(observation.rowCountStable, true);
    assert.equal(observation.compactNoNormalizedDuplicate, true);
    assert.equal(observation.compactNoRawDuplicate, true);
  } finally {
    storage.restore();
  }
});

test('C05.4.1 predecessor masters stay green while Valve Weight remains revision-RED', async () => {
  const storage = installStorage({
    'xml-cii-master-source-pipingClass': JSON.stringify({
      source: 'Piping class master.xlsx', datasetId: 'issue855:pc:r4', datasetRevision: 4,
      rowCount: 1, fieldMap: {}, appliedRevision: 2, persistenceMode: 'indexeddb',
    }),
    'xml-cii-master-source-materialMap': JSON.stringify({
      source: 'PCF_MAT_MAP.TXT', datasetId: 'issue855:mat:r3', datasetRevision: 3,
      rowCount: 1, fieldMap: {}, appliedRevision: 3, persistenceMode: 'indexeddb',
    }),
    'xml-cii-master-source-weight': JSON.stringify({
      source: 'wtValveweights.xlsx', datasetId: 'issue855:wt:r5', datasetRevision: 5,
      rowCount: 1, fieldMap: {}, appliedRevision: 4, persistenceMode: 'indexeddb',
      masterFingerprint: 'fp',
    }),
  });
  const rows = {
    'issue855:pc:r4': [{ Marker: 'PC' }],
    'issue855:mat:r3': [{ Marker: 'MAT' }],
    'issue855:wt:r5': [{ Marker: 'WT' }],
  };
  const revisions = {
    'issue855:pc:r4': 4,
    'issue855:mat:r3': 3,
    'issue855:wt:r5': 5,
  };
  const stateRef = startupState();
  try {
    assert.equal(await hydratePersistedMasterDatasets(stateRef, {
      store: {
        async getMetadata(id) {
          if (!rows[id]) return null;
          return {
            datasetId: id,
            datasetRevision: revisions[id],
            rowCount: 1,
            fileName: id.includes(':pc:') ? 'Piping class master.xlsx'
              : id.includes(':mat:') ? 'PCF_MAT_MAP.TXT' : 'wtValveweights.xlsx',
            mappingRows: rows[id],
            ...(id.includes(':wt:') ? { masterFingerprint: 'fp' } : {}),
          };
        },
        async getRowsRange(id) { return rows[id] || null; },
        async getRows(id) { return rows[id] || null; },
      },
    }), true);

    assert.equal(stateRef.current.masterContext.datasetRefs.pipingClass.datasetRevision, 4);
    assert.equal(stateRef.current.masterContext.datasetRefs.materialMap.datasetRevision, 3);
    assert.equal(stateRef.current.masterContext.datasetRefs.weight.datasetRevision, undefined);
    assert.equal(stateRef.current.masterContext.datasetRefs.weight.masterFingerprint, 'fp');
    assert.equal(stateRef.current.masterContext.config.weight.masterRevision, 4);
  } finally {
    storage.restore();
  }
});
