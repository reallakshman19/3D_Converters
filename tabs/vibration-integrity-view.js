function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function json(value) {
  return esc(JSON.stringify(value ?? null, null, 2));
}

function cell(value) {
  return value === null || value === undefined || value === '' ? '<span class="vi-empty">—</span>' : esc(value);
}

function listCell(values) {
  return Array.isArray(values) && values.length ? esc(values.join('; ')) : '<span class="vi-empty">—</span>';
}

function fileStatus(file, fallback) {
  return file
    ? `<strong>${esc(file.name)}</strong><small>${esc(file.kind || fallback)}</small>`
    : `<span class="vi-empty">${esc(fallback)}</span>`;
}

function option(value, selected, label = value) {
  return `<option value="${esc(value)}"${value === selected ? ' selected' : ''}>${esc(label)}</option>`;
}

function unique(rows, field) {
  return [...new Set(rows.map((row) => row[field]).filter((value) => value !== null && value !== undefined && value !== ''))]
    .sort((a, b) => String(a).localeCompare(String(b)));
}

function importPanel(state) {
  const topologyLimited = state.files.topology?.format === 'CSV_ELEMENTS_ONLY';
  const checking = state.busy && state.busyAction === 'preflight';
  const running = state.busy && state.busyAction === 'benchmark';
  return `<section class="vi-card vi-import-card">
    <div class="vi-section-head"><div><h3>Table inputs</h3><p>3D EDIT supplies topology identity; process and vibration data stay separate.</p></div></div>
    <div class="vi-import-grid">
      <label class="vi-file-field"><span>3D EDIT table export</span><input type="file" data-vi-file="topology" accept=".xlsx,.csv"><span class="vi-file-status">${fileStatus(state.files.topology, 'XLSX preferred · CSV is Elements-only')}</span></label>
      <label class="vi-file-field"><span>Operating cases</span><input type="file" data-vi-file="operating" accept=".csv,text/csv"><span class="vi-file-status">${fileStatus(state.files.operating, 'VibrationOperatingCaseCsv.v1')}</span></label>
      <label class="vi-file-field"><span>Vibration enrichment</span><input type="file" data-vi-file="enrichment" accept=".csv,text/csv"><span class="vi-file-status">${fileStatus(state.files.enrichment, 'VibrationEnrichmentCsv.v1')}</span></label>
    </div>
    <div class="vi-actions">
      <button type="button" class="vi-btn" data-vi-action="operating-template">Operating-case template</button>
      <button type="button" class="vi-btn" data-vi-action="enrichment-template">Enrichment template</button>
      <label class="vi-check"><input type="checkbox" data-vi-limited${state.allowLimitedExchange ? ' checked' : ''}> Allow limited Elements-only CSV</label>
      <button type="button" class="vi-btn" data-vi-action="preflight"${!state.files.topology || state.busy ? ' disabled' : ''}>${checking ? 'Checking…' : 'Check readiness'}</button>
      <button type="button" class="vi-btn primary" data-vi-action="run"${!state.files.topology || state.busy ? ' disabled' : ''}>${running ? 'Running…' : 'Run FIT benchmark'}</button>
      <button type="button" class="vi-btn" data-vi-action="export"${state.envelope ? '' : ' disabled'}>Export register CSV</button>
    </div>
    ${topologyLimited ? '<div class="vi-banner warn"><strong>Limited topology input.</strong> Elements CSV does not carry Connections, Source Mapping, Catalogue Evidence or Export Metadata. Complete provenance requires the five-sheet XLSX export.</div>' : ''}
  </section>`;
}

function preflightRows(preflight) {
  if (!preflight.rows.length) return '<tr><td colspan="8" class="vi-table-empty">No FIT assessment points are defined in the enrichment table.</td></tr>';
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
  const s = workspace.summary;
  const cards = [
    ['Rows', s.totalRows],
    ['Visible', s.visibleRows],
    ['Calculated benchmark', s.calculatedRows],
    ['Data incomplete', s.incompleteRows],
    ['Calculation failed', s.calculationFailedRows],
    ['Review candidates', s.candidateForEngineeringReviewRows],
  ];
  return `<div class="vi-summary">${cards.map(([label, value]) => `<div class="vi-metric"><small>${esc(label)}</small><strong>${esc(value)}</strong></div>`).join('')}</div>`;
}

function filters(state) {
  const sourceRows = state.envelope?.workflow?.register?.rows ?? [];
  return `<div class="vi-filterbar">
    <label>Line<select data-vi-filter="line"><option value="">All lines</option>${unique(sourceRows, 'line').map((value) => option(value, state.filters.line)).join('')}</select></label>
    <label>Completeness<select data-vi-filter="completeness"><option value="">All states</option>${unique(sourceRows, 'completenessStatus').map((value) => option(value, state.filters.completeness)).join('')}</select></label>
    <label>Reference band<select data-vi-filter="band"><option value="">All bands</option>${unique(sourceRows, 'referenceBand').map((value) => option(value, state.filters.band)).join('')}</select></label>
    <label>Review candidate<select data-vi-filter="candidate">${option('', state.filters.candidate, 'All')}${option('true', state.filters.candidate, 'Yes')}${option('false', state.filters.candidate, 'No')}</select></label>
    <label>Sort<select data-vi-sort="field">${['line','caseId','canonicalId','status','completenessStatus','referenceBand'].map((value) => option(value, state.sort.field, value)).join('')}</select></label>
    <label>Direction<select data-vi-sort="direction">${option('asc', state.sort.direction, 'Ascending')}${option('desc', state.sort.direction, 'Descending')}</select></label>
  </div>`;
}

function tableRows(workspace) {
  if (!workspace?.rows?.length) return '<tr><td colspan="12" class="vi-table-empty">No rows match the current table filters.</td></tr>';
  return workspace.rows.map((row) => `<tr${workspace.selectedRowKey === row.rowKey ? ' class="is-selected"' : ''}>
    <td><button type="button" class="vi-row-link" data-vi-row="${esc(row.rowKey)}">${cell(row.line)}</button></td>
    <td>${cell(row.caseId)}</td><td class="vi-mono">${cell(row.canonicalId)}</td>
    <td>${cell(row.completenessStatus)}</td><td>${cell(row.standardLof)}</td><td>${cell(row.refinedLof)}</td>
    <td>${cell(row.governingReferenceLof)}</td><td>${cell(row.referenceBand)}</td><td>${cell(row.qualificationState)}</td>
    <td>${cell(row.phaseEvidenceStrength)}</td><td>${cell(row.correlationEvidenceStrength)}</td>
    <td>${row.candidateForEngineeringReview ? 'Review candidate' : '<span class="vi-empty">—</span>'}</td>
  </tr>`).join('');
}

function workspaceTable(state) {
  if (!state.workspace) return '<section class="vi-card vi-empty-state"><h3>No facility register yet</h3><p>Check readiness first if desired, then run the FIT benchmark workflow. The product remains benchmark-only until qualification is approved.</p></section>';
  return `<section class="vi-card vi-workspace-card">
    <div class="vi-section-head"><div><h3>Facility FIT register</h3><p>Table values are benchmark/reference results. Incomplete and failed rows remain explicit.</p></div></div>
    ${summaryCards(state.workspace)}${filters(state)}
    <div class="vi-table-wrap"><table class="vi-table"><thead><tr>
      <th>Line</th><th>Case</th><th>Canonical ID</th><th>Completeness</th><th>Standard LOF</th><th>Refined LOF</th><th>Governing ref. LOF</th><th>Reference band</th><th>Qualification</th><th>Phase evidence</th><th>Correlation evidence</th><th>Review</th>
    </tr></thead><tbody>${tableRows(state.workspace)}</tbody></table></div>
  </section>`;
}

function detailTabs(active) {
  return ['summary','inputs','case','evidence','source','diagnostics'].map((tab) => `<button type="button" class="vi-detail-tab${tab === active ? ' is-active' : ''}" data-vi-detail="${tab}">${esc(tab[0].toUpperCase() + tab.slice(1))}</button>`).join('');
}

function detailBody(detail, tab) {
  if (tab === 'summary') return `<pre>${json(detail.summary)}</pre>`;
  if (tab === 'inputs') return detail.inputs ? `<pre>${json(detail.inputs)}</pre>` : '<p class="vi-empty">No executable request exists for this row.</p>';
  if (tab === 'case') return `<pre>${json({ operatingCase: detail.operatingCase, enrichment: detail.enrichment })}</pre>`;
  if (tab === 'evidence') return detail.evidenceQualification ? `<pre>${json(detail.evidenceQualification)}</pre>` : '<p class="vi-empty">No central calculation evidence exists for this row.</p>';
  if (tab === 'source') return `<pre>${json(detail.sourceTrace)}</pre>`;
  return `<pre>${json(detail.diagnostics)}</pre>`;
}

function detailPanel(state) {
  const detail = state.workspace?.detail;
  if (!detail) return '';
  return `<section class="vi-card vi-detail-card"><div class="vi-section-head"><div><h3>${esc(detail.summary.line)} · ${esc(detail.summary.caseId)}</h3><p class="vi-mono">${esc(detail.summary.canonicalId)}</p></div></div><div class="vi-detail-tabs">${detailTabs(state.detailTab)}</div><div class="vi-detail-body">${detailBody(detail, state.detailTab)}</div></section>`;
}

function importFacts(state) {
  const imports = state.envelope?.imports;
  if (!imports) return '';
  return `<div class="vi-import-facts"><span>Topology: <strong>${esc(imports.topologyFormat)}</strong></span><span>Integrity: <strong>${esc(imports.exchangeIntegrityStatus)}</strong></span><span>Operating cases: <strong>${esc(imports.operatingCaseCount)}</strong></span><span>Enrichment rows: <strong>${esc(imports.enrichmentCount)}</strong></span></div>`;
}

export function renderVibrationIntegrityHtml(state) {
  return `<div class="vi-root">
    <header class="vi-header"><div><h2>Vibration Integrity</h2><p>Table-first FIT integrity workspace using 3D EDIT table exports and explicit operating/enrichment data.</p></div><div class="vi-authority"><strong>BENCHMARK ONLY</strong><span>NOT SCREENING / DESIGN AUTHORITY</span></div></header>
    ${state.error ? `<div class="vi-banner bad"><strong>Unable to run workspace.</strong><span>${esc(state.error)}</span></div>` : ''}
    ${importPanel(state)}${preflightPanel(state)}${importFacts(state)}${workspaceTable(state)}${detailPanel(state)}
  </div>`;
}
