from pathlib import Path

ROOT = Path('.')


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def write(path, text):
    (ROOT / path).write_text(text, encoding='utf-8')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    return text.replace(old, new, 1)

# 1) Weight Match-1 authority can use deterministic compact metadata when rows are absent.
path = 'converters/xml-cii2019-core/rigid-weight-authority.js'
s = read(path)
s = replace_once(
    s,
    'function masterRowsFingerprint(rows) {',
    'export function xmlCiiWeightMasterRowsFingerprint(rows) {',
    'export weight master fingerprint',
)
s = replace_once(
    s,
    "  const rows = Array.isArray(weight.masterRows) ? weight.masterRows : [];\n  return `${explicit || 'implicit'}|${masterRowsFingerprint(rows)}`;",
    "  const rows = Array.isArray(weight.masterRows) ? weight.masterRows : [];\n  const persistedFingerprint = text(weight.masterFingerprint ?? weight.masterRowsFingerprint);\n  const fingerprint = rows.length\n    ? xmlCiiWeightMasterRowsFingerprint(rows)\n    : (persistedFingerprint || 'none:0');\n  return `${explicit || 'implicit'}|${fingerprint}`;",
    'weight revision compact fingerprint fallback',
)
write(path, s)

# 2) Dataset-backed APPLIED weight commits retain revision + fingerprint metadata, never rows.
path = 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-runtime.js'
s = read(path)
s = replace_once(
    s,
    "import { perfAddMs, perfCount, perfNow } from './xml-cii-adapted-perf.js';",
    "import { perfAddMs, perfCount, perfNow } from './xml-cii-adapted-perf.js';\nimport { xmlCiiWeightMasterRowsFingerprint } from '../../../converters/xml-cii2019-core/rigid-weight-authority.js';",
    'master runtime weight fingerprint import',
)
s = replace_once(
    s,
    'function datasetDescriptor(metadata, fieldMap) {',
    "function datasetDescriptor(metadata, fieldMap, rows = [], key = '') {",
    'dataset descriptor signature',
)
s = replace_once(
    s,
    "    fieldMap: { ...(fieldMap || metadata.fieldMap || {}) },\n    persistence: 'indexeddb',",
    "    fieldMap: { ...(fieldMap || metadata.fieldMap || {}) },\n    ...(key === 'weight' ? {\n      masterFingerprint: String(metadata.masterFingerprint || xmlCiiWeightMasterRowsFingerprint(rows)),\n    } : {}),\n    persistence: 'indexeddb',",
    'dataset descriptor fingerprint',
)
s = replace_once(
    s,
    "  const runtime = ensureMasterRuntime(context);\n  const datasetRef = datasetDescriptor(datasetMetadata, fieldMap);\n  const rows = Array.isArray(normalizedRows) ? normalizedRows : [];\n  const nextConfig = committedConfig(config || runtime.config || {}, def, fieldMap, rows, datasetRef);\n  const nextRevision = Number(runtime.appliedMappingRevision[key] || 0) + 1;",
    "  const runtime = ensureMasterRuntime(context);\n  const rows = Array.isArray(normalizedRows) ? normalizedRows : [];\n  const datasetRef = datasetDescriptor(datasetMetadata, fieldMap, rows, key);\n  const nextConfig = committedConfig(config || runtime.config || {}, def, fieldMap, rows, datasetRef);\n  const nextRevision = Number(runtime.appliedMappingRevision[key] || 0) + 1;\n  if (datasetRef && key === 'weight') {\n    nextConfig.weight = {\n      ...(nextConfig.weight || {}),\n      masterRevision: nextRevision,\n      masterFingerprint: datasetRef.masterFingerprint,\n    };\n    delete nextConfig.weight.masterRows;\n  }",
    'weight compact config metadata',
)
s = replace_once(
    s,
    "    ...(datasetRef ? { datasetId: datasetRef.datasetId, rowCount: datasetRef.rowCount, persistenceMode: 'indexeddb' } : {}),",
    "    ...(datasetRef ? {\n      datasetId: datasetRef.datasetId,\n      rowCount: datasetRef.rowCount,\n      persistenceMode: 'indexeddb',\n      ...(datasetRef.masterFingerprint ? { masterFingerprint: datasetRef.masterFingerprint } : {}),\n    } : {}),",
    'persist fingerprint custody',
)
write(path, s)

# 3) Startup restore carries/reconstructs compact Weight authority metadata.
path = 'tabs/xml-cii-2019-standalone/workers/master-dataset-startup-hydration.js'
s = read(path)
s = replace_once(
    s,
    "import { buildPipingClassIndex } from '../../../converters/xml-cii2019-core/piping-class-resolver.js';\nimport { createIndexedDbDatasetStore } from './master-dataset-store.js';",
    "import { buildPipingClassIndex } from '../../../converters/xml-cii2019-core/piping-class-resolver.js';\nimport { xmlCiiWeightMasterRowsFingerprint } from '../../../converters/xml-cii2019-core/rigid-weight-authority.js';\nimport { createIndexedDbDatasetStore } from './master-dataset-store.js';",
    'startup weight fingerprint import',
)
s = replace_once(
    s,
    "    appliedRevision: Number(custody.appliedRevision || 0),\n  };",
    "    appliedRevision: Number(custody.appliedRevision || 0),\n    masterFingerprint: String(custody.masterFingerprint || ''),\n  };",
    'startup custody fingerprint',
)
s = replace_once(
    s,
    "  for (const item of loaded) {\n    const def = MASTER_DEFS[item.masterKey];\n    context[def.rowsKey] = item.rows;",
    "  for (const item of loaded) {\n    const def = MASTER_DEFS[item.masterKey];\n    const masterFingerprint = item.masterKey === 'weight'\n      ? String(item.custody.masterFingerprint || item.metadata.masterFingerprint || xmlCiiWeightMasterRowsFingerprint(item.rows))\n      : '';\n    context[def.rowsKey] = item.rows;",
    'startup computed fingerprint',
)
s = replace_once(
    s,
    "      fieldMap: { ...item.custody.fieldMap },\n      persistence: 'indexeddb',",
    "      fieldMap: { ...item.custody.fieldMap },\n      ...(masterFingerprint ? { masterFingerprint } : {}),\n      persistence: 'indexeddb',",
    'startup dataset ref fingerprint',
)
s = replace_once(
    s,
    "    config = compactConfigSection(config, def, item.custody.fieldMap);\n  }",
    "    config = compactConfigSection(config, def, item.custody.fieldMap);\n    if (item.masterKey === 'weight') {\n      config.weight = {\n        ...(config.weight || {}),\n        masterRevision: item.custody.appliedRevision,\n        masterFingerprint,\n      };\n      delete config.weight.masterRows;\n    }\n  }",
    'startup compact weight authority',
)
write(path, s)

# 4) Focused parity tests for full-row vs compact-metadata authority.
test_path = 'tests/xml-cii-master-weight-fingerprint-metadata.test.mjs'
write(test_path, """import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildXmlCiiRigidWeightMatch1Provenance,
  validateXmlCiiRigidWeightMatch1,
  withXmlCiiRigidWeightMatch1,
  xmlCiiWeightMasterRevision,
  xmlCiiWeightMasterRowsFingerprint,
} from '../converters/xml-cii2019-core/rigid-weight-authority.js';
import {
  commitAppliedMaster,
  persistChangedMasterDetailed,
} from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-runtime.js';
import { hydratePersistedMasterDatasets } from '../tabs/xml-cii-2019-standalone/workers/master-dataset-startup-hydration.js';

const rows = [
  { convertedBore: 80, rating: 300, type: 'FLAN', lengthMm: 80, weight: 9 },
  { convertedBore: 100, rating: 600, type: 'VALV', lengthMm: 120, weight: 14 },
];
const issue = {
  key: 'branch::70', branchName: 'branch', nodeNumber: '70', endpoint: '2',
  componentType: 'RIGID', componentRefNo: '=REF-1', lengthMm: 84.37,
  elementLengthSource: 'prepared', boreMm: 80, rating: '300',
};

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

test('compact Weight metadata preserves the exact Match-1 master authority basis', () => {
  const masterFingerprint = xmlCiiWeightMasterRowsFingerprint(rows);
  const full = { weight: { masterRevision: 7, masterRows: rows }, overrides: {} };
  const compact = { weight: { masterRevision: 7, masterFingerprint }, overrides: {} };
  assert.equal(xmlCiiWeightMasterRevision(compact), xmlCiiWeightMasterRevision(full));

  const provenance = buildXmlCiiRigidWeightMatch1Provenance(issue, full, null, {
    weightKg: 9.5,
    acceptanceMethod: 'manual',
  });
  const acceptedFull = withXmlCiiRigidWeightMatch1(full, { [issue.key]: 9.5 }, { [issue.key]: provenance });
  const acceptedCompact = { ...compact, overrides: acceptedFull.overrides };
  assert.deepEqual(validateXmlCiiRigidWeightMatch1(acceptedCompact, [issue]).validWeights, { [issue.key]: 9.5 });

  const inconsistent = { weight: { masterRevision: 7, masterRows: rows, masterFingerprint: 'wrong' } };
  assert.equal(xmlCiiWeightMasterRevision(inconsistent), xmlCiiWeightMasterRevision(full), 'actual rows must outrank stale metadata');
});

test('dataset-backed Weight commit stores fingerprint/revision metadata without masterRows', () => {
  const storage = installStorage();
  try {
    const committed = commitAppliedMaster({
      context: { config: {}, appliedMappingRevision: { weight: 4 } },
      config: {}, key: 'weight', fieldMap: { weight: 'Weight' }, rawRows: rows,
      normalizedRows: rows,
      datasetMetadata: { datasetId: 'weight-ds', rowCount: rows.length, masterKey: 'weight', fileName: 'weights.xlsx' },
      sourceMetadata: { source: 'weights.xlsx' },
    });
    assert.equal('masterRows' in committed.config.weight, false);
    assert.equal(committed.config.weight.masterRevision, 5);
    assert.equal(committed.config.weight.masterFingerprint, xmlCiiWeightMasterRowsFingerprint(rows));
    assert.equal(committed.context.datasetRefs.weight.masterFingerprint, committed.config.weight.masterFingerprint);

    persistChangedMasterDetailed('weight', committed.context);
    const custody = JSON.parse(storage.values.get('xml-cii-master-source-weight'));
    assert.equal(custody.masterFingerprint, committed.config.weight.masterFingerprint);
  } finally {
    storage.restore();
  }
});

test('startup restore reconstructs legacy missing Weight fingerprint while keeping compact config', async () => {
  const storage = installStorage({
    'xml-cii-master-source-weight': JSON.stringify({
      source: 'weights.xlsx', datasetId: 'weight-ds', rowCount: rows.length,
      persistenceMode: 'indexeddb', fieldMap: { weight: 'Weight' }, appliedRevision: 5,
    }),
  });
  const stateRef = {
    current: {
      supportConfigJson: JSON.stringify({ weight: { fieldMap: { weight: 'Weight' } }, supportPositionMatch: { toleranceMm: 20 } }),
      masterContext: { config: { weight: { fieldMap: { weight: 'Weight' } }, supportPositionMatch: { toleranceMm: 20 } }, rawRows: {}, mappingRows: {}, datasetRefs: {}, rowCounts: {}, previewRows: {}, sourceMetadata: {}, appliedMappingRevision: {} },
    },
  };
  const store = {
    async getMetadata(id) { return id === 'weight-ds' ? { datasetId: id, rowCount: rows.length, fileName: 'weights.xlsx' } : null; },
    async getRows(id) { return id === 'weight-ds' ? rows.map((row) => ({ ...row })) : null; },
  };
  try {
    assert.equal(await hydratePersistedMasterDatasets(stateRef, { store }), true);
    const cfg = JSON.parse(stateRef.current.supportConfigJson);
    assert.equal('masterRows' in cfg.weight, false);
    assert.equal(cfg.weight.masterRevision, 5);
    assert.equal(cfg.weight.masterFingerprint, xmlCiiWeightMasterRowsFingerprint(rows));
    assert.equal(stateRef.current.masterContext.datasetRefs.weight.masterFingerprint, cfg.weight.masterFingerprint);
    assert.equal(cfg.supportPositionMatch.toleranceMm, 20);
  } finally {
    storage.restore();
  }
});
""")

# Source/docs are deployment mirrors for all modified production modules.
for source in [
    'converters/xml-cii2019-core/rigid-weight-authority.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-runtime.js',
    'tabs/xml-cii-2019-standalone/workers/master-dataset-startup-hydration.js',
]:
    write('docs/' + source, read(source))

print('PR780 Phase C-A patch applied.')
