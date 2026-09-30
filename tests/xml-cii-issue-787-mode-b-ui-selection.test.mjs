import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import {
  enabledModeBSources,
  inspectXmlCiiModeBPreparation,
  XML_CII_EXECUTION_MODE_A,
  XML_CII_EXECUTION_MODE_B,
  xmlCiiExecutionMode,
} from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-mode-selector.js';

const CORPUS = [
  'SYS-6-S8810010-01.xml',
  'SYS-6-S8810011-01.xml',
  'SYS-S8811956-01.xml',
];

async function source(fileName, index) {
  const sourceText = await readFile(new URL(`../Benchmarks/XML-CII-2019/${fileName}`, import.meta.url), 'utf8');
  return {
    sourceId: `SRC-${index + 1}`,
    fileName,
    sourceDigest: `test-${index + 1}`,
    sourceText,
    enabled: true,
  };
}

async function state(order = CORPUS) {
  const sources = await Promise.all(order.map((fileName, index) => source(fileName, index)));
  return {
    multiSourceExecutionMode: XML_CII_EXECUTION_MODE_B,
    sourceBatch: { mode: 'separate-models', activeSourceId: sources[0].sourceId, sources },
  };
}

test('MODEB-05 keeps Mode A as the implicit/default execution mode', () => {
  assert.equal(xmlCiiExecutionMode({}), XML_CII_EXECUTION_MODE_A);
  assert.equal(xmlCiiExecutionMode({ multiSourceExecutionMode: 'unexpected' }), XML_CII_EXECUTION_MODE_A);
  assert.equal(xmlCiiExecutionMode({ multiSourceExecutionMode: XML_CII_EXECUTION_MODE_B }), XML_CII_EXECUTION_MODE_B);
});

test('MODEB-05 requires at least two enabled source XMLs before topology preparation', async () => {
  const only = await source(CORPUS[0], 0);
  const report = inspectXmlCiiModeBPreparation({
    multiSourceExecutionMode: XML_CII_EXECUTION_MODE_B,
    sourceBatch: { mode: 'separate-models', activeSourceId: only.sourceId, sources: [only] },
  });
  assert.equal(report.ready, false);
  assert.equal(report.code, 'MODEB_NEEDS_TWO_SOURCES');
});

test('MODEB-05 real corpus exposes qualified topology evidence without combined runtime authority', async () => {
  const report = inspectXmlCiiModeBPreparation(await state());
  assert.equal(report.status, 'READY');
  assert.equal(report.ready, true);
  assert.equal(report.sources.length, 3);
  assert.equal(report.topology.sourceDocumentCount, 3);
  assert.equal(report.topology.materializedNodeCount, 452);
  assert.equal(report.topology.acceptedCrossDocumentEdgeCount, 1);
  assert.equal(report.topology.insufficientEvidenceCandidateCount, 2);
  assert.equal(report.topology.ambiguousCandidateCount, 0);
  assert.equal(report.topology.sourceJunctionGroupCount, 5);
  assert.equal(report.topology.sourceJunctionOccurrenceCount, 10);
  assert.equal(report.topology.crossDocumentAliasCount, 1);
  assert.equal(report.aliases.length, 1);
  assert.match(report.aliases[0].upstreamSourceIdentity, /121515/);
  assert.match(report.aliases[0].downstreamSourceIdentity, /121345/);
  assert.doesNotMatch(JSON.stringify(report), /SYS-001_Single\.xml/);
});

test('MODEB-05 source inventory order cannot change deterministic runtime preparation', async () => {
  const forward = inspectXmlCiiModeBPreparation(await state(CORPUS));
  const reverse = inspectXmlCiiModeBPreparation(await state([...CORPUS].reverse()));
  assert.equal(forward.ready, true);
  assert.equal(reverse.ready, true);
  assert.deepEqual(
    forward.sourceOrder.map((row) => row.fileName),
    reverse.sourceOrder.map((row) => row.fileName),
  );
  assert.equal(forward.topology.sourceDigest, reverse.topology.sourceDigest);
  assert.equal(forward.prepared.numbering.fingerprint, reverse.prepared.numbering.fingerprint);
});

test('MODEB-05 enabled source projection preserves source custody and excludes disabled rows', async () => {
  const current = await state();
  current.sourceBatch.sources[1].enabled = false;
  const rows = enabledModeBSources(current);
  assert.deepEqual(rows.map((row) => row.fileName), [CORPUS[0], CORPUS[2]]);
  assert(rows.every((row) => row.sourceText.includes('<PipeStressExport')));
});

test('MODEB-05 runtime/docs selector and shell/event bindings remain byte-identical', async () => {
  const pairs = [
    'xml-cii-adapted-mode-selector.js',
    'xml-cii-adapted-workflow-shell-mode-a-easy-bulk-v6.js',
    'xml-cii-adapted-events-mode-a-consolidated-review-v2.js',
  ];
  for (const name of pairs) {
    const runtime = await readFile(new URL(`../tabs/xml-cii-2019-standalone/ui-adapted/${name}`, import.meta.url), 'utf8');
    const docs = await readFile(new URL(`../docs/tabs/xml-cii-2019-standalone/ui-adapted/${name}`, import.meta.url), 'utf8');
    assert.equal(runtime, docs, `${name} runtime/docs drift`);
  }
});

test('MODEB-05 Mode B run binding is fail-safe until source-local parity freeze is released', async () => {
  const events = await readFile(new URL('../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events-mode-a-consolidated-review-v2.js', import.meta.url), 'utf8');
  assert.match(events, /xmlCiiExecutionMode\(rawRef\.current\) === XML_CII_EXECUTION_MODE_B/);
  assert.match(events, /replacement\.disabled = true/);
  assert.match(events, /source-local parity freeze\/run binding is not yet released/);
});
