// Add a preview-only zone selector for FbxSourceGraph.v2 point-cloud projects.
// The selector never changes converter outputs, mappings, or audit evidence.
import { ModelConverters_3DModelConv_PreviewRenderer } from
  '../../converters/view/model-conv-preview-renderer.js?v=20260725-fbx-source-graph-preview-1';
import { buildFbxSourceGraphPreviewProject } from './fbx-source-graph-preview.js';

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
    <label data-fbx-preview-zone-wrap style="display:none;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 8px;color:#9cc5ff;font-size:12px;">
      <span>Preview zone</span>
      <select data-fbx-preview-zone style="min-width:220px;max-width:100%;background:#182334;color:#e6edf5;border:1px solid #31455f;border-radius:6px;padding:5px 8px;font-size:12px;"></select>
      <span data-fbx-preview-zone-count style="color:#9aa8ba;"></span>
    </label>`;
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
    count: card.querySelector('[data-fbx-preview-zone-count]'),
    state: null,
  };
  bindSelection(controller);
  CONTROLLERS.set(container, controller);
  return controller;
}

function bindSelection(controller) {
  controller.select.addEventListener('change', () => {
    const state = controller.state;
    if (!state?.graph || !state.renderer) return;
    const project = buildFbxSourceGraphPreviewProject(
      state.graph,
      state.sourceName,
      state.maxPoints,
      { zoneId: controller.select.value },
    );
    state.renderer._3DModelConv_renderProject(project);
  });
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
  controller.wrap.style.display = zones.length > 1 ? 'flex' : 'none';
  controller.select.value = project.selectedZoneId || '';
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
