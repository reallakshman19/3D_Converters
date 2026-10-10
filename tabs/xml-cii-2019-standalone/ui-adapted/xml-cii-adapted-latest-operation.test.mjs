import { test } from 'node:test';
import assert from 'node:assert/strict';
import { beginLatestOperation } from './xml-cii-adapted-latest-operation.js';

test('late completion of superseded same-kind source read is rejected', async () => {
  const stateRef = { current: {} };
  const first = beginLatestOperation(stateRef, 'source-file');
  assert.equal(first(), true);
  const second = beginLatestOperation(stateRef, 'source-file');
  assert.equal(first(), false);
  assert.equal(second(), true);
});

test('selection and manual text cancel pending file read', () => {
  const owner = {};
  const read = beginLatestOperation(owner, 'staged-json-file');
  beginLatestOperation(owner, 'staged-json-file');
  assert.equal(read(), false);
});

test('operations are independent by kind and UI state owner', () => {
  const a = {}, b = {};
  const readA = beginLatestOperation(a, 'source-file');
  const buildA = beginLatestOperation(a, 'resolver-build');
  const readB = beginLatestOperation(b, 'source-file');
  beginLatestOperation(a, 'source-file');
  assert.equal(readA(), false);
  assert.equal(buildA(), true);
  assert.equal(readB(), true);
});

test('new Build rejects previous Build on identical basis', () => {
  const owner = {};
  const older = beginLatestOperation(owner, 'resolver-build');
  const newer = beginLatestOperation(owner, 'resolver-build');
  assert.equal(older(), false);
  assert.equal(newer(), true);
});

test('invalid owners and operation names fail closed', () => {
  assert.throws(() => beginLatestOperation(null, 'source-file'), TypeError);
  assert.throws(() => beginLatestOperation({}, ''), TypeError);
});
