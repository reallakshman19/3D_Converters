import { MASTER_FIELDS } from './xml-cii-adapted-fields-config.js';
import { detectLineListFieldMap, normalizeLineListRow } from '../../../converters/xml-cii2019-core/linelist-mapping.js';
import { readTextFile } from '../xml-cii-workflow-ui-adapter.js';
import { prepareStandaloneImportMasters } from '../xml-cii-master-context.js';
import { applyStandaloneImportMastersContext, setStoredMaster, updateWorkflowState, updateMasterLastLoadedPath, getSavedMappingsForMaster, saveMappingForFile, findSmartMatchingMapping, setStoredJson, getStoredJson } from './xml-cii-adapted-state.js';
import { fuzzyAutoMapFields } from './xml-cii-adapted-fuzzy-mapper.js';

async function getXlsxModule() {
  // Import map resolves xlsx to the project-managed local ESM dependency.
  // The module namespace exposes read, write, utils, and the other SheetJS exports.
  if (typeof XLSX !== 'undefined' && typeof XLSX.read === 'function') return XLSX;
  try {
    const mod = await import('xlsx');
    if (mod && typeof mod.read === 'function') return mod;
    if (mod && mod.default && typeof mod.default.read === 'function') return mod.default;
  } catch (error) {
    throw new Error(`Local xlsx module could not be loaded: ${error?.message || String(error)}`);
  }
  throw new Error('Local xlsx module did not expose read/utils. Run npm install and refresh the page.');
}

async function parseMasterFileData(buffer, fileName, masterKey) {
  if (!buffer || buffer.byteLength === 0) throw new Error('File is empty (0 bytes).');
  const isXlsx = /\.(xlsx|xlsm|xlsb|xls|ods)$/i.test(fileName);
  if (isXlsx) {
    if (buffer.byteLength < 4) throw new Error('File is too small to be a valid spreadsheet.');
    const XLSX = await getXlsxModule();
    const data = new Uint8Array(buffer);
    let workbook;
    try {
      workbook = XLSX.read(data, { type: 'array', cellDates: false, raw: false });
    } catch (e) {
      console.error('[xlsx] XLSX.read failed for file:', fileName, e);
      throw e;
    }
    const sheetNames = (workbook && workbook.SheetNames) ? workbook.SheetNames : [];
    if (!sheetNames.length) throw new Error('Workbook contains no sheets.');
    const workbookData = {};
    for (const name of sheetNames) {
      const sheet = workbook.Sheets[name];
      workbookData[name] = sheet ? XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false }) : [];
    }
    const activeSheet = sheetNames[0];
    return { rawRows: workbookData[activeSheet] || [], sheetNames, activeSheet, workbookData };
  }
  let rawRows = [];
  const text = new TextDecoder('utf-8').decode(buffer);
  rawRows = masterKey === 'materialMap' && /\.(txt|map)$/i.test(fileName) ? parseMaterialMapText(text) : parseCsv(text);
  return { rawRows, sheetNames: [], activeSheet: '', workbookData: null };
}

function resolvePathToUrl(pathStr) {
  let normalized = pathStr.replace(/\\/g, '/');
  if (/^https?:\/\//i.test(normalized)) return normalized;
  const pathSegs = location.pathname.replace(/\\/g, '/').split('/').filter(Boolean);
  const parentIdx = normalized.indexOf('/CODE-4/');
  const wsIdx = normalized.indexOf('/3D_Converters/');
  const wsIdx2 = normalized.indexOf('/3D_Converters - Standalone/');
  let prefix = '';
  if (pathSegs.some(seg => seg.includes('3D_Converters')) && parentIdx !== -1) prefix = normalized.substring(0, parentIdx + 8);
  else if (wsIdx !== -1) prefix = normalized.substring(0, wsIdx + 15);
  else if (wsIdx2 !== -1) prefix = normalized.substring(0, wsIdx2 + 28);
  if (prefix) return new URL('/' + normalized.substring(prefix.length).replace(/^\/+/, ''), location.href).href;
  const pIdx = normalized.indexOf('CODE-4');
  if (pIdx !== -1) return new URL('../'.repeat(pathSegs.length - 1) + normalized.substring(pIdx + 7).replace(/^\/+/, ''), location.href).href;
  const viewerIdx = normalized.indexOf('/3D_Viewer-SS/');
  if (viewerIdx !== -1) return new URL('../'.repeat(pathSegs.length) + normalized.substring(viewerIdx).replace(/^\/+/, ''), location.href).href;
  return new URL(normalized, location.href).href;
}
function translateError(err, filename) {
  const m = err.message || '';
  const stack = err.stack ? '\nStack:\n' + err.stack.split('\n').slice(0, 6).join('\n') : '';
  if (m.includes("reading 'length'") || m.includes("Cannot read properties")) {
    return `Workbook structure is invalid or empty. If the file is open in Excel, close it and try again.${stack}`;
  }
  if (m.includes('CFB') || m.includes('xlsx module has no .read') || m.includes('Local xlsx module')) {
    return `XLSX parser failed to load. Run npm install in the converter project, refresh the page (Ctrl+F5), then re-upload.${stack}`;
  }
  if (m.includes('Fetch failed') || m.includes('500') || m.includes('403') || m.includes('Failed to fetch')) {
    return `Could not read file. If it is open in Excel, close it and retry.${stack}`;
  }
  return m + stack;
}



export function bindImportMastersEvents(container, stateRef, render) {
  container.querySelectorAll('[data-master-file]').forEach((input) => {
    input.addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const masterKey = input.dataset.masterFile;
      try {
        stateRef.current = updateWorkflowState(stateRef.current, { importMastersLoading: true });
        render();
        const buffer = await file.arrayBuffer();
        const parsed = await parseMasterFileData(buffer, file.name, masterKey);
        stateRef.current = updateMasterLastLoadedPath(stateRef.current, masterKey, file.name);
        const context = stateRef.current.masterContext || {};
        context.sheetNames = { ...(context.sheetNames || {}), [masterKey]: parsed.sheetNames };
        context.activeSheet = { ...(context.activeSheet || {}), [masterKey]: parsed.activeSheet };
        context.workbookData = { ...(context.workbookData || {}), [masterKey]: parsed.workbookData };
        stateRef.current.masterContext = context;
        importMasterRows(stateRef, masterKey, parsed.rawRows, file.name, render);
      } catch (err) {
        console.error('Failed to parse uploaded file:', err);
        stateRef.current = updateWorkflowState(stateRef.current, { importMastersLoading: false, importMastersWriteBackStatus: `Parse error: ${err.message}` });
        render();
        alert(`Failed to parse file: ${translateError(err, file.name)}`);
      }
    });
  });

  container.querySelectorAll('[data-action="fetch-master-path"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const masterKey = btn.dataset.masterKey;
      const pathInput = container.querySelector(`[data-master-path-input="${masterKey}"]`);
      if (!pathInput) return;
      const rawPath = pathInput.value.trim();
      const pathValue = rawPath.replace(/^"|"$/g, '');
      if (!pathValue) {
        alert('Please paste a file path first.');
        return;
      }
      const resolvedUrl = resolvePathToUrl(pathValue);
      const fileName = pathValue.split(/[\\/]/).pop();
      try {
        stateRef.current = updateWorkflowState(stateRef.current, { importMastersLoading: true });
        render();
        const busterUrl = resolvedUrl + (resolvedUrl.includes('?') ? '&' : '?') + '_nocache=' + Date.now();
        const response = await fetch(busterUrl, { cache: 'no-store' });
        if (!response.ok) throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
        const buffer = await response.arrayBuffer();
        const parsed = await parseMasterFileData(buffer, fileName, masterKey);
        stateRef.current = updateMasterLastLoadedPath(stateRef.current, masterKey, pathValue);
        const context = stateRef.current.masterContext || {};
        context.sheetNames = { ...(context.sheetNames || {}), [masterKey]: parsed.sheetNames };
        context.activeSheet = { ...(context.activeSheet || {}), [masterKey]: parsed.activeSheet };
        context.workbookData = { ...(context.workbookData || {}), [masterKey]: parsed.workbookData };
        stateRef.current.masterContext = context;
        importMasterRows(stateRef, masterKey, parsed.rawRows, fileName, render);
      } catch (err) {
        console.error('Failed to fetch/parse file:', err);
        stateRef.current = updateWorkflowState(stateRef.current, { importMastersLoading: false, importMastersWriteBackStatus: `Fetch error: ${err.message}` });
        render();
        let tips = /^[a-zA-Z]:/.test(pathValue) 
          ? "\n\nNote: Local drive letters require browser file permissions. Use 'Choose File' instead or copy file to project workspace."
          : "\n\nTroubleshooting tips:\n1. If file is open in Excel, close it.\n2. Ensure web server is running and file path is relative/correct.";
        alert(`Failed to fetch file: ${translateError(err, fileName)}${tips}`);
      }
    });
  });

  container.querySelectorAll('[data-master-sheet-select]').forEach((select) => {
    select.addEventListener('change', () => {
      const masterKey = select.dataset.masterSheetSelect;
      const selectedSheet = select.value;
      const context = stateRef.current.masterContext;
      if (!context || !context.workbookData || !context.workbookData[masterKey]) return;
      
      const rawRows = context.workbookData[masterKey][selectedSheet] || [];
      const filename = context.sourceMetadata?.[masterKey]?.source || 'unknown';
      
      context.activeSheet = { ...context.activeSheet, [masterKey]: selectedSheet };
      
      importMasterRows(stateRef, masterKey, rawRows, filename, render);
    });
  });

  container.querySelectorAll('[data-master-field-map]').forEach((select) => {
    select.addEventListener('change', () => {
      const masterKey = select.dataset.masterKey;
      const fieldName = select.dataset.masterFieldMap;
      const selectedValue = select.value;
      updateMasterFieldMap(stateRef, masterKey, fieldName, selectedValue, render);
    });
  });

  bindSaveMappingEvents(container, stateRef, render);
  bindApplyMappingEvents(container, stateRef, render);
}

function bindSaveMappingEvents(container, stateRef, render) {
  container.querySelectorAll('[data-action="save-master-mapping"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const masterKey = btn.dataset.masterKey;
      const context = stateRef.current.masterContext;
      const filename = context?.sourceMetadata?.[masterKey]?.source;
      if (!filename || filename === 'LocalStorage' || filename === 'not-loaded') {
        alert('Please import a master file first before saving the mapping.');
        return;
      }
      const config = context?.config || {};
      const def = { lineList: 'linelist', pipingClass: 'pipingClass', materialMap: 'material', weight: 'weight' }[masterKey];
      const fieldMap = config[def]?.fieldMap;
      if (!fieldMap || !Object.keys(fieldMap).length) {
        alert('No mappings configured to save.');
        return;
      }
      saveMappingForFile(masterKey, filename, fieldMap);
      showToast(`Successfully saved column mapping for: ${filename}`);
      render();
    });
  });
}

function bindApplyMappingEvents(container, stateRef, render) {
  container.querySelectorAll('[data-action="apply-saved-mapping"]').forEach((select) => {
    select.addEventListener('change', () => {
      const masterKey = select.dataset.masterKey;
      const selectedFilename = select.value;
      if (!selectedFilename) return;
      const context = stateRef.current.masterContext;
      if (!context) return;
      if (!context.rawRows) {
        context.rawRows = { lineList: [], pipingClass: [], materialMap: [], weight: [] };
      }
      if (!context.rawRows[masterKey] || !context.rawRows[masterKey].length) {
        context.rawRows[masterKey] = getStoredJson(`xml-cii-master-raw-${masterKey}`, []);
      }
      const rawRows = context.rawRows[masterKey];
      if (!rawRows || !rawRows.length) {
        alert('Please load a file first.');
        select.value = '';
        return;
      }
      const savedMappings = getSavedMappingsForMaster(masterKey);
      const fieldMap = savedMappings[selectedFilename];
      if (!fieldMap) return;
      const config = context.config || {};
      const def = { lineList: { k: 'linelist', r: 'masterRows' }, pipingClass: { k: 'pipingClass', r: 'masterRows' }, materialMap: { k: 'material', r: 'mapRows' }, weight: { k: 'weight', r: 'masterRows' } }[masterKey];
      if (def) {
        const sec = { ...(config[def.k] || {}) };
        sec.fieldMap = fieldMap;
        config[def.k] = sec;
      }
      const normalized = mapRowsWithFieldMap(rawRows, fieldMap, masterKey);
      const rowsKey = { lineList: 'lineRows', pipingClass: 'pipingClassRows', materialMap: 'materialMapRows', weight: 'weightMasterRows' }[masterKey];
      if (rowsKey) context[rowsKey] = normalized;
      if (def) {
        config[def.k][def.r] = normalized;
      }
      const updatedContext = {
        ...context, config,
        rowCounts: { lineList: context.lineRows.length, pipingClass: context.pipingClassRows.length, materialMap: context.materialMapRows.length, weight: context.weightMasterRows.length },
        previewRows: { lineList: context.lineRows.slice(0, 150), pipingClass: context.pipingClassRows.slice(0, 150), materialMap: context.materialMapRows.slice(0, 150), weight: context.weightMasterRows.slice(0, 150) },
      };
      if (masterKey !== 'pipingClass') setStoredMaster(masterKey, normalized);
      stateRef.current = updateWorkflowState(stateRef.current, {
        masterContext: updatedContext, supportConfigJson: JSON.stringify(config, null, 2),
        importMastersWriteBackStatus: `Applied saved column mapping from ${selectedFilename}.`
      });
      render();
    });
  });
}

export async function loadImportMastersFromUi(stateRef, render) {
  if (stateRef.current.importMastersLoading) return;
  stateRef.current = updateWorkflowState(stateRef.current, { importMastersLoading: true }); render();
  try { const masterContext = await prepareStandaloneImportMasters({ supportConfigJson: stateRef.current.supportConfigJson }); stateRef.current = applyStandaloneImportMastersContext(stateRef.current, masterContext); }
  catch (error) { stateRef.current = updateWorkflowState(stateRef.current, { importMastersLoading: false, importMastersWriteBackStatus: error?.message || String(error) }); }
  render();
}

function parseCsv(txt) {
  const lines = txt.split(/\r?\n/).filter(l => l.trim()); if (!lines.length) return [];
  const hdrs = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
    return Object.fromEntries(hdrs.map((h, i) => [h, vals[i] || '']));
  });
}

function parseMaterialMapText(txt) {
  return String(txt ?? '').replace(/^\uFEFF/, '').split(/\r?\n/).map(l => l.trim()).filter(l => l && !/^\d{4}$/.test(l)).map((l, idx) => {
    const m = l.match(/^(\S+)\s+(.+)$/);
    return { _rowIndex: idx + 1, code: m ? m[1].trim() : '', material: m ? m[2].trim() : l };
  });
}

export function mapRowsWithFieldMap(rawRows, fieldMap, masterKey) {
  if (masterKey === 'lineList') {
    return (Array.isArray(rawRows) ? rawRows : []).map((row, index) => normalizeLineListRow(row, fieldMap, index));
  }
  return (Array.isArray(rawRows) ? rawRows : []).map((row, idx) => {
    const res = { ...row, _rowIndex: row?._rowIndex || (idx + 1) };
    for (const [fName, sHead] of Object.entries(fieldMap || {})) res[fName] = sHead ? (row[sHead] ?? '') : '';
    return res;
  });
}

export function importMasterRows(stateRef, key, rawRows, filename, render) {
  const context = stateRef.current.masterContext || {};
  if (!context.lineRows) context.lineRows = [];
  if (!context.pipingClassRows) context.pipingClassRows = [];
  if (!context.materialMapRows) context.materialMapRows = [];
  if (!context.weightMasterRows) context.weightMasterRows = [];
  if (!context.diagnostics) context.diagnostics = [];
  if (!context.config) context.config = JSON.parse(stateRef.current.supportConfigJson || '{}');
  const config = context.config || {};
  
  const rows = Array.isArray(rawRows) ? rawRows : [];
  if (!context.rawRows) {
    context.rawRows = { lineList: [], pipingClass: [], materialMap: [], weight: [] };
  }
  context.rawRows[key] = rows;
  
  const headers = [];
  if (rows.length > 0) {
    for (const k of Object.keys(rows[0] || {})) {
      if (k !== '_rowIndex' && !headers.includes(k)) headers.push(k);
    }
  }
  
  const def = { lineList: { k: 'linelist', r: 'masterRows' }, pipingClass: { k: 'pipingClass', r: 'masterRows' }, materialMap: { k: 'material', r: 'mapRows' }, weight: { k: 'weight', r: 'masterRows' } }[key];
  let fieldMap = {};
  
  const savedMappings = getSavedMappingsForMaster(key);
  const matchedKey = findSmartMatchingMapping(filename, Object.keys(savedMappings));
  if (matchedKey) {
    fieldMap = savedMappings[matchedKey];
  } else {
    const fields = MASTER_FIELDS[key].fields;
    fieldMap = fuzzyAutoMapFields(headers, fields, rows);
  }
  
  if (def) {
    const sec = { ...(config[def.k] || {}) };
    sec.fieldMap = fieldMap;
    config[def.k] = sec;
  }
  
  const normalized = mapRowsWithFieldMap(rows, fieldMap, key);
  const rowsKey = { lineList: 'lineRows', pipingClass: 'pipingClassRows', materialMap: 'materialMapRows', weight: 'weightMasterRows' }[key];
  if (rowsKey) context[rowsKey] = normalized;
  
  if (def) {
    config[def.k][def.r] = normalized;
  }
  
  const updatedContext = {
    ...context, config,
    rowCounts: { lineList: context.lineRows.length, pipingClass: context.pipingClassRows.length, materialMap: context.materialMapRows.length, weight: context.weightMasterRows.length },
    previewRows: { lineList: context.lineRows.slice(0, 150), pipingClass: context.pipingClassRows.slice(0, 150), materialMap: context.materialMapRows.slice(0, 150), weight: context.weightMasterRows.slice(0, 150) },
    sourceMetadata: { ...context.sourceMetadata, [key]: { key, source: filename, sourceType: 'manual', status: normalized.length ? 'loaded' : 'empty', rowCount: normalized.length } }
  };
  
  if (key !== 'pipingClass') {
    setStoredMaster(key, normalized);
    setStoredJson(`xml-cii-master-raw-${key}`, rows);
    setStoredJson(`xml-cii-master-source-${key}`, filename);
    setStoredJson(`xml-cii-master-sheetnames-${key}`, context.sheetNames?.[key] || []);
    setStoredJson(`xml-cii-master-activesheet-${key}`, context.activeSheet?.[key] || '');
    setStoredJson(`xml-cii-master-workbook-${key}`, context.workbookData?.[key] || {});
  }
  stateRef.current = updateWorkflowState(stateRef.current, {
    masterContext: updatedContext, supportConfigJson: JSON.stringify(config, null, 2),
    importMastersWriteBackStatus: matchedKey 
      ? `Imported ${filename} (${normalized.length} rows) using saved mapping from ${matchedKey}.`
      : `Imported and auto-mapped ${filename} (${normalized.length} rows) into ${key}.`
  });
  render();
}

export function updateMasterFieldMap(stateRef, key, fieldName, selectedValue, render) {
  const context = stateRef.current.masterContext;
  if (!context) return;
  
  if (!context.rawRows) {
    context.rawRows = { lineList: [], pipingClass: [], materialMap: [], weight: [] };
  }
  if (!context.rawRows[key] || !context.rawRows[key].length) {
    context.rawRows[key] = getStoredJson(`xml-cii-master-raw-${key}`, []);
  }
  
  const rawRows = context.rawRows[key];
  if (!rawRows || !rawRows.length) return;
  
  const config = context.config || {};
  const def = { lineList: { k: 'linelist', r: 'masterRows' }, pipingClass: { k: 'pipingClass', r: 'masterRows' }, materialMap: { k: 'material', r: 'mapRows' }, weight: { k: 'weight', r: 'masterRows' } }[key];
  
  if (def) {
    const sec = { ...(config[def.k] || {}) };
    const fieldMap = { ...(sec.fieldMap || {}) };
    fieldMap[fieldName] = selectedValue;
    sec.fieldMap = fieldMap;
    config[def.k] = sec;
    
    const normalized = mapRowsWithFieldMap(rawRows, fieldMap, key);
    const rowsKey = { lineList: 'lineRows', pipingClass: 'pipingClassRows', materialMap: 'materialMapRows', weight: 'weightMasterRows' }[key];
    if (rowsKey) context[rowsKey] = normalized;
    config[def.k][def.r] = normalized;
    
    const updatedContext = {
      ...context, config,
      rowCounts: { lineList: context.lineRows.length, pipingClass: context.pipingClassRows.length, materialMap: context.materialMapRows.length, weight: context.weightMasterRows.length },
      previewRows: { lineList: context.lineRows.slice(0, 150), pipingClass: context.pipingClassRows.slice(0, 150), materialMap: context.materialMapRows.slice(0, 150), weight: context.weightMasterRows.slice(0, 150) },
    };
    
    if (key !== 'pipingClass') setStoredMaster(key, normalized);
    stateRef.current = updateWorkflowState(stateRef.current, {
      masterContext: updatedContext, supportConfigJson: JSON.stringify(config, null, 2),
      importMastersWriteBackStatus: `Updated column mapping for ${key}.${fieldName} -> ${selectedValue || '(none)'}.`
    });
    render();
  }
}

export function clearMasterContextFromUi(stateRef, render) {
  for (const k of ['lineList', 'materialMap', 'weight']) {
    setStoredMaster(k, null);
    setStoredJson(`xml-cii-master-raw-${k}`, null);
    setStoredJson(`xml-cii-master-source-${k}`, null);
    setStoredJson(`xml-cii-master-sheetnames-${k}`, null);
    setStoredJson(`xml-cii-master-activesheet-${k}`, null);
    setStoredJson(`xml-cii-master-workbook-${k}`, null);
  }
  let config = {};
  try { config = JSON.parse(stateRef.current.supportConfigJson || '{}'); } catch {}
  if (config.linelist) delete config.linelist.masterRows;
  if (config.pipingClass) delete config.pipingClass.masterRows;
  if (config.material) delete config.material.mapRows;
  if (config.weight) delete config.weight.masterRows;
  
  if (stateRef.current.masterContext) {
    stateRef.current.masterContext.rawRows = { lineList: [], pipingClass: [], materialMap: [], weight: [] };
  }
  
  stateRef.current = updateWorkflowState(stateRef.current, {
    masterContext: null, supportConfigJson: JSON.stringify(config, null, 2),
    importMastersWriteBackStatus: 'Master context cleared.'
  });
  render();
}

function showToast(msg) {
  const el = document.createElement('div'); el.textContent = msg; Object.assign(el.style, { position: 'fixed', bottom: '24px', right: '24px', background: '#10b981', color: '#fff', padding: '12px 24px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: '9999', transition: 'all 0.3s', fontSize: '0.88rem', fontFamily: 'sans-serif' });
  document.body.appendChild(el); setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3000);
}
