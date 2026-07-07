import { summarizeStandaloneImportMasters, STANDALONE_IMPORT_MASTER_DEFS } from '../xml-cii-master-context.js';
import { createElement } from './xml-cii-adapted-dom.js';
import { MASTER_FIELDS } from './xml-cii-adapted-fields-config.js';

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

function getHeaderLabel(header, masterKey, state) {
  let config = {};
  try {
    config = JSON.parse(state.supportConfigJson || '{}');
  } catch {}
  const configKey = MASTER_FIELDS[masterKey]?.configKey;
  const fieldMap = config[configKey]?.fieldMap || {};
  
  const mappedFields = [];
  for (const [fieldName, colHeader] of Object.entries(fieldMap)) {
    if (colHeader === header) {
      const fieldDef = MASTER_FIELDS[masterKey]?.fields.find(f => f.name === fieldName);
      if (fieldDef) mappedFields.push(fieldDef.label);
    }
  }
  
  if (mappedFields.length > 0) {
    return `${header} [${mappedFields.join(', ')}]`;
  }
  return header;
}

function appendPreview(parent, rows, masterKey, state) {
  const wrap = createElement('div', '', 'xml-cii-master-preview');
  wrap.appendChild(createElement('h4', 'Preview'));
  if (!rows.length) {
    wrap.appendChild(createElement('div', 'No rows loaded.', 'xml-cii-phase-help'));
    parent.appendChild(wrap);
    return;
  }
  
  // Real-time search/filter input
  const searchInput = createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = '🔍 Search preview data...';
  if (searchInput.style) {
    Object.assign(searchInput.style, {
      width: '100%',
      padding: '8px 12px',
      marginBottom: '10px',
      borderRadius: '4px',
      border: '1px solid rgba(148, 163, 184, 0.2)',
      background: 'rgba(15, 23, 42, 0.3)',
      color: '#fff',
      fontSize: '0.88rem'
    });
  }
  wrap.appendChild(searchInput);
  
  const columns = previewColumns(rows, masterKey, state);
  const tableEl = createElement('table', '', 'xml-cii-master-preview-table');
  tableEl.append(tableHead(columns, masterKey, state));
  
  const tbodyEl = tableBody(columns, rows);
  tableEl.appendChild(tbodyEl);
  
  const scrollContainer = createElement('div');
  if (scrollContainer.style) {
    Object.assign(scrollContainer.style, {
      maxHeight: '350px',
      overflowY: 'auto',
      border: '1px solid rgba(148, 163, 184, 0.12)',
      borderRadius: '6px'
    });
  }
  scrollContainer.appendChild(tableEl);
  wrap.appendChild(scrollContainer);
  
  // Bind live search filtering
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.toLowerCase().trim();
    const trs = tbodyEl.querySelectorAll('tr');
    trs.forEach((tr) => {
      const textVal = tr.textContent.toLowerCase();
      if (!q || textVal.includes(q)) {
        tr.style.display = '';
      } else {
        tr.style.display = 'none';
      }
    });
  });
  
  parent.appendChild(wrap);
}

function previewColumns(rows, masterKey, state) {
  let config = {};
  try {
    config = JSON.parse(state.supportConfigJson || '{}');
  } catch {}
  const configKey = MASTER_FIELDS[masterKey]?.configKey;
  const fieldMap = config[configKey]?.fieldMap || {};
  
  const mappedCols = Object.values(fieldMap).filter(Boolean);
  
  if (mappedCols.length > 0) {
    const uniqueCols = [];
    for (const col of mappedCols) {
      if (!uniqueCols.includes(col)) uniqueCols.push(col);
    }
    return uniqueCols;
  }
  
  const keys = [];
  for (const row of rows) {
    for (const key of Object.keys(row || {})) {
      if (key !== '_rowIndex' && !key.startsWith('_') && !keys.includes(key)) {
        keys.push(key);
      }
    }
  }
  return keys.slice(0, 6);
}

function tableHead(columns, masterKey, state) {
  const thead = createElement('thead');
  const row = createElement('tr');
  for (const col of columns) {
    const labelText = getHeaderLabel(col, masterKey, state);
    row.appendChild(createElement('th', labelText));
  }
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

function renderColumnMapping(master, state) {
  const masterKey = master.key;
  const fields = MASTER_FIELDS[masterKey]?.fields || [];
  const rawRows = state.masterContext?.rawRows?.[masterKey] || [];
  
  if (!rawRows.length) {
    return createElement('div', 'Import rows/file to configure field mapping.', 'xml-cii-phase-help');
  }
  
  const headers = [];
  for (const k of Object.keys(rawRows[0] || {})) {
    if (k !== '_rowIndex' && !headers.includes(k)) headers.push(k);
  }
  
  const wrap = createElement('div', '', 'xml-cii-master-column-mapping');
  wrap.appendChild(createElement('h4', 'Column Mapping'));
  
  const grid = createElement('div', '', 'xml-cii-mapping-grid');
  
  let config = {};
  try {
    config = JSON.parse(state.supportConfigJson || '{}');
  } catch {}
  const configKey = MASTER_FIELDS[masterKey].configKey;
  const fieldMap = config[configKey]?.fieldMap || {};
  
  for (const field of fields) {
    const label = createElement('label');
    const span = createElement('span');
    span.textContent = field.label;
    
    if (field.required) {
      const ast = createElement('span', '*', 'xml-cii-field-required-asterisk');
      span.appendChild(ast);
    }
    
    label.appendChild(span);
    
    const select = createElement('select');
    select.dataset.masterFieldMap = field.name;
    select.dataset.masterKey = masterKey;
    
    const optEmpty = createElement('option', '-- optional --');
    optEmpty.value = '';
    select.appendChild(optEmpty);
    
    const currentVal = fieldMap[field.name] || '';
    
    for (const h of headers) {
      const opt = createElement('option', h);
      opt.value = h;
      if (h === currentVal) opt.selected = true;
      select.appendChild(opt);
    }
    
    label.appendChild(select);
    grid.appendChild(label);
  }
  
  wrap.appendChild(grid);
  return wrap;
}

function renderMasterCard(master, state) {
  const card = createElement('section', '', 'xml-cii-master-card');
  card.dataset.master = master.key;
  card.appendChild(createElement('h3', master.label));
  
  const fileLabel = createElement('label', 'Upload CSV/Excel/Text file:');
  const fileInput = createElement('input');
  fileInput.type = 'file';
  fileInput.accept = master.key === 'materialMap' ? '.csv,.xlsx,.xls,.txt,.map' : '.csv,.xlsx,.xls';
  fileInput.dataset.masterFile = master.key;
  fileLabel.appendChild(fileInput);
  card.appendChild(fileLabel);

  const metrics = createElement('div', '', 'xml-cii-master-metrics');
  if (metrics.style) metrics.style.marginTop = '8px';
  appendMetric(metrics, 'Source', master.sourceMetadata?.source || 'not-loaded');
  appendMetric(metrics, 'Status', masterStatusText(master));
  appendMetric(metrics, 'Rows', master.rowCount);
  card.appendChild(metrics);
  
  card.appendChild(renderColumnMapping(master, state));
  
  appendPreview(card, master.previewRows || [], master.key, state);
  appendDiagnostics(card, master.diagnostics || []);
  return card;
}

export function renderStandaloneImportMastersPanel(card, state, targetMasterKey = null) {
  const masters = state.masterContext ? summarizeStandaloneImportMasters(state.masterContext) : emptySummary();
  
  if (targetMasterKey) {
    const master = masters.find(m => m.key === targetMasterKey);
    if (master) {
      const actions = createElement('div', '', 'xml-cii-master-actions');
      if (actions.style) actions.style.marginBottom = '12px';
      
      const load = createElement('button', state.importMastersLoading ? 'Loading…' : 'Load default context');
      load.type = 'button';
      load.dataset.action = 'load-import-masters';
      load.disabled = !!state.importMastersLoading;
      
      const clear = createElement('button', 'Clear Master Context');
      clear.type = 'button';
      clear.dataset.action = 'clear-master-context';
      if (clear.style) clear.style.marginLeft = '8px';
      
      actions.append(load, clear);
      actions.appendChild(createElement('span', state.importMastersWriteBackStatus || '', 'xml-cii-phase-help'));
      card.appendChild(actions);
      
      card.appendChild(renderMasterCard(master, state));
    }
    return;
  }

  card.appendChild(createElement('p', 'Load Line List, Piping Class, Material Map, and Weights / Valve CA8 masters into standalone workflow config.', 'xml-cii-phase-help'));
  const actions = createElement('div', '', 'xml-cii-master-actions');
  const load = createElement('button', state.importMastersLoading ? 'Loading…' : 'Load / refresh master context');
  load.type = 'button';
  load.dataset.action = 'load-import-masters';
  load.disabled = !!state.importMastersLoading;
  
  const clear = createElement('button', 'Clear Master Context');
  clear.type = 'button';
  clear.dataset.action = 'clear-master-context';
  if (clear.style) clear.style.marginLeft = '8px';
  
  actions.append(load, clear);
  actions.appendChild(createElement('span', state.importMastersWriteBackStatus || 'Master rows not loaded into standalone config yet.', 'xml-cii-phase-help'));
  card.appendChild(actions);
  const grid = createElement('div', '', 'xml-cii-master-card-grid');
  for (const master of masters) grid.appendChild(renderMasterCard(master, state));
  card.appendChild(grid);
}
