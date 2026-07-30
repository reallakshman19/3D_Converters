import { ZONE_GEOMETRY_STATUS } from './constants.js';
import { FbxZoneGeometryError, asZoneGeometryError } from './errors.js';

const PACKAGE_INPUT_EVENT = 'model-converters:fbx-zone-package-inputs';

function frozenState(value) {
  return Object.freeze({
    phase: value.phase,
    status: value.status,
    message: value.message,
    zoneGeometryJson: value.zoneGeometryJson,
    derivedPortJson: value.derivedPortJson,
    internalPipeJson: value.internalPipeJson,
    stagedJsonText: value.stagedJsonText,
    componentCrosswalkJson: value.componentCrosswalkJson,
    connectivityJson: value.connectivityJson,
    branchFittingJson: value.branchFittingJson,
    inlineAssemblyJson: value.inlineAssemblyJson,
    autoPipeStatus: value.autoPipeStatus,
    result: value.result,
    generation: value.generation,
  });
}

function publishPackageInputs(inputs) {
  if (typeof window === 'undefined' || typeof CustomEvent !== 'function') return;
  window.dispatchEvent(new CustomEvent(PACKAGE_INPUT_EVENT, {
    detail: { inputs: inputs || null },
  }));
}

function mappedRuntimeError(error) {
  const text = `${error?.code || ''} ${error?.message || ''}`;
  if (/ABORT|cancel/i.test(text)) {
    return new FbxZoneGeometryError(
      ZONE_GEOMETRY_STATUS.CANCELLED, 'Zone geometry analysis was cancelled.');
  }
  if (/TIMEOUT|LIMIT|RESOURCE|memory|allocation/i.test(text)) {
    return new FbxZoneGeometryError(ZONE_GEOMETRY_STATUS.RESOURCE,
      'Zone geometry analysis exceeded an approved resource boundary.');
  }
  return asZoneGeometryError(error, ZONE_GEOMETRY_STATUS.TOPOLOGY);
}

function runningProgress(runtime, generation, stage, onProgress) {
  if (runtime.generation !== generation) return;
  runtime.clear('running', `Geometry worker: ${stage}`);
  onProgress?.(stage);
}

function connectivityMessage(result) {
  const review = result.connectivityReview;
  if (!review || review.status === 'MAPPING_REQUIRED') {
    return ' Connectivity review requires approved mapped StagedJSON.';
  }
  const counts = review.counts;
  return ` Connectivity: ${counts.internalLinkCount} internal, ${counts.boundaryLinkCount} boundary, ${counts.openPortCount} open ports.`;
}

function branchFittingMessage(result) {
  const review = result.branchFittingReview;
  if (!review || review.status === 'MAPPING_REQUIRED') return ' OLET review requires approved mapped StagedJSON.';
  return ` OLET review: ${review.admittedCount} admitted, ${review.blockedCount} blocked.`;
}

function inlineAssemblyMessage(result) {
  const review = result.inlineAssemblyReview;
  if (!review || review.status === 'MAPPING_REQUIRED') {
    return ' Inline assembly review requires approved mapped StagedJSON.';
  }
  return ` Inline assemblies: ${review.admittedCount} admitted, ${review.blockedCount} blocked.`;
}

function completionMessage(result) {
  const base = `Analysed ${result.counts.selectedGeometries} geometries; ${result.counts.admittedLoops} admitted loops.`;
  const pipes = result.autoPipe.status === 'STAGEDJSON_PASS'
    ? ` Released ${result.counts.admittedPipes} PIPE components in ${result.counts.stagedBranches} branches.`
    : ` PIPE-only release blocked: ${result.autoPipe.status}.`;
  const packageStatus = result.zonePackageError
    ? ` Package export unavailable: ${result.zonePackageError.code}.` : '';
  return `${base}${pipes}${connectivityMessage(result)}${branchFittingMessage(result)}${inlineAssemblyMessage(result)}${packageStatus}`;
}

function analysisInput(input, bundle) {
  return {
    sourceGraph: input.sourceGraph,
    geometryBundle: bundle,
    zoneId: input.zoneId,
    stagedBranches: input.stagedBranches,
    mappedStageStatus: input.mappedStageStatus,
    includeZonePackageInputs: true,
  };
}

async function executeRun(runtime, input, onProgress) {
  runtime.invalidate('analysis-started');
  const generation = runtime.generation;
  const controller = new AbortController();
  runtime.active = controller;
  runtime.clear('running', 'Preparing exact FBX topology...');
  try {
    const bundle = await runtime.parseBundle(input.bytes, {
      signal: controller.signal,
      onProgress: (stage) => runningProgress(runtime, generation, stage, onProgress),
    });
    if (runtime.generation !== generation) return Object.freeze({ stale: true });
    runtime.clear('running', 'Deriving selected-zone boundary evidence...');
    const result = await runtime.analyse(analysisInput(input, bundle));
    if (runtime.generation !== generation) return Object.freeze({ stale: true });
    runtime.active = null;
    runtime.publish({
      phase: 'complete', status: result.status,
      message: completionMessage(result),
      zoneGeometryJson: result.zoneGeometryJson,
      derivedPortJson: result.derivedPortJson,
      internalPipeJson: result.autoPipe.internalPipeMappingJson,
      stagedJsonText: result.autoPipe.stagedJsonText,
      componentCrosswalkJson: result.componentCrosswalkJson,
      connectivityJson: result.connectivityJson,
      branchFittingJson: result.branchFittingJson,
      inlineAssemblyJson: result.inlineAssemblyJson,
      autoPipeStatus: result.autoPipe.status,
      result,
    });
    return result;
  } catch (error) {
    if (runtime.generation !== generation) return Object.freeze({ stale: true });
    runtime.active = null;
    const failure = mappedRuntimeError(error);
    runtime.clear('failed', failure.message, failure.code);
    throw failure;
  }
}

export function createZoneAnalysisController({ parseBundle, analyse, onState = null }) {
  const runtime = {
    generation: 0, active: null, parseBundle, analyse, state: null,
  };
  runtime.publish = (next) => {
    runtime.state = frozenState({ ...next, generation: runtime.generation });
    publishPackageInputs(runtime.state.result?.zonePackageInputs || null);
    try { onState?.(runtime.state); } catch { /* UI observers are non-authoritative. */ }
    return runtime.state;
  };
  runtime.clear = (phase, message, status = null) => runtime.publish({
    phase, status, message,
    zoneGeometryJson: null, derivedPortJson: null,
    internalPipeJson: null, stagedJsonText: null,
    componentCrosswalkJson: null, connectivityJson: null,
    branchFittingJson: null, inlineAssemblyJson: null,
    autoPipeStatus: null, result: null,
  });
  runtime.invalidate = (reason = 'invalidated') => {
    const cancelled = Boolean(runtime.active);
    runtime.generation += 1;
    runtime.active?.abort();
    runtime.active = null;
    return runtime.clear(cancelled ? 'cancelled' : 'idle', reason,
      cancelled ? ZONE_GEOMETRY_STATUS.CANCELLED : null);
  };
  runtime.clear('idle', '');
  return Object.freeze({
    run: (input, progress) => executeRun(runtime, input, progress),
    invalidate: runtime.invalidate,
    snapshot: () => runtime.state,
  });
}
