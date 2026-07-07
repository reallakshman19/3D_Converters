import { MASTER_FIELDS } from './xml-cii-adapted-fields-config.js';
import { detectLineListFieldMap, normalizeLineListRow } from '../../../converters/xml-cii2019-core/linelist-mapping.js';
import { readTextFile } from '../xml-cii-workflow-ui-adapter.js';
import { prepareStandaloneImportMasters } from '../xml-cii-master-context.js';
import { applyStandaloneImportMastersContext, setStoredMaster, updateWorkflowState } from './xml-cii-adapted-state.js';
import { fuzzyAutoMapFields } from './xml-cii-adapted-fuzzy-mapper.js';

async function getXlsxModule() {
  if (typeof XLSX !== 'undefined') return XLSX;
  try {
    return await import('xlsx');
  } catch (e) {
    return import('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm');
  }
}

export function bindImportMastersEvents(container, stateRef, render) {
  container.querySelectorAll('[data-master-file]').forEach((input) => {
    input.addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      
      const masterKey = input.dataset.masterFile;
      let rawRows = [];
      const isXlsx = /\.(xlsx|xlsm|xlsb|xls|ods)$/i.test(file.name);
      if (isXlsx) {
        try {
          const XLSX = await getXlsxModule();
          const buffer = await file.arrayBuffer();
          const workbook = XLSX.read(buffer, { type: 'array', cellDates: false, raw: false });
          const sheetNames = workbook.SheetNames || [];
          if (!sheetNames.length) throw new Error('Workbook contains no readable sheets.');
          const worksheet = workbook.Sheets[sheetNames[0]];
          rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });
        } catch (err) {
          console.error('Failed to parse Excel file:', err);
          alert('Failed to parse Excel file: ' + err.message);
          return;
        }
      } else {
        const text = await readTextFile(file);
        const isTextMap = masterKey === 'materialMap' && /\.(txt|map)$/i.test(file.name);
        if (isTextMap) {
          rawRows = parseMaterialMapText(text);
        } else {
          rawRows = parseCsv(text);
        }
      }
      importMasterRows(stateRef, masterKey, rawRows, file.name, render);
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
}

export async function loadImportMastersFromUi(stateRef, render) {
  if (stateRef.current.importMastersLoading) return;
  stateRef.current = updateWorkflowState(stateRef.current, { importMastersLoading: true }); render();
  try { const masterContext = await prepareStandaloneImportMasters({ supportConfigJson: stateRef.current.supportConfigJson }); stateRef.current = applyStandaloneImportMastersContext(stateRef.current, masterContext); }
  catch (error) { stateRef.current = updateWorkflowState(stateRef.current, { importMastersLoading: false, importMastersWriteBackStatus: error?.message || String(error) }); }
  render();
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
  return lines.slice(1).map((line) => {
    const vals = line.split(',').map((v) => v.trim().replace(/^["']|["']$/g, ''));
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] || '']));
  });
}

function parseMaterialMapText(text) {
  return String(text ?? '')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '' && !/^\d{4}$/.test(line))
    .map((line, index) => {
      const match = line.match(/^(\S+)\s+(.+)$/);
      return {
        _rowIndex: index + 1,
        code: match ? match[1].trim() : '',
        material: match ? match[2].trim() : line,
      };
    });
}

export function mapRowsWithFieldMap(rawRows, fieldMap, masterKey) {
  if (masterKey === 'lineList') {
    return (Array.isArray(rawRows) ? rawRows : []).map((row, index) => normalizeLineListRow(row, fieldMap, index));
  }
  const rows = [];
  const list = Array.isArray(rawRows) ? rawRows : [];
  for (let index = 0; index < list.length; index++) {
    const row = list[index];
    const mappedRow = {
      ...row,
      _rowIndex: row?._rowIndex || (index + 1)
    };
    for (const [fieldName, sourceHeader] of Object.entries(fieldMap || {})) {
      if (sourceHeader) {
        mappedRow[fieldName] = row[sourceHeader] ?? '';
      } else {
        mappedRow[fieldName] = '';
      }
    }
    rows.push(mappedRow);
  }
  return rows;
}

export function importMasterRows(stateRef, key, rawRows, filename, render) {
  const context = stateRef.current.masterContext || { lineRows: [], pipingClassRows: [], materialMapRows: [], weightMasterRows: [], diagnostics: [], config: JSON.parse(stateRef.current.supportConfigJson || '{}') };
  const config = context.config || {};
  
  if (!context.rawRows) {
    context.rawRows = { lineList: [], pipingClass: [], materialMap: [], weight: [] };
  }
  context.rawRows[key] = rawRows;
  
  const headers = [];
  if (rawRows.length > 0) {
    for (const k of Object.keys(rawRows[0] || {})) {
      if (k !== '_rowIndex' && !headers.includes(k)) headers.push(k);
    }
  }
  
  const def = { lineList: { k: 'linelist', r: 'masterRows' }, pipingClass: { k: 'pipingClass', r: 'masterRows' }, materialMap: { k: 'material', r: 'mapRows' }, weight: { k: 'weight', r: 'masterRows' } }[key];
  let fieldMap = {};
  
  const fields = MASTER_FIELDS[key].fields;
  fieldMap = fuzzyAutoMapFields(headers, fields, rawRows);
  
  if (def) {
    const sec = { ...(config[def.k] || {}) };
    sec.fieldMap = fieldMap;
    config[def.k] = sec;
  }
  
  const normalized = mapRowsWithFieldMap(rawRows, fieldMap, key);
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
  
  if (key !== 'pipingClass') setStoredMaster(key, normalized);
  stateRef.current = updateWorkflowState(stateRef.current, {
    masterContext: updatedContext, supportConfigJson: JSON.stringify(config, null, 2),
    importMastersWriteBackStatus: `Imported and auto-mapped ${filename} (${normalized.length} rows) into ${key}.`
  });
  render();
}

export function updateMasterFieldMap(stateRef, key, fieldName, selectedValue, render) {
  const context = stateRef.current.masterContext;
  if (!context || !context.rawRows || !context.rawRows[key]) return;
  
  const rawRows = context.rawRows[key];
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
  for (const k of ['lineList', 'materialMap', 'weight']) setStoredMaster(k, null);
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
