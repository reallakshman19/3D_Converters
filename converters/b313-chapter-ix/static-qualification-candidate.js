import { resolveChapterIxBasis } from './basis-resolver.js';
import { calculateChapterIxStraightPressureFromBasis } from './straight-pipe-pipeline.js';
import {
  CHAPTER_IX_QUALIFICATION_PACKAGE_VERSION,
  evaluateChapterIxQualificationPackage,
} from './qualification-package.js';

export const CHAPTER_IX_STATIC_QUALIFICATION_CANDIDATE_VERSION =
  'b313-ch9-static-qualification-candidate/v1';

const EXPECTED_KEYS = Object.freeze([
  'pressureDesignThicknessMm',
  'requiredMinimumThicknessMm',
  'pressureRatingMpa',
]);

function text(value) {
  return String(value ?? '').trim();
}

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function result(state, extras = {}) {
  return {
    ok: true,
    candidateState: state,
    evidenceComplete: false,
    canPromoteCalculationAuthority: false,
    ...extras,
  };
}

function invalid(code, message, details = {}) {
  return {
    ok: false,
    candidateState: 'INVALID_CANDIDATE',
    code,
    message,
    details,
    evidenceComplete: false,
    canPromoteCalculationAuthority: false,
  };
}

function validateEnvelope(candidate) {
  if (candidate.candidateVersion !== CHAPTER_IX_STATIC_QUALIFICATION_CANDIDATE_VERSION) {
    return invalid('CANDIDATE_VERSION', 'Unsupported or missing static qualification candidate version.');
  }
  if (!candidate.method || !candidate.basisPackage || !candidate.benchmark) {
    return invalid('CANDIDATE_REQUIRED_BLOCKS', 'method, basisPackage and benchmark are required.');
  }
  for (const field of ['methodId', 'methodRevision', 'b313Edition']) {
    if (!text(candidate.method[field])) {
      return invalid('CANDIDATE_METHOD_IDENTITY', `method.${field} is required.`, { field });
    }
  }
  if (text(candidate.basisPackage?.query?.b313Edition) !== text(candidate.method.b313Edition)) {
    return invalid('CANDIDATE_EDITION_MISMATCH', 'basisPackage query edition must match method edition.');
  }
  return null;
}

function benchmarkContractIssues(candidate) {
  const benchmark = candidate.benchmark;
  const issues = [];
  if (!text(benchmark.benchmarkId)) issues.push('BENCHMARK_ID_MISSING');
  if (text(benchmark.methodId) !== text(candidate.method.methodId)) issues.push('BENCHMARK_METHOD_MISMATCH');
  if (text(benchmark.oracleClass) !== 'CLASS_E_CODE_LICENSED') issues.push('BENCHMARK_ORACLE_CLASS_INVALID');
  if (benchmark.independent !== true || text(benchmark.status) !== 'INDEPENDENTLY_CHECKED') {
    issues.push('BENCHMARK_NOT_INDEPENDENTLY_CHECKED');
  }
  if (!text(benchmark.producedBy) || !text(benchmark.reviewedBy)
      || text(benchmark.producedBy) === text(benchmark.reviewedBy)) {
    issues.push('BENCHMARK_CUSTODY_INCOMPLETE');
  }
  for (const key of EXPECTED_KEYS) {
    if (!finite(benchmark.expected?.[key])) issues.push(`BENCHMARK_EXPECTED_${key}_MISSING`);
  }
  const tolerance = benchmark.tolerance ?? {};
  if (!['ABSOLUTE', 'RELATIVE'].includes(text(tolerance.type))
      || !finite(tolerance.value) || tolerance.value < 0) {
    issues.push('BENCHMARK_TOLERANCE_INVALID');
  }
  const input = benchmark.input ?? {};
  for (const key of ['designPressureMpa', 'internalAllowanceMm', 'externalAllowanceMm']) {
    if (!finite(input[key])) issues.push(`BENCHMARK_INPUT_${key}_MISSING`);
  }
  return issues;
}

function controlledMethodSource(candidate) {
  const sources = candidate.basisPackage?.masters?.sources ?? [];
  return sources.find((row) => (
    text(row?.role) === 'B313_CHAPTER_IX'
    && text(row?.standard) === 'ASME B31.3'
    && text(row?.edition) === text(candidate.method.b313Edition)
  ));
}

function compareValue(actual, expected, tolerance) {
  const difference = Math.abs(actual - expected);
  const limit = tolerance.type === 'RELATIVE'
    ? Math.abs(expected) * tolerance.value
    : tolerance.value;
  return { actual, expected, difference, limit, pass: difference <= limit };
}

function compareBenchmark(pressure, benchmark) {
  const tolerance = benchmark.tolerance;
  const comparisons = Object.fromEntries(EXPECTED_KEYS.map((key) => [
    key,
    compareValue(pressure[key], benchmark.expected[key], tolerance),
  ]));
  return {
    pass: Object.values(comparisons).every((item) => item.pass),
    tolerance: { ...tolerance },
    comparisons,
  };
}

function qualificationPackage(candidate, source) {
  const benchmark = candidate.benchmark;
  return {
    packageVersion: CHAPTER_IX_QUALIFICATION_PACKAGE_VERSION,
    scope: 'STRAIGHT_PIPE_STATIC',
    method: { ...candidate.method },
    sources: [source],
    benchmarks: [{
      benchmarkId: benchmark.benchmarkId,
      methodId: benchmark.methodId,
      sourceId: benchmark.sourceId,
      independent: benchmark.independent,
      status: benchmark.status,
      producedBy: benchmark.producedBy,
      reviewedBy: benchmark.reviewedBy,
      expected: { ...benchmark.expected },
    }],
  };
}

export function evaluateChapterIxStaticQualificationCandidate(candidate = {}) {
  const envelopeError = validateEnvelope(candidate);
  if (envelopeError) return envelopeError;

  const basis = resolveChapterIxBasis(candidate.basisPackage);
  if (!basis.ok || basis.resolverState !== 'RESOLVED_NOT_AUTHORIZED') {
    return result('BASIS_EVIDENCE_PENDING', { basis, issues: basis.issues ?? [basis.code ?? 'BASIS_INVALID'] });
  }

  const benchmarkIssues = benchmarkContractIssues(candidate);
  if (benchmarkIssues.length) {
    return result('BENCHMARK_EVIDENCE_PENDING', { basis, issues: benchmarkIssues });
  }

  const source = controlledMethodSource(candidate);
  if (!source || text(candidate.benchmark.sourceId) !== text(source.sourceId)) {
    return result('BENCHMARK_EVIDENCE_PENDING', {
      basis,
      issues: ['BENCHMARK_CONTROLLED_SOURCE_BINDING_MISSING'],
    });
  }

  const calculation = calculateChapterIxStraightPressureFromBasis({
    basisPackage: candidate.basisPackage,
    ...candidate.benchmark.input,
  });
  if (!calculation.ok) {
    return result('CALCULATION_BLOCKED', { basis, calculation, issues: [calculation.code ?? 'CALCULATION_FAILED'] });
  }

  const comparison = compareBenchmark(calculation.pressure, candidate.benchmark);
  if (!comparison.pass) {
    return result('BENCHMARK_MISMATCH', { basis, calculation, comparison, issues: ['CLASS_E_NUMERICAL_MISMATCH'] });
  }

  const packageInput = qualificationPackage(candidate, source);
  const qualification = evaluateChapterIxQualificationPackage(packageInput);
  if (!qualification.ok || qualification.packageState !== 'EVIDENCE_COMPLETE_NOT_AUTHORIZED') {
    return result('QUALIFICATION_PACKAGE_PENDING', {
      basis,
      calculation,
      comparison,
      qualification,
      issues: (qualification.issues ?? []).map((item) => item.code ?? String(item)),
    });
  }

  return {
    ok: true,
    candidateState: 'EVIDENCE_COMPLETE_NOT_AUTHORIZED',
    evidenceComplete: true,
    canPromoteCalculationAuthority: false,
    basis,
    calculation,
    comparison,
    qualification,
    qualificationPackage: packageInput,
    issues: [],
  };
}
