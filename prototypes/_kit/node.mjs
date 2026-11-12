// TopoFix prototype kit: Node-only helpers (fs). Used by cli.mjs, tests and bench.
// Copied unchanged into every card's kit/ folder. Do not edit the copy.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { refuse, require, requireSha256 } from './core.mjs';

const KIT_DIR = dirname(fileURLToPath(import.meta.url));
/** The card folder (parent of kit/). */
export const CARD_DIR = resolve(KIT_DIR, '..');

/** The pinned benchmark list (copy of shared/topofix-formats/BENCHMARKS.json). */
export function benchmarks() {
  const local = join(KIT_DIR, 'BENCHMARKS.json');
  const shared = join(repoHome(), 'shared', 'topofix-formats', 'BENCHMARKS.json');
  return JSON.parse(readFileSync(existsSync(local) ? local : shared, 'utf8'));
}

/** The repo checkout this kit sits in: the nearest parent folder that contains prototypes/. */
export function repoHome() {
  let d = KIT_DIR;
  for (let i = 0; i < 8; i++) {
    const up = dirname(d);
    if (existsSync(join(up, 'prototypes')) && existsSync(join(up, 'shared'))) return up;
    if (up === d) break;
    d = up;
  }
  return resolve(CARD_DIR, '..', '..');
}

/**
 * Parse `--key value`, `--key=value` and repeated `--root XCU=path` args.
 * Returns {_:[positional...], key:value, roots:{XCU:path,'3DC':path}}.
 */
export function parseArgs(argv = process.argv.slice(2)) {
  const out = { _: [], roots: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { out._.push(a); continue; }
    let [k, v] = a.slice(2).split(/=(.*)/s);
    if (v === undefined) v = (argv[i + 1] && !argv[i + 1].startsWith('--')) ? argv[++i] : true;
    if (k === 'root') { const [r, p] = String(v).split(/=(.*)/s); out.roots[r] = p; } else out[k] = v;
  }
  return out;
}

/**
 * Where each repo checkout is. Order: --root REPO=path, env TOPOFIX_ROOT_XCU / TOPOFIX_ROOT_3DC,
 * else the repo this kit sits in (repoHome) for every repo.
 */
export function repoRoots(args = {}) {
  const home = repoHome();
  const roots = {};
  for (const r of Object.keys(benchmarks().repos)) {
    roots[r] = (args.roots && args.roots[r]) || process.env['TOPOFIX_ROOT_' + r] || home;
  }
  return roots;
}

/**
 * Read one pinned benchmark file by id (e.g. 'X-SRC', 'C-TRC'), checking size and sha256.
 * Refuses INPUT_UNKNOWN_BENCHMARK, INPUT_NOT_FOUND, INPUT_SIZE_MISMATCH, INPUT_SHA256_MISMATCH.
 * Returns {bytes: Uint8Array, entry, path}.
 */
export async function readBenchmark(id, args = {}) {
  const entry = benchmarks().files.find(f => f.id === id);
  require(entry, 'INPUT_UNKNOWN_BENCHMARK', id);
  const root = repoRoots(args)[entry.repo];
  const path = join(root, entry.path);
  require(existsSync(path), 'INPUT_NOT_FOUND', id, path + ' (set --root ' + entry.repo + '=<checkout> or TOPOFIX_ROOT_' + entry.repo + ')');
  const bytes = new Uint8Array(readFileSync(path));
  require(bytes.length === entry.bytes, 'INPUT_SIZE_MISMATCH', id, 'expected ' + entry.bytes + ' got ' + bytes.length);
  await requireSha256(bytes, entry.sha256, id);
  return { bytes, entry, path };
}

/** Read any file as bytes; refuses INPUT_NOT_FOUND. */
export function readBytes(path) {
  if (!existsSync(path)) refuse('INPUT_NOT_FOUND', path);
  return new Uint8Array(readFileSync(path));
}

/** Write bench/RESULT.json: {card, at, node, rows:[{bench,input,sha256,ms,pass,...}]}. */
export function writeResult(rows, file = join(CARD_DIR, 'bench', 'RESULT.json')) {
  mkdirSync(dirname(file), { recursive: true });
  const doc = { card: CARD_DIR.split(/[\\/]/).pop(), at: new Date().toISOString(), node: process.version, rows };
  writeFileSync(file, JSON.stringify(doc, null, 1) + '\n');
  return doc;
}

/**
 * Standard CLI ending: print JSON, exit 0 when result.ok, 1 when refused.
 * Use usage() for bad arguments (exit 2).
 */
export function finish(result) {
  process.stdout.write(JSON.stringify(result, null, 1) + '\n');
  process.exit(result && result.ok ? 0 : 1);
}
export function usage(text) {
  process.stderr.write('usage: ' + text + '\n');
  process.exit(2);
}
