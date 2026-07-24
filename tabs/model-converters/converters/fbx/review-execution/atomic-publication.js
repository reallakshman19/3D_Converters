import {
  link, lstat, mkdtemp, mkdir, readdir, rename, rm, rmdir, unlink,
} from 'node:fs/promises';
import { dirname, join, basename } from 'node:path';

async function targetState(path) {
  try { return await lstat(path); }
  catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

function publicationConflict(message, cause) {
  const error = new Error(message, { cause });
  error.code = cause.code;
  return error;
}

function directoryPublicationError(error, targetPath) {
  if (error.code === 'ENOTEMPTY' || error.code === 'EEXIST') {
    return publicationConflict(`Output directory ${targetPath} became non-empty before publication.`, error);
  }
  if (error.code === 'ENOTDIR' || error.code === 'EISDIR') {
    return publicationConflict(`Output target ${targetPath} changed type before publication.`, error);
  }
  return error;
}

export async function assertEmptyOrAbsentDirectory(path) {
  const state = await targetState(path);
  if (!state) return;
  if (!state.isDirectory()) throw new Error(`Output target ${path} is not a directory.`);
  if ((await readdir(path)).length > 0) throw new Error(`Output directory ${path} must be empty.`);
}

export async function assertAbsentFile(path) {
  if (await targetState(path)) throw new Error(`Output file ${path} already exists.`);
}

function cancellationState() {
  let signal = null;
  const handlers = Object.fromEntries(['SIGINT', 'SIGTERM'].map((name) => [name, () => { signal = name; }]));
  for (const [name, handler] of Object.entries(handlers)) process.once(name, handler);
  return {
    check() {
      if (!signal) return;
      const error = new Error(`F2S-007 execution cancelled by ${signal}.`);
      error.code = 'F2S007_CANCELLED';
      throw error;
    },
    close() {
      for (const [name, handler] of Object.entries(handlers)) process.removeListener(name, handler);
    },
  };
}

export async function withPrivateWorkspace(targetPath, task) {
  const parent = dirname(targetPath);
  await mkdir(parent, { recursive: true });
  const workspace = await mkdtemp(join(parent, `.${basename(targetPath)}.f2s007-`));
  const cancellation = cancellationState();
  try { return await task(workspace, cancellation.check); }
  finally {
    cancellation.close();
    await rm(workspace, { recursive: true, force: true });
  }
}

export async function prepareDirectoryTarget(targetPath) {
  const state = await targetState(targetPath);
  if (!state) return;
  if (!state.isDirectory()) throw new Error(`Output target ${targetPath} is not a directory.`);
  try { await rmdir(targetPath); }
  catch (error) { throw directoryPublicationError(error, targetPath); }
}

export async function commitDirectoryPublication(stagedPath, targetPath) {
  try { await rename(stagedPath, targetPath); }
  catch (error) { throw directoryPublicationError(error, targetPath); }
}

export async function publishDirectory(stagedPath, targetPath) {
  await prepareDirectoryTarget(targetPath);
  await commitDirectoryPublication(stagedPath, targetPath);
}

export async function publishFile(stagedPath, targetPath) {
  try { await link(stagedPath, targetPath); }
  catch (error) {
    if (error.code === 'EEXIST') {
      throw publicationConflict(`Output file ${targetPath} appeared before publication.`, error);
    }
    throw error;
  }
  await unlink(stagedPath);
}
