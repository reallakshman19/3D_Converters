// Kit wiring checks; keep this file. INPUT_SHA256_MISMATCH is the kit's refusal for a wrong input file.
import test from 'node:test';
import assert from 'node:assert/strict';
import { attempt, requireSha256, sha256Hex } from '../kit/core.mjs';

test('kit: sha256 of "abc" is the published value', async () => {
  assert.equal(await sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('kit: INPUT_SHA256_MISMATCH when bytes are not the pinned file', async () => {
  const r = await attempt(() => requireSha256(new TextEncoder().encode('x'), '0'.repeat(64), 'demo'));
  assert.equal(r.ok, false);
  assert.equal(r.refusals[0].code, 'INPUT_SHA256_MISMATCH');
});
