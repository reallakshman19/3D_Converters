import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = join(repoRoot, 'tabs', 'stagedjson-to-enrichxml');
const tempRoot = mkdtempSync(join(tmpdir(), 'stagedjson-1885-'));
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
  'sj-rating-resolver.js',
  'sj-restraint-resolver.js',
  'sj-type-mapper.js',
  'sj-wall-resolver.js',
  'sj-weight-db.js',
  'sj-weight-resolver.js',
  'sj-xml-writer.js',
]) copyFileSync(join(sourceRoot, file), join(tempRoot, file));

const { runEnrichment } = await import(pathToFileURL(join(tempRoot, 'sj-enrichment-engine.js')).href);
test.after(() => rmSync(tempRoot, { recursive: true, force: true }));

function oneNodeForRef(xml, ref) {
  const nodes = (xml.match(/<Node>[\s\S]*?<\/Node>/g) || [])
    .filter((node) => node.includes(`<ComponentRefNo>${ref}</ComponentRefNo>`));
  assert.equal(nodes.length, 1, `expected exactly one node for ${ref}`);
  return nodes[0];
}

test('1885 benchmark matches the requested ELBO, TEE, REDU and branch contracts', () => {
  const stagedJson = JSON.parse(readFileSync(join(repoRoot, 'Benchmarks', '1885Sjson', 'Sjson'), 'utf8'));
  const { xmlText } = runEnrichment({ stagedJsonText: stagedJson, config: {} });

  const elbow = oneNodeForRef(xmlText, '=1006649732/51428');
  assert.match(elbow, /<NodeNumber>1570<\/NodeNumber>/);
  assert.match(elbow, /<NodeName><\/NodeName>/);
  assert.match(elbow, /<Endpoint>0<\/Endpoint>/);
  assert.match(elbow, /<ComponentType>ELBO<\/ComponentType>/);
  assert.match(elbow, /<BendRadius>305<\/BendRadius>/);
  assert.match(elbow, /<BendType>0<\/BendType>/);
  assert.doesNotMatch(elbow, /<Rigid>/);

  const tee = oneNodeForRef(xmlText, '=1006649732/51494');
  assert.match(tee, /<NodeNumber>2280<\/NodeNumber>/);
  assert.match(tee, /<Endpoint>1<\/Endpoint>/);
  assert.match(tee, /<ComponentType>BRAN<\/ComponentType>/);
  assert.match(tee, /<ConnectionType>TEE<\/ConnectionType>/);
  assert.doesNotMatch(tee, /<Rigid>/);

  const reducer = oneNodeForRef(xmlText, '=1006649732/51499');
  assert.match(reducer, /<NodeNumber>2370<\/NodeNumber>/);
  assert.match(reducer, /<Endpoint>2<\/Endpoint>/);
  assert.match(reducer, /<ComponentType>REDU<\/ComponentType>/);
  assert.match(reducer, /<AlphaAngle>[^<]+<\/AlphaAngle>/);
  assert.doesNotMatch(reducer, /<Rigid>/);

  const root = '/ASIM-1885-10&quot;-S8810101-91261M7-HC-01';
  assert.equal((xmlText.match(new RegExp(`<Branchname>${root}<\\/Branchname>`, 'g')) || []).length, 1);
  assert.doesNotMatch(xmlText, new RegExp(`${root}\\/B0*\\d+<\\/Branchname>`, 'i'));
});
