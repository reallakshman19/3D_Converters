// Copies the UXML v2 supports stage (XML_Compare_Utilities uxml/v2, the import closure of supports/SupportsStage.js)
// into vendor/uxml-v2 and writes vendor/uxml-v2/PIN.json (commit + SHA-256 per file). The step-10 "UXML route" runs it.
//   node scripts/vendor-uxml-v2.mjs <XML_Compare_Utilities checkout>
// The checkout must be clean under uxml/v2, so the pin names exactly what was copied.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const ENTRY = 'supports/SupportsStage.js';
const IMPORT = /(?:import|export)[^'"]*?from\s*['"](\.[^'"]+)['"]|import\(\s*['"](\.[^'"]+)['"]/g;

/** Every file the entry imports, directly or not (relative imports only). */
export function importClosure(base, entry) {
  const seen = new Set();
  const walk = (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    for (const m of fs.readFileSync(file, 'utf8').matchAll(IMPORT)) walk(path.resolve(path.dirname(file), m[1] || m[2]));
  };
  walk(path.join(base, entry));
  return [...seen].map((f) => path.relative(base, f).split(path.sep).join('/')).sort();
}

/** SHA-256 of a text file with CRLF read as LF, so a Windows checkout (core.autocrlf) still matches the pin. */
export const sha256 = (buf) => crypto.createHash('sha256').update(String(buf).replace(/\r\n/g, '\n')).digest('hex');

function main(xcu) {
  if (!xcu || !fs.existsSync(path.join(xcu, 'uxml/v2', ENTRY))) throw new Error('usage: node scripts/vendor-uxml-v2.mjs <XML_Compare_Utilities checkout>');
  const git = (...args) => execFileSync('git', ['-C', xcu, ...args], { encoding: 'utf8' }).trim();
  if (git('status', '--porcelain', '--', 'uxml/v2')) throw new Error('UXML_VENDOR_DIRTY: commit or discard changes under uxml/v2 first');
  const base = path.join(xcu, 'uxml/v2');
  const out = path.join(ROOT, 'vendor/uxml-v2');
  fs.rmSync(out, { recursive: true, force: true });
  const files = {};
  for (const rel of importClosure(base, ENTRY)) {
    if (rel.startsWith('..')) throw new Error(`UXML_VENDOR_OUTSIDE: ${rel}`);
    const buf = fs.readFileSync(path.join(base, rel));
    fs.mkdirSync(path.dirname(path.join(out, rel)), { recursive: true });
    fs.writeFileSync(path.join(out, rel), buf);
    files[rel] = sha256(buf);
  }
  const pin = { source: 'reallakshman19/XML_Compare_Utilities', path: 'uxml/v2', commit: git('rev-parse', 'HEAD'), entry: ENTRY, files };
  fs.writeFileSync(path.join(out, 'PIN.json'), `${JSON.stringify(pin, null, 1)}\n`);
  console.log(`${Object.keys(files).length} files from ${pin.commit}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv[2]);
