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

# Preview Diagnostics: transient dataset-backed calculation config + metadata-only persistence.
path = 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-diagnostics-audit-v7.js'
s = read(path)
s = replace_once(
    s,
    "import { installPreviewB313WallUpdateAuditController } from './xml-cii-adapted-preview-b313-wall-audit-controller.js?v=20260928-issue776-authority-1';",
    "import { installPreviewB313WallUpdateAuditController } from './xml-cii-adapted-preview-b313-wall-audit-controller.js?v=20260928-issue776-authority-1';\nimport { materializeXmlCiiDatasetBackedConfig } from '../xml-cii-dataset-backed-config.js?v=20260929-pr780-dataset-operation-1';\nimport { compactDatasetBackedConfig } from './xml-cii-adapted-master-runtime.js';",
    'preview dataset imports',
)
anchor = "export { renderStandaloneDiagnosticsReportPanel };\n\n"
insert = """export async function previewConfigFromState(state, options = {}) {
  return materializeXmlCiiDatasetBackedConfig(
    xmlCiiEnrichedConfigFromState(state),
    state,
    options,
  );
}

"""
s = replace_once(s, anchor, anchor + insert, 'preview config helper')
s = replace_once(
    s,
    "  const config = xmlCiiEnrichedConfigFromState(state);",
    "  const config = await previewConfigFromState(state);",
    'preview transient config',
)
s = replace_once(
    s,
    "  const persistConfig = (newCfg, { clearPreview = true } = {}) => {\n    if (clearPreview) clearPreviewCachesV7();\n    const nextJson = JSON.stringify(newCfg, null, 2);\n    if (stateRef && stateRef.current !== undefined) {\n      const context = stateRef.current.masterContext || {};\n      context.config = newCfg;\n      const routed = updateWorkflowState(stateRef.current, {\n        supportConfigJson: nextJson,\n      });\n      stateRef.current = { ...routed, masterContext: { ...context, config: newCfg } };\n      saveMasterContextToLocalStorage(stateRef.current.masterContext);\n    }\n  };",
    "  const persistConfig = (newCfg, { clearPreview = true } = {}) => {\n    if (clearPreview) clearPreviewCachesV7();\n    if (stateRef && stateRef.current !== undefined) {\n      const currentContext = stateRef.current.masterContext || {};\n      const compactConfig = compactDatasetBackedConfig(newCfg, currentContext);\n      const routed = updateWorkflowState(stateRef.current, {\n        supportConfigJson: JSON.stringify(compactConfig, null, 2),\n      });\n      stateRef.current = { ...routed, masterContext: { ...currentContext, config: compactConfig } };\n      saveMasterContextToLocalStorage(stateRef.current.masterContext);\n    }\n  };",
    'preview compact persistence',
)
write(path, s)

# Output/Run readiness: metadata-only counts; do not enrich/hydrate master arrays for a display card.
path = 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-output-run.js'
s = read(path)
s = replace_once(
    s,
    "import { updateWorkflowOptions, applyStandaloneOutputRunReadiness, updateWorkflowState, xmlCiiEnrichedConfigFromState } from './xml-cii-adapted-state.js';",
    "import { updateWorkflowOptions, applyStandaloneOutputRunReadiness, updateWorkflowState } from './xml-cii-adapted-state.js';",
    'output remove enriched config import',
)
anchor = "function rows(value) { return Array.isArray(value) ? value : []; }\nfunction text(value) { return String(value ?? ''); }\n"
insert = """
function supportConfigForReadiness(state) {
  try {
    const parsed = JSON.parse(String(state?.supportConfigJson || '{}'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function masterRowCount(state, masterKey, contextRowsKey, configRows) {
  const ref = state?.masterContext?.datasetRefs?.[masterKey];
  const datasetCount = Number(ref?.rowCount);
  if (ref?.datasetId && Number.isFinite(datasetCount) && datasetCount >= 0) return datasetCount;
  const contextRows = state?.masterContext?.[contextRowsKey];
  if (Array.isArray(contextRows) && contextRows.length) return contextRows.length;
  return Array.isArray(configRows) ? configRows.length : 0;
}

export function outputRunReadinessMasterCounts(state, config = supportConfigForReadiness(state)) {
  return {
    linelist: masterRowCount(state, 'lineList', 'lineRows', config?.linelist?.masterRows),
    pipingClass: masterRowCount(state, 'pipingClass', 'pipingClassRows', config?.pipingClass?.masterRows),
    material: masterRowCount(state, 'materialMap', 'materialMapRows', config?.material?.mapRows),
    weight: masterRowCount(state, 'weight', 'weightMasterRows', config?.weight?.masterRows),
  };
}
"""
s = replace_once(s, anchor, anchor + insert, 'output metadata count helpers')
s = replace_once(
    s,
    "function renderReadinessCard(parent, config) {\n  const readyCard = createElement('div', '', 'model-converters-workflow-master-card');\n  readyCard.appendChild(createElement('div', 'Readiness', 'model-converters-workflow-section-title'));\n  const counts = {\n    linelist: Array.isArray(config.linelist?.masterRows) ? config.linelist.masterRows.length : 0,\n    pipingClass: Array.isArray(config.pipingClass?.masterRows) ? config.pipingClass.masterRows.length : 0,\n    material: Array.isArray(config.material?.mapRows) ? config.material.mapRows.length : 0,\n    weight: Array.isArray(config.weight?.masterRows) ? config.weight.masterRows.length : 0,\n  };",
    "function renderReadinessCard(parent, config, state) {\n  const readyCard = createElement('div', '', 'model-converters-workflow-master-card');\n  readyCard.appendChild(createElement('div', 'Readiness', 'model-converters-workflow-section-title'));\n  const counts = outputRunReadinessMasterCounts(state, config);",
    'output metadata readiness card',
)
s = replace_once(
    s,
    "  const config = xmlCiiEnrichedConfigFromState(state);",
    "  const config = supportConfigForReadiness(state);",
    'output compact config parse',
)
s = replace_once(
    s,
    "  renderReadinessCard(card, config);",
    "  renderReadinessCard(card, config, state);",
    'output readiness state arg',
)
write(path, s)

# Focused regressions.
write('tests/xml-cii-preview-dataset-operation.test.mjs', """import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const sourcePath = new URL('../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-diagnostics-audit-v7.js', import.meta.url);

test('Preview uses transient dataset-backed config and compacts every config write-back', async () => {
  const source = await fs.readFile(sourcePath, 'utf8');
  assert.ok(source.includes('export async function previewConfigFromState'));
  assert.ok(source.includes('materializeXmlCiiDatasetBackedConfig('));
  assert.ok(source.includes('const config = await previewConfigFromState(state);'));
  assert.ok(source.includes('const compactConfig = compactDatasetBackedConfig(newCfg, currentContext);'));
  assert.ok(source.includes('supportConfigJson: JSON.stringify(compactConfig, null, 2)'));
  assert.ok(source.includes('masterContext: { ...currentContext, config: compactConfig }'));
  assert.equal(source.includes('supportConfigJson: nextJson'), false);
});
""")

write('tests/xml-cii-output-run-metadata-readiness.test.mjs', """import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const sourcePath = new URL('../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-output-run.js', import.meta.url);

test('Output/Run readiness is metadata-only for dataset-backed masters', async () => {
  const source = await fs.readFile(sourcePath, 'utf8');
  assert.equal(source.includes('xmlCiiEnrichedConfigFromState'), false);
  assert.ok(source.includes("masterRowCount(state, 'lineList', 'lineRows'"));
  assert.ok(source.includes("masterRowCount(state, 'pipingClass', 'pipingClassRows'"));
  assert.ok(source.includes("masterRowCount(state, 'materialMap', 'materialMapRows'"));
  assert.ok(source.includes("masterRowCount(state, 'weight', 'weightMasterRows'"));
  assert.ok(source.includes("if (ref?.datasetId && Number.isFinite(datasetCount) && datasetCount >= 0) return datasetCount;"));
  assert.ok(source.includes('const config = supportConfigForReadiness(state);'));
});
""")

for source in [
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-diagnostics-audit-v7.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-output-run.js',
]:
    write('docs/' + source, read(source))

print('PR780 Phase D-D patch applied.')
