import { buildInputXmlFromNodeXml } from './xml-cii-node-to-inputxml-core.js?v=20260709-5c-core-1';
import { build5CDiagnosticsViewModel } from './xml-cii-node-to-inputxml-diagnostics.js?v=20260709-5c-diagnostics-1';

const PANEL_STATE_KEY = '__xmlCiiTopology5CState';
const XML_SCAN_LIMIT = 200;

function text(value) { return value === undefined || value === null ? '' : String(value).trim(); }
function esc(value) { return text(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]); }
function parseJson(value) { try { const parsed = JSON.parse(String(value || '{}')); return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}; } catch { return {}; } }
function ensureState(target) {
  const state = target[PANEL_STATE_KEY] || {};
  target[PANEL_STATE_KEY] = state;
  if (state.applyEnrichment == null) state.applyEnrichment = true;
  if (state.pointPropertiesBasis == null) state.pointPropertiesBasis = 'TO';
  if (state.status == null) state.status = '';
  return state;
}
function candidateWorkflowXml(root) {
  const candidates = [];
  const push = (source, value) => {
    const raw = text(value);
    if (raw.includes('<Branch') && raw.includes('<Node') && raw.length > 200) candidates.push({ source, xmlText: raw });
  };
  const scope = root || document;
  scope.querySelectorAll?.('textarea,input[type="hidden"]').forEach((el, index) => push(`workflow-dom-${index}`, el.value || el.textContent));
  try {
    const payload = JSON.parse(localStorage.getItem('xmlCii2019.matchedPreview.lastDiagnostics.v1') || '{}');
    push('latest-diagnostics.xmlText', payload.xmlText || payload.enrichedXmlText || payload.enrichedXml || payload.inputXml || payload.sourceXml);
  } catch {}
  try {
    for (let i = 0; i < Math.min(localStorage.length, XML_SCAN_LIMIT); i += 1) {
      const key = localStorage.key(i);
      if (!key || !/xml|cii|workflow|preview|diagnostic|source|input/i.test(key)) continue;
      push(`localStorage:${key}`, localStorage.getItem(key));
    }
  } catch {}
  candidates.sort((a, b) => b.xmlText.length - a.xmlText.length);
  return candidates[0] || null;
}
function sourceForState(root, state) {
  if (text(state.manualXml)) return { source: state.manualSourceName || 'manual paste/upload', xmlText: state.manualXml };
  return candidateWorkflowXml(root);
}
function downloadText(filename, value) {
  const blob = new Blob([String(value || '')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
function copyText(value) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(String(value || ''));
  const ta = document.createElement('textarea');
  ta.value = String(value || '');
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  ta.remove();
  return Promise.resolve();
}
function summaryCards(result) {
  const summary = result?.diagnostics?.summary || {};
  const cards = [
    ['Elements', summary.elementCount],
    ['Rigid', summary.rigidCount],
    ['SIF', summary.sifCount],
    ['Bends', summary.bendCount],
    ['Restraint nodes', summary.restraintNodeCount],
    ['Short fillers <50mm', summary.shortFillerCount],
  ];
  return `<div class="xml-cii-native-status-list">${cards.map(([label, value]) => `<div class="xml-cii-native-status-row ${Number(value || 0) ? 'is-ok' : 'is-warn'}"><span class="xml-cii-native-status-icon">${Number(value || 0) ? 'OK' : 'INFO'}</span><span>${esc(label)}</span><strong>${esc(value ?? 0)}</strong></div>`).join('')}</div>`;
}
function table(columns, rows, emptyText) {
  if (!rows.length) return `<div class="model-converters-workflow-detail-note">${esc(emptyText || 'No rows.')}</div>`;
  return `<div class="xml-cii-native-table-wrap"><table class="xml-cii-native-table"><thead><tr>${columns.map(([, label]) => `<th>${esc(label)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${columns.map(([key]) => `<td>${esc(typeof key === 'function' ? key(row) : row?.[key])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function diagnosticsSection(title, columns, rows, emptyText, open = false) {
  return `<details class="xml-cii-native-card" ${open ? 'open' : ''}><summary><strong>${esc(title)}</strong> <span style="color:#9aa8ba;">${Number(rows.length || 0).toLocaleString()} row(s)</span></summary>${table(columns, rows.slice(0, 1000), emptyText)}</details>`;
}
function diagnosticsPanel(result) {
  const vm = build5CDiagnosticsViewModel(result);
  const routeCols = [['branchName', 'Branch'], ['routeIndex', '#'], ['nodeNumber', 'XML node'], ['nodeName', 'NodeName'], ['componentType', 'Component'], ['componentRefNo', 'RefNo'], ['position', 'POS'], ['rigid', 'Rigid'], ['sif', 'SIF'], ['bend', 'Bend'], ['restraintCount', 'Rest']];
  const elemCols = [['index', '#'], ['from', 'From'], ['to', 'To'], ['lengthMm', 'Length mm'], ['deltaX', 'ΔX'], ['deltaY', 'ΔY'], ['deltaZ', 'ΔZ'], ['sourceDx', 'Source ΔX'], ['sourceDy', 'Source ΔY'], ['sourceDz', 'Source ΔZ'], ['branchName', 'Branch'], ['fromComponent', 'FROM comp'], ['toComponent', 'TO comp'], ['reason', 'Reason'], ['rigid', 'Rigid'], ['sif', 'SIF'], ['bend', 'Bend'], ['restraintCount', 'Rest']];
  const childCols = [['childType', 'Child'], ['from', 'From'], ['to', 'To'], ['sourceNode', 'Source node'], ['branchName', 'Branch'], ['componentType', 'Component'], ['detail', 'Detail']];
  const enrichCols = [['metric', 'Metric'], ['value', 'Value'], ['note', 'Note']];
  const warningCols = [['severity', 'Severity'], ['area', 'Area'], ['message', 'Message']];
  return `
    ${diagnosticsSection('Route selection audit — first available positive XML nodes', routeCols, vm.routeRows, 'No route rows selected.', true)}
    ${diagnosticsSection('Generated PIPINGELEMENT mapping audit', elemCols, vm.elementRows, 'No generated element rows.', true)}
    ${diagnosticsSection('Rigid / SIF / Bend / Restraint child generation audit', childCols, vm.childRows, 'No child rows generated.', false)}
    ${diagnosticsSection('Existing InputXML enrichment audit', enrichCols, vm.enrichmentRows, 'No enrichment counters returned.', false)}
    ${diagnosticsSection('Warnings / TOPO filler notices', warningCols, vm.warningRows, 'No warnings or filler notices.', vm.warningRows.length > 0)}`;
}
function outputValue(result, key) {
  if (key === 'diagnostics') return JSON.stringify(result?.diagnostics || {}, null, 2);
  if (key === 'diagnosticsViewModel') return JSON.stringify(build5CDiagnosticsViewModel(result), null, 2);
  return result?.[key] || '';
}
function outputBlock(label, dataKey, value, filename) {
  return `<details class="xml-cii-native-card"><summary><strong>${esc(label)}</strong> <span style="color:#9aa8ba;">${Number(String(value || '').length).toLocaleString()} chars</span></summary><div class="xml-cii-native-toolbar" style="margin:8px 0;gap:8px;"><button type="button" class="model-converters-download-btn" data-xml-cii-5c-copy="${esc(dataKey)}">Copy</button><button type="button" class="model-converters-download-btn" data-xml-cii-5c-download="${esc(dataKey)}" data-xml-cii-5c-filename="${esc(filename)}">Download</button></div><textarea readonly spellcheck="false" style="width:100%;min-height:260px;background:#07101f;color:#e6edf5;border:1px solid rgba(148,163,184,.35);border-radius:8px;padding:8px;font:11px ui-monospace,Consolas,monospace;">${esc(value || '')}</textarea></details>`;
}
function sourceCard(state, source) {
  return `<section class="xml-cii-native-card">
    <div class="model-converters-workflow-section-title">5C XML → InputXML Source</div>
    <div class="model-converters-workflow-detail-note" style="margin-bottom:8px;">Source: <strong>${esc(source?.source || 'none')}</strong>${state.status ? ` · ${esc(state.status)}` : ''}</div>
    <div class="xml-cii-native-toolbar" style="margin-bottom:8px;gap:8px;flex-wrap:wrap;">
      <input data-xml-cii-5c-file type="file" accept=".xml,.XML,text/xml,application/xml">
      <button type="button" class="model-converters-run-btn" data-xml-cii-5c-use-paste>Use paste/upload XML</button>
      <button type="button" class="model-converters-download-btn" data-xml-cii-5c-reset-source>Use workflow XML</button>
    </div>
    <textarea data-xml-cii-5c-paste spellcheck="false" placeholder="Optional: paste node-based XML here to override current workflow XML for 5C." style="width:100%;min-height:82px;background:#07101f;color:#e6edf5;border:1px solid rgba(148,163,184,.35);border-radius:8px;padding:8px;font:11px ui-monospace,Consolas,monospace;">${esc(state.manualXml || '')}</textarea>
  </section>`;
}
function actionsCard(state) {
  return `<section class="xml-cii-native-card">
    <div class="model-converters-workflow-section-title">Build XML node route → element InputXML</div>
    <div class="xml-cii-native-toolbar" style="gap:10px;flex-wrap:wrap;align-items:center;">
      <label class="model-converters-workflow-detail-note"><input data-xml-cii-5c-apply-enrichment type="checkbox" ${state.applyEnrichment ? 'checked' : ''}> apply existing InputXML enrichment</label>
      <label class="model-converters-workflow-detail-note">Point basis <select data-xml-cii-5c-point-basis style="background:#07101f;color:#e6edf5;border:1px solid rgba(148,163,184,.35);border-radius:6px;padding:4px 6px;"><option value="TO" ${state.pointPropertiesBasis === 'TO' ? 'selected' : ''}>TO</option><option value="FROM" ${state.pointPropertiesBasis === 'FROM' ? 'selected' : ''}>FROM</option></select></label>
      <button type="button" class="model-converters-run-btn" data-xml-cii-5c-build>Generate InputXML</button>
      <button type="button" class="model-converters-download-btn" data-xml-cii-5c-clear>Clear result</button>
    </div>
    <div class="xml-cii-native-hint">5C uses first available positive XML route nodes for FROM/TO, then calls the existing enriched InputXML module. Filler refinement remains audit-only in this phase.</div>
  </section>`;
}
function resultHtml(result) {
  if (!result) return `<section class="xml-cii-native-card"><div class="model-converters-workflow-detail-note">No 5C result yet. Click <strong>Generate InputXML</strong>.</div></section>`;
  const diagnosticsViewModelText = JSON.stringify(build5CDiagnosticsViewModel(result), null, 2);
  const outputs = [
    outputBlock('Core InputXML', 'coreInputXmlText', result.coreInputXmlText, '5c-core.input.xml'),
    outputBlock('Final enriched InputXML', 'finalInputXmlText', result.finalInputXmlText, '5c-final-enriched.input.xml'),
    outputBlock('Element side-load text', 'elementSideLoadText', result.elementSideLoadText, '5c-element-sideload.txt'),
    outputBlock('Diagnostics view model JSON', 'diagnosticsViewModel', diagnosticsViewModelText, '5c-diagnostics-view.json'),
    outputBlock('Raw diagnostics JSON', 'diagnostics', JSON.stringify(result.diagnostics || {}, null, 2), '5c-diagnostics-raw.json'),
  ].join('');
  return `
    <section class="xml-cii-native-card"><div class="model-converters-workflow-section-title">5C Summary</div>${summaryCards(result)}</section>
    ${diagnosticsPanel(result)}
    ${outputs}`;
}
function bindControls(target, root, state, options) {
  const rerender = () => renderXmlCiiTopology5CPanel(target, options);
  target.querySelector('[data-xml-cii-5c-apply-enrichment]')?.addEventListener('change', (event) => { state.applyEnrichment = !!event.target.checked; });
  target.querySelector('[data-xml-cii-5c-point-basis]')?.addEventListener('change', (event) => { state.pointPropertiesBasis = event.target.value === 'FROM' ? 'FROM' : 'TO'; });
  target.querySelector('[data-xml-cii-5c-use-paste]')?.addEventListener('click', () => {
    const value = target.querySelector('[data-xml-cii-5c-paste]')?.value || '';
    if (text(value)) { state.manualXml = value; state.manualSourceName = 'manual paste'; state.status = 'Manual XML selected.'; }
    rerender();
  });
  target.querySelector('[data-xml-cii-5c-reset-source]')?.addEventListener('click', () => {
    state.manualXml = ''; state.manualSourceName = ''; state.status = 'Workflow XML selected.'; rerender();
  });
  target.querySelector('[data-xml-cii-5c-file]')?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    state.manualXml = await file.text();
    state.manualSourceName = `upload:${file.name}`;
    state.status = `Uploaded ${file.name}.`;
    rerender();
  });
  target.querySelector('[data-xml-cii-5c-build]')?.addEventListener('click', () => {
    const source = sourceForState(root, state);
    if (!source) { state.status = 'No XML source found.'; rerender(); return; }
    const config = parseJson(options.supportConfigJson || '{}');
    try {
      state.result = buildInputXmlFromNodeXml(source.xmlText, {
        sourceName: source.source,
        supportConfigJson: options.supportConfigJson || '{}',
        applyEnrichment: state.applyEnrichment,
        pointPropertiesBasis: state.pointPropertiesBasis,
        defaultTeeSifType: config.defaultTeeSifType ?? 5,
      });
      const count = state.result?.diagnostics?.summary?.elementCount ?? 0;
      state.status = `Generated ${count} InputXML element(s).`;
    } catch (error) {
      state.result = null;
      state.status = `5C build failed: ${error?.message || String(error)}`;
    }
    rerender();
  });
  target.querySelector('[data-xml-cii-5c-clear]')?.addEventListener('click', () => { state.result = null; state.status = 'Result cleared.'; rerender(); });
  target.querySelectorAll('[data-xml-cii-5c-copy]').forEach((button) => button.addEventListener('click', async () => {
    const key = button.dataset.xmlCii5cCopy;
    await copyText(outputValue(state.result, key));
    state.status = `Copied ${key}.`;
    rerender();
  }));
  target.querySelectorAll('[data-xml-cii-5c-download]').forEach((button) => button.addEventListener('click', () => {
    const key = button.dataset.xmlCii5cDownload;
    const filename = button.dataset.xmlCii5cFilename || `${key}.txt`;
    downloadText(filename, outputValue(state.result, key));
  }));
}
export function renderXmlCiiTopology5CPanel(target, options = {}) {
  if (!target) return null;
  const root = options.root || target.closest?.('[data-xml-cii-workflow-root]') || target.closest?.('.model-converters-root') || document;
  const state = ensureState(target);
  const source = sourceForState(root, state);
  target.innerHTML = `
    <div class="xml-cii-native-phase-head"><div><div class="model-converters-workflow-detail-title">5C XML → InputXML</div><div class="model-converters-workflow-detail-text">Convert node-based XML into element-based CAESAR-II InputXML, then optionally apply existing InputXML enrichment.</div></div></div>
    ${sourceCard(state, source)}
    ${actionsCard(state)}
    ${resultHtml(state.result)}`;
  bindControls(target, root, state, options);
  return state.result || null;
}
