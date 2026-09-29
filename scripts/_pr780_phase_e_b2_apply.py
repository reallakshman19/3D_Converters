from pathlib import Path

ROOT = Path('.')


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def write(path, text):
    p = ROOT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding='utf-8')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    return text.replace(old, new, 1)


# Shared metadata-only DATASET_READY commit + stale-safe worker remap helper.
helper = """import {
  commitAppliedMaster,
  effectiveDraftFieldMap,
  ensureMasterRuntime,
  persistChangedMasterDetailed,
  readSupportConfigOnce,
} from './xml-cii-adapted-master-runtime.js';
import { remapMasterDataset } from './xml-cii-adapted-master-dataset-runtime.js?v=20260929-pr780-bounded-ui-1';

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
  const persistence = persistChangedMasterDetailed(key, nextContext);
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
"""
helper_path = 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-dataset-commit.js'
write(helper_path, helper)
write('docs/' + helper_path, helper)


# Import event boundary: commit DATASET_READY metadata/samples directly; never full materialize on import.
path = 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-worker-events.js'
s = read(path)
s = replace_once(
    s,
    "import {\n  appliedFieldMap, commitAppliedMaster, ensureMasterRuntime, persistChangedMasterDetailed,\n} from './xml-cii-adapted-master-runtime.js';",
    "import { appliedFieldMap, ensureMasterRuntime } from './xml-cii-adapted-master-runtime.js';",
    'worker events runtime imports',
)
s = replace_once(
    s,
    "import { perfAddMs, perfCount, perfNow, requestMeasuredFullRender } from './xml-cii-adapted-perf.js';",
    "import { perfCount, requestMeasuredFullRender } from './xml-cii-adapted-perf.js';\nimport { commitDatasetReadyMaster } from './xml-cii-adapted-master-dataset-commit.js?v=20260929-pr780-metadata-import-1';",
    'worker events metadata commit import',
)
old = """function commitHydrated(stateRef, key, hydrated, source, settings) {
  const metadata = hydrated.metadata;
  const sourceMetadata = {
    key,
    source: source.fileName,
    sourceType: 'worker-import',
    status: metadata.rowCount ? 'loaded' : 'empty',
    rowCount: metadata.rowCount,
  };
  const committed = commitAppliedMaster({
    context: stateRef.current.masterContext || {},
    config: masterConfigForState(stateRef),
    key,
    fieldMap: metadata.fieldMap,
    rawRows: hydrated.rawRows,
    normalizedRows: hydrated.rows,
    sourceMetadata,
    datasetMetadata: metadata,
    previewRows: hydrated.previewRows,
  });
  const persistence = persistChangedMasterDetailed(key, committed.context);
  const mappingText = settings.matchedKey ? ` using saved mapping from ${settings.matchedKey}` : ' with worker auto-mapping';
  stateRef.current = updateWorkflowState(stateRef.current, {
    masterContext: committed.context,
    supportConfigJson: JSON.stringify(committed.config, null, 2),
    importMastersLoading: false,
    importMastersWriteBackStatus: masterPersistenceStatus(
      `Imported ${source.fileName} (${metadata.rowCount} rows)${mappingText}.`, persistence,
    ),
  });
  return committed;
}

async function finalizeReady(stateRef, render, key, generation, ready, source, settings) {
  const hydrateStart = perfNow();
  const hydrated = await coordinator.materialize(ready);
  perfAddMs('masterWorkerHydrateMs', perfNow() - hydrateStart);
  if (!isCurrent(key, generation)) return false;
  commitHydrated(stateRef, key, hydrated, source, settings);
  perfCount('masterWorkerImportCount');
  requestMeasuredFullRender(render);
  return true;
}
"""
new = """function commitReady(stateRef, key, ready, source, settings) {
  const metadata = ready?.metadata || {};
  const sourceMetadata = {
    key,
    source: source.fileName,
    sourceType: 'worker-import',
    status: metadata.rowCount ? 'loaded' : 'empty',
    rowCount: metadata.rowCount,
  };
  const committed = commitDatasetReadyMaster({
    context: stateRef.current.masterContext || {},
    config: masterConfigForState(stateRef),
    key,
    ready,
    sourceMetadata,
  });
  const mappingText = settings.matchedKey ? ` using saved mapping from ${settings.matchedKey}` : ' with worker auto-mapping';
  stateRef.current = updateWorkflowState(stateRef.current, {
    masterContext: committed.context,
    supportConfigJson: JSON.stringify(committed.config, null, 2),
    importMastersLoading: false,
    importMastersWriteBackStatus: masterPersistenceStatus(
      `Imported ${source.fileName} (${metadata.rowCount} rows)${mappingText}.`, committed.persistence,
    ),
  });
  return committed;
}

async function finalizeReady(stateRef, render, key, generation, ready, source, settings) {
  if (!isCurrent(key, generation)) return false;
  commitReady(stateRef, key, ready, source, settings);
  perfCount('masterWorkerImportCount');
  perfCount('masterWorkerMetadataOnlyCommitCount');
  requestMeasuredFullRender(render);
  return true;
}
"""
s = replace_once(s, old, new, 'worker events metadata-only finalize')
write(path, s)
write('docs/' + path, s)


# Mapping UI: dataset-backed samples stay bounded; APPLIED commit routes through worker remap.
path = 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-mapping-events.js'
s = read(path)
s = replace_once(
    s,
    "import { perfAddMs, perfCount, perfNow, requestMeasuredFullRender } from './xml-cii-adapted-perf.js';",
    "import { perfAddMs, perfCount, perfNow, requestMeasuredFullRender } from './xml-cii-adapted-perf.js';\nimport { remapDatasetBackedMasterDraft } from './xml-cii-adapted-master-dataset-commit.js?v=20260929-pr780-metadata-import-1';",
    'mapping events dataset remap import',
)
old = """export function rawRowsForMaster(stateRef, key) {
  const current = stateRef.current.masterContext?.rawRows?.[key];
  if (Array.isArray(current) && current.length) return current;
  return getStoredJson(`xml-cii-master-raw-${key}`, []);
}
"""
new = """export function rawRowsForMaster(stateRef, key) {
  const context = stateRef.current.masterContext || {};
  if (context.datasetRefs?.[key]?.datasetId) {
    const sample = context.mappingRows?.[key];
    return Array.isArray(sample) ? sample : [];
  }
  const current = context.rawRows?.[key];
  if (Array.isArray(current) && current.length) return current;
  return getStoredJson(`xml-cii-master-raw-${key}`, []);
}
"""
s = replace_once(s, old, new, 'mapping rows dataset authority')
old = """function applyCurrentDraft(stateRef, key) {
  const rows = rawRowsForMaster(stateRef, key);
  if (!rows.length) throw new Error(`No ${key} source rows are loaded.`);
  const map = effectiveDraftFieldMap(stateRef.current.masterContext || {}, masterConfigForState(stateRef), key);
  perfCount('masterMappingApplyCount');
  return applyFieldMapToContext(stateRef, key, map, rows, `Applied ${key} mapping. Downstream basis advanced exactly once.`);
}
"""
new = """export async function applyCurrentDraft(stateRef, key, options = {}) {
  const context = ensureMasterRuntime(stateRef.current.masterContext || {});
  const config = masterConfigForState(stateRef);
  const map = effectiveDraftFieldMap(context, config, key);
  perfCount('masterMappingApplyCount');
  if (context.datasetRefs?.[key]?.datasetId) {
    const committed = await remapDatasetBackedMasterDraft({
      stateRef, key, config, fieldMap: map, remapDataset: options.remapDataset,
    });
    stateRef.current = updateWorkflowState(stateRef.current, {
      masterContext: committed.context,
      supportConfigJson: JSON.stringify(committed.config, null, 2),
      importMastersLoading: false,
      importMastersWriteBackStatus: masterPersistenceStatus(
        `Applied ${key} mapping through worker dataset remap. Downstream basis advanced exactly once.`,
        committed.persistence,
      ),
    });
    return committed;
  }
  const rows = rawRowsForMaster(stateRef, key);
  if (!rows.length) throw new Error(`No ${key} source rows are loaded.`);
  return applyFieldMapToContext(stateRef, key, map, rows, `Applied ${key} mapping. Downstream basis advanced exactly once.`);
}
"""
s = replace_once(s, old, new, 'mapping async dataset apply')
s = replace_once(
    s,
    "    button.addEventListener('click', () => {\n      try { applyCurrentDraft(stateRef, button.dataset.masterKey); requestMeasuredFullRender(render); }\n      catch (error) { alert(error?.message || String(error)); }\n    });",
    "    button.addEventListener('click', async () => {\n      try { await applyCurrentDraft(stateRef, button.dataset.masterKey); requestMeasuredFullRender(render); }\n      catch (error) { alert(error?.message || String(error)); }\n    });",
    'mapping async apply listener',
)
write(path, s)
write('docs/' + path, s)


# Functional DATASET_READY metadata-only custody regression.
write('tests/xml-cii-master-dataset-ready-commit.test.mjs', """import test from 'node:test';
import assert from 'node:assert/strict';

import { commitDatasetReadyMaster } from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-dataset-commit.js';

const preview = Array.from({ length: 150 }, (_, index) => ({ convertedBore: index + 1, weight: index + 2 }));
const mapping = Array.from({ length: 150 }, (_, index) => ({ Bore: index + 1, Weight: index + 2 }));

test('DATASET_READY commit keeps full Weight rows off main-thread state while preserving metadata authority', () => {
  const result = commitDatasetReadyMaster({
    context: {
      config: { weight: { fieldMap: { weight: 'OldWeight' } } },
      weightMasterRows: [{ stale: true }],
      rawRows: { weight: [{ stale: true }] },
      mappingRows: {}, previewRows: {}, rowCounts: {}, datasetRefs: {},
      appliedMappingRevision: { weight: 4 },
    },
    config: { weight: { fieldMap: { weight: 'OldWeight' } }, supportPositionMatch: { toleranceMm: 20 } },
    key: 'weight',
    ready: {
      metadata: {
        datasetId: 'weight-ds-r5', masterKey: 'weight', rowCount: 100000,
        fileName: 'weights.xlsx', sheetName: 'Weights', fieldMap: { weight: 'Weight' },
        masterFingerprint: '100000:fnv1a:test',
      },
      previewRows: preview,
      mappingRows: mapping,
    },
    sourceMetadata: { key: 'weight', source: 'weights.xlsx', sourceType: 'worker-import', status: 'loaded', rowCount: 100000 },
  });

  assert.deepEqual(result.context.weightMasterRows, []);
  assert.deepEqual(result.context.rawRows.weight, []);
  assert.equal(result.context.mappingRows.weight.length, 150);
  assert.equal(result.context.previewRows.weight.length, 150);
  assert.equal(result.context.rowCounts.weight, 100000);
  assert.equal(result.context.datasetRefs.weight.datasetId, 'weight-ds-r5');
  assert.equal(result.context.datasetRefs.weight.masterFingerprint, '100000:fnv1a:test');
  assert.equal(result.context.appliedMappingRevision.weight, 5);
  assert.equal('masterRows' in result.config.weight, false);
  assert.equal(result.config.weight.masterRevision, 5);
  assert.equal(result.config.weight.masterFingerprint, '100000:fnv1a:test');
  assert.equal(result.config.supportPositionMatch.toleranceMm, 20);
});

test('piping-class DATASET_READY commit clears a stale resident index', () => {
  const result = commitDatasetReadyMaster({
    context: { config: {}, pipingClassIndex: new Map([['STALE', []]]), appliedMappingRevision: { pipingClass: 1 } },
    config: {}, key: 'pipingClass',
    ready: {
      metadata: { datasetId: 'class-ds-r2', masterKey: 'pipingClass', rowCount: 50000, fieldMap: { pipingClass: 'Class' } },
      previewRows: [{ pipingClass: 'A1' }], mappingRows: [{ Class: 'A1' }],
    },
  });
  assert.equal(result.context.pipingClassIndex, null);
  assert.deepEqual(result.context.pipingClassRows, []);
  assert.equal(result.context.rowCounts.pipingClass, 50000);
});
""")

# Functional dataset-backed mapping apply and stale-remap regressions.
write('tests/xml-cii-master-dataset-mapping-apply.test.mjs', """import test from 'node:test';
import assert from 'node:assert/strict';

import { applyCurrentDraft, rawRowsForMaster } from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-mapping-events.js';

function stateRef() {
  return {
    current: {
      supportConfigJson: JSON.stringify({ linelist: { fieldMap: { lineNo: 'OldLine' } } }),
      masterContext: {
        config: { linelist: { fieldMap: { lineNo: 'OldLine' } } },
        lineRows: [], rawRows: { lineList: [] },
        mappingRows: { lineList: [{ OldLine: 'L-1', NewLine: 'L-1' }] },
        previewRows: { lineList: [{ lineNo: 'L-1' }] },
        rowCounts: { lineList: 100000 },
        datasetRefs: { lineList: { datasetId: 'line-ds-r1', rowCount: 100000, fieldMap: { lineNo: 'OldLine' }, persistence: 'indexeddb' } },
        appliedMappingRevision: { lineList: 3 },
        mappingDrafts: { lineList: { fieldMap: { lineNo: 'NewLine' }, dirty: true, basisAppliedRevision: 3 } },
        sourceMetadata: { lineList: { key: 'lineList', source: 'lines.xlsx', sourceType: 'worker-import', status: 'loaded', rowCount: 100000 } },
      },
    },
  };
}

function ready() {
  return {
    metadata: {
      datasetId: 'line-ds-r2', masterKey: 'lineList', rowCount: 100000,
      fileName: 'lines.xlsx', fieldMap: { lineNo: 'NewLine' },
    },
    previewRows: [{ lineNo: 'L-1', _rowIndex: 1 }],
    mappingRows: [{ OldLine: 'L-1', NewLine: 'L-1' }],
  };
}

test('dataset-backed Apply mapping remaps in worker and advances APPLIED basis exactly once', async () => {
  const ref = stateRef();
  const sample = rawRowsForMaster(ref, 'lineList');
  assert.equal(sample.length, 1, 'mapping UI should use bounded mappingRows sample');
  const calls = [];
  await applyCurrentDraft(ref, 'lineList', {
    remapDataset: async (key, datasetId, fieldMap) => {
      calls.push({ key, datasetId, fieldMap });
      return ready();
    },
  });

  assert.deepEqual(calls, [{ key: 'lineList', datasetId: 'line-ds-r1', fieldMap: { lineNo: 'NewLine' } }]);
  assert.equal(ref.current.masterContext.datasetRefs.lineList.datasetId, 'line-ds-r2');
  assert.equal(ref.current.masterContext.rowCounts.lineList, 100000);
  assert.equal(ref.current.masterContext.appliedMappingRevision.lineList, 4);
  assert.equal(ref.current.masterContext.mappingDrafts.lineList, undefined);
  assert.deepEqual(ref.current.masterContext.lineRows, []);
  assert.deepEqual(ref.current.masterContext.rawRows.lineList, []);
  assert.equal(ref.current.masterContext.mappingRows.lineList.length, 1);
  const config = JSON.parse(ref.current.supportConfigJson);
  assert.equal(config.linelist.fieldMap.lineNo, 'NewLine');
  assert.equal('masterRows' in config.linelist, false);
});

test('stale worker remap result cannot replace a newer APPLIED basis', async () => {
  const ref = stateRef();
  const beforeId = ref.current.masterContext.datasetRefs.lineList.datasetId;
  await assert.rejects(
    applyCurrentDraft(ref, 'lineList', {
      remapDataset: async () => {
        ref.current.masterContext = {
          ...ref.current.masterContext,
          appliedMappingRevision: { ...ref.current.masterContext.appliedMappingRevision, lineList: 4 },
        };
        return ready();
      },
    }),
    /stale result was not applied/,
  );
  assert.equal(ref.current.masterContext.datasetRefs.lineList.datasetId, beforeId);
  assert.equal(ref.current.masterContext.appliedMappingRevision.lineList, 4);
});
""")

# Static import-boundary falsifier and update the existing integration contract.
write('tests/xml-cii-master-worker-metadata-import.test.mjs', """import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const read = (path) => fs.readFile(new URL('../' + path, import.meta.url), 'utf8');

test('worker import commits DATASET_READY metadata without full materialization', async () => {
  const source = await read('tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-worker-events.js');
  assert.match(source, /commitDatasetReadyMaster/);
  assert.doesNotMatch(source, /coordinator\.materialize\(ready\)/);
  assert.doesNotMatch(source, /hydrated\.rawRows|hydrated\.rows/);
  assert.match(source, /masterWorkerMetadataOnlyCommitCount/);
});

test('dataset-backed mapping apply routes through worker remap rather than resident full raw rows', async () => {
  const source = await read('tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-mapping-events.js');
  assert.match(source, /remapDatasetBackedMasterDraft/);
  assert.match(source, /context\.datasetRefs\?\.\[key\]\?\.datasetId/);
  assert.match(source, /context\.mappingRows\?\.\[key\]/);
});
""")

path = 'tests/xml-cii-master-worker-integration.test.mjs'
s = read(path)
s = replace_once(
    s,
    "  assert.match(source, /datasetMetadata:\\s*metadata/);",
    "  assert.match(source, /commitDatasetReadyMaster/);\n  assert.doesNotMatch(source, /coordinator\\.materialize\\(ready\\)/);",
    'integration metadata-only commit assertion',
)
write(path, s)

print('PR780 Phase E-B2 metadata-only import custody patch applied.')
