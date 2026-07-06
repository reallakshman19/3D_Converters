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
    'tabs/xml-cii-2019-standalone/xml-cii-resolver-json-trace.js',
    'tabs/xml-cii-2019-standalone/xml-cii-manual-element-sideload.js',
    'tabs/xml-cii-2019-standalone/xml-cii-workflow-source-detect.js',
    'tabs/xml-cii-2019-standalone/xml-cii-regex-tester.js',
    'tabs/xml-cii-2019-standalone/xml-cii-standalone-default-config.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-resolver-json-trace.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-state.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-dom.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-phase-registry.js',
  ];
}

function prepareEsmFixture() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'xml-cii-resolver-test-'));
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
    this._text = '';
  }
  appendChild(child) { this.children.push(child); return child; }
  append(...items) { for (const item of items) this.children.push(item); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  get textContent() { return `${this._text}${this.children.map((c) => typeof c === 'string' ? c : c.textContent || '').join('')}`; }
  set textContent(value) { this._text = String(value ?? ''); }
}

globalThis.document = { createElement: (tag) => new TestElement(tag) };

function xmlFixture() {
  return `<PipeStressExport>
    <PipingElement NODE="10" DTXR_PS="PS-10" DTXR_POS="100,200,300" LINE_ID="/L-10" />
    <PipingElement FROM_NODE="20" TO_NODE="30" PS="PS-20" X="1" Y="2" Z="3" />
  </PipeStressExport>`;
}

function jsonFixture() {
  return JSON.stringify([
    { node: '10', ps: 'PS-10', pos: '100,200,300', tag: 'matched-node-ps-pos' },
    { node: '999', ps: 'PS-X', pos: '9,9,9', tag: 'rejected' },
  ]);
}

(async () => {
  const tempRoot = prepareEsmFixture();
  const helper = await import(pathToFileURL(path.join(tempRoot, 'tabs/xml-cii-2019-standalone/xml-cii-resolver-json-trace.js')).href);
  const ui = await import(pathToFileURL(path.join(tempRoot, 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-resolver-json-trace.js')).href);
  const stateApi = await import(pathToFileURL(path.join(tempRoot, 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-state.js')).href);

  const result = helper.runStandaloneResolverJsonTrace({ sourceKind: 'xml', sourceText: xmlFixture(), stagedJsonText: jsonFixture(), supportConfigJson: '{}' });
  assert(result.indexStats.xmlNodeCount >= 3, 'XML node count must be reported');
  assert(result.indexStats.nodeKeyCount >= 3, 'node key count must be reported');
  assert(result.indexStats.psKeyCount >= 2, 'PS key count must be reported');
  assert(result.indexStats.posKeyCount >= 2, 'POS key count must be reported');
  assert(result.nodeIndex['10'], 'node index must include NODE=10');
  assert(result.psIndex['PS-10'], 'PS index must include PS-10');
  assert(result.posIndex['100,200,300'], 'POS index must include coordinate text');
  assert.strictEqual(result.matchedFacts.length, 1, 'one JSON fact should match');
  assert.strictEqual(result.rejectedFacts.length, 1, 'one JSON fact should reject');
  assert(result.diagnostics.some((item) => item.type === 'resolver-json-trace-index-stats'), 'index diagnostics expected');
  assert(result.supportConfigJson.includes('jsonTrace'), 'support config write-back must include jsonTrace');

  const inputXml = helper.runStandaloneResolverJsonTrace({ sourceKind: 'inputxml', sourceText: '<PIPINGELEMENT/>', stagedJsonText: jsonFixture(), supportConfigJson: '{}' });
  assert.strictEqual(inputXml.diagnostics[0].type, 'resolver-json-trace-inputxml-not-required', 'InputXML must not use XML resolver workflow');

  const baseState = stateApi.createXmlCiiAdaptedWorkflowState();
  const withResult = stateApi.applyStandaloneResolverJsonTraceResult(baseState, result);
  assert(withResult.supportConfigJson.includes('nodeAliases'), 'state write-back must include resolver aliases');
  assert(withResult.resolverJsonTraceWriteBackStatus.includes('saved'), 'state write-back status must be visible');

  const card = new TestElement('section');
  ui.renderStandaloneResolverJsonTracePanel(card, { ...withResult, sourceKind: 'xml' });
  for (const label of ['Resolver Index', 'JSON Config', 'JSON Resolved Data', 'PS → Node', 'POS → Node', 'Resolver Diagnostics']) {
    assert(card.textContent.includes(label), `Resolver panel missing ${label}`);
  }
  assert(card.textContent.includes('Build / refresh resolver index'), 'resolver panel must expose build action');
  assert(card.textContent.includes('Save to config'), 'resolver panel must expose save action');

  const inputXmlCard = new TestElement('section');
  ui.renderStandaloneResolverJsonTracePanel(inputXmlCard, { ...withResult, sourceKind: 'inputxml' });
  assert(inputXmlCard.textContent.includes('does not require XML resolver index'), 'InputXML mode must show optional state');

  const apiSource = fs.readFileSync(path.join(root, 'tabs/xml-cii-2019-standalone/xml-cii-workflow-api.js'), 'utf8');
  assert(apiSource.includes('export async function runXmlCii2019Workflow'), 'public workflow API boundary must remain exported');
  const uiSource = fs.readFileSync(path.join(root, 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-resolver-json-trace.js'), 'utf8');
  assert(!uiSource.includes('model-converters'), 'resolver UI must not use old Model Converters route tokens');

  console.log('XML CII standalone Resolver JSON Trace checks passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});