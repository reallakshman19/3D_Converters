// Tests for kit/xmlspan.mjs. Expected values in xml-truth.json come from Python's xml.etree
// (an independent parser), 12 Nov 2026. Needs checkouts: TOPOFIX_ROOT_XCU (X-F05) and TOPOFIX_ROOT_3DC.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { attempt, sha256Hex, timeMedian } from '../core.mjs';
import { readBenchmark } from '../node.mjs';
import { scanXml, text, child, children, attr, psi116Index, locatePsi116, inputXmlIndex, xmlDiff,
  replaceSpans, escapeText, escapeAttr, decodeEntities, pathOf } from '../xmlspan.mjs';

const TRUTH = JSON.parse(readFileSync(new URL('./xml-truth.json', import.meta.url), 'utf8'));
const enc = new TextEncoder(), dec = new TextDecoder();
const load = async id => (await readBenchmark(id)).bytes;
const refused = async (fn, code) => {
  const r = await attempt(fn);
  assert.equal(r.ok, false, 'expected ' + code);
  assert.equal(r.refusals[0].code, code, JSON.stringify(r.refusals[0]));
};
const x = s => enc.encode(s);
const PSI = '<?xml version="1.0" encoding="utf-8"?>\n<PipeStressExport xmlns="http://aveva.com/pipeStress116.xsd">\n<Pipe><Branch><Branchname>/B1</Branchname>\n' +
  '<Node><NodeNumber>10</NodeNumber><ComponentRefNo>=1/2</ComponentRefNo><ComponentType>RIGID</ComponentType><Rigid>2</Rigid><Weight> 12.5 </Weight></Node>\n' +
  '<Node><NodeNumber>20</NodeNumber><ComponentRefNo>=1/3</ComponentRefNo><Weight>0</Weight></Node>\n</Branch></Pipe>\n</PipeStressExport>\n';

for (const [id, t] of Object.entries(TRUTH)) {
  test(`X1 ${id}: elements, leaf texts, attributes${t.psiRows ? ' and PSI116 rows' : ''} match Python ElementTree`, async () => {
    const doc = scanXml(await load(id));
    assert.equal(doc.root.local, t.root);
    assert.equal(doc.elements.length, t.elements);
    for (const [tag, n] of Object.entries(t.counts)) assert.equal(doc.elements.filter(e => e.local === tag).length, n, tag);
    const leaves = doc.elements.filter(e => !e.children.length).map(e => e.local + '\u0001' + text(doc, e).value.trim()).join('\n');
    assert.equal(await sha256Hex(leaves), t.leafDigest, 'leaf texts');
    const attrs = doc.elements.map(e => [e, e.attrs.filter(a => a.name !== 'xmlns' && !a.name.startsWith('xmlns:'))])
      .filter(([, a]) => a.length).map(([e, a]) => e.local + '\u0001' + a.map(v => v.local + '=' + v.value).join('\u0002')).join('\n');
    assert.equal(await sha256Hex(attrs), t.attrDigest, 'attributes');
    if (t.psiRows) {
      const { nodes } = psi116Index(doc);
      assert.equal(nodes.length, t.psiRows);
      const rows = nodes.map(n => [n.branchOrdinal, n.branchName, n.nodeOrdinal, n.nodeNumber, n.componentRefNo, n.componentType, n.rigid].join('|')).join('\n');
      assert.equal(await sha256Hex(rows), t.psiDigest, 'PSI116 rows (step-10 numbering)');
      assert.equal(nodes.filter(n => n.rigid === '2').length, t.rigid2);
    }
  });
}

test('X2 every leaf text and attribute span holds exactly its bytes (C-TRX, C-7X)', async () => {
  for (const id of ['C-TRX', 'C-7X']) {
    const doc = scanXml(await load(id));
    for (const e of doc.elements) {
      for (const a of e.attrs) assert.equal(dec.decode(doc.bytes.subarray(a.start, a.end)), a.raw);
      if (!e.children.length) { const s = text(doc, e); assert.equal(dec.decode(doc.bytes.subarray(s.start, s.end)), s.raw); }
    }
  }
});

test('X3 xmlDiff of a file with itself is empty (C-PSI)', async () => {
  const b = await load('C-PSI');
  assert.deepEqual(xmlDiff(scanXml(b), scanXml(b)), []);
});

test('X4 editing one PSI116 Weight changes exactly that value; length may change', async () => {
  const b = await load('C-R1X'), doc = scanXml(b), idx = psi116Index(doc);
  const row = idx.nodes.find(n => n.rigid === '2');
  const ref = { branchOrdinal: row.branchOrdinal, branchName: row.branchName, nodeOrdinal: row.nodeOrdinal, nodeNumber: row.nodeNumber, componentRefNo: row.componentRefNo };
  const { span } = locatePsi116(doc, idx, ref, 'Node/Weight');
  const out = replaceSpans(b, [{ start: span.start, end: span.end, newText: escapeText('1234.5678') }]);
  const after = scanXml(out), d = xmlDiff(doc, after);
  assert.equal(d.length, 1);
  assert.equal(d[0].kind, 'text');
  assert.match(d[0].path, /\/Node\[\d+\]\/Weight\[0\]$/);
  assert.equal(d[0].after.trim(), '1234.5678');
  const again = locatePsi116(after, psi116Index(after), ref, 'Weight').span;
  assert.equal(again.value, '1234.5678');
});

test('X5 editing one InputXML attribute changes exactly that attribute (C-BMX)', async () => {
  const b = await load('C-BMX'), doc = scanXml(b), el = inputXmlIndex(doc).elements[3];
  assert.equal(inputXmlIndex(doc).elements.length, 40);
  const a = el.attr('DIAMETER');
  const out = replaceSpans(b, [{ start: a.start, end: a.end, newText: escapeAttr('168.300000', a.quote) }]);
  const d = xmlDiff(doc, scanXml(out));
  assert.deepEqual(d.map(v => [v.kind, v.name, v.after]), [['attr', 'DIAMETER', '168.300000']]);
});

test('X6 re-check refuses XML_MARKUP_CHANGED and XML_STRUCTURE_CHANGED', async () => {
  const b = x(PSI), doc = scanXml(b);
  const markup = x(PSI.replace('<Pipe><Branch>', '<Pipe>\n<Branch>'));
  await refused(() => xmlDiff(doc, scanXml(markup)), 'XML_MARKUP_CHANGED');
  const inTag = x(PSI.replace('<Weight>0</Weight>', '<Weight >0</Weight>'));
  await refused(() => xmlDiff(doc, scanXml(inTag)), 'XML_MARKUP_CHANGED');
  const added = x(PSI.replace('<Weight>0</Weight>', '<Weight>0</Weight><Rigid>0</Rigid>'));
  await refused(() => xmlDiff(doc, scanXml(added)), 'XML_STRUCTURE_CHANGED');
});

test('X7 refusals for unsafe or malformed XML', async () => {
  const cases = [
    ['<!DOCTYPE a [<!ENTITY e "x">]><a/>', 'XML_DOCTYPE_REFUSED'],
    ['<?xml version="1.0" encoding="ISO-8859-1"?><a/>', 'XML_ENCODING_UNSUPPORTED'],
    ['<a>&foo;</a>', 'XML_ENTITY_UNKNOWN'],
    ['<a>fish & chips</a>', 'XML_ENTITY_UNKNOWN'],
    ['<a><b></a></b>', 'XML_TAG_MISMATCH'],
    ['<a><b></b>', 'XML_UNCLOSED'],
    ['<a x="1" x="2"/>', 'XML_DUPLICATE_ATTRIBUTE'],
    ['hello<a/>', 'XML_TEXT_OUTSIDE_ROOT'],
    ['<a/><b/>', 'XML_MULTIPLE_ROOTS'],
    ['<a x="1<2"/>', 'XML_TAG_INVALID'],
    ['<a x=1/>', 'XML_TAG_INVALID'],
    ['<a><!-- open </a>', 'XML_UNTERMINATED'],
    ['<!-- only a comment -->', 'XML_NO_ROOT'],
  ];
  for (const [src, code] of cases) await refused(() => scanXml(x(src)), code);
  await refused(() => scanXml(new Uint8Array([0x3c, 0x61, 0x3e, 0xff, 0x3c, 0x2f, 0x61, 0x3e])), 'XML_NOT_UTF8');
  await refused(() => scanXml(new Uint8Array()), 'XML_EMPTY');
  await refused(() => scanXml('<a/>'), 'XML_BYTES_REQUIRED');
  const doc = scanXml(x(PSI));
  await refused(() => text(doc, doc.root), 'XML_NOT_LEAF');
  await refused(() => text(scanXml(x('<a><![CDATA[1]]></a>')), scanXml(x('<a><![CDATA[1]]></a>')).root), 'XML_TEXT_CDATA');
  await refused(() => child(doc.root, 'Missing'), 'XML_CHILD_MISSING');
  await refused(() => child(doc.elements.find(e => e.local === 'Branch'), 'Node'), 'XML_CHILD_NOT_UNIQUE');
  await refused(() => inputXmlIndex(doc), 'XML_PROFILE_UNEXPECTED');
  const idx = psi116Index(doc);
  const ref = { branchOrdinal: 0, branchName: '/B1', nodeOrdinal: 0, nodeNumber: '10', componentRefNo: '=1/2' };
  await refused(() => locatePsi116(doc, idx, { ...ref, nodeNumber: '11' }, 'Weight'), 'XML_REF_MISMATCH');
  await refused(() => locatePsi116(doc, idx, { ...ref, nodeOrdinal: 5 }, 'Weight'), 'XML_REF_NOT_FOUND');
  await refused(() => replaceSpans(x(PSI), [{ start: 10, end: 20, newText: 'a' }, { start: 15, end: 25, newText: 'b' }]), 'XML_SPANS_OVERLAP');
});

test('X8 byte offsets survive the BOM, where JS string offsets drift (C-R1X)', async () => {
  const b = await load('C-R1X'), doc = scanXml(b);
  assert.equal(doc.bom, true);
  assert.equal(b[doc.root.start], 0x3c);
  const jsString = dec.decode(b); // TextDecoder strips the BOM by default
  assert.equal(jsString.indexOf('<PipeStressExport'), doc.root.start - 3);
});

test('X9 non-ASCII text before a value keeps byte spans exact', async () => {
  const src = PSI.replace('<Branchname>/B1</Branchname>', '<Branchname>/B1 Ø150 é</Branchname>');
  const doc = scanXml(x(src)), idx = psi116Index(doc);
  assert.equal(idx.nodes[0].branchName, '/B1 Ø150 é');
  const ref = { branchOrdinal: 0, branchName: '/B1 Ø150 é', nodeOrdinal: 1, nodeNumber: '20', componentRefNo: '=1/3' };
  const { span } = locatePsi116(doc, idx, ref, 'Weight');
  const out = replaceSpans(doc.bytes, [{ start: span.start, end: span.end, newText: '7.5' }]);
  assert.equal(dec.decode(out), src.replace('<Weight>0</Weight>', '<Weight>7.5</Weight>'));
});

test('X10 entities decode, and escaped edits round-trip; whitespace around a value is kept', async () => {
  assert.equal(decodeEntities('a &amp; b &lt;c&gt; &#65;&#x42; &quot;&apos;'), 'a & b <c> AB "\'');
  const doc = scanXml(x(PSI));
  const w = text(doc, child(psi116Index(doc).nodes[0].element, 'Weight'));
  assert.equal(w.value, '12.5');
  const out = replaceSpans(doc.bytes, [{ start: w.start, end: w.end, newText: escapeText('A&B') }]);
  assert.ok(dec.decode(out).includes('<Weight> A&amp;B </Weight>'));
  assert.equal(text(scanXml(out), child(psi116Index(scanXml(out)).nodes[0].element, 'Weight')).value, 'A&B');
});

test('X11 the scanner never changes the input bytes; pathOf names elements', async () => {
  const b = await load('C-R2X'), before = await sha256Hex(b);
  const doc = scanXml(b);
  assert.equal(await sha256Hex(b), before);
  assert.equal(pathOf(psi116Index(doc).nodes[0].element), 'PipeStressExport[0]/Pipe[0]/Branch[0]/Node[0]');
});

test('X12 speed: scanning C-PSI (643 KB, 19479 elements) takes under 1 s', async () => {
  const b = await load('C-PSI');
  const t = await timeMedian(() => scanXml(b));
  console.log('scanXml C-PSI median ms', t.ms);
  assert.ok(t.ms < 1000, t.ms + ' ms');
});
