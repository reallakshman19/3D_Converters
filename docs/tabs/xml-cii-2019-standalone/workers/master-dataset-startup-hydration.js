import { xmlCiiWeightMasterRowsFingerprint } from '../../../converters/xml-cii2019-core/rigid-weight-authority.js';
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
    ...(masterKey === 'pipingClass' && Number(custody.datasetRevision) > 0 ? {
      datasetRevision: Number(custody.datasetRevision),
    } : {}),
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
  const metadataCount = metadata.rowCount == null ? Number(custody.rowCount || 0) : Number(metadata.rowCount || 0);
  if (metadataCount !== Number(custody.rowCount || 0)) {
    throw new Error(`Persisted ${masterKey} row count mismatch: expected ${custody.rowCount}, received ${metadataCount}.`);
  }
  if (masterKey === 'pipingClass') {
    const custodyRevision = Number(custody.datasetRevision || 0);
    const metadataRevision = Number(metadata.datasetRevision || 0);
    if (custodyRevision > 0 && metadataRevision > 0 && custodyRevision !== metadataRevision) {
      throw new Error(`Persisted pipingClass dataset revision mismatch: expected ${custodyRevision}, received ${metadataRevision}.`);
    }
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
      ...(item.masterKey === 'pipingClass' && Number(item.custody.datasetRevision || item.metadata.datasetRevision) > 0 ? {
        datasetRevision: Number(item.custody.datasetRevision || item.metadata.datasetRevision),
      } : {}),
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
