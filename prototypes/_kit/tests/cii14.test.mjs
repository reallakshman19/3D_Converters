// Tests for kit/cii14.mjs against the public v14 benchmarks (expected values computed by an
// independent Python reader, 12 Nov 2026) and against mutated copies of them.
// Run from prototypes/_kit:  node --test      (needs the XCU checkout: repo root or TOPOFIX_ROOT_XCU)
import test from 'node:test';
import assert from 'node:assert/strict';
import { attempt, sha256Hex, timeMedian } from '../core.mjs';
import { readBenchmark } from '../node.mjs';
import { readCii14, fieldDiff, rigidOf, scanLines } from '../cii14.mjs';

const TRUTH = {
  'X-S1': { numelt: 56, rigids: 1, nodeNames: 49, first: [3790, 3830, 0], last: [5220, 5229], firstRigidElement: 55, rigidWeightSum: 1390.0, firstRigidWeightToken: '1.390000E+03' },
  'X-S2': { numelt: 46, rigids: 1, nodeNames: 42, first: [40, 50, 0], last: [660, 669], firstRigidElement: 45, rigidWeightSum: 129.994, firstRigidWeightToken: '1.299936E+02' },
  'X-S3C': { numelt: 45, rigids: 1, nodeNames: 40, first: [1350, 1360, 112], last: [1920, 1930], firstRigidElement: 0, rigidWeightSum: 349.983, firstRigidWeightToken: '3.499827E+02' },
  'X-T': { numelt: 1614, rigids: 124, nodeNames: 1265, first: [10, 15, 169], last: [11690, 11700], firstRigidElement: 0, rigidWeightSum: 272315.175, firstRigidWeightToken: '9.500000E+02' },
  'X-TEXP': { numelt: 1614, rigids: 124, nodeNames: 1266, first: [10, 15, 169], last: [11690, 11700], firstRigidElement: 0, rigidWeightSum: 272315.175, firstRigidWeightToken: '9.500000E+02' },
};
const latin1 = b => Buffer.from(b).toString('latin1');
const bytesOf = s => Uint8Array.from(s, c => c.charCodeAt(0));
const load = async id => (await readBenchmark(id)).bytes;
const refusal = async (bytes, code) => {
  const r = await attempt(() => readCii14(bytes));
  assert.equal(r.ok, false, 'expected refusal ' + code);
  assert.equal(r.refusals[0].code, code, JSON.stringify(r.refusals[0]));
};
/** Replace the n-th match of `find` in text (n from 0). */
const replaceNth = (text, find, repl, n = 0) => {
  let at = -1; for (let i = 0; i <= n; i++) at = text.indexOf(find, at + 1);
  assert.ok(at >= 0, 'fixture anchor not found: ' + find);
  return text.slice(0, at) + repl + text.slice(at + find.length);
};

for (const [id, t] of Object.entries(TRUTH)) {
  test(`K1 ${id}: counts, endpoints and rigids match the independent reader`, async () => {
    const c = readCii14(await load(id));
    assert.equal(c.version, 14);
    assert.equal(c.eol, 'CRLF');
    assert.equal(c.counts.NUMELT, t.numelt);
    assert.equal(c.elements.length, t.numelt);
    assert.equal(c.rigids.length, t.rigids);
    assert.equal(c.nodeNames.length, t.nodeNames);
    const e0 = c.elements[0], eN = c.elements.at(-1);
    assert.deepEqual([e0.from, e0.to, e0.fields.DX.value], t.first);
    assert.deepEqual([eN.from, eN.to], t.last);
    assert.equal(c.rigids[0].element, t.firstRigidElement);
    assert.equal(c.rigids[0].weight.token, t.firstRigidWeightToken);
    assert.equal(Math.round(c.rigids.reduce((s, r) => s + r.weight.value, 0) * 1000) / 1000, t.rigidWeightSum);
    assert.equal(rigidOf(c, t.firstRigidElement).pointer, 1);
  });
}

test('K2 every rigid weight and node-name span points at exactly its bytes', async () => {
  const bytes = await load('X-T'), text = latin1(bytes), c = readCii14(bytes);
  for (const r of c.rigids) {
    assert.equal(r.weight.end - r.weight.start, 13);
    assert.equal(text.slice(r.weight.start, r.weight.end), r.weight.raw);
    assert.equal(text.slice(r.weight.start, r.weight.end).trim(), r.weight.token);
    assert.equal(c.elements[r.element].pointers.RIGID, r.pointer);
  }
  for (const n of c.nodeNames) {
    assert.equal(text.slice(n.from.start, n.from.end), n.from.raw);
    assert.equal(text.slice(n.to.start, n.to.end), n.to.raw);
  }
});

test('K3 fieldDiff: a file against itself has no differences', async () => {
  const c = readCii14(await load('X-S1'));
  assert.deepEqual(fieldDiff(c, readCii14(await load('X-S1'))), []);
});

test('K4 fieldDiff: one rigid weight changed in place shows exactly that one field', async () => {
  const bytes = await load('X-T'), c = readCii14(bytes);
  const r = c.rigids[10], edited = new Uint8Array(bytes);
  const token = '1.234500E+03'.padStart(13, ' ');
  edited.set(bytesOf(token), r.weight.start);
  const d = fieldDiff(c, readCii14(edited));
  assert.equal(d.length, 1);
  assert.deepEqual([d[0].section, d[0].start, d[0].end, d[0].after], ['RIGID', r.weight.start, r.weight.end, token]);
  assert.equal(readCii14(edited).rigids[10].weight.value, 1234.5);
});

test('K5 fieldDiff refuses CII_STRUCTURE_CHANGED when row counts differ (T vs TEXPECTED)', async () => {
  const a = readCii14(await load('X-T')), b = readCii14(await load('X-TEXP'));
  const r = await attempt(() => fieldDiff(a, b));
  assert.equal(r.ok, false);
  assert.equal(r.refusals[0].code, 'CII_STRUCTURE_CHANGED');
});

test('K6 a version-11 CII is refused with CII_VERSION_UNSUPPORTED', async () => {
  await refusal(await load('X-SRC'), 'CII_VERSION_UNSUPPORTED');
});

test('K7 line endings: LF copy reads the same; CII_MIXED_EOL and CII_BARE_CR refused', async () => {
  const text = latin1(await load('X-S3C'));
  const lf = readCii14(bytesOf(text.replace(/\r\n/g, '\n')));
  assert.equal(lf.eol, 'LF');
  assert.equal(lf.elements.length, 45);
  await refusal(bytesOf(text.replace('\r\n', '\n')), 'CII_MIXED_EOL');
  await refusal(bytesOf(text.replace('\r\n', '\r')), 'CII_BARE_CR');
});

test('K8 structural refusals on mutated copies of S3.CII', async () => {
  const text = latin1(await load('X-S3C'));
  const lines = text.split('\r\n');
  const at = name => lines.findIndex(l => l.startsWith('#$ ' + name));
  const join = ls => bytesOf(ls.join('\r\n'));
  // CII_ELEMENT_ROWS_NOT_15: drop one ELEMENTS row
  { const ls = [...lines]; ls.splice(at('ELEMENTS') + 1, 1); await refusal(join(ls), 'CII_ELEMENT_ROWS_NOT_15'); }
  // CII_NUMELT_MISMATCH: drop one whole element (15 rows)
  { const ls = [...lines]; ls.splice(at('ELEMENTS') + 1, 15); await refusal(join(ls), 'CII_NUMELT_MISMATCH'); }
  // CII_DUPLICATE_SECTION
  { const ls = [...lines]; ls.splice(at('UNITS'), 0, '#$ RIGID   '); await refusal(join(ls), 'CII_DUPLICATE_SECTION'); }
  // CII_TEXT_BEFORE_VERSION
  await refusal(bytesOf('hello\r\n' + text), 'CII_TEXT_BEFORE_VERSION');
  // CII_VERSION_NOT_FIRST
  { const ls = [...lines]; const v = ls.splice(0, at('CONTROL')); ls.splice(at('ELEMENTS') - v.length + 1, 0, ...v); await refusal(join(ls), 'CII_VERSION_NOT_FIRST'); }
  // CII_SECTION_MARKER_INVALID
  { const ls = [...lines]; ls[at('UNITS')] = '#$ units'; await refusal(join(ls), 'CII_SECTION_MARKER_INVALID'); }
  // CII_REQUIRED_SECTION_MISSING: rename ELEMENTS
  { const ls = [...lines]; ls[at('ELEMENTS')] = '#$ ELEMENTX'; await refusal(join(ls), 'CII_REQUIRED_SECTION_MISSING'); }
  // CII_AUX_CARDINALITY: drop the RIGID row
  { const ls = [...lines]; ls.splice(at('RIGID') + 1, 1); await refusal(join(ls), 'CII_AUX_CARDINALITY'); }
  // CII_CONTROL_TRUNCATED
  { const ls = [...lines]; ls.splice(at('CONTROL') + 1, 1); await refusal(join(ls), 'CII_CONTROL_TRUNCATED'); }
  // CII_NUMBER_INVALID: corrupt element 0 FROM
  { const ls = [...lines]; const r = at('ELEMENTS') + 1; ls[r] = ls[r].slice(0, 2) + '      ABC.00 ' + ls[r].slice(15); await refusal(join(ls), 'CII_NUMBER_INVALID'); }
  // CII_ELEMENT_NODE_INVALID: FROM = 0
  { const ls = [...lines]; const r = at('ELEMENTS') + 1; ls[r] = ls[r].slice(0, 2) + '0.000000'.padStart(13) + ls[r].slice(15); await refusal(join(ls), 'CII_ELEMENT_NODE_INVALID'); }
  // CII_ROW_SHORT: cut element 0 row 0 to 20 chars
  { const ls = [...lines]; const r = at('ELEMENTS') + 1; ls[r] = ls[r].slice(0, 20); await refusal(join(ls), 'CII_ROW_SHORT'); }
  // CII_NON_ASCII inside a field
  { const ls = [...lines]; const r = at('ELEMENTS') + 1; ls[r] = ls[r].slice(0, 30) + 'é' + ls[r].slice(31); await refusal(join(ls), 'CII_NON_ASCII'); }
});

test('K9 pointer refusals: CII_POINTER_OUT_OF_RANGE, CII_SHARED_POINTER, CII_ORPHAN_RECORD', async () => {
  const text = latin1(await load('X-S1'));
  const c = readCii14(bytesOf(text));
  const setRigidPointer = (src, elementIndex, value) => {
    const f = readCii14(bytesOf(src)).elements[elementIndex].rows[12];
    const a = f.start + 2 + 13, b = a + 13;
    return src.slice(0, a) + String(value).padStart(13) + src.slice(b);
  };
  const owner = c.rigids[0].element; // element 55 owns rigid 1
  await refusal(bytesOf(setRigidPointer(text, owner, 2)), 'CII_POINTER_OUT_OF_RANGE');
  await refusal(bytesOf(setRigidPointer(text, 0, 1)), 'CII_SHARED_POINTER');
  await refusal(bytesOf(setRigidPointer(text, owner, 0)), 'CII_ORPHAN_RECORD');
});

test('K10 the reader never changes the input bytes', async () => {
  const bytes = await load('X-S2'), before = await sha256Hex(bytes);
  readCii14(bytes); fieldDiff(readCii14(bytes), readCii14(bytes));
  assert.equal(await sha256Hex(bytes), before);
});

test('K11 refusal CII_BYTES_REQUIRED for a string input; scanLines keeps byte offsets', async () => {
  const r = await attempt(() => readCii14('#$ VERSION'));
  assert.equal(r.refusals[0].code, 'CII_BYTES_REQUIRED');
  const { lines } = scanLines(bytesOf('ab\r\ncd'));
  assert.deepEqual(lines.map(l => [l.start, l.end, l.next]), [[0, 2, 4], [4, 6, 6]]);
});

test('K12 speed: reading T.CII (2.87 MB, 1614 elements) takes under 2 s', async () => {
  const bytes = await load('X-T');
  const t = await timeMedian(() => readCii14(bytes));
  console.log('readCii14 T.CII median ms', t.ms);
  assert.ok(t.ms < 2000, t.ms + ' ms');
});
