import { getConverterById } from './converter-registry.js?v=20260617-basic-glb-3';
import { runFbxWithReviewUi } from './fbx-review-ui-addon.js?v=20260802-fbx-live-ui-3';
import { run as runLiveFbxToStagedJson } from './converters/fbx-to-stagedjson.js?v=20260802-fbx-live-ui-3';

const VERSION = '20260802-fbx-live-ui-3';
const LIVE_TAG = `FBX_LIVE_UI_ACTIVE:${VERSION}`;
const PATCH_MARKER = Symbol.for('model-converters.fbx-live-runner.v1');

function hasSecondaryInput(context) {
  return Array.isArray(context?.inputFiles)
    && context.inputFiles.some((file) => file?.role === 'secondary' && file?.bytes);
}

function selectedPreviewZoneId() {
  if (typeof document === 'undefined') return '';
  const select = document.querySelector('[data-fbx-preview-zone]');
  return String(select?.value || '').trim();
}

export function withFbxUiZoneSelection(context = {}) {
  const options = { ...(context.options || {}) };
  if (!options.fbxSelectedZoneId && !hasSecondaryInput(context)) {
    const selectedZoneId = selectedPreviewZoneId();
    if (selectedZoneId) options.fbxSelectedZoneId = selectedZoneId;
  }
  return { ...context, options };
}

function appendLiveTag(result) {
  const logs = result?.logs || {};
  const stdout = [LIVE_TAG, ...(Array.isArray(logs.stdout) ? logs.stdout : [])];
  return {
    ...result,
    logs: { ...logs, stdout: [...new Set(stdout)] },
  };
}

async function runLiveFbxWorkflow(context = {}) {
  const result = await runFbxWithReviewUi(
    withFbxUiZoneSelection(context),
    runLiveFbxToStagedJson,
  );
  return appendLiveTag(result);
}

export function installFbxLiveRunnerAddon() {
  const converter = getConverterById('fbx_to_stagedjson');
  if (!converter) return false;
  if (converter[PATCH_MARKER] === VERSION) return false;
  converter.run = runLiveFbxWorkflow;
  Object.defineProperty(converter, PATCH_MARKER, {
    configurable: true,
    value: VERSION,
  });
  converter.liveRunnerVersion = VERSION;
  return true;
}

export const __FBX_LIVE_RUNNER_VERSION__ = VERSION;
