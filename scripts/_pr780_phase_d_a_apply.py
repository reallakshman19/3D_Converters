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

# Coordinator: normalized-row materialization by dataset ref, still bounded by worker chunk size.
path = 'tabs/xml-cii-2019-standalone/workers/master-dataset-import-coordinator.js'
s = read(path)
anchor = """  async function releaseMaster(masterKey) {
    const job = jobs.get(masterKey);
"""
insert = """  async function materializeRows(masterKey, rowCount = 0, datasetIdOverride = '') {
    const datasetId = datasetIdOverride || activeDatasets.get(masterKey);
    if (!datasetId) throw new Error(`No active dataset exists for ${masterKey}.`);
    const expected = Math.max(0, Number(rowCount) || 0);
    const rows = [];
    for (let offset = 0; offset < expected; offset += MASTER_DATASET_CHUNK_ROWS) {
      const result = await client.getRows(datasetId, offset, MASTER_DATASET_CHUNK_ROWS);
      rows.push(...(result?.rows || []));
    }
    if (rows.length !== expected) {
      throw new Error(`Dataset materialization mismatch for ${masterKey}: expected ${expected}, received ${rows.length}.`);
    }
    return { datasetId, rowCount: expected, rows };
  }

"""
s = replace_once(s, anchor, insert + anchor, 'coordinator materializeRows')
s = replace_once(
    s,
    "return Object.freeze({ openFile, openBuffer, selectSheet, workbookJob, materialize, releaseMaster, search, getRows, getRowsByIndexes, dispose });",
    "return Object.freeze({ openFile, openBuffer, selectSheet, workbookJob, materialize, materializeRows, releaseMaster, search, getRows, getRowsByIndexes, dispose });",
    'coordinator export materializeRows',
)
write(path, s)

# Shared UI runtime wrapper.
path = 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-dataset-runtime.js'
s = read(path)
s += """

export async function materializeMasterDatasetRows(masterKey, datasetRef = {}) {
  const datasetId = String(datasetRef?.datasetId || '');
  const rowCount = Math.max(0, Number(datasetRef?.rowCount) || 0);
  if (!datasetId) throw new Error(`Dataset id is required to materialize ${masterKey}.`);
  const result = await masterDatasetCoordinator.materializeRows(masterKey, rowCount, datasetId);
  return Array.isArray(result?.rows) ? result.rows : [];
}
"""
write(path, s)

# Weight Match: dataset ref outranks fallback/default when resident rows are absent.
path = 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-weight-match-v2.js'
s = read(path)
s = replace_once(
    s,
    "import { compactDatasetBackedConfig } from './xml-cii-adapted-master-runtime.js';",
    "import { compactDatasetBackedConfig } from './xml-cii-adapted-master-runtime.js';\nimport { materializeMasterDatasetRows } from './xml-cii-adapted-master-dataset-runtime.js?v=20260929-pr780-bounded-ui-1';",
    'weight match materializer import',
)
old_ensure = """function ensureWeightRows(config, masterContext) {
  const out = config && typeof config === 'object' && !Array.isArray(config) ? config : {};
  if (hasWeightRows(out)) return out;
  const rows = Array.isArray(masterContext?.weightMasterRows) && masterContext.weightMasterRows.length
    ? masterContext.weightMasterRows
    : DEFAULT_WEIGHT_MASTER_ROWS;
  out.weight = out.weight && typeof out.weight === 'object' && !Array.isArray(out.weight)
    ? { ...out.weight }
    : {};
  out.weight.masterRows = rows.map((row) => ({ ...row }));
  return out;
}
"""
new_ensure = """async function ensureWeightRows(config, masterContext, materializeRows = materializeMasterDatasetRows) {
  const out = config && typeof config === 'object' && !Array.isArray(config) ? config : {};
  const residentRows = Array.isArray(masterContext?.weightMasterRows) && masterContext.weightMasterRows.length
    ? masterContext.weightMasterRows
    : null;
  const datasetRef = masterContext?.datasetRefs?.weight;

  // Dataset custody is authoritative. If compatibility hydration has been removed,
  // fetch only this master for the current operation instead of accepting defaults.
  if (datasetRef?.datasetId && !residentRows) {
    const rows = await materializeRows('weight', datasetRef);
    if (rows.length !== Number(datasetRef.rowCount || 0)) {
      throw new Error(`Weight dataset materialization mismatch: expected ${Number(datasetRef.rowCount || 0)}, received ${rows.length}.`);
    }
    out.weight = out.weight && typeof out.weight === 'object' && !Array.isArray(out.weight)
      ? { ...out.weight }
      : {};
    out.weight.masterRows = rows;
    const revision = Number(masterContext?.appliedMappingRevision?.weight || out.weight.masterRevision || 0);
    if (revision > 0) out.weight.masterRevision = revision;
    if (datasetRef.masterFingerprint) out.weight.masterFingerprint = datasetRef.masterFingerprint;
    return out;
  }

  if (hasWeightRows(out)) return out;
  const rows = residentRows || DEFAULT_WEIGHT_MASTER_ROWS;
  out.weight = out.weight && typeof out.weight === 'object' && !Array.isArray(out.weight)
    ? { ...out.weight }
    : {};
  out.weight.masterRows = rows.map((row) => ({ ...row }));
  return out;
}

export async function weightMatchConfigFromState(state, options = {}) {
  return ensureWeightRows(
    xmlCiiEnrichedConfigFromState(state),
    state?.masterContext,
    options.materializeRows || materializeMasterDatasetRows,
  );
}
"""
s = replace_once(s, old_ensure, new_ensure, 'async dataset-aware ensureWeightRows')
old_persist = """function persistSharedWeightMatchConfig(stateRef, nextConfig, baseline) {
  const current = ensureWeightRows(
    xmlCiiEnrichedConfigFromState(stateRef.current),
    stateRef.current.masterContext,
  );
"""
new_persist = """function persistSharedWeightMatchConfig(stateRef, nextConfig, baseline, calculationBasis) {
  const current = calculationBasis && hasWeightRows(calculationBasis)
    ? calculationBasis
    : nextConfig;
"""
s = replace_once(s, old_persist, new_persist, 'weight save transient basis')
s = replace_once(
    s,
    "  const clean = { ...nextConfig, overrides };",
    "  const clean = {\n    ...nextConfig,\n    weight: { ...(nextConfig?.weight || {}), masterRows: [...(current?.weight?.masterRows || [])] },\n    overrides,\n  };",
    'weight save keeps transient master basis',
)
s = replace_once(
    s,
    "      const state = stateRef.current;\n      const persistedConfig = ensureWeightRows(xmlCiiEnrichedConfigFromState(state), state.masterContext);\n      const rendererConfig = withXmlCiiEffectiveRigidWeightLegacyView(persistedConfig);\n      let baseline = xmlCiiEffectiveRigidWeightMap(persistedConfig);",
    "      const state = stateRef.current;\n      let calculationBasis = await weightMatchConfigFromState(state);\n      const rendererConfig = withXmlCiiEffectiveRigidWeightLegacyView(calculationBasis);\n      let baseline = xmlCiiEffectiveRigidWeightMap(calculationBasis);",
    'weight render async transient basis',
)
s = replace_once(
    s,
    "        onSaveConfig: (nextConfig) => {\n          const saved = persistSharedWeightMatchConfig(stateRef, nextConfig, baseline);\n          baseline = xmlCiiEffectiveRigidWeightMap(saved);\n        },",
    "        onSaveConfig: (nextConfig) => {\n          const saved = persistSharedWeightMatchConfig(stateRef, nextConfig, baseline, calculationBasis);\n          calculationBasis = saved;\n          baseline = xmlCiiEffectiveRigidWeightMap(saved);\n        },",
    'weight save callback retains transient basis',
)
write(path, s)

# Extend coordinator injection regression.
path = 'tests/xml-cii-master-dataset-coordinator.test.mjs'
s = read(path)
s += """

test('coordinator materializes a persisted dataset in bounded normalized chunks', async () => {
  const calls = [];
  const rowCount = 4500;
  const client = {
    async getRows(id, offset, limit) {
      calls.push([id, offset, limit]);
      const count = Math.min(limit, rowCount - offset);
      return { rows: Array.from({ length: count }, (_, i) => ({ n: offset + i })) };
    },
    async releaseSource() {}, async releaseDataset() {}, search() {}, dispose() {},
  };
  const coordinator = createMasterDatasetImportCoordinator({ client });
  const result = await coordinator.materializeRows('weight', rowCount, 'weight-persisted');
  assert.equal(result.datasetId, 'weight-persisted');
  assert.equal(result.rows.length, rowCount);
  assert.deepEqual(calls.map(([, offset]) => offset), [0, 2000, 4000]);
  assert.equal(Math.max(...calls.map(([, , limit]) => limit)), 2000);
});
"""
write(path, s)

# Direct consumer-independence regression: no resident rows and no state mutation.
write('tests/xml-cii-weight-match-dataset-materialization.test.mjs', """import test from 'node:test';
import assert from 'node:assert/strict';

import { weightMatchConfigFromState } from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-weight-match-v2.js';

const workerRows = [
  { convertedBore: 80, rating: 300, type: 'FLAN', lengthMm: 80, weight: 9 },
  { convertedBore: 100, rating: 600, type: 'VALV', lengthMm: 120, weight: 14 },
];

test('Weight Match materializes dataset rows when resident compatibility rows are absent', async () => {
  const calls = [];
  const state = {
    supportConfigJson: JSON.stringify({
      weight: { masterRevision: 5, masterFingerprint: '2:fnv1a:test' },
      supportPositionMatch: { toleranceMm: 20 },
    }),
    masterContext: {
      weightMasterRows: [],
      datasetRefs: {
        weight: { datasetId: 'weight-ds', rowCount: workerRows.length, masterFingerprint: '2:fnv1a:test' },
      },
      appliedMappingRevision: { weight: 5 },
    },
  };

  const config = await weightMatchConfigFromState(state, {
    materializeRows: async (masterKey, datasetRef) => {
      calls.push([masterKey, datasetRef.datasetId, datasetRef.rowCount]);
      return workerRows.map((row) => ({ ...row }));
    },
  });

  assert.deepEqual(calls, [['weight', 'weight-ds', 2]]);
  assert.deepEqual(config.weight.masterRows, workerRows);
  assert.equal(config.weight.masterRevision, 5);
  assert.equal(config.weight.masterFingerprint, '2:fnv1a:test');
  assert.deepEqual(state.masterContext.weightMasterRows, [], 'transient materialization must not repopulate long-lived state');
  assert.equal('masterRows' in JSON.parse(state.supportConfigJson).weight, false);
});

test('Weight Match preserves legacy resident-row path without worker materialization', async () => {
  let called = false;
  const resident = [{ convertedBore: 50, rating: 150, weight: 4 }];
  const state = {
    supportConfigJson: '{}',
    masterContext: { weightMasterRows: resident, datasetRefs: {}, appliedMappingRevision: { weight: 3 } },
  };
  const config = await weightMatchConfigFromState(state, {
    materializeRows: async () => { called = true; return []; },
  });
  assert.equal(called, false);
  assert.deepEqual(config.weight.masterRows, resident);
  assert.equal(config.weight.masterRevision, 3);
});
""")

for source in [
    'tabs/xml-cii-2019-standalone/workers/master-dataset-import-coordinator.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-dataset-runtime.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-weight-match-v2.js',
]:
    write('docs/' + source, read(source))

print('PR780 Phase D-A patch applied.')
