import assert from 'node:assert/strict';
import fs from 'node:fs';

const addonPath = new URL('../tabs/model-converters/cii-ver11-merge-addon.js', import.meta.url);
const tabPath = new URL('../tabs/model-converters/ModelConvertersTab.js', import.meta.url);
const shimPath = new URL('../tabs/model-converters-tab.js', import.meta.url);

const addon = fs.readFileSync(addonPath, 'utf8');
const tab = fs.readFileSync(tabPath, 'utf8');
const shim = fs.readFileSync(shimPath, 'utf8');

assert.match(addon, /CII Ver 11 Merge/);
assert.match(addon, /type="file"[^>]*multiple/);
assert.match(addon, /data-cii-v11-offset/);
assert.match(addon, /--input/);
assert.match(addon, /--offset/);
assert.match(addon, /--allow-node-overlap/);
assert.match(addon, /cii2019_multi_merge\.py/);
assert.match(addon, /cii2019_section_rules\.py/);
assert.match(addon, /Download merged CII/);
assert.match(addon, /Download merge receipt/);
assert.match(addon, /10 → 5010/);
assert.match(addon, /20 → 5020/);
assert.match(addon, /30 → 5030/);

assert.match(tab, /installCiiVer11MergeAddon/);
assert.match(tab, /cii-ver11-merge-addon\.js\?v=20260816-cii-ver11-merge-1/);
assert.match(tab, /installSafely\('cii-ver11-merge-addon'/);
assert.match(shim, /20260816-cii-ver11-merge-1/);

console.log('CII Ver 11 merge UI static wiring: PASS');
