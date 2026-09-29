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


def patch_run(path):
    s = read(path)
    state_import = "import { applyStandaloneOutputRunReadiness, updateWorkflowState, xmlCiiEnrichedConfigFromState, saveMasterContextToLocalStorage } from './xml-cii-adapted-state.js';"
    s = replace_once(
        s,
        state_import,
        state_import + "\nimport { compactDatasetBackedConfig } from './xml-cii-adapted-master-runtime.js';",
        f'{path} compact helper import',
    )
    attr_line = "const attr = (value) => esc(value).replace(/'/g, '&#39;');"
    helper = """

function persistRunConfig(stateRef, config) {
  if (!stateRef?.current) return config;
  const current = stateRef.current;
  const compactConfig = compactDatasetBackedConfig(config, current.masterContext || {});
  const masterContext = current.masterContext
    ? { ...current.masterContext, config: compactConfig }
    : current.masterContext;
  const routed = updateWorkflowState(current, {
    supportConfigJson: JSON.stringify(compactConfig, null, 2),
  });
  stateRef.current = { ...routed, masterContext };
  if (masterContext) saveMasterContextToLocalStorage(masterContext);
  return compactConfig;
}
"""
    s = replace_once(s, attr_line, attr_line + helper, f'{path} persistRunConfig helper')

    # Canonical controller uses direct assignment; ATTA controller already routes through updateWorkflowState.
    direct_refresh = """      if (stateRef?.current) {
        stateRef.current.supportConfigJson = JSON.stringify(config, null, 2);
        if (stateRef.current.masterContext) {
          stateRef.current.masterContext.config = config;
          saveMasterContextToLocalStorage(stateRef.current.masterContext);
        }
      }"""
    routed_refresh = """      if (stateRef?.current) {
        const current = stateRef.current;
        const masterContext = current.masterContext
          ? { ...current.masterContext, config }
          : current.masterContext;
        const routed = updateWorkflowState(current, {
          supportConfigJson: JSON.stringify(config, null, 2),
        });
        stateRef.current = { ...routed, masterContext };
        if (masterContext) saveMasterContextToLocalStorage(masterContext);
      }"""
    if direct_refresh in s:
        s = replace_once(s, direct_refresh, "      if (stateRef?.current) persistRunConfig(stateRef, config);", f'{path} rating refresh persistence')
    elif routed_refresh in s:
        s = replace_once(s, routed_refresh, "      if (stateRef?.current) persistRunConfig(stateRef, config);", f'{path} rating refresh persistence')
    else:
        raise SystemExit(f'{path}: rating refresh persistence block not found')

    direct_final = """      stateRef.current.supportConfigJson = JSON.stringify(finalConfig, null, 2);
      if (stateRef.current.masterContext) {
        stateRef.current.masterContext.config = finalConfig;
        saveMasterContextToLocalStorage(stateRef.current.masterContext);
      }"""
    routed_final = """      const current = stateRef.current;
      const masterContext = current.masterContext
        ? { ...current.masterContext, config: finalConfig }
        : current.masterContext;
      const routed = updateWorkflowState(current, {
        supportConfigJson: JSON.stringify(finalConfig, null, 2),
      });
      stateRef.current = { ...routed, masterContext };
      if (masterContext) saveMasterContextToLocalStorage(masterContext);"""
    if direct_final in s:
        s = replace_once(s, direct_final, "      persistRunConfig(stateRef, finalConfig);", f'{path} final persistence')
    elif routed_final in s:
        s = replace_once(s, routed_final, "      persistRunConfig(stateRef, finalConfig);", f'{path} final persistence')
    else:
        raise SystemExit(f'{path}: final persistence block not found')
    write(path, s)

for source in [
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-run-workflow.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-run-workflow-atta-default.js',
]:
    patch_run(source)
    write('docs/' + source, read(source))

write('tests/xml-cii-master-run-config-compaction.test.mjs', """import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const paths = [
  'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-run-workflow.js',
  'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-run-workflow-atta-default.js',
];

for (const path of paths) {
  test(`${path} persists rigid-review config through dataset compaction`, async () => {
    const source = await fs.readFile(new URL('../' + path, import.meta.url), 'utf8');
    assert.ok(source.includes("compactDatasetBackedConfig(config, current.masterContext || {})"));
    assert.ok(source.includes("supportConfigJson: JSON.stringify(compactConfig, null, 2)"));
    assert.ok((source.match(/persistRunConfig\(stateRef, config\)/g) || []).length >= 1);
    assert.ok((source.match(/persistRunConfig\(stateRef, finalConfig\)/g) || []).length >= 1);
    assert.equal(source.includes('supportConfigJson = JSON.stringify(config, null, 2)'), false);
    assert.equal(source.includes('supportConfigJson = JSON.stringify(finalConfig, null, 2)'), false);
    assert.equal(source.includes('supportConfigJson: JSON.stringify(config, null, 2)'), false);
    assert.equal(source.includes('supportConfigJson: JSON.stringify(finalConfig, null, 2)'), false);
  });
}
""")

print('PR780 Phase C-C patch applied.')
