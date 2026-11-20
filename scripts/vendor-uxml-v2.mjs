// Copies the UXML v2 stages step 10 runs (XML_Compare_Utilities uxml/v2, the import closure of ENTRIES) into
// vendor/uxml-v2 and writes vendor/uxml-v2/PIN.json (commit + SHA-256 per file). The step-10 "UXML route" runs them.
// The UXML reader imports a few files from uxml/ (one level up); they keep their place: vendor/<file>, pinned as '../<file>'.
//   node scripts/vendor-uxml-v2.mjs <XML_Compare_Utilities checkout>
// The checkout must be clean under uxml/v2, so the pin names exactly what was copied.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const ENTRIES = Object.freeze(['supports/SupportsStage.js', 'topology/GasketDropStage.js', 'supports/SupportsUnderLocks.js', 'transfer/TransferStage.js', 'supports/ChangeList.js']);
const IMPORT = /(?:import|export)[^'"]*?from\s*['"](\.[^'"]+)['"]|import\(\s*['"](\.[^'"]+)['"]/g;

/** Every file the entries import, directly or not (relative imports only). */
export function importClosure(base, entries) {
  const seen = new Set();
  const walk = (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    for (const m of fs.readFileSync(file, 'utf8').matchAll(IMPORT)) walk(path.resolve(path.dirname(file), m[1] || m[2]));
  };
  for (const entry of [entries].flat()) walk(path.join(base, entry));
  return [...seen].map((f) => path.relative(base, f).split(path.sep).join('/')).sort();
}

/** SHA-256 of a text file with CRLF read as LF, so a Windows checkout (core.autocrlf) still matches the pin. */
export const sha256 = (buf) => crypto.createHash('sha256').update(String(buf).replace(/\r\n/g, '\n')).digest('hex');

function main(xcu) {
  if (!xcu || !ENTRIES.every((e) => fs.existsSync(path.join(xcu, 'uxml/v2', e)))) throw new Error('usage: node scripts/vendor-uxml-v2.mjs <XML_Compare_Utilities checkout>');
  const git = (...args) => execFileSync('git', ['-C', xcu, ...args], { encoding: 'utf8' }).trim();
  if (git('status', '--porcelain', '--', 'uxml')) throw new Error('UXML_VENDOR_DIRTY: commit or discard changes under uxml first');
  const base = path.join(xcu, 'uxml/v2');
  const out = path.join(ROOT, 'vendor/uxml-v2');
  fs.rmSync(out, { recursive: true, force: true });
  const files = {};
  for (const rel of importClosure(base, ENTRIES)) {
    if (rel.startsWith('../..') || (rel.startsWith('..') && !/^\.\.\/[^/]+\.js$/.test(rel))) throw new Error(`UXML_VENDOR_OUTSIDE: ${rel}`);
    const buf = fs.readFileSync(path.join(base, rel));
    fs.mkdirSync(path.dirname(path.join(out, rel)), { recursive: true });
    fs.writeFileSync(path.join(out, rel), buf);
    files[rel] = sha256(buf);
  }
  const pin = { source: 'reallakshman19/XML_Compare_Utilities', path: 'uxml/v2', commit: git('rev-parse', 'HEAD'), entries: ENTRIES, files };
  fs.writeFileSync(path.join(out, 'PIN.json'), `${JSON.stringify(pin, null, 1)}\n`);
  console.log(`${Object.keys(files).length} files from ${pin.commit}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv[2]);
