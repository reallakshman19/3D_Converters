import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const workflow = await readFile(new URL('.github/workflows/fbx-stagedjson.yml', root), 'utf8');
const runAll = await readFile(new URL('tests/fbx/run-all.mjs', root), 'utf8');
const converter = await readFile(new URL('tabs/model-converters/converters/fbx-to-stagedjson.js', root), 'utf8');
const auditSource = await readFile(new URL(
  'tabs/model-converters/converters/fbx/benchmark/qualification-audit.js', root,
), 'utf8');
const schema = JSON.parse(await readFile(new URL(
  'contracts/fbx/fbx-qualification-audit-report.v1.schema.json', root,
), 'utf8'));

assert.match(workflow, /'Benchmarks\/fbx BM\/\*\*'/, 'benchmark changes must trigger FBX certification');
let previous = -1;
for (const test of [
  'test-qualification-audit.mjs',
  'test-qualification-audit-adversarial.mjs',
  'test-qualification-scope-audit.mjs',
]) {
  const index = runAll.indexOf(`'${test}'`);
  assert.ok(index > previous, `${test} is missing or reordered`);
  previous = index;
}
assert.doesNotMatch(runAll, /allSettled|\bcatch\b/, 'qualification tests may not be swallowed');
assert.doesNotMatch(converter, /benchmark\/qualification-audit/, 'production converter imports Agent Q audit code');
assert.doesNotMatch(auditSource, /Date\.now|Math\.random|performance\.|process\.env|navigator\./,
  'qualification audit contains runtime-dependent evidence state');
assert.equal(schema.$id, 'FbxQualificationAuditReport.v1');
assert.equal(schema.additionalProperties, false);

console.log('test-qualification-scope-audit: PASS');
