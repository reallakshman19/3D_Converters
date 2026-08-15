import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  appendVibrationIntegrityAuditEvent,
  assertVibrationIntegrityAuditLog,
  createVibrationIntegrityAuditLog,
  serializeVibrationIntegrityAuditLog,
} from '../tabs/vibration-integrity-audit-log.js';
import {
  VIBRATION_INTEGRITY_ACTION_IDS,
  VIBRATION_INTEGRITY_PRODUCT_CONTRACT,
} from '../tabs/vibration-integrity-product-contract.js';
import { transitionVibrationIntegrityResultState } from '../tabs/vibration-integrity-workflow-state.js';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

function auditEvent(type, at, resultState = 'UNRUN') {
  return { type, at, resultState, authority: { designAuthority: false } };
}

test('product freeze keeps core actions and extension-safe workspace anchors visible', async () => {
  const [inputView, tab, shell] = await Promise.all([
    readFile(resolve(ROOT, 'tabs/vibration-integrity-input-view.js'), 'utf8'),
    readFile(resolve(ROOT, 'tabs/vibration-integrity-tab.js'), 'utf8'),
    readFile(resolve(ROOT, 'tabs/vibration-integrity-user-data-shell.js'), 'utf8'),
  ]);
  for (const action of Object.values(VIBRATION_INTEGRITY_ACTION_IDS)) {
    assert.match(inputView, new RegExp(`data-vi-action=["']${action}["']`, 'u'));
  }
  assert.match(tab, /VIBRATION_INTEGRITY_ACTION_IDS/u);
  for (const workspaceTab of VIBRATION_INTEGRITY_PRODUCT_CONTRACT.requiredCoreWorkspaceTabs) {
    assert.match(shell, new RegExp(`tabButton\\(["']${workspaceTab}["']`, 'u'));
  }
  assert.equal(VIBRATION_INTEGRITY_PRODUCT_CONTRACT.extensionPolicy.mechanismWorkspaceTabsAllowed, true);
  assert.equal(VIBRATION_INTEGRITY_PRODUCT_CONTRACT.authorityBoundary.designAuthority, false);
});

test('result currency follows one deterministic lifecycle', () => {
  assert.equal(transitionVibrationIntegrityResultState('UNRUN', 'RUN_STARTED'), 'RUNNING');
  assert.equal(transitionVibrationIntegrityResultState('RUNNING', 'RUN_SUCCEEDED'), 'CURRENT_RESULT');
  assert.equal(transitionVibrationIntegrityResultState('RUNNING', 'RUN_SUCCEEDED', { drifted: true }), 'STALE_RESULT');
  assert.equal(transitionVibrationIntegrityResultState('CURRENT_RESULT', 'INPUT_CHANGED', { hasRetainedResult: true }), 'STALE_RESULT');
  assert.equal(transitionVibrationIntegrityResultState('UNRUN', 'INPUT_CHANGED'), 'UNRUN');
  assert.equal(transitionVibrationIntegrityResultState('RUNNING', 'RUN_FAILED'), 'INVALID_INPUT');
  assert.equal(transitionVibrationIntegrityResultState('RUNNING', 'RUN_FAILED', { hasRetainedResult: true }), 'STALE_RESULT');
  assert.equal(transitionVibrationIntegrityResultState('STALE_RESULT', 'RESET'), 'UNRUN');
  assert.throws(() => transitionVibrationIntegrityResultState('UNKNOWN', 'RUN_STARTED'), /VIBRATION_RESULT_STATE_INVALID/u);
});

test('audit log is immutable, append-only and sequence-checked', () => {
  const empty = createVibrationIntegrityAuditLog('2026-08-15T06:00:00.000Z');
  const started = appendVibrationIntegrityAuditEvent(empty, auditEvent('SESSION_STARTED', '2026-08-15T06:00:00.000Z'));
  const running = appendVibrationIntegrityAuditEvent(started, auditEvent('RUN_STARTED', '2026-08-15T06:01:00.000Z', 'RUNNING'));
  assert.equal(empty.events.length, 0);
  assert.equal(started.events.length, 1);
  assert.deepEqual(running.events.map((event) => event.eventId), ['VI-AUDIT-000001', 'VI-AUDIT-000002']);
  assert.equal(Object.isFrozen(running), true);
  assert.equal(Object.isFrozen(running.events[1]), true);
  assert.equal(JSON.parse(serializeVibrationIntegrityAuditLog(running)).events.length, 2);
  const tampered = { ...running, events: [{ ...running.events[0], sequence: 2 }, running.events[1]] };
  assert.throws(() => assertVibrationIntegrityAuditLog(tampered), /VIBRATION_AUDIT_SEQUENCE_INVALID/u);
});
