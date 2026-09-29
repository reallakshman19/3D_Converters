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

# Reusable config boundary: dataset-backed rows are calculation data, not persistent config authority.
path = 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-runtime.js'
s = read(path)
anchor = "function rowCountFor(next, key, def) {\n  const datasetCount = Number(next.datasetRefs?.[key]?.rowCount);\n  return Number.isFinite(datasetCount) && datasetCount >= 0 ? datasetCount : (next?.[def.contextRowsKey] || []).length;\n}\n"
insert = """export function compactDatasetBackedConfig(config, context = {}) {
  const next = { ...(config || {}) };
  for (const [key, def] of Object.entries(MASTER_DEF_MAP)) {
    const datasetRef = context?.datasetRefs?.[key];
    if (!datasetRef?.datasetId) continue;
    const section = { ...(next[def.configKey] || {}) };
    delete section[def.rowsProperty];
    if (!section.fieldMap && datasetRef.fieldMap) section.fieldMap = { ...datasetRef.fieldMap };
    if (key === 'weight') {
      const revision = Number(context?.appliedMappingRevision?.weight ?? section.masterRevision ?? 0);
      const fingerprint = String(datasetRef.masterFingerprint || section.masterFingerprint || '');
      if (Number.isFinite(revision) && revision > 0) section.masterRevision = revision;
      if (fingerprint) section.masterFingerprint = fingerprint;
    }
    next[def.configKey] = section;
  }
  return next;
}

"""
s = replace_once(s, anchor, insert + anchor, 'compact dataset config helper')
write(path, s)

# Weight Match may calculate with enriched rows, but persistent state must be metadata-only for worker datasets.
path = 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-weight-match-v2.js'
s = read(path)
s = replace_once(
    s,
    "import { appendEmpiricalWeightValidationReport } from './xml-cii-adapted-weight-validation-report.js?v=20260928-issue776-authority-2';",
    "import { appendEmpiricalWeightValidationReport } from './xml-cii-adapted-weight-validation-report.js?v=20260928-issue776-authority-2';\nimport { compactDatasetBackedConfig } from './xml-cii-adapted-master-runtime.js';",
    'weight match compact helper import',
)
s = replace_once(
    s,
    "function persistConfig(stateRef, config) {\n  const masterContext = { ...(stateRef.current.masterContext || {}), config };\n  stateRef.current = updateWorkflowState(stateRef.current, {\n    supportConfigJson: JSON.stringify(config, null, 2),\n    masterContext,\n  });\n  saveMasterContextToLocalStorage(stateRef.current.masterContext);\n}",
    "function persistConfig(stateRef, config) {\n  const compactConfig = compactDatasetBackedConfig(config, stateRef.current.masterContext || {});\n  const masterContext = { ...(stateRef.current.masterContext || {}), config: compactConfig };\n  stateRef.current = updateWorkflowState(stateRef.current, {\n    supportConfigJson: JSON.stringify(compactConfig, null, 2),\n    masterContext,\n  });\n  saveMasterContextToLocalStorage(stateRef.current.masterContext);\n}",
    'weight match compact persistence boundary',
)
write(path, s)

# Focused regression for compaction semantics and Weight Match wiring.
test_path = 'tests/xml-cii-master-config-compaction.test.mjs'
write(test_path, """import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

import { compactDatasetBackedConfig } from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-runtime.js';

test('dataset-backed config compaction removes only worker-owned row payloads', () => {
  const lineRows = [{ lineNo: 'L-1' }];
  const classRows = [{ class: 'A1' }];
  const materialRows = [{ material: 'CS' }];
  const weightRows = [{ weight: 9 }];
  const config = {
    linelist: { fieldMap: { lineNo: 'Line' }, masterRows: lineRows },
    pipingClass: { fieldMap: { pipingClass: 'Class' }, masterRows: classRows },
    material: { fieldMap: { material: 'Material' }, mapRows: materialRows },
    weight: { fieldMap: { weight: 'Weight' }, masterRows: weightRows, masterRevision: 1, masterFingerprint: 'old' },
    supportPositionMatch: { toleranceMm: 20 },
  };
  const context = {
    datasetRefs: {
      lineList: { datasetId: 'line-ds', fieldMap: { lineNo: 'Line' } },
      weight: { datasetId: 'weight-ds', fieldMap: { weight: 'Weight' }, masterFingerprint: '2:fnv1a:abc' },
    },
    appliedMappingRevision: { lineList: 3, weight: 7 },
  };

  const compact = compactDatasetBackedConfig(config, context);
  assert.equal('masterRows' in compact.linelist, false);
  assert.equal('masterRows' in compact.weight, false);
  assert.deepEqual(compact.pipingClass.masterRows, classRows, 'legacy non-worker rows remain compatible');
  assert.deepEqual(compact.material.mapRows, materialRows, 'unmigrated material rows remain compatible');
  assert.equal(compact.weight.masterRevision, 7);
  assert.equal(compact.weight.masterFingerprint, '2:fnv1a:abc');
  assert.equal(compact.supportPositionMatch.toleranceMm, 20);
  assert.equal(config.linelist.masterRows, lineRows, 'helper must not mutate calculation config');
  assert.equal(config.weight.masterRows, weightRows, 'helper must not strip transient calculation rows');
});

test('Weight Match persistence compacts enriched config before supportConfigJson write', async () => {
  const source = await fs.readFile(new URL('../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-weight-match-v2.js', import.meta.url), 'utf8');
  assert.match(source, /compactDatasetBackedConfig\(config, stateRef\.current\.masterContext \|\| \{\}\)/);
  assert.match(source, /supportConfigJson:\s*JSON\.stringify\(compactConfig, null, 2\)/);
  const persistBlock = source.match(/function persistConfig\([\s\S]*?\n\}/)?.[0] || '';
  assert.doesNotMatch(persistBlock, /JSON\.stringify\(config, null, 2\)/);
});
""")

for source in [
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-runtime.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-weight-match-v2.js',
]:
    write('docs/' + source, read(source))

print('PR780 Phase C-B patch applied.')
