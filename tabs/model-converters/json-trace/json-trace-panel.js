import { parseXmlCiiStagedJsonInputSource, stagedTraceToCsv } from '../../../converters/xml-cii2019-core/custom-input-api.js';
import { buildXmlTypedJsonTraceRows } from '../../../converters/xml-cii2019-core/json-trace-scope.js';
import { XML_CII_JSON_TRACE_STORE_KEY, xmlCiiJsonTraceSnapshot } from '../workflow/services/xml-cii-staged-source-service.js';

/**
 * Renders the XML->CII JSON Trace phase.
 * Inputs: staged JSON import text plus uploaded XML scope keys.
 * Outputs: XML-scoped JsonNode Trace rows and XML node wise trace rows.
 * Fallback: if no XML is loaded, the full staged JSON trace remains visible.
 */

const PREVIEW_LINES = 300;
const TRACE_RENDER_LIMIT = 2000;
const TABS = Object.freeze([
  ['import', 'Import'],
  ['json-node-trace', 'JsonNode Trace'],
  ['xml-node-trace', 'XML Node Wise Trace'],
]);
let memoryState = {};

function esc(value) { return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function text(value) { return String(value ?? '').trim(); }
function read() { const stored = xmlCiiJsonTraceSnapshot() || {}; return { ...stored, ...memoryState }; }
function save(state) {
  const next = { ...state, storageWarning: '' };
  memoryState = next;
  const { xmlTraceRows: _x, scopedTrace: _s, ...persist } = next;
  try { globalThis.localStorage?.setItem?.(XML_CII_JSON_TRACE_STORE_KEY, JSON.stringify(persist)); }
  catch {
    const warning = 'Full staged JSON is retained in memory only; browser storage could not persist this import.';
    memoryState = { ...next, storageWarning: warning };
    try { globalThis.localStorage?.setItem?.(XML_CII_JSON_TRACE_STORE_KEY, JSON.stringify({ ...persist, stagedJsonText: '', storageWarning: warning })); } catch {}
  }
  publishStateApi();
}
function state() {
  const current = read();
  current.active = current.active || 'import';
  current.stagedJsonText = current.stagedJsonText || '';
  current.trace = Array.isArray(current.trace) ? current.trace : [];
  current.fullTrace = Array.isArray(current.fullTrace) ? current.fullTrace : current.trace;
  current.scopedTrace = Array.isArray(current.scopedTrace) ? current.scopedTrace : [];
  current.xmlTraceRows = Array.isArray(current.xmlTraceRows) ? current.xmlTraceRows : [];
  current.sourceSummary = current.sourceSummary || {};
  current.traceScopeSummary = current.traceScopeSummary || null;
  current.xmlTraceKeySummary = current.xmlTraceKeySummary || null;
  current.useAsSource = current.useAsSource === true;
  return current;
}
function publishStateApi() { if (typeof window !== 'undefined') window.xmlCiiJsonTraceState = { getSnapshot: () => state() }; }
function previewText(value) {
  const lines = String(value ?? '').split(/\r\n|\n|\r/), visible = lines.slice(0, PREVIEW_LINES);
  return { text: visible.join('\n'), visibleLines: visible.length, totalLines: value ? lines.length : 0, truncated: lines.length > PREVIEW_LINES };
}
function importIcon() { return '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" style="width:14px;height:14px;vertical-align:-2px;"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></g></svg>'; }
function downloadText(name, value, type) { const anchor = document.createElement('a'); anchor.href = URL.createObjectURL(new Blob([value], { type })); anchor.download = name; anchor.click(); URL.revokeObjectURL(anchor.href); }
function compactTable(columns, rows, emptyText, tableAttr, countLabel) {
  const badge = countLabel ? `<div class="xml-cii-native-hint" style="margin-bottom:4px;">${esc(countLabel)}</div>` : '';
  if (!rows.length) return badge + `<div class="model-converters-workflow-detail-note">${esc(emptyText)}</div>`;
  const tAttr = tableAttr ? ` ${tableAttr}` : '';
  return badge + `<div class="xml-cii-native-table-wrap"><table class="xml-cii-native-table"${tAttr}><thead><tr>${columns.map((column) => `<th>${esc(column.label)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${columns.map((column) => `<td>${esc(row[column.key] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function filterBar(inputAttr, countAttr) { return `<div style="display:flex;align-items:center;gap:8px;margin:8px 0 4px;"><input type="search" placeholder="Filter rows…" style="padding:4px 8px;font-size:12px;background:#1a2840;color:#d7e6ff;border:1px solid #2a3f5f;border-radius:4px;width:240px;" ${inputAttr}><span style="font-size:12px;color:#8aaccc;" ${countAttr}></span></div>`; }
function activeTraceRows(current) { return current.traceScopeSummary ? (current.scopedTrace || []) : (current.trace || []); }
function jsonTraceRows(traceRows) {
  const mapped = traceRows.map((row, index) => ({
    jsonNodeNo: row.jsonNodeNo || row._jsonNodeNo || index + 1,
    matchType: row.xmlTraceScope || '', matchedToken: row.matchedToken || row.matchedText || '',
    jsonPath: row.sourcePath || '', objectType: row.sourceObjectType || '', branchName: row.branchName || '',
    nodeNumber: row.nodeNumber || '', field: row.field || '', sourceAttribute: row.sourceAttributeName || '',
    finalValue: row.finalValue || '', basis: row.matchMethod || row.parserRuleId || '', status: row.status || '',
  }));
  return { rows: mapped.slice(0, TRACE_RENDER_LIMIT), total: mapped.length };
}
function scopeSummaryText(current, total) {
  const s = current.traceScopeSummary;
  if (!s) return total > TRACE_RENDER_LIMIT ? `Showing first ${TRACE_RENDER_LIMIT} of ${total} rows. Use the filter below to find specific values.` : `${total} row${total !== 1 ? 's' : ''}`;
  return `XML-scoped rows ${s.scopedRows} of ${s.inputRows}; filtered out ${s.unmatchedRows}; branch ${s.branchMatches}, DTXR-POS ${s.dtxrPosMatches}, DTXR-PS ${s.dtxrPsMatches}.`;
}
function basisForDiagnostic(row) {
  const type = text(row.type), method = text(row.method);
  if (type === 'dtxr-pos') return method || 'DTXR_POS exact or within +/-6mm trace tolerance';
  if (type === 'dtxr-ps') return method || 'DTXR_PS exact';
  if (type === 'support-match') return method ? `Restraint type/gap by ${method}` : 'Restraint type/gap from staged support match';
  if (type === 'dtxr-pos-sif-zero') return 'SIF Tee/Olet keyword matched';
  if (/sideload-restraint/.test(type)) return method || 'Restraint side-load basis';
  return method || type;
}
function crossLinkJsonNodeNo(xmlRows, traceRows) {
  const pathMap = new Map();
  for (let i = 0; i < traceRows.length; i++) {
    const sp = traceRows[i].sourcePath || '';
    if (!sp) continue;
    const attrIdx = sp.indexOf('.attributes'), componentPath = attrIdx >= 0 ? sp.slice(0, attrIdx) : sp;
    if (!pathMap.has(componentPath)) pathMap.set(componentPath, traceRows[i].jsonNodeNo || i + 1);
  }
  for (const row of xmlRows) if (row.jsonPath && pathMap.has(row.jsonPath)) row.jsonNodeNo = String(pathMap.get(row.jsonPath));
}
function xmlTraceRowsFromDiagnostics(rows) {
  const wanted = new Set(['dtxr-pos', 'dtxr-ps', 'support-match', 'dtxr-pos-sif-zero']);
  return (Array.isArray(rows) ? rows : []).filter((row) => wanted.has(text(row.type)) || /^sideload-restraint/.test(text(row.type))).map((row) => ({ xmlNode: row.nodeNumber || '', componentType: row.componentType || '', jsonNodeNo: row.jsonNodeNo || '', jsonPath: row.sourcePath || '', field: row.type || '', basis: basisForDiagnostic(row), oldValue: row.oldValue || '', finalValue: row.finalValue || row.message || row.kind || '', status: row.status || 'applied', detail: row.message || row.kind || row.tags || '' }));
}
function importPanel(current, services) {
  const preview = previewText(current.stagedJsonText), useSource = services?.useJsonTraceSource === true || current.useAsSource === true, sourceName = current.sourceFileName ? ` from ${current.sourceFileName}` : '';
  const hint = preview.truncated ? `Previewing first ${preview.visibleLines} of ${preview.totalLines} lines${sourceName}. Full JSON is retained for trace and conversion.` : `Previewing ${preview.totalLines} line${preview.totalLines === 1 ? '' : 's'}${sourceName}.`;
  const scope = current.traceScopeSummary ? `<div class="xml-cii-native-hint">XML scope active: ${esc(scopeSummaryText(current, current.scopedTrace?.length || 0))}</div>` : '<div class="xml-cii-native-hint">XML scope will be applied when a main XML file is loaded and JsonNode Trace is parsed.</div>';
  return `<section class="xml-cii-native-card"><div class="model-converters-workflow-detail-title">Staged JSON Trace Source</div><div class="model-converters-workflow-detail-text">Import staged JSON used to enrich XML nodes, then build XML-scoped trace tables from the uploaded XML.</div><div class="xml-cii-native-toolbar"><label class="model-converters-download-btn" style="display:inline-flex;align-items:center;gap:6px;">${importIcon()}<span>Import staged JSON</span><input type="file" accept=".json,.JSON" data-json-trace-file hidden></label><button type="button" class="model-converters-run-btn" data-json-trace-parse>Parse XML-scoped JsonNode Trace</button><button type="button" class="model-converters-download-btn" data-json-trace-export-csv>Export trace CSV</button><label class="xml-cii-native-check" title="Use this imported JSON Trace source for Preview, Diagnostics, Weight Match, and Run."><input type="checkbox" data-json-trace-use-source ${useSource ? 'checked' : ''}> Use JSON Trace staged source</label></div><textarea data-json-trace-text ${preview.truncated ? 'readonly' : ''} data-json-trace-preview-only="${preview.truncated ? 'true' : 'false'}" spellcheck="false" placeholder="Paste staged JSON here or import a file" style="width:100%;min-height:210px;font-family:monospace;font-size:12px;">${esc(preview.text)}</textarea><div class="xml-cii-native-hint">${esc(hint)}</div>${scope}${current.storageWarning ? `<div class="xml-cii-native-hint" style="color:#fbbf24;">${esc(current.storageWarning)}</div>` : ''}<pre style="white-space:pre-wrap;max-height:150px;overflow:auto">${esc(JSON.stringify(current.sourceSummary || {}, null, 2))}</pre></section>`;
}
function jsonNodePanel(current) {
  const displayTrace = activeTraceRows(current), { rows, total } = jsonTraceRows(displayTrace), countLabel = scopeSummaryText(current, total);
  const cols = [{ key: 'jsonNodeNo', label: 'JsonNodeNo' }, { key: 'matchType', label: 'Match Type' }, { key: 'matchedToken', label: 'Matched Token/Text' }, { key: 'jsonPath', label: 'JSON Path' }, { key: 'objectType', label: 'Type' }, { key: 'branchName', label: 'Branch' }, { key: 'nodeNumber', label: 'Node' }, { key: 'field', label: 'Field' }, { key: 'sourceAttribute', label: 'Source Attr' }, { key: 'finalValue', label: 'Value' }, { key: 'basis', label: 'Basis' }, { key: 'status', label: 'Status' }];
  const title = current.traceScopeSummary ? 'XML-scoped JsonNode Trace' : 'JsonNode Trace';
  return `<section class="xml-cii-native-card"><div class="model-converters-workflow-detail-title">${title}</div><div class="model-converters-workflow-detail-text">Parsed staged JSON facts filtered by uploaded XML BranchName, DTXR_POS, DTXR_PS, and delimited PS support tags when XML is available.</div>${filterBar('data-json-trace-filter', 'data-json-trace-count')}${compactTable(cols, rows, 'Import and parse staged JSON to show JsonNode trace rows.', 'data-json-trace-table', countLabel)}</section>`;
}
function xmlNodePanel(current) {
  const allRows = current.xmlTraceRows || [], displayRows = allRows.slice(0, TRACE_RENDER_LIMIT), countLabel = allRows.length > TRACE_RENDER_LIMIT ? `Showing first ${TRACE_RENDER_LIMIT} of ${allRows.length} rows. Use the filter below to find specific values.` : `${allRows.length} row${allRows.length !== 1 ? 's' : ''}`;
  const cols = [{ key: 'xmlNode', label: 'XML Node' }, { key: 'componentType', label: 'Type' }, { key: 'jsonNodeNo', label: 'JsonNodeNo' }, { key: 'jsonPath', label: 'JSON Path' }, { key: 'field', label: 'Field' }, { key: 'basis', label: 'Basis' }, { key: 'oldValue', label: 'Old' }, { key: 'finalValue', label: 'Final' }, { key: 'status', label: 'Status' }, { key: 'detail', label: 'Detail' }];
  return `<section class="xml-cii-native-card"><div class="model-converters-workflow-detail-title">XML Node Wise Trace</div><div class="model-converters-workflow-detail-text">Run a dry diagnostic pass to show XML node to JSON evidence mapping. Coordinate trace review tolerance is +/-6mm.</div><div class="xml-cii-native-toolbar"><button type="button" class="model-converters-run-btn" data-json-trace-build-xml>Build XML node trace</button><button type="button" class="model-converters-download-btn" data-json-trace-export-xml>Export XML node trace JSON</button><span class="xml-cii-native-status-text">${esc(current.xmlTraceStatus || '')}</span></div>${filterBar('data-xml-trace-filter', 'data-xml-trace-count')}${compactTable(cols, displayRows, 'Build XML node trace after importing JSON and loading XML.', 'data-xml-trace-table', countLabel)}</section>`;
}
function activePanel(current, services) { if (current.active === 'json-node-trace') return jsonNodePanel(current); if (current.active === 'xml-node-trace') return xmlNodePanel(current); return importPanel(current, services); }
export function renderXmlCiiJsonTracePanel(services) {
  const current = state();
  return `<div class="xml-cii-native-phase-head"><div><div class="model-converters-workflow-detail-title">JSON Trace</div><div class="model-converters-workflow-detail-text">Audit how staged JSON enriches DTXR, restraints, gaps, SIF, and node attributes.</div></div></div><section class="xml-cii-native-card"><div class="xml-cii-native-master-tabs">${TABS.map(([id, label]) => `<button type="button" class="xml-cii-native-master-tab ${current.active === id ? 'is-active' : ''}" data-json-trace-tab="${id}"><span>${label}</span></button>`).join('')}</div></section>${activePanel(current, services || {})}`;
}
function collect(root) { const current = state(), textarea = root.querySelector('[data-json-trace-text]'); if (textarea && textarea.dataset.jsonTracePreviewOnly !== 'true') current.stagedJsonText = textarea.value; save(current); return current; }
async function currentXmlText(services) { const supplied = text(await services?.getCurrentXmlText?.()); if (supplied) return supplied; try { const doc = typeof document === 'undefined' ? null : document; const file = doc?.querySelector?.('#model-converters-primary-input')?.files?.[0]; return text(await file?.text?.()); } catch { return ''; } }
async function applyXmlScope(current, services) {
  const xmlText = await currentXmlText(services);
  current.scopedTrace = []; current.traceScopeSummary = null; current.xmlTraceKeySummary = null;
  if (!xmlText || !current.fullTrace?.length) return current;
  const scoped = buildXmlTypedJsonTraceRows({ xmlText, traceRows: current.fullTrace });
  current.scopedTrace = scoped.rows || [];
  current.traceScopeSummary = scoped.summary || null;
  current.xmlTraceKeySummary = { branches: scoped.xmlTraceKeys?.branches?.length || 0, nodes: scoped.xmlTraceKeys?.nodes?.length || 0, supportTags: scoped.xmlTraceKeys?.supportTags?.length || 0 };
  return current;
}
async function parse(root, services) { const current = collect(root); await parseCurrentState(current, services); current.active = 'json-node-trace'; save(current); rerender(root, services); }
async function parseCurrentState(current, services = {}) {
  try {
    const result = parseXmlCiiStagedJsonInputSource(current.stagedJsonText || '{}', {});
    current.trace = (result.trace || []).map((row, index) => ({ ...row, jsonNodeNo: index + 1 }));
    current.fullTrace = current.trace;
    current.sourceSummary = result.summary || {};
    current.parseError = '';
    await applyXmlScope(current, services);
  } catch (error) {
    current.trace = []; current.fullTrace = []; current.scopedTrace = [];
    current.sourceSummary = { error: error?.message || String(error) };
    current.parseError = error?.message || String(error);
    current.traceScopeSummary = null;
  }
  return current;
}
function enabledServices(services, enabled) { return { ...(services || {}), useJsonTraceSource: enabled === true }; }
function rerender(body, services) { body.innerHTML = renderXmlCiiJsonTracePanel(services || {}); bindXmlCiiJsonTracePanel(body, services || {}); }
export function bindXmlCiiJsonTracePanel(body, services) {
  body.querySelectorAll('[data-json-trace-tab]').forEach((button) => button.addEventListener('click', () => { const current = collect(body); current.active = button.dataset.jsonTraceTab || 'import'; save(current); rerender(body, services); }));
  body.querySelector('[data-json-trace-file]')?.addEventListener('change', async (event) => { const file = event.target.files?.[0]; if (!file) return; const current = collect(body); current.stagedJsonText = await file.text(); current.sourceFileName = file.name; current.useAsSource = true; await parseCurrentState(current, services); save(current); services?.setUseJsonTraceSource?.(true); rerender(body, enabledServices(services, true)); });
  body.querySelector('[data-json-trace-parse]')?.addEventListener('click', () => parse(body, services));
  body.querySelector('[data-json-trace-export-csv]')?.addEventListener('click', () => downloadText('xml_cii_json_node_trace.csv', stagedTraceToCsv(activeTraceRows(state())), 'text/csv'));
  body.querySelector('[data-json-trace-export-xml]')?.addEventListener('click', () => downloadText('xml_cii_xml_node_trace.json', JSON.stringify(state().xmlTraceRows || [], null, 2), 'application/json'));
  body.querySelector('[data-json-trace-use-source]')?.addEventListener('change', (event) => { const enabled = !!event.target.checked, current = collect(body); current.useAsSource = enabled; save(current); services?.setUseJsonTraceSource?.(enabled); rerender(body, enabledServices(services, enabled)); });
  function bindTableFilter(inputAttr, tableAttr, countAttr) { const input = body.querySelector(`[${inputAttr}]`); if (!input) return; input.addEventListener('input', () => { const q = input.value.toLowerCase(), table = body.querySelector(`[${tableAttr}]`); let shown = 0; table?.querySelectorAll('tbody tr').forEach((tr) => { const match = !q || tr.textContent.toLowerCase().includes(q); tr.style.display = match ? '' : 'none'; if (match) shown++; }); const countEl = body.querySelector(`[${countAttr}]`); if (countEl) countEl.textContent = q ? `${shown} match${shown !== 1 ? 'es' : ''} shown` : ''; }); }
  bindTableFilter('data-json-trace-filter', 'data-json-trace-table', 'data-json-trace-count');
  bindTableFilter('data-xml-trace-filter', 'data-xml-trace-table', 'data-xml-trace-count');
  body.querySelector('[data-json-trace-build-xml]')?.addEventListener('click', async () => {
    const current = collect(body);
    if (text(current.stagedJsonText)) services?.setUseJsonTraceSource?.(true);
    if (!current.trace?.length && text(current.stagedJsonText)) await parseCurrentState(current, services);
    current.xmlTraceStatus = 'Running diagnostics...'; save(current); rerender(body, text(current.stagedJsonText) ? enabledServices(services, true) : services);
    try { const rows = await services?.buildXmlNodeTrace?.(), next = state(); next.xmlTraceRows = xmlTraceRowsFromDiagnostics(rows || []); crossLinkJsonNodeNo(next.xmlTraceRows, next.fullTrace || next.trace || []); next.xmlTraceStatus = `Ready: ${next.xmlTraceRows.length} row(s)`; next.active = 'xml-node-trace'; save(next); }
    catch (error) { const next = state(); next.xmlTraceStatus = `Error: ${error?.message || error}`; save(next); }
    rerender(body, services);
  });
}
publishStateApi();
