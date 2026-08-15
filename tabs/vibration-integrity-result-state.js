import { VIBRATION_INTEGRITY_RESULT_STATES } from './vibration-integrity-product-contract.js';

export const VIBRATION_INTEGRITY_RESULT_STATE_EVENTS = Object.freeze([
  'RESET',
  'INPUT_CHANGED',
  'RUN_STARTED',
  'RUN_SUCCEEDED',
  'RUN_FAILED',
]);

function assertResultState(value) {
  if (!VIBRATION_INTEGRITY_RESULT_STATES.includes(value)) {
    throw new TypeError(`VIBRATION_RESULT_STATE_INVALID:${String(value)}`);
  }
  return value;
}

function assertEvent(value) {
  if (!VIBRATION_INTEGRITY_RESULT_STATE_EVENTS.includes(value)) {
    throw new TypeError(`VIBRATION_RESULT_STATE_EVENT_INVALID:${String(value)}`);
  }
  return value;
}

export function transitionVibrationIntegrityResultState(currentState, event, options = {}) {
  assertResultState(currentState);
  assertEvent(event);
  const retained = options.hasRetainedResult === true;
  if (event === 'RESET') return 'UNRUN';
  if (event === 'INPUT_CHANGED') return retained ? 'STALE_RESULT' : 'UNRUN';
  if (event === 'RUN_STARTED') return 'RUNNING';
  if (event === 'RUN_SUCCEEDED') return options.drifted === true ? 'STALE_RESULT' : 'CURRENT_RESULT';
  return retained ? 'STALE_RESULT' : 'INVALID_INPUT';
}
