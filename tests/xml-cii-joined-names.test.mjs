// E2c step 2 (Owner 20 Nov 2026, "Write | in output"; "Read it as history"): the "|" names the UXML route lists are
// written into step 10's Enriched XML only, on the node found once by branch, node number and plain name.
import assert from 'node:assert/strict';
import test from 'node:test';
import { firstNameParts, writeJoinedNames } from '../v045/tabs/xml-cii-2019-standalone/xml-cii-joined-names.js';

const node = (n, name, ref) => `<Node><NodeNumber>${n}</NodeNumber><NodeName>${name}</NodeName><ComponentRefNo>${ref}</ComponentRefNo></Node>`;
const xml = `<PipeStressExport><Pipe><Branch><Branchname>/B1</Branchname>${node(20, 'N20', '=1/20')}${node(40, 'N40', '=1/40')}</Branch>`
  + `<Branch><Branchname>/B2</Branchname>${node(20, 'N20', '=1/20')}</Branch></Pipe></PipeStressExport>`;

test('a joined node and a node with only earlier history get their "|" names; nothing else changes', () => {
  const names = [
    { branch: '/B1', nodeNumber: '20', NodeName: ['N20', 'N10', 'OLD'], ComponentRefNo: ['=1/20', '=1/10', '=1/OLD'], written: ['NodeName', 'ComponentRefNo'] },
    { branch: '/B1', nodeNumber: '40', NodeName: ['N40', 'P&Q'], ComponentRefNo: ['=1/40'], written: ['NodeName'] },
  ];
  const got = writeJoinedNames(xml, names);
  assert.equal(got.ok, true);
  assert.equal(got.written, 2);
  const want = xml.replace(node(20, 'N20', '=1/20'), node(20, 'N20|N10|OLD', '=1/20|=1/10|=1/OLD'))
    .replace(node(40, 'N40', '=1/40'), node(40, 'N40|P&amp;Q', '=1/40'));
  assert.equal(got.xmlText, want, 'branch /B2 node 20 (same number and name) is left alone');
});

test('a node not found exactly once writes nothing and says why', () => {
  const got = writeJoinedNames(xml, [{ branch: '/B1', nodeNumber: '20', NodeName: ['OTHER', 'X'], ComponentRefNo: ['=1/20'], written: ['NodeName'] }]);
  assert.equal(got.ok, false);
  assert.equal(got.xmlText, xml);
  assert.match(got.message, /\/B1 node 20 was found 0 time\(s\)/);
});

test('PR 436 review B1/B2/N3: an escaped kept name is found; "$" patterns are written as they are; <ComponentRefNo/> is empty', () => {
  const text = `<PipeStressExport><Pipe><Branch><Branchname>/B&amp;1</Branchname>${node(20, ' K&amp;L ', '=1/20')}`
    + `<Node><NodeNumber>30</NodeNumber><NodeName>N30</NodeName><ComponentRefNo/></Node></Branch></Pipe></PipeStressExport>`;
  const got = writeJoinedNames(text, [
    { branch: '/B&1', nodeNumber: '20', NodeName: ['K&L', 'X$&Y', 'A$$B'], ComponentRefNo: ['=1/20'], written: ['NodeName'] },
    { branch: '/B&1', nodeNumber: '30', NodeName: ['N30', 'M'], ComponentRefNo: [''], written: ['NodeName'] },
  ]);
  assert.equal(got.ok, true, got.message);
  assert.match(got.xmlText, /<NodeName>K&amp;L\|X\$&amp;Y\|A\$\$B<\/NodeName><ComponentRefNo>=1\/20<\/ComponentRefNo>/);
  assert.match(got.xmlText, /<NodeName>N30\|M<\/NodeName><ComponentRefNo\/>/);
});

test('PR 436 review B3: without the document route the "|" history is cut to its first part', () => {
  const got = firstNameParts(xml.replace('<NodeName>N40</NodeName>', '<NodeName>N40|OLD</NodeName>').replace('=1/40<', '=1/40|=1/X<'));
  assert.equal(got.cut, 2);
  assert.equal(got.xmlText, xml);
});

test('PR 436 review B4: a "|" name the transfer note protects is left as the transfer set it, and counted', () => {
  const text = xml.replace('<NodeName>N40</NodeName>', '<NodeName>N40|P</NodeName>').replace('=1/40<', '=1/40|=1/X<');
  const got = firstNameParts(text, { '/B1|40': ['NodeName'] });
  assert.deepEqual([got.cut, got.locked], [1, 1]);
  assert.equal(got.xmlText, xml.replace('<NodeName>N40</NodeName>', '<NodeName>N40|P</NodeName>'));
  assert.equal(firstNameParts(text, { '/B2|40': ['NodeName'] }).cut, 2, 'another branch is not protected');
});
