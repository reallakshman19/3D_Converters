import { buildInputXmlFromNodeXml } from './xml-cii-node-to-inputxml-core.js?v=20260709-5c-core-2';
import { build5CDiagnosticsViewModel } from './xml-cii-node-to-inputxml-diagnostics.js?v=20260709-5c-diagnostics-1';

const PANEL_STATE_KEY = '__xmlCiiTopology5CState';
const XML_SCAN_LIMIT = 200;
const EPS = 1e-9;

function text(value) { return value === undefined || value === null ? '' : String(value).trim(); }
function esc(value) { return text(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]); }
function parseJson(value) { try { const parsed = JSON.parse(String(value || '{}')); return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}; } catch { return {}; } }
function clamp(value, min, max) { const n = Number(value); return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : min; }
function fmt(value, places = 1) { const n = Number(value); return Number.isFinite(n) ? n.toFixed(places) : ''; }
function pointOf(row) { return row?.position && Number.isFinite(Number(row.position.x)) && Number.isFinite(Number(row.position.y)) && Number.isFinite(Number(row.position.z)) ? row.position : null; }
function sub(a, b) { return { x: (a?.x || 0) - (b?.x || 0), y: (a?.y || 0) - (b?.y || 0), z: (a?.z || 0) - (b?.z || 0) }; }
function mul(a, k) { return { x: (a?.x || 0) * k, y: (a?.y || 0) * k, z: (a?.z || 0) * k }; }
function mag(v) { return Math.hypot(v?.x || 0, v?.y || 0, v?.z || 0); }
function dist(a, b) { return mag(sub(a, b)); }
function elementBranchName(element) { return element?.branch?.branchName || element?.branchName || '(branch)'; }
function isRayElement(element) { return element?.fillerType === 'ray' || element?.isRayFiller; }
function isShortElement(element) { return element?.fillerType === 'short' || element?.isShortFiller; }
function elementType(element) { return isRayElement(element) ? 'ray' : isShortElement(element) ? 'short' : 'route'; }
function ensureState(target) {
  const state = target[PANEL_STATE_KEY] || {};
  target[PANEL_STATE_KEY] = state;
  if (state.applyEnrichment == null) state.applyEnrichment = true;
  if (state.pointPropertiesBasis == null) state.pointPropertiesBasis = 'TO';
  if (state.status == null) state.status = '';
  if (!state.view) {
    const legacy = state.canvasView || {};
    state.view = {
      zoom: clamp(legacy.scale || 1, 0.05, 80),
      panX: Number(legacy.offsetX || 0),
      panY: Number(legacy.offsetY || 0),
      yaw: -0.18,
      pitch: 0.08,
      dragging: false,
      mode: 'pan',
      x: 0,
      y: 0,
    };
  }
  if (state.showBranchLabels == null) state.showBranchLabels = true;
  if (state.showNodeLabels == null) state.showNodeLabels = true;
  if (state.showElementLabels == null) state.showElementLabels = false;
  if (state.showGrid == null) state.showGrid = true;
  if (state.showFillers == null) state.showFillers = true;
  if (state.fitMode == null) state.fitMode = 'route';
  if (state.navMode == null) state.navMode = 'pan';
  return state;
}
function looksLikeNodeXml(value) {
  const raw = text(value);
  return raw.length > 200 && /<Branch\b/i.test(raw) && /<Node\b/i.test(raw);
}
function candidateWorkflowXml(root, options = {}) {
  const candidates = [];
  const push = (source, value) => {
    const raw = text(value);
    if (looksLikeNodeXml(raw)) candidates.push({ source, xmlText: raw });
  };
  push('workflow-options.workflowXmlText', options.workflowXmlText);
  const scope = root || document;
  scope.querySelectorAll?.('textarea,input[type="hidden"]').forEach((el, index) => push(`workflow-dom-${index}`, el.value || el.textContent));
  try {
    const payload = JSON.parse(localStorage.getItem('xmlCii2019.matchedPreview.lastDiagnostics.v1') || '{}');
    push('latest-diagnostics.xmlText', payload.xmlText || payload.enrichedXmlText || payload.enrichedXml || payload.inputXml || payload.sourceXml);
  } catch {}
  try { push('5c-sourceXml', localStorage.getItem('xmlCii2019.5c.sourceXml.v1')); } catch {}
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
function sourceForState(root, state, options = {}) {
  if (text(state.manualXml)) return { source: state.manualSourceName || 'manual paste/upload', xmlText: state.manualXml };
  return candidateWorkflowXml(root, options);
}
function downloadText(filename, value, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([String(value || '')], { type: mimeType });
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
function inputXmlOutputText(result) { return text(result?.finalInputXmlText) || text(result?.coreInputXmlText); }
function outputBlock(label, dataKey, value, filename) {
  return `<details class="xml-cii-native-card"><summary><strong>${esc(label)}</strong> <span style="color:#9aa8ba;">${Number(String(value || '').length).toLocaleString()} chars</span></summary><div class="xml-cii-native-toolbar" style="margin:8px 0;gap:8px;"><button type="button" class="model-converters-download-btn" data-xml-cii-5c-copy="${esc(dataKey)}">Copy</button><button type="button" class="model-converters-download-btn" data-xml-cii-5c-download="${esc(dataKey)}" data-xml-cii-5c-filename="${esc(filename)}">Download</button></div><textarea readonly spellcheck="false" style="width:100%;min-height:260px;background:#07101f;color:#e6edf5;border:1px solid rgba(148,163,184,.35);border-radius:8px;padding:8px;font:11px ui-monospace,Consolas,monospace;">${esc(value || '')}</textarea></details>`;
}
function graphElements(result) {
  return Array.isArray(result?.elements) ? result.elements.filter((element) => pointOf(element.fromRow) && pointOf(element.toRow)) : [];
}
function createGraphModel(result) {
  const elements = graphElements(result);
  const branches = [];
  const branchMap = new Map();
  const nodes = new Map();
  elements.forEach((element, index) => {
    const branchName = elementBranchName(element);
    if (!branchMap.has(branchName)) {
      const branch = { branchName, branchIndex: branchMap.size, elements: [], firstPoint: null };
      branchMap.set(branchName, branch);
      branches.push(branch);
    }
    const branch = branchMap.get(branchName);
    branch.elements.push({ ...element, graphIndex: index + 1 });
    if (!branch.firstPoint) branch.firstPoint = pointOf(element.fromRow) || pointOf(element.toRow);
    nodes.set(String(element.from), { node: element.from, point: pointOf(element.fromRow), branchName, fillerType: element.fillerType || '' });
    nodes.set(String(element.to), { node: element.to, point: pointOf(element.toRow), branchName, fillerType: element.fillerType || '' });
  });
  return { result, elements, branches, nodes: [...nodes.values()] };
}
function boundPoints(model, fitMode = 'route') {
  const candidates = fitMode === 'all' ? model.elements : model.elements.filter((element) => !isRayElement(element));
  const points = candidates.flatMap((element) => [pointOf(element.fromRow), pointOf(element.toRow)]).filter(Boolean);
  if (points.length) return points;
  return model.elements.flatMap((element) => [pointOf(element.fromRow), pointOf(element.toRow)]).filter(Boolean);
}
function modelBounds(model, fitMode = 'route') {
  const points = boundPoints(model, fitMode);
  if (!points.length) return null;
  const min = { x: Math.min(...points.map((p) => p.x)), y: Math.min(...points.map((p) => p.y)), z: Math.min(...points.map((p) => p.z)) };
  const max = { x: Math.max(...points.map((p) => p.x)), y: Math.max(...points.map((p) => p.y)), z: Math.max(...points.map((p) => p.z)) };
  const center = { x: (min.x + max.x) / 2, y: (min.y + max.y) / 2, z: (min.z + max.z) / 2 };
  const span = Math.max(max.x - min.x, max.y - min.y, max.z - min.z, 1);
  return { min, max, center, span };
}
function makeProjector(canvas, model, state) {
  const rect = canvas.getBoundingClientRect?.() || { width: 1100, height: 640 };
  const bounds = modelBounds(model, state.fitMode || 'route');
  if (!bounds) return null;
  const width = Math.max(400, rect.width || 400);
  const height = Math.max(300, rect.height || 300);
  const view = state.view || { zoom: 1, panX: 0, panY: 0, yaw: -0.18, pitch: 0.08 };
  const baseScale = Math.min(width, height) * 0.78 / bounds.span;
  const cy = Math.cos(view.yaw || 0);
  const sy = Math.sin(view.yaw || 0);
  const cp = Math.cos(view.pitch || 0);
  const sp = Math.sin(view.pitch || 0);
  return (point) => {
    const dx = point.x - bounds.center.x;
    const dy = point.y - bounds.center.y;
    const dz = point.z - bounds.center.z;
    const rx = dx * cy - dy * sy;
    const ry = dx * sy + dy * cy;
    const rz = dz;
    const py = ry * cp - rz * sp;
    return {
      x: width / 2 + Number(view.panX || 0) + rx * baseScale * clamp(view.zoom || 1, 0.05, 80),
      y: height / 2 + Number(view.panY || 0) - py * baseScale * clamp(view.zoom || 1, 0.05, 80),
    };
  };
}
function drawLegend(ctx, width, height, state, summary = {}) {
  ctx.fillStyle = 'rgba(2,6,23,.78)';
  ctx.fillRect(12, height - 58, Math.min(760, width - 24), 44);
  ctx.font = '11px system-ui';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText(`Wheel = zoom · drag = ${state.navMode || 'pan'} · Shift/middle-drag = orbit · fit=${state.fitMode || 'route'} · zoom=${fmt(state.view?.zoom || 1, 2)}x`, 20, height - 38);
  ctx.fillStyle = '#60a5fa'; ctx.fillRect(20, height - 26, 18, 3);
  ctx.fillStyle = '#f59e0b'; ctx.fillRect(112, height - 26, 18, 3);
  ctx.fillStyle = '#e879f9'; ctx.fillRect(228, height - 26, 18, 3);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText(`route ${summary.routeElementCount ?? 0}`, 44, height - 22);
  ctx.fillText(`short ${summary.shortFillerCount ?? 0}`, 136, height - 22);
  ctx.fillText(`ray ${summary.rayFillerCount ?? 0}`, 252, height - 22);
}
function drawGrid(ctx, width, height) {
  ctx.strokeStyle = 'rgba(148,163,184,.12)';
  ctx.lineWidth = 1;
  const step = 80;
  for (let x = 0; x <= width; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
  for (let y = 0; y <= height; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
}
function drawElementLine(ctx, element, project, color) {
  const a = project(pointOf(element.fromRow));
  const b = project(pointOf(element.toRow));
  const isRay = isRayElement(element);
  const isShort = isShortElement(element);
  ctx.setLineDash(isRay ? [8, 6] : []);
  ctx.strokeStyle = isRay ? '#e879f9' : isShort ? '#f59e0b' : color;
  ctx.lineWidth = isRay || isShort ? 3.2 : 2.4;
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  ctx.setLineDash([]);
  return { a, b };
}
function draw5CCanvas(canvas, result, state = {}) {
  if (!canvas) return;
  const ctx = canvas.getContext?.('2d');
  if (!ctx) return;
  const rect = canvas.getBoundingClientRect?.() || { width: 1100, height: 640 };
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(400, rect.width || 400);
  const height = Math.max(300, rect.height || 300);
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#07101f';
  ctx.fillRect(0, 0, width, height);
  const model = createGraphModel(result);
  const project = makeProjector(canvas, model, state);
  if (!project || !model.elements.length) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui';
    ctx.fillText('No drawable 5C element coordinates. Build InputXML first.', 24, 42);
    return;
  }
  if (state.showGrid) drawGrid(ctx, width, height);
  const colors = ['#60a5fa', '#34d399', '#fbbf24', '#f472b6', '#a78bfa', '#fb7185', '#2dd4bf', '#c084fc'];
  for (const branch of model.branches) {
    const color = colors[branch.branchIndex % colors.length];
    for (const element of branch.elements) {
      if (!state.showFillers && (isRayElement(element) || isShortElement(element))) continue;
      const ends = drawElementLine(ctx, element, project, color);
      if (state.showElementLabels) {
        const mid = { x: (ends.a.x + ends.b.x) / 2, y: (ends.a.y + ends.b.y) / 2 };
        ctx.font = '10px system-ui';
        ctx.fillStyle = elementType(element) === 'route' ? 'rgba(226,232,240,.88)' : (isRayElement(element) ? '#e879f9' : '#fbbf24');
        ctx.fillText(`${element.from}->${element.to} ${fmt(element.lengthMm, 1)}mm`, mid.x + 4, mid.y - 4);
      }
    }
    if (state.showBranchLabels && branch.firstPoint) {
      const p = project(branch.firstPoint);
      ctx.font = '11px system-ui';
      ctx.fillStyle = color;
      ctx.fillText(branch.branchName, p.x + 7, p.y + 12);
    }
  }
  ctx.font = '10px system-ui';
  for (const item of model.nodes) {
    if (!item.point) continue;
    const p = project(item.point);
    if (p.x < -50 || p.x > width + 50 || p.y < -50 || p.y > height + 50) continue;
    const fill = item.fillerType === 'ray' ? '#e879f9' : item.fillerType === 'short' ? '#f59e0b' : '#e6edf5';
    ctx.beginPath(); ctx.arc(p.x, p.y, item.fillerType ? 4.2 : 3.4, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
    if (state.showNodeLabels) {
      ctx.fillStyle = fill;
      ctx.fillText(String(item.node), p.x + 5, p.y - 5);
    }
  }
  const summary = result?.diagnostics?.summary || {};
  drawLegend(ctx, width, height, state, summary);
}
function resetCanvasView(state, fitMode = 'route') {
  state.fitMode = fitMode;
  state.view = { zoom: 1, panX: 0, panY: 0, yaw: -0.18, pitch: 0.08, dragging: false, mode: 'pan', x: 0, y: 0 };
}
function setViewPreset(state, preset) {
  const presets = {
    iso: { yaw: -0.65, pitch: 0.55 },
    top: { yaw: 0, pitch: 1.2 },
    front: { yaw: 0, pitch: 0 },
    right: { yaw: Math.PI / 2, pitch: 0 },
  };
  const view = presets[preset] || presets.iso;
  state.view = { ...state.view, ...view, panX: 0, panY: 0, dragging: false };
}
function zoomView(state, factor) {
  state.view.zoom = clamp((state.view?.zoom || 1) * factor, 0.05, 80);
}
function canvasBlock(result, state) {
  const count = graphElements(result).length;
  return `<section class="xml-cii-native-card">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
      <div class="model-converters-workflow-section-title">5C GENERATED ELEMENT GRAPH</div>
      <div class="xml-cii-native-toolbar" style="gap:8px;flex-wrap:wrap;">
        <label class="model-converters-workflow-detail-note"><input data-xml-cii-5c-show-branches type="checkbox" ${state.showBranchLabels ? 'checked' : ''}> branch name</label>
        <label class="model-converters-workflow-detail-note"><input data-xml-cii-5c-show-nodes type="checkbox" ${state.showNodeLabels ? 'checked' : ''}> node label</label>
        <label class="model-converters-workflow-detail-note"><input data-xml-cii-5c-show-elements type="checkbox" ${state.showElementLabels ? 'checked' : ''}> element label</label>
        <label class="model-converters-workflow-detail-note"><input data-xml-cii-5c-show-fillers type="checkbox" ${state.showFillers ? 'checked' : ''}> fillers</label>
        <label class="model-converters-workflow-detail-note"><input data-xml-cii-5c-show-grid type="checkbox" ${state.showGrid ? 'checked' : ''}> grid</label>
        <button type="button" class="model-converters-download-btn" data-xml-cii-5c-nav-pan>Pan</button>
        <button type="button" class="model-converters-download-btn" data-xml-cii-5c-nav-orbit>Orbit</button>
        <button type="button" class="model-converters-download-btn" data-xml-cii-5c-zoom-in>Zoom +</button>
        <button type="button" class="model-converters-download-btn" data-xml-cii-5c-zoom-out>Zoom -</button>
        <button type="button" class="model-converters-download-btn" data-xml-cii-5c-view-iso>Iso</button>
        <button type="button" class="model-converters-download-btn" data-xml-cii-5c-view-top>Top</button>
        <button type="button" class="model-converters-download-btn" data-xml-cii-5c-view-front>Front</button>
        <button type="button" class="model-converters-download-btn" data-xml-cii-5c-view-right>Right</button>
        <button type="button" class="model-converters-download-btn" data-xml-cii-5c-fit-route>Fit route</button>
        <button type="button" class="model-converters-download-btn" data-xml-cii-5c-fit-all>Fit all</button>
        <button type="button" class="model-converters-download-btn" data-xml-cii-5c-reset-view>Reset view</button>
      </div>
    </div>
    <div class="model-converters-workflow-detail-note" style="margin:8px 0;">5B-style viewport of generated 5C elements. Branch colors = generated route. Orange = first-pass short filler &lt;50mm. Magenta dashed = second-pass ray filler.</div>
    <canvas data-xml-cii-5c-canvas style="width:100%;height:640px;border:1px solid rgba(148,163,184,.28);border-radius:10px;background:#07101f;cursor:grab;"></canvas>
    <div class="xml-cii-native-hint">${count.toLocaleString()} drawable element(s). Wheel = zoom · drag = pan · Shift/middle-drag = orbit.</div>
  </section>`;
}
function bindCanvasNavigation(target, state) {
  const canvas = target.querySelector('[data-xml-cii-5c-canvas]');
  if (!canvas) return;
  const redraw = () => draw5CCanvas(canvas, state.result, state);
  if (state.resizeObserver) { try { state.resizeObserver.disconnect(); } catch {} }
  if (state.canvasMouseMove) window.removeEventListener('mousemove', state.canvasMouseMove);
  if (state.canvasMouseUp) window.removeEventListener('mouseup', state.canvasMouseUp);
  canvas.onwheel = (event) => { event.preventDefault?.(); zoomView(state, event.deltaY < 0 ? 1.12 : 0.89); redraw(); };
  canvas.onmousedown = (event) => {
    state.view.dragging = true;
    state.view.mode = event.shiftKey || event.button === 1 ? 'orbit' : state.navMode || 'pan';
    state.view.x = event.clientX;
    state.view.y = event.clientY;
    canvas.style.cursor = state.view.mode === 'orbit' ? 'crosshair' : 'grabbing';
  };
  state.canvasMouseMove = (event) => {
    if (!state.view.dragging) return;
    const dx = event.clientX - state.view.x;
    const dy = event.clientY - state.view.y;
    state.view.x = event.clientX;
    state.view.y = event.clientY;
    if (state.view.mode === 'orbit') {
      state.view.yaw += dx * 0.008;
      state.view.pitch = clamp((state.view.pitch || 0) + dy * 0.006, -1.2, 1.2);
    } else {
      state.view.panX += dx;
      state.view.panY += dy;
    }
    redraw();
  };
  state.canvasMouseUp = () => { state.view.dragging = false; canvas.style.cursor = state.navMode === 'orbit' ? 'crosshair' : 'grab'; };
  window.addEventListener('mousemove', state.canvasMouseMove);
  window.addEventListener('mouseup', state.canvasMouseUp);
  if (typeof ResizeObserver !== 'undefined') {
    state.resizeObserver = new ResizeObserver(redraw);
    state.resizeObserver.observe(canvas);
  }
  canvas.style.cursor = state.navMode === 'orbit' ? 'crosshair' : 'grab';
  redraw();
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
      <button type="button" class="model-converters-run-btn" data-xml-cii-5c-build>Build InputXML</button>
      <button type="button" class="model-converters-download-btn" data-xml-cii-5c-download-inputxml ${inputXmlOutputText(state.result) ? '' : 'disabled'}>Download InputXML</button>
      <button type="button" class="model-converters-download-btn" data-xml-cii-5c-clear>Clear result</button>
    </div>
    <div class="xml-cii-native-hint">5C uses first available positive XML route nodes for FROM/TO. Short fillers are first-pass &lt;50mm route segments; ray fillers are second-pass dead-end hits within 5D against perpendicular route segments.</div>
  </section>`;
}
function resultHtml(result, state) {
  if (!result) return `<section class="xml-cii-native-card"><div class="model-converters-workflow-detail-note">No 5C result yet. Click <strong>Build InputXML</strong>.</div></section>`;
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
    ${canvasBlock(result, state)}
    ${diagnosticsPanel(result)}
    ${outputs}`;
}
function bindCanvasPanelControls(target, state) {
  const canvas = target.querySelector('[data-xml-cii-5c-canvas]');
  const redraw = () => { if (canvas) draw5CCanvas(canvas, state.result, state); };
  target.querySelector('[data-xml-cii-5c-show-branches]')?.addEventListener('change', (event) => { state.showBranchLabels = !!event.target.checked; redraw(); });
  target.querySelector('[data-xml-cii-5c-show-nodes]')?.addEventListener('change', (event) => { state.showNodeLabels = !!event.target.checked; redraw(); });
  target.querySelector('[data-xml-cii-5c-show-elements]')?.addEventListener('change', (event) => { state.showElementLabels = !!event.target.checked; redraw(); });
  target.querySelector('[data-xml-cii-5c-show-fillers]')?.addEventListener('change', (event) => { state.showFillers = !!event.target.checked; redraw(); });
  target.querySelector('[data-xml-cii-5c-show-grid]')?.addEventListener('change', (event) => { state.showGrid = !!event.target.checked; redraw(); });
  target.querySelector('[data-xml-cii-5c-nav-pan]')?.addEventListener('click', () => { state.navMode = 'pan'; if (canvas) canvas.style.cursor = 'grab'; redraw(); });
  target.querySelector('[data-xml-cii-5c-nav-orbit]')?.addEventListener('click', () => { state.navMode = 'orbit'; if (canvas) canvas.style.cursor = 'crosshair'; redraw(); });
  target.querySelector('[data-xml-cii-5c-zoom-in]')?.addEventListener('click', () => { zoomView(state, 1.2); redraw(); });
  target.querySelector('[data-xml-cii-5c-zoom-out]')?.addEventListener('click', () => { zoomView(state, 1 / 1.2); redraw(); });
  target.querySelector('[data-xml-cii-5c-view-iso]')?.addEventListener('click', () => { setViewPreset(state, 'iso'); redraw(); });
  target.querySelector('[data-xml-cii-5c-view-top]')?.addEventListener('click', () => { setViewPreset(state, 'top'); redraw(); });
  target.querySelector('[data-xml-cii-5c-view-front]')?.addEventListener('click', () => { setViewPreset(state, 'front'); redraw(); });
  target.querySelector('[data-xml-cii-5c-view-right]')?.addEventListener('click', () => { setViewPreset(state, 'right'); redraw(); });
  target.querySelector('[data-xml-cii-5c-fit-route]')?.addEventListener('click', () => { resetCanvasView(state, 'route'); redraw(); });
  target.querySelector('[data-xml-cii-5c-fit-all]')?.addEventListener('click', () => { resetCanvasView(state, 'all'); redraw(); });
  target.querySelector('[data-xml-cii-5c-reset-view]')?.addEventListener('click', () => { resetCanvasView(state, 'route'); redraw(); });
  try { bindCanvasNavigation(target, state); } catch (error) { state.status = `5C canvas navigation failed: ${error?.message || String(error)}`; }
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
    const source = sourceForState(root, state, options);
    if (!source) { state.status = 'No XML source found. Use workflow XML or paste/upload node-based XML.'; rerender(); return; }
    const config = parseJson(options.supportConfigJson || '{}');
    try {
      resetCanvasView(state, 'route');
      state.result = buildInputXmlFromNodeXml(source.xmlText, {
        sourceName: source.source,
        supportConfigJson: options.supportConfigJson || '{}',
        applyEnrichment: state.applyEnrichment,
        pointPropertiesBasis: state.pointPropertiesBasis,
        defaultTeeSifType: config.defaultTeeSifType ?? 5,
      });
      const count = state.result?.diagnostics?.summary?.elementCount ?? 0;
      state.status = `Built ${count} InputXML element(s).`;
    } catch (error) {
      state.result = null;
      state.status = `5C build failed: ${error?.message || String(error)}`;
    }
    rerender();
  });
  target.querySelector('[data-xml-cii-5c-download-inputxml]')?.addEventListener('click', () => {
    const value = inputXmlOutputText(state.result);
    if (!value) { state.status = 'No InputXML available yet. Build InputXML first.'; rerender(); return; }
    downloadText('5c-inputxml.xml', value, 'application/xml;charset=utf-8');
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
  bindCanvasPanelControls(target, state);
}
export function renderXmlCiiTopology5CPanel(target, options = {}) {
  if (!target) return null;
  const root = options.root || target.closest?.('[data-xml-cii-workflow-root]') || target.closest?.('.model-converters-root') || document;
  const state = ensureState(target);
  const source = sourceForState(root, state, options);
  target.innerHTML = `
    <div class="xml-cii-native-phase-head"><div><div class="model-converters-workflow-detail-title">5C XML → InputXML</div><div class="model-converters-workflow-detail-text">Convert node-based XML into element-based CAESAR-II InputXML, then optionally apply existing InputXML enrichment.</div></div></div>
    ${sourceCard(state, source)}
    ${actionsCard(state)}
    ${resultHtml(state.result, state)}`;
  bindControls(target, root, state, options);
  draw5CCanvas(target.querySelector('[data-xml-cii-5c-canvas]'), state.result, state);
  return state.result || null;
}
