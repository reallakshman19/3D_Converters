import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import { buildXmlCiiModeBObservation } from '../converters/xml-cii2019-core/topology/xml-cii-mode-b-observation.js';
import { buildXmlCiiModeBComposite } from '../converters/xml-cii2019-core/topology/xml-cii-mode-b-composite.js';

const corpus = new URL('../Benchmarks/XML-CII-2019/', import.meta.url);
const fixture = JSON.parse(await readFile(new URL('./fixtures/xml-cii-mode-b-composite-v1.json', import.meta.url), 'utf8'));
const splitNames = ['SYS-6-S8810010-01.xml', 'SYS-6-S8810011-01.xml', 'SYS-S8811956-01.xml'];

async function buildRealComposite() {
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
  return buildXmlCiiModeBComposite(observation);
}

test('MODEB-02 real composite fingerprint and topology statistics are pinned', async () => {
  const composite = await buildRealComposite();
  assert.equal(composite.schema, fixture.schema);
  assert.equal(composite.sourceObservationFingerprint, fixture.sourceObservationFingerprint);
  assert.equal(composite.fingerprint, fixture.fingerprint);
  assert.deepEqual(composite.stats, fixture.stats);
});

test('MODEB-02 accepted cross-document edge is pinned to the corroborated branch boundary', async () => {
  const composite = await buildRealComposite();
  const accepted = composite.candidateDecisions.filter((row) => row.state === 'ACCEPTED');
  assert.equal(accepted.length, 1);
  assert.equal(accepted[0].candidateId, fixture.accepted.candidateId);
  assert.equal(accepted[0].score, fixture.accepted.score);
  assert.equal(accepted[0].routeContext.compatibility.status, fixture.accepted.routeCompatibility);
  assert.equal(accepted[0].originalEvidenceClass, fixture.accepted.originalEvidenceClass);
});

test('MODEB-02 position-only candidates remain insufficient and cannot drift into authority', async () => {
  const composite = await buildRealComposite();
  const insufficient = composite.candidateDecisions
    .filter((row) => row.state === 'INSUFFICIENT_EVIDENCE')
    .map((row) => ({
      candidateId: row.candidateId,
      score: row.score,
      routeCompatibility: row.routeContext.compatibility.status,
      originalEvidenceClass: row.originalEvidenceClass,
    }))
    .sort((a, b) => a.candidateId.localeCompare(b.candidateId));
  assert.deepEqual(insufficient, [...fixture.insufficient].sort((a, b) => a.candidateId.localeCompare(b.candidateId)));
  assert.ok(insufficient.every((row) => row.originalEvidenceClass === 'POSITION_ONLY'));
});

test('MODEB-02 component ownership remains pinned without losing source vertices', async () => {
  const composite = await buildRealComposite();
  const summary = composite.connectedComponents
    .map((row) => ({ vertexCount: row.vertexCount, sourceDocumentCount: row.sourceDocumentCount }))
    .sort((a, b) => b.sourceDocumentCount - a.sourceDocumentCount || b.vertexCount - a.vertexCount);
  const expected = [...fixture.componentSummary]
    .sort((a, b) => b.sourceDocumentCount - a.sourceDocumentCount || b.vertexCount - a.vertexCount);
  assert.deepEqual(summary, expected);
  assert.equal(summary.filter((row) => row.sourceDocumentCount > 1).length, 1);
  assert.equal(summary.reduce((sum, row) => sum + row.vertexCount, 0), fixture.stats.vertexCount);
});
