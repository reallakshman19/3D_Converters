// Test titles MUST start with the card's test id: test('T1 ...'). card-check enforces this.
import test from 'node:test';
import assert from 'node:assert/strict';
import { attempt } from '../kit/core.mjs';
import { run } from '../engine/index.mjs';

test('T1 example: a non-empty input is read', async () => {
  const r = await attempt(() => run(new Uint8Array([1, 2, 3])));
  assert.equal(r.ok, true);
  assert.equal(r.bytes, 3);
});

test('refusal __CARD_PREFIX___EMPTY_INPUT on empty input, with no output', async () => {
  const r = await attempt(() => run(new Uint8Array()));
  assert.equal(r.ok, false);
  assert.equal(r.refusals[0].code, '__CARD_PREFIX___EMPTY_INPUT');
  assert.equal(r.bytes, undefined);
});
