import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const repoRoot = new URL('../', import.meta.url);
const sourceDir = new URL('docs/flange/', repoRoot);
const manifestUrl = new URL(
  'docs/engineering-calculations/source-archive/bolted-joints-flanges/SHA256SUMS.txt',
  repoRoot,
);

function parseManifest(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = /^([0-9a-f]{64})\s\s(.+)$/.exec(line);
      assert.ok(match, `manifest line is not in sha256sum format: ${line}`);
      return { sha256: match[1], name: match[2] };
    });
}

function sha256OfFile(name) {
  const bytes = fs.readFileSync(new URL(encodeURIComponent(name), sourceDir));
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

const manifest = parseManifest(fs.readFileSync(manifestUrl, 'utf8'));

test('every archived bolted-joint source matches its committed hash', () => {
  for (const entry of manifest) {
    assert.equal(
      sha256OfFile(entry.name),
      entry.sha256,
      `${entry.name} does not match the committed SHA-256; the source archive was altered.`,
    );
  }
});

test('the manifest covers the source directory exactly', () => {
  const onDisk = fs.readdirSync(new URL('.', sourceDir)).sort();
  const listed = manifest.map((entry) => entry.name).sort();
  assert.deepEqual(listed, onDisk, 'docs/flange contents and SHA256SUMS.txt have diverged.');
});

test('the archive holds the ten distinct owner-supplied sources', () => {
  assert.equal(manifest.length, 11);
  assert.equal(new Set(manifest.map((entry) => entry.sha256)).size, 10);

  const byHash = new Map();
  for (const entry of manifest) {
    byHash.set(entry.sha256, [...(byHash.get(entry.sha256) ?? []), entry.name]);
  }
  const duplicated = [...byHash.values()].filter((names) => names.length > 1);
  assert.equal(duplicated.length, 1, 'exactly one download-duplicate pair is expected');
  assert.deepEqual(duplicated[0].sort(), [
    'Flange Rating Vs Nozzle loads -Rev.3(1).xlsx',
    'Flange Rating Vs Nozzle loads -Rev.3.xlsx',
  ]);
});

test('sources cited by the UG-44 workbook basis module are present and unaltered', async () => {
  const { UG44_WORKBOOK_BASIS_SOURCES } = await import(
    '../converters/engineering-calculations/flange/ug44-workbook-basis.js'
  );

  for (const source of Object.values(UG44_WORKBOOK_BASIS_SOURCES)) {
    const name = path.posix.basename(source.path);
    const entry = manifest.find((item) => item.name === name);
    assert.ok(entry, `${source.path} is cited by the basis module but is not in the manifest.`);
    assert.equal(
      entry.sha256,
      source.sha256,
      `${source.path} hash cited in the basis module does not match the archive manifest.`,
    );
  }
});

function assertCitedSource(source, label) {
  const name = path.posix.basename(source.path);
  const entry = manifest.find((item) => item.name === name);

  assert.ok(entry, `${label} cites ${source.path}, which is not in the archive manifest.`);
  assert.equal(entry.sha256, source.sha256, `${label} cites a stale hash for ${source.path}.`);
  assert.equal(sha256OfFile(name), source.sha256);
}

test('the transcribed UG-44 fixture cites a source that is present and unaltered', () => {
  const fixture = JSON.parse(
    fs.readFileSync(new URL('./fixtures/flange-ug44-workbook-rows.json', import.meta.url), 'utf8'),
  );
  assertCitedSource(fixture.source, 'the UG-44 row fixture');
});

test('every bolt torque oracle cites a source that is present and unaltered', () => {
  const fixture = JSON.parse(
    fs.readFileSync(new URL('./fixtures/bolt-torque-workbook-oracles.json', import.meta.url), 'utf8'),
  );
  const oracles = Object.entries(fixture.oracles);
  assert.equal(oracles.length, 3);

  for (const [name, oracle] of oracles) {
    assertCitedSource(oracle.source, `the ${name} oracle`);
  }
});
