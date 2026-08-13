import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import {
  VIBRATION_MASTER_EXPECTED_GIT_BLOB,
  VIBRATION_MASTER_EXPECTED_SIZE_BYTES,
  VIBRATION_MASTER_SOURCE_COMMIT,
  gitBlobSha1Hex,
} from './inventory-vibration-master-sources.mjs';

export const VIBRATION_MASTER_SOURCE_MATERIALIZATION_SCHEMA = 'VibrationMasterSourceMaterialization.v1';
export const VIBRATION_MASTER_SOURCE_REPOSITORY = 'reallaksh19/Common';
export const VIBRATION_MASTER_SOURCE_PATH = 'EI - AVIFF Guidelines 2nd Edition.pdf';
export const VIBRATION_MASTER_RETRIEVAL_COMMIT = '9e11e1b4ab1ee55f1ad5fd24a8e82994a5442872';

function sha256Hex(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function runGit(repositoryPath, args, options = {}) {
  const result = spawnSync('git', ['-C', repositoryPath, ...args], {
    encoding: options.binary ? null : 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = String(result.stderr || '').trim() || `exit ${result.status}`;
    throw new Error(`VIBRATION_MASTER_GIT_FAILED: git ${args.join(' ')}: ${detail}`);
  }
  return options.binary ? result.stdout : String(result.stdout || '').trim();
}

function normalizeRepositorySlug(remoteUrl) {
  return String(remoteUrl || '').trim()
    .replace(/^git@github\.com:/u, '')
    .replace(/^https:\/\/(?:[^@/]+@)?github\.com\//u, '')
    .replace(/\.git$/u, '');
}

function ensureCommit(repositoryPath, commit, fetch) {
  const probe = spawnSync('git', ['-C', repositoryPath, 'cat-file', '-e', `${commit}^{commit}`]);
  if (probe.status === 0) return;
  if (!fetch) throw new Error(`VIBRATION_MASTER_RETRIEVAL_COMMIT_MISSING: ${commit}`);
  runGit(repositoryPath, ['fetch', '--depth=1', 'origin', commit]);
}

function resolveSourceObject(repositoryPath, commit, sourcePath) {
  const gitBlob = runGit(repositoryPath, ['rev-parse', `${commit}:${sourcePath}`]);
  const sizeBytes = Number(runGit(repositoryPath, ['cat-file', '-s', gitBlob]));
  return { gitBlob, sizeBytes };
}

function assertSourceObjects(retrieval, adopted, expectedGitBlob, expectedSizeBytes) {
  if (retrieval.gitBlob !== expectedGitBlob || adopted.gitBlob !== expectedGitBlob) {
    throw new Error(`VIBRATION_MASTER_RETRIEVAL_BLOB_MISMATCH: expected ${expectedGitBlob}, retrieval ${retrieval.gitBlob}, adopted ${adopted.gitBlob}.`);
  }
  if (retrieval.sizeBytes !== expectedSizeBytes || adopted.sizeBytes !== expectedSizeBytes) {
    throw new Error(`VIBRATION_MASTER_RETRIEVAL_SIZE_MISMATCH: expected ${expectedSizeBytes}, retrieval ${retrieval.sizeBytes}, adopted ${adopted.sizeBytes}.`);
  }
}

function materializeVerifiedBytes(repositoryPath, gitBlob, expectedSizeBytes) {
  const bytes = runGit(repositoryPath, ['cat-file', 'blob', gitBlob], { binary: true });
  if (bytes.length !== expectedSizeBytes || gitBlobSha1Hex(bytes) !== gitBlob) {
    throw new Error('VIBRATION_MASTER_MATERIALIZED_BYTES_MISMATCH');
  }
  return bytes;
}

export function materializeVibrationMasterSource(options) {
  const repositoryPath = resolve(options.repositoryPath);
  const sourceRepository = options.sourceRepository || VIBRATION_MASTER_SOURCE_REPOSITORY;
  const sourcePath = options.sourcePath || VIBRATION_MASTER_SOURCE_PATH;
  const retrievalCommit = options.retrievalCommit || VIBRATION_MASTER_RETRIEVAL_COMMIT;
  const adoptedCommit = options.adoptedCommit || VIBRATION_MASTER_SOURCE_COMMIT;
  const expectedGitBlob = options.expectedGitBlob || VIBRATION_MASTER_EXPECTED_GIT_BLOB;
  const expectedSizeBytes = options.expectedSizeBytes ?? VIBRATION_MASTER_EXPECTED_SIZE_BYTES;
  const origin = normalizeRepositorySlug(runGit(repositoryPath, ['remote', 'get-url', 'origin']));
  if (origin !== sourceRepository) {
    throw new Error(`VIBRATION_MASTER_RETRIEVAL_REPOSITORY_MISMATCH: expected ${sourceRepository}, received ${origin}.`);
  }
  ensureCommit(repositoryPath, retrievalCommit, options.fetch === true);
  ensureCommit(repositoryPath, adoptedCommit, options.fetch === true);
  const retrieval = resolveSourceObject(repositoryPath, retrievalCommit, sourcePath);
  const adopted = resolveSourceObject(repositoryPath, adoptedCommit, sourcePath);
  assertSourceObjects(retrieval, adopted, expectedGitBlob, expectedSizeBytes);
  const bytes = materializeVerifiedBytes(repositoryPath, retrieval.gitBlob, expectedSizeBytes);
  mkdirSync(dirname(resolve(options.outputPath)), { recursive: true });
  writeFileSync(resolve(options.outputPath), bytes);
  return {
    schema: VIBRATION_MASTER_SOURCE_MATERIALIZATION_SCHEMA,
    adoptedSource: {
      repository: sourceRepository, commit: adoptedCommit, path: sourcePath,
      gitBlobSha1: `sha1:${adopted.gitBlob}`, sizeBytes: adopted.sizeBytes,
    },
    retrieval: {
      repository: sourceRepository, commit: retrievalCommit, path: sourcePath,
      gitBlobSha1: `sha1:${retrieval.gitBlob}`, sizeBytes: retrieval.sizeBytes,
      identicalToAdoptedSource: retrieval.gitBlob === adopted.gitBlob,
    },
    materialized: {
      fileName: basename(resolve(options.outputPath)), sizeBytes: bytes.length,
      gitBlobSha1: `sha1:${gitBlobSha1Hex(bytes)}`, sha256: `sha256:${sha256Hex(bytes)}`,
    },
    authority: { engineeringAuthority: 'NONE', screeningAuthority: 'NOT_AUTHORIZED', designAuthority: false },
  };
}

function parseArguments(argv) {
  const options = {
    repositoryPath: null, outputPath: null, receiptPath: null, fetch: false,
    retrievalCommit: VIBRATION_MASTER_RETRIEVAL_COMMIT,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--repository') options.repositoryPath = argv[++index] ?? null;
    else if (arg === '--retrieval-commit') options.retrievalCommit = argv[++index] ?? null;
    else if (arg === '--out') options.outputPath = argv[++index] ?? null;
    else if (arg === '--receipt') options.receiptPath = argv[++index] ?? null;
    else if (arg === '--fetch') options.fetch = true;
    else throw new TypeError(`Unknown option: ${arg}`);
  }
  if (!options.repositoryPath || !options.outputPath) {
    throw new TypeError('Usage: node scripts/materialize-vibration-master-source.mjs --repository <Common-checkout> --retrieval-commit <commit> --out <pdf> [--receipt <json>] [--fetch]');
  }
  return options;
}

export function runVibrationMasterSourceMaterialization(argv = process.argv.slice(2)) {
  const args = parseArguments(argv);
  const receipt = materializeVibrationMasterSource(args);
  const json = `${JSON.stringify(receipt, null, 2)}\n`;
  if (args.receiptPath) {
    mkdirSync(dirname(resolve(args.receiptPath)), { recursive: true });
    writeFileSync(resolve(args.receiptPath), json, 'utf8');
  } else process.stdout.write(json);
  return receipt;
}

const invokedAsScript = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (invokedAsScript) runVibrationMasterSourceMaterialization();
