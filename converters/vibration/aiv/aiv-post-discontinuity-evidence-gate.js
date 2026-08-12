export const AIV_POST_DISCONTINUITY_EVIDENCE_GATE_SCHEMA = 'AivPostDiscontinuityEvidenceGate.v1';
export const AIV_POST_DISCONTINUITY_GATE_STATUS = Object.freeze({
  BLOCKED_PENDING_RESULT_SCOPE_AND_ASSESSMENT_REVIEW: 'BLOCKED_PENDING_RESULT_SCOPE_AND_ASSESSMENT_REVIEW',
  BLOCKED_INVALID_EVIDENCE: 'BLOCKED_INVALID_EVIDENCE',
  READY_FOR_POST_DISCONTINUITY_CANDIDATE_IMPLEMENTATION: 'READY_FOR_POST_DISCONTINUITY_CANDIDATE_IMPLEMENTATION',
});

const REQUIREMENTS = Object.freeze([
  Object.freeze({
    gateId: 'RECONCILE_WORKED_EXAMPLES_DERIVED_REPORT_RESULT_SCOPE',
    evidenceKey: 'workedExampleResultScopeReview',
    verificationSchema: 'AivWorkedExampleResultScopeReviewVerification.v1',
    stageId: 'AGGREGATE_LINE_CASE_RESULT',
  }),
  Object.freeze({
    gateId: 'INDEPENDENT_SONIC_AND_MULTI_SOURCE_BENCHMARK_ACCEPTANCE',
    evidenceKey: 'independentBenchmarkReview',
    verificationSchema: 'AivIndependentBenchmarkReviewVerification.v1',
    stageId: 'ASSESS_RESULT',
  }),
]);

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function sha256Value(value) {
  return /^sha256:[0-9a-f]{64}$/u.test(String(value ?? '').trim().toLowerCase());
}

function artifactOf(value) {
  if (!value) return null;
  if (value.verification && typeof value.verification === 'object') {
    return { verification: value.verification, artifactSha256: value.artifactSha256 ?? null };
  }
  return { verification: value, artifactSha256: null };
}

function validateResultScope(doc) {
  return doc?.schema === 'AivWorkedExampleResultScopeReviewVerification.v1'
    && doc.methodId === 'VIB.AIV.ACOUSTIC'
    && doc.reviewComplete === true
    && doc.scopeSeparationAccepted === true
    && sha256Value(doc.evidenceSha256)
    && doc.productionEquationAuthorized === false
    && doc.lineAggregationImplementationAuthorized === false;
}

function validateIndependentBenchmarks(doc) {
  return doc?.schema === 'AivIndependentBenchmarkReviewVerification.v1'
    && doc.methodId === 'VIB.AIV.ACOUSTIC'
    && doc.reviewComplete === true
    && Number.isInteger(doc.acceptedBenchmarkCount)
    && doc.acceptedBenchmarkCount >= 3
    && doc.sonicSff6BenchmarkAccepted === true
    && doc.multiSourceBenchmarksAccepted === true
    && doc.productionEquationAuthorized === false;
}

function requirementRow(definition, evidence) {
  const artifact = artifactOf(evidence?.[definition.evidenceKey]);
  if (!artifact) {
    return {
      ...definition,
      status: 'PENDING',
      artifactSha256: null,
      observedSchema: null,
    };
  }
  const validHash = sha256Value(artifact.artifactSha256);
  const doc = artifact.verification;
  const validDocument = definition.evidenceKey === 'workedExampleResultScopeReview'
    ? validateResultScope(doc)
    : validateIndependentBenchmarks(doc);
  return {
    ...definition,
    status: validHash && validDocument ? 'SATISFIED' : 'INVALID_EVIDENCE',
    artifactSha256: artifact.artifactSha256 ?? null,
    observedSchema: doc?.schema ?? null,
  };
}

export function buildAivPostDiscontinuityEvidenceGate({ evidence = {} } = {}) {
  const requirements = REQUIREMENTS.map((definition) => requirementRow(definition, evidence));
  const hasInvalid = requirements.some((item) => item.status === 'INVALID_EVIDENCE');
  const allSatisfied = requirements.every((item) => item.status === 'SATISFIED');
  const status = hasInvalid
    ? AIV_POST_DISCONTINUITY_GATE_STATUS.BLOCKED_INVALID_EVIDENCE
    : allSatisfied
      ? AIV_POST_DISCONTINUITY_GATE_STATUS.READY_FOR_POST_DISCONTINUITY_CANDIDATE_IMPLEMENTATION
      : AIV_POST_DISCONTINUITY_GATE_STATUS.BLOCKED_PENDING_RESULT_SCOPE_AND_ASSESSMENT_REVIEW;

  return deepFreeze({
    schema: AIV_POST_DISCONTINUITY_EVIDENCE_GATE_SCHEMA,
    methodId: 'VIB.AIV.ACOUSTIC',
    stageIds: ['AGGREGATE_LINE_CASE_RESULT', 'ASSESS_RESULT'],
    status,
    readyForCandidateImplementation: status === AIV_POST_DISCONTINUITY_GATE_STATUS.READY_FOR_POST_DISCONTINUITY_CANDIDATE_IMPLEMENTATION,
    requirements,
    scopeBoundary: {
      sourceResultScope: 'SOURCE',
      firstDiscontinuityScope: 'ASSESSMENT',
      derivedReportScope: 'LINE_CASE_SUMMARY',
      d23FirstDiscontinuityLof: 0.29,
      workedExampleReliefLineLof: 1.48,
      valuesAreNotInterchangeable: true,
      aggregationMustNotBeInferredFromSingleFirstDiscontinuity: true,
    },
    assessmentBoundary: {
      independentSonicSff6AcceptanceRequired: true,
      independentMultiSourceAcceptanceRequired: true,
      universalPassSafeClassificationForbidden: true,
    },
    authority: {
      authorityTransitionApplied: false,
      calculationState: 'BLOCKED',
      qualificationState: 'BLOCKED',
      engineeringAuthority: 'NONE',
      productionEquationAuthorized: false,
      screeningAuthority: 'NOT_AUTHORIZED',
      designAuthority: false,
    },
    notes: [
      'READY means candidate stages 9–10 may be implemented/reviewed from accepted scope and benchmark evidence; it does not authorize product execution.',
      'The line-level relief LOF=1.48 and D.2.3 first-discontinuity LOF=0.29 must remain separate result objects and may not be compared as identical outputs.',
      'Assessment code may not introduce generic safe/pass language or screening authority while the method remains BLOCKED.',
    ],
  });
}
