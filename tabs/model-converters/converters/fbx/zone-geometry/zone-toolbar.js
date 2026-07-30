import { parseFbxGeometryBundleInWorker } from '../geometry-transport.js';
import {
  installBranchFittingReviewUi,
  renderBranchFittingReviewUi,
  setBranchFittingDownloadAvailability,
} from '../fitting-kernels/branch-fitting/review-ui.js';
import { analyseFbxZoneGeometry } from './analyse-zone.js?v=20260730-fbx-olet-review-1';
import { createZoneAnalysisController } from './analysis-controller.js';
import { installMappedStageCapture } from './mapped-stage-capture.js';
import { mappedStageStatusText } from './mapped-stage-output.js';
import {
  buildFbxAutoPipeOutputName,
  buildFbxBranchFittingDownloadName,
  buildFbxDerivedPortDownloadName,
  buildFbxInternalPipeDownloadName,
  buildFbxZoneGeometryDownloadName,
  triggerJsonDownload,
} from './zone-downloads.js';
import { buildFbxZoneWireframeMetaText } from './wireframe-preview.js';

export { buildFbxBranchFittingDownloadName, buildFbxDerivedPortDownloadName,
  buildFbxInternalPipeDownloadName, buildFbxZoneGeometryDownloadName } from './zone-downloads.js';

const PREVIEW_EVENT = 'model-converters:preview-project-rendered';
const RUN_EVENT = 'model-converters:fbx-zone-geometry-run';
const AUTO_PIPE_OUTPUT_EVENT = 'model-converters:fbx-auto-pipe-outputs';
const CONTROLLERS = new WeakMap();
const RUN_INPUTS = new WeakMap();

function dispatchRun(detail) {
  if (typeof window === 'undefined' || typeof CustomEvent !== 'function') return;
  window.dispatchEvent(new CustomEvent(RUN_EVENT, { detail }));
}

function dispatchAutoPipe(controller, detail = {}) {
  if (typeof window === 'undefined' || typeof CustomEvent !== 'function') return;
  window.dispatchEvent(new CustomEvent(AUTO_PIPE_OUTPUT_EVENT, {
    detail: { container: controller.container, ...detail },
  }));
}

function controlsHtml() {
  return `
    <button type="button" data-fbx-zone-geometry-analyse class="model-converters-download-btn" disabled>Analyse zone geometry</button>
    <button type="button" data-fbx-zone-geometry-download class="model-converters-download-btn" disabled>Download zone geometry evidence</button>
    <button type="button" data-fbx-derived-port-download class="model-converters-download-btn" disabled>Download derived port evidence</button>
    <button type="button" data-fbx-internal-pipe-download class="model-converters-download-btn" disabled>Download PIPE inference evidence</button>
    <span data-fbx-zone-geometry-status style="color:#9aa8ba;"></span>
    <span data-fbx-derived-port-disclaimer style="color:#d4b36a;">PIPE-only StagedJSON requires complete deterministic classification and connectivity.</span>`;
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
  controller.pipeDownload.disabled = !complete || !state.internalPipeJson;
  setBranchFittingDownloadAvailability(controller.branchFittingUi,
    complete && Boolean(state.branchFittingJson));
}

function renderAnalysisState(controller, state) {
  controller.status.textContent = state.message || '';
  controller.disclaimer.textContent = state.autoPipeStatus === 'STAGEDJSON_PASS'
    ? 'PIPE-only internal authority passed; selected-zone StagedJSON is available.'
    : state.phase === 'complete'
      ? `Geometry wireframe/evidence is available; StagedJSON remains blocked by ${state.autoPipeStatus}.`
      : mappedStageStatusText(controller.runInput?.mappedStageStatus);
  renderBranchFittingReviewUi(controller.branchFittingUi, state.result?.branchFittingReview || null);
  updateAvailability(controller);
}

function createController(container, wrap) {
  wrap.insertAdjacentHTML('beforeend', controlsHtml());
  const controller = {
    container, wrap, select: wrap.querySelector('[data-fbx-preview-zone]'),
    analyse: wrap.querySelector('[data-fbx-zone-geometry-analyse]'),
    zoneDownload: wrap.querySelector('[data-fbx-zone-geometry-download]'),
    portDownload: wrap.querySelector('[data-fbx-derived-port-download]'),
    pipeDownload: wrap.querySelector('[data-fbx-internal-pipe-download]'),
    status: wrap.querySelector('[data-fbx-zone-geometry-status]'),
    disclaimer: wrap.querySelector('[data-fbx-derived-port-disclaimer]'),
    branchFittingUi: installBranchFittingReviewUi(wrap),
    project: null, graph: null, renderer: null,
    runInput: RUN_INPUTS.get(container) || null,
    analysis: null,
  };
  controller.analysis = createZoneAnalysisController({
    parseBundle: parseFbxGeometryBundleInWorker,
    analyse: analyseFbxZoneGeometry,
    onState: (state) => renderAnalysisState(controller, state),
  });
  bindControls(controller);
  CONTROLLERS.set(container, controller);
  return controller;
}

function ensureController(container) {
  const cached = CONTROLLERS.get(container);
  if (cached && container.contains(cached.wrap)) return cached;
  const wrap = container.querySelector?.('[data-fbx-preview-zone-wrap]');
  return wrap ? createController(container, wrap) : null;
}

function invalidate(controller, reason) {
  controller.analysis.invalidate(reason);
  controller.renderer?._3DModelConv_clearStp?.();
  dispatchAutoPipe(controller, { conversionStatus: '', zoneId: '' });
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
  controller.runInput = null;
  controller.project = null;
  controller.graph = null;
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

function publishAnalysisOutput(controller, selection, result) {
  if (result?.autoPipe?.status !== 'STAGEDJSON_PASS') {
    dispatchAutoPipe(controller, { conversionStatus: '', zoneId: selection.zoneId });
    return;
  }
  dispatchAutoPipe(controller, {
    conversionStatus: 'STAGEDJSON_PASS',
    zoneId: selection.zoneId,
    outputs: [{
      name: buildFbxAutoPipeOutputName(controller.runInput?.sourceName, selection.zoneLabel),
      text: result.autoPipe.stagedJsonText,
    }],
  });
}

function renderWireframePreview(controller, result) {
  const wireframe = result?.wireframePreview;
  if (!wireframe || !controller.renderer || !controller.project) return;
  controller.renderer._3DModelConv_overlayStp(wireframe.members);
  const meta = controller.container.querySelector?.('#model-converters-preview-meta');
  if (meta) meta.textContent = buildFbxZoneWireframeMetaText(controller.project, wireframe);
}

async function runAnalysis(controller) {
  const selection = selectedZone(controller);
  if (!selection.zoneId || !controller.graph || !controller.runInput?.sourceBytes) return;
  dispatchAutoPipe(controller, { conversionStatus: '', zoneId: selection.zoneId });
  try {
    const result = await controller.analysis.run({
      bytes: controller.runInput.sourceBytes,
      sourceGraph: controller.graph,
      zoneId: selection.zoneId,
      stagedBranches: controller.runInput.stagedBranches,
      mappedStageStatus: controller.runInput.mappedStageStatus,
    });
    if (!result?.stale) {
      renderWireframePreview(controller, result);
      publishAnalysisOutput(controller, selection, result);
    }
  } catch { /* Controller publishes the closed terminal state. */ }
}

function artifactText(state, kind) {
  if (kind === 'zone') return state.zoneGeometryJson;
  if (kind === 'port') return state.derivedPortJson;
  if (kind === 'pipe') return state.internalPipeJson;
  return state.branchFittingJson;
}

function artifactName(controller, selection, kind) {
  const source = controller.runInput?.sourceName;
  if (kind === 'zone') return buildFbxZoneGeometryDownloadName(source, selection.zoneLabel);
  if (kind === 'port') return buildFbxDerivedPortDownloadName(source, selection.zoneLabel);
  if (kind === 'pipe') return buildFbxInternalPipeDownloadName(source, selection.zoneLabel);
  return buildFbxBranchFittingDownloadName(source, selection.zoneLabel);
}

function downloadArtifact(controller, kind) {
  const state = controller.analysis.snapshot(), selection = selectedZone(controller);
  const text = artifactText(state, kind);
  if (text) triggerJsonDownload(text, artifactName(controller, selection, kind));
}

function bindControls(controller) {
  controller.select?.addEventListener('change', () => invalidate(controller,
    'Selected zone changed; prior analysis was cleared.'));
  controller.analyse.addEventListener('click', () => { void runAnalysis(controller); });
  controller.zoneDownload.addEventListener('click', () => downloadArtifact(controller, 'zone'));
  controller.portDownload.addEventListener('click', () => downloadArtifact(controller, 'port'));
  controller.pipeDownload.addEventListener('click', () => downloadArtifact(controller, 'pipe'));
  controller.branchFittingUi.download.addEventListener('click', () => downloadArtifact(controller, 'branch-fitting'));
}

function handlePreview(container, event) {
  const project = event.detail?.project, renderer = event.detail?.renderer;
  const controller = ensureController(container);
  if (!controller) return;
  if (project?.id !== 'fbx-source-graph-preview' || !project.previewSourceGraph) {
    controller.project = null;
    controller.graph = null;
    invalidate(controller, 'No FBX zone is active.');
    return;
  }
  const priorGraph = controller.graph, priorZone = controller.project?.selectedZoneId || '';
  controller.project = project;
  controller.graph = project.previewSourceGraph;
  controller.renderer = renderer || controller.renderer;
  if (priorGraph && (priorGraph !== controller.graph || priorZone !== (project.selectedZoneId || ''))) {
    invalidate(controller, 'Selected zone or FBX source changed; prior analysis was cleared.');
  }
  updateAvailability(controller);
}

function startedRun(detail) {
  return detail.sourceBytes ? {
    sourceName: detail.sourceName,
    sourceBytes: detail.sourceBytes.slice(),
    mappedStageStatus: 'MAPPED_STAGE_NOT_AVAILABLE',
    stagedBranches: null,
  } : null;
}

function handleRun(container, event) {
  const detail = event.detail || {}, controller = CONTROLLERS.get(container);
  if (detail.phase === 'started') {
    const runInput = startedRun(detail);
    RUN_INPUTS.set(container, runInput);
    if (controller) {
      controller.runInput = runInput;
      controller.project = null;
      controller.graph = null;
      invalidate(controller, 'A new FBX run started; prior analysis was cleared.');
    }
  } else if (detail.phase === 'complete') {
    const prior = RUN_INPUTS.get(container) || startedRun(detail);
    const runInput = prior ? {
      ...prior,
      sourceName: detail.sourceName,
      mappedStageStatus: detail.mappedStageStatus,
      stagedBranches: detail.stagedBranches,
    } : null;
    RUN_INPUTS.set(container, runInput);
    if (controller) {
      controller.runInput = runInput;
      renderAnalysisState(controller, controller.analysis.snapshot());
    }
  } else if (detail.phase === 'failed') {
    RUN_INPUTS.delete(container);
    if (controller) {
      controller.runInput = null;
      invalidate(controller, 'The FBX run failed; no zone evidence is available.');
    }
  }
}

export function installFbxZoneGeometryToolbar(container) {
  if (!container || container.dataset.fbxZoneGeometryToolbar === 'true') return;
  installMappedStageCapture(dispatchRun);
  container.dataset.fbxZoneGeometryToolbar = 'true';
  bindFbxPrimaryInputInvalidation(container, () => handlePrimaryInputChange(container));
  window.addEventListener(RUN_EVENT, (event) => handleRun(container, event));
  container.addEventListener(PREVIEW_EVENT, (event) => handlePreview(container, event));
}
