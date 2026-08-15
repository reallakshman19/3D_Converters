import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  VIBRATION_INTEGRITY_AUDIT_EVENT_TYPES,
  appendVibrationIntegrityAuditEvent,
  assertVibrationIntegrityAuditLog,
  createVibrationIntegrityAuditLog,
} from '../tabs/vibration-integrity-audit-log.js';
import {
  VIBRATION_INTEGRITY_ACTION_IDS,
  VIBRATION_INTEGRITY_FIT_CONTRACT,
} from '../tabs/vibration-integrity-product-contract.js';
import { transitionVibrationIntegrityResultState } from '../tabs/vibration-integrity-result-state.js';
import { deriveVibrationIntegrityWorkflowState } from '../tabs/vibration-integrity-workflow-state.js';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

function auditEvent(eventType, timestamp, workflowBefore, workflowAfter, details = {}) {
  return { eventType, timestamp, workflowBefore, workflowAfter, details };
}

test('PR511 freezes FIT actions and result facts without owning workspace navigation', async () => {
  const [inputView, tab] = await Promise.all([
    readFile(resolve(ROOT, 'tabs/vibration-integrity-input-view.js'), 'utf8'),
    readFile(resolve(ROOT, 'tabs/vibration-integrity-tab.js'), 'utf8'),
  ]);
  for (const action of Object.values(VIBRATION_INTEGRITY_ACTION_IDS)) {
    assert.match(inputView, new RegExp(`data-vi-action=["']${action}["']`, 'u'));
  }
  for (const label of ['Readiness:', 'Evidence:', 'Audit events:', 'Last audit:', 'Run snapshot:']) {
    assert.match(inputView, new RegExp(label, 'u'));
  }
  assert.doesNotMatch(inputView, /Audit snapshot:/u);
  assert.match(tab, /VIBRATION_INTEGRITY_ACTION_IDS/u);
  assert.match(tab, /deriveVibrationIntegrityWorkflowState/u);
  assert.equal(VIBRATION_INTEGRITY_FIT_CONTRACT.authorityBoundary.designAuthority, false);
  assert.equal(VIBRATION_INTEGRITY_FIT_CONTRACT.authorityBoundary.candidateMechanismsMayReplaceScreeningGoverning, false);
  assert.equal('requiredWorkspaceTabs' in VIBRATION_INTEGRITY_FIT_CONTRACT, false);
  assert.equal(VIBRATION_INTEGRITY_AUDIT_EVENT_TYPES.includes('RUN_EVIDENCE_EXPORT_STARTED'), true);
});

test('FIT result currency remains distinct from observational product workflow state', () => {
  assert.equal(transitionVibrationIntegrityResultState('UNRUN', 'RUN_STARTED'), 'RUNNING');
  assert.equal(transitionVibrationIntegrityResultState('RUNNING', 'RUN_SUCCEEDED'), 'CURRENT_RESULT');
  assert.equal(transitionVibrationIntegrityResultState('RUNNING', 'RUN_SUCCEEDED', { drifted: true }), 'STALE_RESULT');
  assert.equal(transitionVibrationIntegrityResultState('CURRENT_RESULT', 'INPUT_CHANGED', { hasRetainedResult: true }), 'STALE_RESULT');
  assert.equal(transitionVibrationIntegrityResultState('UNRUN', 'INPUT_CHANGED'), 'UNRUN');
  assert.equal(transitionVibrationIntegrityResultState('RUNNING', 'RUN_FAILED'), 'INVALID_INPUT');
  assert.equal(transitionVibrationIntegrityResultState('RUNNING', 'RUN_FAILED', { hasRetainedResult: true }), 'STALE_RESULT');
  assert.equal(transitionVibrationIntegrityResultState('STALE_RESULT', 'RESET'), 'UNRUN');
  assert.throws(() => transitionVibrationIntegrityResultState('UNKNOWN', 'RUN_STARTED'), /VIBRATION_RESULT_STATE_INVALID/u);

  const workflow = deriveVibrationIntegrityWorkflowState({ resultState: 'CURRENT_RESULT' });
  assert.equal(workflow.state, 'RESULT_CURRENT');
  assert.equal(workflow.resultState, 'CURRENT_RESULT');
  assert.notEqual(workflow.state, workflow.resultState);
});

test('activity log is immutable, sequence-checked and always non-authoritative', () => {
  const empty = createVibrationIntegrityAuditLog();
  const opened = appendVibrationIntegrityAuditEvent(empty, auditEvent(
    'WORKSPACE_OPENED', '2026-08-15T06:00:00.000Z', null, 'EMPTY', { product: 'Vibration Integrity' },
  ));
  const loaded = appendVibrationIntegrityAuditEvent(opened, auditEvent(
    'BENCHMARK_LOADED', '2026-08-15T06:00:30.000Z', 'EMPTY', 'INPUTS_LOADED', { benchmarkId: 'EI-D2' },
  ));
  const running = appendVibrationIntegrityAuditEvent(loaded, auditEvent(
    'FIT_RUN_STARTED', '2026-08-15T06:01:00.000Z', 'READY_CHECKED', 'RUNNING', {},
  ));
  assert.equal(empty.events.length, 0);
  assert.deepEqual(running.events.map((event) => event.eventId), [
    'VI-EVT-000001', 'VI-EVT-000002', 'VI-EVT-000003',
  ]);
  assert.equal(running.events[2].eventType, 'FIT_RUN_STARTED');
  assert.equal(running.events[2].authority.engineeringAuthority, 'NONE');
  assert.equal(running.events[2].authority.purpose, 'ACTIVITY_AUDIT_ONLY');
  assert.equal(Object.isFrozen(running), true);
  assert.equal(Object.isFrozen(running.events[1]), true);
  assert.equal(assertVibrationIntegrityAuditLog(running), running);
  const tampered = { ...running, events: [{ ...running.events[0], sequence: 2 }, ...running.events.slice(1)] };
  assert.throws(() => assertVibrationIntegrityAuditLog(tampered), /VIBRATION_AUDIT_EVENT_INVALID/u);
});
