import { createElement } from './xml-cii-adapted-dom.js';

function rows(value) { return Array.isArray(value) ? value : []; }
function text(value) { return String(value ?? ''); }

function actionButton() {
  const button = createElement('button', 'Build / refresh preview report');
  button.type = 'button';
  button.dataset.action = 'build-preview-audit';
  return button;
}

function table(headers, data, emptyText) {
  if (!data.length) return createElement('div', emptyText, 'xml-cii-phase-help');
  const tableEl = createElement('table', '', 'xml-cii-audit-table');
  const head = createElement('thead');
  const hr = createElement('tr');
  for (const header of headers) hr.appendChild(createElement('th', header));
  head.appendChild(hr);
  tableEl.append(head, tableBody(headers, data));
  return tableEl;
}

function tableBody(headers, data) {
  const body = createElement('tbody');
  for (const item of data.slice(0, 50)) {
    const tr = createElement('tr');
    for (const header of headers) tr.appendChild(createElement('td', cell(item, header)));
    body.appendChild(tr);
  }
  return body;
}

function cell(item, header) {
  const key = {
    Section: 'section', Name: 'name', Value: 'value', Source: 'source', Field: 'field', Before: 'before', After: 'after', Message: 'message', Key: 'key', Detail: 'detail', Level: 'level', Type: 'type', Rows: 'rows'
  }[header] || header;
  const value = item?.[key];
  return typeof value === 'object' && value ? JSON.stringify(value) : text(value);
}

function renderActions(parent, state) {
  const panel = createElement('section', '', 'xml-cii-audit-panel');
  panel.append(createElement('h3', 'Report Controls'), actionButton(), createElement('span', state.previewDiagnosticsAuditStatus || 'Preview report not built yet.', 'xml-cii-phase-help'));
  parent.appendChild(panel);
}

function renderSummary(parent, report) {
  const summary = report?.summary || {};
  const data = Object.entries(summary).map(([name, value]) => ({ section: 'summary', name, value: typeof value === 'object' ? JSON.stringify(value) : value }));
  const panel = createElement('section', '', 'xml-cii-audit-panel');
  panel.appendChild(createElement('h3', 'Latest Run State'));
  panel.appendChild(table(['Section', 'Name', 'Value'], data, 'No summary yet.'));
  parent.appendChild(panel);
}

function renderPreview(parent, report) {
  const panel = createElement('section', '', 'xml-cii-audit-panel');
  panel.appendChild(createElement('h3', 'Enrichment Preview'));
  panel.appendChild(table(['Section', 'Name', 'Value'], rows(report?.previewRows), 'No preview rows yet.'));
  parent.appendChild(panel);
}

function renderChanged(parent, report) {
  const panel = createElement('section', '', 'xml-cii-audit-panel');
  panel.appendChild(createElement('h3', 'Changed Fields'));
  panel.appendChild(table(['Source', 'Field', 'Before', 'After', 'Message'], rows(report?.changedFields), 'No changed fields available.'));
  parent.appendChild(panel);
}

function renderMatched(parent, report) {
  const panel = createElement('section', '', 'xml-cii-audit-panel');
  panel.appendChild(createElement('h3', 'Matched Facts'));
  panel.appendChild(table(['Source', 'Key', 'Detail'], rows(report?.matchedFacts), 'No matched facts yet.'));
  parent.appendChild(panel);
}

function renderRejected(parent, report) {
  const panel = createElement('section', '', 'xml-cii-audit-panel');
  panel.appendChild(createElement('h3', 'Rejected Facts'));
  panel.appendChild(table(['Source', 'Key', 'Detail'], rows(report?.rejectedFacts), 'No rejected facts yet.'));
  parent.appendChild(panel);
}

function renderDiagnostics(parent, report, title = 'Run Diagnostics') {
  const panel = createElement('section', '', 'xml-cii-audit-panel');
  panel.appendChild(createElement('h3', title));
  panel.appendChild(table(['Level', 'Source', 'Type', 'Message', 'Rows'], rows(report?.diagnostics), 'No diagnostics yet.'));
  parent.appendChild(panel);
}

function renderOutput(parent, state) {
  const panel = createElement('section', '', 'xml-cii-audit-panel');
  panel.appendChild(createElement('h3', 'Output Preview'));
  const text = createElement('pre', (state.result?.enrichedText || state.result?.ciiText || 'No workflow output yet.').slice(0, 4000));
  panel.appendChild(text);
  parent.appendChild(panel);
}

function renderRaw(parent, report) {
  const details = createElement('details', '', 'xml-cii-audit-panel');
  details.appendChild(createElement('summary', 'Raw JSON'));
  details.appendChild(createElement('pre', JSON.stringify(report || {}, null, 2)));
  parent.appendChild(details);
}

export function renderStandalonePreviewReportPanel(card, state) {
  renderActions(card, state);
  renderSummary(card, state.previewDiagnosticsAuditReport);
  renderPreview(card, state.previewDiagnosticsAuditReport);
  renderChanged(card, state.previewDiagnosticsAuditReport);
  renderMatched(card, state.previewDiagnosticsAuditReport);
  renderRejected(card, state.previewDiagnosticsAuditReport);
  renderOutput(card, state);
  renderRaw(card, state.previewDiagnosticsAuditReport);
}

export function renderStandaloneDiagnosticsReportPanel(card, state) {
  renderActions(card, state);
  renderDiagnostics(card, state.previewDiagnosticsAuditReport, 'Run Diagnostics');
  renderDiagnostics(card, { diagnostics: rows(state.previewDiagnosticsAuditReport?.diagnostics).filter((row) => row.source === 'masters') }, 'Master Diagnostics');
  renderDiagnostics(card, { diagnostics: rows(state.previewDiagnosticsAuditReport?.diagnostics).filter((row) => row.source === 'regex') }, 'Regex Diagnostics');
  renderDiagnostics(card, { diagnostics: rows(state.previewDiagnosticsAuditReport?.diagnostics).filter((row) => row.source === 'resolver') }, 'Resolver Diagnostics');
  renderDiagnostics(card, { diagnostics: rows(state.previewDiagnosticsAuditReport?.diagnostics).filter((row) => row.source === 'side-load') }, 'Side-load Diagnostics');
  renderDiagnostics(card, { diagnostics: rows(state.previewDiagnosticsAuditReport?.diagnostics).filter((row) => ['warn', 'warning', 'error'].includes(String(row.level).toLowerCase())) }, 'Warnings / Errors');
  renderRaw(card, state.previewDiagnosticsAuditReport);
}

export function renderStandaloneMatchedAuditPanel(card, state) {
  renderActions(card, state);
  const search = createElement('input');
  search.placeholder = 'Filter / Search';
  search.dataset.field = 'audit-search';
  card.append(createElement('h3', 'Filter / Search'), search);
  card.appendChild(createElement('h3', 'Load Diagnostics JSON'));
  card.appendChild(createElement('p', 'Use the report builder to load the latest standalone run state into this audit view.', 'xml-cii-phase-help'));
  renderSummary(card, state.previewDiagnosticsAuditReport);
  renderMatched(card, state.previewDiagnosticsAuditReport);
  renderRejected(card, state.previewDiagnosticsAuditReport);
}
