import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

function plan(...args) {
  const result = spawnSync(process.execPath, [
    'scripts/verify-issue-769-xml-cii.mjs',
    ...args,
    '--plan-json',
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

const focused = plan();
const full = plan('--full');

assert.equal(focused.mode, 'focused');
assert.equal(full.mode, 'full');
assert(full.inventoryCount >= focused.inventoryCount);
assert(full.releaseGuardCount >= focused.selected.length);

for (const file of [
  'tests/xml-cii-issue-835-master-custody-baseline.test.mjs',
  'tests/xml-cii-issue-855-valve-weight-red-baseline.test.mjs',
  'tests/xml-cii-issue-871-persistence-failure-baseline.test.mjs',
  'tests/xml-cii-issue-880-corrupt-restore-baseline.test.mjs',
  'tests/xml-cii-issue-893-consumer-authority-baseline.test.mjs',
]) {
  assert(!full.selected.includes(file), 'historical RED must not block current release: ' + file);
}

for (const file of [
  'tests/xml-cii-issue-781-auto-authority-followup.test.mjs',
  'tests/xml-cii-issue-781-postmerge-screenshot-repair.test.mjs',
  'tests/xml-cii-branch-line-mixed-integration-945.test.mjs',
  'tests/xml-cii-rigid-weight-lifecycle.test.mjs',
  'tests/xml-cii-issue-894-scale-contract.test.mjs',
  'tests/xml-cii-source-schema-authority-guards.test.mjs',
]) {
  assert(full.selected.includes(file), 'current release guard missing from full plan: ' + file);
}

assert(!full.selected.includes('tests/engineering-calculation-core.test.mjs'));
assert(full.external.some((row) => (
  row.file === 'tests/engineering-calculation-core.test.mjs'
  && row.role === 'EXTERNAL_GUARD'
)));

const persistenceSpecial = full.special.find(
  (row) => row.file === 'tests/xml-cii-issue-875-persistence-status-retry.test.mjs',
);
assert(persistenceSpecial);
assert.deepEqual(
  persistenceSpecial.skipNames,
  ['runtime cache chain carries one retry generation from tab to worker'],
);

const previewSpecial = full.special.find(
  (row) => row.file === 'tests/xml-cii-master-preview-worker-search.test.mjs',
);
assert(previewSpecial);
assert.deepEqual(
  previewSpecial.skipNames,
  ['Preview and import share one coordinator singleton including persisted dataset ids'],
);

for (const [claim, witnesses] of Object.entries(full.coverage)) {
  assert(witnesses.length > 0, 'coverage claim has no witnesses: ' + claim);
  for (const witness of witnesses) {
    assert(focused.selected.includes(witness), 'focused coverage missing ' + claim + ': ' + witness);
    assert(full.selected.includes(witness), 'full coverage missing ' + claim + ': ' + witness);
  }
}

console.log('test-xml-cii-issue-769-release-runner: PASS', {
  focused: focused.selected.length,
  full: full.selected.length,
  excluded: full.excluded.length,
  special: full.special.length,
});
