import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import { buildXmlCiiModeBObservation } from '../converters/xml-cii2019-core/topology/xml-cii-mode-b-observation.js';
import { buildXmlCiiModeBComposite } from '../converters/xml-cii2019-core/topology/xml-cii-mode-b-composite.js';
import { buildXmlCiiModeBNumbering } from '../converters/xml-cii2019-core/topology/xml-cii-mode-b-numbering.js';

function vertex({ id, doc = 'D', branch = '/B1', index = 0, node = '10', x = 0, ref = id, type = 'PIPE', endpoint = '0' }) {
  return {
    sourceIdentity: id,
    sourceDocumentId: doc,
    sourceFileName: `${doc}.xml`,
    documentRole: 'split-source',
    branchId: `${doc}::${branch}::1`,
    branchName: branch,
    branchOccurrence: 1,
    branchIndex: 0,
    nodeIndex: index,
    sourceNodeNumber: node,
    componentRefNo: ref,
    normalizedComponentRefNo: ref,
    endpoint,
    componentType: type,
    connectionType: '',
    position: `${x} 0 0`,
    point: { x, y: 0, z: 0 },
  };
}

function sourceEdge(from, to) {
  return {
    edgeId: `S:${from.sourceIdentity}=>${to.sourceIdentity}`,
    edgeType: 'SOURCE_ROUTE',
    authority: 'SOURCE_DOCUMENT',
    fromSourceIdentity: from.sourceIdentity,
    toSourceIdentity: to.sourceIdentity,
  };
}

function acceptedEdge(a, b, id = 'AB') {
  return {
    edgeId: `MODEB:${id}`,
    edgeType: 'CROSS_DOCUMENT_JOIN',
    authority: 'MODEB_EVALUATED',
    sourceA: a.sourceIdentity,
    sourceB: b.sourceIdentity,
    candidateId: id,
    score: 10,
  };
}

function composite({ vertices, sourceEdges = [], accepted = [], coincidentGroups = [] }) {
  return {
    schema: 'xml-cii-mode-b-composite/v1',
    fingerprint: 'fnv1a32:synthetic',
    vertices,
    sourceEdges,
    acceptedCrossDocumentEdges: accepted,
    coincidentGroups,
  };
}

function positiveMap(numbering) {
  return Object.fromEntries(numbering.rows
    .filter((row) => row.numberClass === 'POSITIVE_ENGINEERING')
    .map((row) => [row.sourceIdentity, row.outputNodeNumber]));
}

test('MODEB-03 replaces duplicate positive source NodeNumbers with one unique graph-derived namespace', () => {
  const a = vertex({ id: 'A', doc: 'A', node: '10', x: 0 });
  const b = vertex({ id: 'B', doc: 'B', node: '10', x: 100 });
  const result = buildXmlCiiModeBNumbering(composite({ vertices: [b, a] }));
  assert.equal(result.rows.length, 2);
  assert.deepEqual([...new Set(result.rows.map((row) => row.outputNodeNumber))].sort((x, y) => x - y), [10, 20]);
  assert.notEqual(result.rows.find((row) => row.sourceIdentity === 'A').outputNodeNumber, result.rows.find((row) => row.sourceIdentity === 'B').outputNodeNumber);
  assert.ok(result.rows.every((row) => row.sourceNodeNumber === '10'), 'source engineering labels must remain immutable provenance');
});

test('MODEB-03 preserves non-positive helper/sentinel NodeNumbers and does not consume positive sequence slots', () => {
  const a = vertex({ id: 'A', index: 0, node: '10', x: 0 });
  const helper = vertex({ id: 'H', index: 1, node: '-1', x: 10, type: 'ELBO', endpoint: '1' });
  const b = vertex({ id: 'B', index: 2, node: '20', x: 20 });
  const result = buildXmlCiiModeBNumbering(composite({
    vertices: [a, helper, b],
    sourceEdges: [sourceEdge(a, helper), sourceEdge(helper, b)],
  }));
  assert.equal(result.rows.find((row) => row.sourceIdentity === 'A').outputNodeNumber, 10);
  assert.equal(result.rows.find((row) => row.sourceIdentity === 'H').outputNodeNumber, -1);
  assert.equal(result.rows.find((row) => row.sourceIdentity === 'H').numberingAuthority, 'SOURCE_SENTINEL_PRESERVED');
  assert.equal(result.rows.find((row) => row.sourceIdentity === 'B').outputNodeNumber, 20);
  assert.equal(result.stats.nonPositiveSentinelCount, 1);
});

test('MODEB-03 traverses an accepted tail-to-head join without using file offsets', () => {
  const a1 = vertex({ id: 'A1', doc: 'A', index: 0, node: '100', x: 0 });
  const a2 = vertex({ id: 'A2', doc: 'A', index: 1, node: '200', x: 10 });
  const b1 = vertex({ id: 'B1', doc: 'B', index: 0, node: '100', x: 10 });
  const b2 = vertex({ id: 'B2', doc: 'B', index: 1, node: '200', x: 20 });
  const result = buildXmlCiiModeBNumbering(composite({
    vertices: [b2, a2, b1, a1],
    sourceEdges: [sourceEdge(b1, b2), sourceEdge(a1, a2)],
    accepted: [acceptedEdge(a2, b1)],
  }));
  assert.equal(result.stats.componentCount, 1);
  assert.equal(result.orientedAcceptedCrossDocumentEdges[0].orientation, 'TAIL_TO_HEAD');
  assert.deepEqual(positiveMap(result), { A1: 10, A2: 20, B1: 30, B2: 40 });
});

test('MODEB-03 mapping is stable when vertex, source-edge and accepted-edge arrays are reordered', () => {
  const a1 = vertex({ id: 'A1', doc: 'A', index: 0, node: '10', x: 0 });
  const a2 = vertex({ id: 'A2', doc: 'A', index: 1, node: '20', x: 10 });
  const b1 = vertex({ id: 'B1', doc: 'B', index: 0, node: '10', x: 10 });
  const b2 = vertex({ id: 'B2', doc: 'B', index: 1, node: '20', x: 20 });
  const edges = [sourceEdge(a1, a2), sourceEdge(b1, b2)];
  const joins = [acceptedEdge(a2, b1)];
  const first = buildXmlCiiModeBNumbering(composite({ vertices: [a1, a2, b1, b2], sourceEdges: edges, accepted: joins }));
  const second = buildXmlCiiModeBNumbering(composite({ vertices: [b2, b1, a2, a1], sourceEdges: [...edges].reverse(), accepted: [...joins].reverse() }));
  assert.deepEqual(positiveMap(second), positiveMap(first));
  assert.deepEqual(
    second.rows.map((row) => [row.sourceIdentity, row.outputNodeNumber]).sort(),
    first.rows.map((row) => [row.sourceIdentity, row.outputNodeNumber]).sort(),
  );
});

test('MODEB-03 preserves coincident positive identities as distinct numbered rows', () => {
  const a = vertex({ id: 'A', doc: 'A', node: '10', x: 0, ref: 'REF-A' });
  const b = vertex({ id: 'B', doc: 'A', node: '20', x: 0, ref: 'REF-B' });
  const result = buildXmlCiiModeBNumbering(composite({ vertices: [a, b], sourceEdges: [sourceEdge(a, b)] }));
  assert.equal(result.rows.length, 2);
  assert.equal(new Set(result.rows.map((row) => row.sourceIdentity)).size, 2);
  assert.equal(new Set(result.rows.map((row) => row.outputNodeNumber)).size, 2);
});

test('MODEB-03 fails closed on invalid graph custody or numbering configuration', () => {
  const a = vertex({ id: 'A' });
  assert.throws(() => buildXmlCiiModeBNumbering({ schema: 'wrong' }), /Unsupported Mode B composite schema/);
  assert.throws(() => buildXmlCiiModeBNumbering(composite({ vertices: [a, { ...a }] })), /Duplicate Mode B sourceIdentity/);
  assert.throws(() => buildXmlCiiModeBNumbering(composite({ vertices: [a], sourceEdges: [{ fromSourceIdentity: 'A', toSourceIdentity: 'MISSING' }] })), /references missing vertex/);
  assert.throws(() => buildXmlCiiModeBNumbering(composite({ vertices: [a] }), { start: 0 }), /start must be a positive/);
  assert.throws(() => buildXmlCiiModeBNumbering(composite({ vertices: [a] }), { step: -10 }), /step must be a positive/);
});

const corpus = new URL('../Benchmarks/XML-CII-2019/', import.meta.url);
const splitNames = ['SYS-6-S8810010-01.xml', 'SYS-6-S8810011-01.xml', 'SYS-S8811956-01.xml'];

async function realNumbering() {
  const splitDocuments = await Promise.all(splitNames.map(async (fileName, index) => ({
    fileName,
    documentId: `split-${index + 1}-${fileName}`,
    xmlText: await readFile(new URL(fileName, corpus), 'utf8'),
  })));
  const combinedReference = {
    fileName: 'SYS-001_Single.xml',
    documentId: 'combined-SYS-001_Single.xml',
    xmlText: await readFile(new URL('SYS-001_Single.xml', corpus), 'utf8'),
  };
  const observation = buildXmlCiiModeBObservation({ splitDocuments, combinedReference }, {
    positionToleranceMm: 0.001,
    diameterToleranceMm: 0.1,
    witnessSegmentCount: 10,
  });
  const graph = buildXmlCiiModeBComposite(observation);
  const numbering = buildXmlCiiModeBNumbering(graph);
  return { observation, graph, numbering };
}

test('MODEB-03 numbers the frozen real composite without modifying topology authority', async () => {
  const first = await realNumbering();
  const second = await realNumbering();
  assert.deepEqual(second.numbering, first.numbering);
  const { graph, numbering } = first;
  assert.equal(graph.fingerprint, 'fnv1a32:d5104931');
  assert.equal(numbering.schema, 'xml-cii-mode-b-numbering/v1');
  assert.equal(numbering.sourceCompositeFingerprint, graph.fingerprint);
  assert.equal(numbering.stats.vertexCount, 452);
  assert.equal(numbering.stats.componentCount, 6);
  assert.equal(numbering.stats.acceptedCrossDocumentEdgeCount, 1);
  assert.equal(numbering.rows.length, graph.vertices.length);
  assert.equal(new Set(numbering.rows.map((row) => row.sourceIdentity)).size, graph.vertices.length);

  const positiveRows = numbering.rows.filter((row) => row.numberClass === 'POSITIVE_ENGINEERING');
  assert.ok(positiveRows.length > 0);
  assert.equal(new Set(positiveRows.map((row) => row.outputNodeNumber)).size, positiveRows.length, 'all positive output NodeNumbers must be globally unique');
  assert.ok(positiveRows.every((row) => row.outputNodeNumber > 0 && row.outputNodeNumber % 10 === 0));

  const sourcePositive = graph.vertices.filter((row) => Number(row.sourceNodeNumber) > 0);
  const collisions = new Map();
  for (const row of sourcePositive) {
    const key = String(row.sourceNodeNumber);
    if (!collisions.has(key)) collisions.set(key, []);
    collisions.get(key).push(row.sourceIdentity);
  }
  assert.ok([...collisions.values()].some((rows) => rows.length > 1), 'real source must retain duplicate positive engineering NodeNumbers');
  for (const rows of collisions.values()) {
    if (rows.length < 2) continue;
    const outputs = rows.map((identity) => numbering.rows.find((row) => row.sourceIdentity === identity)?.outputNodeNumber);
    assert.equal(new Set(outputs).size, outputs.length, 'source NodeNumber collisions must be resolved without identity loss');
  }

  const sentinels = numbering.rows.filter((row) => row.numberClass === 'NONPOSITIVE_SENTINEL');
  assert.ok(sentinels.length > 0);
  assert.ok(sentinels.every((row) => row.outputNodeNumber === Number(row.sourceNodeNumber)));
  assert.equal(numbering.stats.canonicalFallbackOrientationCount, 0, 'the accepted real boundary should orient uniquely tail-to-head');
  assert.equal(numbering.orientedAcceptedCrossDocumentEdges[0].orientation, 'TAIL_TO_HEAD');

  assert.equal(graph.acceptedCrossDocumentEdges.length, 1);
  assert.equal(graph.candidateDecisions.filter((row) => row.state === 'ACCEPTED').length, 1);
  assert.equal(graph.candidateDecisions.filter((row) => row.state === 'INSUFFICIENT_EVIDENCE').length, 2);

  console.log('MODEB-03 real numbering summary', JSON.stringify({
    fingerprint: numbering.fingerprint,
    stats: numbering.stats,
    firstRows: numbering.rows.slice(0, 8).map((row) => ({ sourceIdentity: row.sourceIdentity, sourceNodeNumber: row.sourceNodeNumber, outputNodeNumber: row.outputNodeNumber })),
    lastRows: numbering.rows.slice(-8).map((row) => ({ sourceIdentity: row.sourceIdentity, sourceNodeNumber: row.sourceNodeNumber, outputNodeNumber: row.outputNodeNumber })),
  }, null, 2));
});

test('MODEB-03 runtime/docs numbering core remains byte-identical', async () => {
  const runtime = await readFile(new URL('../converters/xml-cii2019-core/topology/xml-cii-mode-b-numbering.js', import.meta.url), 'utf8');
  const docs = await readFile(new URL('../docs/converters/xml-cii2019-core/topology/xml-cii-mode-b-numbering.js', import.meta.url), 'utf8');
  assert.equal(docs, runtime);
});
