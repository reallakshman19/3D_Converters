import assert from 'node:assert/strict';
import test from 'node:test';

import {
  currentAivInputRevision,
  isAivInputRevisionCurrent,
  touchAivInputRevision,
} from '../tabs/vibration-aiv-state-revision.js';

test('input revision initializes defensively and increments monotonically', () => {
  const state = {};
  assert.equal(currentAivInputRevision(state), 0);
  assert.equal(touchAivInputRevision(state), 1);
  assert.equal(touchAivInputRevision(state), 2);
  assert.equal(currentAivInputRevision(state), 2);
});

test('captured revision becomes stale after any engineering-input mutation', () => {
  const state = { inputRevision: 4 };
  const captured = currentAivInputRevision(state);
  assert.equal(isAivInputRevisionCurrent(state, captured), true);
  touchAivInputRevision(state);
  assert.equal(isAivInputRevisionCurrent(state, captured), false);
  assert.equal(isAivInputRevisionCurrent(state, 5), true);
});

test('invalid stored revision fails safe to zero before first touch', () => {
  const state = { inputRevision: Number.NaN };
  assert.equal(currentAivInputRevision(state), 0);
  assert.equal(touchAivInputRevision(state), 1);
});
