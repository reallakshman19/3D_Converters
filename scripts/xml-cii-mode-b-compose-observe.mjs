import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildXmlCiiModeBObservation } from '../converters/xml-cii2019-core/topology/xml-cii-mode-b-observation.js';
import { buildXmlCiiModeBComposite } from '../converters/xml-cii2019-core/topology/xml-cii-mode-b-composite.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const corpusDir = path.join(root, 'Benchmarks', 'XML-CII-2019');
const splitNames = ['SYS-6-S8810010-01.xml', 'SYS-6-S8810011-01.xml', 'SYS-S8811956-01.xml'];

async function load(name) {
  return readFile(path.join(corpusDir, name), 'utf8');
}

const splitDocuments = await Promise.all(splitNames.map(async (fileName, index) => ({
  fileName,
  documentId: `split-${index + 1}-${fileName}`,
  xmlText: await load(fileName),
})));
const combinedReference = {
  fileName: 'SYS-001_Single.xml',
  documentId: 'combined-SYS-001_Single.xml',
  xmlText: await load('SYS-001_Single.xml'),
};

const observation = buildXmlCiiModeBObservation({ splitDocuments, combinedReference }, {
  positionToleranceMm: 0.001,
  diameterToleranceMm: 0.1,
  witnessSegmentCount: 10,
});
const composite = buildXmlCiiModeBComposite(observation);

const outIndex = process.argv.indexOf('--out');
if (outIndex >= 0 && process.argv[outIndex + 1]) {
  await writeFile(path.resolve(process.cwd(), process.argv[outIndex + 1]), `${JSON.stringify(composite, null, 2)}\n`, 'utf8');
}

const summary = {
  schema: composite.schema,
  fingerprint: composite.fingerprint,
  sourceObservationFingerprint: composite.sourceObservationFingerprint,
  options: composite.options,
  stats: composite.stats,
  decisions: composite.candidateDecisions.map((row) => ({
    candidateId: row.candidateId,
    state: row.state,
    score: row.score,
    reason: row.reason,
    originalEvidenceClass: row.originalEvidenceClass,
    routeCompatibility: row.routeContext?.compatibility || null,
    scoreParts: row.scoreParts,
    hardConflicts: row.hardConflicts,
    strongestCompetitorId: row.strongestCompetitorId || null,
    acceptedCompetitorId: row.acceptedCompetitorId || null,
  })),
  components: composite.connectedComponents.map((row) => ({
    componentId: row.componentId,
    vertexCount: row.vertexCount,
    sourceDocumentCount: row.sourceDocumentCount,
  })),
};
console.log(JSON.stringify(summary, null, 2));
