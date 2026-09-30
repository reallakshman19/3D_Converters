import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import { buildXmlCiiModeBObservation } from '../converters/xml-cii2019-core/topology/xml-cii-mode-b-observation.js';
import { buildXmlCiiModeBComposite } from '../converters/xml-cii2019-core/topology/xml-cii-mode-b-composite.js';

function splitNode({ id, doc, point, previous = '', next = '', componentType = 'PIPE', role = 'geometry-node' }) {
  return {
    sourceIdentity: id,
    sourceDocumentId: doc,
    sourceFileName: `${doc}.xml`,
    documentRole: 'split-source',
    branchId: `${doc}::/B1::1`,
    branchName: '/B1',
    branchOccurrence: 1,
    branchIndex: 0,
    nodeIndex: 0,
    sourceNodeNumber: id,
    componentRefNo: id,
    normalizedComponentRefNo: id,
    endpoint: '1',
    componentType,
    connectionType: '',
    position: `${point.x} ${point.y} ${point.z}`,
    point,
    positionKey: `${point.x}|${point.y}|${point.z}`,
    outsideDiameter: 100,
    bore: null,
    restraints: [],
    hasRestraint: false,
    role,
    previousSourceIdentity: previous,
    nextSourceIdentity: next,
  };
}

function candidate({ id, a, b, evidence = {}, evidenceClass = 'CORROBORATED', disposition = 'AMBIGUOUS_CANDIDATE_OBSERVATION' }) {
  return {
    candidateId: id,
    sourceA: a,
    sourceB: b,
    documentA: a.split(':')[0],
    documentB: b.split(':')[0],
    distanceMm: 0,
    evidence: {
      componentRefMatch: false,
      endpointMatch: false,
      componentTypeMatch: false,
      connectionTypeMatch: false,
      outsideDiameterCompatibility: 'UNKNOWN',
      boreCompatibility: 'UNKNOWN',
      teeInvolved: false,
      restraintInvolved: false,
      corroborationCount: 0,
      ...evidence,
    },
    evidenceClass,
    authority: 'OBSERVATION_ONLY',
    observationDisposition: disposition,
  };
}

function syntheticObservation({ nodes, candidates, segments = [], coincidentGroups = [] }) {
  return {
    schema: 'xml-cii-mode-b-observation/v1',
    authority: 'READ_ONLY_OBSERVATION',
    fingerprint: 'fnv1a32:synthetic',
    options: { positionToleranceMm: 0.001 },
    nodes,
    branchSegments: segments,
    samePositionClusters: coincidentGroups,
    boundaryCandidates: candidates,
  };
}

function opposedTriplet() {
  const aPrev = splitNode({ id: 'A:PREV', doc: 'A', point: { x: -10, y: 0, z: 0 }, next: 'A:0' });
  const a = splitNode({ id: 'A:0', doc: 'A', point: { x: 0, y: 0, z: 0 }, previous: 'A:PREV' });
  const b = splitNode({ id: 'B:0', doc: 'B', point: { x: 0, y: 0, z: 0 }, next: 'B:NEXT' });
  const bNext = splitNode({ id: 'B:NEXT', doc: 'B', point: { x: 10, y: 0, z: 0 }, previous: 'B:0' });
  const c = splitNode({ id: 'C:0', doc: 'C', point: { x: 0, y: 0, z: 0 }, next: 'C:NEXT' });
  const cNext = splitNode({ id: 'C:NEXT', doc: 'C', point: { x: 10, y: 0, z: 0 }, previous: 'C:0' });
  return { aPrev, a, b, bNext, c, cNext };
}

test('MODEB-02 accepts a decisive multi-signal winner and rejects the dominated alternative', () => {
  const { aPrev, a, b, bNext, c, cNext } = opposedTriplet();
  const strong = candidate({
    id: 'A-B', a: a.sourceIdentity, b: b.sourceIdentity,
    evidence: {
      componentRefMatch: true,
      componentTypeMatch: true,
      connectionTypeMatch: true,
      outsideDiameterCompatibility: 'MATCH',
      corroborationCount: 4,
    },
  });
  const weaker = candidate({
    id: 'A-C', a: a.sourceIdentity, b: c.sourceIdentity,
    evidence: {
      componentTypeMatch: true,
      connectionTypeMatch: true,
      outsideDiameterCompatibility: 'MATCH',
      corroborationCount: 3,
    },
  });
  const observation = syntheticObservation({
    nodes: [aPrev, a, b, bNext, c, cNext],
    candidates: [strong, weaker],
    segments: [
      { fromSourceIdentity: aPrev.sourceIdentity, toSourceIdentity: a.sourceIdentity },
      { fromSourceIdentity: b.sourceIdentity, toSourceIdentity: bNext.sourceIdentity },
      { fromSourceIdentity: c.sourceIdentity, toSourceIdentity: cNext.sourceIdentity },
    ],
  });
  const composite = buildXmlCiiModeBComposite(observation);
  assert.equal(composite.acceptedCrossDocumentEdges.length, 1);
  assert.equal(composite.acceptedCrossDocumentEdges[0].candidateId, 'A-B');
  const loser = composite.candidateDecisions.find((row) => row.candidateId === 'A-C');
  assert.equal(loser.state, 'REJECTED');
  assert.equal(loser.acceptedCompetitorId, 'A-B');
  assert.match(loser.reason, /dominated by accepted candidate A-B/);
  assert.ok(composite.connectedComponents.some((row) => row.sourceDocumentCount === 2));
});

test('MODEB-02 fails closed when two eligible candidates tie for one endpoint', () => {
  const { aPrev, a, b, bNext, c, cNext } = opposedTriplet();
  const evidence = {
    componentTypeMatch: true,
    connectionTypeMatch: true,
    outsideDiameterCompatibility: 'MATCH',
    corroborationCount: 3,
  };
  const observation = syntheticObservation({
    nodes: [aPrev, a, b, bNext, c, cNext],
    candidates: [
      candidate({ id: 'A-B', a: a.sourceIdentity, b: b.sourceIdentity, evidence }),
      candidate({ id: 'A-C', a: a.sourceIdentity, b: c.sourceIdentity, evidence }),
    ],
  });
  const composite = buildXmlCiiModeBComposite(observation);
  assert.equal(composite.acceptedCrossDocumentEdges.length, 0);
  assert.equal(composite.ambiguousCandidates.length, 2);
  assert.deepEqual(composite.ambiguousCandidates.map((row) => row.candidateId).sort(), ['A-B', 'A-C']);
});

test('MODEB-02 rejects TEE joins without identity or opposed-route corroboration', () => {
  const tee = splitNode({ id: 'A:TEE', doc: 'A', point: { x: 0, y: 0, z: 0 }, componentType: 'TEE', role: 'tee' });
  const other = splitNode({ id: 'B:PIPE', doc: 'B', point: { x: 0, y: 0, z: 0 } });
  const observation = syntheticObservation({
    nodes: [tee, other],
    candidates: [candidate({
      id: 'TEE-POS', a: tee.sourceIdentity, b: other.sourceIdentity,
      evidenceClass: 'POSITION_ONLY',
      evidence: { outsideDiameterCompatibility: 'MATCH', teeInvolved: true, corroborationCount: 1 },
    })],
  });
  const composite = buildXmlCiiModeBComposite(observation);
  assert.equal(composite.acceptedCrossDocumentEdges.length, 0);
  assert.equal(composite.rejectedCandidates.length, 1);
  assert.match(composite.rejectedCandidates[0].reason, /tee-without-identity-or-route-corroboration/);
});

test('MODEB-02 rejects geometry conflicts even when other evidence is strong', () => {
  const a = splitNode({ id: 'A:0', doc: 'A', point: { x: 0, y: 0, z: 0 } });
  const b = splitNode({ id: 'B:0', doc: 'B', point: { x: 0, y: 0, z: 0 } });
  const observation = syntheticObservation({
    nodes: [a, b],
    candidates: [candidate({
      id: 'OD-CONFLICT', a: a.sourceIdentity, b: b.sourceIdentity,
      evidence: {
        componentRefMatch: true,
        componentTypeMatch: true,
        connectionTypeMatch: true,
        outsideDiameterCompatibility: 'CONFLICT',
        corroborationCount: 3,
      },
    })],
  });
  const composite = buildXmlCiiModeBComposite(observation);
  assert.equal(composite.acceptedCrossDocumentEdges.length, 0);
  assert.equal(composite.rejectedCandidates.length, 1);
  assert.match(composite.rejectedCandidates[0].reason, /outside-diameter-conflict/);
});

test('MODEB-02 retains coincident source vertices instead of position-collapsing them', () => {
  const a = splitNode({ id: 'A:1', doc: 'A', point: { x: 0, y: 0, z: 0 } });
  const b = splitNode({ id: 'A:2', doc: 'A', point: { x: 0, y: 0, z: 0 } });
  const observation = syntheticObservation({
    nodes: [a, b],
    candidates: [],
    coincidentGroups: [{ positionKey: '0|0|0', nodeCount: 2, sourceIdentities: [a.sourceIdentity, b.sourceIdentity] }],
  });
  const composite = buildXmlCiiModeBComposite(observation);
  assert.equal(composite.vertices.length, 2);
  assert.equal(new Set(composite.vertices.map((row) => row.sourceIdentity)).size, 2);
  assert.equal(composite.coincidentGroups.length, 1);
});

test('MODEB-02 rejects unsupported observation schema and emits no output numbering', () => {
  assert.throws(() => buildXmlCiiModeBComposite({ schema: 'wrong' }), /Unsupported Mode B observation schema/);
  const observation = syntheticObservation({ nodes: [], candidates: [] });
  const composite = buildXmlCiiModeBComposite(observation);
  const encoded = JSON.stringify(composite);
  assert.equal(encoded.includes('compositeNodeNumber'), false);
  assert.equal(encoded.includes('outputNodeNumber'), false);
  assert.match(composite.diagnostics.map((row) => row.message).join(' '), /Node Numbers are intentionally absent/);
});

const corpus = new URL('../Benchmarks/XML-CII-2019/', import.meta.url);
const splitNames = ['SYS-6-S8810010-01.xml', 'SYS-6-S8810011-01.xml', 'SYS-S8811956-01.xml'];

async function realComposite() {
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
  return { observation, composite: buildXmlCiiModeBComposite(observation) };
}

test('MODEB-02 evaluates the real benchmark observation without losing source custody', async () => {
  const first = await realComposite();
  const second = await realComposite();
  assert.deepEqual(second.composite, first.composite, 'real composite evaluation must be deterministic');
  const { observation, composite } = first;
  assert.equal(composite.schema, 'xml-cii-mode-b-composite/v1');
  assert.equal(composite.sourceObservationFingerprint, observation.fingerprint);
  assert.equal(composite.stats.vertexCount, 452);
  assert.equal(composite.stats.sourceEdgeCount, 445);
  assert.equal(composite.stats.observedCandidateCount, 3);
  assert.equal(composite.coincidentGroups.length, 120);
  assert.equal(composite.stats.acceptedCrossDocumentEdgeCount <= 1, true, 'the real three-candidate corpus must not accept competing joins for the same endpoint');
  for (const accepted of composite.candidateDecisions.filter((row) => row.state === 'ACCEPTED')) {
    assert.notEqual(accepted.originalEvidenceClass, 'POSITION_ONLY', 'position-only evidence must never become accepted topology authority');
    assert.ok(accepted.score >= composite.options.acceptanceScore);
    assert.equal(accepted.hardConflicts.length, 0);
  }
  assert.equal(new Set(composite.vertices.map((row) => row.sourceIdentity)).size, 452, 'duplicate Node Numbers and same-POS rows must remain separate vertices');
  assert.equal(JSON.stringify(composite).includes('outputNodeNumber'), false);
  console.log('MODEB-02 real-corpus summary', JSON.stringify({
    fingerprint: composite.fingerprint,
    accepted: composite.candidateDecisions.filter((row) => row.state === 'ACCEPTED').map((row) => ({ id: row.candidateId, score: row.score, route: row.routeContext?.compatibility?.status })),
    ambiguous: composite.ambiguousCandidates.map((row) => ({ id: row.candidateId, score: row.score, route: row.routeContext?.compatibility?.status })),
    rejected: composite.rejectedCandidates.map((row) => ({ id: row.candidateId, score: row.score, reason: row.reason })),
    insufficient: composite.insufficientEvidenceCandidates.map((row) => ({ id: row.candidateId, score: row.score, route: row.routeContext?.compatibility?.status })),
    connectedComponents: composite.stats.connectedComponentCount,
  }, null, 2));
});

test('MODEB-02 runtime/docs core remains byte-identical', async () => {
  const runtime = await readFile(new URL('../converters/xml-cii2019-core/topology/xml-cii-mode-b-composite.js', import.meta.url), 'utf8');
  const docs = await readFile(new URL('../docs/converters/xml-cii2019-core/topology/xml-cii-mode-b-composite.js', import.meta.url), 'utf8');
  assert.equal(docs, runtime);
});
