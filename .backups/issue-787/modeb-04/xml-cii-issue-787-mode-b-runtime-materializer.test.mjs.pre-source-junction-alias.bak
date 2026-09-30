import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import { buildXmlCiiModeBObservation } from '../converters/xml-cii2019-core/topology/xml-cii-mode-b-observation.js';
import { buildXmlCiiModeBComposite } from '../converters/xml-cii2019-core/topology/xml-cii-mode-b-composite.js';
import { buildXmlCiiModeBNumbering } from '../converters/xml-cii2019-core/topology/xml-cii-mode-b-numbering.js';
import { prepareXmlCiiModeBRuntimeSource } from '../converters/xml-cii2019-core/topology/xml-cii-mode-b-runtime.js';
import {
  runXmlCii2019ModeBWorkflow,
  runXmlCii2019Workflow,
} from '../tabs/xml-cii-2019-standalone/xml-cii-workflow-api-atta-default.js';

const corpus = new URL('../Benchmarks/XML-CII-2019/', import.meta.url);
const splitNames = ['SYS-6-S8810010-01.xml', 'SYS-6-S8810011-01.xml', 'SYS-S8811956-01.xml'];

async function loadSplit(reverse = false) {
  const rows = await Promise.all(splitNames.map(async (fileName) => ({
    fileName,
    xmlText: await readFile(new URL(fileName, corpus), 'utf8'),
  })));
  return reverse ? rows.reverse() : rows;
}

async function fullReferenceNumbering() {
  const splitDocuments = (await loadSplit()).map((row, index) => ({ ...row, documentId: `split-${index + 1}-${row.fileName}` }));
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
  const numbering = buildXmlCiiModeBNumbering(composite);
  return { observation, composite, numbering };
}

function nodeBlockByRef(xmlText, ref) {
  return (String(xmlText).match(/<Node\b[\s\S]*?<\/Node>/gi) || [])
    .find((block) => block.includes(`<ComponentRefNo>=${ref}</ComponentRefNo>`) || block.includes(`<ComponentRefNo>${ref}</ComponentRefNo>`));
}

function nodeBlockByName(xmlText, name) {
  return (String(xmlText).match(/<Node\b[\s\S]*?<\/Node>/gi) || [])
    .find((block) => block.includes(`<NodeName>${name}</NodeName>`));
}

function tagValue(block, name) {
  const match = String(block || '').match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return String(match?.[1] || '').trim();
}

function mapping(numbering) {
  return Object.fromEntries(numbering.rows.map((row) => [row.sourceIdentity, {
    outputNodeNumber: row.outputNodeNumber,
    numberClass: row.numberClass,
  }]));
}

test('MODEB-04 canonicalizes source order and reproduces frozen split topology/numbering semantics without combined runtime authority', async () => {
  const prepared = prepareXmlCiiModeBRuntimeSource({ splitDocuments: await loadSplit(true), sourceName: 'mode-b-real.xml' });
  const frozen = await fullReferenceNumbering();

  assert.deepEqual(prepared.documents.map((row) => row.documentId), [
    'split-1-SYS-6-S8810010-01.xml',
    'split-2-SYS-6-S8810011-01.xml',
    'split-3-SYS-S8811956-01.xml',
  ]);
  assert.equal(prepared.observation.stats.splitNodeCount, 452);
  assert.equal(prepared.composite.stats.observedCandidateCount, 3);
  assert.equal(prepared.composite.stats.acceptedCrossDocumentEdgeCount, 1);
  assert.equal(prepared.composite.stats.insufficientEvidenceCandidateCount, 2);
  assert.equal(prepared.numbering.stats.vertexCount, 452);
  assert.equal(prepared.numbering.stats.positiveNumberedVertexCount, 234);
  assert.equal(prepared.numbering.stats.nonPositiveSentinelCount, 218);
  assert.deepEqual(mapping(prepared.numbering), mapping(frozen.numbering), 'combined reference must not be needed to reproduce the frozen source→output numbering map');
  assert.equal(prepared.evidence.junctionAliasCount, 1);
});

test('MODEB-04 renders exactly one accepted helper alias and never promotes the weaker coincident identity', async () => {
  const prepared = prepareXmlCiiModeBRuntimeSource({ splitDocuments: await loadSplit(), sourceName: 'mode-b-real.xml' });
  assert.equal(prepared.aliases.length, 1);
  const alias = prepared.aliases[0];
  assert.match(alias.downstreamSourceIdentity, /1006649732\/121345::1$/);
  assert.equal(alias.sourceSentinelNodeNumber, '-1');
  assert.ok(alias.renderedNodeNumber > 0);

  const acceptedHelper = nodeBlockByRef(prepared.sourceText, '1006649732/121345');
  const weakCoincident = nodeBlockByRef(prepared.sourceText, '1006649732/121346');
  assert.ok(acceptedHelper && weakCoincident);
  assert.equal(Number(tagValue(acceptedHelper, 'NodeNumber')), alias.renderedNodeNumber);
  const weakRow = prepared.custodyRows.find((row) => row.componentRefNo.includes('1006649732/121346'));
  assert.ok(weakRow);
  assert.equal(weakRow.renderedAuthority, 'MODEB_GRAPH_TRAVERSAL');
  assert.ok(Number(weakRow.renderedNodeNumber) > 0);
  assert.notEqual(Number(weakRow.renderedNodeNumber), alias.renderedNodeNumber);
  assert.equal(Number(tagValue(weakCoincident, 'NodeNumber')), Number(weakRow.renderedNodeNumber));

  assert.equal(prepared.evidence.materializationStats.aliasRewriteCount, 1);
  assert.equal(prepared.evidence.materializationStats.positiveRewriteCount, 234);
  assert.equal(prepared.evidence.materializationStats.sentinelPreservedCount, 217);
});

test('MODEB-04 preserves explicit +Y REST authority for the two issue witnesses through XML materialization', async () => {
  const prepared = prepareXmlCiiModeBRuntimeSource({ splitDocuments: await loadSplit() });
  for (const name of ['PS-14292.1', 'PS-14259.4']) {
    const block = nodeBlockByName(prepared.sourceText, name);
    assert.ok(block, `${name} must remain in the materialized source`);
    assert.match(block, /<Restraint\b[\s\S]*?<Type>\+Y<\/Type>[\s\S]*?<\/Restraint>/i, `${name} must preserve explicit +Y restraint authority`);
    assert.ok(Number(tagValue(block, 'NodeNumber')) > 0, `${name} must retain a positive MODEB-03 output number before native short-node cleanup`);
  }
});

test('MODEB-04 preserves all split Branch blocks and branch-owned process/material metadata instead of concatenating routes', async () => {
  const split = await loadSplit();
  const prepared = prepareXmlCiiModeBRuntimeSource({ splitDocuments: split });
  const outputBranches = prepared.sourceText.match(/<Branch\b[\s\S]*?<\/Branch>/gi) || [];
  const inputBranches = split.flatMap((row) => row.xmlText.match(/<Branch\b[\s\S]*?<\/Branch>/gi) || []);
  assert.equal(outputBranches.length, inputBranches.length);
  assert.equal(outputBranches.length, 7);

  const byName = (blocks) => new Map(blocks.map((block) => [tagValue(block, 'Branchname'), block]));
  const expected = byName(inputBranches);
  const actual = byName(outputBranches);
  for (const [branchName, sourceBlock] of expected) {
    const out = actual.get(branchName);
    assert.ok(out, `missing materialized branch ${branchName}`);
    for (const tag of ['MaterialNumber', 'InsulationDensity', 'FluidDensity']) {
      assert.equal(tagValue(out, tag), tagValue(sourceBlock, tag), `${branchName} ${tag} must remain branch-owned`);
    }
    assert.equal(tagValue(out, 'Temperature'), tagValue(sourceBlock, 'Temperature'));
    assert.equal(tagValue(out, 'Pressure'), tagValue(sourceBlock, 'Pressure'));
  }
});

test('MODEB-04 preserves the 10 combined-reference witness segment semantics inside shared split coverage', async () => {
  const prepared = prepareXmlCiiModeBRuntimeSource({ splitDocuments: await loadSplit() });
  const frozen = await fullReferenceNumbering();
  const splitNodes = prepared.observation.nodes.filter((row) => row.documentRole === 'split-source');
  for (const witness of frozen.observation.combinedReferenceWitnesses) {
    const fromRef = String(witness.fromComponentRefNo || '').replace(/^=/, '');
    const toRef = String(witness.toComponentRefNo || '').replace(/^=/, '');
    const branchNodes = splitNodes
      .filter((row) => row.branchName === witness.branchName)
      .sort((a, b) => a.nodeIndex - b.nodeIndex);
    const fromIndex = branchNodes.findIndex((row) => row.normalizedComponentRefNo === fromRef.toUpperCase() && row.endpoint === witness.fromEndpoint);
    assert.ok(fromIndex >= 0, `${witness.witnessId} from endpoint must exist in split coverage`);
    const from = branchNodes[fromIndex];
    const to = branchNodes[fromIndex + 1];
    assert.ok(to, `${witness.witnessId} must have a consecutive split endpoint`);
    assert.equal(to.normalizedComponentRefNo, toRef.toUpperCase(), `${witness.witnessId} to ComponentRefNo must match`);
    assert.equal(to.endpoint, witness.toEndpoint, `${witness.witnessId} to Endpoint must match`);
    assert.deepEqual(from.point, witness.fromPosition ? from.point : from.point);
  }
});

test('MODEB-04 runtime API delegates the prepared PSI XML through the unchanged workflow service and exposes evidence', async () => {
  const splitDocuments = await loadSplit();
  let engineJob = null;
  const runtime = {
    runParityEnricher: async (job) => ({
      applied: true,
      xmlText: job.sourceText,
      evidence: { ok: true, engineInputDigest: 'test-mode-b-digest' },
      stats: { test: true },
      logs: ['TEST_PARITY'],
    }),
    engineRunner: async (job) => {
      engineJob = job;
      return {
        ok: true,
        sourceKind: 'xml',
        outputKind: 'enrichedXML',
        enrichedText: job.sourceText,
        enrichedName: 'mode-b-enriched.xml',
        ciiText: 'MODE-B-CII',
        ciiName: 'mode-b.cii',
        diagnostics: { warnings: [] },
        logs: ['TEST_ENGINE'],
        error: null,
      };
    },
  };
  const result = await runXmlCii2019ModeBWorkflow(
    { splitDocuments, sourceName: 'runtime-mode-b.xml' },
    { supportConfigJson: '{}', options: { outputMode: 'both' } },
    runtime,
  );
  assert.equal(result.ok, true);
  assert.ok(engineJob);
  assert.equal(engineJob.sourceKind, 'xml');
  assert.match(engineJob.sourceText, /<PipeStressExport\b/);
  assert.equal(result.diagnostics.modeB.runtimeBound, true);
  assert.equal(result.diagnostics.modeB.productionDefault, false);
  assert.equal(result.diagnostics.modeB.junctionAliasCount, 1);
  assert.match(result.logs[0], /^MODE_B_RUNTIME /);
});

test('MODEB-04 leaves the normal single-file workflow API on its original source path', async () => {
  const sourceText = (await loadSplit())[0].xmlText;
  let captured = null;
  const result = await runXmlCii2019Workflow(
    { sourceKind: 'xml', sourceText, sourceName: 'single.xml', supportConfigJson: '{}', options: { outputMode: 'cii-only' } },
    {
      runParityEnricher: async (job) => ({ applied: true, xmlText: job.sourceText, evidence: { ok: true, engineInputDigest: 'single' }, stats: {}, logs: [] }),
      engineRunner: async (job) => {
        captured = job.sourceText;
        return { ok: true, sourceKind: 'xml', outputKind: 'enrichedXML', enrichedText: '', enrichedName: '', ciiText: 'SINGLE', ciiName: 'single.cii', diagnostics: { warnings: [] }, logs: [], error: null };
      },
    },
  );
  assert.equal(result.ok, true);
  assert.equal(captured, sourceText);
  assert.equal(result.diagnostics.modeB, undefined);
});

test('MODEB-04 runtime/docs materializer and API remain byte-identical', async () => {
  const runtimeCore = await readFile(new URL('../converters/xml-cii2019-core/topology/xml-cii-mode-b-runtime.js', import.meta.url), 'utf8');
  const docsCore = await readFile(new URL('../docs/converters/xml-cii2019-core/topology/xml-cii-mode-b-runtime.js', import.meta.url), 'utf8');
  const runtimeApi = await readFile(new URL('../tabs/xml-cii-2019-standalone/xml-cii-workflow-api-atta-default.js', import.meta.url), 'utf8');
  const docsApi = await readFile(new URL('../docs/tabs/xml-cii-2019-standalone/xml-cii-workflow-api-atta-default.js', import.meta.url), 'utf8');
  assert.equal(docsCore, runtimeCore);
  assert.equal(docsApi, runtimeApi);
});
