import { buildStandaloneOutputRunReadiness } from '../xml-cii-output-run-readiness.js';
import { createElement, createOption } from './xml-cii-adapted-dom.js';

function rows(value) { return Array.isArray(value) ? value : []; }
function text(value) { return String(value ?? ''); }

function section(parent, title) {
  const el = createElement('section', '', 'xml-cii-weight-panel');
  el.appendChild(createElement('h3', title));
  parent.appendChild(el);
  return el;
}

function button(action, label, disabled = false) {
  const el = createElement('button', label);
  el.type = 'button';
  el.dataset.action = action;
  el.disabled = !!disabled;
  return el;
}

function table(headers, data, emptyText) {
  if (!data.length) return createElement('div', emptyText, 'xml-cii-phase-help');
  const el = createElement('table', '', 'xml-cii-weight-table');
  const head = createElement('thead');
  const hr = createElement('tr');
  for (const header of headers) hr.appendChild(createElement('th', header));
  head.appendChild(hr);
  el.append(head, tableBody(headers, data));
  return el;
}

function tableBody(headers, data) {
  const body = createElement('tbody');
  for (const item of data.slice(0, 80)) {
    const tr = createElement('tr');
    for (const header of headers) tr.appendChild(createElement('td', text(valueFor(item, header))));
    body.appendChild(tr);
  }
  return body;
}

function valueFor(item, header) {
  const key = { ID: 'id', Label: 'label', Status: 'status', Severity: 'severity', Blocking: 'blocking', Message: 'message', Kind: 'kind', Artifact: 'label', Available: 'available', Filename: 'filename', Bytes: 'bytes', Level: 'level', Source: 'source' }[header] || header;
  return item?.[key];
}

function reportFromState(state) {
  return state.outputRunReadinessReport || buildStandaloneOutputRunReadiness(state);
}

function renderSummary(parent, report) {
  const panel = section(parent, 'Pre-run Summary');
  panel.appendChild(table(['Source', 'Status', 'Message'], [
    { Source: 'source mode', Status: report.summary.sourceMode, Message: `${report.summary.blockingCount} blocking items` },
    { Source: 'artifacts', Status: report.summary.artifactCount, Message: 'available artifacts' },
  ], 'No readiness summary yet.'));
}

function renderChecklist(parent, report) {
  const panel = section(parent, 'Pre-run Checklist');
  panel.appendChild(table(['ID', 'Label', 'Status', 'Severity', 'Blocking', 'Message'], rows(report.checklistRows), 'No checklist rows yet.'));
}

function renderControls(parent, state, report) {
  const panel = section(parent, 'Run Conversion');
  const select = createElement('select');
  select.dataset.field = 'output-mode';
  for (const mode of ['enriched-only', 'cii-only', 'both']) select.appendChild(createOption(mode, mode, state.options?.outputMode === mode));
  panel.append(createElement('label', 'Output mode '), select);
  panel.append(button('refresh-output-run', 'Refresh readiness / checklist'));
  panel.append(button('run', state.running ? 'Running…' : 'Run standalone workflow', state.running || report.summary.blockingCount > 0));
  panel.append(button('clear', 'Clear/reset'));
}

function renderArtifacts(parent, report) {
  const panel = section(parent, 'Output Artifacts / Downloads');
  panel.appendChild(table(['Kind', 'Artifact', 'Available', 'Filename', 'Bytes'], rows(report.artifactRows), 'No artifact rows yet.'));
  for (const row of rows(report.artifactRows)) panel.append(button(row.downloadAction || `download-${row.kind}`, `Download ${row.label}`, !row.available));
}

function renderLogs(parent, report) {
  const panel = section(parent, 'Logs');
  panel.appendChild(table(['Level', 'Source', 'Message'], rows(report.logRows), 'No logs yet.'));
}

function renderManifest(parent, report) {
  const panel = section(parent, 'Run Manifest');
  panel.appendChild(createElement('pre', JSON.stringify(report.manifest || {}, null, 2)));
}

function renderRaw(parent, report) {
  const details = createElement('details', '', 'xml-cii-weight-panel');
  details.appendChild(createElement('summary', 'Raw JSON advanced/debug'));
  details.appendChild(createElement('pre', JSON.stringify(report.raw || {}, null, 2)));
  parent.appendChild(details);
}

export function renderStandaloneOutputRunPanel(card, state) {
  const report = reportFromState(state);
  card.appendChild(createElement('p', 'Review readiness, run through runXmlCii2019Workflow(job, runtime), inspect artifacts, logs, downloads, and deterministic run manifest.', 'xml-cii-phase-help'));
  renderSummary(card, report);
  renderChecklist(card, report);
  renderControls(card, state, report);
  renderArtifacts(card, report);
  renderLogs(card, report);
  renderManifest(card, report);
  renderRaw(card, report);
}
