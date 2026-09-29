from pathlib import Path

ROOT = Path('.')


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def write(path, text):
    (ROOT / path).parent.mkdir(parents=True, exist_ok=True)
    (ROOT / path).write_text(text, encoding='utf-8')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    return text.replace(old, new, 1)

# Generic transient dataset-backed config materializer. This is calculation-only;
# it never writes the hydrated rows into state or persistent config.
module_path = 'tabs/xml-cii-2019-standalone/xml-cii-dataset-backed-config.js'
write(module_path, """import { materializeMasterDatasetRows } from './ui-adapted/xml-cii-adapted-master-dataset-runtime.js?v=20260929-pr780-bounded-ui-1';

const MASTER_DATASET_CONFIG_DEFS = Object.freeze({
  lineList: Object.freeze({ configKey: 'linelist', rowsProperty: 'masterRows', contextRowsKey: 'lineRows' }),
  pipingClass: Object.freeze({ configKey: 'pipingClass', rowsProperty: 'masterRows', contextRowsKey: 'pipingClassRows' }),
  materialMap: Object.freeze({ configKey: 'material', rowsProperty: 'mapRows', contextRowsKey: 'materialMapRows' }),
  weight: Object.freeze({ configKey: 'weight', rowsProperty: 'masterRows', contextRowsKey: 'weightMasterRows' }),
});

function safeConfig(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function residentRows(context, def, expected) {
  const rows = Array.isArray(context?.[def.contextRowsKey]) ? context[def.contextRowsKey] : [];
  if (!rows.length) return null;
  if (expected > 0 && rows.length !== expected) return null;
  return rows;
}

export async function materializeXmlCiiDatasetBackedConfig(config, state, options = {}) {
  const next = { ...safeConfig(config) };
  const context = state?.masterContext || {};
  const refs = context.datasetRefs || {};
  const materializeRows = options.materializeRows || materializeMasterDatasetRows;

  for (const [masterKey, def] of Object.entries(MASTER_DATASET_CONFIG_DEFS)) {
    const ref = refs?.[masterKey];
    if (!ref?.datasetId) continue;
    const expected = Math.max(0, Number(ref.rowCount) || 0);
    let rows = residentRows(context, def, expected);
    if (!rows) rows = await materializeRows(masterKey, ref);
    if (!Array.isArray(rows) || rows.length !== expected) {
      throw new Error(`Dataset-backed ${masterKey} materialization mismatch: expected ${expected}, received ${Array.isArray(rows) ? rows.length : 0}.`);
    }

    const section = { ...safeConfig(next[def.configKey]), [def.rowsProperty]: rows };
    if (!section.fieldMap && ref.fieldMap) section.fieldMap = { ...ref.fieldMap };
    if (masterKey === 'weight') {
      const revision = Number(context?.appliedMappingRevision?.weight ?? section.masterRevision ?? 0);
      if (revision > 0) section.masterRevision = revision;
      if (ref.masterFingerprint) section.masterFingerprint = String(ref.masterFingerprint);
    }
    next[def.configKey] = section;
  }

  return next;
}

export const XML_CII_DATASET_CONFIG_DEFS = MASTER_DATASET_CONFIG_DEFS;
""")

# Job builder: dataset custody outranks legacy/default storage and is awaited before run.
path = 'tabs/xml-cii-2019-standalone/xml-cii-workflow-ui-adapter.js'
s = read(path)
s = replace_once(
    s,
    "} from './xml-cii-branch-scope.js?v=20260804-branch-scope-v1';",
    "} from './xml-cii-branch-scope.js?v=20260804-branch-scope-v1';\nimport { materializeXmlCiiDatasetBackedConfig } from './xml-cii-dataset-backed-config.js?v=20260929-pr780-dataset-operation-1';",
    'adapter dataset materializer import',
)
s = replace_once(
    s,
    'function enrichSupportConfigJson(state, branchScope = null) {',
    'export async function enrichSupportConfigJson(state, branchScope = null, options = {}) {',
    'adapter async export enrichSupportConfigJson',
)
s = replace_once(
    s,
    "  } catch {}\n\n  const lineRows = state.masterContext?.lineRows || getStoredMaster('lineList') || [];\n  const materialMapRows = state.masterContext?.materialMapRows || getStoredMaster('materialMap') || [];\n  const weightMasterRows = state.masterContext?.weightMasterRows || getStoredMaster('weight') || [];\n  const pipingClassRows = state.masterContext?.pipingClassRows?.length\n    ? state.masterContext.pipingClassRows\n    : (config.pipingClass?.masterRows || []);",
    "  } catch {}\n\n  config = await materializeXmlCiiDatasetBackedConfig(config, state, options);\n  const datasetRefs = state.masterContext?.datasetRefs || {};\n  const lineRows = datasetRefs.lineList?.datasetId\n    ? (config.linelist?.masterRows || [])\n    : (state.masterContext?.lineRows || getStoredMaster('lineList') || []);\n  const materialMapRows = datasetRefs.materialMap?.datasetId\n    ? (config.material?.mapRows || [])\n    : (state.masterContext?.materialMapRows || getStoredMaster('materialMap') || []);\n  const weightMasterRows = datasetRefs.weight?.datasetId\n    ? (config.weight?.masterRows || [])\n    : (state.masterContext?.weightMasterRows || getStoredMaster('weight') || []);\n  const pipingClassRows = datasetRefs.pipingClass?.datasetId\n    ? (config.pipingClass?.masterRows || [])\n    : (state.masterContext?.pipingClassRows?.length\n      ? state.masterContext.pipingClassRows\n      : (config.pipingClass?.masterRows || []));",
    'adapter dataset-aware master precedence',
)
s = replace_once(
    s,
    '    supportConfigJson: enrichSupportConfigJson(state, branchScope),',
    '    supportConfigJson: await enrichSupportConfigJson(state, branchScope),',
    'adapter await job support config',
)
write(path, s)

# Direct job-boundary regression with no resident compatibility rows.
write('tests/xml-cii-workflow-job-dataset-materialization.test.mjs', """import test from 'node:test';
import assert from 'node:assert/strict';

import { enrichSupportConfigJson } from '../tabs/xml-cii-2019-standalone/xml-cii-workflow-ui-adapter.js';
import { materializeXmlCiiDatasetBackedConfig } from '../tabs/xml-cii-2019-standalone/xml-cii-dataset-backed-config.js';

const rowsByKey = {
  lineList: [{ lineNo: 'L-101' }],
  pipingClass: [{ pipingClass: 'A1', bore: 80 }],
  materialMap: [{ material: 'CS', ciiCode: 'A106B' }],
  weight: [{ convertedBore: 80, rating: 300, weight: 9 }],
};

function datasetState() {
  return {
    supportConfigJson: JSON.stringify({
      linelist: { fieldMap: { lineNo: 'Line' } },
      pipingClass: { fieldMap: { pipingClass: 'Class' } },
      material: { fieldMap: { material: 'Material' } },
      weight: { fieldMap: { weight: 'Weight' }, masterRevision: 7, masterFingerprint: '1:fnv1a:test' },
      supportPositionMatch: { toleranceMm: 20 },
    }),
    masterContext: {
      lineRows: [], pipingClassRows: [], materialMapRows: [], weightMasterRows: [],
      datasetRefs: {
        lineList: { datasetId: 'line-ds', rowCount: 1, fieldMap: { lineNo: 'Line' } },
        pipingClass: { datasetId: 'class-ds', rowCount: 1, fieldMap: { pipingClass: 'Class' } },
        materialMap: { datasetId: 'material-ds', rowCount: 1, fieldMap: { material: 'Material' } },
        weight: { datasetId: 'weight-ds', rowCount: 1, fieldMap: { weight: 'Weight' }, masterFingerprint: '1:fnv1a:test' },
      },
      appliedMappingRevision: { lineList: 2, pipingClass: 3, materialMap: 4, weight: 7 },
    },
  };
}

const fakeMaterialize = async (masterKey, ref) => {
  assert.ok(ref.datasetId.endsWith('-ds'));
  return rowsByKey[masterKey].map((row) => ({ ...row }));
};

test('generic operation config transiently materializes every dataset-backed master', async () => {
  const state = datasetState();
  const base = JSON.parse(state.supportConfigJson);
  const config = await materializeXmlCiiDatasetBackedConfig(base, state, { materializeRows: fakeMaterialize });
  assert.deepEqual(config.linelist.masterRows, rowsByKey.lineList);
  assert.deepEqual(config.pipingClass.masterRows, rowsByKey.pipingClass);
  assert.deepEqual(config.material.mapRows, rowsByKey.materialMap);
  assert.deepEqual(config.weight.masterRows, rowsByKey.weight);
  assert.equal(config.weight.masterRevision, 7);
  assert.equal(config.weight.masterFingerprint, '1:fnv1a:test');
  assert.deepEqual(state.masterContext.weightMasterRows, []);
  assert.equal('masterRows' in JSON.parse(state.supportConfigJson).weight, false);
});

test('workflow job support config uses dataset rows when long-lived arrays are absent', async () => {
  const state = datasetState();
  const calls = [];
  const json = await enrichSupportConfigJson(state, null, {
    materializeRows: async (masterKey, ref) => {
      calls.push([masterKey, ref.datasetId]);
      return fakeMaterialize(masterKey, ref);
    },
  });
  const config = JSON.parse(json);
  assert.deepEqual(calls.map(([key]) => key).sort(), ['lineList', 'materialMap', 'pipingClass', 'weight']);
  assert.equal(config.linelist.masterRows[0].lineNo, 'L-101');
  assert.equal(config.pipingClass.masterRows[0].pipingClass, 'A1');
  assert.equal(config.material.mapRows[0].ciiCode, 'A106B');
  assert.equal(config.weight.masterRows[0].weight, 9);
  assert.equal(config.weight.masterRevision, 7);
  assert.equal(config.supportPositionMatch.toleranceMm, 20);
  assert.deepEqual(state.masterContext.lineRows, []);
  assert.deepEqual(state.masterContext.weightMasterRows, []);
});

test('dataset materialization mismatch fails closed instead of substituting legacy data', async () => {
  const state = datasetState();
  await assert.rejects(
    () => enrichSupportConfigJson(state, null, { materializeRows: async () => [] }),
    /materialization mismatch/,
  );
});
""")

# Deployment mirrors.
write('docs/' + module_path, read(module_path))
write('docs/' + path, read(path))

print('PR780 Phase D-B patch applied.')
