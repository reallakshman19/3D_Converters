import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const key = '20260815-aiv-pf01-cache-1';
const read = (path) => readFile(new URL(path, root), 'utf8');

const paths = [
  'index.html',
  'main-rhbg-fitguard.js',
  'core/app.js',
  'core/engineering-tabs-extension.js',
  'tabs/engineering-workspace-tab.js',
  'tabs/engineering-calculations-tab.js',
  'tabs/vibration-aiv-qualification-tab.js',
  'tabs/vibration-aiv-canvas-controller.js',
  'tabs/vibration-aiv-canvas-filter.js',
];

const files = Object.fromEntries(await Promise.all(
  paths.map(async (path) => [path, await read(path)]),
));

function requires(path, fragment) {
  assert.equal(files[path].includes(fragment), true, `${path} lacks ${fragment}`);
}

test('AIV PF-01 cache key reaches the corrected filter from the production startup shell', () => {
  requires('index.html', `main-rhbg-fitguard.js?v=${key}`);
  requires('main-rhbg-fitguard.js', `core/app.js?v=${key}`);
  requires('core/app.js', `engineering-tabs-extension.js?v=${key}`);
  requires('core/engineering-tabs-extension.js', `engineering-workspace-tab.js?v=${key}`);
  requires('tabs/engineering-workspace-tab.js', `engineering-calculations-tab.js?v=${key}`);
  requires('tabs/engineering-calculations-tab.js', `vibration-aiv-qualification-tab.js?v=${key}`);
  requires('tabs/vibration-aiv-qualification-tab.js', `vibration-aiv-canvas-controller.js?v=${key}`);
  requires('tabs/vibration-aiv-canvas-controller.js', `vibration-aiv-canvas-filter.js?v=${key}`);
  requires('tabs/vibration-aiv-canvas-filter.js', 'input = input ?? {};');
});

test('production AIV cache chain no longer exposes the live failing qualification token', () => {
  for (const path of paths.slice(0, 8)) {
    assert.equal(
      files[path].includes('vibration-aiv-qualification-tab.js?v=aiv-qualification-1'),
      false,
      `${path} still exposes the live failing AIV qualification token`,
    );
  }
});
