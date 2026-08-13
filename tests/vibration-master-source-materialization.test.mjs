import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import {
  VIBRATION_MASTER_RETRIEVAL_COMMIT,
  VIBRATION_MASTER_SOURCE_MATERIALIZATION_SCHEMA,
  materializeVibrationMasterSource,
} from '../scripts/materialize-vibration-master-source.mjs';
import { gitBlobSha1Hex } from '../scripts/inventory-vibration-master-sources.mjs';

const ROOT = new URL('../', import.meta.url);
const source = (filePath) => fs.readFileSync(new URL(filePath, ROOT), 'utf8');

function git(cwd, args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function createFixtureRepository() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vibration-master-materialize-'));
  git(directory, ['init', '-q']);
  git(directory, ['config', 'user.name', 'fixture']);
  git(directory, ['config', 'user.email', 'fixture@example.com']);
  git(directory, ['remote', 'add', 'origin', 'https://github.com/reallaksh19/Common.git']);
  const sourcePath = 'EI - AVIFF Guidelines 2nd Edition.pdf';
  const bytes = Buffer.from('exact controlled fixture bytes\0with-binary\xff', 'latin1');
  fs.writeFileSync(path.join(directory, sourcePath), bytes);
  git(directory, ['add', sourcePath]);
  git(directory, ['commit', '-qm', 'adopted']);
  const adoptedCommit = git(directory, ['rev-parse', 'HEAD']);
  fs.writeFileSync(path.join(directory, 'unrelated.txt'), 'newer retrieval commit');
  git(directory, ['add', 'unrelated.txt']);
  git(directory, ['commit', '-qam', 'retrieval']);
  const retrievalCommit = git(directory, ['rev-parse', 'HEAD']);
  return { directory, sourcePath, bytes, adoptedCommit, retrievalCommit };
}

test('retrieval commit constant is pinned to the Owner-supplied exact-source commit', () => {
  assert.equal(VIBRATION_MASTER_RETRIEVAL_COMMIT, '9e11e1b4ab1ee55f1ad5fd24a8e82994a5442872');
  assert.equal(VIBRATION_MASTER_SOURCE_MATERIALIZATION_SCHEMA, 'VibrationMasterSourceMaterialization.v1');
});

test('materialization preserves adopted source commit when retrieval and adopted paths share the exact blob', () => {
  const fixture = createFixtureRepository();
  try {
    const expectedGitBlob = gitBlobSha1Hex(fixture.bytes);
    const outputPath = path.join(fixture.directory, 'out', 'controlled.pdf');
    const receipt = materializeVibrationMasterSource({
      repositoryPath: fixture.directory, outputPath, sourcePath: fixture.sourcePath,
      adoptedCommit: fixture.adoptedCommit, retrievalCommit: fixture.retrievalCommit,
      expectedGitBlob, expectedSizeBytes: fixture.bytes.length,
    });
    assert.deepEqual(fs.readFileSync(outputPath), fixture.bytes);
    assert.equal(receipt.adoptedSource.commit, fixture.adoptedCommit);
    assert.equal(receipt.retrieval.commit, fixture.retrievalCommit);
    assert.equal(receipt.retrieval.identicalToAdoptedSource, true);
    assert.equal(receipt.materialized.gitBlobSha1, `sha1:${expectedGitBlob}`);
    assert.equal(receipt.materialized.sizeBytes, fixture.bytes.length);
    assert.deepEqual(receipt.authority, {
      engineeringAuthority: 'NONE', screeningAuthority: 'NOT_AUTHORIZED', designAuthority: false,
    });
  } finally {
    fs.rmSync(fixture.directory, { recursive: true, force: true });
  }
});

test('materialization fails closed if the retrieval commit path drifts from the adopted blob', () => {
  const fixture = createFixtureRepository();
  try {
    const expectedGitBlob = gitBlobSha1Hex(fixture.bytes);
    fs.writeFileSync(path.join(fixture.directory, fixture.sourcePath), 'changed source bytes');
    git(fixture.directory, ['add', fixture.sourcePath]);
    git(fixture.directory, ['commit', '-qm', 'source drift']);
    const driftCommit = git(fixture.directory, ['rev-parse', 'HEAD']);
    assert.throws(() => materializeVibrationMasterSource({
      repositoryPath: fixture.directory,
      outputPath: path.join(fixture.directory, 'out', 'controlled.pdf'),
      sourcePath: fixture.sourcePath, adoptedCommit: fixture.adoptedCommit,
      retrievalCommit: driftCommit, expectedGitBlob, expectedSizeBytes: fixture.bytes.length,
    }), /VIBRATION_MASTER_RETRIEVAL_BLOB_MISMATCH/u);
  } finally {
    fs.rmSync(fixture.directory, { recursive: true, force: true });
  }
});

test('package exposes the controlled source materialization command', () => {
  const pkg = JSON.parse(source('package.json'));
  assert.equal(pkg.scripts['materialize:vibration-master-source'], 'node scripts/materialize-vibration-master-source.mjs');
});
