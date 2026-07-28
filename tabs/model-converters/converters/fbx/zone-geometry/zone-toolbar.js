import { getConverterById } from '../../../converter-registry.js?v=20260617-basic-glb-3';
import { parseFbxGeometryBundleInWorker } from '../geometry-transport.js';
import { analyseFbxZoneGeometry } from './analyse-zone.js';
import { createZoneAnalysisController } from './analysis-controller.js';

const PREVIEW_EVENT = 'model-converters:preview-project-rendered';
const RUN_EVENT = 'model-converters:fbx-zone-geometry-run';
const PATCH_MARKER = Symbol.for('model-converters.fbx-zone-geometry-run.v1');
const CONTROLLERS = new WeakMap();
const RUN_INPUTS = new WeakMap();

function bytesView(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  return new Uint8Array(value || 0);
}

function primaryInput(context) {
  return context?.inputFiles?.find((file) => file.role === 'primary') || null;
}

function dispatchRun(detail) {
  if (typeof window === 'undefined' || typeof CustomEvent !== 'function') return;
  window.dispatchEvent(new CustomEvent(RUN_EVENT, { detail }));
}

function patchFbxRunner() {
  const converter = getConverterById('fbx_to_stagedjson');
  if (!converter || converter[PATCH_MARKER]) return;
  const original = converter.run;
  converter.run = async function runWithZoneGeometryInput(...args) {
    const input = primaryInput(args[0]);
    const sourceBytes = input?.bytes ? bytesView(input.bytes).slice() : null;
    dispatchRun({ phase: 'started', sourceName: input?.name || 'model.fbx', sourceBytes });
    try {
      const result = await original.apply(this, args);
      dispatchRun({ phase: 'complete', sourceName: input?.name || 'model.fbx', sourceBytes,
        conversionStatus: result?.conversionStatus || '' });
      return result;
    } catch (error) {
      dispatchRun({ phase: 'failed', sourceName: input?.name || 'model.fbx', sourceBytes: null });
      throw error;
    }
  };
  Object.defineProperty(converter, PATCH_MARKER, { value: true });
}

function controlsHtml() {
  return `
    <button type="button" data-fbx-zone-geometry-analyse class="model-converters-download-btn" disabled>Analyse zone geometry</button>
    <button type="button" data-fbx-zone-geometry-download class="model-converters-download-btn" disabled>Download zone geometry evidence</button>
    <button type="button" data-fbx-derived-port-download class="model-converters-download-btn" disabled>Download derived port evidence</button>
    <span data-fbx-zone-geometry-status style="color:#9aa8ba;"></span>
    <span data-fbx-derived-port-disclaimer style="color:#d4b36a;">Derived port evidence does not authorize engineering StagedJSON; FBX-AUTO-002 is not implemented.</span>`;
}

function cleanFilePart(value, fallback) {
  const cleaned = String(value ?? '').trim().replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '');
  return cleaned || fallback;
}

export function buildFbxZoneGeometryDownloadName(sourceName, zoneLabel) {
  return `${cleanFilePart(sourceName, 'fbx-source')}.${cleanFilePart(zoneLabel,
    'selected-zone')}.FbxZoneGeometryEvidence.v1.json`;
}

export function buildFbxDerivedPortDownloadName(sourceName, zoneLabel) {
  return `${cleanFilePart(sourceName, 'fbx-source')}.${cleanFilePart(zoneLabel,
    'selected-zone')}.FbxDerivedPortEvidence.v1.json`;
}

function triggerTextDownload(text, fileName) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = fileName; document.body.appendChild(anchor); anchor.click();
  anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 0);
}

function selectedZone(controller) {
  const zoneId = controller.select?.value || '';
  const zone = controller.project?.previewZones?.find((item) => item.zoneId === zoneId);
  return { zoneId, zoneLabel: zone?.label || controller.project?.selectedZoneLabel || '' };
}

function updateAvailability(controller) {
  const selected = Boolean(selectedZone(controller).zoneId);
  const ready = Boolean(controller.graph && controller.runInput?.sourceBytes?.byteLength);
  const state = controller.analysis.snapshot(), complete = state.phase === 'complete';
  controller.analyse.disabled = !selected || !ready || state.phase === 'running';
  controller.zoneDownload.disabled = !complete;
  controller.portDownload.disabled = !complete;
}

function renderAnalysisState(controller, state) {
  controller.status.textContent = state.message || '';
  updateAvailability(controller);
}

function createController(container, wrap) {
  wrap.insertAdjacentHTML('beforeend', controlsHtml());
  const controller = {
    wrap, select: wrap.querySelector('[data-fbx-preview-zone]'),
    analyse: wrap.querySelector('[data-fbx-zone-geometry-analyse]'),
    zoneDownload: wrap.querySelector('[data-fbx-zone-geometry-download]'),
    portDownload: wrap.querySelector('[data-fbx-derived-port-download]'),
    status: wrap.querySelector('[data-fbx-zone-geometry-status]'),
    project: null, graph: null, runInput: RUN_INPUTS.get(container) || null,
    analysis: null,
  };
  controller.analysis = createZoneAnalysisController({
    parseBundle: parseFbxGeometryBundleInWorker,
    analyse: analyseFbxZoneGeometry,
    onState: (state) => renderAnalysisState(controller, state),
  });
  bindControls(controller); CONTROLLERS.set(container, controller); return controller;
}

function ensureController(container) {
  const cached = CONTROLLERS.get(container);
  if (cached && container.contains(cached.wrap)) return cached;
  const wrap = container.querySelector?.('[data-fbx-preview-zone-wrap]');
  if (!wrap) return null;
  return createController(container, wrap);
}

function invalidate(controller, reason) {
  controller.analysis.invalidate(reason);
  updateAvailability(controller);
}

function inputType(target) {
  return String(target?.type || target?.getAttribute?.('type') || '').toLowerCase();
}

function acceptsFbx(target) {
  const accept = String(target?.accept || target?.getAttribute?.('accept') || '');
  return accept.split(',').some((item) => item.trim().toLowerCase() === '.fbx');
}

export function isFbxPrimaryInputChange(event) {
  const target = event?.target;
  if (inputType(target) !== 'file') return false;
  const name = String(target?.files?.[0]?.name || '');
  return acceptsFbx(target) || /\.fbx$/i.test(name);
}

export function invalidateFbxZoneGeometryInput(controller) {
  if (!controller) return false;
  controller.runInput = null; controller.project = null; controller.graph = null;
  invalidate(controller, 'A new FBX input was loaded; prior analysis was cleared.');
  return true;
}

export function bindFbxPrimaryInputInvalidation(container, onInput) {
  const listener = (event) => { if (isFbxPrimaryInputChange(event)) onInput(event); };
  container.addEventListener('change', listener, true);
  return () => container.removeEventListener?.('change', listener, true);
}

function handlePrimaryInputChange(container) {
  RUN_INPUTS.delete(container);
  invalidateFbxZoneGeometryInput(CONTROLLERS.get(container));
}

async function runAnalysis(controller) {
  const selection = selectedZone(controller);
  if (!selection.zoneId || !controller.graph || !controller.runInput?.sourceBytes) return;
  try {
    await controller.analysis.run({ bytes: controller.runInput.sourceBytes,
      sourceGraph: controller.graph, zoneId: selection.zoneId });
  } catch { /* Controller publishes the closed terminal state. */ }
}

function downloadArtifact(controller, kind) {
  const state = controller.analysis.snapshot(), selection = selectedZone(controller);
  const text = kind === 'zone' ? state.zoneGeometryJson : state.derivedPortJson;
  if (!text) return;
  const name = kind === 'zone'
    ? buildFbxZoneGeometryDownloadName(controller.runInput?.sourceName, selection.zoneLabel)
    : buildFbxDerivedPortDownloadName(controller.runInput?.sourceName, selection.zoneLabel);
  triggerTextDownload(text, name);
}

function bindControls(controller) {
  controller.select?.addEventListener('change', () => invalidate(controller, 'Selected zone changed; prior analysis was cleared.'));
  controller.analyse.addEventListener('click', () => { void runAnalysis(controller); });
  controller.zoneDownload.addEventListener('click', () => downloadArtifact(controller, 'zone'));
  controller.portDownload.addEventListener('click', () => downloadArtifact(controller, 'port'));
}

function handlePreview(container, event) {
  const project = event.detail?.project, controller = ensureController(container);
  if (!controller) return;
  if (project?.id !== 'fbx-source-graph-preview' || !project.previewSourceGraph) {
    controller.project = null; controller.graph = null; invalidate(controller, 'No FBX zone is active.'); return;
  }
  const priorGraph = controller.graph, priorZone = controller.project?.selectedZoneId || '';
  controller.project = project; controller.graph = project.previewSourceGraph;
  if (priorGraph && (priorGraph !== controller.graph || priorZone !== (project.selectedZoneId || ''))) {
    invalidate(controller, 'Selected zone or FBX source changed; prior analysis was cleared.');
  }
  updateAvailability(controller);
}

function handleRun(container, event) {
  const detail = event.detail || {}, controller = CONTROLLERS.get(container);
  if (detail.phase === 'started') {
    const runInput = detail.sourceBytes ? { sourceName: detail.sourceName,
      sourceBytes: detail.sourceBytes.slice() } : null;
    RUN_INPUTS.set(container, runInput); if (controller) { controller.runInput = runInput;
      controller.project = null; controller.graph = null;
      invalidate(controller, 'A new FBX run started; prior analysis was cleared.'); }
  } else if (detail.phase === 'failed') {
    RUN_INPUTS.delete(container); if (controller) { controller.runInput = null;
      invalidate(controller, 'The FBX run failed; no zone evidence is available.'); }
  }
}

export function installFbxZoneGeometryToolbar(container) {
  if (!container || container.dataset.fbxZoneGeometryToolbar === 'true') return;
  patchFbxRunner(); container.dataset.fbxZoneGeometryToolbar = 'true';
  bindFbxPrimaryInputInvalidation(container, () => handlePrimaryInputChange(container));
  window.addEventListener(RUN_EVENT, (event) => handleRun(container, event));
  container.addEventListener(PREVIEW_EVENT, (event) => handlePreview(container, event));
}
