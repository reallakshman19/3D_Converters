import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildXmlCiiModeBObservation } from '../converters/xml-cii2019-core/topology/xml-cii-mode-b-observation.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const corpusDir = path.join(root, 'Benchmarks', 'XML-CII-2019');
const splitNames = [
  'SYS-6-S8810010-01.xml',
  'SYS-6-S8810011-01.xml',
  'SYS-S8811956-01.xml',
];
const combinedName = 'SYS-001_Single.xml';

async function load(name) {
  return readFile(path.join(corpusDir, name), 'utf8');
}

const splitDocuments = await Promise.all(splitNames.map(async (fileName, index) => ({
  fileName,
  documentId: `split-${index + 1}-${fileName}`,
  xmlText: await load(fileName),
})));
const combinedReference = {
  fileName: combinedName,
  documentId: `combined-${combinedName}`,
  xmlText: await load(combinedName),
};

const observation = buildXmlCiiModeBObservation({ splitDocuments, combinedReference }, {
  positionToleranceMm: 0.001,
  diameterToleranceMm: 0.1,
  witnessSegmentCount: 10,
});

const outIndex = process.argv.indexOf('--out');
if (outIndex >= 0 && process.argv[outIndex + 1]) {
  await writeFile(path.resolve(process.cwd(), process.argv[outIndex + 1]), `${JSON.stringify(observation, null, 2)}\n`, 'utf8');
}

const summary = {
  schema: observation.schema,
  fingerprint: observation.fingerprint,
  stats: observation.stats,
  corpusCoverage: observation.corpusCoverage,
  splitDocuments: observation.documents.filter((row) => row.documentRole === 'split-source'),
  combinedReference: observation.documents.find((row) => row.documentRole === 'combined-reference') || null,
  boundaryCandidates: observation.boundaryCandidates.map((row) => ({
    candidateId: row.candidateId,
    documentA: row.documentA,
    documentB: row.documentB,
    distanceMm: row.distanceMm,
    evidenceClass: row.evidenceClass,
    observationDisposition: row.observationDisposition,
    evidence: row.evidence,
  })),
  witnesses: observation.combinedReferenceWitnesses.map((row) => ({
    witnessId: row.witnessId,
    branchName: row.branchName,
    fromSourceIdentity: row.fromSourceIdentity,
    toSourceIdentity: row.toSourceIdentity,
    fromComponentType: row.fromComponentType,
    toComponentType: row.toComponentType,
    distanceMm: row.distanceMm,
    splitRefEvidence: row.splitRefEvidence,
  })),
  boundaryEvidenceClasses: Object.fromEntries(
    [...new Set(observation.boundaryCandidates.map((row) => row.evidenceClass))]
      .sort()
      .map((key) => [key, observation.boundaryCandidates.filter((row) => row.evidenceClass === key).length]),
  ),
};

console.log(JSON.stringify(summary, null, 2));
