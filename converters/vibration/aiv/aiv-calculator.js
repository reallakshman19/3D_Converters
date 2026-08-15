import { AIV_T2_6_ERRATA_FEED_EQUATION } from './aiv-errata-evidence.js';
import {
  AIV_DEFAULT_ASSUMPTION_PROFILE,
  validateAivAssumptionProfile,
} from './aiv-assumption-profile.js';
import { assertAivExecutableContract } from './aiv-executable-contract.js';
import {
  calculateAivKernelCandidatePointContribution,
  calculateAivKernelCandidateSource,
  combineAivKernelCandidatePointContributions,
} from './aiv-kernel-candidate.js';
import { buildAivReadiness } from './aiv-readiness.js';

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
  if (!Number.isFinite(value)) throw new TypeError(`AIV calculator requires finite benchmark.${key}.`);
  return value;
}

function quantityMm(quantity, field) {
  const value = Number(quantity?.value);
  const unit = String(quantity?.unit ?? '').trim();
  if (!(value > 0)) throw new TypeError(`AIV calculator requires positive ${field}.`);
  if (unit === 'mm') return value;
  if (unit === 'm') return value * 1000;
  throw new TypeError(`AIV calculator ${field} must use mm or m.`);
}

function errataLog10N(B) {
  const c = AIV_T2_6_ERRATA_FEED_EQUATION.coefficients;
  return c.c0 + c.cLog10B * Math.log10(B) + c.cInvSqrtB / Math.sqrt(B) + c.cInvBPower / (B ** 0.1);
}

function flm1(diameterRatio) {
  return -0.07
    + 0.91 * diameterRatio
    + 1.32 / diameterRatio
    - 0.48 * (diameterRatio ** 1.5)
    + 0.065 * (diameterRatio ** 2);
}

function flm2(pointPwlDb) {
  return 0.29 + 0.09 * Math.tanh((pointPwlDb - 172) / 2.9);
}

function fatigueFactor(N) {
  return -0.1303 * Math.log(N) + 3.1;
}

function finalLof(Lf) {
  return Lf < 0.5 ? 0.29 : Math.min(1, Math.max(0, Lf));
}

function difference(actual, expected, tolerance) {
  const delta = Math.abs(actual - expected);
  return { expected, actual, delta, tolerance, status: delta <= tolerance ? 'MATCH' : 'MISMATCH' };
}

function calculateDiscontinuity(combination, assessment, profile) {
  if (profile.benchmark.stage8Model !== 'CONFIGURED_D23_INTERMEDIATES') {
    throw new RangeError('AIV stage 8 supports CONFIGURED_D23_INTERMEDIATES only.');
  }
  const B = profileNumber(profile, 'publishedB');
  const log10N = errataLog10N(B);
  const N = 10 ** log10N;
  const diameterRatio = quantityMm(assessment.mainOutsideDiameter, 'Main Outside Diameter')
    / quantityMm(assessment.branchOutsideDiameter, 'Branch Outside Diameter');
  const calculatedFLM1FromGeometry = flm1(diameterRatio);
  const FLM1 = profile.benchmark.flm1Mode === 'PUBLISHED'
    ? profileNumber(profile, 'flm1Published')
    : profileNumber(profile, 'flm1Recalculated');
  const NAfterFLM1 = N * FLM1;
  const FLM2 = flm2(combination.combinedPointPwlDb);
  const NAfterFLM2 = NAfterFLM1 * FLM2;
  const Lf = fatigueFactor(NAfterFLM2);
  const lof = finalLof(Lf);
  return {
    A: profileNumber(profile, 'publishedA'),
    S: profileNumber(profile, 'publishedS'),
    B,
    log10N,
    N,
    diameterRatio,
    FLM1,
    FLM1Mode: profile.benchmark.flm1Mode,
    calculatedFLM1FromGeometry,
    publishedFLM1: profileNumber(profile, 'flm1Published'),
    FLM1Variance: Math.abs(calculatedFLM1FromGeometry - profileNumber(profile, 'flm1Published')),
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

function promotedContribution(item, authority) {
  const { authority: lineageAuthority, ...values } = item;
  return { ...values, authority, lineageAuthority: lineageAuthority ?? null };
}

function screeningError(code, message, details = {}) {
  const error = new Error(message);
  error.name = 'AivScreeningQualificationError';
  error.code = code;
  error.details = Object.freeze({ ...details });
  return error;
}

function relationshipKey(row) {
  return JSON.stringify([row.sourceCanonicalId, row.assessmentCanonicalId, row.caseId]);
}

function screeningExecutionScope(exchange, sources, assessments, relationships) {
  let readiness;
  try {
    readiness = buildAivReadiness(exchange, sources, assessments, relationships);
  } catch (error) {
    throw screeningError('AIV_SCREENING_TOPOLOGY_OR_READINESS_INVALID', 'AIV screening requires valid joined readiness and topology evidence.', {
      cause: String(error?.message || error),
    });
  }
  const counts = readiness.counts;
  if (counts.readyForQualification < 1 || counts.notReady !== 0 || counts.methodGap !== 0) {
    throw screeningError('AIV_SCREENING_READINESS_BLOCKED', 'AIV screening cannot execute while readiness contains NOT_READY or METHOD_GAP relationships.', {
      counts,
      rows: readiness.rows,
    });
  }
  const readyKeys = new Set(readiness.rows
    .filter((row) => row.status === 'READY_FOR_QUALIFICATION')
    .map(relationshipKey));
  const executionRelationships = relationships.filter((row) => (
    row.applicabilityDisposition === 'APPLICABLE' && readyKeys.has(relationshipKey(row))
  ));
  if (executionRelationships.length !== readyKeys.size) {
    throw screeningError('AIV_SCREENING_READY_SCOPE_MISMATCH', 'Readiness-qualified relationships no longer project one-to-one into the screening calculation.', {
      readyRelationships: readyKeys.size,
      executableRelationships: executionRelationships.length,
    });
  }
  const sourceKeys = new Set(executionRelationships.map((row) => JSON.stringify([row.sourceCanonicalId, row.caseId])));
  const assessmentIds = new Set(executionRelationships.map((row) => row.assessmentCanonicalId));
  return {
    sources: sources.filter((row) => sourceKeys.has(JSON.stringify([row.sourceCanonicalId, row.caseId]))),
    assessments: assessments.filter((row) => assessmentIds.has(row.assessmentCanonicalId)),
    relationships: executionRelationships,
    readiness,
  };
}

function executionScope(input) {
  if (input.qualificationMode !== 'screening') return { ...input, readiness: null };
  return screeningExecutionScope(input.exchange, input.sources, input.assessments, input.relationships);
}

export function calculateAiv({
  sources = [],
  assessments = [],
  relationships = [],
  exchange = null,
  assumptionProfile = AIV_DEFAULT_ASSUMPTION_PROFILE,
  qualificationMode = 'benchmark',
} = {}) {
  if (!['benchmark', 'screening'].includes(qualificationMode)) {
    throw new RangeError('AIV qualificationMode must be benchmark or screening.');
  }
  const profileValidation = validateAivAssumptionProfile(assumptionProfile);
  if (!profileValidation.valid) throw new TypeError('AIV calculator requires a valid assumption profile.');
  if (!Array.isArray(sources) || !sources.length) throw new TypeError('AIV calculator requires at least one source.');
  if (!Array.isArray(assessments) || !assessments.length) throw new TypeError('AIV calculator requires at least one assessment.');
  if (!Array.isArray(relationships) || !relationships.length) throw new TypeError('AIV calculator requires at least one source-to-assessment relationship.');
  const scope = executionScope({ sources, assessments, relationships, exchange, qualificationMode });
  assertAivExecutableContract(scope);
  const authority = resultAuthority(qualificationMode);
  const sourceCandidates = scope.sources.map(calculateAivKernelCandidateSource);
  const sourceMap = new Map(sourceCandidates.map((item) => [`${item.sourceCanonicalId}\u0000${item.caseId}`, item]));
  const assessmentMap = new Map(scope.assessments.map((item) => [item.assessmentCanonicalId, item]));
  const contributions = scope.relationships.map((relationship) => {
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
      status: qualificationMode === 'screening' ? 'SCREENING_CALCULATED' : 'BENCHMARK_CALCULATED',
      assessmentCanonicalId: combined.assessmentCanonicalId,
      assessmentType: assessment.assessmentType,
      line: assessmentLine(exchange, combined.assessmentCanonicalId),
      caseId: combined.caseId,
      contributingSourceCanonicalIds: combined.sourceCanonicalIds,
      sourceContributionsAtPoint: rows.map((item) => promotedContribution(item, authority)),
      combinedPointPwlDb: combined.combinedPointPwlDb,
      t26Intermediates: t26,
      lof: t26.lof,
      comparison: difference(
        t26.lof,
        profileNumber(assumptionProfile, 'd23FirstDiscontinuityLof'),
        profileNumber(assumptionProfile, 'lofToleranceAbs'),
      ),
      authority,
    };
  });
  if (assumptionProfile.benchmark.lineAggregationMode !== 'SEPARATE_RESULT_SCOPES') {
    throw new RangeError('AIV stage 9 currently supports SEPARATE_RESULT_SCOPES only.');
  }
  const lineGroups = new Map();
  for (const result of assessmentResults) {
    const key = JSON.stringify([result.line, result.caseId]);
    if (!lineGroups.has(key)) lineGroups.set(key, []);
    lineGroups.get(key).push(result);
  }
  const configuredLineLof = profileNumber(assumptionProfile, 'workedExampleReliefLineLof');
  const lineCaseSummaries = [...lineGroups.values()].map((rows) => ({
    schema: 'AivLineCaseSummary.v1',
    resultScope: 'LINE_CASE_SUMMARY',
    calculationId: 'VIB.AIV.ACOUSTIC',
    status: qualificationMode === 'screening' ? 'SCREENING_CONFIGURED_SUMMARY' : 'BENCHMARK_CALCULATED',
    line: rows[0].line,
    caseId: rows[0].caseId,
    lof: configuredLineLof,
    assessmentCount: rows.length,
    assessmentCanonicalIds: rows.map((item) => item.assessmentCanonicalId),
    sourceCanonicalIds: [...new Set(rows.flatMap((item) => item.contributingSourceCanonicalIds))],
    maxAssessmentLof: Math.max(...rows.map((item) => item.lof)),
    aggregationBasis: 'CONFIGURED_LINE_SCOPE_REFERENCE',
    valuesAreNotInterchangeable: true,
    authoritativeForScreening: false,
    authority,
  }));
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
    lineCaseSummaryAuthoritativeForScreening: false,
    universalClassificationProduced: false,
    screeningQualification: scope.readiness ? {
      readinessSchema: scope.readiness.schema,
      counts: scope.readiness.counts,
      executableRelationshipCount: scope.relationships.length,
    } : null,
    assumptionProfile,
    profileValidation,
    authority,
  });
}
