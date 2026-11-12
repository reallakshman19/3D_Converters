#!/usr/bin/env node
// card-check: mechanical checks every card must pass before review.
//   node prototypes/_kit/card-check.mjs <card-folder> [--final]
// Exit 0 = all checks pass, 1 = a check failed, 2 = bad usage.
// --final also requires a filled REPORT.md and bench/RESULT.json.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const KIT = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const final = args.includes('--final');
const dirArg = args.find(a => !a.startsWith('--'));
if (!dirArg) { console.error('usage: node card-check.mjs <card-folder> [--final]'); process.exit(2); }
const CARD = resolve(dirArg);
if (!existsSync(CARD) || !statSync(CARD).isDirectory()) { console.error('not a folder: ' + CARD); process.exit(2); }

const results = [];
const check = (id, name, problems, warnings = []) => {
  results.push({ id, name, ok: problems.length === 0 });
  console.log((problems.length ? 'FAIL ' : 'PASS ') + id + ' ' + name);
  for (const p of problems) console.log('     - ' + p);
  for (const w of warnings) console.log('     ~ warning: ' + w);
};
const read = p => readFileSync(join(CARD, p), 'utf8');
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex');
const walk = (dir, out = []) => {
  for (const n of readdirSync(dir)) {
    if (n === '.git' || n === 'node_modules') continue;
    const p = join(dir, n);
    statSync(p).isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
};
const rel = p => relative(CARD, p).split(sep).join('/');
const files = walk(CARD);
const testFiles = files.filter(f => /^tests\/[^/]+\.test\.mjs$/.test(rel(f)));
const testText = testFiles.map(f => readFileSync(f, 'utf8')).join('\n');

// C1 layout
{
  const need = ['README.md', 'CARD.md', 'cli.mjs', 'engine', 'tests', 'tests/fixtures/manifest.json', 'bench/run.mjs',
    'VENDORED.md', 'REPORT.md', 'kit/core.mjs', 'kit/node.mjs', 'kit/BENCHMARKS.json', 'kit/KIT.sha256.json'];
  const p = need.filter(n => !existsSync(join(CARD, n))).map(n => 'missing ' + n);
  if (!testFiles.length) p.push('no tests/*.test.mjs');
  check('C1', 'folder layout', p);
}

// C2 kit copy unchanged
{
  const p = [], w = [];
  if (existsSync(join(CARD, 'kit/KIT.sha256.json'))) {
    const m = JSON.parse(read('kit/KIT.sha256.json'));
    for (const [f, h] of Object.entries(m)) {
      if (!existsSync(join(CARD, 'kit', f))) { p.push('kit/' + f + ' missing'); continue; }
      if (sha(join(CARD, 'kit', f)) !== h) p.push('kit/' + f + ' was edited (do not edit the kit copy; wrap it)');
      const upstream = f === 'BENCHMARKS.json' ? resolve(KIT, '..', '..', 'shared', 'topofix-formats', f) : join(KIT, f);
      if (existsSync(upstream) && sha(upstream) !== h) w.push('kit/' + f + ' is older than the current kit (re-copy with new-card when convenient)');
    }
  }
  check('C2', 'kit copy unchanged', p, w);
}

// C3 every card test id has a test with that title
{
  const p = [], w = [];
  const card = existsSync(join(CARD, 'CARD.md')) ? read('CARD.md') : '';
  const ids = [...new Set([...card.matchAll(/^\s*[-*]\s*(T\d+)\s*[:.]/gm)].map(m => m[1]))];
  const titled = new Set([...testText.matchAll(/\btest\s*\(\s*['"`](T\d+)\b/g)].map(m => m[1]));
  if (!ids.length) p.push('CARD.md lists no tests ("- T1: ..."); paste your card');
  for (const id of ids) if (!titled.has(id)) p.push(id + ' from CARD.md has no test titled "' + id + ' ..."');
  for (const id of titled) if (!ids.includes(id)) w.push(id + ' is tested but not in CARD.md');
  check('C3', 'card tests present (' + ids.length + ' ids)', p, w);
}

// C4 refusal codes: engine codes are documented, documented codes are tested
{
  const p = [];
  const readme = existsSync(join(CARD, 'README.md')) ? read('README.md') : '';
  const sec = (readme.split(/^##\s+Refusal codes\s*$/m)[1] || '').split(/^##\s/m)[0];
  const documented = new Set([...sec.matchAll(/^\|\s*`([A-Z][A-Z0-9_]+)`/gm)].map(m => m[1]));
  const engineText = files.filter(f => /^engine\/.*\.m?js$/.test(rel(f))).map(f => readFileSync(f, 'utf8')).join('\n');
  const used = new Set([
    ...[...engineText.matchAll(/\b(?:refuse|\.add)\(\s*['"`]([A-Z][A-Z0-9_]+)['"`]/g)].map(m => m[1]),
    ...[...engineText.matchAll(/\brequire\([^;]*?,\s*['"`]([A-Z][A-Z0-9_]+)['"`]/g)].map(m => m[1]),
  ]);
  if (!documented.size) p.push('README.md has no "## Refusal codes" table rows (| `CODE` | meaning |)');
  for (const c of used) if (!documented.has(c)) p.push(c + ' is used in engine/ but not listed in README Refusal codes');
  for (const c of documented) if (!testText.includes(c)) p.push(c + ' is listed in README but no test mentions it');
  check('C4', 'refusal codes (' + used.size + ' used, ' + documented.size + ' documented)', p);
}

// C5 imports stay inside the card folder; no packages, no network
{
  const p = [];
  for (const f of files.filter(f => /\.(m?js|html)$/.test(f))) {
    const t = readFileSync(f, 'utf8');
    const specs = [
      ...[...t.matchAll(/\bimport\s+(?:[^'"`;]*?\s+from\s+)?['"`]([^'"`]+)['"`]/g)].map(m => m[1]),
      ...[...t.matchAll(/\bimport\(\s*['"`]([^'"`]+)['"`]\s*\)/g)].map(m => m[1]),
      ...[...t.matchAll(/<script[^>]*\bsrc\s*=\s*['"]([^'"]+)['"]/g)].map(m => m[1]),
    ];
    for (const s of specs) {
      if (s.startsWith('node:')) continue;
      if (/^https?:/.test(s)) { p.push(rel(f) + ' loads ' + s + ' (no network loads)'); continue; }
      if (!s.startsWith('.') && !s.startsWith('/')) { p.push(rel(f) + ' imports package "' + s + '" (no packages; vendor it)'); continue; }
      const target = resolve(dirname(f), s);
      if (relative(CARD, target).startsWith('..')) p.push(rel(f) + ' imports ' + s + ' outside the card folder (copy it into vendor/)');
      else if (!existsSync(target)) p.push(rel(f) + ' imports missing file ' + s);
    }
  }
  check('C5', 'imports stay inside the folder', p);
}

// C6 vendored files listed with matching sha256
{
  const p = [];
  const listed = new Map();
  if (existsSync(join(CARD, 'VENDORED.md'))) {
    for (const line of read('VENDORED.md').replace(/<!--[\s\S]*?-->/g, '').split(/\r?\n/)) {
      if (!line.startsWith('vendor/')) continue;
      const parts = line.split('|').map(s => s.trim());
      if (parts.length !== 5) { p.push('VENDORED.md line needs 5 fields: ' + line); continue; }
      listed.set(parts[0], parts[4]);
    }
  }
  const actual = files.map(rel).filter(r => r.startsWith('vendor/') && !r.endsWith('.gitkeep'));
  for (const r of actual) {
    if (!listed.has(r)) p.push(r + ' is not listed in VENDORED.md');
    else if (sha(join(CARD, r)) !== listed.get(r).toLowerCase()) p.push(r + ' sha256 differs from VENDORED.md (vendored files must not be edited)');
  }
  for (const r of listed.keys()) if (!actual.includes(r)) p.push(r + ' listed in VENDORED.md but missing');
  check('C6', 'vendored files (' + actual.length + ')', p);
}

// C7 fixtures listed in tests/fixtures/manifest.json with matching sha256
{
  const p = [];
  const mpath = join(CARD, 'tests/fixtures/manifest.json');
  let entries = [];
  if (existsSync(mpath)) {
    try { entries = JSON.parse(readFileSync(mpath, 'utf8')).files || []; } catch { p.push('manifest.json is not valid JSON'); }
  }
  const byFile = new Map(entries.map(e => [e.file, e]));
  const actual = files.map(rel).filter(r => r.startsWith('tests/fixtures/') && r !== 'tests/fixtures/manifest.json')
    .map(r => r.slice('tests/fixtures/'.length));
  for (const f of actual) {
    const e = byFile.get(f);
    if (!e) { p.push('fixture ' + f + ' not in manifest.json'); continue; }
    for (const k of ['sha256', 'bytes', 'madeBy', 'purpose']) if (e[k] === undefined) p.push('fixture ' + f + ' manifest entry lacks ' + k);
    if (e.sha256 && sha(join(CARD, 'tests/fixtures', f)) !== String(e.sha256).toLowerCase()) p.push('fixture ' + f + ' sha256 differs from manifest');
  }
  for (const f of byFile.keys()) if (!actual.includes(f)) p.push('manifest lists ' + f + ' but the file is missing');
  check('C7', 'fixtures (' + actual.length + ')', p);
}

// C8 no Owner-only inputs
{
  const p = [];
  for (const f of files) {
    const r = rel(f);
    if (/__local_inputs|(^|\/)STF_|\.xlsx$/i.test(r)) p.push(r + ' looks like an Owner-only input');
    if (r.startsWith('kit/') || !/\.(m?js|json|md|html|csv|txt)$/.test(r)) continue;
    const t = readFileSync(f, 'utf8');
    if (/__local_inputs|STF_20\d\d|managed_stage\.json|Piping class master/i.test(t)) p.push(r + ' refers to an Owner-only input');
  }
  check('C8', 'no Owner-only inputs', p);
}

// C9 (--final) report and bench result present
if (final) {
  const p = [];
  if (!existsSync(join(CARD, 'bench/RESULT.json'))) p.push('bench/RESULT.json missing (run node bench/run.mjs)');
  else {
    const r = JSON.parse(read('bench/RESULT.json'));
    if (!r.rows || !r.rows.length) p.push('bench/RESULT.json has no rows');
    for (const row of r.rows || []) if (row.pass === false) p.push('bench ' + row.bench + ' did not pass');
  }
  const rep = existsSync(join(CARD, 'REPORT.md')) ? read('REPORT.md') : '';
  if (/<n>|<what broke>|yes\/no/.test(rep)) p.push('REPORT.md still has template placeholders');
  check('C9', 'final report and bench', p);
}

const failed = results.filter(r => !r.ok).length;
console.log('card-check: ' + (failed ? 'FAIL (' + failed + ' of ' + results.length + ' checks)' : 'PASS (' + results.length + ' checks)') + ' · ' + CARD);
process.exit(failed ? 1 : 0);
