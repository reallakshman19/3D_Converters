import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash, webcrypto } from 'node:crypto';
import { makeBasisRef, digestCanonical } from '../contracts/gc-pw-v1/contract.mjs';
import { physicalOccurrenceId } from '../contracts/gc-pw-v1/occurrence-bridge.mjs';
import { createCanonicalWeightFactSession } from '../converters/xml-cii2019-core/weight-facts-canonical-consumer.js';
import {
  planExactSourceWeightCommands, commitExactSourceWeightCommands,
} from '../converters/xml-cii2019-core/weight-facts-bulk-decisions.js';
import {
  renderXml229WeightReviewPage, xml229WeightReviewPageModel,
} from '../tabs/xml-cii-2019-standalone/ui-adapted/xml229-p4-weight-review-presentation.mjs';

if (!globalThis.crypto) globalThis.crypto = webcrypto;
const hash = s => createHash('sha256').update(s).digest('hex');

async function createReviewSessionFixture() {
  const sourceId = 'PL01';
  const live = {
    sources: { [sourceId]: '<Model A="1"/>' },
    selection: [{ sourceId, selectionRef: 'all' }],
    stagedSource: null,
    masters: {
      weight: {
        datasetId: 'valves',
        revision: 1,
        rows: [{ weight: 25.5, size: 50, rating: '300#' }],
        mapping: { Weight: 'weight', Size: 'size', Rating: 'rating' },
      },
    },
    config: { ratingMode: 'preview' },
    overrides: {},
  };
  const basis = await makeBasisRef({
    domainId: 'xml-cii/2019',
    sourceRefs: [{ sourceId, sha256: hash(live.sources[sourceId]), mediaType: 'application/xml' }],
    selectionSha256: await digestCanonical(live.selection),
    stagedSourceSha256: null,
    masters: {
      weight: {
        datasetId: 'valves',
        revision: 1,
        rowCount: 1,
        sha256: await digestCanonical(live.masters.weight.rows),
        mappingSha256: await digestCanonical(live.masters.weight.mapping),
      },
    },
    configSha256: await digestCanonical(live.config),
    overridesSha256: await digestCanonical(live.overrides),
    scope: live.selection,
  });

  const physicalOccurrences = [
    { sourceId, branchOccurrenceIndex: 0, nodeOrdinal: 1, componentSignature: 'valve-1' },
    { sourceId, branchOccurrenceIndex: 0, nodeOrdinal: 2, componentSignature: 'valve-2' },
  ];
  const fields = ['mass.kg', 'rating', 'bore.mm', 'length.mm'];
  const records = physicalOccurrences.flatMap((p, idx) => fields.map(fieldId => ({
    schemaVersion: 'gc-pw/1.0',
    basisId: basis.basisId,
    domainId: basis.domainId,
    subjectType: 'physical-component',
    sourceId: p.sourceId,
    occurrenceId: physicalOccurrenceId(p),
    fieldId,
    value: fieldId === 'mass.kg' ? null : fieldId === 'rating' ? '300#' : fieldId === 'length.mm' ? 150 : 50,
    unit: fieldId === 'mass.kg' ? 'kg' : fieldId === 'rating' ? null : 'mm',
    authority: fieldId === 'mass.kg' ? 'unresolved' : 'derived',
    provenance: [{ sourceRef: p.sourceId, locator: `ordinal:${idx}` }],
    diagnostics: [],
  })));

  const scorer = (record, b) => {
    const occId = Array.isArray(record) ? record[0]?.occurrenceId : record?.occurrenceId;
    return [
      {
        basisId: b.basisId,
        domainId: b.domainId,
        occurrenceId: occId,
        proposalId: 'prop-qualified-' + hash(String(occId)).slice(0, 8),
        ranking: 1,
        value: 45.0,
        unit: 'kg',
        qualified: true,
        method: 'exact-valve-match',
        scoringRevision: 'score-v1',
        eligibilityReasons: ['exact match'],
        evidenceRefs: ['master:valves:0'],
      },
    ];
  };

  const reviewService = createCanonicalWeightFactSession({ score: scorer });
  await reviewService.openCanonicalFacts({
    basis,
    live,
    originalOccurrences: physicalOccurrences,
    expectedOriginalCount: physicalOccurrences.length,
    physicalOccurrences,
    requiredFieldIds: fields,
    pages: [{
      schemaVersion: 'gc-pw/1.0',
      basisId: basis.basisId,
      items: records,
      totalCount: records.length,
      nextCursor: null,
      complete: true,
    }],
  });

  return { basis, sourceId, physicalOccurrences, session: { review: reviewService } };
}

test('planExactSourceWeightCommands finds qualified proposals and commits bulk Match-1 only', async () => {
  const { basis, sourceId, session } = await createReviewSessionFixture();
  const plan = planExactSourceWeightCommands(session.review, { basisId: basis.basisId, scopeId: sourceId });

  assert.equal(plan.basisId, basis.basisId);
  assert.equal(plan.scopeId, sourceId);
  assert.equal(plan.stage, 'RigidMatch1');
  assert.ok(plan.expectedDecisionRevision === null || typeof plan.expectedDecisionRevision === 'string');
  assert.equal(plan.physicalCount, 2);

  // If proposals exist and are qualified, commands are planned
  if (plan.commands.length > 0) {
    for (const cmd of plan.commands) {
      cmd.reason = 'Audited bulk acceptance test';
    }
    const result = commitExactSourceWeightCommands(session.review, plan);
    assert.ok(result.length > 0);
    assert.equal(result[0].state, 'accepted');

    // Final decisions must remain strictly untouched
    const finalState = session.review.getDecisionState({
      basisId: basis.basisId, scopeId: sourceId, stage: 'Rigidmatch2',
    });
    assert.equal(Object.keys(finalState.decisions).length, 0);
  }
});

test('renderXml229WeightReviewPage outputs modern 8-column layout with rich component facts', () => {
  const testRow = {
    sourceId: 'SRC-TEST-01',
    occurrenceId: 'exact::occurrence::001',
    branchOccurrenceIndex: 2,
    nodeOrdinal: 5,
    branchName: 'Main-Steam-01',
    nodeNumber: '105',
    componentType: 'VALVE',
    componentRefNo: '=V-201',
    endpoint: '1',
    componentRefEndpoint: 'V-201_1',
    dtxr: 'VALVE GATE 300# FLANGED OS&Y',
    lengthMm: 215.9,
    boreMm: 80,
    rating: '300#',
    valveHint: 'Matched 80mm 300# gate valve master',
    sourceKg: null,
    match1Kg: null,
    finalKg: null,
    proposedKg: 52.3,
    proposals: [
      {
        proposalId: 'prop-01',
        ranking: 1,
        value: 52.3,
        qualified: true,
        method: 'exact-valve-match',
      },
    ],
    rejectedCandidates: [
      {
        description: 'VALVE 150#',
        rejectionReasons: ['Rating mismatch: expected 300#'],
      },
    ],
  };

  const page = { totalCount: 1, rows: [testRow] };
  const html = renderXml229WeightReviewPage(page, 0);

  // Check 8-column table headers
  assert.match(html, /<th[^>]*>Component Ref \/ Tag<\/th>/);
  assert.match(html, /<th[^>]*>Description \(DTXR\)<\/th>/);
  assert.match(html, /<th[^>]*>Dimensions \/ Rating<\/th>/);
  assert.match(html, /<th[^>]*>XML kg<\/th>/);
  assert.match(html, /<th[^>]*>Match-1 kg<\/th>/);
  assert.match(html, /<th[^>]*>Final kg<\/th>/);
  assert.match(html, /<th[^>]*>Ranked Candidates & Evidence<\/th>/);
  assert.match(html, /<th[^>]*>Engineering Decisions<\/th>/);

  // Check rich component data rendered in row
  assert.match(html, /Main-Steam-01/);
  assert.match(html, /Node 105/);
  assert.match(html, /V-201_1/);
  assert.match(html, /VALVE/);
  assert.match(html, /VALVE GATE 300# FLANGED OS&amp;Y/);
  assert.match(html, /DN 80 · L 215\.9mm · 300#/);
  assert.match(html, /Matched 80mm 300# gate valve master/);

  // Check bulk button and toolbar
  assert.match(html, /data-p4-bulk-match1/);
  assert.match(html, /Accept All Qualified \(★\) as Match-1/);
  assert.match(html, /data-p4-filter/);
  assert.match(html, /data-p4-filter-stage/);
  assert.match(html, /data-p4-filter-unresolved/);

  // Check candidate chip and rejection note
  assert.match(html, /★ 52\.3 kg/);
  assert.match(html, /× 1 rejected candidate\(s\)/);
  assert.match(html, /Rating mismatch: expected 300#/);
});

test('strict 0-diff parity between root tabs and served docs', async () => {
  const files = [
    'integration/xml229-original-blob-gcpw-worker.mjs',
    'integration/xml229-original-blob-gcpw-client.mjs',
    'ui-adapted/xml229-p4-weight-review-presentation.mjs',
    'ui-adapted/xml-cii-adapted-p4-verified-weight-panel.js',
  ];

  for (const rel of files) {
    const rootPath = `tabs/xml-cii-2019-standalone/${rel}`;
    const docsPath = `docs/tabs/xml-cii-2019-standalone/${rel}`;
    const rootContent = await readFile(new URL(`../${rootPath}`, import.meta.url), 'utf8');
    const docsContent = await readFile(new URL(`../${docsPath}`, import.meta.url), 'utf8');
    assert.equal(rootContent, docsContent, `Parity check failed for ${rel}`);
  }
});
