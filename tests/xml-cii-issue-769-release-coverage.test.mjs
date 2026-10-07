import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readJson = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const authority = await readJson('./xml-cii-issue-769-release-test-authority.json');
const coverage = await readJson('./xml-cii-issue-769-release-coverage.json');

const requiredTasks = Array.from({ length: 8 }, (_, i) => `TASK-${String(i + 1).padStart(3, '0')}`);
const requiredBenchmarks = Array.from({ length: 8 }, (_, i) => `BM-${String(i + 1).padStart(3, '0')}`);

assert.equal(coverage.schema, 'xml-cii-issue-769-release-coverage/v1');
assert.deepEqual(Object.keys(coverage.taskCoverage).sort(), requiredTasks);
assert.deepEqual(Object.keys(coverage.benchmarkCoverage).sort(), requiredBenchmarks);

const roleFor = (file) => authority.fileDispositions?.[file]?.role || authority.policy.defaultXmlCiiRole;
const allCoverage = { ...coverage.taskCoverage, ...coverage.benchmarkCoverage };
for (const [claim, files] of Object.entries(allCoverage)) {
  assert(Array.isArray(files) && files.length > 0, `${claim} has no current release guards`);
  for (const file of files) {
    assert.equal(roleFor(file), 'RELEASE_GUARD', `${claim} references non-current guard ${file}`);
    await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
  }
}

for (const claim of ['BM-002', 'BM-004', 'BM-005', 'TASK-006']) {
  assert(String(coverage.hostedEvidence?.[claim] || '').trim(), `${claim} is missing durable hosted evidence`);
}

console.log('test-xml-cii-issue-769-release-coverage: PASS', {
  tasks: requiredTasks.length,
  benchmarks: requiredBenchmarks.length,
  uniqueGuards: new Set(Object.values(allCoverage).flat()).size,
});
