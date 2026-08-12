import {
  renderVibrationIntegrityDetailBody,
  renderVibrationIntegrityDetailTabs,
} from './vibration-integrity-detail-view.js';
import { renderVibrationIntegrityInputArea } from './vibration-integrity-input-view.js';
import { buildSelectedFitMechanismAssessmentSet } from './vibration-integrity-mechanism-context.js';
import {
  VIBRATION_INTEGRITY_MECHANISMS,
  buildVibrationMechanismMatrixRow,
} from './vibration-integrity-mechanisms.js';

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function cell(value) {
  return value === null || value === undefined || value === ''
    ? '<span class="vi-empty">—</span>'
    : esc(value);
}

function listCell(values) {
  return Array.isArray(values) && values.length
    ? esc(values.join('; '))
    : '<span class="vi-empty">—</span>';
}

function option(value, selected, label = value) {
  return `<option value="${esc(value)}"${value === selected ? ' selected' : ''}>${esc(label)}</option>`;
}

function unique(rows, field) {
  return [...new Set(rows.map((row) => row[field]).filter((value) => (
    value !== null && value !== undefined && value !== ''
  )))].sort((a, b) => String(a).localeCompare(String(b)));
}

function preflightRows(preflight) {
  if (!preflight.rows.length) {
    return '<tr><td colspan="8" class="vi-table-empty">No FIT assessment points are defined in the enrichment table.</td></tr>';
  }
  return preflight.rows.map((row) => `<tr>
    <td>${cell(row.line)}</td><td>${cell(row.caseId)}</td><td class="vi-mono">${cell(row.canonicalId)}</td>
    <td>${cell(row.status)}</td><td>${listCell(row.missing)}</td><td>${listCell(row.invalid)}</td>
    <td>${listCell(row.reasons)}</td><td>${row.requestPrepared ? 'Prepared' : '<span class="vi-empty">—</span>'}</td>
  </tr>`).join('');
}

function preflightPanel(state) {
  const wrapper = state.preflight;
  if (!wrapper?.preflight) return '';
  const preflight = wrapper.preflight;
  const cards = [
    ['Topology integrity', wrapper.imports.exchangeIntegrityStatus ?? 'UNKNOWN'],
    ['Assessment points', preflight.counts.assessmentPoints],
    ['Plan rows', preflight.counts.rows],
    ['Ready', preflight.counts.ready],
    ['Not ready', preflight.counts.notReady],
  ];
  return `<section class="vi-card vi-preflight-card">
    <div class="vi-section-head"><div><h3>FIT readiness</h3><p>Input-contract and completeness check only. No FIT calculation is executed by this readiness check.</p></div></div>
    <div class="vi-summary vi-preflight-summary">${cards.map(([label, value]) => `<div class="vi-metric"><small>${esc(label)}</small><strong>${esc(value)}</strong></div>`).join('')}</div>
    <div class="vi-table-wrap"><table class="vi-table vi-preflight-table"><thead><tr>
      <th>Line</th><th>Case</th><th>Canonical ID</th><th>Readiness</th><th>Missing</th><th>Invalid</th><th>Reasons</th><th>Request</th>
    </tr></thead><tbody>${preflightRows(preflight)}</tbody></table></div>
  </section>`;
}

function summaryCards(workspace) {
  if (!workspace) return '';
  const summary = workspace.summary;
  const cards = [
    ['Rows', summary.totalRows],
    ['Visible', summary.visibleRows],
    ['FIT calculated', summary.calculatedRows],
    ['Data incomplete', summary.incompleteRows],
    ['Calculation failed', summary.calculationFailedRows],
    ['Review candidates', summary.candidateForEngineeringReviewRows],
  ];
  return `<div class="vi-summary">${cards.map(([label, value]) => `<div class="vi-metric"><small>${esc(label)}</small><strong>${esc(value)}</strong></div>`).join('')}</div>`;
}

function filters(state) {
  const sourceRows = state.envelope?.workflow?.register?.rows ?? [];
  return `<div class="vi-filterbar">
    <label>Line<select data-vi-filter="line"><option value="">All lines</option>${unique(sourceRows, 'line').map((value) => option(value, state.filters.line)).join('')}</select></label>
    <label>Completeness<select data-vi-filter="completeness"><option value="">All states</option>${unique(sourceRows, 'completenessStatus').map((value) => option(value, state.filters.completeness)).join('')}</select></label>
    <label>FIT reference band<select data-vi-filter="band"><option value="">All bands</option>${unique(sourceRows, 'referenceBand').map((value) => option(value, state.filters.band)).join('')}</select></label>
    <label>Review candidate<select data-vi-filter="candidate">${option('', state.filters.candidate, 'All')}${option('true', state.filters.candidate, 'Yes')}${option('false', state.filters.candidate, 'No')}</select></label>
    <label>Sort<select data-vi-sort="field">${['line','caseId','canonicalId','status','completenessStatus','referenceBand'].map((value) => option(value, state.sort.field, value)).join('')}</select></label>
    <label>Direction<select data-vi-sort="direction">${option('asc', state.sort.direction, 'Ascending')}${option('desc', state.sort.direction, 'Descending')}</select></label>
  </div>`;
}

function mechanismCell(assessment) {
  if (!assessment.calculated) {
    const reason = assessment.assessmentState === 'NOT_IMPLEMENTED'
      ? 'Not implemented; no mechanism calculation was performed.'
      : 'No current FIT calculation.';
    return `<span class="vi-empty" title="${esc(reason)}">—</span>`;
  }
  const band = assessment.referenceBand
    ? `<small class="vi-mono">${esc(assessment.referenceBand)}</small>`
    : '';
  const currency = assessment.resultState === 'STALE_RESULT'
    ? '<small class="vi-mono">STALE_RESULT</small>'
    : '';
  return `<strong>${esc(assessment.lof)}</strong>${band}${currency}`;
}

function mechanismHeaders() {
  return VIBRATION_INTEGRITY_MECHANISMS.map((mechanism) => (
    `<th title="${esc(`${mechanism.title} · ${mechanism.sourceSection}`)}">${esc(mechanism.label)}</th>`
  )).join('');
}

function tableRows(workspace, resultState) {
  const colspan = VIBRATION_INTEGRITY_MECHANISMS.length + 7;
  if (!workspace?.rows?.length) {
    return `<tr><td colspan="${colspan}" class="vi-table-empty">No rows match the current table filters.</td></tr>`;
  }
  return workspace.rows.map((row) => {
    const matrix = buildVibrationMechanismMatrixRow(row, { resultState });
    const governing = matrix.implementedGoverning;
    return `<tr${workspace.selectedRowKey === row.rowKey ? ' class="is-selected"' : ''}>
      <td><button type="button" class="vi-row-link" data-vi-row="${esc(row.rowKey)}">${cell(row.line)}</button></td>
      <td>${cell(row.caseId)}</td><td class="vi-mono">${cell(row.canonicalId)}</td>
      <td>${cell(row.completenessStatus)}</td>
      ${matrix.assessments.map(mechanismCell).map((value) => `<td>${value}</td>`).join('')}
      <td>${governing ? `${esc(governing.mechanism.label)} · ${esc(governing.lof)}` : '<span class="vi-empty">—</span>'}</td>
      <td>${cell(row.qualificationState)}</td>
      <td>${row.candidateForEngineeringReview ? 'Review candidate' : '<span class="vi-empty">—</span>'}</td>
    </tr>`;
  }).join('');
}

function resultCurrencyBanner(state) {
  if (state.resultState !== 'STALE_RESULT') return '';
  return '<div class="vi-banner warn"><strong>STALE RESULT · rerun required.</strong><span>The register below is retained for inspection only and is not current for the working inputs. Export is disabled until a successful rerun.</span></div>';
}

function workspaceTable(state) {
  if (!state.workspace) {
    return '<section class="vi-card vi-empty-state"><h3>No facility register yet</h3><p>Inspect or edit the working tables, check readiness if desired, then run the FIT benchmark workflow. The product remains benchmark-only until qualification is approved.</p></section>';
  }
  return `<section class="vi-card vi-workspace-card">
    <div class="vi-section-head"><div><h3>Facility vibration screening register</h3><p>Line-centric mechanism matrix aligned to the EI worked-example report. Only FIT is currently executable; blank non-FIT mechanism cells are architecture placeholders and do not imply assessment or applicability.</p></div></div>
    ${resultCurrencyBanner(state)}
    <div class="vi-banner warn"><strong>Mechanism authority boundary.</strong><span>FIT remains BENCHMARK ONLY. Mechanical excitation, pulsation, AIV, transients, cavitation/flashing, thermowells and SBC are NOT IMPLEMENTED in this workspace.</span></div>
    ${summaryCards(state.workspace)}${filters(state)}
    <div class="vi-table-wrap"><table class="vi-table"><thead><tr>
      <th>Line</th><th>Case</th><th>Canonical ID</th><th>Completeness</th>${mechanismHeaders()}<th>Implemented governing</th><th>Qualification</th><th>Review</th>
    </tr></thead><tbody>${tableRows(state.workspace, state.resultState)}</tbody></table></div>
  </section>`;
}

function detailPanel(state) {
  const detail = state.workspace?.detail;
  if (!detail) return '';
  const mechanismAssessmentSet = buildSelectedFitMechanismAssessmentSet(state);
  return `<section class="vi-card vi-detail-card"><div class="vi-section-head"><div><h3>${esc(detail.summary.line)} · ${esc(detail.summary.caseId)}</h3><p class="vi-mono">${esc(detail.summary.canonicalId)}</p></div></div><div class="vi-detail-tabs">${renderVibrationIntegrityDetailTabs(state.detailTab)}</div><div class="vi-detail-body">${renderVibrationIntegrityDetailBody(detail, state.detailTab, { mechanismAssessmentSet })}</div></section>`;
}

function importFacts(state) {
  const imports = state.envelope?.imports;
  if (!imports) return '';
  const snapshot = state.runSnapshot?.snapshotHash;
  return `<div class="vi-import-facts"><span>Topology: <strong>${esc(imports.topologyFormat)}</strong></span><span>Integrity: <strong>${esc(imports.exchangeIntegrityStatus)}</strong></span><span>Operating cases: <strong>${esc(imports.operatingCaseCount)}</strong></span><span>Enrichment rows: <strong>${esc(imports.enrichmentCount)}</strong></span><span>Result: <strong>${esc(state.resultState ?? 'UNRUN')}</strong></span>${snapshot ? `<span>Run snapshot: <strong class="vi-mono">${esc(snapshot)}</strong></span>` : ''}</div>`;
}

export function renderVibrationIntegrityHtml(state) {
  return `<div class="vi-root">
    <header class="vi-header"><div><h2>Vibration Integrity</h2><p>Line-centric vibration integrity workspace with shared source data and a mechanism screening matrix. FIT is currently benchmark-only.</p></div><div class="vi-authority"><strong>BENCHMARK ONLY</strong><span>NOT SCREENING / DESIGN AUTHORITY</span></div></header>
    ${state.error ? `<div class="vi-banner bad"><strong>Unable to run workspace.</strong><span>${esc(state.error)}</span></div>` : ''}
    ${renderVibrationIntegrityInputArea(state)}${preflightPanel(state)}${importFacts(state)}${workspaceTable(state)}${detailPanel(state)}
  </div>`;
}
