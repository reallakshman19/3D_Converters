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

export async function withPrivateWorkspace(targetPath, task) {
  const parent = dirname(targetPath);
  await mkdir(parent, { recursive: true });
  const workspace = await mkdtemp(join(parent, `.${basename(targetPath)}.f2s007-`));
  try { return await task(workspace); }
  finally { await rm(workspace, { recursive: true, force: true }); }
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
