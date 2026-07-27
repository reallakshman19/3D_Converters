import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
const [addon, exporter, shell, index, shim, runAll] = await Promise.all([
  read('tabs/model-converters/fbx-preview-zone-selector.js'),
  read('tabs/model-converters/fbx-source-graph-zone-export.js'),
  read('tabs/model-converters/ModelConvertersTab.js'),
  read('tabs/model-converters/index.js'),
  read('tabs/model-converters-tab.js'),
  read('tests/fbx/run-all.mjs'),
]);

const rendererUrl = '../../converters/view/model-conv-preview-renderer.js?v=20260725-fbx-source-graph-preview-1';
assert.match(addon, new RegExp(rendererUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
assert.match(addon, /buildFbxSourceGraphPreviewProject/);
assert.match(addon, /buildFbxSourceGraphZoneExport/);
assert.match(addon, /data-fbx-preview-zone-download/);
assert.match(addon, /Download selected zone JSON/);
assert.doesNotMatch(addon, /converter-registry|convertFbxToStagedJson|mapping-package|downloadOutput/);
assert.doesNotMatch(exporter, /converter-registry|convertFbxToStagedJson|mapping-package|Blob|document\./);
assert.ok(shell.indexOf('installFbxPreviewZoneSelector(container)') < shell.indexOf('renderLegacyModelConvertersTab(container, ctx)'));
assert.match(shell, /20260727-fbx-zone-download-1/);
assert.match(index, /20260727-fbx-zone-download-1/);
assert.match(shim, /20260727-fbx-zone-download-1/);
for (const test of [
  'test-fbx-source-graph-preview-zones.mjs',
  'test-fbx-source-graph-zone-export.mjs',
  'test-fbx-preview-zone-selector-static.mjs',
]) {
  assert.equal(runAll.split(`'${test}'`).length - 1, 1, `${test} must be registered exactly once`);
}
console.log('test-fbx-preview-zone-selector-static: PASS');
