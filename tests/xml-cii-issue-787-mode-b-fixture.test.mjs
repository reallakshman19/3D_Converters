import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import { buildXmlCiiModeBObservation } from '../converters/xml-cii2019-core/topology/xml-cii-mode-b-observation.js';

const corpus = new URL('../Benchmarks/XML-CII-2019/', import.meta.url);
const fixture = JSON.parse(await readFile(new URL('./fixtures/xml-cii-mode-b-observation-v1.json', import.meta.url), 'utf8'));
const splitNames = ['SYS-6-S8810010-01.xml', 'SYS-6-S8810011-01.xml', 'SYS-S8811956-01.xml'];

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

test('MODEB-01 observation fingerprint and pinned corpus statistics are stable', () => {
  assert.equal(observation.fingerprint, fixture.observationFingerprint);
  for (const [key, expected] of Object.entries(fixture.stats)) assert.equal(observation.stats[key], expected, key);
});

test('shared/split-only/combined-only branch coverage remains pinned', () => {
  assert.deepEqual(observation.corpusCoverage.sharedBranchNames, fixture.corpusCoverage.sharedBranchNames);
  assert.deepEqual(observation.corpusCoverage.splitOnlyBranchNames, fixture.corpusCoverage.splitOnlyBranchNames);
  assert.deepEqual(observation.corpusCoverage.combinedOnlyBranchNames, fixture.corpusCoverage.combinedOnlyBranchNames);
});

test('three observed cross-document boundary candidates remain pinned without acceptance', () => {
  const actual = observation.boundaryCandidates.map((row) => ({
    candidateId: row.candidateId,
    evidenceClass: row.evidenceClass,
    observationDisposition: row.observationDisposition,
    distanceMm: row.distanceMm,
    corroborationCount: row.evidence.corroborationCount,
    teeInvolved: row.evidence.teeInvolved,
  }));
  assert.deepEqual(actual, fixture.boundaryCandidates);
  assert.ok(observation.boundaryCandidates.every((row) => row.authority === 'OBSERVATION_ONLY'));
});

test('the requested 10 continuous reconstruction witnesses are durable fixtures', () => {
  assert.ok(observation.combinedReferenceWitnesses.every((row) => row.branchName === fixture.witnessBranchName));
  const actual = observation.combinedReferenceWitnesses.map((row) => ({
    witnessId: row.witnessId,
    fromNodeNumber: row.fromNodeNumber,
    toNodeNumber: row.toNodeNumber,
    fromComponentType: row.fromComponentType,
    toComponentType: row.toComponentType,
    distanceMm: row.distanceMm,
  }));
  assert.deepEqual(actual, fixture.witnesses);
  assert.ok(observation.combinedReferenceWitnesses.every((row) => row.splitRefEvidence.fromRefPresentInSplit && row.splitRefEvidence.toRefPresentInSplit));
});
