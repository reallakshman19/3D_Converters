import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const root = new URL('../../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
const [analysis, controller, toolbar, capture, liveInput, builder, validator, exporter] = await Promise.all([
  read('tabs/model-converters/converters/fbx/zone-geometry/analyse-zone.js'),
  read('tabs/model-converters/converters/fbx/zone-geometry/analysis-controller.js'),
  read('tabs/model-converters/converters/fbx/zone-geometry/zone-toolbar.js'),
  read('tabs/model-converters/converters/fbx/zone-geometry/mapped-stage-capture.js'),
  read('tabs/model-converters/converters/fbx/zone-package/live-input.js'),
  read('tabs/model-converters/converters/fbx/zone-package/package-builder.js'),
  read('tabs/model-converters/converters/fbx/zone-package/package-validation.js'),
  read('tabs/model-converters/fbx-zone-package-export.js'),
]);
assert.match(capture, /extractMappedEngineeringAttributeLedger/);
assert.match(toolbar, /engineeringAttributeLedger: controller\.runInput\.engineeringAttributeLedger/);
assert.match(controller, /engineeringAttributeLedger: input\.engineeringAttributeLedger/);
for (const token of ['componentCrosswalk', 'connectivityEvidence', 'elbowEvidence',
  'teeEvidence', 'reducerEvidence', 'branchFittingEvidence', 'inlineAssemblyEvidence']) {
  assert.match(analysis, new RegExp(token));
}
assert.match(liveInput, /buildSelectedZoneQualificationRoot/);
assert.match(liveInput, /buildSelectedZoneEngineeringAttributeLedger/);
assert.match(liveInput, /buildSelectedZoneSourceGraph/);
assert.match(builder, /buildPackageArtifactFiles/);
assert.match(validator, /verifyPackagedSemanticArtifacts/);
assert.match(exporter, /qualification PASS/);
assert.doesNotMatch([analysis, liveInput, builder].join('\n'), /Math\.random|Date\.now|localeCompare/);
console.log('test-selected-zone-package-production-capability: PASS');
