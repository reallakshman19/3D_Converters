import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { parseAivAssessmentCsv } from '../converters/vibration/aiv/assessment-csv.js';
import { AIV_DEFAULT_ASSUMPTION_PROFILE } from '../converters/vibration/aiv/aiv-assumption-profile.js';
import { AIV_LINE_AGGREGATION_RULE_ID } from '../converters/vibration/aiv/aiv-line-aggregation.js';
import { parseAivSourceCsv } from '../converters/vibration/aiv/source-csv.js';
import { parseAivSourceAssessmentCsv } from '../converters/vibration/aiv/source-assessment-csv.js';
import { serializeAivInputTable } from '../tabs/vibration-aiv-input-model.js';
import { buildLoadedAivD23Benchmark } from '../tabs/vibration-aiv-benchmarks.js';
import { runAivAutoProductPath } from './aiv-auto-product-path.mjs';

export const AIV_D23_PRODUCT_PATH_RECEIPT_SCHEMA = 'AivProductPathBenchmarkParityReceipt.v1';

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function numericCheck(id, label, expected, actual, tolerance, scope) {
  const delta = Math.abs(actual - expected);
  return { id, label, scope, expected, actual, delta, tolerance, status: delta <= tolerance ? 'PASS' : 'FAIL' };
}

function exactCheck(id, label, expected, actual, scope) {
  return { id, label, scope, expected, actual, delta: expected === actual ? 0 : null, tolerance: 0, status: expected === actual ? 'PASS' : 'FAIL' };
}

export function runAivD23ProductPathValidation() {
  const loaded = buildLoadedAivD23Benchmark();
  const sources = parseAivSourceCsv(serializeAivInputTable(loaded.tables.sources));
  const assessments = parseAivAssessmentCsv(serializeAivInputTable(loaded.tables.assessments));
  const relationships = parseAivSourceAssessmentCsv(serializeAivInputTable(loaded.tables.relationships));
  const result = runAivAutoProductPath({
    sources,
    assessments,
    relationships,
    exchange: loaded.topology,
    assumptionProfile: AIV_DEFAULT_ASSUMPTION_PROFILE,
  });
  const relief = result.sourceResults.find((item) => item.sourceCanonicalId === 'AIV-D23-RELIEF-SOURCE');
  const recycle = result.sourceResults.find((item) => item.sourceCanonicalId === 'AIV-D23-RECYCLE-SOURCE');
  const assessment = result.assessmentResults.find((item) => item.assessmentCanonicalId === 'AIV-D23-WELDOLET-01');
  const line = result.lineCaseSummaries.find((item) => item.line === 'D2.3 Relief line');
  const workedExampleLineReference = Number(AIV_DEFAULT_ASSUMPTION_PROFILE.benchmark.workedExampleReliefLineLof);
  const t26 = assessment.t26Intermediates;
  const point = assessment.sourceContributionsAtPoint[0];
  const checks = [
    numericCheck('01', 'Relief raw source PWL', 164.7, relief.rawSourcePwlDb, 0.05, 'SOURCE'),
    numericCheck('02', 'Recycle raw source PWL', 159.4, recycle.rawSourcePwlDb, 0.05, 'SOURCE'),
    numericCheck('03', 'Recycle effective PWL after 30 dB trim', 129.36, recycle.effectiveSourcePwlDb, 0.05, 'SOURCE'),
    numericCheck('04', 'Relief attenuation to first discontinuity', 0.312, point.attenuationDb, 0.001, 'ASSESSMENT'),
    numericCheck('05', 'Relief first-discontinuity point PWL', 164.4, assessment.combinedPointPwlDb, 0.05, 'ASSESSMENT'),
    numericCheck('06', 'Source-calculated A', 0.9398945187723486, t26.A, 1e-12, 'ASSESSMENT'),
    numericCheck('07', 'Source-calculated S', 68.22911392405064, t26.S, 1e-12, 'ASSESSMENT'),
    numericCheck('08', 'Source-calculated B', 152.1928034126211, t26.B, 1e-9, 'ASSESSMENT'),
    numericCheck('09', 'Errata log10(N) from calculated B', 9.90669538761722, t26.log10N, 1e-10, 'ASSESSMENT'),
    numericCheck('10', 'Fatigue cycles N from calculated B', 8066690373.984148, t26.N, 2, 'ASSESSMENT'),
    numericCheck('11', 'Dext/dext ratio', 2.7910447761194033, t26.diameterRatio, 1e-12, 'ASSESSMENT'),
    numericCheck('12', 'Source-calculated FLM1', 1.2109758194311824, t26.FLM1, 1e-12, 'ASSESSMENT'),
    numericCheck('13', 'Published FLM1 retained as benchmark oracle only', 1.2133, t26.publishedFLM1, 1e-12, 'BENCHMARK_REFERENCE'),
    exactCheck('14', 'Published FLM1 variance remains within frozen reconciliation tolerance', true, t26.FLM1Variance <= t26.FLM1ToleranceAbs, 'BENCHMARK_REFERENCE'),
    numericCheck('15', 'Weldolet FLM2', 0.2009306328510857, t26.FLM2, 1e-12, 'ASSESSMENT'),
    exactCheck('16', 'Weldolet FLM2 branch applied', true, t26.FLM2Applied, 'ASSESSMENT'),
    exactCheck('17', 'Non-duplex FLM3 branch not applied', false, t26.FLM3Applied, 'ASSESSMENT'),
    numericCheck('18', 'Non-duplex FLM3 multiplier', 1, t26.FLM3, 0, 'ASSESSMENT'),
    numericCheck('19', 'N after source-calculated FLM1', 9768566985.733084, t26.NAfterFLM1, 2, 'ASSESSMENT'),
    numericCheck('20', 'N after Weldolet FLM2', 1962804346.4915712, t26.NAfterFLM2, 2, 'ASSESSMENT'),
    numericCheck('21', 'N after material branch', 1962804346.4915712, t26.NAfterFLM3, 2, 'ASSESSMENT'),
    numericCheck('22', 'Raw fatigue factor', 0.3118874980174784, t26.LfRaw, 1e-12, 'ASSESSMENT'),
    numericCheck('23', 'Clamped fatigue factor', 0.3118874980174784, t26.Lf, 1e-12, 'ASSESSMENT'),
    numericCheck('24', 'First-discontinuity LOF', 0.29, assessment.lof, 1e-12, 'ASSESSMENT'),
    exactCheck('25', 'Line result scope remains separate from assessment result scope', true, line.valuesAreNotInterchangeable, 'LINE_CASE_SUMMARY'),
    numericCheck('26', 'Derived line candidate from available discontinuity inventory', 0.29, line.lof, 1e-12, 'LINE_CASE_SUMMARY'),
    exactCheck('27', 'Line reduction uses EI T2.7 greatest-discontinuity rule', AIV_LINE_AGGREGATION_RULE_ID, line.aggregationBasis, 'LINE_CASE_SUMMARY'),
    exactCheck('28', 'Derived line candidate remains non-authoritative for screening', false, line.authoritativeForScreening, 'LINE_CASE_SUMMARY'),
    numericCheck('29', 'Frozen full worked-example relief-line reference remains 1.48', 1.48, workedExampleLineReference, 1e-12, 'BENCHMARK_REFERENCE'),
    exactCheck('30', 'All 10 stages executed', 10, result.implementedStageCount, 'METHOD'),
    exactCheck('31', 'No universal operating classification emitted', false, result.universalClassificationProduced, 'METHOD'),
    exactCheck('32', 'T2.6 source binding uses merged Advanced_Analysis correction', 'ca53d589b79fc34f5a5616c0ce7de00e06c13df4', t26.sourceBinding.sourceMergeCommit, 'SOURCE_BINDING'),
  ];
  const failed = checks.filter((item) => item.status === 'FAIL');
  return deepFreeze({
    schema: AIV_D23_PRODUCT_PATH_RECEIPT_SCHEMA,
    methodId: 'VIB.AIV.ACOUSTIC',
    benchmarkId: loaded.benchmark.id,
    releaseTarget: 'BENCHMARK_ONLY',
    status: failed.length ? 'FAIL' : 'PASS',
    completeKernelStageCount: result.implementedStageCount,
    resultContractsValidated: result.sourceResults.every((item) => item.schema === 'AivSourceResult.v1')
      && result.assessmentResults.every((item) => item.schema === 'AivAssessmentResult.v1')
      && result.lineCaseSummaries.every((item) => item.schema === 'AivLineCaseSummary.v1'),
    sourceAssessmentLineScopesValidated: assessment.resultScope === 'ASSESSMENT'
      && line.resultScope === 'LINE_CASE_SUMMARY'
      && line.aggregationBasis === AIV_LINE_AGGREGATION_RULE_ID
      && line.authoritativeForScreening === false,
    counts: { checks: checks.length, passed: checks.length - failed.length, failed: failed.length },
    checks,
    resultSnapshot: {
      reliefRawSourcePwlDb: relief.rawSourcePwlDb,
      recycleRawSourcePwlDb: recycle.rawSourcePwlDb,
      recycleEffectiveSourcePwlDb: recycle.effectiveSourcePwlDb,
      attenuationDb: point.attenuationDb,
      firstDiscontinuityPointPwlDb: assessment.combinedPointPwlDb,
      t26,
      firstDiscontinuityLof: assessment.lof,
      reliefLineCandidateLof: line.lof,
      reliefLineCandidateAuthority: line.authoritativeForScreening,
      assessmentInventoryCompleteness: line.assessmentInventoryCompleteness,
    },
    benchmarkReferences: {
      workedExampleReliefLineLof: workedExampleLineReference,
      publishedFlm1: t26.publishedFLM1,
      role: 'BENCHMARK_ORACLE_ONLY',
    },
    assumptions: {
      profileSchema: AIV_DEFAULT_ASSUMPTION_PROFILE.schema,
      stage8RuntimeModel: 'SOURCE_CALCULATED_T2_6',
      benchmarkIntermediatesRuntimeInput: false,
      lineLofDerivedFromAssessmentResults: true,
      workedExampleLineLofRuntimeInput: false,
      humanEvidenceRequired: false,
    },
    authorityTransitionApplied: false,
    calculationState: 'IMPLEMENTED',
    qualificationState: 'QUALIFIED_REDUCTION_RULE',
    screeningAuthority: 'NOT_AUTHORIZED',
    screeningAuthorityBlocker: 'AIV_WELDED_DISCONTINUITY_INVENTORY_COMPLETENESS_UNPROVEN',
    designAuthority: false,
  });
}

const invokedAsScript = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (invokedAsScript) process.stdout.write(`${JSON.stringify(runAivD23ProductPathValidation(), null, 2)}\n`);
