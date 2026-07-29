import { ModelConverters_3DModelConv_PreviewRenderer } from
  '../../converters/view/model-conv-preview-renderer.js?v=20260725-fbx-source-graph-preview-1';
import { buildFbxSourceGraphPreviewProject } from './fbx-source-graph-preview.js';
import { buildFbxSourceGraphZoneExport } from './fbx-source-graph-zone-export.js';
import { buildFbxStagedJsonZoneExport } from './fbx-staged-json-zone-export.js';
import { getConverterById } from './converter-registry.js?v=20260617-basic-glb-3';
const PREVIEW_EVENT = 'model-converters:preview-project-rendered';
const OUTPUT_EVENT = 'model-converters:fbx-run-outputs';
const AUTO_PIPE_OUTPUT_EVENT = 'model-converters:fbx-auto-pipe-outputs';
const PATCH_MARKER = Symbol.for('model-converters.fbx-preview-zone-selector.v2');
const RUN_PATCH_MARKER = Symbol.for('model-converters.fbx-preview-zone-run.v1');
const CONTROLLERS = new WeakMap();
const RUN_OUTPUTS = new WeakMap();
const AUTO_PIPE_OUTPUTS = new WeakMap();
const RUN_SELECTIONS = new WeakMap();
const AUTO_SELECTED_GRAPHS = new WeakSet();
function pointSummary(project) {
  const displayed = Number(project?.displayedPointCount || project?.points?.length || 0);
  const source = Number(project?.sourcePointCount || displayed);
  return displayed === source ? `${displayed}` : `${displayed} of ${source}`;
}
export function buildFbxPreviewZoneMetaText(project) {
  const source = project?.previewSourceName || 'FBX source graph';
  const zone = project?.selectedZoneLabel || 'All zones';
  const zoneCount = Array.isArray(project?.previewZones) ? project.previewZones.length : 0;
  return `Preview source: ${source} | adapter: FbxSourceGraphPointPreview | zone: ${zone} | zones: ${zoneCount} | points: ${pointSummary(project)} | segments: 0 | nodes: 0 | supports: 0 | annotations: 0`;
}
function cleanFilePart(value, fallback) {
  const cleaned = String(value ?? '').trim().replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '');
  return cleaned || fallback;
}
export function buildFbxPreviewZoneDownloadName(sourceName, zoneLabel) {
  const source = cleanFilePart(sourceName, 'fbx-source');
  const zone = cleanFilePart(zoneLabel, 'selected-zone');
  return `${source}.${zone}.FbxSourceGraph.v2.json`;
}
export function buildFbxStagedZoneDownloadName(sourceName, zoneLabel) {
  const source = cleanFilePart(sourceName, 'fbx-source');
  const zone = cleanFilePart(zoneLabel, 'selected-zone');
  return `${source}.${zone}.staged.json`;
}
function dispatchPreviewEvent(renderer, project) {
  const host = renderer?.container;
  if (!host?.dispatchEvent || typeof CustomEvent !== 'function') return;
  host.dispatchEvent(new CustomEvent(PREVIEW_EVENT, {
    bubbles: true,
    detail: { project, renderer },
  }));
}
function patchPreviewRenderer() {
  const prototype = ModelConverters_3DModelConv_PreviewRenderer.prototype;
  if (prototype[PATCH_MARKER]) return;
  const original = prototype._3DModelConv_renderProject;
  prototype._3DModelConv_renderProject = function renderProjectWithZoneEvent(project) {
    const result = original.call(this, project);
    dispatchPreviewEvent(this, project);
    return result;
  };
  Object.defineProperty(prototype, PATCH_MARKER, { value: true });
}
function publishFbxRun(result) {
  if (typeof window === 'undefined' || typeof CustomEvent !== 'function') return;
  window.dispatchEvent(new CustomEvent(OUTPUT_EVENT, {
    detail: {
      outputs: Array.isArray(result?.outputs) ? result.outputs : [],
      conversionStatus: result?.conversionStatus || '',
    },
  }));
}
function patchFbxConverterRunner() {
  const converter = getConverterById('fbx_to_stagedjson');
  if (!converter || converter[RUN_PATCH_MARKER]) return;
  const original = converter.run;
  converter.run = async function runWithZoneOutputs(...args) {
    const result = await original.apply(this, args);
    publishFbxRun(result);
    return result;
  };
  Object.defineProperty(converter, RUN_PATCH_MARKER, { value: true });
}
function toolbarHtml() {
  return `
    <div data-fbx-preview-zone-wrap style="display:none;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 8px;color:#9cc5ff;font-size:12px;">
      <label style="display:flex;align-items:center;gap:8px;">
        <span>Preview zone</span>
        <select data-fbx-preview-zone style="min-width:220px;max-width:100%;background:#182334;color:#e6edf5;border:1px solid #31455f;border-radius:6px;padding:5px 8px;font-size:12px;"></select>
      </label>
      <button type="button" data-fbx-zone-staged-download class="model-converters-download-btn" disabled>Download zone StagedJSON</button>
      <button type="button" data-fbx-zone-source-download class="model-converters-download-btn" disabled>Download zone source graph</button>
      <span data-fbx-preview-zone-count style="color:#9aa8ba;"></span>
      <span data-fbx-preview-zone-status style="color:#9aa8ba;"></span>
    </div>`;
}
function ensureController(container) {
  const cached = CONTROLLERS.get(container);
  if (cached && container.contains(cached.host)) return cached;
  if (cached) CONTROLLERS.delete(container);
  const card = container.querySelector?.('.model-converters-preview-card');
  const host = container.querySelector?.('#model-converters-preview-host');
  if (!card || !host) return null;
  host.insertAdjacentHTML('beforebegin', toolbarHtml());
  const controller = {
    container,
    host,
    meta: container.querySelector('#model-converters-preview-meta'),
    wrap: card.querySelector('[data-fbx-preview-zone-wrap]'),
    select: card.querySelector('[data-fbx-preview-zone]'),
    stagedDownload: card.querySelector('[data-fbx-zone-staged-download]'),
    sourceDownload: card.querySelector('[data-fbx-zone-source-download]'),
    count: card.querySelector('[data-fbx-preview-zone-count]'),
    status: card.querySelector('[data-fbx-preview-zone-status]'),
    state: null,
  };
  bindControls(controller);
  CONTROLLERS.set(container, controller);
  return controller;
}
function renderSelectedZone(controller) {
  const state = controller.state;
  if (!state?.graph || !state.renderer) return;
  const project = buildFbxSourceGraphPreviewProject(
    state.graph,
    state.sourceName,
    state.maxPoints,
    { zoneId: controller.select.value },
  );
  state.renderer._3DModelConv_renderProject(project);
}
function triggerJsonDownload(payload, fileName) {
  const text = `${JSON.stringify(payload, null, 2)}\n`;
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
function selectedZone(controller) {
  const zoneId = controller.select.value;
  const zone = controller.state?.project?.previewZones?.find((item) => item.zoneId === zoneId);
  return { zoneId, zone };
}
function reportDownloadError(controller, label, error) {
  if (controller.meta) controller.meta.textContent = `${label} failed: ${error?.message || error}`;
}
function downloadSelectedSource(controller) {
  const state = controller.state;
  const { zoneId, zone } = selectedZone(controller);
  if (!state?.graph || !zoneId) return;
  try {
    const payload = buildFbxSourceGraphZoneExport(state.graph, zoneId);
    triggerJsonDownload(payload, buildFbxPreviewZoneDownloadName(state.sourceName, zone?.label));
  } catch (error) {
    reportDownloadError(controller, 'Zone source-graph download', error);
  }
}
function downloadSelectedStaged(controller) {
  const state = controller.state;
  const { zoneId, zone } = selectedZone(controller);
  if (!state?.graph || !state.stagedRun || !zoneId) return;
  try {
    const payload = buildFbxStagedJsonZoneExport(
      state.graph,
      state.stagedRun.branches,
      zoneId,
    );
    triggerJsonDownload(payload, buildFbxStagedZoneDownloadName(state.sourceName, zone?.label));
  } catch (error) {
    reportDownloadError(controller, 'Zone StagedJSON download', error);
  }
}
function bindControls(controller) {
  controller.select.addEventListener('change', () => renderSelectedZone(controller));
  controller.sourceDownload.addEventListener('click', () => downloadSelectedSource(controller));
  controller.stagedDownload.addEventListener('click', () => downloadSelectedStaged(controller));
}
function optionElement(value, label) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  return option;
}
function setOptions(controller, project) {
  const zones = Array.isArray(project.previewZones) ? project.previewZones : [];
  const signature = zones.map((item) => `${item.zoneId}:${item.sourcePointCount}`).join('|');
  if (controller.state?.signature === signature) return signature;
  controller.select.replaceChildren(optionElement('', 'All zones'));
  for (const item of zones) {
    controller.select.appendChild(optionElement(
      item.zoneId, `${item.label} (${item.sourcePointCount.toLocaleString()})`,
    ));
  }
  return signature;
}
export function extractFbxStagedRun(detail) {
  const outputs = Array.isArray(detail?.outputs) ? detail.outputs : [];
  if (detail?.conversionStatus !== 'STAGEDJSON_PASS') return null;
  const output = outputs.find((item) => /\.staged\.json$/i.test(String(item?.name || '')));
  if (!output || typeof output.text !== 'string') return null;
  try {
    const branches = JSON.parse(output.text);
    return Array.isArray(branches) ? { branches, outputName: output.name } : null;
  } catch {
    return null;
  }
}
export function extractFbxAutoPipeRun(detail) {
  const run = extractFbxStagedRun(detail), zoneId = String(detail?.zoneId || '');
  return run && zoneId ? { ...run, zoneId, authority: 'internal-auto-pipe' } : null;
}
function parsedOutput(output) {
  if (!output || typeof output.text !== 'string') return null;
  try { return JSON.parse(output.text); } catch { return null; }
}
function normalizedRecommendation(selection) {
  const zoneId = String(selection?.zoneId || '');
  if (!zoneId) return null;
  return { zoneId, label: String(selection?.label || zoneId),
    policy: String(selection?.policy || ''), rank: Number(selection?.rank || 0) };
}
function diagnosticValue(diagnostics, prefix) {
  const item = diagnostics.find((value) => String(value).startsWith(prefix));
  return item ? String(item).slice(prefix.length) : '';
}
export function extractFbxSelectedZoneRecommendation(detail) {
  const outputs = Array.isArray(detail?.outputs) ? detail.outputs : [];
  const classification = outputs.find((item) =>
    /\.selected-zone-classification-report\.json$/i.test(String(item?.name || '')));
  const classified = normalizedRecommendation(parsedOutput(classification)?.selectedZone);
  if (classified) return classified;
  const conversion = outputs.find((item) =>
    /\.fbx-conversion-report\.json$/i.test(String(item?.name || '')));
  const diagnostics = parsedOutput(conversion)?.diagnostics;
  if (!Array.isArray(diagnostics)) return null;
  const zoneId = diagnosticValue(diagnostics, 'SELECTED_ZONE_ID:');
  if (!zoneId) return null;
  return { zoneId,
    label: diagnosticValue(diagnostics, 'SELECTED_ZONE_LABEL:') || zoneId,
    policy: diagnosticValue(diagnostics, 'SELECTED_ZONE_POLICY:'),
    rank: Number(diagnosticValue(diagnostics, 'SELECTED_ZONE_RANK:') || 0) };
}
function activeStagedRun(container, project) {
  const auto = AUTO_PIPE_OUTPUTS.get(container);
  return auto?.zoneId === project?.selectedZoneId ? auto : RUN_OUTPUTS.get(container) || null;
}
function recommendationFor(controller) {
  const recommendation = RUN_SELECTIONS.get(controller.container);
  const zone = controller.state?.project?.previewZones?.find((item) =>
    item.zoneId === recommendation?.zoneId);
  return zone ? { ...recommendation, label: zone.label } : null;
}
function updateAvailability(controller) {
  const selected = Boolean(controller.state?.project?.selectedZoneId);
  const staged = Boolean(controller.state?.stagedRun);
  const recommendation = recommendationFor(controller);
  const prefix = recommendation?.zoneId === controller.state?.project?.selectedZoneId
    && AUTO_SELECTED_GRAPHS.has(controller.state?.graph)
    ? `Auto-selected governed zone: ${recommendation.label}. ` : '';
  controller.sourceDownload.disabled = !selected;
  controller.stagedDownload.disabled = !selected || !staged;
  controller.status.textContent = prefix + (staged
    ? controller.state.stagedRun.authority === 'internal-auto-pipe'
      ? 'Authorized PIPE-only internal StagedJSON is available.'
      : 'Authorized StagedJSON is available.'
    : 'Source graph only; valid external mapping or PIPE inference is required.');
}
function applyRecommendedZone(controller) {
  const state = controller.state, graph = state?.graph;
  if (!graph || state.project?.selectedZoneId || AUTO_SELECTED_GRAPHS.has(graph)) return false;
  const recommendation = recommendationFor(controller);
  if (!recommendation) return false;
  AUTO_SELECTED_GRAPHS.add(graph);
  controller.select.value = recommendation.zoneId;
  renderSelectedZone(controller);
  return true;
}
function refreshStagedState(container) {
  const controller = CONTROLLERS.get(container);
  if (!controller?.state) return;
  controller.state.stagedRun = activeStagedRun(container, controller.state.project);
  if (!applyRecommendedZone(controller)) updateAvailability(controller);
}
function hideController(controller) {
  controller.state = null;
  controller.wrap.style.display = 'none';
  controller.select.innerHTML = '';
  controller.sourceDownload.disabled = true;
  controller.stagedDownload.disabled = true;
  controller.count.textContent = '';
  controller.status.textContent = '';
}
function updateController(container, controller, project, renderer) {
  if (project?.id !== 'fbx-source-graph-preview' || !project.previewSourceGraph) {
    hideController(controller);
    return;
  }
  const zones = Array.isArray(project.previewZones) ? project.previewZones : [];
  const signature = setOptions(controller, project);
  controller.state = {
    graph: project.previewSourceGraph,
    sourceName: project.previewSourceName,
    maxPoints: project.previewMaxPoints,
    renderer,
    signature,
    project,
    stagedRun: activeStagedRun(container, project),
  };
  controller.wrap.style.display = zones.length ? 'flex' : 'none';
  controller.select.value = project.selectedZoneId || '';
  controller.count.textContent = `${zones.length} zone${zones.length === 1 ? '' : 's'}`;
  if (applyRecommendedZone(controller)) return;
  updateAvailability(controller);
  queueMicrotask(() => {
    if (controller.state?.project === project && controller.meta) {
      controller.meta.textContent = buildFbxPreviewZoneMetaText(project);
    }
  });
}
export function installFbxPreviewZoneSelector(container) {
  if (!container || container.dataset.fbxPreviewZoneSelector === 'true') return;
  patchPreviewRenderer();
  patchFbxConverterRunner();
  container.dataset.fbxPreviewZoneSelector = 'true';
  window.addEventListener(OUTPUT_EVENT, (event) => {
    RUN_OUTPUTS.set(container, extractFbxStagedRun(event.detail));
    const recommendation = extractFbxSelectedZoneRecommendation(event.detail);
    if (recommendation) RUN_SELECTIONS.set(container, recommendation);
    else RUN_SELECTIONS.delete(container);
    refreshStagedState(container);
  });
  window.addEventListener(AUTO_PIPE_OUTPUT_EVENT, (event) => {
    if (event.detail?.container !== container) return;
    AUTO_PIPE_OUTPUTS.set(container, extractFbxAutoPipeRun(event.detail));
    refreshStagedState(container);
  });
  container.addEventListener(PREVIEW_EVENT, (event) => {
    const controller = ensureController(container);
    if (controller) updateController(container, controller, event.detail?.project, event.detail?.renderer);
  });
}
