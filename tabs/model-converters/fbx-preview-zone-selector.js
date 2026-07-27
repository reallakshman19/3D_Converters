// Add preview-only zone selection and filtered JSON download for FbxSourceGraph.v2.
// Neither action changes converter outputs, mappings, or audit evidence.
import { ModelConverters_3DModelConv_PreviewRenderer } from
  '../../converters/view/model-conv-preview-renderer.js?v=20260725-fbx-source-graph-preview-1';
import { buildFbxSourceGraphPreviewProject } from './fbx-source-graph-preview.js';
import { buildFbxSourceGraphZoneExport } from './fbx-source-graph-zone-export.js';

const EVENT_NAME = 'model-converters:preview-project-rendered';
const PATCH_MARKER = Symbol.for('model-converters.fbx-preview-zone-selector.v1');
const CONTROLLERS = new WeakMap();

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

function dispatchPreviewEvent(renderer, project) {
  const host = renderer?.container;
  if (!host?.dispatchEvent || typeof CustomEvent !== 'function') return;
  host.dispatchEvent(new CustomEvent(EVENT_NAME, {
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

function toolbarHtml() {
  return `
    <div data-fbx-preview-zone-wrap style="display:none;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 8px;color:#9cc5ff;font-size:12px;">
      <label style="display:flex;align-items:center;gap:8px;">
        <span>Preview zone</span>
        <select data-fbx-preview-zone style="min-width:220px;max-width:100%;background:#182334;color:#e6edf5;border:1px solid #31455f;border-radius:6px;padding:5px 8px;font-size:12px;"></select>
      </label>
      <button type="button" data-fbx-preview-zone-download class="model-converters-download-btn" disabled>Download selected zone JSON</button>
      <span data-fbx-preview-zone-count style="color:#9aa8ba;"></span>
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
    host,
    meta: container.querySelector('#model-converters-preview-meta'),
    wrap: card.querySelector('[data-fbx-preview-zone-wrap]'),
    select: card.querySelector('[data-fbx-preview-zone]'),
    download: card.querySelector('[data-fbx-preview-zone-download]'),
    count: card.querySelector('[data-fbx-preview-zone-count]'),
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
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload)], {
    type: 'application/json;charset=utf-8',
  }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function downloadSelectedZone(controller) {
  const state = controller.state;
  const zoneId = controller.select.value;
  if (!state?.graph || !zoneId) return;
  const zone = state.project.previewZones.find((item) => item.zoneId === zoneId);
  try {
    const payload = buildFbxSourceGraphZoneExport(state.graph, zoneId);
    triggerJsonDownload(payload, buildFbxPreviewZoneDownloadName(state.sourceName, zone?.label));
  } catch (error) {
    if (controller.meta) controller.meta.textContent = `Zone JSON download failed: ${error?.message || error}`;
  }
}

function bindControls(controller) {
  controller.select.addEventListener('change', () => renderSelectedZone(controller));
  controller.download.addEventListener('click', () => downloadSelectedZone(controller));
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

function hideController(controller) {
  controller.state = null;
  controller.wrap.style.display = 'none';
  controller.select.innerHTML = '';
  controller.download.disabled = true;
  controller.count.textContent = '';
}

function updateController(controller, project, renderer) {
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
  };
  controller.wrap.style.display = zones.length ? 'flex' : 'none';
  controller.select.value = project.selectedZoneId || '';
  controller.download.disabled = !project.selectedZoneId;
  controller.count.textContent = `${zones.length} zone${zones.length === 1 ? '' : 's'}`;
  queueMicrotask(() => {
    if (controller.state?.project === project && controller.meta) {
      controller.meta.textContent = buildFbxPreviewZoneMetaText(project);
    }
  });
}

export function installFbxPreviewZoneSelector(container) {
  if (!container || container.dataset.fbxPreviewZoneSelector === 'true') return;
  patchPreviewRenderer();
  container.dataset.fbxPreviewZoneSelector = 'true';
  container.addEventListener(EVENT_NAME, (event) => {
    const controller = ensureController(container);
    if (controller) updateController(controller, event.detail?.project, event.detail?.renderer);
  });
}
