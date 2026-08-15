import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const key = '20260815-aiv-526-unified-1';
const oldKey = '20260815-aiv-pf01-cache-1';
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
];

const files = Object.fromEntries(await Promise.all(
  paths.map(async (path) => [path, await read(path)]),
));

function requires(path, fragment) {
  assert.equal(files[path].includes(fragment), true, `${path} lacks ${fragment}`);
}

test('fresh AIV unified cache identity reaches the one-canvas qualification entrypoint', () => {
  requires('index.html', `main-rhbg-fitguard.js?v=${key}`);
  requires('main-rhbg-fitguard.js', `core/app.js?v=${key}`);
  requires('core/app.js', `engineering-tabs-extension.js?v=${key}`);
  requires('core/engineering-tabs-extension.js', `engineering-workspace-tab.js?v=${key}`);
  requires('tabs/engineering-workspace-tab.js', `engineering-calculations-tab.js?v=${key}`);
  requires('tabs/engineering-calculations-tab.js', `vibration-aiv-qualification-tab.js?v=${key}`);
  requires('tabs/vibration-aiv-qualification-tab.js', `vibration-aiv-qualification-view.js?v=${key}`);
  requires('tabs/vibration-aiv-qualification-tab.js', `vibration-aiv-dataset-loader.js?v=${key}`);
  requires('tabs/vibration-aiv-qualification-tab.js', `vibration-aiv-execution.js?v=${key}`);
  requires('tabs/vibration-aiv-qualification-tab.js', `vibration-aiv-master-db-controller.js?v=${key}`);
  requires('tabs/vibration-aiv-qualification-tab.js', `vibration-aiv-state.js?v=${key}`);
  requires('tabs/vibration-aiv-qualification-tab.js', `vibration-aiv-unified-canvas-controller.js?v=${key}`);
  requires('tabs/vibration-aiv-qualification-view.js', `vibration-aiv-input-view.js?v=${key}`);
});

test('active qualification source names one unified controller and one unified render surface', () => {
  requires('tabs/vibration-aiv-qualification-tab.js', 'createAivUnifiedCanvasController');
  requires('tabs/vibration-aiv-input-view.js', 'renderAivUnifiedCanvasWorkspaceHtml');
  requires('tabs/vibration-aiv-unified-canvas-view.js', 'data-aiv-unified-canvas-svg="true"');
  assert.equal(files['tabs/vibration-aiv-qualification-tab.js'].includes('createAivCanvasInteractionController'), false);
  assert.equal(files['tabs/vibration-aiv-qualification-tab.js'].includes('createAivFlareNetworkAuthoringController'), false);
  assert.equal(files['tabs/vibration-aiv-input-view.js'].includes('renderAivFlareNetworkAuthoringHtml'), false);
});

test('old PF-01 cache identity is absent from the active unified startup and qualification path', () => {
  for (const path of paths.slice(0, 9)) {
    assert.equal(files[path].includes(oldKey), false, `${path} still exposes ${oldKey}`);
  }
});

test('unified controller still consumes the corrected null-safe canvas filter contract', async () => {
  const filter = await read('tabs/vibration-aiv-canvas-filter.js');
  requires('tabs/vibration-aiv-unified-canvas-controller.js', "from './vibration-aiv-canvas-filter.js'");
  assert.equal(filter.includes('input = input ?? {};'), true);
});
