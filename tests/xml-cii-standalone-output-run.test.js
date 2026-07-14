const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { createStaticEsmFixture } = require('./xml-cii-standalone-esm-fixture-helper');

const root = path.resolve(__dirname, '..');

function prepareEsmFixture() {
  return createStaticEsmFixture(root, {
    prefix: 'xml-cii-output-run-test-',
    entryFiles: [
      'tabs/xml-cii-2019-standalone/xml-cii-output-run-readiness.js',
      'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-output-run.js',
      'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-state.js',
    ],
  }).tempRoot;
}

class TestElement {
  constructor(tag) {
    this.tagName = tag;
    this.children = [];
    this.dataset = {};
    this.className = '';
    this.attributes = {};
    this.value = '';
    this.disabled = false;
    this.style = {};
    this._text = '';
  }
  appendChild(child) { this.children.push(child); return child; }
  append(...items) { for (const item of items) this.children.push(item); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  addEventListener() {}
  removeEventListener() {}
  get textContent() { return `${this._text}${this.children.map((child) => typeof child === 'string' ? child : child.textContent || '').join('')}`; }
  set textContent(value) { this._text = String(value ?? ''); }
}

globalThis.document = { createElement: (tag) => new TestElement(tag) };

function readyXmlState() {
  return {
    sourceKind: 'xml', sourceText: '<PipeStressExport></PipeStressExport>', options: { outputMode: 'both' }, supportConfigJson: '{}',
    masterContext: { rowCounts: { lineList: 1, pipingClass: 2, materialMap: 3, weight: 4 } },
    regexTesterResult: { summary: { matchedCount: 4, rejectedCount: 1 } },
    resolverJsonTraceResult: { summary: { matchedFacts: 3, rejectedFacts: 1 } },
    manualElementSideloadResult: { summary: { matchedRows: 2, rejectedRows: 1 } },
    previewDiagnosticsAuditReport: { summary: { matchedFacts: 5, rejectedFacts: 2 } },
    weightMatchResult: { issueRows: [{ id: 'w1' }], finalizedRows: [{ id: 'f1' }] },
    supportTypeMapperResult: { previewRows: [{ id: 's1' }], diagnostics: [] }, supportTypeMapperStatus: 'Support Type Mapper saved into standalone config.',
    result: { ok: true, enrichedText: '<x/>', enrichedName: 'out.xml', ciiText: 'CII', ciiName: 'out.cii', diagnostics: { elementCount: 1 }, logs: ['run complete'] },
  };
}

(async () => {
  const tempRoot = prepareEsmFixture();
  const helper = await import(pathToFileURL(path.join(tempRoot, 'tabs/xml-cii-2019-standalone/xml-cii-output-run-readiness.js')).href);
  const ui = await import(pathToFileURL(path.join(tempRoot, 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-output-run.js')).href);
  const stateApi = await import(pathToFileURL(path.join(tempRoot, 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-state.js')).href);

  const xmlReport = helper.buildStandaloneOutputRunReadiness(readyXmlState());
  assert.strictEqual(xmlReport.summary.sourceMode, 'xml', 'XML source mode expected');
  assert.strictEqual(xmlReport.summary.blockingCount, 0, 'ready XML state should have no blocking rows');
  assert(xmlReport.checklistRows.some((row) => row.id === 'regex'), 'XML checklist must include regex');
  assert(xmlReport.checklistRows.some((row) => row.id === 'resolver-json'), 'XML checklist must include resolver');
  assert(!xmlReport.checklistRows.some((row) => row.id === 'inputxml-side-load'), 'XML checklist must not require InputXML side-load');
  assert(xmlReport.artifactRows.find((row) => row.kind === 'enriched').available, 'enriched artifact expected');
  assert(xmlReport.artifactRows.find((row) => row.kind === 'cii').available, 'CII artifact expected');
  assert(xmlReport.artifactRows.find((row) => row.kind === 'diagnostics').available, 'diagnostics artifact expected');
  assert(xmlReport.artifactRows.find((row) => row.kind === 'manifest').available, 'manifest artifact expected');
  assert.strictEqual(xmlReport.manifest.masterRowCounts.weight, 4, 'master row counts expected in manifest');
  assert.strictEqual(xmlReport.manifest.supportMapper.previewRows, 1, 'support mapper count expected');
  assert(xmlReport.logRows.some((row) => row.message === 'run complete'), 'run log should be normalized');

  const inputReport = helper.buildStandaloneOutputRunReadiness({ ...readyXmlState(), sourceKind: 'inputxml', sourceText: '<CAESARII XML_TYPE="Input"><PIPINGMODEL/></CAESARII>', elementSideLoadText: 'DTXR_POS=Pipe Rest', regexTesterResult: null, resolverJsonTraceResult: null });
  assert.strictEqual(inputReport.summary.sourceMode, 'inputxml', 'InputXML source mode expected');
  assert(inputReport.checklistRows.some((row) => row.id === 'inputxml-side-load'), 'InputXML checklist must include side-load status');
  assert(!inputReport.checklistRows.some((row) => row.id === 'regex'), 'InputXML checklist must not require XML regex');

  const blocked = helper.buildStandaloneOutputRunReadiness({ sourceKind: 'xml', sourceText: '', options: {}, supportConfigJson: '{bad' });
  assert(blocked.summary.blockingCount >= 2, 'blocking rows expected for missing source/config');
  assert(blocked.diagnostics.some((row) => row.level === 'error'), 'blocking diagnostics expected');

  const state = stateApi.applyStandaloneOutputRunReadiness(stateApi.createXmlCiiAdaptedWorkflowState(), xmlReport);
  assert(state.outputRunReadinessStatus.includes('0 blocking'), 'state readiness status expected');

  const card = new TestElement('section');
  ui.renderStandaloneOutputRunPanel(card, state);
  for (const label of ['Pre-run Checklist', 'Run Conversion', 'Output Artifacts / Downloads', 'Logs', 'Run Manifest', 'Raw JSON advanced/debug']) {
    assert(card.textContent.includes(label), `Output / Run panel missing ${label}`);
  }
  assert(card.textContent.includes('Refresh readiness / checklist'), 'refresh action expected');
  assert(card.textContent.includes('Finalise and Run Conversion'), 'run action expected');
  assert(card.textContent.includes('Download Enriched XML/InputXML'), 'download buttons expected');

  const coreSource = fs.readFileSync(path.join(root, 'tabs/xml-cii-2019-standalone/xml-cii-output-run-readiness.js'), 'utf8');
  for (const token of ['document', 'querySelector', 'createElement', 'window']) assert(!coreSource.includes(token), `output readiness helper must remain DOM-free: ${token}`);
  const eventsSource = fs.readFileSync(path.join(root, 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events.js'), 'utf8');
  assert(eventsSource.includes('buildStandaloneOutputRunReadiness'), 'events must call readiness helper');
  const runWorkflowSource = fs.readFileSync(path.join(root, 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-run-workflow.js'), 'utf8');
  assert(runWorkflowSource.includes('runXmlCii2019Workflow(await buildXmlCiiWorkflowJobFromUiState'), 'final run must use public workflow API boundary');
  const workflowSource = fs.readFileSync(path.join(root, '.github/workflows/xml-cii-standalone-mission01.yml'), 'utf8');
  assert(workflowSource.includes('xml-cii-standalone-output-run.test.js'), 'mission workflow must run output run checks');

  console.log('XML CII standalone Output / Run checks passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
