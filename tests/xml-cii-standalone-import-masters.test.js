const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

const root = path.resolve(__dirname, '..');

function copyFile(tempRoot, relPath) {
  const sourcePath = path.join(root, relPath);
  const targetPath = path.join(tempRoot, relPath);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
}

function prepareEsmFixture() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'xml-cii-masters-test-'));
  fs.writeFileSync(path.join(tempRoot, 'package.json'), '{"type":"module"}', 'utf8');
  for (const relPath of fixtureFiles()) copyFile(tempRoot, relPath);
  return tempRoot;
}

function fixtureFiles() {
  return [
    'tabs/xml-cii-2019-standalone/xml-cii-master-context.js',
    'tabs/xml-cii-2019-standalone/xml-cii-regex-tester.js',
    'tabs/xml-cii-2019-standalone/xml-cii-workflow-api.js',
    'tabs/xml-cii-2019-standalone/xml-cii-workflow-types.js',
    'tabs/xml-cii-2019-standalone/xml-cii-workflow-source-detect.js',
    'tabs/xml-cii-2019-standalone/xml-cii-workflow-service.js',
    'tabs/xml-cii-2019-standalone/xml-cii-workflow-engine-client.js',
    'tabs/xml-cii-2019-standalone/xml-cii-inputxml-enrichment.js',
    'tabs/xml-cii-2019-standalone/xml-cii-standalone-default-config.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-state.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-phase-registry.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-import-masters.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-dom.js',
    'converters/xml-cii2019-core/master-context.js',
    'converters/xml-cii2019-core/config.js',
    'converters/xml-cii2019-core/piping-class-resolver.js',
    'converters/xml-cii2019-core/pipe-component-data-adapter.js',
    'converters/xml-cii2019-core/support-mapping-config.js',
    'converters/xml-cii2019-core/line-density-resolver.js',
    'converters/xml-cii2019-core/linelist-mapping.js',
    'support/SupportKindResolver.js',
    'vendor/create-pipe-data-db.js',
  ];
}

class TestElement {
  constructor(tag) {
    this.tagName = tag;
    this.children = [];
    this.dataset = {};
    this.className = '';
    this.attributes = {};
    this._text = '';
  }
  appendChild(child) { this.children.push(child); return child; }
  append(...items) { for (const item of items) this.appendChild(item); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  get textContent() { return `${this._text}${this.children.map((c) => c.textContent || '').join('')}`; }
  set textContent(value) { this._text = String(value ?? ''); }
}

globalThis.document = { createElement: (tag) => new TestElement(tag) };

function inlineConfig() {
  return JSON.stringify({
    linelist: { masterRows: [{ lineNo: 'L-100', pipingClass: '91261', density: '100' }] },
    pipingClass: { masterRows: [{ pipingClass: '91261', boreMm: 150, componentType: 'PIPE', rating: '900' }] },
    material: { mapRows: [{ code: '1', material: 'CARBON STEEL' }] },
    weight: { masterRows: [{ Type: 'GATE', DN: 150, Rating: 900, 'RF/RTJ KG': 200 }] },
  });
}

(async () => {
  const tempRoot = prepareEsmFixture();
  const masters = await import(pathToFileURL(path.join(tempRoot, 'tabs/xml-cii-2019-standalone/xml-cii-master-context.js')).href);
  const stateApi = await import(pathToFileURL(path.join(tempRoot, 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-state.js')).href);
  const ui = await import(pathToFileURL(path.join(tempRoot, 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-import-masters.js')).href);
  const workflowApi = await import(pathToFileURL(path.join(tempRoot, 'tabs/xml-cii-2019-standalone/xml-cii-workflow-api.js')).href);

  const masterContext = await masters.prepareStandaloneImportMasters({ supportConfigJson: inlineConfig() });
  assert(Array.isArray(masterContext.lineRows), 'lineRows must be an array');
  assert(Array.isArray(masterContext.pipingClassRows), 'pipingClassRows must be an array');
  assert(masterContext.pipingClassIndex, 'pipingClassIndex must exist');
  assert(Array.isArray(masterContext.materialMapRows), 'materialMapRows must be an array');
  assert(Array.isArray(masterContext.weightMasterRows), 'weightMasterRows must be an array');
  assert(Array.isArray(masterContext.diagnostics), 'diagnostics must be an array');
  assert(masterContext.sourceMetadata, 'sourceMetadata must exist');
  assert.deepStrictEqual(masterContext.rowCounts, { lineList: 1, pipingClass: 1, materialMap: 1, weight: 1 });
  assert.strictEqual(masterContext.previewRows.lineList.length, 1, 'line list preview row expected');
  assert(masterContext.supportConfigJson.includes('CARBON STEEL'), 'write-back config must include loaded material row');

  const baseState = stateApi.createXmlCiiAdaptedWorkflowState();
  const nextState = stateApi.applyStandaloneImportMastersContext(baseState, masterContext);
  assert.strictEqual(nextState.masterContext, masterContext, 'state must retain master context');
  assert(nextState.supportConfigJson.includes('91261'), 'state config must receive master rows');
  assert(nextState.importMastersWriteBackStatus.includes('Loaded 4 master rows'), 'write-back status must be visible');

  const card = new TestElement('section');
  ui.renderStandaloneImportMastersPanel(card, nextState);
  for (const label of ['Line List', 'Piping Class', 'Material Map', 'Weights / Valve CA8']) {
    assert(card.textContent.includes(label), `Import Masters panel missing ${label} card`);
  }
  assert(card.textContent.includes('Load / refresh master context'), 'Import Masters panel must expose load/refresh action');

  assert.strictEqual(typeof workflowApi.runXmlCii2019Workflow, 'function', 'public workflow API boundary must remain exported');
  const panelSource = fs.readFileSync(path.join(root, 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-import-masters.js'), 'utf8');
  assert(!panelSource.includes('model-converters'), 'Import Masters UI must not use old Model Converters route tokens');

  console.log('XML CII standalone Import Masters checks passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});