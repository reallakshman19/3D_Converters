import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../../', import.meta.url);
const productionFiles = [
  'scripts/fbx/fbx2-small-benchmark/managed-inventory.mjs',
  'scripts/fbx/fbx2-small-benchmark/profile.mjs',
  'scripts/fbx/fbx2-small-benchmark/reconcile.mjs',
  'scripts/fbx/fbx2-small-benchmark/report.mjs',
  'scripts/fbx/fbx2-small-benchmark/source-inventory.mjs',
  'scripts/fbx/run-fbx2-small-benchmark.mjs',
];

function logicalLines(body) {
  return body.split('\n').filter((line) => {
    const text = line.trim();
    return text && !text.startsWith('//') && text !== '{' && text !== '}';
  }).length;
}

function functionBodies(source) {
  const starts = [...source.matchAll(/(?:export\s+)?(?:async\s+)?function\s+[A-Za-z0-9_]+\s*\([^)]*\)\s*\{/g)];
  return starts.map((match) => {
    let depth = 0, end = match.index + match[0].length;
    for (let index = match.index + match[0].length - 1; index < source.length; index += 1) {
      if (source[index] === '{') depth += 1;
      if (source[index] === '}') depth -= 1;
      if (depth === 0) { end = index + 1; break; }
    }
    return source.slice(match.index, end);
  });
}

for (const relative of productionFiles) {
  const source = await readFile(new URL(relative, root), 'utf8');
  const lineCount = source.split('\n').length - 1;
  assert.ok(lineCount < 300, `${relative} exceeds 300 physical lines: ${lineCount}`);
  assert.doesNotMatch(source, /Math\.random|Date\.now|localeCompare|export\s+default/);
  for (const body of functionBodies(source)) {
    assert.ok(logicalLines(body) <= 40,
      `${relative} contains a function longer than 40 logical lines`);
  }
}

const runner = await readFile(new URL(
  'scripts/fbx/run-fbx2-small-benchmark.mjs', root), 'utf8');
assert.equal((runner.match(/await executeRun\(/g) || []).length, 2);
assert.match(runner, /validateFbx2SmallBenchmarkSources/);
assert.match(runner, /validateFbx2SmallBenchmarkPopulation/);
assert.match(runner, /buildSelectedZoneComponentCrosswalk/);
assert.match(runner, /buildFbx2SmallBenchmarkReport/);
assert.match(runner, /includeZonePackageInputs:\s*true/);

const profile = await readFile(new URL(
  'scripts/fbx/fbx2-small-benchmark/profile.mjs', root), 'utf8');
assert.match(profile, /18758c5283b852efb2a1154fd07dcd9982c088b793e4ffe63b1a9ab2f11e6131/);
assert.match(profile, /e0dbbc42ddedd17e96c3eadced2a4d65e10a333552c791dea4e725b9feea4cd8/);
assert.match(profile, /\/GLRD-1000-CU-PI-P/);

console.log(`test-fbx2-small-benchmark-static: PASS (${fileURLToPath(root)})`);
