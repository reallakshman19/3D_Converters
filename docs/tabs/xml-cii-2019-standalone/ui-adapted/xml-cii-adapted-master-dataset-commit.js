import {
  commitAppliedMaster,
  effectiveDraftFieldMap,
  ensureMasterRuntime,
  persistChangedMasterDetailed,
  readSupportConfigOnce,
} from './xml-cii-adapted-master-runtime.js?v=20261006-p2810042-master-persistence-1';
import { remapMasterDataset } from './xml-cii-adapted-master-dataset-runtime.js?v=20261006-p2810042-master-persistence-1';

const SAMPLE_LIMIT = 150;

function sameFieldMap(a, b) {
  const aKeys = Object.keys(a || {}).sort();
  const bKeys = Object.keys(b || {}).sort();
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key, index) => key === bKeys[index]
    && String(a?.[key] ?? '') === String(b?.[key] ?? ''));
}

function configFromState(state, fallback = {}) {
  return state?.masterContext?.config || readSupportConfigOnce(state) || fallback || {};
}

function mergeWorkerPersistence(localPersistence, ready) {
  const worker = ready?.persistence;
  if (!worker || worker.persisted !== false) return localPersistence;
  const failure = worker.failure || { name: 'Error', message: 'IndexedDB persistence failed.' };
  return {
    ...localPersistence,
    failures: [
      ...(localPersistence.failures || []),
      {
        key: 'indexeddb:dataset',
        name: String(failure.name || 'Error'),
        message: String(failure.message || 'IndexedDB persistence failed.'),
      },
    ],
    quotaLimited: Boolean(localPersistence.quotaLimited || worker.quotaLimited),
    normalizedPersisted: false,
    indexedDbBacked: false,
    sessionOnly: true,
  };
}

function validateReady(key, ready) {
  const metadata = ready?.metadata;
  if (!metadata?.datasetId) throw new Error(`Dataset-ready metadata is required for ${key}.`);
  if (metadata.masterKey && String(metadata.masterKey) !== String(key)) {
    throw new Error(`Dataset-ready master mismatch: expected ${key}, received ${metadata.masterKey}.`);
  }
  const rowCount = Number(metadata.rowCount);
  if (!Number.isInteger(rowCount) || rowCount < 0) {
    throw new Error(`Dataset-ready row count is invalid for ${key}: ${metadata.rowCount}.`);
  }
  return { metadata, rowCount };
}

export function commitDatasetReadyMaster({ context = {}, config = {}, key, ready, sourceMetadata = null }) {
  const { metadata } = validateReady(key, ready);
  const previewRows = Array.isArray(ready?.previewRows) ? ready.previewRows.slice(0, SAMPLE_LIMIT) : [];
  const mappingRows = Array.isArray(ready?.mappingRows) ? ready.mappingRows.slice(0, SAMPLE_LIMIT) : [];
  const committed = commitAppliedMaster({
    context,
    config,
    key,
    fieldMap: metadata.fieldMap || {},
    rawRows: [],
    normalizedRows: [],
    sourceMetadata,
    datasetMetadata: metadata,
    previewRows,
  });
  const nextContext = {
    ...committed.context,
    mappingRows: { ...(committed.context.mappingRows || {}), [key]: mappingRows },
  };
  if (key === 'pipingClass') nextContext.pipingClassIndex = null;
  const persistence = mergeWorkerPersistence(
    persistChangedMasterDetailed(key, nextContext),
    ready,
  );
  return { ...committed, context: nextContext, persistence };
}

export async function remapDatasetBackedMasterDraft({
  stateRef,
  key,
  config = null,
  fieldMap = {},
  remapDataset = remapMasterDataset,
}) {
  if (!stateRef?.current) throw new Error('State reference is required for dataset remap.');
  const basisContext = ensureMasterRuntime(stateRef.current.masterContext || {});
  const basisRef = basisContext.datasetRefs?.[key];
  if (!basisRef?.datasetId) throw new Error(`No dataset-backed ${key} master is loaded.`);
  const basisDatasetId = String(basisRef.datasetId);
  const basisRevision = Number(basisContext.appliedMappingRevision?.[key] || 0);
  const submittedMap = { ...(fieldMap || {}) };
  const ready = await remapDataset(key, basisDatasetId, submittedMap);
  validateReady(key, ready);
  if (String(ready.metadata.datasetId) === basisDatasetId) {
    throw new Error(`Dataset remap for ${key} did not create a new dataset revision.`);
  }

  const currentContext = ensureMasterRuntime(stateRef.current.masterContext || {});
  const currentRef = currentContext.datasetRefs?.[key];
  const currentConfig = configFromState(stateRef.current, config || {});
  const currentMap = effectiveDraftFieldMap(currentContext, currentConfig, key);
  const currentRevision = Number(currentContext.appliedMappingRevision?.[key] || 0);
  if (String(currentRef?.datasetId || '') !== basisDatasetId
      || currentRevision !== basisRevision
      || !sameFieldMap(currentMap, submittedMap)) {
    throw new Error(`${key} mapping changed while worker remap was running; stale result was not applied.`);
  }

  const sourceMetadata = {
    ...(currentContext.sourceMetadata?.[key] || {}),
    key,
    status: Number(ready.metadata.rowCount || 0) ? 'loaded' : 'empty',
    rowCount: Number(ready.metadata.rowCount || 0),
  };
  return commitDatasetReadyMaster({
    context: currentContext,
    config: currentConfig,
    key,
    ready,
    sourceMetadata,
  });
}
