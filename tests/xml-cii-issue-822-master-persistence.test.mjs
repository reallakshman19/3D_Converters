import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

import { hydratePersistedMasterDatasets } from '../tabs/xml-cii-2019-standalone/workers/master-dataset-startup-hydration.js';
import { createMasterDatasetService } from '../tabs/xml-cii-2019-standalone/workers/master-dataset-service.js';
import { MASTER_DATASET_COMMAND, MASTER_DATASET_EVENT } from '../tabs/xml-cii-2019-standalone/workers/master-dataset-protocol.js';
import { commitDatasetReadyMaster } from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-dataset-commit.js';

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

function custody(source, datasetId, rowCount, appliedRevision, datasetRevision, extra = {}) {
  return JSON.stringify({
    source, datasetId, rowCount, appliedRevision, datasetRevision,
    persistenceMode: 'indexeddb',
    fieldMap: { marker: 'Marker' },
    ...extra,
  });
}

function startupState() {
  return {
    current: {
      supportConfigJson: JSON.stringify({
        pipingClass: { fieldMap: {} },
        material: { fieldMap: {} },
        weight: { fieldMap: {} },
      }),
      masterContext: {
        config: {},
        rawRows: {},
        mappingRows: {},
        datasetRefs: {},
        rowCounts: {},
        previewRows: {},
        sourceMetadata: {},
        appliedMappingRevision: {},
      },
    },
  };
}

function bytes(text) {
  return new TextEncoder().encode(text).buffer;
}

function prepareDataset(_masterKey, rawRows, currentMap = {}) {
  return {
    fieldMap: Object.keys(currentMap || {}).length ? currentMap : { marker: 'Marker' },
    rows: rawRows.map((row, index) => ({ ...row, _rowIndex: index + 1 })),
    searchCorpus: rawRows.map((row) => Object.values(row).join(' ').toLowerCase()),
  };
}

test('C05 cold hydration restores piping class, material map and weight identity plus dataset revision', async () => {
  const storage = installStorage({
    'xml-cii-master-source-pipingClass': custody('Piping class master.xlsx', 'pc:r3', 2, 4, 3),
    'xml-cii-master-source-materialMap': custody('PCF_MAT_MAP.TXT', 'mat:r2', 2, 6, 2),
    'xml-cii-master-source-weight': custody('wtValveweights.xlsx', 'wt:r5', 2, 8, 5, { masterFingerprint: 'fp-weight' }),
  });
  const rows = {
    'pc:r3': [{ Marker: 'PC-1' }, { Marker: 'PC-2' }],
    'mat:r2': [{ Marker: 'MAT-1' }, { Marker: 'MAT-2' }],
    'wt:r5': [{ Marker: 'WT-1' }, { Marker: 'WT-2' }],
  };
  const revisions = { 'pc:r3': 3, 'mat:r2': 2, 'wt:r5': 5 };
  const store = {
    async getMetadata(id) {
      return rows[id] ? {
        datasetId: id, rowCount: rows[id].length, datasetRevision: revisions[id],
        fileName: id.startsWith('pc') ? 'Piping class master.xlsx' : id.startsWith('mat') ? 'PCF_MAT_MAP.TXT' : 'wtValveweights.xlsx',
        mappingRows: rows[id],
        ...(id.startsWith('wt') ? { masterFingerprint: 'fp-weight' } : {}),
      } : null;
    },
    async getRowsRange(id, offset, limit) { return rows[id]?.slice(offset, offset + limit) || null; },
    async getRows(id) { return rows[id] || null; },
  };
  const stateRef = startupState();
  try {
    const changed = await hydratePersistedMasterDatasets(stateRef, { store });
    assert.equal(changed, true);
    for (const [key, id, revision, appliedRevision] of [
      ['pipingClass', 'pc:r3', 3, 4],
      ['materialMap', 'mat:r2', 2, 6],
      ['weight', 'wt:r5', 5, 8],
    ]) {
      const ref = stateRef.current.masterContext.datasetRefs[key];
      assert.equal(ref.datasetId, id, `${key} dataset identity must survive cold hydration`);
      assert.equal(ref.datasetRevision, revision, `${key} dataset revision must survive cold hydration`);
      assert.equal(stateRef.current.masterContext.appliedMappingRevision[key], appliedRevision);
      assert.equal(stateRef.current.masterContext.rowCounts[key], 2);
    }
    assert.equal(stateRef.current.masterContext.datasetRefs.weight.masterFingerprint, 'fp-weight');
  } finally {
    storage.restore();
  }
});

test('C05 one stale persisted master does not suppress other valid cold restores', async () => {
  const storage = installStorage({
    'xml-cii-master-source-pipingClass': custody('Piping class master.xlsx', 'pc:ok', 1, 2, 1),
    'xml-cii-master-source-materialMap': custody('PCF_MAT_MAP.TXT', 'mat:missing', 1, 3, 1),
    'xml-cii-master-source-weight': custody('wtValveweights.xlsx', 'wt:ok', 1, 4, 1, { masterFingerprint: 'fp' }),
  });
  const store = {
    async getMetadata(id) {
      if (id === 'mat:missing') return null;
      return { datasetId: id, rowCount: 1, datasetRevision: 1, fileName: id === 'pc:ok' ? 'Piping class master.xlsx' : 'wtValveweights.xlsx', mappingRows: [{ Marker: id }], ...(id === 'wt:ok' ? { masterFingerprint: 'fp' } : {}) };
    },
    async getRowsRange(id) { return id === 'mat:missing' ? null : [{ Marker: id }]; },
    async getRows(id) { return id === 'mat:missing' ? null : [{ Marker: id }]; },
  };
  const stateRef = startupState();
  try {
    const changed = await hydratePersistedMasterDatasets(stateRef, { store });
    assert.equal(changed, true);
    assert.equal(stateRef.current.masterContext.datasetRefs.pipingClass.datasetId, 'pc:ok');
    assert.equal(stateRef.current.masterContext.datasetRefs.weight.datasetId, 'wt:ok');
    assert.equal(stateRef.current.masterContext.datasetRefs.materialMap, undefined);
    assert.match(stateRef.current.importMastersWriteBackStatus || '', /materialMap/i);
    assert.match(stateRef.current.importMastersWriteBackStatus || '', /unavailable|failed/i);
  } finally {
    storage.restore();
  }
});

test('C05 IndexedDB persistence failure keeps a parsed worker dataset usable in the active session', async () => {
  const persistenceError = Object.assign(new Error('IndexedDB quota exceeded'), { name: 'QuotaExceededError' });
  const store = {
    async persistDataset() { throw persistenceError; },
    async getRows() { return null; },
  };
  const service = createMasterDatasetService({
    getXlsx: async () => { throw new Error('XLSX must not be needed for JSON'); },
    store,
    prepareDataset,
    buildSearchCorpus: (rows) => rows.map((row) => JSON.stringify(row).toLowerCase()),
    searchCorpusIndexes: () => [],
  });
  const ready = await service.handle({
    type: MASTER_DATASET_COMMAND.OPEN_SOURCE,
    requestId: 'open-pc',
    jobId: 'job-pc',
    fileName: 'Piping class master.json',
    masterKey: 'pipingClass',
    buffer: bytes(JSON.stringify([{ Marker: 'PC-1' }, { Marker: 'PC-2' }])),
    config: {},
    currentMap: {},
  });
  assert.equal(ready.type, MASTER_DATASET_EVENT.DATASET_READY);
  assert.equal(ready.metadata.rowCount, 2);
  assert.equal(ready.metadata.persistenceMode, 'session');
  assert.equal(ready.persistence.persisted, false);
  assert.equal(ready.persistence.failure.name, 'QuotaExceededError');

  const rows = await service.handle({
    type: MASTER_DATASET_COMMAND.GET_ROWS,
    requestId: 'rows-pc',
    datasetId: ready.metadata.datasetId,
    offset: 0,
    limit: 10,
  });
  assert.deepEqual(rows.rows.map((row) => row.Marker), ['PC-1', 'PC-2']);
});

test('C05 session-only dataset commit never writes false indexeddb restart custody', () => {
  const storage = installStorage();
  try {
    const committed = commitDatasetReadyMaster({
      context: { config: {}, appliedMappingRevision: { pipingClass: 0 } },
      config: {},
      key: 'pipingClass',
      ready: {
        metadata: {
          datasetId: 'session-pc:r1',
          datasetRevision: 1,
          rowCount: 2,
          masterKey: 'pipingClass',
          fileName: 'Piping class master.xlsx',
          fieldMap: { marker: 'Marker' },
          persistenceMode: 'session',
        },
        previewRows: [{ marker: 'PC-1' }],
        mappingRows: [{ Marker: 'PC-1' }],
        persistence: {
          persisted: false,
          failure: { name: 'QuotaExceededError', message: 'IndexedDB quota exceeded' },
          quotaLimited: true,
        },
      },
      sourceMetadata: { key: 'pipingClass', source: 'Piping class master.xlsx', sourceType: 'worker-import', status: 'loaded', rowCount: 2 },
    });
    assert.equal(committed.context.datasetRefs.pipingClass.datasetId, 'session-pc:r1');
    assert.equal(committed.context.datasetRefs.pipingClass.datasetRevision, 1);
    assert.equal(committed.context.datasetRefs.pipingClass.persistence, 'session');
    assert.equal(committed.persistence.indexedDbBacked, false);
    assert.equal(committed.persistence.failures.some((failure) => failure.name === 'QuotaExceededError'), true);
    const restart = JSON.parse(storage.values.get('xml-cii-master-source-pipingClass'));
    assert.notEqual(restart.persistenceMode, 'indexeddb');
    assert.equal(restart.datasetId, undefined);
  } finally {
    storage.restore();
  }
});

test('C05 active Mode-A shell surfaces persisted-master restore failures to the user', async () => {
  const source = await fs.readFile(new URL('../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-workflow-shell-mode-a-easy-bulk-v6.js', import.meta.url), 'utf8');
  assert.match(source, /hydratePersistedMasterDatasets/);
  assert.match(source, /importMastersWriteBackStatus/);
  assert.match(source, /Persisted master restore failed/);
});
