import {
  VIBRATION_FIT_UI_BENCHMARK_CASES,
  VIBRATION_FIT_UI_BENCHMARK_SOURCE,
} from './vibration-integrity-benchmarks.js';

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function option(value, selected, label) {
  return `<option value="${esc(value)}"${value === selected ? ' selected' : ''}>${esc(label)}</option>`;
}

function fileStatus(file, table, fallback) {
  if (!file && !table?.rows?.length) return `<span class="vi-empty">${esc(fallback)}</span>`;
  const name = file?.name ?? table?.sourceName ?? 'Working table';
  const kind = table?.dirty && table?.kind === 'topology' && table.originalCertifiedExchange
    ? 'Edited Elements working copy · certification not retained'
    : file?.kind ?? table?.sourceKind ?? fallback;
  return `<strong>${esc(name)}</strong><small>${esc(kind)}</small>`;
}

function actualBenchmarkRow(state) {
  const benchmark = state.benchmark?.loaded;
  const rows = state.envelope?.workflow?.register?.rows ?? [];
  if (!benchmark) return null;
  return rows.find((row) => row.canonicalId === benchmark.identity.canonicalId
    && row.line === benchmark.identity.line
    && row.caseId === benchmark.identity.caseId) ?? null;
}

function relativeDelta(actual, expected) {
  if (!Number.isFinite(actual) || !Number.isFinite(expected)) return null;
  const denominator = Math.max(Math.abs(expected), Number.EPSILON);
  return Math.abs(actual - expected) / denominator;
}

function benchmarkComparison(state) {
  const benchmark = state.benchmark?.loaded;
  if (!benchmark) return null;
  const actual = actualBenchmarkRow(state);
  if (benchmark.modified) {
    return { status: 'NOT_APPLICABLE_MODIFIED_INPUTS', actual, delta: null };
  }
  if (!actual || !Number.isFinite(actual.standardLof)) {
    return { status: 'NOT_RUN', actual, delta: null };
  }
  const delta = relativeDelta(actual.standardLof, benchmark.published.standardLof);
  const lofPass = delta <= benchmark.source.relativeTolerance;
  const bandPass = actual.referenceBand === benchmark.published.referenceBand;
  return { status: lofPass && bandPass ? 'PASS' : 'FAIL', actual, delta };
}

function benchmarkPanel(state) {
  const selected = state.benchmark?.selectedId ?? VIBRATION_FIT_UI_BENCHMARK_CASES[0]?.id ?? '';
  const loaded = state.benchmark?.loaded;
  const comparison = benchmarkComparison(state);
  const actualLof = comparison?.actual?.standardLof;
  const actualBand = comparison?.actual?.referenceBand;
  const delta = comparison?.delta;
  const status = comparison?.status ?? 'NOT_LOADED';
  return `<section class="vi-card vi-benchmark-card">
    <div class="vi-section-head"><div><h3>FIT validation benchmark</h3><p>Load a controlled EI worked example into the editable tables, then run the normal FIT benchmark workflow.</p></div></div>
    <div class="vi-benchmark-controls">
      <label>Benchmark case<select data-vi-benchmark-select>${VIBRATION_FIT_UI_BENCHMARK_CASES.map((entry) => option(entry.id, selected, entry.label)).join('')}</select></label>
      <button type="button" class="vi-btn primary" data-vi-action="load-benchmark"${state.busy ? ' disabled' : ''}>Load BENCHMARK</button>
    </div>
    ${loaded ? `<div class="vi-benchmark-facts">
      <span>Source: <strong>${esc(loaded.sourceLocation)}</strong></span>
      <span>Target standard LOF: <strong>${esc(loaded.published.standardLof)}</strong></span>
      <span>Target band: <strong>${esc(loaded.published.referenceBand)}</strong></span>
      <span>Published support: <strong>${esc(loaded.published.supportStiffness)}</strong></span>
      <span>Actual standard LOF: <strong>${actualLof ?? '—'}</strong></span>
      <span>Actual band: <strong>${actualBand ?? '—'}</strong></span>
      <span>Relative delta: <strong>${delta === null ? '—' : `${(delta * 100).toFixed(3)}%`}</strong></span>
      <span>Comparison: <strong>${esc(status === 'PASS' ? 'Benchmark parity PASS' : status === 'FAIL' ? 'Benchmark parity FAIL' : status === 'NOT_RUN' ? 'Run benchmark to compare' : 'Not applicable · inputs modified')}</strong></span>
    </div>
    ${loaded.modified ? '<div class="vi-banner warn"><strong>Benchmark inputs modified.</strong><span>The published target remains visible only as the original-case reference. Reload the benchmark to restore an official parity comparison.</span></div>' : ''}
    <div class="vi-benchmark-source">${esc(VIBRATION_FIT_UI_BENCHMARK_SOURCE.benchmarkSetId)} · ${esc(VIBRATION_FIT_UI_BENCHMARK_SOURCE.edition)} · tolerance ${esc(VIBRATION_FIT_UI_BENCHMARK_SOURCE.relativeTolerance * 100)}%</div>` : ''}
  </section>`;
}

function importPanel(state) {
  const topology = state.tables?.topology;
  const topologyLimited = state.files.topology?.format === 'CSV_ELEMENTS_ONLY' || topology?.dirty;
  const checking = state.busy && state.busyAction === 'preflight';
  const running = state.busy && state.busyAction === 'benchmark';
  return `<section class="vi-card vi-import-card">
    <div class="vi-section-head"><div><h3>Working table inputs</h3><p>Files load into the editable tables below. Readiness and benchmark execution consume the current table cells.</p></div></div>
    <div class="vi-import-grid">
      <label class="vi-file-field"><span>3D EDIT table export</span><input type="file" data-vi-file="topology" accept=".xlsx,.csv"><span class="vi-file-status">${fileStatus(state.files.topology, topology, 'XLSX preferred · CSV is Elements-only')}</span></label>
      <label class="vi-file-field"><span>Operating cases</span><input type="file" data-vi-file="operating" accept=".csv,text/csv"><span class="vi-file-status">${fileStatus(state.files.operating, state.tables?.operating, 'VibrationOperatingCaseCsv.v1')}</span></label>
      <label class="vi-file-field"><span>Vibration enrichment</span><input type="file" data-vi-file="enrichment" accept=".csv,text/csv"><span class="vi-file-status">${fileStatus(state.files.enrichment, state.tables?.enrichment, 'VibrationEnrichmentCsv.v1')}</span></label>
    </div>
    <div class="vi-actions">
      <button type="button" class="vi-btn" data-vi-action="operating-template">Operating-case template</button>
      <button type="button" class="vi-btn" data-vi-action="enrichment-template">Enrichment template</button>
      <label class="vi-check"><input type="checkbox" data-vi-limited${state.allowLimitedExchange ? ' checked' : ''}> Allow limited Elements-only CSV</label>
      <button type="button" class="vi-btn" data-vi-action="preflight"${!state.tables?.topology?.rows?.length || state.busy ? ' disabled' : ''}>${checking ? 'Checking…' : 'Check readiness'}</button>
      <button type="button" class="vi-btn primary" data-vi-action="run"${!state.tables?.topology?.rows?.length || state.busy ? ' disabled' : ''}>${running ? 'Running…' : 'Run FIT benchmark'}</button>
      <button type="button" class="vi-btn" data-vi-action="export"${state.envelope ? '' : ' disabled'}>Export register CSV</button>
    </div>
    ${topologyLimited ? '<div class="vi-banner warn"><strong>Limited / locally edited topology.</strong><span>Execution uses the visible Elements working table. Connections, Source Mapping, Catalogue Evidence and Export Metadata are not claimed for this edited input.</span></div>' : ''}
  </section>`;
}

function editableRows(table) {
  if (!table.rows.length) {
    return `<tr><td colspan="${table.header.length + 1}" class="vi-table-empty">No rows loaded. Add a row or import CSV.</td></tr>`;
  }
  return table.rows.map((row, rowIndex) => `<tr>${row.map((value, columnIndex) => `<td><input class="vi-cell-input" data-vi-table-cell="${esc(table.kind)}" data-vi-edit-row="${rowIndex}" data-vi-edit-column="${columnIndex}" value="${esc(value)}" aria-label="${esc(table.header[columnIndex])} row ${rowIndex + 1}"></td>`).join('')}<td><button type="button" class="vi-btn vi-row-delete" data-vi-table-delete="${esc(table.kind)}" data-vi-edit-row="${rowIndex}">Delete</button></td></tr>`).join('');
}

function editableTable(title, table, description) {
  return `<section class="vi-card vi-input-table-card">
    <div class="vi-section-head"><div><h3>${esc(title)}</h3><p>${esc(description)}</p></div><button type="button" class="vi-btn" data-vi-table-add="${esc(table.kind)}">Add row</button></div>
    <div class="vi-table-wrap vi-input-table-wrap"><table class="vi-table vi-input-table"><thead><tr>${table.header.map((heading) => `<th>${esc(heading)}</th>`).join('')}<th>Row</th></tr></thead><tbody>${editableRows(table)}</tbody></table></div>
  </section>`;
}

function fallbackTable(kind) {
  return { kind, header: [], rows: [], sourceName: null, sourceKind: 'WORKING_TABLE', dirty: false };
}

export function renderVibrationIntegrityInputArea(state) {
  const tables = state.tables ?? {
    topology: fallbackTable('topology'),
    operating: fallbackTable('operating'),
    enrichment: fallbackTable('enrichment'),
  };
  const inputState = state.tables ? state : { ...state, tables };
  return `${benchmarkPanel(inputState)}${importPanel(inputState)}
    ${editableTable('Topology · Elements working table', tables.topology, 'Certified XLSX is preserved only while these topology cells remain unedited. Any edit becomes a local Elements-only override.')}
    ${editableTable('Operating cases', tables.operating, 'Process quantities and units. Imported CSV remains editable before readiness or execution.')}
    ${editableTable('Vibration enrichment', tables.enrichment, 'Assessment-point and FIT geometry evidence keyed by Canonical ID. Imported CSV remains editable.')}`;
}
