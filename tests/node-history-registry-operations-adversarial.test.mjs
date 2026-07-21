import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { computeProposedRegistryHash } from '../node-history/registry/registry-hash.js';
import { prepareRegistryPublication } from '../node-history/operations/registry-publication/registry-publication.js';
import { hashCanonical } from '../node-history/operations/registry-operations-common.js';
import {
  makeOperationsCase,
  wrapFileSystem,
} from './fixtures/node-history/operations/operations-fixture.mjs';

const clone = structuredClone;

test('extra current files and pre-existing materialization roots block atomically', async (t) => {
  const extra = await makeOperationsCase();
  t.after(extra.cleanup);
  const unexpected = path.join(extra.input.currentRegistryRoot, extra.input.targetManifest.registryRootPath, 'unexpected.json');
  await writeFile(unexpected, '{}\n');
  const extraResult = await prepareRegistryPublication(extra.input);
  assertCode(extraResult, 'UNEXPECTED_EXISTING_FILE');
  await assertNoAcceptedOutput(extraResult, extra);

  const existing = await makeOperationsCase();
  t.after(existing.cleanup);
  await existing.fileSystem.createDirectoryExclusive(existing.input.targetManifest.temporaryRoot);
  const existingResult = await prepareRegistryPublication(existing.input);
  assert.ok(codes(existingResult).some((code) => ['MATERIALIZATION_ROOT_ALREADY_EXISTS', 'REGISTRY_PUBLICATION_STAGE_FAILED'].includes(code)));
  await assertNoAcceptedOutput(existingResult, existing);
});

test('duplicate, case-colliding, traversal and absolute target paths are rejected', async (t) => {
  const duplicate = await makeOperationsCase();
  t.after(duplicate.cleanup);
  duplicate.input.targetManifest.files.push(clone(duplicate.input.targetManifest.files[0]));
  const duplicateResult = await prepareRegistryPublication(duplicate.input);
  assertCode(duplicateResult, 'DUPLICATE_TARGET_PATH');

  const collision = await makeOperationsCase();
  t.after(collision.cleanup);
  collision.input.targetManifest.files[1].path = collision.input.targetManifest.files[1].path.toLowerCase();
  collision.input.targetManifest.files.push({
    ...collision.input.targetManifest.files[1],
    path: collision.input.targetManifest.files[1].path.toUpperCase(),
    mainLineKey: '/LINE-X',
  });
  const collisionResult = await prepareRegistryPublication(collision.input);
  assertCode(collisionResult, 'TARGET_PATH_CASE_COLLISION');

  for (const badPath of ['../escape.json', '/absolute/escape.json']) {
    const unsafe = await makeOperationsCase();
    t.after(unsafe.cleanup);
    unsafe.input.targetManifest.files[0].path = badPath;
    const result = await prepareRegistryPublication(unsafe.input);
    assertCode(result, 'TARGET_PATH_UNSAFE');
  }
});

test('simulated write failure removes every partial candidate artifact', async (t) => {
  const fixture = await makeOperationsCase();
  t.after(fixture.cleanup);
  const base = fixture.fileSystem;
  const candidateRoot = fixture.input.targetManifest.temporaryRoot;
  let candidateWrites = 0;
  fixture.input.fileSystem = wrapFileSystem(base, {
    writeFileExclusive: async (filePath, bytes) => {
      if (String(filePath).startsWith(candidateRoot) && ++candidateWrites === 2) {
        const error = new Error('simulated write failure');
        error.code = 'SIMULATED_WRITE_FAILURE';
        throw error;
      }
      return base.writeFileExclusive(filePath, bytes);
    },
  });
  const result = await prepareRegistryPublication(fixture.input);
  assert.equal(result.status, 'BLOCKED');
  assert.equal(await base.exists(candidateRoot), false);
  assert.equal(result.publishablePackage, null);
  assert.equal(result.acceptedMaterializedRoot, null);
});

test('simulated candidate re-read corruption cannot become publishable', async (t) => {
  const fixture = await makeOperationsCase();
  t.after(fixture.cleanup);
  const base = fixture.fileSystem;
  const candidateRoot = fixture.input.targetManifest.temporaryRoot;
  fixture.input.fileSystem = wrapFileSystem(base, {
    readFile: async (filePath) => {
      const bytes = await base.readFile(filePath);
      if (String(filePath).startsWith(candidateRoot) && String(filePath).endsWith('LINE-A.json')) {
        return Buffer.from(`${bytes.toString('utf8')} `);
      }
      return bytes;
    },
  });
  const result = await prepareRegistryPublication(fixture.input);
  assert.equal(result.status, 'BLOCKED');
  assertCode(result, 'MATERIALIZED_FILE_HASH_MISMATCH');
  assert.equal(await base.exists(candidateRoot), false);
});

test('partial authority cannot remove or retire registry history', async (t) => {
  const fixture = await makeOperationsCase();
  t.after(fixture.cleanup);
  const patch = clone(fixture.input.approvedPatch);
  patch.coverage = { scope: 'PARTIAL_LINE', authoritativeForRetirement: false };
  patch.operations.push({
    operationId: 'TE015:RETIRE_NODE:HN-A-100', type: 'RETIRE_NODE',
    historyNodeId: 'HN-A-100', mainLineKey: '/LINE-A',
    evidence: { authority: 'BOARD', revisionId: 'REV-003', reason: 'not-authoritative' },
  });
  patch.proposedRegistryHash = await computeProposedRegistryHash(patch);
  fixture.input.approvedPatch = patch;
  fixture.input.bootstrapResult = rehashBootstrap({ ...clone(fixture.input.bootstrapResult), registryPatch: patch });
  const result = await prepareRegistryPublication(fixture.input);
  assertCode(result, 'PARTIAL_AUTHORITY_HISTORY_REMOVAL_PROHIBITED');
  assert.equal(result.status, 'BLOCKED');
});

test('production files contain no GitHub, VCS, conversion, clock or random write authority', async () => {
  const files = [
    'registry-operations-common.js',
    'registry-publication/registry-filesystem.js',
    'registry-publication/registry-snapshot-io.js',
    'registry-publication/registry-publication-authority.js',
    'registry-publication/registry-publication-package.js',
    'registry-publication/registry-publication.js',
    'registry-recovery/registry-recovery.js',
  ];
  const forbidden = [
    /api\.github/i, /@octokit/i, /\bgit\s+(?:commit|push|merge)\b/i,
    /matchExactHistoricalNodes\s*\(/, /allocateZoneEngineeringNodes\s*\(/,
    /serialize.*xml\s*\(/i, /Date\.now\s*\(/, /Math\.random\s*\(/,
  ];
  for (const relative of files) {
    const url = new URL(`../node-history/operations/${relative}`, import.meta.url);
    const source = await readFile(url, 'utf8');
    assert.ok(source.split('\n').length <= 300, `${relative} exceeds 300 lines`);
    forbidden.forEach((pattern) => assert.doesNotMatch(source, pattern, `${relative}: ${pattern}`));
  }
});

function rehashBootstrap(value) {
  const { bootstrapResultHash: _hash, evaluatedAt, ...semantic } = value;
  return { ...semantic, bootstrapResultHash: hashCanonical(semantic), evaluatedAt };
}

async function assertNoAcceptedOutput(result, fixture) {
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.publishablePackage, null);
  assert.equal(result.acceptedMaterializedRoot, null);
  assert.equal(await fixture.fileSystem.exists(fixture.input.targetManifest.temporaryRoot), false);
}

function codes(result) { return result.validation.blockers.map((row) => row.code); }
function assertCode(result, code) { assert.ok(codes(result).includes(code), `${code}: ${codes(result).join(', ')}`); }
