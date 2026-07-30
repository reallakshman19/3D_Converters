import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const key = '20260729-fbx2-direct-pipe-1';
const read = (path) => readFile(new URL(path, root), 'utf8');
const files = Object.fromEntries(await Promise.all([
  'index.html',
  'main-rhbg-fitguard.js',
  'core/app.js',
  'core/app-standalone-runtime.js',
  'tabs/model-converters-tab.js',
  'tabs/model-converters/index.js',
  'tabs/model-converters/ModelConvertersTab.js',
  'tabs/model-converters/fbx-review-ui-addon.js',
  'tabs/model-converters/converters/fbx-to-stagedjson.js',
  'tabs/model-converters/converters/fbx/zone-geometry/selected-zone-auto-pipe.js',
  'tabs/model-converters/converters/fbx/zone-geometry/zone-toolbar.js',
  'tabs/model-converters/converters/fbx/zone-geometry/analyse-zone.js',
  'tabs/model-converters/converters/fbx/zone-geometry/occurrence-transform.js',
  'tabs/model-converters/converters/fbx/auto-pipe/pipeline.js',
  'tabs/model-converters/converters/fbx/auto-pipe/classify.js',
  'tabs/model-converters/converters/fbx/solid-fitting-ports/evidence.js',
  'tabs/model-converters/converters/fbx/solid-fitting-ports/candidate-evaluation.js',
  'tabs/model-converters/converters/fbx/solid-fitting-ports/classifier.js',
  'tabs/model-converters/converters/fbx/solid-fitting-ports/sidewall-residual.js',
  'tabs/model-converters/converters/fbx/solid-fitting-ports/terminal-cap-bridge.js',
  '.github/workflows/fbx-preview-shell-pages-smoke.yml',
  '.github/workflows/fbx-pages-deployment-smoke.yml',
].map(async (path) => [path, await read(path)])));

function requires(path, fragment) {
  assert.equal(files[path].includes(fragment), true, `${path} lacks ${fragment}`);
}

requires('index.html', `main-rhbg-fitguard.js?v=${key}`);
requires('main-rhbg-fitguard.js', `core/app.js?v=${key}`);
requires('core/app.js', `app-standalone-runtime.js?v=${key}`);
requires('core/app-standalone-runtime.js', `model-converters-tab.js?v=${key}`);
requires('tabs/model-converters-tab.js', `model-converters/index.js?v=${key}`);
requires('tabs/model-converters/index.js', `ModelConvertersTab.js?v=${key}`);
requires('tabs/model-converters/ModelConvertersTab.js', `fbx-review-ui-addon.js?v=${key}`);
requires('tabs/model-converters/ModelConvertersTab.js', `zone-toolbar.js?v=${key}`);
requires('tabs/model-converters/fbx-review-ui-addon.js', `fbx-to-stagedjson.js?v=${key}`);
requires('tabs/model-converters/converters/fbx-to-stagedjson.js', `selected-zone-auto-pipe.js?v=${key}`);
requires('tabs/model-converters/converters/fbx/zone-geometry/selected-zone-auto-pipe.js', `analyse-zone.js?v=${key}`);
requires('tabs/model-converters/converters/fbx/zone-geometry/zone-toolbar.js', `analyse-zone.js?v=${key}`);
requires('tabs/model-converters/converters/fbx/zone-geometry/analyse-zone.js', `pipeline.js?v=${key}`);
requires('tabs/model-converters/converters/fbx/zone-geometry/analyse-zone.js', `evidence.js?v=${key}`);
requires('tabs/model-converters/converters/fbx/auto-pipe/pipeline.js', `classify.js?v=${key}`);
requires('tabs/model-converters/converters/fbx/auto-pipe/classify.js', `classifier.js?v=${key}`);
requires('tabs/model-converters/converters/fbx/solid-fitting-ports/evidence.js', `candidate-evaluation.js?v=${key}`);
requires('tabs/model-converters/converters/fbx/solid-fitting-ports/evidence.js', `terminal-cap-bridge.js?v=${key}`);
requires('tabs/model-converters/converters/fbx/solid-fitting-ports/candidate-evaluation.js', `occurrence-transform.js?v=${key}`);
requires('tabs/model-converters/converters/fbx/zone-geometry/occurrence-transform.js', `transform-policy.js?v=${key}`);
requires('tabs/model-converters/converters/fbx/solid-fitting-ports/classifier.js', `sidewall-residual.js?v=${key}`);
requires('tabs/model-converters/converters/fbx/solid-fitting-ports/sidewall-residual.js', `transform-policy.js?v=${key}`);

const directWorkflow = '.github/workflows/fbx-preview-shell-pages-smoke.yml';
for (const path of [
  'tabs/model-converters/converters/fbx/auto-pipe/classify.js',
  'tabs/model-converters/converters/fbx/solid-fitting-ports/analysis-topology.js',
  'tabs/model-converters/converters/fbx/solid-fitting-ports/candidate-evaluation.js',
  'tabs/model-converters/converters/fbx/solid-fitting-ports/evidence.js',
  'tabs/model-converters/converters/fbx/solid-fitting-ports/terminal-cap-bridge.js',
  'tabs/model-converters/converters/fbx/conversion.js',
  'tabs/model-converters/converters/fbx/conversion-core.js',
  'tabs/model-converters/converters/fbx/staged-writer.js',
  'tabs/model-converters/converters/fbx/generated-gap-pipe/profile.js',
  'tabs/model-converters/converters/fbx/generated-gap-pipe/release.js',
  'tabs/model-converters/converters/fbx/generated-gap-pipe/selected-evidence.js',
  'tabs/model-converters/converters/fbx/generated-gap-pipe/review-ui.js',
  'tabs/model-converters/converters/fbx/fitting-kernels/connectivity/component-reader.js',
  'tabs/model-converters/converters/fbx/parity/component-inventory.js',
  'tabs/model-converters/converters/fbx/transform-policy.js',
]) requires(directWorkflow, path);
requires(directWorkflow, `CACHE_KEY: ${key}`);
requires(directWorkflow, 'FbxPagesDirectPipeRuntimeDeploymentEvidence.v1');
requires(directWorkflow, 'benchmarkAdmittedPipeCount 112');
requires(directWorkflow, 'DETACHED_CAP_RING_BRIDGE_V1');
requires(directWorkflow, 'EXPLICIT_LINK_STRAIGHT_GAP_V1');
requires(directWorkflow, 'FbxGeneratedGapPipeEvidence.v1');
requires(directWorkflow, 'sourceModelObjectId: null');
requires(directWorkflow, 'gapReinferredInSelectedZone: false');
requires(directWorkflow, 'git fetch origin main');
requires(directWorkflow, 'git rebase origin/main');
requires(directWorkflow, 'after five synchronized attempts');

const selectedWorkflow = '.github/workflows/fbx-pages-deployment-smoke.yml';
for (const path of [
  'tabs/model-converters/converters/fbx/conversion.js',
  'tabs/model-converters/converters/fbx/conversion-core.js',
  'tabs/model-converters/converters/fbx/staged-writer.js',
  'tabs/model-converters/converters/fbx/generated-gap-pipe/profile.js',
  'tabs/model-converters/converters/fbx/generated-gap-pipe/release.js',
  'tabs/model-converters/converters/fbx/generated-gap-pipe/selected-evidence.js',
  'tabs/model-converters/converters/fbx/generated-gap-pipe/review-ui.js',
  'tabs/model-converters/converters/fbx/fitting-kernels/connectivity/component-reader.js',
  'tabs/model-converters/converters/fbx/parity/component-inventory.js',
]) requires(selectedWorkflow, path);
requires(selectedWorkflow, 'FbxPagesSelectedZoneDeploymentEvidence.v1');
requires(selectedWorkflow, 'FbxPagesGeneratedGapRuntimeDeploymentEvidence.v1');
requires(selectedWorkflow, 'fbx-pages-generated-gap-runtime-deployment.json');
requires(selectedWorkflow, 'EXPLICIT_LINK_STRAIGHT_GAP_V1');
requires(selectedWorkflow, 'explicit-mapping-port-links');
requires(selectedWorkflow, 'sourceIdentityClaimedByGeneratedPipe false');
requires(selectedWorkflow, 'git fetch origin main');
requires(selectedWorkflow, 'git rebase origin/main');
requires(selectedWorkflow, 'after five synchronized attempts');

console.log('test-fbx2-runtime-cache-chain: PASS');
