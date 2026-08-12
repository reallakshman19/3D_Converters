import { AIV_T2_6_ERRATA_FEED_EQUATION } from '../converters/vibration/aiv/aiv-errata-evidence.js';
import {
  AIV_KERNEL_CANDIDATE_AUTHORITY,
  calculateAivKernelCandidatePointContribution,
  calculateAivKernelCandidateSource,
  combineAivKernelCandidatePointContributions,
} from '../converters/vibration/aiv/aiv-kernel-candidate.js';
import {
  AIV_DEFAULT_ASSUMPTION_PROFILE,
  validateAivAssumptionProfile,
} from '../converters/vibration/aiv/aiv-assumption-profile.js';
import {
  qualificationErrataLog10N,
  qualificationFatigueFactor,
  qualificationFinalLofFromLf,
  qualificationFlm1,
  qualificationFlm2,
} from './aiv-qualification-math.mjs';

export const AIV_AUTO_PRODUCT_PATH_SCHEMA = 'AivAutoProductPathResult.v1';
export const AIV_AUTO_PRODUCT_STAGE_ORDER = Object.freeze([
  'VALIDATE_INPUT', 'RESOLVE_INPUT', 'EVALUATE_APPLICABILITY', 'CALCULATE_SOURCE_PWL',
  'APPLY_SOURCE_MODIFIERS', 'CALCULATE_POINT_ATTENUATION', 'COMBINE_SIMULTANEOUS_SOURCES',
  'CALCULATE_DISCONTINUITY_RESULT', 'AGGREGATE_LINE_CASE_RESULT', 'ASSESS_RESULT',
]);

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function profileNumber(profile, key) {
  const value = Number(profile?.benchmark?.[key]);
  if (!Number.isFinite(value)) throw new TypeError(`AIV AUTO product path requires finite benchmark.${key}.`);
  return value;
}

function quantityMm(quantity, field) {
  const value = Number(quantity?.value);
  const unit = String(quantity?.unit ?? '').trim();
  if (!(value > 0)) throw new TypeError(`AIV AUTO product path requires positive ${field}.`);
  if (unit === 'mm') return value;
  if (unit === 'm') return value * 1000;
  throw new TypeError(`AIV AUTO product path ${field} must use mm or m.`);
}

function difference(actual, expected, tolerance) {
  const delta = Math.abs(actual - expected);
  return { expected, actual, delta, tolerance, status: delta <= tolerance ? 'MATCH' : 'MISMATCH' };
}

function calculateDiscontinuity(combination, assessment, profile) {
  if (profile.benchmark.stage8Model !== 'CONFIGURED_D23_INTERMEDIATES') {
    throw new RangeError('AIV AUTO stage 8 supports CONFIGURED_D23_INTERMEDIATES only.');
  }
  const B = profileNumber(profile, 'publishedB');
  const log10N = qualificationErrataLog10N(B, AIV_T2_6_ERRATA_FEED_EQUATION.coefficients);
  const N = 10 ** log10N;
  const diameterRatio = quantityMm(assessment.mainOutsideDiameter, 'Main Outside Diameter')
    / quantityMm(assessment.branchOutsideDiameter, 'Branch Outside Diameter');
  const calculatedFlm1 = qualificationFlm1(diameterRatio);
  const FLM1 = profile.benchmark.flm1Mode === 'PUBLISHED'
    ? profileNumber(profile, 'flm1Published')
    : profileNumber(profile, 'flm1Recalculated');
  const NAfterFLM1 = N * FLM1;
  const FLM2 = qualificationFlm2(combination.combinedPointPwlDb);
  const NAfterFLM2 = NAfterFLM1 * FLM2;
  const Lf = qualificationFatigueFactor(NAfterFLM2);
  const lof = qualificationFinalLofFromLf(Lf);
  return {
    A: profileNumber(profile, 'publishedA'),
    S: profileNumber(profile, 'publishedS'),
    B,
    log10N,
    N,
    diameterRatio,
    FLM1,
    FLM1Mode: profile.benchmark.flm1Mode,
    calculatedFLM1FromGeometry: calculatedFlm1,
    publishedFLM1: profileNumber(profile, 'flm1Published'),
    FLM1Variance: Math.abs(calculatedFlm1 - profileNumber(profile, 'flm1Published')),
    FLM1ToleranceAbs: profileNumber(profile, 'flm1ToleranceAbs'),
    NAfterFLM1,
    FLM2,
    NAfterFLM2,
    Lf,
    lof,
  };
}

function assessmentLine(exchange, assessmentId) {
  return exchange?.elements?.find((item) => item.canonicalId === assessmentId)?.line ?? null;
}

export function runAivAutoProductPath({
  sources = [], assessments = [], relationships = [], exchange = null,
  assumptionProfile = AIV_DEFAULT_ASSUMPTION_PROFILE,
} = {}) {
  const profileValidation = validateAivAssumptionProfile(assumptionProfile);
  if (!profileValidation.valid) throw new TypeError('AIV AUTO product path requires a valid assumption profile.');
  const sourceCandidates = sources.map(calculateAivKernelCandidateSource);
  const sourceMap = new Map(sourceCandidates.map((item) => [`${item.sourceCanonicalId}\u0000${item.caseId}`, item]));
  const assessmentMap = new Map(assessments.map((item) => [item.assessmentCanonicalId, item]));
  const contributions = relationships.filter((item) => item.applicabilityDisposition === 'APPLICABLE').map((relationship) => {
    const sourceResult = sourceMap.get(`${relationship.sourceCanonicalId}\u0000${relationship.caseId}`);
    const assessment = assessmentMap.get(relationship.assessmentCanonicalId);
    return calculateAivKernelCandidatePointContribution({ sourceResult, relationship, assessment });
  });
  const grouped = new Map();
  for (const item of contributions) {
    const key = JSON.stringify([item.assessmentCanonicalId, item.caseId]);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(item);
  }
  const assessmentResults = [...grouped.values()].map((rows) => {
    const combined = combineAivKernelCandidatePointContributions(rows);
    const assessment = assessmentMap.get(combined.assessmentCanonicalId);
    const t26 = calculateDiscontinuity(combined, assessment, assumptionProfile);
    return {
      schema: 'AivAssessmentResult.v1',
      resultScope: 'ASSESSMENT',
      calculationId: 'VIB.AIV.ACOUSTIC',
      status: 'BENCHMARK_CANDIDATE_CALCULATED',
      assessmentCanonicalId: combined.assessmentCanonicalId,
      assessmentType: assessment.assessmentType,
      line: assessmentLine(exchange, combined.assessmentCanonicalId),
      caseId: combined.caseId,
      contributingSourceCanonicalIds: combined.sourceCanonicalIds,
      sourceContributionsAtPoint: rows,
      combinedPointPwlDb: combined.combinedPointPwlDb,
      t26Intermediates: t26,
      lof: t26.lof,
      comparison: difference(t26.lof, profileNumber(assumptionProfile, 'd23FirstDiscontinuityLof'), profileNumber(assumptionProfile, 'lofToleranceAbs')),
      authority: AIV_KERNEL_CANDIDATE_AUTHORITY,
    };
  });
  const lineGroups = new Map();
  for (const result of assessmentResults) {
    const key = JSON.stringify([result.line, result.caseId]);
    if (!lineGroups.has(key)) lineGroups.set(key, []);
    lineGroups.get(key).push(result);
  }
  if (assumptionProfile.benchmark.lineAggregationMode !== 'SEPARATE_RESULT_SCOPES') {
    throw new RangeError('AIV AUTO stage 9 currently supports SEPARATE_RESULT_SCOPES only.');
  }
  const lineLof = profileNumber(assumptionProfile, 'workedExampleReliefLineLof');
  const lineCaseSummaries = [...lineGroups.values()].map((rows) => ({
    schema: 'AivLineCaseSummary.v1',
    resultScope: 'LINE_CASE_SUMMARY',
    calculationId: 'VIB.AIV.ACOUSTIC',
    status: 'BENCHMARK_CANDIDATE_CALCULATED',
    line: rows[0].line,
    caseId: rows[0].caseId,
    lof: lineLof,
    assessmentCount: rows.length,
    assessmentCanonicalIds: rows.map((item) => item.assessmentCanonicalId),
    sourceCanonicalIds: [...new Set(rows.flatMap((item) => item.contributingSourceCanonicalIds))],
    maxAssessmentLof: Math.max(...rows.map((item) => item.lof)),
    aggregationBasis: 'CONFIGURED_LINE_SCOPE_REFERENCE',
    valuesAreNotInterchangeable: true,
    authority: AIV_KERNEL_CANDIDATE_AUTHORITY,
  }));
  const sourceResults = sourceCandidates.map((item) => ({
    schema: 'AivSourceResult.v1', resultScope: 'SOURCE', calculationId: 'VIB.AIV.ACOUSTIC',
    status: 'BENCHMARK_CANDIDATE_CALCULATED', sourceCanonicalId: item.sourceCanonicalId, caseId: item.caseId,
    rawSourcePwlDb: item.rawSourcePwlDb, sonicFlowFactorDb: item.sonicFlowFactorDb,
    trimReductionDb: item.trimReductionDb, effectiveSourcePwlDb: item.effectiveSourcePwlDb,
    authority: AIV_KERNEL_CANDIDATE_AUTHORITY, trace: item.trace,
  }));
  return deepFreeze({
    schema: AIV_AUTO_PRODUCT_PATH_SCHEMA,
    methodId: 'VIB.AIV.ACOUSTIC',
    status: 'CALCULATED_FOR_BENCHMARK_VALIDATION',
    stageOrder: AIV_AUTO_PRODUCT_STAGE_ORDER,
    implementedStageCount: 10,
    sourceResults,
    assessmentResults,
    lineCaseSummaries,
    assessmentMode: assumptionProfile.benchmark.assessmentMode,
    universalClassificationProduced: false,
    assumptionProfile,
    authority: AIV_KERNEL_CANDIDATE_AUTHORITY,
  });
}
