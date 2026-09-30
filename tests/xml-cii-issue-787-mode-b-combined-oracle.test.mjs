import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

import { buildXmlCiiModeBObservation } from '../converters/xml-cii2019-core/topology/xml-cii-mode-b-observation.js';
import { buildXmlCiiModeBComposite } from '../converters/xml-cii2019-core/topology/xml-cii-mode-b-composite.js';

const corpus = new URL('../Benchmarks/XML-CII-2019/', import.meta.url);
const splitNames = ['SYS-6-S8810010-01.xml', 'SYS-6-S8810011-01.xml', 'SYS-S8811956-01.xml'];

async function build() {
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
  return { observation, composite: buildXmlCiiModeBComposite(observation) };
}

function sameSourceSemantics(a, b) {
  return a.branchName === b.branchName
    && a.normalizedComponentRefNo === b.normalizedComponentRefNo
    && a.endpoint === b.endpoint
    && a.positionKey === b.positionKey;
}

test('real accepted join selects the branch-boundary identity preserved by SYS-001_Single.xml', async () => {
  const { observation, composite } = await build();
  const accepted = composite.candidateDecisions.filter((row) => row.state === 'ACCEPTED');
  assert.equal(accepted.length, 1, 'real corpus should produce exactly one accepted MODEB-02 join');
  const winner = accepted[0];

  const splitNodes = observation.nodes.filter((row) => row.documentRole === 'split-source');
  const combinedNodes = observation.nodes.filter((row) => row.documentRole === 'combined-reference');
  const sourceA = splitNodes.find((row) => row.sourceIdentity === winner.sourceA);
  const sourceB = splitNodes.find((row) => row.sourceIdentity === winner.sourceB);
  assert.ok(sourceA && sourceB, 'accepted join endpoints must retain source-node custody');

  const sourceABranch = splitNodes.filter((row) => row.branchId === sourceA.branchId).sort((a, b) => a.nodeIndex - b.nodeIndex);
  const sourceBBranch = splitNodes.filter((row) => row.branchId === sourceB.branchId).sort((a, b) => a.nodeIndex - b.nodeIndex);
  assert.equal(sourceA.nodeIndex, sourceABranch.at(-1).nodeIndex, 'S8810010 accepted endpoint must be the source branch terminal node');
  assert.equal(sourceB.nodeIndex, sourceBBranch[0].nodeIndex, 'S8811956 accepted endpoint must be the source branch initial node');

  const combinedBBranch = combinedNodes.filter((row) => row.branchName === sourceB.branchName).sort((a, b) => a.nodeIndex - b.nodeIndex);
  assert.ok(combinedBBranch.length > 1, 'combined reference must contain the accepted S8811956 branch');
  assert.equal(sameSourceSemantics(sourceB, combinedBBranch[0]), true, 'combined reference must preserve the accepted target as the first branch identity');

  const weakAlternative = composite.candidateDecisions.find((row) =>
    row.candidateId !== winner.candidateId
      && row.sourceA === winner.sourceA
      && row.state === 'INSUFFICIENT_EVIDENCE'
      && row.originalEvidenceClass === 'POSITION_ONLY');
  assert.ok(weakAlternative, 'the same-POS weaker alternative must remain explicit');
  const weakTarget = splitNodes.find((row) => row.sourceIdentity === weakAlternative.sourceB);
  assert.ok(weakTarget, 'weaker target identity must remain present');
  assert.equal(weakTarget.positionKey, sourceB.positionKey, 'winner and weaker alternative are genuinely coincident');
  assert.equal(weakTarget.nodeIndex, sourceB.nodeIndex + 1, 'weaker candidate is the adjacent interior node, not the branch boundary');
  assert.equal(sameSourceSemantics(weakTarget, combinedBBranch[1]), true, 'combined reference must preserve the weaker same-POS identity as the next interior node');

  assert.equal(winner.routeContext.compatibility.status, 'MATCH');
  assert.equal(winner.score, 10);
  assert.equal(weakAlternative.score, 6);
  assert.equal(weakAlternative.routeContext.compatibility.status, 'MATCH');
});
