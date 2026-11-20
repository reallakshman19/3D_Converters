// E2c step 2 (Owner 20 Nov 2026, "Write | in output"; "Read it as history"): the "|" names the UXML route lists are
// written into step 10's Enriched XML only, on the node found once by branch, node number and plain name.
import assert from 'node:assert/strict';
import test from 'node:test';
import { writeJoinedNames } from '../v045/tabs/xml-cii-2019-standalone/xml-cii-joined-names.js';

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
