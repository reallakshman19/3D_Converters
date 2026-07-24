import { mkdtemp, mkdir, readdir, rename, rm, stat } from 'node:fs/promises';
import { dirname, join, basename } from 'node:path';

async function targetState(path) {
  try { return await stat(path); }
  catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
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

export async function publishDirectory(stagedPath, targetPath) {
  await assertEmptyOrAbsentDirectory(targetPath);
  await rm(targetPath, { recursive: true, force: true });
  await rename(stagedPath, targetPath);
}

export async function publishFile(stagedPath, targetPath) {
  await assertAbsentFile(targetPath);
  await rename(stagedPath, targetPath);
}
