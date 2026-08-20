import assert from 'node:assert/strict';
import test from 'node:test';
import { parseAivAssessmentCsv } from '../converters/vibration/aiv/assessment-csv.js';
import { createAivAssumptionProfile } from '../converters/vibration/aiv/aiv-assumption-profile.js';
import { AIV_LINE_AGGREGATION_RULE_ID } from '../converters/vibration/aiv/aiv-line-aggregation.js';
import { parseAivSourceCsv } from '../converters/vibration/aiv/source-csv.js';
import { parseAivSourceAssessmentCsv } from '../converters/vibration/aiv/source-assessment-csv.js';
import { serializeAivInputTable } from '../tabs/vibration-aiv-input-model.js';
import { buildLoadedAivD23Benchmark } from '../tabs/vibration-aiv-benchmarks.js';
import { runAivAutoProductPath } from '../scripts/aiv-auto-product-path.mjs';
import { runAivD23ProductPathValidation } from '../scripts/run-aiv-d23-product-path-validation.mjs';

function parsedBenchmark(profile) {
  const loaded = buildLoadedAivD23Benchmark();
  return runAivAutoProductPath({
    sources: parseAivSourceCsv(serializeAivInputTable(loaded.tables.sources)),
    assessments: parseAivAssessmentCsv(serializeAivInputTable(loaded.tables.assessments)),
    relationships: parseAivSourceAssessmentCsv(serializeAivInputTable(loaded.tables.relationships)),
    exchange: loaded.topology,
    assumptionProfile: profile,
  });
}

test('AUTO product path executes all 10 stages and preserves result scopes', () => {
  const result = parsedBenchmark(createAivAssumptionProfile());
  assert.equal(result.implementedStageCount, 10);
  assert.deepEqual(result.stageOrder, [
    'VALIDATE_INPUT', 'RESOLVE_INPUT', 'EVALUATE_APPLICABILITY', 'CALCULATE_SOURCE_PWL',
    'APPLY_SOURCE_MODIFIERS', 'CALCULATE_POINT_ATTENUATION', 'COMBINE_SIMULTANEOUS_SOURCES',
    'CALCULATE_DISCONTINUITY_RESULT', 'AGGREGATE_LINE_CASE_RESULT', 'ASSESS_RESULT',
  ]);
  assert.equal(result.sourceResults.length, 2);
  assert.equal(result.assessmentResults.length, 1);
  assert.equal(result.lineCaseSummaries.length, 1);
  assert.equal(result.sourceResults[0].schema, 'AivSourceResult.v1');
  assert.equal(result.assessmentResults[0].schema, 'AivAssessmentResult.v1');
  assert.equal(result.lineCaseSummaries[0].schema, 'AivLineCaseSummary.v1');
  assert.equal(result.assessmentResults[0].resultScope, 'ASSESSMENT');
  assert.equal(result.lineCaseSummaries[0].resultScope, 'LINE_CASE_SUMMARY');
  assert.equal(result.lineCaseSummaries[0].valuesAreNotInterchangeable, true);
  assert.equal(result.lineCaseSummaries[0].authoritativeForScreening, false);
  assert.equal(result.universalClassificationProduced, false);
});

test('D.2.3 AUTO stage 8 calculates T2.6 from the actual assessment rather than configured intermediates', () => {
  const result = parsedBenchmark(createAivAssumptionProfile());
  const assessment = result.assessmentResults[0];
  const t26 = assessment.t26Intermediates;
  assert.ok(Math.abs(assessment.combinedPointPwlDb - 164.3734876408508) < 1e-10);
  assert.ok(Math.abs(t26.A - 0.9398945187723486) < 1e-12);
  assert.ok(Math.abs(t26.S - 68.22911392405064) < 1e-12);
  assert.ok(Math.abs(t26.B - 152.1928034126211) < 1e-9);
  assert.ok(Math.abs(t26.log10N - 9.90669538761722) < 1e-10);
  assert.ok(Math.abs(t26.N - 8066690373.984148) < 2);
  assert.ok(Math.abs(t26.calculatedFLM1FromGeometry - 1.2109758194311824) < 1e-12);
  assert.equal(t26.FLM1, 1.2109758194311824);
  assert.equal(t26.FLM1Mode, 'SOURCE_CALCULATED');
  assert.equal(t26.publishedFLM1, 1.2133);
  assert.ok(t26.FLM1Variance < t26.FLM1ToleranceAbs);
  assert.ok(Math.abs(t26.FLM2 - 0.2009306328510857) < 1e-12);
  assert.equal(t26.FLM3, 1);
  assert.ok(Math.abs(t26.NAfterFLM1 - 9768566985.733084) < 2);
  assert.ok(Math.abs(t26.NAfterFLM2 - 1962804346.4915712) < 2);
  assert.ok(Math.abs(t26.Lf - 0.3118874980174784) < 1e-12);
  assert.equal(assessment.lof, 0.29);
});

test('benchmark intermediates remain oracle evidence and cannot override T2.6 runtime calculation', () => {
  const profile = createAivAssumptionProfile({
    benchmark: {
      publishedA: '999',
      publishedS: '999',
      publishedB: '999',
      flm1Mode: 'PUBLISHED',
      flm1Published: '9.999',
      workedExampleReliefLineLof: '1.55',
    },
  });
  const result = parsedBenchmark(profile);
  const t26 = result.assessmentResults[0].t26Intermediates;
  assert.equal(t26.FLM1, 1.2109758194311824);
  assert.equal(t26.publishedFLM1, 9.999);
  assert.ok(t26.FLM1Variance > t26.FLM1ToleranceAbs);
  assert.ok(Math.abs(t26.B - 152.1928034126211) < 1e-9);
  assert.equal(result.assessmentResults[0].lof, 0.29);
  assert.equal(result.lineCaseSummaries[0].lof, 0.29);
  assert.equal(result.lineCaseSummaries[0].aggregationBasis, AIV_LINE_AGGREGATION_RULE_ID);
  assert.equal(result.lineCaseSummaries[0].assessmentInventoryCompleteness, 'UNVERIFIED');
});

test('stepwise D.2.3 product-path validation keeps published values as oracle-only evidence', () => {
  const receipt = runAivD23ProductPathValidation();
  assert.equal(receipt.schema, 'AivProductPathBenchmarkParityReceipt.v1');
  assert.equal(receipt.status, 'PASS');
  assert.deepEqual(receipt.counts, { checks: 32, passed: 32, failed: 0 });
  assert.equal(receipt.completeKernelStageCount, 10);
  assert.equal(receipt.resultContractsValidated, true);
  assert.equal(receipt.sourceAssessmentLineScopesValidated, true);
  assert.equal(receipt.resultSnapshot.reliefLineCandidateLof, 0.29);
  assert.equal(receipt.benchmarkReferences.workedExampleReliefLineLof, 1.48);
  assert.equal(receipt.assumptions.stage8RuntimeModel, 'SOURCE_CALCULATED_T2_6');
  assert.equal(receipt.assumptions.benchmarkIntermediatesRuntimeInput, false);
  assert.equal(receipt.assumptions.lineLofDerivedFromAssessmentResults, true);
  assert.equal(receipt.assumptions.workedExampleLineLofRuntimeInput, false);
  assert.equal(receipt.authorityTransitionApplied, false);
  assert.equal(receipt.screeningAuthority, 'NOT_AUTHORIZED');
});
