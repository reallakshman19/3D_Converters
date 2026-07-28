import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
const [addon, tab] = await Promise.all([
  read('tabs/model-converters/fbx-zone-package-export.js'),
  read('tabs/model-converters/ModelConvertersTab.js'),
]);

assert.match(addon, /export function installFbxZonePackageExport/);
assert.match(addon, /buildSelectedZonePackage/);
assert.match(addon, /buildPackageArchive/);
assert.match(addon, /URL\.createObjectURL/);
assert.match(addon, /URL\.revokeObjectURL/);
assert.match(addon, /Download zone package/);
assert.doesNotMatch(addon, /new Worker\(|OffscreenCanvas|getContext\(['"]webgl/, 'Phase 6 must not touch a Worker or canvas');
assert.doesNotMatch(addon, /parser-wasm|parser-worker|staged-writer/, 'Phase 6 must not touch the parser or Writer');

assert.match(tab, /installFbxZonePackageExport/);
assert.match(tab, /fbx-zone-package-export\.js\?v=/);

console.log('test-zone-package-export-static: PASS');
