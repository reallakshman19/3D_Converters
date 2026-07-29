import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const VERSION = '20260729-inputxml-live-release-1';
const SHELL_VERSION = '20260729-fbx2-direct-pipe-1';
const WORKER = `py-worker.js?v=${VERSION}`;

async function read(path) {
  return await readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

const appRuntime = await read('core/app-standalone-runtime.js');
const tabShim = await read('tabs/model-converters-tab.js');
const index = await read('tabs/model-converters/index.js');
const modelTab = await read('tabs/model-converters/ModelConvertersTab.js');
const bridge = await read('tabs/model-converters/xml-cii-workflow-bridge.js');
const registry = await read('tabs/model-converters/converter-registry.js');
const legacy = await read('tabs/model-converters/legacy-adapter.js');
const cacheBust = await read('tabs/model-converters/xml-cii-rich-worker-cache-bust.js');
const executor = await read('converters/BrowserConverterExecutor.js');
const worker = await read('converters/py-worker.js');
const runner = await read('tabs/model-converters/converters/inputxml-to-cii2019.js');
const workflow = await read('.github/workflows/inputxml-pages-live-release.yml');

assert.match(appRuntime, new RegExp(`model-converters-tab\.js\?v=${SHELL_VERSION}`));
assert.match(tabShim, new RegExp(`model-converters/index\.js\?v=${SHELL_VERSION}`));
assert.match(tabShim, new RegExp(`model-converters/legacy-adapter\.js\?v=${SHELL_VERSION}`));
assert.match(index, new RegExp(`ModelConvertersTab\.js\?v=${SHELL_VERSION}`));
assert.match(modelTab, new RegExp(`xml-cii-rich-worker-cache-bust\.js\?v=${VERSION}`));
assert.match(modelTab, new RegExp(`legacy-adapter\.js\?v=${VERSION}`));
assert.match(modelTab, new RegExp(`converter-registry\.js\?v=${VERSION}`));
assert.match(modelTab, new RegExp(`inputxml-to-cii2019\.js\?v=${VERSION}`));
assert.match(bridge, new RegExp(`legacy-adapter\.js\?v=${VERSION}`));
assert.match(registry, new RegExp(`inputxml-to-cii2019\.js\?v=${VERSION}`));

for (const [name, source] of [['legacy-adapter', legacy], ['cache-bust', cacheBust], ['browser-executor', executor]]) {
  assert.equal(source.includes(WORKER), true, `${name} must bind the current worker cache key`);
  assert.equal(source.includes('py-worker.js?v=20260711-local-pyodide-worker-1'), false, `${name} must not retain the stale worker cache key`);
}

assert.match(worker, /createRetryableAsyncCache/);
assert.match(worker, /_inputXmlRuntimeCache\.get\(pyodide\)/);
assert.equal(worker.includes('let _inputXmlRuntimePromise = null'), false);
assert.match(runner, /buildInputXmlBlockedSummary/);
assert.match(runner, /blockedSummary\.artifact/);
assert.match(runner, /buildInputXmlPreflightRows/);

for (const path of [
  'core/app-standalone-runtime.js',
  'tabs/model-converters-tab.js',
  'tabs/model-converters/index.js',
  'tabs/model-converters/ModelConvertersTab.js',
  'tabs/model-converters/xml-cii-workflow-bridge.js',
  'tabs/model-converters/xml-cii-rich-worker-cache-bust.js',
  'tabs/model-converters/converter-registry.js',
  'tabs/model-converters/legacy-adapter.js',
  'tabs/model-converters/converters/inputxml-to-cii2019.js',
  'tabs/model-converters/converters/inputxml-blocked-diagnostics.js',
  'converters/BrowserConverterExecutor.js',
  'converters/py-worker.js',
  'converters/inputxml-runtime-cache.js',
]) {
  assert.equal(workflow.includes(`'${path}'`), true, `live Pages workflow must bind ${path}`);
}
assert.match(workflow, /InputXmlPagesReleaseDeploymentEvidence\.v1|inputxml-pages-release-deployment\.json/);
assert.match(workflow, /selected-output manifest: PASS and file hashes verified/);

console.log('InputXML live release static module-chain contract passed.');
