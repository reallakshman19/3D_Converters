import { renderAivTopologyPathHtml } from './vibration-aiv-path-view.js';

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function issueList(groups) {
  const items = groups.flatMap((group) => Array.isArray(group) ? group : []);
  if (!items.length) return '<span class="aivq-empty">—</span>';
  return items.map((item) => `<div class="aivq-issue"><code>${esc(item.code)}</code><span>${esc(item.message)}</span></div>`).join('');
}

function statusKind(status) {
  if (status === 'READY_FOR_QUALIFICATION' || status === 'NOT_APPLICABLE') return 'ok';
  if (status === 'METHOD_GAP') return 'gap';
  return 'bad';
}

function distanceCell(row) {
  if (!row.physicalDistance) return '<span class="aivq-empty">—</span>';
  return `${esc(row.physicalDistance.value)} ${esc(row.physicalDistance.unit)}`;
}

function readinessRows(state) {
  const rows = state.readinessEnvelope?.readiness?.rows ?? [];
  if (!rows.length) return '<tr><td colspan="13" class="aivq-empty-row">No source→assessment relationships have been checked.</td></tr>';
  return rows.map((row) => `<tr${state.selectedRowKey === row.rowKey ? ' class="is-selected"' : ''}>
    <td><button type="button" class="aivq-row-link" data-aiv-row="${esc(row.rowKey)}">${esc(row.sourceTag || row.sourceCanonicalId)}</button></td>
    <td>${esc(row.assessmentTag || row.assessmentCanonicalId)}</td>
    <td>${esc(row.caseId)}</td>
    <td>${esc(row.sourceDeviceType ?? '—')}</td>
    <td>${esc(row.sourceState ?? '—')}</td>
    <td>${esc(row.assessmentType ?? '—')}</td>
    <td>${esc(row.applicabilityDisposition)}</td>
    <td>${distanceCell(row)}</td>
    <td>${esc(row.simultaneousSourceGroup ?? '—')}</td>
    <td>${esc(row.phase ?? '—')}</td>
    <td>${esc(row.lowNoiseTrimState ?? '—')}</td>
    <td><span class="aivq-status ${statusKind(row.status)}">${esc(row.status)}</span></td>
    <td>${issueList([row.missing, row.invalid, row.methodGaps, row.warnings])}</td>
  </tr>`).join('');
}

function summary(state) {
  const readiness = state.readinessEnvelope?.readiness;
  if (!readiness) return '';
  const cards = [
    ['Relationships', readiness.counts.rows],
    ['Ready', readiness.counts.readyForQualification],
    ['Method gap', readiness.counts.methodGap],
    ['Not ready', readiness.counts.notReady],
    ['Not applicable', readiness.counts.notApplicable],
  ];
  return `<div class="aivq-readiness-summary">${cards.map(([label, value]) => `<div><small>${esc(label)}</small><strong>${esc(value)}</strong></div>`).join('')}</div>`;
}

function selectedPath(state) {
  const rows = state.readinessEnvelope?.readiness?.rows ?? [];
  const row = rows.find((item) => item.rowKey === state.selectedRowKey);
  if (!row) return '';
  const relationship = row.relationshipTrace;
  return `<section class="aivq-card"><div class="aivq-section-head"><div><h4>Selected source → assessment evidence</h4><p>${esc(row.sourceTag || row.sourceCanonicalId)} → ${esc(row.assessmentTag || row.assessmentCanonicalId)} · ${esc(row.caseId)} · ${esc(row.status)}</p></div></div>
    <div class="aivq-import-facts"><span>Applicability <strong>${esc(row.applicabilityDisposition)}</strong></span><span>Engineering distance <strong>${distanceCell(row)}</strong></span><span>Distance source <strong>${esc(relationship?.distanceSource ?? '—')}</strong></span><span>Simultaneous group <strong>${esc(row.simultaneousSourceGroup ?? '—')}</strong></span></div>
    ${renderAivTopologyPathHtml(row.topology)}</section>`;
}

function hasWorkingInput(state) {
  return Boolean(state.topologyInput && state.tables?.sources?.rows?.length && state.tables?.assessments?.rows?.length && state.tables?.relationships?.rows?.length);
}

function screeningReady(state) {
  const counts = state.readinessEnvelope?.readiness?.counts;
  return Boolean(counts && counts.notReady === 0 && counts.methodGap === 0);
}

export function renderAivReadinessPanelHtml(state = {}) {
  const busy = state.busy === true;
  const imports = state.readinessEnvelope?.imports;
  return `<section class="aivq-card">
    <div class="aivq-section-head"><div><h4>AIV readiness & screening</h4><p>Readiness joins the current visible Sources, Assessments and Source→Assessment tables to topology. When the joined evidence has no NOT_READY or METHOD_GAP rows, the same normalized inputs can execute the qualified assessment-level AIV screening kernel.</p></div></div>
    <div class="aivq-actions">
      <button type="button" class="engineering-console-btn" data-aiv-action="check-readiness"${!busy && hasWorkingInput(state) ? '' : ' disabled'}>${busy ? 'Working…' : 'Check AIV readiness'}</button>
      <button type="button" class="engineering-console-btn primary" data-aiv-action="run-screening"${!busy && screeningReady(state) ? '' : ' disabled'}>Run AIV screening</button>
    </div>
    ${state.error ? `<div class="aivq-error"><strong>AIV action failed.</strong><span>${esc(state.error)}</span></div>` : ''}
    ${imports ? `<div class="aivq-import-facts"><span>Topology integrity <strong>${esc(imports.exchangeIntegrityStatus)}</strong></span><span>Sources <strong>${esc(imports.sourceCount)}</strong></span><span>Assessments <strong>${esc(imports.assessmentCount)}</strong></span><span>Relationships <strong>${esc(imports.sourceAssessmentCount)}</strong></span></div>` : ''}
    ${summary(state)}
    <div class="aivq-example-table"><table><thead><tr><th>Source</th><th>Assessment</th><th>Case</th><th>Device</th><th>Source state</th><th>Assessment type</th><th>Applicability</th><th>Physical distance</th><th>Simultaneous group</th><th>Phase</th><th>Trim</th><th>Readiness</th><th>Issues / gaps</th></tr></thead><tbody>${readinessRows(state)}</tbody></table></div>
    <div class="aivq-readiness-note"><strong>SCREENING authority:</strong> assessment-level LOF only. Missing values may come from the visible/exported assumption profile. The configured line/case summary is not an authoritative screening result, and <code>designAuthority=false</code>.</div>
  </section>${selectedPath(state)}`;
}
