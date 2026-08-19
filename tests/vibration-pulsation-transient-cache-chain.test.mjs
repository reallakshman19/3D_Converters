import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const KEY = '20260819-vib-pulsation-transient-workbench-1';

function source(path) {
  return readFileSync(`${root}/${path}`, 'utf8');
}

const EDGES = Object.freeze([
  ['index.html', `./main-rhbg-fitguard.js?v=${KEY}`],
  ['main-rhbg-fitguard.js', `./core/app.js?v=${KEY}`],
  ['core/app.js', `./engineering-tabs-extension.js?v=${KEY}`],
  ['core/engineering-tabs-extension.js', `../tabs/engineering-workspace-tab.js?v=${KEY}`],
  ['tabs/engineering-workspace-tab.js', `./engineering-calculations-tab.js?v=${KEY}`],
  ['tabs/engineering-calculations-tab.js', `./vibration-integrity-tab.js?v=${KEY}`],
  ['tabs/vibration-integrity-tab.js', `./vibration-integrity-user-data-shell.js?v=${KEY}`],
  ['tabs/vibration-integrity-user-data-shell.js', `./vibration-integrity-pulsation-transient-controller.js?v=${KEY}`],
  ['tabs/vibration-integrity-user-data-shell.js', `./vibration-integrity-pulsation-transient-view.js?v=${KEY}`],
  ['tabs/vibration-integrity-user-data-shell.js', `./vibration-integrity-ui-contract.js?v=${KEY}`],
  ['tabs/vibration-integrity-pulsation-transient-controller.js', `./vibration-integrity-pulsation-transient-model.js?v=${KEY}`],
  ['tabs/vibration-integrity-pulsation-transient-view.js', `./vibration-integrity-pulsation-transient-model.js?v=${KEY}`],
]);

test('startup through pulsation/transient workbench uses one current cache identity', () => {
  for (const [path, expected] of EDGES) {
    assert.ok(source(path).includes(expected), `${path} must contain ${expected}`);
  }
});

test('new workbench does not re-version numerical kernels', () => {
  const model = source('tabs/vibration-integrity-pulsation-transient-model.js');
  assert.ok(model.includes("from '../converters/vibration/deadleg/method.js'"));
  assert.ok(model.includes("from '../converters/vibration/transients/dry-gas-opening.js'"));
  assert.equal(model.includes(`deadleg/method.js?v=${KEY}`), false);
  assert.equal(model.includes(`dry-gas-opening.js?v=${KEY}`), false);
});
