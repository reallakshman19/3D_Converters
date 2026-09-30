import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { prepareXmlCiiModeBRuntimeSource } from '../converters/xml-cii2019-core/topology/xml-cii-mode-b-runtime.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const corpus = path.join(root, 'Benchmarks', 'XML-CII-2019');
const splitNames = ['SYS-6-S8810010-01.xml', 'SYS-6-S8810011-01.xml', 'SYS-S8811956-01.xml'];

function arg(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? path.resolve(process.argv[index + 1]) : fallback;
}

const splitDocuments = await Promise.all(splitNames.map(async (fileName) => ({
  fileName,
  xmlText: await readFile(path.join(corpus, fileName), 'utf8'),
})));
const prepared = prepareXmlCiiModeBRuntimeSource({ splitDocuments, sourceName: 'issue-787-mode-b-runtime.xml' });
const xmlOut = arg('--xml-out', path.join(root, 'modeb-runtime.xml'));
const evidenceOut = arg('--evidence-out', path.join(root, 'modeb-runtime-evidence.json'));
await writeFile(xmlOut, prepared.sourceText, 'utf8');
await writeFile(evidenceOut, `${JSON.stringify(prepared.evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  schema: prepared.schema,
  sourceDigest: prepared.evidence.sourceDigest,
  sourceDocumentCount: prepared.evidence.sourceDocumentCount,
  acceptedCrossDocumentEdgeCount: prepared.evidence.acceptedCrossDocumentEdgeCount,
  junctionAliasCount: prepared.evidence.junctionAliasCount,
  materializationStats: prepared.evidence.materializationStats,
  alias: prepared.aliases[0] || null,
}, null, 2));
