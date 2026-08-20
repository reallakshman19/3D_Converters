import {
  AIV_DEFAULT_ASSUMPTION_PROFILE,
  validateAivAssumptionProfile,
} from './aiv-assumption-profile.js';
import {
  calculateAivKernelCandidatePointContribution,
  calculateAivKernelCandidateSource,
  combineAivKernelCandidatePointContributions,
} from './aiv-kernel-candidate.js';
import {
  AIV_LINE_AGGREGATION_RULE,
  aggregateAivAssessmentResultsToLineCases,
} from './aiv-line-aggregation.js';
import { validateAivScreeningProfile } from './aiv-screening-profile.js';
import { calculateAivT26Discontinuity } from './aiv-t26.js';

export const AIV_CALCULATOR_SCHEMA = 'AivCalculatorResult.v1';
export const AIV_CALCULATOR_STAGE_ORDER = Object.freeze([
  'VALIDATE_INPUT',
  'RESOLVE_INPUT',
  'EVALUATE_APPLICABILITY',
  'CALCULATE_SOURCE_PWL',
  'APPLY_SOURCE_MODIFIERS',
  'CALCULATE_POINT_ATTENUATION',
  'COMBINE_SIMULTANEOUS_SOURCES',
  'CALCULATE_DISCONTINUITY_RESULT',
  'AGGREGATE_LINE_CASE_RESULT',
  'ASSESS_RESULT',
]);

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function profileNumber(profile, key) {
  const value = Number(profile?.benchmark?.[key]);
  if (!Number.isFinite(value)) throw new TypeError(`AIV benchmark requires finite benchmark.${key}.`);
  return value;
}

function profileValidation(profile, qualificationMode) {
  return qualificationMode === 'screening'
    ? validateAivScreeningProfile(profile)
    : validateAivAssumptionProfile(profile);
}

function difference(actual, expected, tolerance) {
  const delta = Math.abs(actual - expected);
  return { expected, actual, delta, tolerance, status: delta <= tolerance ? 'MATCH' : 'MISMATCH' };
}

function benchmarkTrace(t26, profile, qualificationMode) {
  if (qualificationMode !== 'benchmark') return null;
  const publishedFLM1 = profileNumber(profile, 'flm1Published');
  const FLM1ToleranceAbs = profileNumber(profile, 'flm1ToleranceAbs');
  return {
    publishedFLM1,
    FLM1Variance: Math.abs(t26.FLM1 - publishedFLM1),
    FLM1ToleranceAbs,
    d23ExpectedLof: profileNumber(profile, 'd23FirstDiscontinuityLof'),
    lofToleranceAbs: profileNumber(profile, 'lofToleranceAbs'),
  };
}

function assessmentLine(exchange, assessmentId) {
  return exchange?.elements?.find((item) => item.canonicalId === assessmentId)?.line ?? null;
}

function resultAuthority(qualificationMode) {
  const screening = qualificationMode === 'screening';
  return Object.freeze({
    calculationState: 'IMPLEMENTED',
    qualificationState: screening ? 'SCREENING' : 'BENCHMARK_ONLY',
    engineeringAuthority: screening ? 'SCREENING' : 'BENCHMARK_ONLY',
    productionEquationAuthorized: true,
    screeningAuthority: screening ? 'AUTHORIZED' : 'NOT_AUTHORIZED',
    designAuthority: false,
  });
}

function inventoryState(summaries) {
  if (!summaries.length) return 'UNVERIFIED';
  const verified = summaries.filter((item) => item.assessmentInventoryCompleteness === 'VERIFIED_COMPLETE').length;
  if (verified === summaries.length) return 'VERIFIED_COMPLETE';
  return verified > 0 ? 'PARTIAL' : 'UNVERIFIED';
}

function assessmentResult(combined, assessment, exchange, profile, qualificationMode, authority) {
  const sourceT26 = calculateAivT26Discontinuity({ pointPwlDb: combined.combinedPointPwlDb, assessment });
  const benchmark = benchmarkTrace(sourceT26, profile, qualificationMode);
  const t26 = benchmark ? { ...sourceT26, ...benchmark } : sourceT26;
  return {
    schema: 'AivAssessmentResult.v1',
    resultScope: 'ASSESSMENT',
    calculationId: 'VIB.AIV.ACOUSTIC',
    status: qualificationMode === 'screening' ? 'SCREENING_CALCULATED' : 'BENCHMARK_CALCULATED',
    assessmentCanonicalId: combined.assessmentCanonicalId,
    assessmentType: assessment.assessmentType,
    line: assessmentLine(exchange, combined.assessmentCanonicalId),
    caseId: combined.caseId,
    contributingSourceCanonicalIds: combined.sourceCanonicalIds,
    combinedPointPwlDb: combined.combinedPointPwlDb,
    t26Intermediates: t26,
    lof: t26.lof,
    comparison: benchmark ? difference(t26.lof, benchmark.d23ExpectedLof, benchmark.lofToleranceAbs) : null,
    authority,
  };
}

export function calculateAiv({
  sources = [],
  assessments = [],
  relationships = [],
  exchange = null,
  assumptionProfile = AIV_DEFAULT_ASSUMPTION_PROFILE,
  qualificationMode = 'benchmark',
  inventoryCompletenessAttestations = [],
  engineeringInputRevision = null,
} = {}) {
  if (!['benchmark', 'screening'].includes(qualificationMode)) {
    throw new RangeError('AIV qualificationMode must be benchmark or screening.');
  }
  const validation = profileValidation(assumptionProfile, qualificationMode);
  if (!validation.valid) throw new TypeError('AIV calculator requires a valid assumption profile for the selected qualification mode.');
  if (!Array.isArray(sources) || !sources.length) throw new TypeError('AIV calculator requires at least one source.');
  if (!Array.isArray(assessments) || !assessments.length) throw new TypeError('AIV calculator requires at least one assessment.');
  if (!Array.isArray(relationships) || !relationships.length) throw new TypeError('AIV calculator requires at least one source-to-assessment relationship.');
  if (!Array.isArray(inventoryCompletenessAttestations)) throw new TypeError('AIV inventory completeness attestations must be an array.');
  const authority = resultAuthority(qualificationMode);
  const sourceCandidates = sources.map(calculateAivKernelCandidateSource);
  const sourceMap = new Map(sourceCandidates.map((item) => [`${item.sourceCanonicalId}\u0000${item.caseId}`, item]));
  const assessmentMap = new Map(assessments.map((item) => [item.assessmentCanonicalId, item]));
  const contributions = relationships
    .filter((item) => item.applicabilityDisposition === 'APPLICABLE')
    .map((relationship) => calculateAivKernelCandidatePointContribution({
      sourceResult: sourceMap.get(`${relationship.sourceCanonicalId}\u0000${relationship.caseId}`),
      relationship,
      assessment: assessmentMap.get(relationship.assessmentCanonicalId),
    }));
  const grouped = new Map();
  for (const item of contributions) {
    const key = JSON.stringify([item.assessmentCanonicalId, item.caseId]);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(item);
  }
  const assessmentResults = [...grouped.values()].map((rows) => {
    const combined = combineAivKernelCandidatePointContributions(rows);
    return assessmentResult(
      combined,
      assessmentMap.get(combined.assessmentCanonicalId),
      exchange,
      assumptionProfile,
      qualificationMode,
      authority,
    );
  });
  const lineCaseSummaries = aggregateAivAssessmentResultsToLineCases(assessmentResults, {
    qualificationMode,
    topology: exchange,
    inventoryCompletenessAttestations,
    engineeringInputRevision,
  });
  const sourceResults = sourceCandidates.map((item) => ({
    schema: 'AivSourceResult.v1',
    resultScope: 'SOURCE',
    calculationId: 'VIB.AIV.ACOUSTIC',
    status: qualificationMode === 'screening' ? 'SCREENING_CALCULATED' : 'BENCHMARK_CALCULATED',
    sourceCanonicalId: item.sourceCanonicalId,
    caseId: item.caseId,
    rawSourcePwlDb: item.rawSourcePwlDb,
    sonicFlowFactorDb: item.sonicFlowFactorDb,
    trimReductionDb: item.trimReductionDb,
    effectiveSourcePwlDb: item.effectiveSourcePwlDb,
    authority,
    trace: item.trace,
  }));
  return deepFreeze({
    schema: AIV_CALCULATOR_SCHEMA,
    methodId: 'VIB.AIV.ACOUSTIC',
    status: qualificationMode === 'screening' ? 'SCREENING_CALCULATED' : 'BENCHMARK_CALCULATED',
    qualificationMode,
    stageOrder: AIV_CALCULATOR_STAGE_ORDER,
    implementedStageCount: AIV_CALCULATOR_STAGE_ORDER.length,
    sourceResults,
    assessmentResults,
    lineCaseSummaries,
    screeningResultScope: 'ASSESSMENT',
    lineCaseAggregationRuleId: AIV_LINE_AGGREGATION_RULE.ruleId,
    lineCaseAggregationRuleQualification: AIV_LINE_AGGREGATION_RULE.qualification.reductionRule,
    lineCaseAssessmentInventoryCompleteness: inventoryState(lineCaseSummaries),
    lineCaseSummaryAuthoritativeForScreening: false,
    universalClassificationProduced: false,
    engineeringInputRevision: Number.isSafeInteger(Number(engineeringInputRevision)) ? Number(engineeringInputRevision) : null,
    assumptionProfile,
    profileValidation: validation,
    authority,
  });
}
