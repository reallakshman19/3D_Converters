import { ZONE_GEOMETRY_STATUS } from './constants.js';
import { FbxZoneGeometryError, asZoneGeometryError } from './errors.js';

function frozenState(value) {
  return Object.freeze({
    phase: value.phase, status: value.status, message: value.message,
    zoneGeometryJson: value.zoneGeometryJson, derivedPortJson: value.derivedPortJson,
    internalPipeJson: value.internalPipeJson, stagedJsonText: value.stagedJsonText,
    autoPipeStatus: value.autoPipeStatus, result: value.result, generation: value.generation,
  });
}

function mappedRuntimeError(error) {
  const text = `${error?.code || ''} ${error?.message || ''}`;
  if (/ABORT|cancel/i.test(text)) return new FbxZoneGeometryError(
    ZONE_GEOMETRY_STATUS.CANCELLED, 'Zone geometry analysis was cancelled.');
  if (/TIMEOUT|LIMIT|RESOURCE|memory|allocation/i.test(text)) return new FbxZoneGeometryError(
    ZONE_GEOMETRY_STATUS.RESOURCE, 'Zone geometry analysis exceeded an approved resource boundary.');
  return asZoneGeometryError(error, ZONE_GEOMETRY_STATUS.TOPOLOGY);
}

function runningProgress(runtime, generation, stage, onProgress) {
  if (runtime.generation !== generation) return;
  runtime.clear('running', `Geometry worker: ${stage}`);
  onProgress?.(stage);
}

function completionMessage(result) {
  const base = `Analysed ${result.counts.selectedGeometries} geometries; ${result.counts.admittedLoops} admitted loops.`;
  if (result.autoPipe.status === 'STAGEDJSON_PASS') {
    return `${base} Released ${result.counts.admittedPipes} PIPE components in ${result.counts.stagedBranches} branches.`;
  }
  return `${base} PIPE-only release blocked: ${result.autoPipe.status}.`;
}

async function executeRun(runtime, input, onProgress) {
  runtime.invalidate('analysis-started');
  const generation = runtime.generation, controller = new AbortController();
  runtime.active = controller; runtime.clear('running', 'Preparing exact FBX topology...');
  try {
    const bundle = await runtime.parseBundle(input.bytes, { signal: controller.signal,
      onProgress: (stage) => runningProgress(runtime, generation, stage, onProgress) });
    if (runtime.generation !== generation) return Object.freeze({ stale: true });
    runtime.clear('running', 'Deriving selected-zone boundary evidence...');
    const result = await runtime.analyse({ sourceGraph: input.sourceGraph,
      geometryBundle: bundle, zoneId: input.zoneId });
    if (runtime.generation !== generation) return Object.freeze({ stale: true });
    runtime.active = null;
    runtime.publish({ phase: 'complete', status: result.status,
      message: completionMessage(result), zoneGeometryJson: result.zoneGeometryJson,
      derivedPortJson: result.derivedPortJson,
      internalPipeJson: result.autoPipe.internalPipeMappingJson,
      stagedJsonText: result.autoPipe.stagedJsonText,
      autoPipeStatus: result.autoPipe.status, result });
    return result;
  } catch (error) {
    if (runtime.generation !== generation) return Object.freeze({ stale: true });
    runtime.active = null; const failure = mappedRuntimeError(error);
    runtime.clear('failed', failure.message, failure.code); throw failure;
  }
}

export function createZoneAnalysisController({ parseBundle, analyse, onState = null }) {
  const runtime = { generation: 0, active: null, parseBundle, analyse, state: null };
  runtime.publish = (next) => {
    runtime.state = frozenState({ ...next, generation: runtime.generation });
    try { onState?.(runtime.state); } catch { /* UI observers are non-authoritative. */ }
    return runtime.state;
  };
  runtime.clear = (phase, message, status = null) => runtime.publish({ phase, status, message,
    zoneGeometryJson: null, derivedPortJson: null, internalPipeJson: null,
    stagedJsonText: null, autoPipeStatus: null, result: null });
  runtime.invalidate = (reason = 'invalidated') => {
    const cancelled = Boolean(runtime.active);
    runtime.generation += 1; runtime.active?.abort(); runtime.active = null;
    return runtime.clear(cancelled ? 'cancelled' : 'idle', reason,
      cancelled ? ZONE_GEOMETRY_STATUS.CANCELLED : null);
  };
  runtime.clear('idle', '');
  return Object.freeze({ run: (input, progress) => executeRun(runtime, input, progress),
    invalidate: runtime.invalidate, snapshot: () => runtime.state });
}
