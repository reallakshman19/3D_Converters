import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const root = new URL('../../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
const [addon, tab, controller, liveInput] = await Promise.all([
  read('tabs/model-converters/fbx-zone-package-export.js'),
  read('tabs/model-converters/ModelConvertersTab.js'),
  read('tabs/model-converters/converters/fbx/zone-geometry/analysis-controller.js'),
  read('tabs/model-converters/converters/fbx/zone-package/live-input.js'),
]);
assert.match(addon, /model-converters:fbx-zone-package-inputs/);
assert.match(addon, /buildSelectedZonePackage/); assert.match(addon, /buildPackageArchive/);
assert.match(addon, /URL\.createObjectURL/); assert.match(addon, /URL\.revokeObjectURL/);
assert.match(addon, /disabled>Download zone package/);
assert.match(controller, /zonePackageInputs/); assert.match(controller, /fbx-zone-package-inputs/);
assert.match(liveInput, /buildLiveZonePackageInputs/); assert.match(liveInput, /buildSelectedZoneGeometryManifest/);
assert.doesNotMatch(addon, /new Worker\(|OffscreenCanvas|getContext\(['"]webgl/);
assert.match(tab, /installFbxZonePackageExport/);
console.log('test-zone-package-export-static: PASS');
