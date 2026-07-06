import { summarizeStandaloneImportMasters, STANDALONE_IMPORT_MASTER_DEFS } from '../xml-cii-master-context.js';
import { createElement } from './xml-cii-adapted-dom.js';

function text(value, fallback = '') {
  const out = String(value ?? '').trim();
  return out || fallback;
}

function appendMetric(parent, label, value) {
  const item = createElement('div', '', 'xml-cii-master-metric');
  item.append(createElement('span', label), createElement('strong', text(value, '0')));
  parent.appendChild(item);
}

function appendDiagnostics(parent, diagnostics) {
  const details = createElement('details', '', 'xml-cii-master-diagnostics');
  details.appendChild(createElement('summary', `Diagnostics (${diagnostics.length})`));
  const pre = createElement('pre', diagnostics.length ? JSON.stringify(diagnostics, null, 2) : 'No diagnostics.');
  details.appendChild(pre);
  parent.appendChild(details);
}

function appendPreview(parent, rows) {
  const wrap = createElement('div', '', 'xml-cii-master-preview');
  wrap.appendChild(createElement('h4', 'Preview'));
  if (!rows.length) wrap.appendChild(createElement('div', 'No rows loaded.', 'xml-cii-phase-help'));
  else wrap.appendChild(previewTable(rows));
  parent.appendChild(wrap);
}

function previewColumns(rows) {
  const keys = [];
  for (const row of rows) {
    for (const key of Object.keys(row || {})) if (!keys.includes(key)) keys.push(key);
  }
  return keys.slice(0, 6);
}

function previewTable(rows) {
  const table = createElement('table', '', 'xml-cii-master-preview-table');
  const columns = previewColumns(rows);
  table.append(tableHead(columns), tableBody(columns, rows));
  return table;
}

function tableHead(columns) {
  const thead = createElement('thead');
  const row = createElement('tr');
  for (const col of columns) row.appendChild(createElement('th', col));
  thead.appendChild(row);
  return thead;
}

function tableBody(columns, rows) {
  const body = createElement('tbody');
  for (const item of rows) {
    const tr = createElement('tr');
    for (const col of columns) tr.appendChild(createElement('td', text(item?.[col])));
    body.appendChild(tr);
  }
  return body;
}

function emptySummary() {
  return STANDALONE_IMPORT_MASTER_DEFS.map((def) => ({
    ...def,
    rowCount: 0,
    previewRows: [],
    diagnostics: [],
    sourceMetadata: { source: 'not-loaded', sourceType: 'empty', status: 'pending' },
  }));
}

function masterStatusText(master) {
  const meta = master.sourceMetadata || {};
  return `${text(meta.sourceType, 'empty')} / ${text(meta.status, 'pending')}`;
}

function renderMasterCard(master) {
  const card = createElement('section', '', 'xml-cii-master-card');
  card.dataset.master = master.key;
  card.appendChild(createElement('h3', master.label));
  const metrics = createElement('div', '', 'xml-cii-master-metrics');
  appendMetric(metrics, 'Source', master.sourceMetadata?.source || 'not-loaded');
  appendMetric(metrics, 'Status', masterStatusText(master));
  appendMetric(metrics, 'Rows', master.rowCount);
  card.appendChild(metrics);
  appendPreview(card, master.previewRows || []);
  appendDiagnostics(card, master.diagnostics || []);
  return card;
}

export function renderStandaloneImportMastersPanel(card, state) {
  card.appendChild(createElement('p', 'Load Line List, Piping Class, Material Map, and Weights / Valve CA8 masters into standalone workflow config.', 'xml-cii-phase-help'));
  const actions = createElement('div', '', 'xml-cii-master-actions');
  const load = createElement('button', state.importMastersLoading ? 'Loading masters…' : 'Load / refresh master context');
  load.type = 'button';
  load.dataset.action = 'load-import-masters';
  load.disabled = !!state.importMastersLoading;
  actions.appendChild(load);
  actions.appendChild(createElement('span', state.importMastersWriteBackStatus || 'Master rows not loaded into standalone config yet.', 'xml-cii-phase-help'));
  card.appendChild(actions);
  const grid = createElement('div', '', 'xml-cii-master-card-grid');
  const masters = state.masterContext ? summarizeStandaloneImportMasters(state.masterContext) : emptySummary();
  for (const master of masters) grid.appendChild(renderMasterCard(master));
  card.appendChild(grid);
}
