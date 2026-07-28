import { buildFbxSourceGraphZoneExport } from '../../../fbx-source-graph-zone-export.js';
import { buildFbxZoneWireframeMetaText } from '../zone-geometry/wireframe-preview.js';
import { buildSelectedZoneEngineeringPackage } from './package-writer.js';
import { runFbxSupportAnalysis } from './pipeline.js';

function cleanFilePart(value, fallback) {
  const cleaned = String(value ?? '').trim().replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '');
  return cleaned || fallback;
}

export function buildFbxSupportEvidenceDownloadName(sourceName, zoneLabel) {
  return `${cleanFilePart(sourceName, 'fbx-source')}.${cleanFilePart(zoneLabel,
    'selected-zone')}.FbxSupportEvidence.v1.json`;
}

export function buildFbxEngineeringPackageDownloadName(sourceName, zoneLabel) {
  return `${cleanFilePart(sourceName, 'fbx-source')}.${cleanFilePart(zoneLabel,
    'selected-zone')}.FbxSelectedZoneEngineeringPackage.v1.zip`;
}

function controlsHtml() {
  return `
    <button type="button" data-fbx-support-analyse class="model-converters-download-btn" disabled>Analyse supports</button>
    <button type="button" data-fbx-support-download class="model-converters-download-btn" disabled>Download support evidence</button>
    <button type="button" data-fbx-engineering-package-download class="model-converters-download-btn" disabled>Download zone engineering package</button>
    <span data-fbx-support-status style="color:#9aa8ba;">supports: not evaluated</span>`;
}

function selection(controller) {
  const zoneId = controller.select?.value || '';
  const zone = controller.project?.previewZones?.find((item) => item.zoneId === zoneId);
  return { zoneId, zoneLabel: zone?.label || controller.project?.selectedZoneLabel || '' };
}

function triggerDownload(payload, fileName, type) {
  const url = URL.createObjectURL(new Blob([payload], { type }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = fileName; document.body.appendChild(anchor); anchor.click();
  anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 0);
}

function metaValue(state) {
  if (state.phase === 'analysing') return 'analysing';
  if (state.phase === 'blocked') return `blocked — ${state.status}`;
  if (state.phase !== 'complete') return 'not evaluated';
  const counts = state.result.counts;
  if (state.result.status.startsWith('BLOCKED_')) return `blocked — ${state.result.status}`;
  return `${counts.admittedSupportCount} admitted / ${counts.rejectedCandidateCount} rejected`;
}

function detailedStatus(state) {
  if (state.phase === 'analysing') return 'supports: analysing';
  if (state.phase === 'blocked') return `supports: analysis blocked — ${state.status}`;
  if (state.phase !== 'complete') return 'supports: not evaluated';
  const counts = state.result.counts;
  return `support candidates: ${counts.candidateCount}; admitted supports: ${counts.admittedSupportCount}; `
    + `rejected candidates: ${counts.rejectedCandidateCount}; host-associated supports: `
    + `${counts.hostedSupportCount}; unhosted supports: ${counts.unhostedSupportCount}`;
}

function renderMeta(controller) {
  const wireframe = controller.analysis.snapshot()?.result?.wireframePreview;
  const meta = controller.container.querySelector?.('#model-converters-preview-meta');
  if (wireframe && meta && controller.project) meta.textContent = buildFbxZoneWireframeMetaText(
    controller.project, wireframe, metaValue(controller.support.state));
}

function updateAvailability(controller) {
  const geometry = controller.analysis.snapshot(), support = controller.support;
  const geometryReady = geometry.phase === 'complete' && geometry.result?.supportContext;
  support.analyse.disabled = !geometryReady || support.state.phase === 'analysing';
  support.download.disabled = support.state.phase !== 'complete';
  support.packageDownload.disabled = support.state.phase !== 'complete' || support.packageBuilding;
  const packageSuffix = support.packageStatus ? `; package: ${support.packageStatus}` : '';
  support.status.textContent = `${detailedStatus(support.state)}${packageSuffix}`;
  renderMeta(controller);
}

function setState(controller, next) {
  controller.support.state = Object.freeze(next);
  updateAvailability(controller);
}

function blockedStatus(error) {
  const text = String(error?.message || error || '');
  const match = text.match(/BLOCKED_SUPPORT_[A-Z_]+/);
  return match?.[0] || 'BLOCKED_SUPPORT_CLASSIFICATION';
}

async function runSupport(controller) {
  const geometry = controller.analysis.snapshot(), context = geometry.result?.supportContext;
  if (!context) return;
  const generation = ++controller.support.generation;
  setState(controller, { phase: 'analysing', status: null, result: null });
  try {
    const result = await runFbxSupportAnalysis({
      zoneGeometryEvidence: geometry.result.zoneGeometryEvidence,
      selections: context.selections,
      sourceGraph: context.canonicalGraph,
      pipeClassifications: geometry.result.autoPipe.classificationDispositions,
    });
    if (generation !== controller.support.generation) return;
    setState(controller, { phase: 'complete', status: result.status, result });
  } catch (error) {
    if (generation !== controller.support.generation) return;
    setState(controller, { phase: 'blocked', status: blockedStatus(error), result: null });
  }
}

function downloadSupport(controller) {
  const result = controller.support.state.result, selected = selection(controller);
  if (!result) return;
  triggerDownload(result.supportEvidenceJson,
    buildFbxSupportEvidenceDownloadName(controller.runInput?.sourceName, selected.zoneLabel),
    'application/json;charset=utf-8');
}

async function downloadPackage(controller) {
  const supportResult = controller.support.state.result;
  const geometryResult = controller.analysis.snapshot().result;
  const selected = selection(controller);
  if (!supportResult || !geometryResult?.supportContext || !selected.zoneId) return;
  controller.support.packageBuilding = true; controller.support.packageStatus = null; updateAvailability(controller);
  try {
    const packageResult = await buildSelectedZoneEngineeringPackage({
      sourceGraphSelectedZone: buildFbxSourceGraphZoneExport(controller.graph, selected.zoneId),
      selections: geometryResult.supportContext.selections,
      zoneGeometryEvidence: geometryResult.zoneGeometryEvidence,
      derivedPortEvidence: geometryResult.derivedPortEvidence,
      supportResult,
      autoPipe: geometryResult.autoPipe,
    });
    triggerDownload(packageResult.archiveBytes,
      buildFbxEngineeringPackageDownloadName(controller.runInput?.sourceName, selected.zoneLabel),
      'application/zip');
    controller.support.packageStatus = 'ENGINEERING_PACKAGE_PASS';
  } catch (error) {
    controller.support.packageStatus = 'BLOCKED_SUPPORT_PACKAGE';
  } finally {
    controller.support.packageBuilding = false; updateAvailability(controller);
  }
}

export function attachFbxSupportControls(controller) {
  controller.wrap.insertAdjacentHTML('beforeend', controlsHtml());
  controller.support = {
    generation: 0, packageBuilding: false, packageStatus: null,
    analyse: controller.wrap.querySelector('[data-fbx-support-analyse]'),
    download: controller.wrap.querySelector('[data-fbx-support-download]'),
    packageDownload: controller.wrap.querySelector('[data-fbx-engineering-package-download]'),
    status: controller.wrap.querySelector('[data-fbx-support-status]'),
    state: Object.freeze({ phase: 'not-evaluated', status: null, result: null }),
  };
  controller.support.analyse.addEventListener('click', () => { void runSupport(controller); });
  controller.support.download.addEventListener('click', () => downloadSupport(controller));
  controller.support.packageDownload.addEventListener('click', () => { void downloadPackage(controller); });
  updateAvailability(controller);
}

export function invalidateFbxSupport(controller, reason = 'invalidated') {
  if (!controller?.support) return;
  const cancelled = controller.support.state.phase === 'analysing';
  controller.support.generation += 1; controller.support.packageStatus = null;
  setState(controller, cancelled
    ? { phase: 'blocked', status: 'BLOCKED_SUPPORT_CANCELLED', result: null, reason }
    : { phase: 'not-evaluated', status: null, result: null, reason });
}

export function handleFbxSupportGeometryState(controller, state) {
  if (!controller?.support) return;
  if (state.phase !== 'complete') invalidateFbxSupport(controller, 'geometry-invalidated');
  else updateAvailability(controller);
}

export function supportPreviewMetaValue(controller) {
  return controller?.support ? metaValue(controller.support.state) : 'not evaluated';
}
