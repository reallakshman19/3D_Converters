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

function fixtureFiles() {
  return [
    'tabs/xml-cii-2019-standalone/xml-cii-manual-element-sideload.js',
    'tabs/xml-cii-2019-standalone/xml-cii-workflow-source-detect.js',
    'tabs/xml-cii-2019-standalone/xml-cii-regex-tester.js',
    'tabs/xml-cii-2019-standalone/xml-cii-resolver-json-trace.js',
    'tabs/xml-cii-2019-standalone/xml-cii-standalone-default-config.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-manual-element-sideload.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-state.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-dom.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-phase-registry.js',
  ];
}

function prepareEsmFixture() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'xml-cii-manual-test-'));
  fs.writeFileSync(path.join(tempRoot, 'package.json'), '{"type":"module"}', 'utf8');
  for (const relPath of fixtureFiles()) copyFile(tempRoot, relPath);
  return tempRoot;
}

class TestElement {
  constructor(tag) {
    this.tagName = tag;
    this.children = [];
    this.dataset = {};
    this.className = '';
    this.attributes = {};
    this.value = '';
    this.type = '';
    this._text = '';
  }
  appendChild(child) { this.children.push(child); return child; }
  append(...items) { for (const item of items) this.children.push(item); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  get textContent() { return `${this._text}${this.children.map((c) => typeof c === 'string' ? c : c.textContent || '').join('')}`; }
  set textContent(value) { this._text = String(value ?? ''); }
}

globalThis.document = { createElement: (tag) => new TestElement(tag) };

function resolverFixture() {
  const nodeHit = { tagName: 'PipingElement', nodeKeys: ['10'], psKey: 'PS-10', posKey: '100,200,300' };
  return {
    nodeIndex: { '10': [nodeHit] },
    psIndex: { 'PS-10': [nodeHit] },
    posIndex: { '100,200,300': [nodeHit] },
  };
}

function inputXmlFixture() {
  return `<CAESARII XML_TYPE="INPUT"><PIPINGMODEL>
    <PIPINGELEMENT FROM_NODE="10" TO_NODE="20" LINE_ID="/L-10" FROM_NAME="A" TO_NAME="B" DTXR_PS="PS-10" DTXR_POS="100,200,300" />
  </PIPINGMODEL></CAESARII>`;
}

(async () => {
  const tempRoot = prepareEsmFixture();
  const helper = await import(pathToFileURL(path.join(tempRoot, 'tabs/xml-cii-2019-standalone/xml-cii-manual-element-sideload.js')).href);
  const ui = await import(pathToFileURL(path.join(tempRoot, 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-manual-element-sideload.js')).href);
  const stateApi = await import(pathToFileURL(path.join(tempRoot, 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-state.js')).href);

  const xmlResult = helper.runStandaloneManualElementSideload({
    sourceKind: 'xml',
    manualText: 'NODE|10|GUIDE|direct node\nPS|PS-10|LINE STOP|ps hit\nPOS|999,999,999|ANCHOR|bad pos',
    resolverJsonTraceResult: resolverFixture(),
    supportConfigJson: '{}',
  });
  assert.strictEqual(xmlResult.matchedFacts.length, 2, 'two XML manual restraints should match');
  assert.strictEqual(xmlResult.rejectedFacts.length, 1, 'one XML manual restraint should reject');
  assert(xmlResult.diagnostics.some((item) => item.type === 'manual-restraints-matched'), 'manual diagnostics expected');
  assert(xmlResult.supportConfigJson.includes('manualElementSideload'), 'support config must include manualElementSideload');

  const inputResult = helper.runStandaloneManualElementSideload({
    sourceKind: 'inputxml',
    sourceText: inputXmlFixture(),
    elementSideLoadText: '10|20|PS-10|100,200,300|14|GUIDE\n99|100|PS-X|0,0,0|9|ANCHOR',
    supportConfigJson: '{}',
  });
  assert.strictEqual(inputResult.matchedSideLoadRows.length, 1, 'one InputXML side-load row should match');
  assert.strictEqual(inputResult.unmatchedSideLoadRows.length, 1, 'one InputXML side-load row should be unmatched');
  assert.strictEqual(inputResult.inheritedFieldPreview[0].inheritedFields.LINE_ID, '/L-10', 'matched row must inherit existing element fields');
  assert.strictEqual(inputResult.derivedRestraintPreview[0].typeCode, 14, 'TYPE 14 derived restraint preview expected');
  assert(!inputResult.elements.some((row) => row.fromNode === '99'), 'must not create synthetic InputXML PIPINGELEMENT rows');

  const baseState = stateApi.createXmlCiiAdaptedWorkflowState();
  const withResult = stateApi.applyStandaloneManualElementSideloadResult(baseState, inputResult);
  assert(withResult.supportConfigJson.includes('manualElementSideload'), 'state write-back must include side-load config');
  assert(withResult.manualElementSideloadWriteBackStatus.includes('saved'), 'write-back status must be visible');

  const card = new TestElement('section');
  ui.renderStandaloneManualElementSideloadPanel(card, { ...withResult, elementSideLoadText: '10|20|PS-10|100,200,300|14|GUIDE' });
  for (const label of ['XML Manual Restraints', 'Policy / Tolerance', 'Matched Restraints', 'Rejected Restraints', 'Save to Run Options', 'InputXML Element Side-load', 'FROM_NODE → TO_NODE Match Table', 'Inherited Fields', 'Derived Restraints TYPE 14 / 9 / 8', 'Unmatched Side-load Rows', 'Diagnostics']) {
    assert(card.textContent.includes(label), `Manual / Element Side-load panel missing ${label}`);
  }

  const apiSource = fs.readFileSync(path.join(root, 'tabs/xml-cii-2019-standalone/xml-cii-workflow-api.js'), 'utf8');
  assert(apiSource.includes('export async function runXmlCii2019Workflow'), 'public workflow API boundary must remain exported');
  const uiSource = fs.readFileSync(path.join(root, 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-manual-element-sideload.js'), 'utf8');
  assert(!uiSource.includes('model-converters'), 'manual side-load UI must not use old Model Converters route tokens');

  console.log('XML CII standalone Manual Element Side-load checks passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
