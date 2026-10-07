import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const manifest = JSON.parse(await readFile(
  new URL('./xml-cii-issue-769-release-test-authority.json', import.meta.url),
  'utf8',
));
const testNames = (await readdir(new URL('./', import.meta.url)))
  .filter((name) => /^xml-cii-.*\.test\.(?:mjs|js)$/i.test(name))
  .map((name) => `tests/${name}`)
  .sort();

const roles = new Set(manifest.roles || []);
assert.deepEqual(
  [...roles].sort(),
  ['EXTERNAL_GUARD', 'HISTORICAL_RED', 'RELEASE_GUARD', 'SUPERSEDED_ACCEPTANCE'].sort(),
);
assert.equal(manifest.policy?.defaultXmlCiiRole, 'RELEASE_GUARD');
assert.equal(manifest.policy?.unknownXmlCiiFile, 'RELEASE_GUARD');
assert.equal(manifest.policy?.preserveNonBlockingTests, true);
assert.equal(manifest.policy?.productRepairFromDisposition, false);

const inventory = new Set(testNames);
for (const [file, entry] of Object.entries(manifest.fileDispositions || {})) {
  assert(inventory.has(file), `Dispositioned XML-CII test does not exist: ${file}`);
  assert(roles.has(entry.role), `Unknown role ${entry.role} for ${file}`);
  assert.notEqual(entry.role, 'RELEASE_GUARD', `Explicit disposition should only encode non-default roles: ${file}`);
  assert(Array.isArray(entry.evidence) && entry.evidence.length > 0, `Missing disposition evidence: ${file}`);
  if (entry.role === 'HISTORICAL_RED' || entry.role === 'SUPERSEDED_ACCEPTANCE') {
    assert(Array.isArray(entry.successors) && entry.successors.length > 0, `Missing current successor guards: ${file}`);
    for (const successor of entry.successors) {
      assert(inventory.has(successor), `Successor guard does not exist: ${file} -> ${successor}`);
      const successorRole = manifest.fileDispositions?.[successor]?.role || manifest.policy.defaultXmlCiiRole;
      assert.equal(successorRole, 'RELEASE_GUARD', `Successor must remain a current release guard: ${successor}`);
    }
  }
}

for (const [file, cases] of Object.entries(manifest.testNameDispositions || {})) {
  assert(inventory.has(file), `Case-dispositioned test file does not exist: ${file}`);
  for (const [testName, entry] of Object.entries(cases)) {
    assert(testName.trim(), `Blank disposed test name in ${file}`);
    assert.equal(entry.role, 'SUPERSEDED_ACCEPTANCE');
    assert(Array.isArray(entry.evidence) && entry.evidence.length > 0, `Missing case evidence: ${file} :: ${testName}`);
  }
}

for (const file of manifest.baselineObservedFailureFiles || []) {
  assert(inventory.has(file), `Observed BM-009 baseline failure file is missing: ${file}`);
  const role = manifest.fileDispositions?.[file]?.role || manifest.policy.defaultXmlCiiRole;
  assert(roles.has(role), `Observed baseline failure is unclassified: ${file}`);
}

for (const [file, entry] of Object.entries(manifest.externalGuards || {})) {
  assert.equal(entry.role, 'EXTERNAL_GUARD');
  assert(Array.isArray(entry.evidence) && entry.evidence.length > 0, `Missing external-guard evidence: ${file}`);
  await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
}

const resolvedCounts = { RELEASE_GUARD: 0, HISTORICAL_RED: 0, SUPERSEDED_ACCEPTANCE: 0 };
for (const file of testNames) {
  const role = manifest.fileDispositions?.[file]?.role || manifest.policy.defaultXmlCiiRole;
  assert(roles.has(role), `Inventory test has unknown role: ${file}`);
  resolvedCounts[role] += 1;
}
assert(resolvedCounts.RELEASE_GUARD > 0);
assert(resolvedCounts.HISTORICAL_RED > 0);
assert(resolvedCounts.SUPERSEDED_ACCEPTANCE > 0);

console.log('test-xml-cii-issue-769-release-test-authority: PASS', {
  inventory: testNames.length,
  ...resolvedCounts,
  external: Object.keys(manifest.externalGuards || {}).length,
  caseDispositions: Object.values(manifest.testNameDispositions || {})
    .reduce((sum, rows) => sum + Object.keys(rows).length, 0),
});
