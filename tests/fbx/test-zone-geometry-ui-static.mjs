import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
const [toolbar, shell, index, shim] = await Promise.all([
  read('tabs/model-converters/converters/fbx/zone-geometry/zone-toolbar.js'),
  read('tabs/model-converters/ModelConvertersTab.js'),
  read('tabs/model-converters/index.js'),
  read('tabs/model-converters-tab.js'),
]);

for (const label of ['Analyse zone geometry', 'Download zone geometry evidence',
  'Download derived port evidence']) assert.match(toolbar, new RegExp(label));
assert.match(toolbar, /Derived port evidence does not authorize engineering StagedJSON/);
assert.match(toolbar, /FBX-AUTO-002 is not implemented/);
assert.match(toolbar, /const selected = Boolean\(selectedZone\(controller\)\.zoneId\)/);
assert.match(toolbar, /controller\.analyse\.disabled = !selected \|\| !ready/);
assert.match(toolbar, /Selected zone changed; prior analysis was cleared/);
assert.match(toolbar, /A new FBX run started; prior analysis was cleared/);
assert.match(toolbar, /controller\.analysis\.invalidate/);
assert.match(toolbar, /zoneGeometryJson/);
assert.match(toolbar, /derivedPortJson/);
assert.doesNotMatch(toolbar, /JSON\.stringify/);
assert.doesNotMatch(toolbar, /STAGEDJSON_PASS|data-fbx-zone-staged-download|buildFbxStagedJsonZoneExport/);
assert.doesNotMatch(toolbar, /mapping-package|convertFbxToStagedJson|port-resolver|connectivity/);
assert.match(shell, /installFbxPreviewZoneSelector\(container\); installFbxZoneGeometryToolbar\(container\)/);
for (const text of [shell, index, shim]) assert.match(text, /20260727-fbx-auto-001-1/);
assert.ok(toolbar.split('\n').length <= 300);

console.log('test-zone-geometry-ui-static: PASS');
