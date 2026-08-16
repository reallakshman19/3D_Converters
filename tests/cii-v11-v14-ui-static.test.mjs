import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const addon = read('tabs/model-converters/cii-v11-v14-addon.js');
const runner = read('tabs/model-converters/converters/cii-v11-v14.js');
const worker = read('converters/cii-v11-v14-worker.js');
const shim = read('tabs/model-converters-tab.js');

assert.match(addon, /id:\s*CONVERTER_ID/);
assert.match(addon, /CAESAR Ver\. 14 ↔ 11/);
assert.match(addon, /targetVersion/);
assert.match(addon, /allowLossy/);
assert.match(addon, /cii_syntax_check_2019/);
assert.match(runner, /cii-v11-v14-worker\.js/);
assert.match(runner, /\.audit\.json/);
assert.match(worker, /cii_v11_v14\.py/);
assert.match(worker, /--audit-json/);
assert.match(worker, /--allow-lossy/);
assert.match(shim, /cii-v11-v14-addon\.js/);
assert.match(shim, /installCiiV11V14Addon/);

console.log('cii-v11-v14 UI static wiring: PASS');
