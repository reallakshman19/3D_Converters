from pathlib import Path

ROOT = Path('.')

def read(path): return (ROOT / path).read_text(encoding='utf-8')
def write(path, text):
    p = ROOT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding='utf-8')
def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1: raise SystemExit(f'{label}: expected exactly one match, found {count}')
    return text.replace(old, new, 1)

# Protocol.
path = 'tabs/xml-cii-2019-standalone/workers/master-dataset-protocol.js'
s = read(path)
s = replace_once(s, "  SELECT_SHEET: 'SELECT_SHEET',\n", "  SELECT_SHEET: 'SELECT_SHEET',\n  REMAP_DATASET: 'REMAP_DATASET',\n", 'protocol remap command')
write(path, s)

# Client.
path = 'tabs/xml-cii-2019-standalone/workers/master-dataset-client.js'
s = read(path)
s = replace_once(s, "  function search(datasetId, query) {\n    return request(MASTER_DATASET_COMMAND.SEARCH, { datasetId, query });\n  }\n", "  function remapDataset(datasetId, fieldMap = {}) {\n    if (!datasetId) throw new Error('datasetId is required.');\n    return request(MASTER_DATASET_COMMAND.REMAP_DATASET, { datasetId, fieldMap: { ...(fieldMap || {}) } });\n  }\n\n  function search(datasetId, query) {\n    return request(MASTER_DATASET_COMMAND.SEARCH, { datasetId, query });\n  }\n", 'client remap method')
s = replace_once(s, "    openBuffer, openFile, selectSheet, search, getRows, getRowsByIndexes, getRawRows,\n", "    openBuffer, openFile, selectSheet, remapDataset, search, getRows, getRowsByIndexes, getRawRows,\n", 'client remap export')
write(path, s)

# Service: worker-owned fingerprint + atomic remap revision.
path = 'tabs/xml-cii-2019-standalone/workers/master-dataset-service.js'
s = read(path)
s = replace_once(s, "import { listWorkbookSheets, parseTextSource, parseWorkbookSheet, sourceNeedsSheetSelection } from './master-dataset-parser.js';\n", "import { listWorkbookSheets, parseTextSource, parseWorkbookSheet, sourceNeedsSheetSelection } from './master-dataset-parser.js';\nimport { xmlCiiWeightMasterRowsFingerprint } from '../../../converters/xml-cii2019-core/rigid-weight-authority.js';\n", 'service fingerprint import')
s = replace_once(s, "    source.datasetRevision = Number(source.datasetRevision || 0) + 1;\n    const metadata = {\n      datasetId: datasetIdFor(source.jobId, source.masterKey, sheetName, source.datasetRevision),\n", "    let nextRevision = Number(source.datasetRevision || 0) + 1;\n    while (datasets.has(datasetIdFor(source.jobId, source.masterKey, sheetName, nextRevision))) nextRevision += 1;\n    source.datasetRevision = nextRevision;\n    const metadata = {\n      datasetId: datasetIdFor(source.jobId, source.masterKey, sheetName, source.datasetRevision),\n", 'service collision-safe revision')
s = replace_once(s, "      fieldMapOverride: source.fieldMapOverride,\n    };\n", "      fieldMapOverride: source.fieldMapOverride,\n      ...(source.masterKey === 'weight' ? { masterFingerprint: xmlCiiWeightMasterRowsFingerprint(prepared.rows) } : {}),\n    };\n", 'service weight fingerprint')
anchor = "  async function ensureDataset(datasetId) {\n"
insert = """  async function remapDataset(message) {
    const dataset = await ensureDataset(message.datasetId);
    if (!Array.isArray(dataset.rawRows)) {
      throw new Error(`Raw rows are session-only and unavailable for dataset remap: ${message.datasetId}`);
    }
    if (!message.fieldMap || typeof message.fieldMap !== 'object' || Array.isArray(message.fieldMap)) {
      throw new Error('REMAP_DATASET requires a fieldMap object.');
    }
    const base = dataset.metadata || {};
    const source = sources.get(base.jobId) || {
      jobId: base.jobId,
      fileName: base.fileName,
      masterKey: base.masterKey,
      config: base.config || {},
      currentMap: base.currentMap || {},
      fieldMapOverride: null,
      datasetRevision: Number(base.datasetRevision || 0),
    };
    source.datasetRevision = Math.max(Number(source.datasetRevision || 0), Number(base.datasetRevision || 0));
    source.fieldMapOverride = { ...message.fieldMap };
    const ready = await finalizeDataset(source, dataset.rawRows, base.sheetName || '');
    return response(MASTER_DATASET_EVENT.DATASET_READY, message.requestId, ready);
  }

"""
s = replace_once(s, anchor, insert + anchor, 'service remap implementation')
s = replace_once(s, "      case MASTER_DATASET_COMMAND.SELECT_SHEET: return selectSheet(message);\n", "      case MASTER_DATASET_COMMAND.SELECT_SHEET: return selectSheet(message);\n      case MASTER_DATASET_COMMAND.REMAP_DATASET: return remapDataset(message);\n", 'service remap dispatch')
write(path, s)

# Coordinator.
path = 'tabs/xml-cii-2019-standalone/workers/master-dataset-import-coordinator.js'
s = read(path)
anchor = "  function workbookJob(masterKey) {\n    const job = jobs.get(masterKey);\n    return job ? { jobId: job.jobId, sheetNames: [...job.sheetNames] } : null;\n  }\n\n"
insert = """  async function remapDataset(masterKey, datasetId, fieldMap = {}) {
    const activeId = datasetId || activeDatasets.get(masterKey);
    if (!activeId) throw new Error(`No active dataset exists for ${masterKey}.`);
    return remember(masterKey, await client.remapDataset(activeId, fieldMap));
  }

"""
s = replace_once(s, anchor, anchor + insert, 'coordinator remap method')
s = replace_once(s, "  return Object.freeze({ openFile, openBuffer, selectSheet, workbookJob, materialize, materializeRows, releaseMaster, search, getRows, getRowsByIndexes, dispose });\n", "  return Object.freeze({ openFile, openBuffer, selectSheet, workbookJob, remapDataset, materialize, materializeRows, releaseMaster, search, getRows, getRowsByIndexes, dispose });\n", 'coordinator remap export')
write(path, s)

# Shared runtime exposure.
path = 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-dataset-runtime.js'
s = read(path)
anchor = "export function getMasterDatasetRowsByIndexes(masterKey, datasetId, indexes = []) {\n  return masterDatasetCoordinator.getRowsByIndexes(masterKey, indexes, datasetId);\n}\n\n"
insert = """export function remapMasterDataset(masterKey, datasetId, fieldMap = {}) {
  return masterDatasetCoordinator.remapDataset(masterKey, datasetId, fieldMap);
}

"""
s = replace_once(s, anchor, anchor + insert, 'runtime remap export')
write(path, s)

# Focused worker remap regression.
write('tests/xml-cii-master-dataset-remap.test.mjs', """import test from 'node:test';
import assert from 'node:assert/strict';

import { MASTER_DATASET_COMMAND, MASTER_DATASET_EVENT } from '../tabs/xml-cii-2019-standalone/workers/master-dataset-protocol.js';
import { createMasterDatasetService } from '../tabs/xml-cii-2019-standalone/workers/master-dataset-service.js';
import { createMasterDatasetImportCoordinator } from '../tabs/xml-cii-2019-standalone/workers/master-dataset-import-coordinator.js';
import { xmlCiiWeightMasterRowsFingerprint } from '../converters/xml-cii2019-core/rigid-weight-authority.js';

function bytes(value) { return new TextEncoder().encode(value).buffer; }
function memoryStore() {
  const data = new Map();
  return {
    data,
    async persistDataset(metadata, rows) { data.set(metadata.datasetId, { metadata: structuredClone(metadata), rows: structuredClone(rows) }); },
    async getMetadata(id) { return data.get(id)?.metadata || null; },
    async getRows(id) { return data.get(id)?.rows || null; },
  };
}

function serviceWithStore(store) {
  return createMasterDatasetService({
    getXlsx: async () => { throw new Error('xlsx not used'); },
    store,
    prepareDataset(masterKey, rawRows, _currentMap, _config, override) {
      const fieldMap = override || { value: 'A' };
      const rows = rawRows.map((row, index) => ({ ...row, _rowIndex: index + 1, value: row[fieldMap.value] ?? '' }));
      return { fieldMap, rows, searchCorpus: rows.map((row) => String(row.value).toLowerCase()) };
    },
    buildSearchCorpus: (rows) => rows.map((row) => String(row.value).toLowerCase()),
    searchCorpusIndexes: (corpus, query) => corpus.map((value, index) => value.includes(String(query).toLowerCase()) ? index : -1).filter((index) => index >= 0),
  });
}

test('worker remap creates a new dataset revision and preserves the prior persisted dataset', async () => {
  const store = memoryStore();
  const service = serviceWithStore(store);
  const raw = [{ A: 'old-1', B: 'new-1' }, { A: 'old-2', B: 'new-2' }];
  const first = await service.handle({
    type: MASTER_DATASET_COMMAND.OPEN_SOURCE, requestId: 'open', jobId: 'job-remap', fileName: 'rows.json', masterKey: 'lineList',
    buffer: bytes(JSON.stringify(raw)), config: {}, currentMap: {},
  });
  assert.equal(first.type, MASTER_DATASET_EVENT.DATASET_READY);
  assert.match(first.metadata.datasetId, /:r1$/);
  assert.deepEqual(store.data.get(first.metadata.datasetId).rows.map((row) => row.value), ['old-1', 'old-2']);

  const second = await service.handle({
    type: MASTER_DATASET_COMMAND.REMAP_DATASET, requestId: 'remap', datasetId: first.metadata.datasetId, fieldMap: { value: 'B' },
  });
  assert.equal(second.type, MASTER_DATASET_EVENT.DATASET_READY);
  assert.match(second.metadata.datasetId, /:r2$/);
  assert.notEqual(second.metadata.datasetId, first.metadata.datasetId);
  assert.deepEqual(store.data.get(first.metadata.datasetId).rows.map((row) => row.value), ['old-1', 'old-2']);
  assert.deepEqual(store.data.get(second.metadata.datasetId).rows.map((row) => row.value), ['new-1', 'new-2']);
  assert.equal(store.data.size, 2);
});

test('worker emits Weight master fingerprint in dataset metadata', async () => {
  const store = memoryStore();
  const service = serviceWithStore(store);
  const raw = [{ A: '10', B: '11' }, { A: '20', B: '22' }];
  const ready = await service.handle({
    type: MASTER_DATASET_COMMAND.OPEN_SOURCE, requestId: 'weight-open', jobId: 'weight-job', fileName: 'weight.json', masterKey: 'weight',
    buffer: bytes(JSON.stringify(raw)), config: {}, currentMap: {},
  });
  const persisted = store.data.get(ready.metadata.datasetId).rows;
  assert.equal(ready.metadata.masterFingerprint, xmlCiiWeightMasterRowsFingerprint(persisted));
  assert.ok(ready.metadata.masterFingerprint);
});

test('remap fails closed after raw session custody is unavailable', async () => {
  const store = memoryStore();
  const firstService = serviceWithStore(store);
  const raw = [{ A: 'old', B: 'new' }];
  const ready = await firstService.handle({
    type: MASTER_DATASET_COMMAND.OPEN_SOURCE, requestId: 'open', jobId: 'job-reload', fileName: 'rows.json', masterKey: 'lineList',
    buffer: bytes(JSON.stringify(raw)), config: {}, currentMap: {},
  });
  const reloadedService = serviceWithStore(store);
  await assert.rejects(
    () => reloadedService.handle({ type: MASTER_DATASET_COMMAND.REMAP_DATASET, requestId: 'remap', datasetId: ready.metadata.datasetId, fieldMap: { value: 'B' } }),
    /Raw rows are session-only/,
  );
});

test('coordinator promotes remapped dataset to active custody', async () => {
  const calls = [];
  const client = {
    async remapDataset(datasetId, fieldMap) {
      calls.push({ datasetId, fieldMap });
      return { type: MASTER_DATASET_EVENT.DATASET_READY, metadata: { datasetId: 'ds-r2', rowCount: 2 } };
    },
    dispose() {},
  };
  const coordinator = createMasterDatasetImportCoordinator({ client });
  const result = await coordinator.remapDataset('lineList', 'ds-r1', { lineNo: 'Line' });
  assert.equal(result.metadata.datasetId, 'ds-r2');
  assert.deepEqual(calls, [{ datasetId: 'ds-r1', fieldMap: { lineNo: 'Line' } }]);
  const active = await coordinator.remapDataset('lineList', '', { lineNo: 'Line2' });
  assert.equal(active.metadata.datasetId, 'ds-r2');
  assert.equal(calls[1].datasetId, 'ds-r2');
});
""")

for source in [
    'tabs/xml-cii-2019-standalone/workers/master-dataset-protocol.js',
    'tabs/xml-cii-2019-standalone/workers/master-dataset-client.js',
    'tabs/xml-cii-2019-standalone/workers/master-dataset-service.js',
    'tabs/xml-cii-2019-standalone/workers/master-dataset-import-coordinator.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-dataset-runtime.js',
]:
    write('docs/' + source, read(source))

print('PR780 Phase E-B1 patch applied.')
