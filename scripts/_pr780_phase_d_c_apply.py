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

# Weight Match: hydrate every dataset-backed engineering dependency transiently once,
# then keep the Weight-specific default safeguard for legacy/no-dataset cases.
path = 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-weight-match-v2.js'
s = read(path)
s = replace_once(
    s,
    "import { materializeMasterDatasetRows } from './xml-cii-adapted-master-dataset-runtime.js?v=20260929-pr780-bounded-ui-1';",
    "import { materializeMasterDatasetRows } from './xml-cii-adapted-master-dataset-runtime.js?v=20260929-pr780-bounded-ui-1';\nimport { materializeXmlCiiDatasetBackedConfig } from '../xml-cii-dataset-backed-config.js?v=20260929-pr780-dataset-operation-1';",
    'weight generic dataset config import',
)
s = replace_once(
    s,
    "  if (datasetRef?.datasetId && !residentRows) {",
    "  if (datasetRef?.datasetId && !residentRows && !hasWeightRows(out)) {",
    'weight avoid duplicate materialization',
)
s = replace_once(
    s,
    "export async function weightMatchConfigFromState(state, options = {}) {\n  return ensureWeightRows(\n    xmlCiiEnrichedConfigFromState(state),\n    state?.masterContext,\n    options.materializeRows || materializeMasterDatasetRows,\n  );\n}",
    "export async function weightMatchConfigFromState(state, options = {}) {\n  const materializeRows = options.materializeRows || materializeMasterDatasetRows;\n  const operationConfig = await materializeXmlCiiDatasetBackedConfig(\n    xmlCiiEnrichedConfigFromState(state),\n    state,\n    { materializeRows },\n  );\n  return ensureWeightRows(operationConfig, state?.masterContext, materializeRows);\n}",
    'weight operation config materialization',
)
write(path, s)

# Both Run controllers: review gets the same transient dataset-backed basis as the eventual job.
for path in [
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-run-workflow.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-run-workflow-atta-default.js',
]:
    s = read(path)
    s = replace_once(
        s,
        "import { compactDatasetBackedConfig } from './xml-cii-adapted-master-runtime.js';",
        "import { compactDatasetBackedConfig } from './xml-cii-adapted-master-runtime.js';\nimport { materializeXmlCiiDatasetBackedConfig } from '../xml-cii-dataset-backed-config.js?v=20260929-pr780-dataset-operation-1';",
        f'{path} generic dataset config import',
    )
    s = replace_once(
        s,
        "  if (!await reviewRigidWeights(stateRef, xmlCiiEnrichedConfigFromState(stateRef.current))) return;",
        "  const reviewConfig = await materializeXmlCiiDatasetBackedConfig(\n    xmlCiiEnrichedConfigFromState(stateRef.current),\n    stateRef.current,\n  );\n  if (!await reviewRigidWeights(stateRef, reviewConfig)) return;",
        f'{path} dataset-aware review config',
    )
    write(path, s)

write('tests/xml-cii-readonly-consumer-dataset-config.test.mjs', """import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const read = (path) => fs.readFile(new URL('../' + path, import.meta.url), 'utf8');

test('Weight Match builds its calculation basis through generic dataset materialization', async () => {
  const source = await read('tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-weight-match-v2.js');
  assert.ok(source.includes('materializeXmlCiiDatasetBackedConfig('));
  assert.ok(source.includes('xmlCiiEnrichedConfigFromState(state)'));
  assert.ok(source.includes('!residentRows && !hasWeightRows(out)'));
});

for (const path of [
  'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-run-workflow.js',
  'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-run-workflow-atta-default.js',
]) {
  test(`${path} materializes dataset-backed masters before rigid-weight review`, async () => {
    const source = await read(path);
    assert.ok(source.includes('const reviewConfig = await materializeXmlCiiDatasetBackedConfig('));
    assert.ok(source.includes('xmlCiiEnrichedConfigFromState(stateRef.current)'));
    assert.ok(source.includes('reviewRigidWeights(stateRef, reviewConfig)'));
  });
}
""")

for source in [
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-weight-match-v2.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-run-workflow.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-run-workflow-atta-default.js',
]:
    write('docs/' + source, read(source))

print('PR780 Phase D-C patch applied.')
