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

const workflow = files['.github/workflows/fbx-preview-shell-pages-smoke.yml'];
for (const path of [
  'tabs/model-converters/converters/fbx/auto-pipe/classify.js',
  'tabs/model-converters/converters/fbx/solid-fitting-ports/analysis-topology.js',
  'tabs/model-converters/converters/fbx/solid-fitting-ports/candidate-evaluation.js',
  'tabs/model-converters/converters/fbx/solid-fitting-ports/evidence.js',
  'tabs/model-converters/converters/fbx/solid-fitting-ports/terminal-cap-bridge.js',
  'tabs/model-converters/converters/fbx/transform-policy.js',
]) requires('.github/workflows/fbx-preview-shell-pages-smoke.yml', path);
requires('.github/workflows/fbx-preview-shell-pages-smoke.yml', `CACHE_KEY: ${key}`);
requires('.github/workflows/fbx-preview-shell-pages-smoke.yml', 'FbxPagesDirectPipeRuntimeDeploymentEvidence.v1');
requires('.github/workflows/fbx-preview-shell-pages-smoke.yml', 'benchmarkAdmittedPipeCount 112');
requires('.github/workflows/fbx-preview-shell-pages-smoke.yml', 'DETACHED_CAP_RING_BRIDGE_V1');

console.log('test-fbx2-runtime-cache-chain: PASS');
