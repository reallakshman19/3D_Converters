import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
const [addon, sourceExporter, stagedExporter, shell, index, shim, runAll] = await Promise.all([
  read('tabs/model-converters/fbx-preview-zone-selector.js'),
  read('tabs/model-converters/fbx-source-graph-zone-export.js'),
  read('tabs/model-converters/fbx-staged-json-zone-export.js'),
  read('tabs/model-converters/ModelConvertersTab.js'),
  read('tabs/model-converters/index.js'),
  read('tabs/model-converters-tab.js'),
  read('tests/fbx/run-all.mjs'),
]);

const rendererUrl = '../../converters/view/model-conv-preview-renderer.js?v=20260725-fbx-source-graph-preview-1';
const registryUrl = './converter-registry.js?v=20260617-basic-glb-3';
assert.match(addon, new RegExp(rendererUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
assert.match(addon, new RegExp(registryUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
assert.match(addon, /buildFbxSourceGraphPreviewProject/);
assert.match(addon, /buildFbxSourceGraphZoneExport/);
assert.match(addon, /buildFbxStagedJsonZoneExport/);
assert.match(addon, /Download zone StagedJSON/);
assert.match(addon, /Download zone source graph/);
assert.match(addon, /STAGEDJSON_PASS/);
assert.match(addon, /fbx_to_stagedjson/);
assert.doesNotMatch(addon, /convertFbxToStagedJson|mapping-package|downloadOutput/);
assert.doesNotMatch(sourceExporter, /converter-registry|convertFbxToStagedJson|mapping-package|Blob|document\./);
assert.doesNotMatch(stagedExporter, /converter-registry|convertFbxToStagedJson|mapping-package|Blob|document\./);
assert.ok(shell.indexOf('installFbxPreviewZoneSelector(container)') < shell.indexOf('renderLegacyModelConvertersTab(container, ctx)'));
assert.match(shell, /20260727-fbx-zone-stagedjson-1/);
for (const text of [index, shim]) assert.match(text, /20260727-/);
for (const test of [
  'test-fbx-source-graph-preview-zones.mjs',
  'test-fbx-source-graph-zone-export.mjs',
  'test-fbx-staged-json-zone-export.mjs',
  'test-fbx-preview-zone-staged-run.mjs',
  'test-fbx-preview-zone-selector-static.mjs',
]) {
  assert.equal(runAll.split(`'${test}'`).length - 1, 1, `${test} must be registered exactly once`);
}
console.log('test-fbx-preview-zone-selector-static: PASS');
