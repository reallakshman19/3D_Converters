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
    'tabs/xml-cii-2019-standalone/xml-cii-regex-tester.js',
    'tabs/xml-cii-2019-standalone/xml-cii-resolver-json-trace.js',
    'tabs/xml-cii-2019-standalone/xml-cii-manual-element-sideload.js',
    'tabs/xml-cii-2019-standalone/xml-cii-workflow-source-detect.js',
    'tabs/xml-cii-2019-standalone/xml-cii-workflow-api.js',
    'tabs/xml-cii-2019-standalone/xml-cii-workflow-types.js',
    'tabs/xml-cii-2019-standalone/xml-cii-workflow-service.js',
    'tabs/xml-cii-2019-standalone/xml-cii-workflow-engine-client.js',
    'tabs/xml-cii-2019-standalone/xml-cii-inputxml-enrichment.js',
    'tabs/xml-cii-2019-standalone/xml-cii-standalone-default-config.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-regex-tester.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-state.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-dom.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-phase-registry.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-regex-results.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-regex-rating.js',
  ];
}

function prepareEsmFixture() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'xml-cii-regex-test-'));
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
    this.type = '';
    this.value = '';
    this._text = '';
    this.style = {};
    this.classList = {
      toggle: (name, cond) => {
        const classes = new Set(this.className.split(' ').filter(Boolean));
        if (cond === undefined) {
          if (classes.has(name)) classes.delete(name);
          else classes.add(name);
        } else {
          if (cond) classes.add(name);
          else classes.delete(name);
        }
        this.className = [...classes].join(' ');
      }
    };
  }
  appendChild(child) { this.children.push(child); return child; }
  append(...items) { for (const item of items) this.children.push(item); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  addEventListener(event, callback) {
    if (!this._listeners) this._listeners = {};
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(callback);
  }
  get textContent() { return `${this._text}${this.children.map((c) => typeof c === 'string' ? c : c.textContent || '').join('')}`; }
  set textContent(value) { this._text = String(value ?? ''); }
}

globalThis.document = { createElement: (tag) => new TestElement(tag) };
globalThis.DOMParser = class {
  parseFromString(sourceText) {
    const rows = [];
    sourceText.replace(/<Branchname\b[^>]*>([\s\S]*?)<\/Branchname>/gi, (_, val) => {
      // Decode XML entities (e.g. &quot; -> ")
      const decoded = val.trim().replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
      rows.push({ localName: 'branchname', textContent: decoded });
    });
    sourceText.replace(/<Branch\b([^>]*?)>/gi, (_, attrs) => {
      const match = attrs.match(/name\s*=\s*["']([^"']+)["']/i);
      if (match) rows.push({ localName: 'branch', getAttribute: (name) => name.toLowerCase() === 'name' ? match[1] : null, children: [] });
    });
    return {
      querySelector: () => null,
      querySelectorAll: () => rows
    };
  }
};

function xmlFixture() {
  return `<?xml version="1.0"?>
<PipeStressExport>
  <Branch><Branchname>/ASIM-1885-10&quot;-S8810101-91261M7-900-HC/B1</Branchname></Branch>
  <Branch><Branchname>/BAD-BRANCH</Branchname></Branch>
</PipeStressExport>`;
}

function testerConfig() {
  return {
    tokenDelimiter: '-',
    lineKey: { regex: '(S\\d+)', group: 1, tokenPosition: 4 },
    pipingClass: { regex: '-(\\d{5}[A-Z0-9]*)-', group: 1, tokenPosition: 5 },
    rating: { regex: '-(\\d{3})-HC', group: 1, tokenPosition: 6 },
    bore: { regex: '-(\\d+)"-', group: 1, tokenPosition: 3 },
  };
}

(async () => {
  const tempRoot = prepareEsmFixture();
  const helper = await import(pathToFileURL(path.join(tempRoot, 'tabs/xml-cii-2019-standalone/xml-cii-regex-tester.js')).href);
  const ui = await import(pathToFileURL(path.join(tempRoot, 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-regex-tester.js')).href);
  const stateApi = await import(pathToFileURL(path.join(tempRoot, 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-state.js')).href);
  const workflowApi = await import(pathToFileURL(path.join(tempRoot, 'tabs/xml-cii-2019-standalone/xml-cii-workflow-api.js')).href);

  const result = helper.runStandaloneRegexTester({ sourceKind: 'xml', sourceText: xmlFixture(), extractionConfig: testerConfig(), supportConfigJson: '{}' });
  assert.strictEqual(result.branchSamples.length, 2, 'two XML branch samples expected');
  assert.strictEqual(result.matchedRows.length, 1, 'one matched row expected');
  assert.strictEqual(result.rejectedRows.length, 1, 'one rejected row expected');
  assert.strictEqual(result.matchedRows[0].lineKey, 'S8810101', 'line key must extract by regex');
  assert.strictEqual(result.matchedRows[0].pipingClass, '91261M7', 'piping class must extract by regex');
  assert.strictEqual(result.matchedRows[0].rating, '900', 'rating must extract by regex');
  assert.strictEqual(result.matchedRows[0].bore, '10', 'bore must extract by regex');
  assert(result.supportConfigJson.includes('regexTester'), 'saved support config must include regexTester section');
  assert(Array.isArray(result.diagnostics), 'diagnostics must be an array');

  const fallback = helper.runStandaloneRegexTester({ sourceKind: 'xml', sourceText: xmlFixture(), extractionConfig: { tokenDelimiter: '-', lineKey: { tokenPosition: 4 }, pipingClass: { tokenPosition: 5 }, rating: { tokenPosition: 6 }, bore: { tokenPosition: 3 } }, supportConfigJson: '{}' });
  assert.strictEqual(fallback.matchedRows[0].lineKey, 'S8810101', 'line key must extract by token fallback');
  assert.strictEqual(fallback.matchedRows[0].pipingClass, '91261M7', 'piping class must extract by token fallback');

  const inputXml = helper.runStandaloneRegexTester({ sourceKind: 'inputxml', sourceText: '<PIPINGELEMENT/>', extractionConfig: testerConfig(), supportConfigJson: '{}' });
  assert.strictEqual(inputXml.branchSamples.length, 0, 'InputXML must not be forced through XML branch regex');
  assert.strictEqual(inputXml.diagnostics[0].type, 'regex-tester-inputxml-not-required', 'InputXML not-required diagnostic expected');

  const baseState = stateApi.createXmlCiiAdaptedWorkflowState();
  const withResult = stateApi.applyStandaloneRegexTesterResult(baseState, result);
  assert(withResult.supportConfigJson.includes('branchNameRegex'), 'state write-back must include branch regex config');
  assert(withResult.regexTesterWriteBackStatus.includes('saved'), 'state write-back status must be visible');

  const card = new TestElement('section');
  ui.renderStandaloneRegexTesterPanel(card, { ...withResult, sourceKind: 'xml' });
  for (const label of ['Interactive Click-to-Map Token Builder', 'Line key extraction', 'Piping class extraction', 'Rating extraction', 'Bore / size extraction', 'Samples']) {
    assert(card.textContent.includes(label), `Regex Tester panel missing ${label}`);
  }
  assert(card.textContent.includes('Run Extraction'), 'Regex Tester panel must expose run extraction action');
  assert(card.textContent.includes('Save Config'), 'Regex Tester panel must expose save action');

  const inputXmlCard = new TestElement('section');
  ui.renderStandaloneRegexTesterPanel(inputXmlCard, { ...withResult, sourceKind: 'inputxml' });
  assert(inputXmlCard.textContent.includes('does not require XML Branchname regex extraction'), 'InputXML mode must show not-required state');

  assert.strictEqual(typeof workflowApi.runXmlCii2019Workflow, 'function', 'public workflow API boundary must remain exported');
  const uiSource = fs.readFileSync(path.join(root, 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-regex-tester.js'), 'utf8');
  assert(!uiSource.includes('model-converters'), 'Regex Tester UI must not use old Model Converters route tokens');

  console.log('XML CII standalone Regex Tester checks passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});