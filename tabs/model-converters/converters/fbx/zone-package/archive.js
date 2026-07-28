import { sha256Hex } from '../sha256.js';
import { FBX_ZONE_PACKAGE_LIMITS, fail } from './constants.js';

const MAGIC = new TextEncoder().encode('FBXZPKG1');

function directoryFor(files) {
  let offset = 0;
  const entries = files.map((file) => {
    const entry = { path: file.path, offset, length: file.bytes.byteLength, sha256: file.sha256 };
    offset += file.bytes.byteLength;
    return entry;
  });
  return { entries, bodyLength: offset };
}

/**
 * Phase 6: encodes a Phase 1 package's file list into a single, bounded,
 * dependency-free archive: an 8-byte magic, a 4-byte big-endian header
 * length, a JSON directory (path/offset/length/sha256 per file), then the
 * concatenated file bytes in the same deterministic order the package
 * builder produced them in. Pure function; no DOM or download side effects.
 */
export async function buildPackageArchive(files) {
  if (!Array.isArray(files) || !files.length) fail('ZONE_PACKAGE_INVALID_INPUT', 'files must be a non-empty array.');
  const totalBytes = files.reduce((sum, file) => sum + file.bytes.byteLength, 0);
  if (totalBytes > FBX_ZONE_PACKAGE_LIMITS.maxGeometryBufferBytes * files.length) {
    fail('ZONE_PACKAGE_LIMIT_EXCEEDED', 'archive payload exceeds the admitted resource ceiling.');
  }
  const { entries, bodyLength } = directoryFor(files);
  const headerBytes = new TextEncoder().encode(JSON.stringify({ entries, fileCount: files.length }));
  const headerLength = new Uint8Array(4);
  new DataView(headerLength.buffer).setUint32(0, headerBytes.byteLength, false);
  const archive = new Uint8Array(MAGIC.byteLength + headerLength.byteLength + headerBytes.byteLength + bodyLength);
  let cursor = 0;
  archive.set(MAGIC, cursor); cursor += MAGIC.byteLength;
  archive.set(headerLength, cursor); cursor += headerLength.byteLength;
  archive.set(headerBytes, cursor); cursor += headerBytes.byteLength;
  for (const file of files) { archive.set(file.bytes, cursor); cursor += file.bytes.byteLength; }
  return { bytes: archive, sha256: await sha256Hex(archive) };
}

/** Decodes a buildPackageArchive() result back into its file list; used by tests to prove round-trip fidelity. */
export function readPackageArchive(bytes) {
  const view = new Uint8Array(bytes);
  for (let index = 0; index < MAGIC.length; index += 1) {
    if (view[index] !== MAGIC[index]) fail('ZONE_PACKAGE_INVALID_ARCHIVE', 'archive magic does not match FBXZPKG1.');
  }
  const headerLength = new DataView(view.buffer, view.byteOffset + MAGIC.length, 4).getUint32(0, false);
  const headerStart = MAGIC.length + 4;
  const header = JSON.parse(new TextDecoder().decode(view.subarray(headerStart, headerStart + headerLength)));
  const bodyStart = headerStart + headerLength;
  return header.entries.map((entry) => ({
    path: entry.path,
    sha256: entry.sha256,
    bytes: view.slice(bodyStart + entry.offset, bodyStart + entry.offset + entry.length),
  }));
}
