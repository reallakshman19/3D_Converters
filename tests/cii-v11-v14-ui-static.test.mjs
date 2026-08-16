import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const app = read('core/app.js');
const addon = read('tabs/model-converters/cii-v11-v14-addon.js');
const runner = read('tabs/model-converters/converters/cii-v11-v14.js');
const worker = read('converters/cii-v11-v14-worker.js');
const shim = read('tabs/model-converters-tab.js');
const legacyAdapter = read('tabs/model-converters/legacy-adapter.js');

const releaseKey = '20260816-cii-v11-v14-dropdown-release-2';

// The app shell must force-load the current Model Converters shim rather than a
// pre-converter cached URL.
assert.match(app, new RegExp(`model-converters-tab\\.js\\?v=${releaseKey}`));
assert.match(app, new RegExp(`__MODEL_CONVERTERS_CACHE_KEY__ = '${releaseKey}'`));

// A malformed shim once carried duplicate const declarations after concurrent
// merges. Keep this as a hard syntax-structure guard.
assert.equal((shim.match(/const MODEL_CONVERTERS_SHIM_VERSION/g) || []).length, 1);
assert.equal((shim.match(/const CANONICAL_MODULE/g) || []).length, 1);
assert.match(shim, new RegExp(`cii-v11-v14-addon\\.js\\?v=${releaseKey}`));
assert.match(shim, /installCiiV11V14Addon/);
assert.match(shim, /dropdown addon did not register the converter/);

// Dropdown ownership: addon and legacy renderer must import the exact same
// registry module URL so the mutation is visible before <option> rendering.
assert.match(addon, /id:\s*CONVERTER_ID/);
assert.match(addon, /CAESAR Ver\. 14 ↔ 11/);
assert.match(addon, /targetVersion/);
assert.match(addon, /allowLossy/);
assert.match(addon, /cii_syntax_check_2019/);
assert.match(addon, /CONVERTERS as DROPDOWN_CONVERTERS/);
assert.match(addon, /converter-registry\.js\?v=20260617-basic-glb-3/);
assert.match(addon, /installIntoDropdown\(DROPDOWN_CONVERTERS\)/);
assert.match(addon, new RegExp(`const VERSION = '${releaseKey}'`));
assert.doesNotMatch(addon, /SELECTOR_CONVERTERS/);
assert.doesNotMatch(addon, /LIVE_CONVERTERS/);
assert.doesNotMatch(addon, /document\.createElement|innerHTML|appendChild/);
assert.match(legacyAdapter, /converter-registry\.js\?v=20260617-basic-glb-3/);

// Engineering runner remains isolated and unchanged in ownership.
assert.match(runner, /cii-v11-v14-worker\.js/);
assert.match(runner, /\.audit\.json/);
assert.match(worker, /cii_v11_v14\.py/);
assert.match(worker, /--audit-json/);
assert.match(worker, /--allow-lossy/);

console.log('cii-v11-v14 dropdown runtime chain: PASS');
