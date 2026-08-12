import { renderAivTopologyPathHtml } from './vibration-aiv-path-view.js';

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function fileStatus(file, fallback) {
  return file
    ? `<strong>${esc(file.name)}</strong><small>${esc(file.kind || fallback)}</small>`
    : `<span class="aivq-empty">${esc(fallback)}</span>`;
}

function issueList(groups) {
  const items = groups.flatMap((group) => Array.isArray(group) ? group : []);
  if (!items.length) return '<span class="aivq-empty">—</span>';
  return items.map((item) => `<div class="aivq-issue"><code>${esc(item.code)}</code><span>${esc(item.message)}</span></div>`).join('');
}

function readinessRows(state) {
  const rows = state.readinessEnvelope?.readiness?.rows ?? [];
  if (!rows.length) return '<tr><td colspan="10" class="aivq-empty-row">No AIV source-case rows have been checked.</td></tr>';
  return rows.map((row) => `<tr${state.selectedRowKey === row.rowKey ? ' class="is-selected"' : ''}>
    <td><button type="button" class="aivq-row-link" data-aiv-row="${esc(row.rowKey)}">${esc(row.sourceTag || row.sourceCanonicalId)}</button></td>
    <td>${esc(row.assessmentTag || row.assessmentCanonicalId)}</td>
    <td>${esc(row.caseId)}</td>
    <td>${esc(row.sourceDeviceType)}</td>
    <td>${esc(row.sourceState)}</td>
    <td>${esc(row.phase)}</td>
    <td>${esc(row.lowNoiseTrimState)}</td>
    <td>${esc(row.sonicState)}</td>
    <td><span class="aivq-status ${row.status === 'READY_FOR_QUALIFICATION' ? 'ok' : row.status === 'METHOD_GAP' ? 'gap' : 'bad'}">${esc(row.status)}</span></td>
    <td>${issueList([row.missing, row.invalid, row.methodGaps, row.warnings])}</td>
  </tr>`).join('');
}

function summary(state) {
  const readiness = state.readinessEnvelope?.readiness;
  if (!readiness) return '';
  const cards = [
    ['Rows', readiness.counts.rows],
    ['Ready for qualification', readiness.counts.readyForQualification],
    ['Method gap', readiness.counts.methodGap],
    ['Not ready', readiness.counts.notReady],
  ];
  return `<div class="aivq-readiness-summary">${cards.map(([label, value]) => `<div><small>${esc(label)}</small><strong>${esc(value)}</strong></div>`).join('')}</div>`;
}

function selectedPath(state) {
  const rows = state.readinessEnvelope?.readiness?.rows ?? [];
  const row = rows.find((item) => item.rowKey === state.selectedRowKey);
  if (!row) return '';
  return `<section class="aivq-card"><div class="aivq-section-head"><div><h4>Selected source → assessment evidence</h4><p>${esc(row.sourceTag || row.sourceCanonicalId)} · ${esc(row.caseId)} · ${esc(row.status)}</p></div></div>${renderAivTopologyPathHtml(row.topology)}</section>`;
}

export function renderAivReadinessPanelHtml(state = {}) {
  const checking = state.busy === true;
  const canCheck = Boolean(state.files?.topology && state.files?.sourceCases && !checking);
  const imports = state.readinessEnvelope?.imports;
  return `<section class="aivq-card">
    <div class="aivq-section-head"><div><h4>AIV data readiness</h4><p>Identity, process/device evidence and certified topology only. This action never calculates PWL, attenuation or LOF.</p></div></div>
    <div class="aivq-import-grid">
      <label class="aivq-file-field"><span>3D EDIT complete topology XLSX</span><input type="file" data-aiv-file="topology" accept=".xlsx"><span>${fileStatus(state.files?.topology, 'Five-sheet TopologyEditTableHumanExport.v1 XLSX required')}</span></label>
      <label class="aivq-file-field"><span>AIV source cases</span><input type="file" data-aiv-file="sourceCases" accept=".csv,text/csv"><span>${fileStatus(state.files?.sourceCases, 'AivSourceCaseCsv.v1')}</span></label>
    </div>
    <div class="aivq-actions">
      <button type="button" class="engineering-console-btn" data-aiv-action="source-case-template">Download AIV source-case template</button>
      <button type="button" class="engineering-console-btn primary" data-aiv-action="check-readiness"${canCheck ? '' : ' disabled'}>${checking ? 'Checking…' : 'Check AIV readiness'}</button>
    </div>
    ${state.error ? `<div class="aivq-error"><strong>Readiness check failed.</strong><span>${esc(state.error)}</span></div>` : ''}
    ${imports ? `<div class="aivq-import-facts"><span>Topology integrity <strong>${esc(imports.exchangeIntegrityStatus)}</strong></span><span>Source cases <strong>${esc(imports.sourceCaseCount)}</strong></span></div>` : ''}
    ${summary(state)}
    <div class="aivq-example-table"><table><thead><tr><th>Source</th><th>Assessment</th><th>Case</th><th>Device type</th><th>State</th><th>Phase</th><th>Trim</th><th>Sonic</th><th>Readiness</th><th>Issues / gaps</th></tr></thead><tbody>${readinessRows(state)}</tbody></table></div>
    <div class="aivq-readiness-note">READY_FOR_QUALIFICATION means the evidence row is structurally ready for continued method qualification only. Numerical execution remains blocked.</div>
  </section>${selectedPath(state)}`;
}
