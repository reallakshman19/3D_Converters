// Step-10 "UXML route" (UXML plan step 5): the vendored stage matches its pin, and the switch is off unless turned on.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { importClosure, sha256 } from '../scripts/vendor-uxml-v2.mjs';
import { UXML_ROUTE_STORAGE_KEY, UXML_ROUTE_VENDOR, uxmlRouteOn } from '../v045/tabs/xml-cii-2019-standalone/xml-cii-uxml-route.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const VENDOR = path.join(ROOT, 'vendor/uxml-v2');
const pin = JSON.parse(fs.readFileSync(path.join(VENDOR, 'PIN.json'), 'utf8'));

function filesUnder(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory()
    ? filesUnder(path.join(dir, e.name), base) : [path.relative(base, path.join(dir, e.name)).split(path.sep).join('/')]));
}

test('every vendored UXML file matches its pinned SHA-256, and nothing else is there', () => {
  for (const [rel, hash] of Object.entries(pin.files)) assert.equal(sha256(fs.readFileSync(path.join(VENDOR, rel))), hash, rel);
  assert.deepEqual(filesUnder(VENDOR).filter((f) => f !== 'PIN.json').sort(), Object.keys(pin.files).sort());
});

test('the pin holds the whole import closure of the stage, and the route names the pinned commit', () => {
  assert.deepEqual(importClosure(VENDOR, pin.entry), Object.keys(pin.files).sort());
  assert.match(pin.commit, /^[0-9a-f]{40}$/);
  assert.ok(UXML_ROUTE_VENDOR.includes(pin.commit.slice(0, 8)), `${UXML_ROUTE_VENDOR} vs ${pin.commit}`);
});

test('the UXML route is on unless this browser turned it off (Owner, 17 Nov); without browser storage it is off', () => {
  const storage = (value) => ({ getItem: (key) => (key === UXML_ROUTE_STORAGE_KEY ? value : null) });
  assert.equal(uxmlRouteOn(undefined), false);
  assert.equal(uxmlRouteOn(storage(null)), true);
  assert.equal(uxmlRouteOn(storage('on')), true);
  assert.equal(uxmlRouteOn(storage('off')), false);
  assert.equal(uxmlRouteOn({ getItem: () => { throw new Error('blocked'); } }), true);
});
