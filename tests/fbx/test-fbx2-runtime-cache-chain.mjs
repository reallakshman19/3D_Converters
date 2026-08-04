import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  normalizeSelectedZonePreviewDetail,
} from '../../tabs/model-converters/fbx-selected-zone-preview-bridge.js';

const root = new URL('../../', import.meta.url);
const key = '20260804-fbx-secondary-preview-1';
const obsoleteKeys = [
  '20260729-fbx2-direct-pipe-1',
  '20260802-fbx-live-ui-3',
];
const read = (path) => readFile(new URL(path, root), 'utf8');
const paths = [
  'index.html',
  'main-rhbg-fitguard.js',
  'core/app.js',
  'tabs/model-converters-tab.js',
  'tabs/model-converters/index.js',
  'tabs/model-converters/ModelConvertersTab-fbx2-managed-reference.js',
  'tabs/model-converters/fbx-review-ui-addon.js',
  'tabs/model-converters/fbx-live-runner-addon.js',
  'tabs/model-converters/fbx-selected-zone-preview-bridge.js',
  'tabs/model-converters/fbx-preview-zone-selector.js',
  'tabs/model-converters/converters/fbx/zone-geometry/zone-toolbar.js',
];
const files = Object.fromEntries(await Promise.all(
  paths.map(async (path) => [path, await read(path)]),
));

function requires(path, fragment) {
  assert.equal(files[path].includes(fragment), true, `${path} lacks ${fragment}`);
}

requires('index.html', `main-rhbg-fitguard.js?v=${key}`);
requires('main-rhbg-fitguard.js', `core/app.js?v=${key}`);
requires('core/app.js', `app-standalone-runtime.js?v=${key}`);
requires('core/app.js', `model-converters-tab.js?v=${key}`);
requires('tabs/model-converters-tab.js', `model-converters/index.js?v=${key}`);
requires('tabs/model-converters/index.js', `ModelConvertersTab-fbx2-managed-reference.js?v=${key}`);

const wrapper = files['tabs/model-converters/ModelConvertersTab-fbx2-managed-reference.js'];
for (const dependency of [
  'fbx-review-ui-addon.js',
  'fbx-live-runner-addon.js',
  'fbx-preview-zone-selector.js',
  'fbx-selected-zone-preview-bridge.js',
  'zone-toolbar.js',
]) assert.equal(wrapper.includes(`${dependency}?v=${key}`), true, `wrapper lacks live ${dependency}`);

const calls = [
  'installFbxReviewUiAddon();',
  'installFbxLiveRunnerAddon();',
  'installFbxPreviewZoneSelector(container);',
  'installFbxSelectedZonePreviewBridge();',
  'installFbxZoneGeometryToolbar(container);',
  'renderBaseModelConvertersTab(container, ctx);',
].map((fragment) => wrapper.indexOf(fragment));
assert.equal(calls.every((index) => index >= 0), true, 'live installer call is missing');
assert.deepEqual([...calls].sort((a, b) => a - b), calls, 'live installers are out of order');

requires('tabs/model-converters/fbx-review-ui-addon.js', 'synchronizeInput');
requires('tabs/model-converters/fbx-review-ui-addon.js', "const SECONDARY_ACCEPT = '.fbxmap.json,.json,.JSON,.zip,.ZIP'");
requires('tabs/model-converters/fbx-review-ui-addon.js', "synchronizeInput(converter, 'secondary'");
requires('tabs/model-converters/fbx-live-runner-addon.js', `FBX_LIVE_UI_ACTIVE:${key}`);
requires('tabs/model-converters/fbx-live-runner-addon.js', 'FBX_SECONDARY_INPUT:');
requires('tabs/model-converters/fbx-live-runner-addon.js', 'FBX_PREVIEW_AUTHORITY:');
requires('tabs/model-converters/fbx-live-runner-addon.js', 'prioritizeFbxSourceGraphOutputs');
requires('tabs/model-converters/fbx-live-runner-addon.js', 'fbxSelectedZoneId');
requires('tabs/model-converters/fbx-selected-zone-preview-bridge.js', 'STAGEDJSON_SELECTED_ZONE_PASS');
requires('tabs/model-converters/fbx-selected-zone-preview-bridge.js', "conversionStatus: 'STAGEDJSON_PASS'");
requires('tabs/model-converters/fbx-preview-zone-selector.js', 'Preview zone');
requires('tabs/model-converters/converters/fbx/zone-geometry/zone-toolbar.js', 'Analyse zone geometry');
requires('tabs/model-converters/converters/fbx/zone-geometry/zone-toolbar.js', 'buildFbxZoneWireframeMetaText');

for (const path of paths.slice(0, 9)) {
  for (const obsolete of obsoleteKeys) {
    assert.equal(files[path].includes(obsolete), false, `${path} still exposes obsolete cache key ${obsolete}`);
  }
}

const selectedOutput = {
  name: 'sample.zone.selected-zone.json',
  text: '[{"type":"BRANCH","children":[{"type":"PIPE"}]}]',
};
const normalized = normalizeSelectedZonePreviewDetail({
  conversionStatus: 'STAGEDJSON_SELECTED_ZONE_PASS',
  outputs: [selectedOutput, { name: 'sample.fbx-conversion-report.json', text: '{}' }],
});
assert.equal(normalized.conversionStatus, 'STAGEDJSON_PASS');
assert.equal(normalized.originalConversionStatus, 'STAGEDJSON_SELECTED_ZONE_PASS');
assert.equal(normalized.outputs[0].name, 'sample.zone.staged.json');
assert.equal(normalizeSelectedZonePreviewDetail({ conversionStatus: 'BLOCKED' }), null);

console.log('test-fbx2-runtime-cache-chain: PASS');
