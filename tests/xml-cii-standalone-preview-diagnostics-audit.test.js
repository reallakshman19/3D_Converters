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
    'tabs/xml-cii-2019-standalone/xml-cii-preview-diagnostics-audit.js',
    'tabs/xml-cii-2019-standalone/xml-cii-regex-tester.js',
    'tabs/xml-cii-2019-standalone/xml-cii-resolver-json-trace.js',
    'tabs/xml-cii-2019-standalone/xml-cii-manual-element-sideload.js',
    'tabs/xml-cii-2019-standalone/xml-cii-workflow-source-detect.js',
    'tabs/xml-cii-2019-standalone/xml-cii-standalone-default-config.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-diagnostics-audit.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-state.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-dom.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-phase-registry.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-editable-preview-table.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-dryrun.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-filldown.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-renderer.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-resizable-table.js',
    'converters/xml-cii2019-core/branch-process-resolver.js',
    'converters/xml-cii2019-core/config.js',
    'converters/xml-cii2019-core/dtxr-resolver.js',
    'converters/xml-cii2019-core/dtxr-wall-thickness-resolver.js',
    'converters/xml-cii2019-core/line-density-resolver.js',
    'converters/xml-cii2019-core/linelist-mapping.js',
    'converters/xml-cii2019-core/piping-class-resolver.js',
    'converters/xml-cii2019-core/regex-line-key.js',
    'converters/xml-cii2019-core/service-process-fallback.js',
    'converters/xml-cii2019-core/support-mapping-config.js',
    'converters/xml-cii2019-core/weight-match-model.js',
    'converters/xml-cii2019-core/weight-valve-hints.js',
    'support/SupportKindResolver.js',
    'vendor/create-pipe-data-db.js',
  ];
}

function prepareEsmFixture() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'xml-cii-preview-audit-test-'));
  fs.writeFileSync(path.join(tempRoot, 'package.json'), '{"type":"module"}', 'utf8');
  for (const relPath of fixtureFiles()) copyFile(tempRoot, relPath);
  return tempRoot;
}

const { installMiniDom, MiniElement: TestElement } = require('./helpers/mini-dom.js');
installMiniDom();

function reportInput(sourceKind = 'xml') {
  return {
    sourceKind,
    sourceText: '<PipeStressExport/>',
    masterContext: {
      rowCounts: { lineList: 2, pipingClass: 1, materialMap: 1, weight: 1 },
      diagnostics: [{ type: 'master-ok', message: 'masters loaded', rows: 5 }],
    },
    regexTesterResult: {
      matchedRows: [{ branchName: '/A', lineKey: 'A', pipingClass: 'P1' }],
      rejectedRows: [{ branchName: '/BAD', status: 'REJECTED' }],
      diagnostics: [{ type: 'regex-ok', rows: 2 }],
    },
    resolverJsonTraceResult: {
      matchedFacts: [{ nodeKey: '10', hitCount: 1 }],
      rejectedFacts: [{ nodeKey: '99', hitCount: 0 }],
      diagnostics: [{ type: 'resolver-ok', rows: 2 }],
    },
    manualElementSideloadResult: {
      matchedFacts: [{ kind: 'NODE', key: '10', restraint: 'GUIDE' }],
      rejectedFacts: [{ kind: 'POS', key: 'bad' }],
      matchedSideLoadRows: [{ key: '10->20', fromNode: '10', toNode: '20' }],
      unmatchedSideLoadRows: [{ key: '99->100', fromNode: '99', toNode: '100' }],
      derivedRestraintPreview: [{ fromNode: '10', toNode: '20', typeCode: 14 }],
      diagnostics: [{ type: 'element-sideload-matched', rows: 1 }],
    },
    result: {
      enrichedText: '<enriched/>',
      ciiText: 'cii',
      diagnostics: [{ type: 'run-warning', level: 'warning', message: 'run warning' }],
    },
  };
}

(async () => {
  const tempRoot = prepareEsmFixture();
  const helper = await import(pathToFileURL(path.join(tempRoot, 'tabs/xml-cii-2019-standalone/xml-cii-preview-diagnostics-audit.js')).href);
  const ui = await import(pathToFileURL(path.join(tempRoot, 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-diagnostics-audit.js')).href);
  const stateApi = await import(pathToFileURL(path.join(tempRoot, 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-state.js')).href);

  const report = helper.buildStandalonePreviewDiagnosticsAudit(reportInput('xml'));
  assert.strictEqual(report.summary.sourceMode, 'xml', 'XML summary mode expected');
  assert.strictEqual(report.summary.regexMatched, 1, 'regex matched count expected');
  assert.strictEqual(report.summary.resolverRejected, 1, 'resolver rejected count expected');
  assert.strictEqual(report.summary.sideLoadMatched, 1, 'side-load matched count expected');
  assert(report.previewRows.some((row) => row.name === 'mode'), 'preview mode row expected');
  assert(report.changedFields.some((row) => row.field === 'enrichedText'), 'changed field row expected');
  assert(report.matchedFacts.length >= 4, 'matched fact rows expected');
  assert(report.rejectedFacts.length >= 3, 'rejected fact rows expected');
  assert(report.diagnostics.some((row) => row.source === 'regex'), 'regex diagnostics expected');
  assert(report.diagnostics.some((row) => row.source === 'side-load'), 'side-load diagnostics expected');
  assert(report.raw.result.enrichedText, 'raw report fallback expected');

  const inputReport = helper.buildStandalonePreviewDiagnosticsAudit(reportInput('inputxml'));
  assert.strictEqual(inputReport.summary.sourceMode, 'inputxml', 'InputXML summary mode expected');
  assert.strictEqual(inputReport.summary.sideLoadUnmatched, 1, 'InputXML side-load unmatched count expected');

  const withReport = stateApi.applyPreviewDiagnosticsAuditReport(stateApi.createXmlCiiAdaptedWorkflowState(), report);
  assert(withReport.previewDiagnosticsAuditStatus.includes('matched'), 'report status should mention matched count');

  // 'preview' phase now renders the live dry-run enrichment preview table (xmlCiiRenderPreviewPhase /
  // xmlCiiBuildAndRenderPreview) instead of the static audit summary; the audit data itself is still
  // rendered by the 'diagnostics' and 'matched-audit' phases exercised below.
  const previewCard = new TestElement('section');
  await ui.renderStandalonePreviewReportPanel(previewCard, { ...withReport, sourceText: reportInput().sourceText, result: reportInput().result });
  for (const label of ['4 Preview', 'Line List', 'Piping Class']) assert(previewCard.textContent.includes(label), `Preview panel missing ${label}`);

  const diagnosticsCard = new TestElement('section');
  ui.renderStandaloneDiagnosticsReportPanel(diagnosticsCard, withReport);
  for (const label of ['Diagnostic Audit Context', 'Errors & Warnings', 'Rules', 'Resolver', 'Export Audit Log', 'run warning']) {
    assert(diagnosticsCard.textContent.includes(label), `Diagnostics panel missing ${label}`);
  }

  const auditCard = new TestElement('section');
  ui.renderStandaloneMatchedAuditPanel(auditCard, withReport);
  for (const label of ['Matched Audit', 'Report Controls', 'Matched rows:', 'Rejected hidden:', 'Diagnostics rows:']) {
    assert(auditCard.textContent.includes(label), `Matched Audit panel missing ${label}`);
  }
  assert(auditCard.querySelector('[data-field="audit-search"]'), 'matched audit panel must expose a filter input');

  const registry = fs.readFileSync(path.join(root, 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-phase-registry.js'), 'utf8');
  assert(registry.includes(`id: 'matched-audit'`), 'phase registry must include Matched Audit');
  const apiSource = fs.readFileSync(path.join(root, 'tabs/xml-cii-2019-standalone/xml-cii-workflow-api.js'), 'utf8');
  assert(apiSource.includes('export async function runXmlCii2019Workflow'), 'public workflow API boundary must remain exported');
  const uiSource = fs.readFileSync(path.join(root, 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-diagnostics-audit.js'), 'utf8');
  assert(!uiSource.includes('model-converters'), 'audit UI must not use old Model Converters route tokens');

  console.log('XML CII standalone Preview Diagnostics Audit checks passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
