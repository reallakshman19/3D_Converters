import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
const [toolbar, shell, index, shim, scope, ports, worker] = await Promise.all([
  read('tabs/model-converters/converters/fbx/zone-geometry/zone-toolbar.js'),
  read('tabs/model-converters/ModelConvertersTab.js'),
  read('tabs/model-converters/index.js'),
  read('tabs/model-converters-tab.js'),
  read('tabs/model-converters/converters/fbx/zone-geometry/zone-scope.js'),
  read('tabs/model-converters/converters/fbx/zone-geometry/derived-ports.js'),
  read('tests/fbx/test-zone-geometry-worker.mjs'),
]);

for (const label of ['Analyse zone geometry', 'Download zone geometry evidence',
  'Download derived port evidence']) assert.match(toolbar, new RegExp(label));
assert.match(toolbar, /Derived port evidence does not authorize engineering StagedJSON/);
assert.match(toolbar, /FBX-AUTO-002 is not implemented/);
assert.match(toolbar, /bindFbxPrimaryInputInvalidation/);
assert.match(toolbar, /A new FBX input was loaded; prior analysis was cleared/);
assert.match(toolbar, /container\.addEventListener\('change', listener, true\)/);
assert.match(toolbar, /Selected zone changed; prior analysis was cleared/);
assert.match(toolbar, /A new FBX run started; prior analysis was cleared/);
assert.match(toolbar, /controller\.analysis\.invalidate/);
assert.match(toolbar, /zoneGeometryJson/);
assert.match(toolbar, /derivedPortJson/);
assert.doesNotMatch(toolbar, /JSON\.stringify/);
assert.doesNotMatch(toolbar, /STAGEDJSON_PASS|data-fbx-zone-staged-download|buildFbxStagedJsonZoneExport/);
assert.doesNotMatch(toolbar, /mapping-package|convertFbxToStagedJson|port-resolver|connectivity/);
assert.doesNotMatch(scope, /toUpperCase|toLowerCase|localeCompare|Intl\.Collator|normalize\(/);
assert.match(scope, /domSubtype === GOVERNED_NULL_SUBTYPE/);
assert.match(scope, /`\$\{label\} · \$\{zoneId\}`/);
assert.match(ports, /compareDecimalId\(a\.geometryObjectId, b\.geometryObjectId\)/);
assert.doesNotMatch(worker, /not-available-in-local-harness|PASS \(real parity: not/);
assert.match(shell, /installFbxPreviewZoneSelector\(container\); installFbxZoneGeometryToolbar\(container\)/);
for (const text of [shell, index, shim]) assert.match(text, /20260727-fbx-auto-001-1/);
assert.ok(toolbar.split('\n').length <= 300);

console.log('test-zone-geometry-ui-static: PASS');
