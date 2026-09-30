import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import { buildXmlCiiModeBObservation } from '../converters/xml-cii2019-core/topology/xml-cii-mode-b-observation.js';
import { buildXmlCiiModeBComposite } from '../converters/xml-cii2019-core/topology/xml-cii-mode-b-composite.js';
import { buildXmlCiiModeBNumbering } from '../converters/xml-cii2019-core/topology/xml-cii-mode-b-numbering.js';

const corpus = new URL('../Benchmarks/XML-CII-2019/', import.meta.url);
const fixture = JSON.parse(await readFile(new URL('./fixtures/xml-cii-mode-b-numbering-v1.json', import.meta.url), 'utf8'));
const splitNames = ['SYS-6-S8810010-01.xml', 'SYS-6-S8810011-01.xml', 'SYS-S8811956-01.xml'];

async function buildRealNumbering() {
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
  const composite = buildXmlCiiModeBComposite(observation);
  return buildXmlCiiModeBNumbering(composite);
}

test('MODEB-03 numbering fingerprint and aggregate custody statistics are pinned', async () => {
  const numbering = await buildRealNumbering();
  assert.equal(numbering.schema, fixture.schema);
  assert.equal(numbering.sourceCompositeFingerprint, fixture.sourceCompositeFingerprint);
  assert.equal(numbering.fingerprint, fixture.fingerprint);
  assert.deepEqual(numbering.options, fixture.options);
  assert.deepEqual(numbering.stats, fixture.stats);
});

test('MODEB-03 accepted boundary orientation is pinned tail-to-head after topology completion', async () => {
  const numbering = await buildRealNumbering();
  assert.equal(numbering.orientedAcceptedCrossDocumentEdges.length, 1);
  const edge = numbering.orientedAcceptedCrossDocumentEdges[0];
  assert.equal(edge.candidateId, fixture.acceptedEdgeOrientation.candidateId);
  assert.equal(edge.from, fixture.acceptedEdgeOrientation.from);
  assert.equal(edge.to, fixture.acceptedEdgeOrientation.to);
  assert.equal(edge.orientation, fixture.acceptedEdgeOrientation.orientation);
});

test('MODEB-03 component cardinalities remain stable', async () => {
  const numbering = await buildRealNumbering();
  assert.deepEqual(numbering.components.map((row) => row.vertexCount), fixture.componentVertexCounts);
  assert.equal(numbering.components.reduce((sum, row) => sum + row.vertexCount, 0), fixture.stats.vertexCount);
});

test('MODEB-03 representative positive and sentinel mappings are pinned', async () => {
  const numbering = await buildRealNumbering();
  for (const expected of fixture.samples) {
    const row = numbering.rows.find((candidate) => candidate.sourceIdentity === expected.sourceIdentity);
    assert.ok(row, `missing pinned source identity ${expected.sourceIdentity}`);
    assert.equal(row.sourceNodeNumber, expected.sourceNodeNumber);
    assert.equal(row.outputNodeNumber, expected.outputNodeNumber);
    assert.equal(row.numberClass, expected.numberClass);
  }
});

test('MODEB-03 preserves a globally unique positive namespace and all source vertices', async () => {
  const numbering = await buildRealNumbering();
  const positive = numbering.rows.filter((row) => row.numberClass === 'POSITIVE_ENGINEERING');
  assert.equal(positive.length, fixture.stats.positiveNumberedVertexCount);
  assert.equal(new Set(positive.map((row) => row.outputNodeNumber)).size, positive.length);
  assert.equal(new Set(numbering.rows.map((row) => row.sourceIdentity)).size, fixture.stats.vertexCount);
  assert.equal(numbering.rows.filter((row) => row.numberClass === 'UNNUMBERED_SOURCE').length, 0);
});
