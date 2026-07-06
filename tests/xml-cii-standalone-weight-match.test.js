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
    'tabs/xml-cii-2019-standalone/xml-cii-weight-match.js',
    'tabs/xml-cii-2019-standalone/xml-cii-regex-tester.js',
    'tabs/xml-cii-2019-standalone/xml-cii-resolver-json-trace.js',
    'tabs/xml-cii-2019-standalone/xml-cii-manual-element-sideload.js',
    'tabs/xml-cii-2019-standalone/xml-cii-workflow-source-detect.js',
    'tabs/xml-cii-2019-standalone/xml-cii-standalone-default-config.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-weight-match.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-state.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-dom.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-phase-registry.js',
  ];
}

function prepareEsmFixture() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'xml-cii-weight-match-test-'));
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

function masterContext() {
  return {
    weightMasterRows: [
      { id: 'candidate-good', componentType: 'VALVE', bore: '10', rating: '900', length: '250', weight: '125' },
      { id: 'candidate-other', componentType: 'FLANGE', bore: '8', rating: '150', length: '100', weight: '45' },
    ],
  };
}

function componentRows() {
  return [
    { id: 'issue-valve', componentType: 'VALVE', bore: '10', rating: '900', length: '250', weight: '0' },
    { id: 'ok-valve', componentType: 'VALVE', bore: '10', rating: '900', length: '250', weight: '125' },
    { id: 'missing-flange', componentType: 'FLANGE', bore: '8', rating: '150', length: '100' },
  ];
}

(async () => {
  const tempRoot = prepareEsmFixture();
  const helper = await import(pathToFileURL(path.join(tempRoot, 'tabs/xml-cii-2019-standalone/xml-cii-weight-match.js')).href);
  const ui = await import(pathToFileURL(path.join(tempRoot, 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-weight-match.js')).href);
  const stateApi = await import(pathToFileURL(path.join(tempRoot, 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-state.js')).href);

  const result = helper.runStandaloneWeightMatch({ sourceKind: 'xml', masterContext: masterContext(), componentRows: componentRows(), supportConfigJson: '{}' });
  assert.strictEqual(result.summary.sourceMode, 'xml', 'XML source mode expected');
  assert.strictEqual(result.issueRows.length, 2, 'zero and missing weight issues expected');
  assert(result.candidateRows.some((row) => row.issueId === 'issue-valve' && row.candidateId === 'candidate-good'), 'candidate match expected');
  const scored = result.candidateRows.find((row) => row.issueId === 'issue-valve' && row.candidateId === 'candidate-good');
  assert.strictEqual(scored.boreScore, 25, 'bore score expected');
  assert.strictEqual(scored.ratingScore, 25, 'rating score expected');
  assert.strictEqual(scored.lengthScore, 25, 'length score expected');
  assert.strictEqual(scored.componentTypeScore, 25, 'component/type score expected');
  assert.strictEqual(scored.candidateWeight, 125, 'candidate weight expected');
  assert.strictEqual(result.finalizedRows.find((row) => row.issueId === 'issue-valve').finalizedWeight, 125, 'best candidate should finalize by default');
  assert(result.diagnostics.some((row) => row.type === 'zero-missing-weight-issues'), 'weight diagnostics expected');
  assert(result.supportConfigJson.includes('finalizedMatches'), 'support config must serialize finalized weight config');

  const override = helper.runStandaloneWeightMatch({ sourceKind: 'inputxml', masterContext: masterContext(), componentRows: componentRows(), weightMatchOverridesJson: JSON.stringify({ 'issue-valve': 'candidate-other' }), supportConfigJson: '{}' });
  assert.strictEqual(override.summary.sourceMode, 'inputxml', 'InputXML source mode expected');
  assert.strictEqual(override.finalizedRows.find((row) => row.issueId === 'issue-valve').selectedCandidateId, 'candidate-other', 'operator override must select requested candidate');
  assert(override.finalizedRows.find((row) => row.issueId === 'issue-valve').overrideApplied, 'override flag expected');

  const withResult = stateApi.applyStandaloneWeightMatchResult(stateApi.createXmlCiiAdaptedWorkflowState(), result, true);
  assert(withResult.supportConfigJson.includes('finalizedMatches'), 'state finalize must write support config');
  assert(withResult.weightMatchStatus.includes('finalized'), 'finalize status expected');

  const card = new TestElement('section');
  ui.renderStandaloneWeightMatchPanel(card, { ...withResult, weightMatchOverridesJson: '{}' });
  for (const label of ['Zero / Missing Weight Issues', 'Candidate Matches', 'Bore / Rating / Length Scoring', 'Overrides', 'Finalize Weight Match', 'Weight Diagnostics', 'Raw JSON']) {
    assert(card.textContent.includes(label), `Weight Match panel missing ${label}`);
  }
  assert(card.textContent.includes('Build / refresh weight match report'), 'build action expected');
  assert(card.textContent.includes('Finalize weight match'), 'finalize action expected');

  const registry = fs.readFileSync(path.join(root, 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-phase-registry.js'), 'utf8');
  assert(registry.includes('9 Weight Match'), 'phase registry must expose 9 Weight Match');
  assert(registry.includes('5A Weight Match'), 'existing static label token must remain present');
  const apiSource = fs.readFileSync(path.join(root, 'tabs/xml-cii-2019-standalone/xml-cii-workflow-api.js'), 'utf8');
  assert(apiSource.includes('export async function runXmlCii2019Workflow'), 'public workflow API boundary must remain exported');
  const uiSource = fs.readFileSync(path.join(root, 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-weight-match.js'), 'utf8');
  assert(!uiSource.includes('model-converters'), 'weight match UI must not use old Model Converters route tokens');

  console.log('XML CII standalone Weight Match checks passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
