import assert from 'node:assert/strict';
import test from 'node:test';

import { buildRegexSampleBuckets } from '../tabs/xml-cii-2019-standalone/xml-cii-regex-sample-buckets.js';
import { selectRegexAnalysisBuckets } from '../tabs/xml-cii-2019-standalone/xml-cii-regex-analysis-buckets.js';
import {
  buildRegexBoundedEvidencePlan,
  resolveRegexBoundedDatasetEvidence,
} from '../tabs/xml-cii-2019-standalone/xml-cii-regex-bounded-evidence.js';
import { buildRegexSuggestionPreflight } from '../tabs/xml-cii-2019-standalone/xml-cii-regex-smart-suggestions.js';

function config() {
  return {
    activeFormatIndex: 0,
    formats: [{
      tokenDelimiter: '-',
      lineKey: { tokenPosition: '' },
      pipingClass: { tokenPosition: '' },
      rating: { tokenPosition: '' },
      bore: { tokenPosition: '' },
    }, {}],
    ratingSequence: [],
  };
}

function lineKeyReceipt(sampleCount, loadedCount) {
  const branchSamples = Array.from({ length: sampleCount }, (_, index) => ({
    branchName: `/GLRD-1000-6"-P${String(4110001 + index)}-93833-01/B${index + 1}`,
  }));
  return buildRegexSuggestionPreflight({
    branchSamples,
    extractionConfig: config(),
    masterContext: {
      lineRows: Array.from({ length: loadedCount }, (_, index) => ({ lineKey: `P${String(4110001 + index)}` })),
      pipingClassRows: [{ pipingClass: '93833' }],
      rowCounts: { lineList: loadedCount, pipingClass: 1 },
    },
    currentResult: { matchedRows: [], rejectedRows: branchSamples },
  });
}

test('line-key confidence is separate from exact master coverage', () => {
  const receipt = lineKeyReceipt(4, 2);
  const lineKey = receipt.suggestions.find((item) => item.role === 'lineKey');
  assert.ok(lineKey, 'line-key suggestion should be visible at the 50% display threshold');
  assert.deepEqual(lineKey.tokenPositions, [4]);
  assert.equal(lineKey.sampleCount, 4);
  assert.equal(lineKey.evidenceMetrics.exactMasterRate, 0.5);
  assert.equal(lineKey.evidenceMetrics.uniquenessRate, 1);
  assert.equal(lineKey.evidenceMetrics.shapeRate, 1);
  assert.equal(lineKey.confidence, 0.7, '0.72×0.50 + 0.16×1.00 + 0.18×1.00 = 0.70');
  assert.notEqual(lineKey.confidence, lineKey.evidenceMetrics.exactMasterRate);
  assert.equal(lineKey.authorityLevel, 'PARTIAL_MASTER_EVIDENCE');
});

test('high composite confidence cannot auto-promote partial master evidence', () => {
  const partial = lineKeyReceipt(5, 4).suggestions.find((item) => item.role === 'lineKey');
  assert.ok(partial.confidence > 0.9, '80% exact + unique structural evidence should exceed the numeric safe threshold');
  assert.equal(partial.evidenceMetrics.exactMasterRate, 0.8);
  assert.equal(partial.authorityLevel, 'PARTIAL_MASTER_EVIDENCE');
  assert.equal(partial.safe, false);
  assert.equal(partial.review, true);

  const complete = lineKeyReceipt(5, 5).suggestions.find((item) => item.role === 'lineKey');
  assert.equal(complete.evidenceMetrics.exactMasterRate, 1);
  assert.equal(complete.authorityLevel, 'AUTHORIZED_MASTER');
  assert.equal(complete.safe, true);
});

test('sample buckets expose one representative per structural signature without changing sample totals', () => {
  const samples = [
    { branchName: '/GLRD-1000-6"-P4110001-93833-01/B1' },
    { branchName: '/GLRD-1000-8"-P4110002-93833-02/B2' },
    { branchName: '/GLRD-1000-8"-P4110002-93833-02/B2' }, // duplicate source sample
    { branchName: '/AREA-DN100-P4110003-93833/B3' },
    { branchName: '/AREA-DN150-P4110004-93833/B4' },
  ];
  const buckets = buildRegexSampleBuckets(samples, '-');
  assert.equal(buckets.length, 2);
  assert.equal(buckets.reduce((sum, bucket) => sum + bucket.count, 0), 4, 'duplicate branch names are counted once, matching Regex Tester unique samples');
  assert.deepEqual(buckets.map((bucket) => bucket.count).sort((a, b) => b - a), [2, 2]);
  for (const bucket of buckets) {
    assert.ok(bucket.representative);
    assert.ok(bucket.members.includes(bucket.representative));
    assert.equal(bucket.members.length, bucket.count);
  }
});


test('analysis policy selects the dominant one or two buckets by count then first-seen', () => {
  const samples = [
    ...Array.from({ length: 3 }, (_, index) => ({ branchName: `/ASIM-1885-PL-${3 + index * 3}"-S8810009-91261M7-0${index + 1}/B1` })),
    { branchName: '/ASIM-1885-PL-12"-S8810100-HOT-01/B8' },
    { branchName: '/ASIM-1885-PL-10"-S8810105-HOT-01/B3' },
    { branchName: '/AREA-DN100-P4110003-93833/B3' },
    { branchName: '/OTHER-X-1/B1' },
  ];
  const selection = selectRegexAnalysisBuckets(samples, '-');
  assert.equal(selection.sourceSampleCount, 7);
  assert.equal(selection.structuralBucketCount, 4);
  assert.equal(selection.selectedBucketCount, 2);
  assert.equal(selection.selectedSampleCount, 5);
  assert.equal(selection.selectedBuckets[0].count, 3);
  assert.equal(selection.selectedBuckets[1].count, 2);
  assert.equal(selection.selectedBuckets[0].firstSeen, 0);
  assert.equal(selection.selectedBuckets[1].firstSeen, 3);
  assert.equal(selection.samples.some((row) => row.branchName.includes('AREA-DN100')), false);
});

test('analysis policy uses one bucket when the structural population has one family', () => {
  const samples = [
    { branchName: '/ASIM-1885-PL-3"-S8810009-91261M7-01/B1' },
    { branchName: '/ASIM-1885-PL-6"-S8810010-91261M7-01/B2' },
  ];
  const selection = selectRegexAnalysisBuckets(samples, '-');
  assert.equal(selection.structuralBucketCount, 1);
  assert.equal(selection.selectedBucketCount, 1);
  assert.equal(selection.selectedSampleCount, 2);
});


test('bounded evidence plan derives queries only from the selected top buckets', () => {
  const samples = [
    ...Array.from({ length: 3 }, (_, index) => ({ branchName: `/ASIM-1885-PL-${3 + index * 3}"-S8810009-91261M7-0${index + 1}/B1` })),
    { branchName: '/ASIM-1885-PL-12"-S8810100-HOT-01/B8' },
    { branchName: '/ASIM-1885-PL-10"-S8810105-HOT-01/B3' },
    { branchName: '/AREA-DN100-P4110003-93833/B3' },
  ];
  const plan = buildRegexBoundedEvidencePlan({
    branchSamples: samples,
    extractionConfig: config(),
    profile: { formatPolicy: { maximumLineKeyTokens: 3 }, normalization: { classSuffixPattern: '(?:M[0-9A-Z]+)$' } },
  });
  assert.equal(plan.analysis.selectedBucketCount, 2);
  assert.equal(plan.analysis.selectedSampleCount, 5);
  assert.ok(plan.lineListQueries.includes('S8810009'));
  assert.ok(plan.lineListQueries.includes('S8810100'));
  assert.equal(plan.lineListQueries.some((value) => value.includes('P4110003')), false);
  assert.ok(plan.pipingClassQueries.includes('91261M7'));
  assert.ok(plan.pipingClassQueries.includes('91261'));
  assert.equal(plan.pipingClassQueries.includes('93833'), false);
});

test('bounded dataset evidence caps broad worker search results and fetches indexes only', async () => {
  const searches = [];
  const fetched = [];
  const search = async (_masterKey, _datasetId, query) => {
    searches.push(query);
    if (query === 'A10000') return { indexes: Array.from({ length: 500 }, (_, index) => index) };
    return { indexes: [800, 801] };
  };
  const getRowsByIndexes = async (_masterKey, _datasetId, indexes) => {
    fetched.push(...indexes);
    return { rows: indexes.map((index) => ({ index })) };
  };
  const result = await resolveRegexBoundedDatasetEvidence({
    masterKey: 'lineList',
    datasetRef: { datasetId: 'line-dataset', rowCount: 100000 },
    queries: ['A10000', 'B10000'],
    search,
    getRowsByIndexes,
    maxIndexesPerQuery: 8,
    maxTotalIndexes: 20,
  });
  assert.deepEqual(searches, ['A10000', 'B10000']);
  assert.equal(result.queryCount, 2);
  assert.equal(result.truncatedQueryCount, 1);
  assert.equal(result.totalIndexOverflow, false);
  assert.equal(result.rowIndexCount, 10);
  assert.equal(result.rows.length, 10);
  assert.equal(fetched.length, 10);
  assert.equal(fetched.includes(499), false, 'broad search must not hydrate all 500 matches');
});
