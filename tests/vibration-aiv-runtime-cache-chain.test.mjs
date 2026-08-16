import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const key = '20260816-aiv-526-editor-2';
const supersededKeys = [
  '20260815-aiv-pf01-cache-1',
  '20260815-aiv-526-unified-1',
  '20260816-aiv-526-editor-1',
];
const read = (path) => readFile(new URL(path, root), 'utf8');

const paths = [
  'index.html',
  'main-rhbg-fitguard.js',
  'core/app.js',
  'core/engineering-tabs-extension.js',
  'tabs/engineering-workspace-tab.js',
  'tabs/engineering-calculations-tab.js',
  'tabs/vibration-aiv-qualification-tab.js',
  'tabs/vibration-aiv-qualification-view.js',
  'tabs/vibration-aiv-input-view.js',
  'tabs/vibration-aiv-unified-canvas-controller.js',
  'tabs/vibration-aiv-unified-canvas-view.js',
  'tabs/vibration-aiv-unified-canvas-author-view.js',
  'tabs/vibration-aiv-unified-canvas-inspector.js',
  'tabs/vibration-aiv-unified-canvas-editor-controller.js',
  'tabs/vibration-aiv-unified-canvas-workflow.js',
  'tabs/vibration-aiv-workspace-browser.js',
  'tabs/vibration-aiv-qualification.css',
];

const files = Object.fromEntries(await Promise.all(
  paths.map(async (path) => [path, await read(path)]),
));

function requires(path, fragment) {
  assert.equal(files[path].includes(fragment), true, `${path} lacks ${fragment}`);
}

test('fresh AIV editor cache identity reaches the one-canvas qualification entrypoint', () => {
  requires('index.html', `main-rhbg-fitguard.js?v=${key}`);
  requires('main-rhbg-fitguard.js', `core/app.js?v=${key}`);
  requires('core/app.js', `engineering-tabs-extension.js?v=${key}`);
  requires('core/engineering-tabs-extension.js', `engineering-workspace-tab.js?v=${key}`);
  requires('tabs/engineering-workspace-tab.js', `engineering-calculations-tab.js?v=${key}`);
  requires('tabs/engineering-calculations-tab.js', `vibration-aiv-qualification-tab.js?v=${key}`);
  requires('tabs/vibration-aiv-qualification-tab.js', `vibration-aiv-qualification-view.js?v=${key}`);
  requires('tabs/vibration-aiv-qualification-tab.js', `vibration-aiv-unified-canvas-controller.js?v=${key}`);
  requires('tabs/vibration-aiv-qualification-view.js', `vibration-aiv-input-view.js?v=${key}`);
  requires('tabs/vibration-aiv-input-view.js', `vibration-aiv-unified-canvas-view.js?v=${key}`);
});

test('changed unified editor leaves are cache-pinned from the fresh renderer/controller', () => {
  requires('tabs/vibration-aiv-unified-canvas-view.js', `vibration-aiv-unified-canvas-author-view.js?v=${key}`);
  requires('tabs/vibration-aiv-unified-canvas-view.js', `vibration-aiv-unified-canvas-inspector.js?v=${key}`);
  requires('tabs/vibration-aiv-unified-canvas-controller.js', `vibration-aiv-canvas-selection.js?v=${key}`);
  requires('tabs/vibration-aiv-unified-canvas-controller.js', `vibration-aiv-unified-canvas-author.js?v=${key}`);
  requires('tabs/vibration-aiv-unified-canvas-controller.js', `vibration-aiv-unified-canvas-editor-controller.js?v=${key}`);
  requires('tabs/vibration-aiv-unified-canvas-editor-controller.js', `vibration-aiv-unified-canvas-workflow.js?v=${key}`);
  requires('tabs/vibration-aiv-workspace-browser.js', 'vibration-aiv-qualification.css?v=aiv-qualification-15');
  requires('tabs/vibration-aiv-qualification.css', 'vibration-aiv-unified-canvas-editor.css?v=1');
});

test('active qualification source names one full editor controller and one unified render surface', () => {
  requires('tabs/vibration-aiv-qualification-tab.js', 'createAivUnifiedCanvasController');
  requires('tabs/vibration-aiv-input-view.js', 'renderAivUnifiedCanvasWorkspaceHtml');
  requires('tabs/vibration-aiv-unified-canvas-view.js', 'data-aiv-unified-canvas-svg="true"');
  requires('tabs/vibration-aiv-unified-canvas-view.js', 'AIV Network Canvas Editor');
  requires('tabs/vibration-aiv-unified-canvas-controller.js', 'createAivUnifiedCanvasEditorController');
  requires('tabs/vibration-aiv-unified-canvas-author-view.js', 'data-aiv-canvas-editor-tool="PLACE_NODE"');
  assert.equal(files['tabs/vibration-aiv-qualification-tab.js'].includes('createAivCanvasInteractionController'), false);
  assert.equal(files['tabs/vibration-aiv-qualification-tab.js'].includes('createAivFlareNetworkAuthoringController'), false);
});

test('stage7 scratch-network workflow is visible and preserves qualified authority wording', () => {
  requires('tabs/vibration-aiv-unified-canvas-editor-controller.js', 'New flare network');
  requires('tabs/vibration-aiv-unified-canvas-editor-controller.js', 'Add RV + branch');
  requires('tabs/vibration-aiv-unified-canvas-editor-controller.js', 'Subheader junction');
  requires('tabs/vibration-aiv-unified-canvas-editor-controller.js', 'qualified readiness check remains authoritative');
  requires('tabs/vibration-aiv-unified-canvas-view.js', 'Engineering inputs changed');
  requires('tabs/vibration-aiv-unified-canvas-view.js', 'isAivLineageCurrent');
  requires('tabs/vibration-aiv-unified-canvas-workflow.js', "source: 'AIV_FLARE_NETWORK_UI'");
});

test('superseded AIV cache identities are absent from active editor startup path', () => {
  for (const oldKey of supersededKeys) {
    for (const path of paths.slice(0, 11)) {
      assert.equal(files[path].includes(oldKey), false, `${path} still exposes ${oldKey}`);
    }
  }
});

test('shared engineering entrypoint preserves current FIV cache identity', () => {
  requires('tabs/engineering-calculations-tab.js', 'vibration-integrity-tab.js?v=20260815-sbc-pf05-cache-1');
});

test('unified controller still consumes the corrected null-safe canvas filter contract', async () => {
  const filter = await read('tabs/vibration-aiv-canvas-filter.js');
  requires('tabs/vibration-aiv-unified-canvas-controller.js', "from './vibration-aiv-canvas-filter.js'");
  assert.equal(filter.includes('input = input ?? {};'), true);
});
