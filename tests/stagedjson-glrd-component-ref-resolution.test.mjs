import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = join(repoRoot, 'tabs', 'stagedjson-to-enrichxml');
const tempRoot = mkdtempSync(join(tmpdir(), 'stagedjson-glrd-ref-'));
writeFileSync(join(tempRoot, 'package.json'), '{"type":"module"}\n');

for (const file of [
  'sj-audit.js',
  'sj-branch-identity.js',
  'sj-corrosion-resolver.js',
  'sj-enrichment-authority.js',
  'sj-enrichment-engine.js',
  'sj-node-contract.js',
  'sj-parser.js',
  'sj-point-resolver.js',
  'sj-psi-sequence-planner.js',
  'sj-rating-resolver.js',
  'sj-restraint-resolver.js',
  'sj-sequential-writer-shadow.js',
  'sj-type-mapper.js',
  'sj-wall-resolver.js',
  'sj-weight-db.js',
  'sj-weight-resolver.js',
  'sj-xml-writer-parity.js',
  'sj-xml-writer.js',
]) copyFileSync(join(sourceRoot, file), join(tempRoot, file));

const { parseStagedJson } = await import(pathToFileURL(join(tempRoot, 'sj-parser.js')).href);
const { buildPsiSequencePlan } = await import(pathToFileURL(join(tempRoot, 'sj-psi-sequence-planner.js')).href);
const { runEnrichment } = await import(pathToFileURL(join(tempRoot, 'sj-enrichment-engine.js')).href);
test.after(() => rmSync(tempRoot, { recursive: true, force: true }));

const benchmarkDir = join(repoRoot, 'Benchmarks', 'XML-CII-2019', 'revamped');
const evidenceDir = join(repoRoot, 'ValidationRecords', 'GLRD-1000-PSI-02-20261103');
const readJson = () => JSON.parse(readFileSync(
  join(benchmarkDir, 'STF_2026Nov03-0839_managed_stage.json'), 'utf8',
));
const maskTime = (xml) => xml.replace(/<DateTime>[^<]*<\/DateTime>/, '<DateTime>FIXED</DateTime>');

test('GLRD source component endpoints resolve without fabricated missing-branch warnings', () => {
  const input = readJson();
  const rawBranches = input.filter((node) => node.type === 'BRANCH');
  const knownBranches = new Set(rawBranches.map((node) => node.name));
  const sourceRefs = new Set([
    ...readFileSync(join(benchmarkDir, 'GLRD-1000-PSI-02.xml'), 'utf8')
      .matchAll(/<ComponentRefNo>([^<]+)<\/ComponentRefNo>/g),
  ].map((match) => match[1]));
  const componentTargets = rawBranches.flatMap((node) => [
    node.attributes?.HREF, node.attributes?.TREF,
  ].filter((ref) => ref && !knownBranches.has(ref)));

  assert.equal(componentTargets.length, 79);
  assert.ok(componentTargets.every((ref) => sourceRefs.has(ref)));
  const result = buildPsiSequencePlan(input, parseStagedJson(input));
  assert.equal(result.validation.ok, true, result.validation.errors.join('\n'));
  assert.equal(result.summary.sourceBranchCount, 86);
  assert.equal(result.summary.unresolvedReferenceCount, 0);
  assert.deepEqual(result.validation.warnings, []);
});

test('unknown references still emit warnings; raw source refs survive filtered enrichment records', () => {
  const input = [{
    name: '/TEST/B1',
    type: 'BRANCH',
    attributes: { OWNER: '/TEST', HREF: '=existing', TREF: '=absent' },
    children: [{
      name: 'ELBO =existing',
      type: 'ELBO',
      attributes: { REF: '=existing', CREF: '=existing' },
    }],
  }];
  const plan = buildPsiSequencePlan(input, []);
  assert.equal(plan.validation.ok, true);
  assert.deepEqual(plan.unresolvedReferences.map((item) => item.targetBranchName), ['=absent']);
  assert.ok(plan.validation.warnings.some((warning) => warning.includes('=absent')));
  assert.ok(!plan.validation.warnings.some((warning) => warning.includes('=existing')));
});

test('enrichment output remains byte-equivalent to the captured pre-fix XML', () => {
  const result = runEnrichment({ stagedJsonText: readJson(), config: {} });
  const baseline = readFileSync(join(evidenceDir, 'enriched_baseline.xml'), 'utf8');
  assert.equal(maskTime(result.xmlText), maskTime(baseline));
  assert.equal((result.xmlText.match(/<Node>/g) || []).length, 1156);
  assert.equal(result.records.length, 893);
  assert.equal(result.audit.totals.missing, 480);
  assert.equal(result.sequencePlan.validation.ok, true);
  assert.equal(result.sequencePlan.summary.unresolvedReferenceCount, 0);
  assert.equal(result.writerShadow.validation.ok, true);
  assert.equal(result.writerShadow.parity.validation.ok, true);
});
