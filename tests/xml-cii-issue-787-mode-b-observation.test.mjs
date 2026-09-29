import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import { buildXmlCiiModeBObservation } from '../converters/xml-cii2019-core/topology/xml-cii-mode-b-observation.js';

const corpus = new URL('../Benchmarks/XML-CII-2019/', import.meta.url);
const splitNames = [
  'SYS-6-S8810010-01.xml',
  'SYS-6-S8810011-01.xml',
  'SYS-S8811956-01.xml',
];
const combinedName = 'SYS-001_Single.xml';

async function loadObservation() {
  const splitDocuments = await Promise.all(splitNames.map(async (fileName, index) => ({
    fileName,
    documentId: `split-${index + 1}-${fileName}`,
    xmlText: await readFile(new URL(fileName, corpus), 'utf8'),
  })));
  const combinedReference = {
    fileName: combinedName,
    documentId: `combined-${combinedName}`,
    xmlText: await readFile(new URL(combinedName, corpus), 'utf8'),
  };
  return buildXmlCiiModeBObservation({ splitDocuments, combinedReference }, {
    positionToleranceMm: 0.001,
    diameterToleranceMm: 0.1,
    witnessSegmentCount: 10,
  });
}

test('MODEB-01 parses the exact split + combined corpus deterministically', async () => {
  const first = await loadObservation();
  const second = await loadObservation();
  assert.deepEqual(second, first);
  assert.equal(first.schema, 'xml-cii-mode-b-observation/v1');
  assert.equal(first.authority, 'READ_ONLY_OBSERVATION');
  assert.equal(first.stats.splitDocumentCount, 3);
  assert.equal(first.documents.filter((row) => row.documentRole === 'combined-reference').length, 1);
  assert.ok(first.stats.splitBranchCount > 0);
  assert.ok(first.stats.splitNodeCount > 0);
  assert.ok(first.stats.combinedBranchCount > 0);
  assert.ok(first.stats.combinedNodeCount > 0);
  assert.match(first.fingerprint, /^fnv1a32:[0-9a-f]{8}$/);
});

test('every observed node keeps collision-safe immutable source provenance', async () => {
  const observation = await loadObservation();
  const identities = observation.nodes.map((row) => row.sourceIdentity);
  assert.equal(new Set(identities).size, identities.length);
  for (const node of observation.nodes) {
    assert.ok(node.sourceDocumentId);
    assert.ok(node.sourceFileName);
    assert.ok(node.branchName);
    assert.ok(Number.isInteger(node.branchOccurrence) && node.branchOccurrence > 0);
    assert.ok(Number.isInteger(node.nodeIndex) && node.nodeIndex >= 0);
    assert.ok(node.sourceIdentity.includes(node.sourceDocumentId));
  }
  assert.ok(observation.duplicateSourceNodeNumbers.length > 0, 'real split corpus should expose duplicate positive Node Numbers across source documents');
});

test('same-position and restraint observations preserve multiplicity instead of collapsing identities', async () => {
  const observation = await loadObservation();
  assert.ok(observation.samePositionClusters.length > 0);
  assert.ok(observation.samePositionClusters.some((row) => row.nodeCount > 2), 'benchmark should retain coincident multi-node stacks');
  assert.ok(observation.restraintFacts.length > 0);
  assert.ok(observation.restraintFacts.every((row) => row.sourceIdentity && Array.isArray(row.restraints)));
});

test('TEE facts preserve component identity and local branch context', async () => {
  const observation = await loadObservation();
  assert.ok(observation.teeFacts.length > 0, 'benchmark corpus should contain TEE topology evidence');
  assert.ok(observation.teeFacts.some((row) => row.componentRefNo), 'TEE facts should retain ComponentRefNo evidence');
  assert.ok(observation.teeFacts.some((row) => row.previousSourceIdentity || row.nextSourceIdentity), 'TEE facts should retain neighbor context');
});

test('cross-document candidates remain observations with multi-signal evidence and explicit ambiguity', async () => {
  const observation = await loadObservation();
  assert.ok(observation.boundaryCandidates.length > 0, 'split corpus should expose at least one cross-document POS candidate');
  assert.equal(
    observation.uniqueBoundaryCandidates.length + observation.ambiguousBoundaryCandidates.length,
    observation.boundaryCandidates.length,
  );
  for (const candidate of observation.boundaryCandidates) {
    assert.equal(candidate.authority, 'OBSERVATION_ONLY');
    assert.notEqual(candidate.documentA, candidate.documentB);
    assert.ok(candidate.distanceMm <= observation.options.positionToleranceMm);
    assert.equal(typeof candidate.evidence.componentRefMatch, 'boolean');
    assert.equal(typeof candidate.evidence.endpointMatch, 'boolean');
    assert.equal(typeof candidate.evidence.componentTypeMatch, 'boolean');
    assert.ok(['MATCH', 'CONFLICT', 'UNKNOWN'].includes(candidate.evidence.outsideDiameterCompatibility));
    assert.ok(['STRONG_CORROBORATION', 'CORROBORATED', 'POSITION_ONLY', 'CONFLICTING_GEOMETRY'].includes(candidate.evidenceClass));
    assert.ok(['UNIQUE_CANDIDATE_OBSERVATION', 'AMBIGUOUS_CANDIDATE_OBSERVATION'].includes(candidate.observationDisposition));
  }
  assert.ok(observation.ambiguousBoundaryCandidates.length > 0, 'real corpus should retain coincident/multi-candidate ambiguity rather than silently selecting a join');
});

test('combined reference yields exactly 10 deterministic continuous witness segments', async () => {
  const observation = await loadObservation();
  const witnesses = observation.combinedReferenceWitnesses;
  assert.equal(witnesses.length, 10);
  assert.deepEqual(witnesses.map((row) => row.witnessId), ['W01','W02','W03','W04','W05','W06','W07','W08','W09','W10']);
  assert.equal(new Set(witnesses.map((row) => row.branchId)).size, 1, 'witnesses must be one continuous branch window');
  for (let index = 1; index < witnesses.length; index += 1) {
    assert.equal(witnesses[index - 1].toSourceIdentity, witnesses[index].fromSourceIdentity, `witness ${index} must continue into witness ${index + 1}`);
  }
  assert.ok(new Set(witnesses.flatMap((row) => [row.fromComponentType, row.toComponentType]).filter(Boolean)).size >= 2, 'witness window should cover more than one component type');
});

test('MODEB-01 does not create accepted joins or composite numbering', async () => {
  const observation = await loadObservation();
  const encoded = JSON.stringify(observation);
  assert.equal(encoded.includes('acceptedJoin'), false);
  assert.equal(encoded.includes('compositeNodeNumber'), false);
  assert.equal(encoded.includes('outputNodeNumber'), false);
  assert.match(observation.diagnostics.map((row) => row.message).join(' '), /No boundary candidate is an accepted join/i);
});

test('runtime/docs observation core remains byte-identical', async () => {
  const runtime = await readFile(new URL('../converters/xml-cii2019-core/topology/xml-cii-mode-b-observation.js', import.meta.url), 'utf8');
  const docs = await readFile(new URL('../docs/converters/xml-cii2019-core/topology/xml-cii-mode-b-observation.js', import.meta.url), 'utf8');
  assert.equal(docs, runtime);
});
