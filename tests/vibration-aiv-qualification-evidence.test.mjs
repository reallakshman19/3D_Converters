import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  AIV_D23_BENCHMARK_CASES,
  AIV_EI_D23_SOURCE,
  AIV_METHOD_TRACE_FOUNDATION,
  AIV_QUALIFICATION_EVIDENCE,
} from '../converters/vibration/aiv/aiv-qualification-evidence.js';

const ROOT = new URL('../', import.meta.url);
const source = (path) => fs.readFileSync(new URL(path, ROOT), 'utf8');

function benchmark(id) {
  return AIV_D23_BENCHMARK_CASES.find((row) => row.benchmarkId === id);
}

test('D.2.3 evidence is pinned to the controlled Common commit and blob', () => {
  assert.equal(AIV_EI_D23_SOURCE.repository, 'reallaksh19/Common');
  assert.equal(AIV_EI_D23_SOURCE.commit, 'fb549185b9b27edc2379734240320a85c5bef9f6');
  assert.equal(AIV_EI_D23_SOURCE.path, 'Energy-Institute-AVIFF---Worked-Examples.doc.docx');
  assert.equal(AIV_EI_D23_SOURCE.gitBlob, 'ceee15ed5f7f320045d5f3979024e2e8664613f2');
  assert.match(AIV_EI_D23_SOURCE.locator, /D\.2\.3 High Frequency Acoustic Excitation \(T2\.7\)/u);
  assert.equal(AIV_EI_D23_SOURCE.productionAuthority, false);
});

test('published relief source benchmark captures pressure basis, non-sonic SFF and source PWL', () => {
  const item = benchmark('AIV-EI-D2-3-RELIEF-SOURCE');
  assert.deepEqual(item.publishedInputs.upstreamPressure, { value: 98, unit: 'barg' });
  assert.deepEqual(item.publishedInputs.downstreamPressure, { value: 0, unit: 'barg' });
  assert.deepEqual(item.publishedInputs.publishedUpstreamPressureAbsolute, { value: 9.9, unit: 'MPa abs' });
  assert.deepEqual(item.publishedInputs.publishedDownstreamPressureAbsolute, { value: 0.1, unit: 'MPa abs' });
  assert.equal(item.publishedInputs.sonicState, 'NON_SONIC');
  assert.equal(item.publishedInputs.sonicFlowFactorDb, 0);
  assert.equal(item.publishedOutputs.sourcePwlDb, 164.7);
  assert.equal(item.tolerance.sourcePwlDb, 0.05);
});

test('published recycle benchmark records manufacturer trim as evidence rather than an engineering default', () => {
  const item = benchmark('AIV-EI-D2-3-RECYCLE-SOURCE');
  assert.deepEqual(item.publishedInputs.upstreamPressure, { value: 87, unit: 'barg' });
  assert.deepEqual(item.publishedInputs.downstreamPressure, { value: 25, unit: 'barg' });
  assert.equal(item.publishedOutputs.sourcePwlDb, 159.4);
  assert.deepEqual(item.publishedInputs.lowNoiseTrim.reduction, {
    value: 30, unit: 'dB', qualifier: 'approximately',
  });
});

test('relief discontinuity fixture captures verified intermediate chain but refuses to invent final LOF', () => {
  const item = benchmark('AIV-EI-D2-3-RELIEF-DISCONTINUITY');
  assert.deepEqual(item.publishedInputs.sourceToAssessmentDistance, { value: 0.8, unit: 'm' });
  assert.equal(item.publishedIntermediates.attenuationDb, 0.312);
  assert.equal(item.publishedIntermediates.assessmentPwlDb, 164.4);
  assert.equal(item.publishedIntermediates.log10N, 9.9026);
  assert.equal(item.publishedIntermediates.N, 7.99e9);
  assert.equal(item.publishedFinal, null);
  assert.equal(item.qualificationGap, 'FINAL_T2_6_LOF_NOT_YET_CAPTURED_FROM_CONTROLLED_SOURCE');
});

test('trace foundation keeps unqualified branches and production-equation source freeze explicit', () => {
  const byId = new Map(AIV_METHOD_TRACE_FOUNDATION.map((row) => [row.traceId, row]));
  assert.equal(byId.get('AIV-SRC-GAP-SONIC-SFF6').qualificationState, 'INDEPENDENT_BENCHMARK_REQUIRED');
  assert.equal(byId.get('AIV-SRC-GAP-MULTI-SOURCE').qualificationState, 'INDEPENDENT_BENCHMARK_REQUIRED');
  assert.equal(byId.get('AIV-EQ-GAP-MAIN-GUIDANCE').qualificationState, 'SOURCE_LOCATION_AND_ERRATA_FREEZE_REQUIRED');
  assert.equal(AIV_QUALIFICATION_EVIDENCE.productionEquationAuthorized, false);
  assert.equal(AIV_QUALIFICATION_EVIDENCE.authority.calculationState, 'BLOCKED');
});

test('qualification evidence is immutable and not imported by the production pending calculator', () => {
  assert(Object.isFrozen(AIV_QUALIFICATION_EVIDENCE));
  assert(Object.isFrozen(AIV_D23_BENCHMARK_CASES));
  assert(Object.isFrozen(AIV_D23_BENCHMARK_CASES[0].publishedInputs));
  const pending = source('converters/engineering-calculations/pending-definitions.js');
  assert.doesNotMatch(pending, /aiv-qualification-evidence/u);
  const fixtureSource = source('converters/vibration/aiv/aiv-qualification-evidence.js');
  assert.doesNotMatch(fixtureSource, /calculateEngineering|calculateAiv|Math\.log|Math\.pow|\*\*|=>\s*\{/u);
});
