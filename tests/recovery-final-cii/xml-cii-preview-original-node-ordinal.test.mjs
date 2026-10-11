import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  captureXmlCiiOriginalNodeOrdinals,
} from '../../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-dryrun-core.js';

const child = (localName) => ({ nodeType: 1, localName, childNodes: [] });
const sourceNode = ({ kind = '', nodeNumber = '-1', length = '' } = {}) =>
  Object.assign(child('Node'), { kind, nodeNumber, length });
const branch = (nodes, name) => Object.assign(child('Branch'), { childNodes: nodes, name });
const documentOf = (branches) => ({
  getElementsByTagName(name) { return name === 'Branch' ? branches : []; },
});

test('S: original ordinal survives GASK and short-element filtering with repeated -1 and duplicate branch names', () => {
  const first = [
    sourceNode({ kind: 'VALV', nodeNumber: '-1' }),
    sourceNode({ kind: 'GASK', nodeNumber: '-1' }),
    sourceNode({ kind: 'FLAN', nodeNumber: '-1' }),
    sourceNode({ kind: 'PIPE', length: '3' }),
    sourceNode({ kind: 'VALV', nodeNumber: '-1' }),
  ];
  const second = [
    sourceNode({ kind: 'GASK', nodeNumber: '-1' }),
    sourceNode({ kind: 'INST', nodeNumber: '-1' }),
  ];
  const branches = [branch(first, '/SAME-BRANCH'), branch(second, '/SAME-BRANCH')];
  const original = captureXmlCiiOriginalNodeOrdinals(documentOf(branches));
  const filtered = (nodes) => nodes.filter((node) =>
    node.kind !== 'GASK' && !(node.length && Number(node.length) <= 6));
  assert.deepEqual(filtered(first).map((node) => original.get(node)), [0, 2, 4]);
  assert.deepEqual(filtered(second).map((node) => original.get(node)), [1]);
  assert.equal(first[0].nodeNumber, first[2].nodeNumber);
  assert.equal(first[0].nodeNumber, first[4].nodeNumber);
  assert.equal(original.get(first[2]), 2);
  assert.equal(original.get(second[1]), 1);
  assert.equal(first[0].nodeNumber, '-1');
});

test('S: authentic Firstpass 216 original XML nodes preserve exact source ordinals after 22 GASK removals', async () => {
  const source = await readFile(new URL('../../Benchmarks/1885Sjson/FirstpassXML', import.meta.url), 'utf8');
  const blocks = [...source.matchAll(/<Branch(?:\s[^>]*)?>([\s\S]*?)<\/Branch>/g)];
  const get = (xml, tag) => xml.match(new RegExp('<' + tag + '>([\\s\\S]*?)</' + tag + '>'))?.[1]?.trim() || '';
  const branches = blocks.map(([, xml]) => branch(
    [...xml.matchAll(/<Node(?:\s[^>]*)?>([\s\S]*?)<\/Node>/g)]
      .map(([, data]) => sourceNode({
        kind: get(data, 'ComponentType'),
        nodeNumber: get(data, 'NodeNumber'),
        length: get(data, 'ElementLengthMm'),
      })),
    get(xml, 'Branchname'),
  ));
  const nodeCount = branches.reduce((n, b) => n + b.childNodes.length, 0);
  assert.equal(branches.length, 5);
  assert.equal(nodeCount, 216);
  const original = captureXmlCiiOriginalNodeOrdinals(documentOf(branches));
  let removed = 0;
  for (const b of branches) {
    const survivors = b.childNodes.filter((node) => {
      const drop = node.kind === 'GASK' ||
        (node.length !== '' && Number(node.length) <= 6);
      if (drop) removed += 1;
      return !drop;
    });
    for (let position = 0; position < survivors.length; position++) {
      const originalOrdinal = original.get(survivors[position]);
      assert.ok(Number.isSafeInteger(originalOrdinal));
      assert.equal(b.childNodes[originalOrdinal], survivors[position]);
    }
  }
  assert.equal(removed, 22);
  const originalValve = branches[0].childNodes[14];
  const afterFilter = branches[0].childNodes.filter((node) => node.kind !== 'GASK');
  assert.equal(branches[0].childNodes[13].kind, 'GASK');
  assert.equal(originalValve.kind, 'VALV');
  assert.equal(originalValve.nodeNumber, '160');
  assert.equal(afterFilter[13], originalValve);
  assert.equal(original.get(originalValve), 14, 'source ordinal must not become filtered ordinal 13');
});

test('S: real Preview core forwards captured original ordinal to authority and weight key', async () => {
  const source = await readFile(
    new URL('../../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-dryrun-core.js', import.meta.url),
    'utf8',
  );
  assert.match(source, /const originalNodeOrdinals = captureXmlCiiOriginalNodeOrdinals\(document\)/);
  assert.match(source, /const originalNodeOrdinal = originalNodeOrdinals\.get\(node\)/);
  assert.match(source, /nodeOrdinal: originalNodeOrdinal/);
  assert.match(source, /xmlCiiWeightReviewNodeOverrideKey\(branchName, node, originalNodeOrdinal\)/);
  assert.doesNotMatch(source, /nodeOrdinal: nodeIdx/);
});
