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

# IndexedDB bounded row read for metadata-only startup preview.
path = 'tabs/xml-cii-2019-standalone/workers/master-dataset-store.js'
s = read(path)
old = """  async function getRows(datasetId) {
    const metadata = await getMetadata(datasetId);
    if (!metadata) return null;
    const database = await db();
    const tx = database.transaction(CHUNKS);
    const store = tx.objectStore(CHUNKS);
    const rows = [];
    const chunkCount = Math.ceil(Number(metadata.rowCount || 0) / chunkRows);
    for (let index = 0; index < chunkCount; index += 1) {
      const chunk = await requestResult(store.get(`${datasetId}:${index}`));
      if (Array.isArray(chunk?.rows)) rows.push(...chunk.rows);
    }
    return rows;
  }
"""
new = old + """
  async function getRowsRange(datasetId, offset = 0, limit = 150) {
    const metadata = await getMetadata(datasetId);
    if (!metadata) return null;
    const rowCount = Math.max(0, Number(metadata.rowCount || 0));
    const start = Math.max(0, Math.min(rowCount, Number(offset) || 0));
    const count = Math.max(0, Math.min(rowCount - start, Number(limit) || 0));
    if (!count) return [];
    const end = start + count;
    const firstChunk = Math.floor(start / chunkRows);
    const lastChunk = Math.floor((end - 1) / chunkRows);
    const database = await db();
    const tx = database.transaction(CHUNKS);
    const store = tx.objectStore(CHUNKS);
    const rows = [];
    for (let index = firstChunk; index <= lastChunk; index += 1) {
      const chunk = await requestResult(store.get(`${datasetId}:${index}`));
      const chunkRowsValue = Array.isArray(chunk?.rows) ? chunk.rows : [];
      const chunkStart = index * chunkRows;
      const from = Math.max(0, start - chunkStart);
      const to = Math.min(chunkRowsValue.length, end - chunkStart);
      if (to > from) rows.push(...chunkRowsValue.slice(from, to));
    }
    return rows;
  }
"""
s = replace_once(s, old, new, 'store bounded rows')
s = replace_once(s, "return Object.freeze({ persistDataset, getMetadata, getRows, deleteDataset });", "return Object.freeze({ persistDataset, getMetadata, getRows, getRowsRange, deleteDataset });", 'store export range')
write(path, s)

# Startup restore now keeps only metadata + bounded normalized preview in main-thread state.
path = 'tabs/xml-cii-2019-standalone/workers/master-dataset-startup-hydration.js'
write(path, """import { xmlCiiWeightMasterRowsFingerprint } from '../../../converters/xml-cii2019-core/rigid-weight-authority.js';
import { createIndexedDbDatasetStore } from './master-dataset-store.js';

const MASTER_DEFS = Object.freeze({
  lineList: Object.freeze({ rowsKey: 'lineRows', configKey: 'linelist', rowsProperty: 'masterRows' }),
  pipingClass: Object.freeze({ rowsKey: 'pipingClassRows', configKey: 'pipingClass', rowsProperty: 'masterRows' }),
  materialMap: Object.freeze({ rowsKey: 'materialMapRows', configKey: 'material', rowsProperty: 'mapRows' }),
  weight: Object.freeze({ rowsKey: 'weightMasterRows', configKey: 'weight', rowsProperty: 'masterRows' }),
});

const STARTUP_PREVIEW_ROWS = 150;

function storedJson(key) {
  if (typeof localStorage === 'undefined') return null;
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function supportConfigFrom(state) {
  try {
    const parsed = JSON.parse(state?.supportConfigJson || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function datasetCustody(masterKey) {
  const custody = storedJson(`xml-cii-master-source-${masterKey}`);
  if (!custody || custody.persistenceMode !== 'indexeddb' || !custody.datasetId) return null;
  return {
    datasetId: String(custody.datasetId),
    rowCount: Number(custody.rowCount || 0),
    source: String(custody.source || ''),
    fieldMap: custody.fieldMap && typeof custody.fieldMap === 'object' ? { ...custody.fieldMap } : {},
    appliedRevision: Number(custody.appliedRevision || 0),
    masterFingerprint: String(custody.masterFingerprint || ''),
  };
}

function compactConfigSection(config, def, fieldMap) {
  const next = { ...(config || {}) };
  const section = { ...(next[def.configKey] || {}), fieldMap: { ...(fieldMap || {}) } };
  delete section[def.rowsProperty];
  next[def.configKey] = section;
  return next;
}

async function loadDataset(store, masterKey, custody) {
  const metadata = await store.getMetadata(custody.datasetId);
  if (!metadata) throw new Error(`Persisted ${masterKey} dataset is unavailable.`);
  const metadataCount = Number(metadata.rowCount || 0);
  if (metadataCount !== Number(custody.rowCount || 0)) {
    throw new Error(`Persisted ${masterKey} row count mismatch: expected ${custody.rowCount}, received ${metadataCount}.`);
  }

  let fullRows = null;
  let previewRows;
  if (typeof store.getRowsRange === 'function') {
    previewRows = await store.getRowsRange(custody.datasetId, 0, STARTUP_PREVIEW_ROWS);
  } else {
    fullRows = await store.getRows(custody.datasetId);
    previewRows = Array.isArray(fullRows) ? fullRows.slice(0, STARTUP_PREVIEW_ROWS) : null;
  }
  if (!Array.isArray(previewRows)) throw new Error(`Persisted ${masterKey} preview is unavailable.`);

  const needsLegacyWeightFingerprint = masterKey === 'weight'
    && !custody.masterFingerprint
    && !metadata.masterFingerprint;
  if (needsLegacyWeightFingerprint && !Array.isArray(fullRows)) fullRows = await store.getRows(custody.datasetId);
  if (needsLegacyWeightFingerprint && (!Array.isArray(fullRows) || fullRows.length !== metadataCount)) {
    throw new Error(`Persisted Weight fingerprint migration requires ${metadataCount} rows.`);
  }

  return {
    masterKey,
    custody,
    metadata,
    previewRows,
    fingerprintRows: needsLegacyWeightFingerprint ? fullRows : null,
  };
}

function applyLoadedDatasets(state, loaded) {
  const persistedConfig = supportConfigFrom(state);
  const base = state.masterContext || { config: persistedConfig };
  let config = { ...persistedConfig, ...(base.config || {}) };
  const context = {
    ...base,
    rawRows: { ...(base.rawRows || {}) },
    mappingRows: { ...(base.mappingRows || {}) },
    datasetRefs: { ...(base.datasetRefs || {}) },
    rowCounts: { ...(base.rowCounts || {}) },
    previewRows: { ...(base.previewRows || {}) },
    sourceMetadata: { ...(base.sourceMetadata || {}) },
    appliedMappingRevision: { ...(base.appliedMappingRevision || {}) },
  };
  for (const item of loaded) {
    const def = MASTER_DEFS[item.masterKey];
    const masterFingerprint = item.masterKey === 'weight'
      ? String(item.custody.masterFingerprint || item.metadata.masterFingerprint || xmlCiiWeightMasterRowsFingerprint(item.fingerprintRows || []))
      : '';
    context[def.rowsKey] = [];
    context.rawRows[item.masterKey] = [];
    context.mappingRows[item.masterKey] = Array.isArray(item.metadata.mappingRows) ? item.metadata.mappingRows.slice(0, STARTUP_PREVIEW_ROWS) : [];
    context.datasetRefs[item.masterKey] = Object.freeze({
      datasetId: item.custody.datasetId,
      rowCount: item.custody.rowCount,
      masterKey: item.masterKey,
      fileName: item.metadata.fileName || item.custody.source,
      sheetName: item.metadata.sheetName || '',
      fieldMap: { ...item.custody.fieldMap },
      ...(masterFingerprint ? { masterFingerprint } : {}),
      persistence: 'indexeddb',
    });
    context.rowCounts[item.masterKey] = item.custody.rowCount;
    context.previewRows[item.masterKey] = item.previewRows.slice(0, STARTUP_PREVIEW_ROWS);
    context.sourceMetadata[item.masterKey] = {
      key: item.masterKey,
      source: item.custody.source || item.metadata.fileName || 'IndexedDB',
      sourceType: 'indexeddb',
      status: 'loaded',
      rowCount: item.custody.rowCount,
    };
    context.appliedMappingRevision[item.masterKey] = item.custody.appliedRevision;
    config = compactConfigSection(config, def, item.custody.fieldMap);
    if (item.masterKey === 'weight') {
      config.weight = {
        ...(config.weight || {}),
        masterRevision: item.custody.appliedRevision,
        masterFingerprint,
      };
      delete config.weight.masterRows;
    }
    if (item.masterKey === 'pipingClass') context.pipingClassIndex = null;
  }
  context.config = config;
  return {
    ...state,
    masterContext: context,
    supportConfigJson: JSON.stringify(config, null, 2),
    importMastersWriteBackStatus: `Restored ${loaded.length} large master dataset${loaded.length === 1 ? '' : 's'} from IndexedDB as metadata-only custody.`,
  };
}

export async function hydratePersistedMasterDatasets(stateRef, options = {}) {
  if (!stateRef?.current) return false;
  const entries = Object.keys(MASTER_DEFS)
    .map((masterKey) => [masterKey, datasetCustody(masterKey)])
    .filter(([, custody]) => custody);
  if (!entries.length) return false;
  const store = options.store || createIndexedDbDatasetStore(options);
  const loaded = await Promise.all(entries.map(([masterKey, custody]) => loadDataset(store, masterKey, custody)));
  stateRef.current = applyLoadedDatasets(stateRef.current, loaded);
  return true;
}
""")

# Update startup regression to prove no full row load for normal custody.
test_path = 'tests/xml-cii-master-dataset-startup-hydration.test.mjs'
s = read(test_path)
s = replace_once(s, "test('startup hydration restores IndexedDB-backed master rows without rebuilding supportConfig arrays', async () => {", "test('startup restore keeps IndexedDB-backed masters metadata-only with a bounded preview', async () => {", 'startup test title')
s = replace_once(
    s,
    "  const store = {\n    async getMetadata(id) { return id === 'line-ds' ? { datasetId: id, rowCount: rows.length, fileName: 'large-lines.xlsx', mappingRows: [{ Line: 'L-1' }] } : null; },\n    async getRows(id) { return id === 'line-ds' ? rows : null; },\n  };",
    "  let fullReads = 0;\n  let rangeReads = 0;\n  const store = {\n    async getMetadata(id) { return id === 'line-ds' ? { datasetId: id, rowCount: rows.length, fileName: 'large-lines.xlsx', mappingRows: [{ Line: 'L-1' }] } : null; },\n    async getRowsRange(id, offset, limit) { rangeReads += 1; return id === 'line-ds' ? rows.slice(offset, offset + limit) : null; },\n    async getRows() { fullReads += 1; throw new Error('full dataset read must not occur'); },\n  };",
    'startup bounded store mock',
)
s = replace_once(s, "    assert.equal(stateRef.current.masterContext.lineRows.length, 50000);", "    assert.equal(stateRef.current.masterContext.lineRows.length, 0);\n    assert.equal(fullReads, 0);\n    assert.equal(rangeReads, 1);", 'startup no resident rows assertion')
write(test_path, s)

for source in [
    'tabs/xml-cii-2019-standalone/workers/master-dataset-store.js',
    'tabs/xml-cii-2019-standalone/workers/master-dataset-startup-hydration.js',
]:
    write('docs/' + source, read(source))

print('PR780 Phase E-A patch applied.')
