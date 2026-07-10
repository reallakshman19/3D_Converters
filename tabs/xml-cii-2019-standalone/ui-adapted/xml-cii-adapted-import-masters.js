import { summarizeStandaloneImportMasters, STANDALONE_IMPORT_MASTER_DEFS } from '../xml-cii-master-context.js';
import { createElement } from './xml-cii-adapted-dom.js';
import { MASTER_FIELDS } from './xml-cii-adapted-fields-config.js';
import { getSavedMappingsForMaster, findSmartMatchingMapping } from './xml-cii-adapted-state.js';
import { buildPreviewSearchRows, previewSearchText } from './xml-cii-adapted-import-preview-search.js';

export { buildPreviewSearchRows, previewSearchText } from './xml-cii-adapted-import-preview-search.js';

function text(value, fallback = '') {
  const out = String(value ?? '').trim();
  return out || fallback;
}

function appendMetric(p, l, v) { const i = createElement('div', '', 'xml-cii-master-metric'); i.append(createElement('span', l), createElement('strong', text(v, '0'))); p.appendChild(i); }

function appendDiagnostics(p, d) { const det = createElement('details', '', 'xml-cii-master-diagnostics'); det.append(createElement('summary', `Diagnostics (${d.length})`), createElement('pre', d.length ? JSON.stringify(d, null, 2) : 'No diagnostics.')); p.appendChild(det); }

function getHeaderLabel(header, masterKey, state) {
  let config = {}; try { config = JSON.parse(state.supportConfigJson || '{}'); } catch {}
  const fieldMap = config[MASTER_FIELDS[masterKey]?.configKey]?.fieldMap || {};
  const fieldDef = MASTER_FIELDS[masterKey]?.fields.find(f => f.name === header);
  if (fieldDef) return fieldMap[header] ? `${fieldDef.label} [${fieldMap[header]}]` : fieldDef.label;
  return header === 'lineKey' ? 'Line Key' : (header === 'densitySource' ? 'Density Source' : header);
}

function appendPreview(parent, master, state) {
  const masterKey = master.key;
  const rows = master.previewRows || [];
  const allRows = buildPreviewSearchRows(master, state);
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
  if (searchInput.style) Object.assign(searchInput.style, { width: '100%', padding: '8px 12px', marginBottom: '10px', borderRadius: '4px', border: '1px solid rgba(148, 163, 184, 0.2)', background: 'rgba(15, 23, 42, 0.3)', color: '#fff', fontSize: '0.88rem' });
  wrap.appendChild(searchInput);
  
  const columns = previewColumns(rows, masterKey, state);
  const tableEl = createElement('table', '', 'xml-cii-master-preview-table');
  tableEl.append(tableHead(columns, masterKey, state));
  
  const tbodyEl = tableBody(columns, rows);
  tableEl.appendChild(tbodyEl);
  
  const scrollContainer = createElement('div');
  if (scrollContainer.style) Object.assign(scrollContainer.style, { maxHeight: '350px', overflowY: 'auto', border: '1px solid rgba(148, 163, 184, 0.12)', borderRadius: '6px' });
  scrollContainer.appendChild(tableEl);
  wrap.appendChild(scrollContainer);
  
  // Bind live search filtering
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.toLowerCase().trim();
    const filtered = q ? allRows.filter(row => previewSearchText(row).includes(q)) : allRows;
    const sliceToRender = filtered.slice(0, 150);
    tbodyEl.innerHTML = '';
    for (const item of sliceToRender) {
      const tr = createElement('tr');
      for (const col of columns) tr.appendChild(createElement('td', text(item?.[col])));
      tbodyEl.appendChild(tr);
    }
  });
  
  parent.appendChild(wrap);
}

function previewColumns(rows, masterKey, state) {
  const fieldsDef = MASTER_FIELDS[masterKey]?.fields || [];
  const fieldNames = fieldsDef.map(f => f.name);
  const standardExtra = masterKey === 'lineList' ? ['lineKey'] : [];
  
  const sortedKeys = [];
  for (const name of [...standardExtra, ...fieldNames]) {
    if (!sortedKeys.includes(name)) sortedKeys.push(name);
  }
  
  let config = {};
  try { config = JSON.parse(state.supportConfigJson || '{}'); } catch {}
  const configKey = MASTER_FIELDS[masterKey]?.configKey;
  const fieldMap = config[configKey]?.fieldMap || {};
  const mappedRawHeaders = Object.values(fieldMap).filter(Boolean);
  
  const keys = [];
  for (const row of rows) {
    for (const key of Object.keys(row || {})) {
      if (
        key !== '_rowIndex' && 
        !key.startsWith('_') && 
        !keys.includes(key) && 
        !fieldNames.includes(key) && 
        !standardExtra.includes(key) &&
        !mappedRawHeaders.includes(key) &&
        key !== 'densitySource'
      ) {
        keys.push(key);
      }
    }
  }
  
  for (const key of keys) {
    if (!sortedKeys.includes(key) && sortedKeys.length < 30) sortedKeys.push(key);
  }
  
  if (masterKey === 'lineList' && !sortedKeys.includes('densitySource')) {
    sortedKeys.push('densitySource');
  }
  return sortedKeys;
}

function tableHead(columns, masterKey, state) {
  const thead = createElement('thead');
  const row = createElement('tr');
  for (const col of columns) {
    const labelText = getHeaderLabel(col, masterKey, state);
    const th = createElement('th');
    if (col === 'density' && masterKey === 'lineList') {
      const span = createElement('span', labelText);
      const infoIcon = createElement('span', ' ℹ️', 'xml-cii-density-info-icon');
      if (infoIcon.style) {
        Object.assign(infoIcon.style, {
          cursor: 'pointer',
          color: '#60a5fa',
          marginLeft: '4px'
        });
      }
      infoIcon.title = "Density Resolution Logic:\n" +
        "1. Manual Process Override density (if set)\n" +
        "2. If Phase is MIXED: Mixed Density -> Liquid Density\n" +
        "3. If Phase is GAS: Gas Density\n" +
        "4. If Phase is LIQUID: Liquid Density\n" +
        "5. Fallback: Density -> Mixed Density -> Gas Density -> Liquid Density";
      th.append(span, infoIcon);
    } else {
      th.textContent = labelText;
    }
    row.appendChild(th);
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

function buildColumnPreviewMap(rows, headers) {
  const previewMap = {};
  for (const header of headers) {
    const values = [];
    for (let index = 0; index < rows.length && values.length < 3; index += 1) {
      const value = rows[index]?.[header];
      if (value === undefined || value === null || String(value).trim() === '') continue;
      const textVal = String(value).trim();
      if (!values.includes(textVal)) values.push(textVal);
    }
    previewMap[header] = values.length ? `${header} | ${values.join(' | ')}` : header;
  }
  return previewMap;
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
  
  const previewMap = buildColumnPreviewMap(rawRows, headers);
  
  const wrap = createElement('div', '', 'xml-cii-master-column-mapping');
  const h4 = createElement('h4', 'Column Mapping');
  if (h4.style) Object.assign(h4.style, { display: 'inline-flex', alignItems: 'center', gap: '6px', margin: '0 0 12px 0' });
  
  const infoIcon = createElement('span', 'ⓘ', 'xml-cii-fuzzy-info-icon');
  infoIcon.title = `Fuzzy Logic Auto-Mapping Logic:\n` +
    `1. Exact/Fuzzy Header Pass (Score: 100-120):\n` +
    `   Matches column names against aliases directly (case-insensitive).\n\n` +
    `2. Label Row Content Pass (Score: 75-140):\n` +
    `   Scans Row 2-4 headers with length-weighted specific keyword matching:\n` +
    `   - Exact Match: +30 bonus\n` +
    `   - Starts With: +15 + keyword length (cap 30) bonus\n` +
    `   - Includes: +keyword length (cap 30) bonus\n\n` +
    `3. Data Type Value Fallback (Score: 60-75):\n` +
    `   Analyzes numeric values and pass-rates in unmapped columns.\n\n` +
    `4. Key Sharing:\n` +
    `   Allows Suffix (Key 2) to share the Line Seq No. column.`;
  if (infoIcon.style) {
    Object.assign(infoIcon.style, {
      cursor: 'help',
      fontSize: '1rem',
      color: '#3b82f6',
      fontWeight: 'bold',
      display: 'inline-block',
      lineHeight: '1'
    });
  }
  h4.appendChild(infoIcon);
  wrap.appendChild(h4);

  const ctrl = createElement('div');
  if (ctrl.style) Object.assign(ctrl.style, { display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '12px' });
  const saveBtn = createElement('button', '💾 Save Current Mapping');
  saveBtn.type = 'button';
  saveBtn.dataset.action = 'save-master-mapping';
  saveBtn.dataset.masterKey = masterKey;
  if (saveBtn.style) Object.assign(saveBtn.style, { margin: '0', padding: '6px 12px', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid rgba(145,160,180,.25)', background: 'rgba(16,185,129,.25)', color: '#10b981', cursor: 'pointer' });
  
  const savedLabel = createElement('label', 'Apply Saved:');
  if (savedLabel.style) Object.assign(savedLabel.style, { display: 'flex', gap: '6px', alignItems: 'center', margin: '0', fontSize: '0.85rem' });
  const savedSelect = createElement('select');
  savedSelect.dataset.action = 'apply-saved-mapping';
  savedSelect.dataset.masterKey = masterKey;
  if (savedSelect.style) Object.assign(savedSelect.style, { padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(145,160,180,.25)', background: 'rgba(2,6,23,.75)', color: 'inherit' });
  
  const optDefault = createElement('option', '-- select saved mapping --');
  optDefault.value = '';
  savedSelect.appendChild(optDefault);
  
  const savedMappings = getSavedMappingsForMaster(masterKey);
  const currentFile = state.masterContext?.sourceMetadata?.[masterKey]?.source || '';
  const matchedKey = findSmartMatchingMapping(currentFile, Object.keys(savedMappings));
  
  for (const name of Object.keys(savedMappings)) {
    const opt = createElement('option', name);
    opt.value = name;
    if (name === matchedKey) opt.selected = true;
    savedSelect.appendChild(opt);
  }
  savedLabel.appendChild(savedSelect);
  ctrl.append(saveBtn, savedLabel);
  wrap.appendChild(ctrl);
  
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
      const opt = createElement('option', previewMap[h] || h);
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
  // Native file inputs keep showing "No file chosen" after a restore/load.
  // When rows are already loaded, hide that native text and show the actual
  // source next to the picker instead.
  const alreadyLoaded = Number(master.rowCount || 0) > 0;
  if (alreadyLoaded) {
    if (fileInput.style) Object.assign(fileInput.style, { color: 'transparent', maxWidth: '120px' });
    const loadedSpan = createElement('span', ` ✅ Loaded: ${text(master.sourceMetadata?.source, 'stored rows')} (${master.rowCount} rows)`);
    if (loadedSpan.style) Object.assign(loadedSpan.style, { color: '#8be28b', fontSize: '0.85rem', marginLeft: '8px' });
    fileLabel.appendChild(loadedSpan);
  }
  card.appendChild(fileLabel);

  const context = state.masterContext || {};
  const sheetNames = context.sheetNames?.[master.key] || [];
  const activeSheet = context.activeSheet?.[master.key] || '';
  if (sheetNames.length > 1) {
    const sheetRow = createElement('div', '', 'xml-cii-master-sheet-row');
    if (sheetRow.style) Object.assign(sheetRow.style, { display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px', marginBottom: '8px' });
    const sheetLabel = createElement('label', 'Select Active Sheet:');
    if (sheetLabel.style) Object.assign(sheetLabel.style, { display: 'flex', flexDirection: 'row', gap: '8px', alignItems: 'center', margin: '0', fontSize: '0.85rem' });
    const sheetSelect = createElement('select');
    sheetSelect.dataset.masterSheetSelect = master.key;
    if (sheetSelect.style) Object.assign(sheetSelect.style, { padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(145,160,180,.25)', background: 'rgba(2,6,23,.75)', color: 'inherit' });
    for (const name of sheetNames) {
      const opt = createElement('option', name);
      opt.value = name;
      if (name === activeSheet) opt.selected = true;
      sheetSelect.appendChild(opt);
    }
    sheetLabel.appendChild(sheetSelect);
    sheetRow.appendChild(sheetLabel);
    card.appendChild(sheetRow);
  }

  const pathRow = createElement('div', '', 'xml-cii-master-path-row');
  if (pathRow.style) Object.assign(pathRow.style, { display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px', marginBottom: '16px' });

  const pathLabel = createElement('label');
  if (pathLabel.style) Object.assign(pathLabel.style, { flex: '1', display: 'flex', flexDirection: 'column', gap: '4px', margin: '0' });
  const pathSpan = createElement('span', 'Or fetch from local path/URL:');
  if (pathSpan.style) pathSpan.style.fontSize = '0.85rem';
  pathLabel.appendChild(pathSpan);

  const pathInput = createElement('input');
  pathInput.type = 'text';
  pathInput.placeholder = 'Or paste local absolute/relative path or URL...';
  pathInput.dataset.masterPathInput = master.key;
  pathInput.value = state.masterLastLoadedPaths?.[master.key] || '';
  if (pathInput.style) Object.assign(pathInput.style, { width: '100%', boxSizing: 'border-box', border: '1px solid rgba(145,160,180,.25)', borderRadius: '8px', padding: '8px', color: 'inherit', background: 'rgba(2,6,23,.75)' });
  pathLabel.appendChild(pathInput);

  const fetchBtn = createElement('button', '🔄 Fetch');
  fetchBtn.type = 'button';
  fetchBtn.dataset.action = 'fetch-master-path';
  fetchBtn.dataset.masterKey = master.key;
  if (fetchBtn.style) Object.assign(fetchBtn.style, { margin: '0', alignSelf: 'flex-end', padding: '8px 16px', whiteSpace: 'nowrap', height: '35px', borderRadius: '8px', border: '1px solid rgba(145,160,180,.28)', background: 'rgba(30,64,175,.35)', color: 'inherit', cursor: 'pointer' });

  pathRow.append(pathLabel, fetchBtn);
  card.appendChild(pathRow);

  const metrics = createElement('div', '', 'xml-cii-master-metrics');
  if (metrics.style) metrics.style.marginTop = '8px';
  appendMetric(metrics, 'Source', master.sourceMetadata?.source || 'not-loaded');
  appendMetric(metrics, 'Status', masterStatusText(master));
  appendMetric(metrics, 'Rows', master.rowCount);
  card.appendChild(metrics);
  
  card.appendChild(renderColumnMapping(master, state));
  
  appendPreview(card, master, state);
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
