import { buildInputXmlFromNodeXml } from './xml-cii-node-to-inputxml-core.js?v=20260709-5c-core-2';
import { build5CDiagnosticsViewModel } from './xml-cii-node-to-inputxml-diagnostics.js?v=20260709-5c-diagnostics-1';

const PANEL_STATE_KEY = '__xmlCiiTopology5CState';
const XML_SCAN_LIMIT = 200;

function text(value) { return value === undefined || value === null ? '' : String(value).trim(); }
function esc(value) { return text(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]); }
function parseJson(value) { try { const parsed = JSON.parse(String(value || '{}')); return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}; } catch { return {}; } }
function clamp(value, min, max) { const n = Number(value); return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : min; }
function ensureState(target) {
  const state = target[PANEL_STATE_KEY] || {};
  target[PANEL_STATE_KEY] = state;
  if (state.applyEnrichment == null) state.applyEnrichment = true;
  if (state.pointPropertiesBasis == null) state.pointPropertiesBasis = 'TO';
  if (state.status == null) state.status = '';
  if (!state.canvasView) state.canvasView = { scale: 1, offsetX: 0, offsetY: 0 };
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
    ['Route elements', summary.routeElementCount],
    ['Rigid', summary.rigidCount],
    ['SIF', summary.sifCount],
    ['Bends', summary.bendCount],
    ['Restraint nodes', summary.restraintNodeCount],
    ['Short fillers <50mm', summary.shortFillerCount],
    ['Ray fillers', summary.rayFillerCount],
    ['Ray rejects', summary.fillerRejectedCount],
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
function pointOf(row) { return row?.position && Number.isFinite(Number(row.position.x)) && Number.isFinite(Number(row.position.y)) && Number.isFinite(Number(row.position.z)) ? row.position : null; }
function graphElements(result) { return Array.isArray(result?.elements) ? result.elements.filter((element) => pointOf(element.fromRow) && pointOf(element.toRow)) : []; }
function chooseAxes(points) {
  const axes = ['x', 'y', 'z'];
  const spans = axes.map((axis) => ({ axis, span: Math.max(...points.map((p) => p[axis])) - Math.min(...points.map((p) => p[axis])) })).sort((a, b) => b.span - a.span);
  return [spans[0]?.axis || 'x', spans[1]?.axis || 'y'];
}
function resetCanvasView(state) { state.canvasView = { scale: 1, offsetX: 0, offsetY: 0 }; }
function zoomCanvasView(state, factor, anchorX = null, anchorY = null, canvas = null) {
  const view = state.canvasView || { scale: 1, offsetX: 0, offsetY: 0 };
  const oldScale = clamp(view.scale || 1, 0.05, 80);
  const newScale = clamp(oldScale * factor, 0.05, 80);
  if (anchorX !== null && anchorY !== null && canvas) {
    const rect = canvas.getBoundingClientRect?.() || { width: 1, height: 1 };
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const ratio = newScale / oldScale;
    view.offsetX = anchorX - cx - (anchorX - cx - Number(view.offsetX || 0)) * ratio;
    view.offsetY = anchorY - cy - (anchorY - cy - Number(view.offsetY || 0)) * ratio;
  }
  view.scale = newScale;
  state.canvasView = view;
}
function canvasBlock(result) {
  const count = graphElements(result).length;
  return `<section class="xml-cii-native-card"><div class="model-converters-workflow-section-title">5C Generated Element Graph</div><div class="xml-cii-native-toolbar" style="gap:8px;flex-wrap:wrap;margin:8px 0;"><button type="button" class="model-converters-download-btn" data-xml-cii-5c-canvas-fit>Fit</button><button type="button" class="model-converters-download-btn" data-xml-cii-5c-canvas-zoom-in>Zoom +</button><button type="button" class="model-converters-download-btn" data-xml-cii-5c-canvas-zoom-out>Zoom -</button><button type="button" class="model-converters-download-btn" data-xml-cii-5c-canvas-reset>Reset view</button><span class="model-converters-workflow-detail-note">Wheel = zoom · drag = pan</span></div><div class="model-converters-workflow-detail-note" style="margin-bottom:8px;">Connected view of generated 5C elements. Solid = route, orange = first-pass short filler &lt;50mm, magenta dashed = second-pass ray filler.</div><canvas data-xml-cii-5c-canvas width="1100" height="360" style="width:100%;height:360px;background:#06111f;border:1px solid rgba(148,163,184,.35);border-radius:10px;cursor:grab;"></canvas><div class="xml-cii-native-hint">${count.toLocaleString()} drawable element(s). Uses source XML coordinates and auto-selects the two largest coordinate spans for projection.</div></section>`;
}
function draw5CCanvas(canvas, result, state = {}) {
  if (!canvas) return;
  const ctx = canvas.getContext?.('2d');
  if (!ctx) return;
  const rect = canvas.getBoundingClientRect?.() || { width: 1100, height: 360 };
  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(600, Math.floor((rect.width || 1100) * dpr));
  const h = Math.max(260, Math.floor((rect.height || 360) * dpr));
  canvas.width = w;
  canvas.height = h;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#06111f';
  ctx.fillRect(0, 0, w, h);
  const elements = graphElements(result);
  const points = elements.flatMap((element) => [pointOf(element.fromRow), pointOf(element.toRow)]).filter(Boolean);
  if (!points.length) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = `${12 * dpr}px ui-monospace, Consolas, monospace`;
    ctx.fillText('No drawable 5C element coordinates.', 24 * dpr, 42 * dpr);
    return;
  }
  const [ax, ay] = chooseAxes(points);
  const minX = Math.min(...points.map((p) => p[ax]));
  const maxX = Math.max(...points.map((p) => p[ax]));
  const minY = Math.min(...points.map((p) => p[ay]));
  const maxY = Math.max(...points.map((p) => p[ay]));
  const pad = 34 * dpr;
  const sx = (w - 2 * pad) / Math.max(1, maxX - minX);
  const sy = (h - 2 * pad) / Math.max(1, maxY - minY);
  const baseScale = Math.min(sx, sy);
  const centerX = w / 2;
  const centerY = h / 2;
  const view = state.canvasView || { scale: 1, offsetX: 0, offsetY: 0 };
  const viewScale = clamp(view.scale || 1, 0.05, 80);
  const offsetX = Number(view.offsetX || 0) * dpr;
  const offsetY = Number(view.offsetY || 0) * dpr;
  const baseProject = (p) => ({ x: pad + (p[ax] - minX) * baseScale, y: h - pad - (p[ay] - minY) * baseScale });
  const project = (p) => {
    const base = baseProject(p);
    return { x: centerX + (base.x - centerX) * viewScale + offsetX, y: centerY + (base.y - centerY) * viewScale + offsetY };
  };
  ctx.strokeStyle = 'rgba(148,163,184,.18)';
  ctx.lineWidth = 1 * dpr;
  const gridStep = 90 * dpr * viewScale;
  if (gridStep > 12) {
    const startX = ((offsetX % gridStep) + gridStep) % gridStep;
    const startY = ((offsetY % gridStep) + gridStep) % gridStep;
    for (let x = startX; x < w; x += gridStep) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = startY; y < h; y += gridStep) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  }
  for (const element of elements) {
    const a = project(pointOf(element.fromRow));
    const b = project(pointOf(element.toRow));
    const isRay = element.fillerType === 'ray' || element.isRayFiller;
    const isShort = element.fillerType === 'short' || element.isShortFiller;
    ctx.setLineDash(isRay ? [8 * dpr, 6 * dpr] : []);
    ctx.lineWidth = (isRay || isShort ? 2.5 : 1.6) * dpr;
    ctx.strokeStyle = isRay ? '#e879f9' : isShort ? '#f59e0b' : '#38bdf8';
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  ctx.setLineDash([]);
  const nodes = new Map();
  for (const element of elements) {
    nodes.set(String(element.from), { node: element.from, point: pointOf(element.fromRow) });
    nodes.set(String(element.to), { node: element.to, point: pointOf(element.toRow), fillerType: element.fillerType });
  }
  ctx.font = `${10 * dpr}px ui-monospace, Consolas, monospace`;
  for (const item of nodes.values()) {
    const p = project(item.point);
    if (p.x < -40 || p.x > w + 40 || p.y < -40 || p.y > h + 40) continue;
    ctx.fillStyle = item.fillerType === 'ray' ? '#e879f9' : '#e6edf5';
    ctx.beginPath(); ctx.arc(p.x, p.y, 3.4 * dpr, 0, Math.PI * 2); ctx.fill();
    ctx.fillText(String(item.node), p.x + 5 * dpr, p.y - 5 * dpr);
  }
  ctx.fillStyle = '#94a3b8';
  ctx.font = `${11 * dpr}px ui-monospace, Consolas, monospace`;
  ctx.fillText(`Projection: ${ax.toUpperCase()} / ${ay.toUpperCase()} · zoom=${viewScale.toFixed(2)}x · pan=${Math.round(Number(view.offsetX || 0))},${Math.round(Number(view.offsetY || 0))} · route=${result?.diagnostics?.summary?.routeElementCount ?? elements.length} · short=${result?.diagnostics?.summary?.shortFillerCount ?? 0} · ray=${result?.diagnostics?.summary?.rayFillerCount ?? 0}`, pad, 20 * dpr);
}
function bindCanvasNavigation(target, state) {
  const canvas = target.querySelector('[data-xml-cii-5c-canvas]');
  if (!canvas) return;
  const redraw = () => draw5CCanvas(canvas, state.result, state);
  if (state.canvasMouseMove) window.removeEventListener('mousemove', state.canvasMouseMove);
  if (state.canvasMouseUp) window.removeEventListener('mouseup', state.canvasMouseUp);
  canvas.onwheel = (event) => {
    event.preventDefault?.();
    const rect = canvas.getBoundingClientRect();
    const factor = event.deltaY < 0 ? 1.15 : 1 / 1.15;
    zoomCanvasView(state, factor, event.clientX - rect.left, event.clientY - rect.top, canvas);
    redraw();
  };
  canvas.onmousedown = (event) => {
    event.preventDefault?.();
    state.canvasDrag = { active: true, lastX: event.clientX, lastY: event.clientY };
    canvas.style.cursor = 'grabbing';
  };
  state.canvasMouseMove = (event) => {
    const drag = state.canvasDrag;
    if (!drag?.active) return;
    const view = state.canvasView || { scale: 1, offsetX: 0, offsetY: 0 };
    view.offsetX = Number(view.offsetX || 0) + event.clientX - drag.lastX;
    view.offsetY = Number(view.offsetY || 0) + event.clientY - drag.lastY;
    state.canvasView = view;
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    redraw();
  };
  state.canvasMouseUp = () => {
    if (state.canvasDrag) state.canvasDrag.active = false;
    canvas.style.cursor = 'grab';
  };
  window.addEventListener('mousemove', state.canvasMouseMove);
  window.addEventListener('mouseup', state.canvasMouseUp);
  target.querySelector('[data-xml-cii-5c-canvas-fit]')?.addEventListener('click', () => { resetCanvasView(state); redraw(); });
  target.querySelector('[data-xml-cii-5c-canvas-reset]')?.addEventListener('click', () => { resetCanvasView(state); redraw(); });
  target.querySelector('[data-xml-cii-5c-canvas-zoom-in]')?.addEventListener('click', () => { zoomCanvasView(state, 1.25); redraw(); });
  target.querySelector('[data-xml-cii-5c-canvas-zoom-out]')?.addEventListener('click', () => { zoomCanvasView(state, 1 / 1.25); redraw(); });
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
    <div class="xml-cii-native-hint">5C uses first available positive XML route nodes for FROM/TO. Short fillers are first-pass &lt;50mm route segments; ray fillers are second-pass dead-end hits within 5D against perpendicular route segments.</div>
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
    ${canvasBlock(result)}
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
      resetCanvasView(state);
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
  bindCanvasNavigation(target, state);
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
  draw5CCanvas(target.querySelector('[data-xml-cii-5c-canvas]'), state.result, state);
  return state.result || null;
}
