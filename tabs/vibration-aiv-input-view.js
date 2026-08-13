import { AIV_UI_BENCHMARK_SOURCE } from './vibration-aiv-benchmarks.js';
import { renderAivCanvasWorkspaceHtml } from './vibration-aiv-canvas-view.js';
import { renderAivAssumptionProfileHtml } from './vibration-aiv-assumption-view.js';

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function fileStatus(file, table, fallback) {
  if (!file && !table?.rows?.length) return `<span class="aivq-empty">${esc(fallback)}</span>`;
  const name = file?.name ?? table?.sourceName ?? 'Working table';
  const kind = table?.dirty && table?.benchmarkId
    ? 'Edited benchmark working copy'
    : file?.kind ?? table?.sourceKind ?? fallback;
  return `<strong>${esc(name)}</strong><small>${esc(kind)}</small>`;
}

function benchmarkPanel(state) {
  const loaded = state.benchmark?.loaded;
  const reference = loaded?.publishedReference;
  const status = !loaded
    ? 'NOT_LOADED'
    : loaded.modified ? 'NOT_APPLICABLE_MODIFIED_INPUTS' : 'CONTROLLED_INPUT_REFERENCE';
  return `<section class="aivq-card aivq-benchmark-card">
    <div class="aivq-section-head"><div><h4>Controlled EI benchmark</h4><p>Load EI D.2.3 into the same editable split tables used by project data. Published references remain comparison targets; missing cells may be resolved from the visible assumption profile.</p></div></div>
    <div class="aivq-actions"><button type="button" class="engineering-console-btn primary" data-aiv-action="load-d23-benchmark"${state.busy ? ' disabled' : ''}>Load EI D.2.3</button></div>
    ${loaded ? `<div class="aivq-benchmark-facts">
      <span>Input reference <strong>${esc(status)}</strong></span>
      <span>Relief raw source PWL reference <strong>${esc(reference.reliefRawSourcePwlDb)} dB</strong></span>
      <span>Recycle raw source PWL reference <strong>${esc(reference.recycleRawSourcePwlDb)} dB</strong></span>
      <span>Recycle trim reference <strong>${esc(reference.recycleTrimReductionDb)} dB</strong></span>
      <span>Relief first-discontinuity point PWL <strong>${esc(reference.reliefPointPwlDb)} dB</strong></span>
      <span>Relief first-discontinuity LOF <strong>${esc(reference.reliefFirstDiscontinuityLof)}</strong></span>
      <span>FLM1 published <strong>${esc(reference.publishedFlm1)}</strong></span>
      <span>FLM1 alternative <strong>1.2109758194311824</strong></span>
    </div>
    ${loaded.modified ? '<div class="aivq-banner aivq-benchmark-warning"><strong>Benchmark inputs modified.</strong><span>Published values remain visible only as the original controlled-case reference. Reload EI D.2.3 to restore exact benchmark-input identity.</span></div>' : ''}
    <div class="aivq-benchmark-source">${esc(AIV_UI_BENCHMARK_SOURCE.benchmarkSetId)} · ${esc(AIV_UI_BENCHMARK_SOURCE.readableSource.path)} · blob ${esc(AIV_UI_BENCHMARK_SOURCE.readableSource.gitBlob)}</div>` : ''}
  </section>`;
}

function importPanel(state) {
  return `<section class="aivq-card">
    <div class="aivq-section-head"><div><h4>AIV working inputs</h4><p>Imported CSVs become editable working tables. Blank cells are resolved from the visible assumption profile before readiness/calculation; explicit table values always take precedence.</p></div></div>
    <div class="aivq-import-grid">
      <label class="aivq-file-field"><span>3D EDIT complete topology XLSX</span><input type="file" data-aiv-file="topology" accept=".xlsx"><span>${fileStatus(state.files?.topology, null, 'Five-sheet TopologyEditTableHumanExport.v1 XLSX required')}</span></label>
      <label class="aivq-file-field"><span>AIV Sources</span><input type="file" data-aiv-file="sources" accept=".csv,text/csv"><span>${fileStatus(state.files?.sources, state.tables?.sources, 'AivSourceCsv.v2')}</span></label>
      <label class="aivq-file-field"><span>AIV Assessments</span><input type="file" data-aiv-file="assessments" accept=".csv,text/csv"><span>${fileStatus(state.files?.assessments, state.tables?.assessments, 'AivAssessmentCsv.v1')}</span></label>
      <label class="aivq-file-field"><span>Source → Assessment</span><input type="file" data-aiv-file="relationships" accept=".csv,text/csv"><span>${fileStatus(state.files?.relationships, state.tables?.relationships, 'AivSourceAssessmentCsv.v1')}</span></label>
    </div>
    <div class="aivq-actions">
      <button type="button" class="engineering-console-btn" data-aiv-action="source-template">Sources template</button>
      <button type="button" class="engineering-console-btn" data-aiv-action="assessment-template">Assessments template</button>
      <button type="button" class="engineering-console-btn" data-aiv-action="relationship-template">Source→Assessment template</button>
    </div>
  </section>`;
}

function editableRows(table) {
  if (!table.rows.length) {
    return `<tr><td colspan="${table.header.length + 1}" class="aivq-empty-row">No rows loaded. Add a row or import a controlled CSV.</td></tr>`;
  }
  return table.rows.map((row, rowIndex) => `<tr>${row.map((value, columnIndex) => `<td><input class="aivq-cell-input" data-aiv-table-cell="${esc(table.kind)}" data-aiv-edit-row="${rowIndex}" data-aiv-edit-column="${columnIndex}" value="${esc(value)}" aria-label="${esc(table.header[columnIndex])} row ${rowIndex + 1}"></td>`).join('')}<td><button type="button" class="engineering-console-btn aivq-row-delete" data-aiv-table-delete="${esc(table.kind)}" data-aiv-edit-row="${rowIndex}">Delete</button></td></tr>`).join('');
}

function editableTable(title, table, description) {
  return `<section class="aivq-card aivq-input-table-card">
    <div class="aivq-section-head"><div><h4>${esc(title)}</h4><p>${esc(description)}</p></div><button type="button" class="engineering-console-btn" data-aiv-table-add="${esc(table.kind)}">Add row</button></div>
    <div class="aivq-input-table-wrap"><table class="aivq-input-table"><thead><tr>${table.header.map((heading) => `<th>${esc(heading)}</th>`).join('')}<th>Row</th></tr></thead><tbody>${editableRows(table)}</tbody></table></div>
  </section>`;
}

function fallbackTable(kind) {
  return { kind, header: [], rows: [], sourceName: null, sourceKind: 'WORKING_TABLE', dirty: false };
}

export function renderAivInputWorkspaceHtml(state = {}) {
  const tables = state.tables ?? {
    sources: fallbackTable('sources'),
    assessments: fallbackTable('assessments'),
    relationships: fallbackTable('relationships'),
  };
  const canvasState = { ...state, tables };
  return `${renderAivCanvasWorkspaceHtml(canvasState)}${benchmarkPanel(state)}${renderAivAssumptionProfileHtml(state)}${importPanel({ ...state, tables })}
    ${editableTable('AIV Sources', tables.sources, 'Source + operating-case process/device inputs. Blank engineering cells are assumed from the configured profile at execution time.')}
    ${editableTable('AIV Assessments', tables.assessments, 'Welded discontinuity geometry/material inputs keyed by Assessment Canonical ID. Missing engineering cells use configured assumptions.')}
    ${editableTable('Source → Assessment', tables.relationships, 'Applicability, engineering physical distance and simultaneous-source grouping. Missing cells use configured assumptions; topology pixels never supply distance.')}`;
}
