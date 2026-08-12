import { buildFitMechanismBenchmarkComparison } from '../converters/vibration/mechanisms/index.js';
import { vibrationIntegrityInputCellState } from './vibration-integrity-input-model.js';
import { VIBRATION_FIT_UI_BENCHMARK_CASES, VIBRATION_FIT_UI_BENCHMARK_SOURCE } from './vibration-integrity-benchmarks.js';

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function option(value, selected, label) {
  return `<option value="${esc(value)}"${value === selected ? ' selected' : ''}>${esc(label)}</option>`;
}

function fileStatus(file, table, fallback) {
  if (!file && !table?.rows?.length) return `<span class="vi-empty">${esc(fallback)}</span>`;
  const name = file?.name ?? table?.sourceName ?? 'Working table';
  const kind = table?.authorityDowngraded && table?.kind === 'topology' && table.originalCertifiedExchange
    ? 'Local Elements override · complete-exchange authority not retained'
    : file?.kind ?? table?.sourceKind ?? fallback;
  return `<strong>${esc(name)}</strong><small>${esc(kind)}</small>`;
}

function actualBenchmarkRow(state) {
  const benchmark = state.benchmark?.loaded;
  const rows = state.envelope?.workflow?.register?.rows ?? [];
  if (!benchmark) return null;
  return rows.find((row) => row.canonicalId === benchmark.identity.canonicalId
    && row.line === benchmark.identity.line && row.caseId === benchmark.identity.caseId) ?? null;
}

function benchmarkComparison(state) {
  return buildFitMechanismBenchmarkComparison({
    benchmark: state.benchmark?.loaded ?? null,
    actual: actualBenchmarkRow(state),
    resultState: state.resultState,
  });
}

function comparisonLabel(status) {
  if (status === 'PASS') return 'Benchmark parity PASS';
  if (status === 'FAIL') return 'Benchmark parity FAIL';
  if (status === 'STALE_RESULT') return 'Stale result · rerun required';
  if (status === 'NOT_RUN') return 'Run benchmark to compare';
  return 'Not applicable · inputs modified';
}

function benchmarkPanel(state) {
  const selected = state.benchmark?.selectedId ?? VIBRATION_FIT_UI_BENCHMARK_CASES[0]?.id ?? '';
  const loaded = state.benchmark?.loaded;
  const comparison = benchmarkComparison(state);
  const delta = comparison?.relativeDelta;
  return `<section class="vi-card vi-benchmark-card">
    <div class="vi-section-head"><div><h3>FIT validation benchmark</h3><p>Load a controlled EI worked example into the editable tables, then run the normal FIT benchmark workflow.</p></div></div>
    <div class="vi-benchmark-controls"><label>Benchmark case<select data-vi-benchmark-select>${VIBRATION_FIT_UI_BENCHMARK_CASES.map((entry) => option(entry.id, selected, entry.label)).join('')}</select></label><button type="button" class="vi-btn primary" data-vi-action="load-benchmark"${state.busy ? ' disabled' : ''}>Load BENCHMARK</button></div>
    ${loaded ? `<div class="vi-benchmark-facts">
      <span>Source: <strong>${esc(loaded.sourceLocation)}</strong></span><span>Target standard LOF: <strong>${esc(loaded.published.standardLof)}</strong></span><span>Target band: <strong>${esc(loaded.published.referenceBand)}</strong></span><span>Published support: <strong>${esc(loaded.published.supportStiffness)}</strong></span>
      <span>Actual standard LOF: <strong>${comparison?.actualLof ?? '—'}</strong></span><span>Actual band: <strong>${comparison?.actualBand ?? '—'}</strong></span><span>Relative delta: <strong>${delta === null ? '—' : `${(delta * 100).toFixed(3)}%`}</strong></span><span>Comparison: <strong>${esc(comparisonLabel(comparison?.status))}</strong></span>
    </div>${loaded.modified ? '<div class="vi-banner warn"><strong>Benchmark inputs modified.</strong><span>The published target remains visible only as the original-case reference. Revert all working edits or reload the benchmark before claiming parity.</span></div>' : ''}
    <div class="vi-benchmark-source">${esc(VIBRATION_FIT_UI_BENCHMARK_SOURCE.benchmarkSetId)} · ${esc(VIBRATION_FIT_UI_BENCHMARK_SOURCE.edition)} · tolerance ${esc(VIBRATION_FIT_UI_BENCHMARK_SOURCE.relativeTolerance * 100)}%</div>` : ''}
  </section>`;
}

function inputStateFacts(state) {
  const edits = Object.values(state.tables ?? {}).reduce((sum, table) => sum + (table.editCount ?? 0), 0);
  const snapshot = state.runSnapshot?.snapshotHash;
  return `<div class="vi-import-facts"><span>Working edits: <strong>${esc(edits)}</strong></span><span>Result: <strong>${esc(state.resultState ?? 'UNRUN')}</strong></span>${snapshot ? `<span>Snapshot: <strong class="vi-mono">${esc(snapshot.slice(0, 16))}…</strong></span>` : ''}</div>`;
}

function importPanel(state) {
  const topology = state.tables?.topology;
  const topologyLimited = state.files.topology?.format === 'CSV_ELEMENTS_ONLY' || topology?.authorityDowngraded;
  const checking = state.busy && state.busyAction === 'preflight';
  const running = state.busy && state.busyAction === 'benchmark';
  return `<section class="vi-card vi-import-card">
    <div class="vi-section-head"><div><h3>Working table inputs</h3><p>Files load into original/working table state. Execution consumes the current working cells; source values remain available for exact revert.</p></div></div>
    <div class="vi-import-grid">
      <label class="vi-file-field"><span>3D EDIT table export</span><input type="file" data-vi-file="topology" accept=".xlsx,.csv"><span class="vi-file-status">${fileStatus(state.files.topology, topology, 'XLSX preferred · CSV is Elements-only')}</span></label>
      <label class="vi-file-field"><span>Operating cases</span><input type="file" data-vi-file="operating" accept=".csv,text/csv"><span class="vi-file-status">${fileStatus(state.files.operating, state.tables?.operating, 'VibrationOperatingCaseCsv.v1')}</span></label>
      <label class="vi-file-field"><span>Vibration enrichment</span><input type="file" data-vi-file="enrichment" accept=".csv,text/csv"><span class="vi-file-status">${fileStatus(state.files.enrichment, state.tables?.enrichment, 'VibrationEnrichmentCsv.v1')}</span></label>
    </div>${inputStateFacts(state)}
    <div class="vi-actions"><button type="button" class="vi-btn" data-vi-action="operating-template">Operating-case template</button><button type="button" class="vi-btn" data-vi-action="enrichment-template">Enrichment template</button><label class="vi-check"><input type="checkbox" data-vi-limited${state.allowLimitedExchange ? ' checked' : ''}> Allow limited Elements-only CSV</label><button type="button" class="vi-btn" data-vi-action="preflight"${!state.tables?.topology?.rows?.length || state.busy ? ' disabled' : ''}>${checking ? 'Checking…' : 'Check readiness'}</button><button type="button" class="vi-btn primary" data-vi-action="run"${!state.tables?.topology?.rows?.length || state.busy ? ' disabled' : ''}>${running ? 'Running…' : 'Run FIT benchmark'}</button><button type="button" class="vi-btn" data-vi-action="export"${state.resultState === 'CURRENT_RESULT' ? '' : ' disabled'}>Export register CSV</button></div>
    ${topologyLimited ? '<div class="vi-banner warn"><strong>Limited topology input.</strong><span>Execution uses the visible Elements working table. Once a certified XLSX is edited, complete-exchange authority remains downgraded until the source is explicitly reloaded, even if values are reverted.</span></div>' : ''}
  </section>`;
}

function editableCell(table, rowIndex, columnIndex, value) {
  const state = vibrationIntegrityInputCellState(table, rowIndex, columnIndex);
  const canRevert = state.edited && state.originalValue !== null;
  const editedClass = state.edited ? ' is-edited' : '';
  const original = state.originalValue === null ? 'Local row' : `Original: ${state.originalValue}`;
  return `<td class="vi-working-cell${editedClass}" title="${esc(original)}"><input class="vi-cell-input" data-vi-table-cell="${esc(table.kind)}" data-vi-edit-row="${rowIndex}" data-vi-edit-column="${columnIndex}" data-vi-row-id="${esc(state.rowId)}" value="${esc(value)}" aria-label="${esc(table.header[columnIndex])} row ${rowIndex + 1}">${canRevert ? `<button type="button" class="vi-btn vi-cell-revert" data-vi-cell-revert="${esc(table.kind)}" data-vi-edit-row="${rowIndex}" data-vi-edit-column="${columnIndex}" title="Revert to ${esc(state.originalValue)}">↶</button>` : ''}</td>`;
}

function editableRows(table) {
  if (!table.rows.length) return `<tr><td colspan="${table.header.length + 1}" class="vi-table-empty">No rows loaded. Add a row or import CSV.</td></tr>`;
  return table.rows.map((row, rowIndex) => `<tr>${row.map((value, columnIndex) => editableCell(table, rowIndex, columnIndex, value)).join('')}<td><button type="button" class="vi-btn vi-row-delete" data-vi-table-delete="${esc(table.kind)}" data-vi-edit-row="${rowIndex}">Delete</button></td></tr>`).join('');
}

function editableTable(title, table, description) {
  const authorityNote = table.kind === 'topology' && table.authorityDowngraded && !table.dirty
    ? '<small>Values match original; topology authority remains downgraded until reload.</small>' : '';
  return `<section class="vi-card vi-input-table-card"><div class="vi-section-head"><div><h3>${esc(title)}</h3><p>${esc(description)}</p>${authorityNote}</div><div class="vi-actions">${table.dirty ? `<button type="button" class="vi-btn" data-vi-table-revert="${esc(table.kind)}">Revert table</button>` : ''}<button type="button" class="vi-btn" data-vi-table-add="${esc(table.kind)}">Add row</button></div></div><div class="vi-table-wrap vi-input-table-wrap"><table class="vi-table vi-input-table"><thead><tr>${table.header.map((heading) => `<th>${esc(heading)}</th>`).join('')}<th>Row</th></tr></thead><tbody>${editableRows(table)}</tbody></table></div></section>`;
}

function fallbackTable(kind) {
  return { kind, header: [], rows: [], records: [], rowIds: [], sourceName: null, sourceKind: 'WORKING_TABLE', dirty: false, editCount: 0, authorityDowngraded: false };
}

export function renderVibrationIntegrityInputArea(state) {
  const tables = state.tables ?? { topology: fallbackTable('topology'), operating: fallbackTable('operating'), enrichment: fallbackTable('enrichment') };
  const inputState = state.tables ? state : { ...state, tables };
  return `${benchmarkPanel(inputState)}${importPanel(inputState)}${editableTable('Topology · Elements working table', tables.topology, 'Certified XLSX is preserved only until the first topology mutation. Revert restores values but does not restore complete-exchange authority.')}${editableTable('Operating cases', tables.operating, 'Process quantities preserve original and working values. Unit-only edits convert the numeric value through the central engineering unit layer when quantity semantics are known.')}${editableTable('Vibration enrichment', tables.enrichment, 'Assessment-point and FIT geometry evidence keyed by Canonical ID. Known numeric engineering properties use central unit conversion; unknown property semantics are never guessed.')}`;
}
