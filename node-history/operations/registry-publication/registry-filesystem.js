import fs from 'node:fs/promises';
import path from 'node:path';

export function createNodeFileSystemAdapter(overrides = {}) {
  const adapter = {
    readFile: (filePath) => fs.readFile(filePath),
    writeFileExclusive: (filePath, bytes) => writeExclusive(filePath, bytes),
    createDirectoryExclusive: (directory) => fs.mkdir(directory, { recursive: false }),
    listFiles: (directory) => listFiles(directory),
    removeTree: (directory) => fs.rm(directory, { recursive: true, force: true }),
    exists: (target) => exists(target),
    ...overrides,
  };
  return Object.freeze(adapter);
}

async function writeExclusive(filePath, bytes) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, bytes, { flag: 'wx' });
}

async function listFiles(directory) {
  const output = [];
  await walk(directory, directory, output);
  return output.sort();
}

async function walk(root, current, output) {
  const entries = await fs.readdir(current, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const absolute = path.join(current, entry.name);
    if (entry.isSymbolicLink()) throw operationError('SYMBOLIC_LINK_PROHIBITED', absolute);
    if (entry.isDirectory()) await walk(root, absolute, output);
    else if (entry.isFile()) output.push(toPosix(path.relative(root, absolute)));
    else throw operationError('UNSUPPORTED_FILESYSTEM_ENTRY', absolute);
  }
}

async function exists(target) {
  try {
    await fs.lstat(target);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

function operationError(code, target) {
  const error = new Error(`${code}: ${target}`);
  error.code = code;
  return error;
}

function toPosix(value) {
  return value.split(path.sep).join('/');
}
