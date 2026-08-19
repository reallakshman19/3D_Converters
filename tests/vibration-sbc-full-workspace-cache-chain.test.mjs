import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const SHARED_KEY = '20260819-vib-pulsation-transient-workbench-1';
const SBC_KEY = '20260819-sbc-connection-authoring-1';
const TYPE3_KEY = '20260815-sbc-pf05-cache-1';

function source(path) {
  return readFileSync(`${root}/${path}`, 'utf8');
}

const SHARED_EDGES = Object.freeze([
  ['index.html', `./main-rhbg-fitguard.js?v=${SHARED_KEY}`],
  ['main-rhbg-fitguard.js', `./core/app.js?v=${SHARED_KEY}`],
  ['core/app.js', `./engineering-tabs-extension.js?v=${SHARED_KEY}`],
  ['core/engineering-tabs-extension.js', `../tabs/engineering-workspace-tab.js?v=${SHARED_KEY}`],
  ['tabs/engineering-workspace-tab.js', `./engineering-calculations-tab.js?v=${SHARED_KEY}`],
  ['tabs/engineering-calculations-tab.js', `./vibration-integrity-tab.js?v=${SHARED_KEY}`],
  ['tabs/vibration-integrity-tab.js', `./vibration-integrity-user-data-shell.js?v=${SHARED_KEY}`],
  ['tabs/vibration-integrity-user-data-shell.js', `./vibration-integrity-ui-contract.js?v=${SHARED_KEY}`],
]);

const SBC_EDGES = Object.freeze([
  ['tabs/vibration-integrity-user-data-shell.js', `./vibration-integrity-sbc-connection-model.js?v=${SBC_KEY}`],
  ['tabs/vibration-integrity-user-data-shell.js', `./vibration-integrity-sbc-workspace-model.js?v=${SBC_KEY}`],
  ['tabs/vibration-integrity-user-data-shell.js', `./vibration-integrity-sbc-workspace-view.js?v=${SBC_KEY}`],
  ['tabs/vibration-integrity-sbc-workspace-view.js', `./vibration-integrity-sbc-workspace-model.js?v=${SBC_KEY}`],
  ['tabs/vibration-integrity-sbc-workspace-view.js', `./vibration-integrity-sbc-connection-view.js?v=${SBC_KEY}`],
  ['tabs/vibration-integrity-sbc-connection-view.js', `./vibration-integrity-sbc-connection-model.js?v=${SBC_KEY}`],
]);

test('shared startup uses the current Vibration workbench cache identity', () => {
  for (const [path, expected] of SHARED_EDGES) {
    assert.ok(source(path).includes(expected), `${path} must contain ${expected}`);
  }
});

test('unchanged SBC connection descendants retain their release identity', () => {
  for (const [path, expected] of SBC_EDGES) {
    assert.ok(source(path).includes(expected), `${path} must contain ${expected}`);
  }
});

test('shared Vibration release does not silently re-version Type-3 descendants', () => {
  const shell = source('tabs/vibration-integrity-user-data-shell.js');
  const workspaceView = source('tabs/vibration-integrity-sbc-workspace-view.js');
  assert.ok(shell.includes(`type3-user-data.js?v=${TYPE3_KEY}`));
  assert.ok(shell.includes(`vibration-integrity-sbc-type3-controller.js?v=${TYPE3_KEY}`));
  assert.ok(shell.includes(`vibration-integrity-sbc-type3-state.js?v=${TYPE3_KEY}`));
  assert.ok(workspaceView.includes(`vibration-integrity-sbc-type3-view.js?v=${TYPE3_KEY}`));
  assert.equal(shell.includes(`type3-user-data.js?v=${SHARED_KEY}`), false);
});
