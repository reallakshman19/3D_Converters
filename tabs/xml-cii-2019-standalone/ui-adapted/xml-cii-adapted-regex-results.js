import { createElement } from './xml-cii-adapted-dom.js';
import { parseStandaloneRegexBranchSamples } from '../xml-cii-regex-tester.js';

function text(value, fallback = '') {
  const out = String(value ?? '').trim();
  return out || fallback;
}

function rowsOf(result, key) {
  return Array.isArray(result?.[key]) ? result[key] : [];
}

function fieldFor(header) {
  return {
    '#': 'sampleIndex',
    Source: 'source',
    Branchname: 'branchName',
    'Line Key': 'lineKey',
    Class: 'pipingClass',
    Rating: 'rating',
    Bore: 'bore',
    Status: 'status',
  }[header] || header;
}

function tableBody(headers, rows) {
  const body = createElement('tbody');
  for (const row of rows.slice(0, 1000)) {
    const tr = createElement('tr');
    for (const header of headers) tr.appendChild(createElement('td', text(row[fieldFor(header)])));
    body.appendChild(tr);
  }
  return body;
}

export function renderTable(headers, rows, emptyText) {
  if (!rows.length) return createElement('div', emptyText, 'xml-cii-phase-help');
  const tableEl = createElement('table', '', 'xml-cii-regex-table');
  const headRow = createElement('tr');
  for (const header of headers) headRow.appendChild(createElement('th', header));
  const thead = createElement('thead');
  thead.appendChild(headRow);
  tableEl.append(thead, tableBody(headers, rows));
  
  const wrapper = createElement('div');
  wrapper.style.maxHeight = '450px';
  wrapper.style.overflowY = 'auto';
  wrapper.appendChild(tableEl);
  return wrapper;
}

export function renderBranchSamples(parent, result, sourceText) {
  let samples = rowsOf(result, 'branchSamples');
  if (samples.length === 0 && sourceText) {
    samples = parseStandaloneRegexBranchSamples(sourceText);
  }
  parent.appendChild(renderTable(['#', 'Source', 'Branchname'], samples, 'No XML branch samples loaded.'));
}

export function renderMatched(parent, result) {
  parent.appendChild(renderTable(['#', 'Branchname', 'Line Key', 'Class', 'Rating', 'Bore', 'Status'], rowsOf(result, 'matchedRows'), 'No matched rows yet. Click Run Extraction.'));
}

export function renderRejected(parent, result) {
  parent.appendChild(renderTable(['#', 'Branchname', 'Line Key', 'Class', 'Rating', 'Bore', 'Status'], rowsOf(result, 'rejectedRows'), 'No rejected rows. All branch names parsed successfully.'));
}

export function renderDiagnostics(parent, result) {
  const pre = createElement('pre', JSON.stringify(result?.diagnostics || [], null, 2));
  Object.assign(pre.style, {
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    padding: '12px',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '0.8rem',
    overflowX: 'auto',
    maxHeight: '450px',
    overflowY: 'auto',
    color: '#38bdf8'
  });
  parent.appendChild(pre);
}

export function extractSizeFromBranch(branchName, delimiter = '-') {
  const cleaned = String(branchName || '').trim().replace(/^\/+/, '').replace(/\/B\d+$/i, '');
  const tokens = cleaned.split(delimiter).map(t => t.trim()).filter(Boolean);
  
  // Prioritize tokens with explicit size units like " or in or inch
  const unitSize = tokens.find(t => /^(?:\d+(?:\.\d+)?|\d+\s*\/\s*\d+)(?:\s*(?:in|inch|"))$/i.test(t));
  if (unitSize) return unitSize;
  
  // Fallback to numeric tokens without explicit units
  const sizeToken = tokens.find(t => /^(?:\d+(?:\.\d+)?|\d+\s*\/\s*\d+)(?:\s*(?:in|inch|"))?$/i.test(t));
  if (sizeToken) return sizeToken;
  
  const fallback = tokens.find(t => t.includes('"') || t.toLowerCase().includes('in'));
  return fallback || 'Unknown Size';
}

export function buildAdaptedJsonTraceTree(traceRows, delimiter = '-') {
  const branchMap = new Map();
  for (const row of traceRows) {
    const branchName = row.branchName || row.stagedBranchKey || row.xmlBranchKey || 'Unassigned branch';
    if (!branchMap.has(branchName)) {
      branchMap.set(branchName, { branchName, count: 0, sizes: new Map() });
    }
    const branchObj = branchMap.get(branchName);
    branchObj.count++;
    
    let size = extractSizeFromBranch(branchName, delimiter);
    if (size === 'Unknown Size' && row.stagedBore) {
      size = row.stagedBore;
    }
    if (!branchObj.sizes.has(size)) {
      branchObj.sizes.set(size, { size, count: 0, categories: new Map() });
    }
    const sizeObj = branchObj.sizes.get(size);
    sizeObj.count++;
    
    const scope = String(row.xmlTraceScope || row.matchType || '').toUpperCase();
    let cat = 'Other';
    if (scope.includes('POS')) cat = 'dtxr_pos';
    else if (scope.includes('PS')) cat = 'dtxr_ps';
    
    if (!sizeObj.categories.has(cat)) {
      sizeObj.categories.set(cat, { cat, count: 0, groups: new Map() });
    }
    const catObj = sizeObj.categories.get(cat);
    catObj.count++;
    
    const groupKey = row.posKey || row.psKey || 'unresolved';
    if (!catObj.groups.has(groupKey)) {
      catObj.groups.set(groupKey, { groupKey, label: groupKey, count: 0, rows: [] });
    }
    const grpObj = catObj.groups.get(groupKey);
    grpObj.count++;
    grpObj.rows.push(row);
  }
  
  return Array.from(branchMap.values()).map(b => ({
    branchName: b.branchName,
    count: b.count,
    sizes: Array.from(b.sizes.values()).map(s => ({
      size: s.size,
      count: s.count,
      categories: Array.from(s.categories.values()).map(c => ({
        cat: c.cat,
        count: c.count,
        groups: Array.from(c.groups.values()).map(g => ({
          label: g.label,
          count: g.count,
          rows: g.rows
        }))
      }))
    }))
  }));
}
