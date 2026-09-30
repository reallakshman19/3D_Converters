import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildXmlCiiModeBObservation } from '../converters/xml-cii2019-core/topology/xml-cii-mode-b-observation.js';
import { buildXmlCiiModeBComposite } from '../converters/xml-cii2019-core/topology/xml-cii-mode-b-composite.js';
import { buildXmlCiiModeBNumbering } from '../converters/xml-cii2019-core/topology/xml-cii-mode-b-numbering.js';

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
const numbering = buildXmlCiiModeBNumbering(composite);

const outIndex = process.argv.indexOf('--out');
if (outIndex >= 0 && process.argv[outIndex + 1]) {
  await writeFile(path.resolve(process.cwd(), process.argv[outIndex + 1]), `${JSON.stringify(numbering, null, 2)}\n`, 'utf8');
}

const summary = {
  schema: numbering.schema,
  fingerprint: numbering.fingerprint,
  sourceCompositeFingerprint: numbering.sourceCompositeFingerprint,
  options: numbering.options,
  stats: numbering.stats,
  acceptedEdgeOrientation: numbering.orientedAcceptedCrossDocumentEdges.map((edge) => ({
    candidateId: edge.candidateId,
    from: edge.from,
    to: edge.to,
    orientation: edge.orientation,
  })),
  components: numbering.components.map((component) => ({
    componentOrdinal: component.componentOrdinal,
    componentKey: component.componentKey,
    vertexCount: component.vertexCount,
  })),
  numberedPositiveSample: numbering.rows
    .filter((row) => row.numberClass === 'POSITIVE_ENGINEERING')
    .slice(0, 20)
    .map((row) => ({
      sourceIdentity: row.sourceIdentity,
      sourceNodeNumber: row.sourceNodeNumber,
      outputNodeNumber: row.outputNodeNumber,
      componentOrdinal: row.componentOrdinal,
      componentTraversalOrdinal: row.componentTraversalOrdinal,
    })),
  sentinelSample: numbering.rows
    .filter((row) => row.numberClass === 'NONPOSITIVE_SENTINEL')
    .slice(0, 12)
    .map((row) => ({
      sourceIdentity: row.sourceIdentity,
      sourceNodeNumber: row.sourceNodeNumber,
      outputNodeNumber: row.outputNodeNumber,
    })),
};
console.log(JSON.stringify(summary, null, 2));
