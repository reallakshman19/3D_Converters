import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  isXml229AutoRunEligible,
  recordXml229AutoRunAttempted,
  scheduleXml229AutoRun,
} from '../tabs/xml-cii-2019-standalone/ui-adapted/xml229-output-auto-run.mjs';

test('isXml229AutoRunEligible checks all required authority and state gates', () => {
  const session = { closed: false };
  assert.equal(isXml229AutoRunEligible({
    governed: true, weightsReady: true, blocked: false,
    state: { running: false, result: null }, session,
  }), true, 'Must be eligible when governed, weights ready, unblocked and idle');

  assert.equal(isXml229AutoRunEligible({
    governed: false, weightsReady: true, blocked: false,
    state: { running: false, result: null }, session,
  }), false, 'Must not be eligible if not governed');

  assert.equal(isXml229AutoRunEligible({
    governed: true, weightsReady: false, blocked: false,
    state: { running: false, result: null }, session,
  }), false, 'Must not be eligible if weights are not ready');

  assert.equal(isXml229AutoRunEligible({
    governed: true, weightsReady: true, blocked: true,
    state: { running: false, result: null }, session,
  }), false, 'Must not be eligible if blocked');

  assert.equal(isXml229AutoRunEligible({
    governed: true, weightsReady: true, blocked: false,
    state: { running: true, result: null }, session,
  }), false, 'Must not be eligible if already running');

  assert.equal(isXml229AutoRunEligible({
    governed: true, weightsReady: true, blocked: false,
    state: { running: false, result: { ok: true } }, session,
  }), false, 'Must not be eligible if conversion result already ok');

  assert.equal(isXml229AutoRunEligible({
    governed: true, weightsReady: true, blocked: false,
    state: { running: false, result: null }, session: { closed: true },
  }), false, 'Must not be eligible if session is closed');

  // Once marked attempted, must not run again
  recordXml229AutoRunAttempted(session);
  assert.equal(isXml229AutoRunEligible({
    governed: true, weightsReady: true, blocked: false,
    state: { running: false, result: null }, session,
  }), false, 'Must not be eligible once marked attempted');
});

test('scheduleXml229AutoRun schedules execution via microtask once per session', async () => {
  let executedCount = 0;
  const session = { closed: false };
  const stateRef = {
    current: {
      activePhaseId: 'run',
      running: false,
      result: null,
    },
  };
  const finalizeBtn = { isConnected: true, disabled: false };
  const mockExecute = () => { executedCount++; };

  // First call should schedule execution
  scheduleXml229AutoRun({
    stateRef,
    render: () => {},
    governed: true,
    weightsReady: true,
    blocked: false,
    finalizeBtn,
    executeXml229NativeRun: mockExecute,
    session,
  });

  // Second call in same render tick should NOT schedule another execution
  scheduleXml229AutoRun({
    stateRef,
    render: () => {},
    governed: true,
    weightsReady: true,
    blocked: false,
    finalizeBtn,
    executeXml229NativeRun: mockExecute,
    session,
  });

  // Wait for microtask queue to drain
  await new Promise((resolve) => queueMicrotask(resolve));
  assert.equal(executedCount, 1, 'Auto-run must execute exactly once per session');
});

test('root and served xml229-output-auto-run.mjs are byte identical', async () => {
  const root = await readFile(new URL('../tabs/xml-cii-2019-standalone/ui-adapted/xml229-output-auto-run.mjs', import.meta.url), 'utf8');
  const docs = await readFile(new URL('../docs/tabs/xml-cii-2019-standalone/ui-adapted/xml229-output-auto-run.mjs', import.meta.url), 'utf8');
  assert.equal(root, docs, 'xml229-output-auto-run.mjs in tabs/ and docs/tabs/ must be byte identical');
});
