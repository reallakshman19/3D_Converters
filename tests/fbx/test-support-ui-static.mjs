import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const paths = [
  '../../tabs/model-converters/converters/fbx/support-analysis/ui.js',
  '../../tabs/model-converters/converters/fbx/zone-geometry/zone-toolbar.js',
  '../../tabs/model-converters/converters/fbx/zone-geometry/wireframe-preview.js',
  '../../tabs/model-converters/fbx-preview-zone-selector.js',
];
const text = (await Promise.all(paths.map((path) => fs.readFile(new URL(path, import.meta.url), 'utf8')))).join('\n');
for (const label of ['Analyse supports','Download support evidence','Download zone engineering package',
  'supports: not evaluated','supports: analysing']) assert.ok(text.includes(label), label);
assert.ok(!text.includes('supports: 0 | annotations'));
assert.ok(!text.includes('data-fbx-support-analyse class="model-converters-download-btn">'));
console.log('PASS test-support-ui-static');
