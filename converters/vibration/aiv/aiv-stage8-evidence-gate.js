export const AIV_STAGE8_EVIDENCE_GATE_SCHEMA = 'AivDiscontinuityStage8EvidenceGate.v1';
export const AIV_STAGE8_GATE_STATUS = Object.freeze({
  BLOCKED_PENDING_T2_6_RECONCILIATION: 'BLOCKED_PENDING_T2_6_RECONCILIATION',
  BLOCKED_INVALID_EVIDENCE: 'BLOCKED_INVALID_EVIDENCE',
  READY_FOR_CANDIDATE_IMPLEMENTATION: 'READY_FOR_CANDIDATE_IMPLEMENTATION',
});

const REQUIREMENTS = Object.freeze([
  Object.freeze({
    gateId: 'CONTROLLED_T2_7_HUMAN_RECONCILIATION',
    evidenceKey: 't27Reconciliation',
    verificationSchema: 'AivT27ReconciliationVerification.v1',
  }),
  Object.freeze({
    gateId: 'RECONCILE_D2_3_PUBLISHED_FLM1_ARITHMETIC',
    evidenceKey: 'd23Flm1Reconciliation',
    verificationSchema: 'AivD23Flm1ReconciliationVerification.v1',
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
    return {
      verification: value.verification,
      artifactSha256: value.artifactSha256 ?? null,
    };
  }
  return {
    verification: value,
    artifactSha256: value.artifactSha256 ?? value.evidenceSha256 ?? null,
  };
}

function validateT27(doc) {
  return doc?.schema === 'AivT27ReconciliationVerification.v1'
    && doc.methodId === 'VIB.AIV.ACOUSTIC'
    && doc.reconciliationComplete === true
    && doc.reviewedTraceCount === 9
    && doc.productionEquationAuthorized === false;
}

function validateFlm1(doc) {
  return doc?.schema === 'AivD23Flm1ReconciliationVerification.v1'
    && doc.methodId === 'VIB.AIV.ACOUSTIC'
    && doc.reconciliationComplete === true
    && typeof doc.disposition === 'string'
    && doc.disposition.length > 0
    && Number.isFinite(doc.benchmarkExpectedFlm1)
    && Number.isFinite(doc.benchmarkToleranceAbs)
    && doc.benchmarkToleranceAbs >= 0
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
      disposition: null,
      benchmarkExpectedFlm1: null,
      benchmarkToleranceAbs: null,
    };
  }
  const validHash = sha256Value(artifact.artifactSha256);
  const doc = artifact.verification;
  const validDocument = definition.evidenceKey === 't27Reconciliation'
    ? validateT27(doc)
    : validateFlm1(doc);
  return {
    ...definition,
    status: validHash && validDocument ? 'SATISFIED' : 'INVALID_EVIDENCE',
    artifactSha256: artifact.artifactSha256 ?? null,
    observedSchema: doc?.schema ?? null,
    disposition: definition.evidenceKey === 'd23Flm1Reconciliation' ? doc?.disposition ?? null : null,
    benchmarkExpectedFlm1: definition.evidenceKey === 'd23Flm1Reconciliation'
      ? doc?.benchmarkExpectedFlm1 ?? null : null,
    benchmarkToleranceAbs: definition.evidenceKey === 'd23Flm1Reconciliation'
      ? doc?.benchmarkToleranceAbs ?? null : null,
  };
}

export function buildAivDiscontinuityStage8EvidenceGate({ evidence = {} } = {}) {
  const requirements = REQUIREMENTS.map((definition) => requirementRow(definition, evidence));
  const hasInvalid = requirements.some((item) => item.status === 'INVALID_EVIDENCE');
  const allSatisfied = requirements.every((item) => item.status === 'SATISFIED');
  const flm1 = requirements.find((item) => item.evidenceKey === 'd23Flm1Reconciliation');
  const status = hasInvalid
    ? AIV_STAGE8_GATE_STATUS.BLOCKED_INVALID_EVIDENCE
    : allSatisfied
      ? AIV_STAGE8_GATE_STATUS.READY_FOR_CANDIDATE_IMPLEMENTATION
      : AIV_STAGE8_GATE_STATUS.BLOCKED_PENDING_T2_6_RECONCILIATION;

  return deepFreeze({
    schema: AIV_STAGE8_EVIDENCE_GATE_SCHEMA,
    methodId: 'VIB.AIV.ACOUSTIC',
    stageId: 'CALCULATE_DISCONTINUITY_RESULT',
    status,
    readyForCandidateImplementation: status === AIV_STAGE8_GATE_STATUS.READY_FOR_CANDIDATE_IMPLEMENTATION,
    requirements,
    reviewedBenchmarkDisposition: allSatisfied ? {
      flm1Disposition: flm1.disposition,
      benchmarkExpectedFlm1: flm1.benchmarkExpectedFlm1,
      benchmarkToleranceAbs: flm1.benchmarkToleranceAbs,
    } : null,
    implementationBoundary: {
      equationsMayBeImplementedOnlyFromReviewedTraceEvidence: true,
      publishedA: 0.93989,
      publishedS: 68.229,
      publishedB: 152.207,
      publishedIntermediatesAreBenchmarkEvidenceNotGenericInputDefaults: true,
      silentFlm1SelectionForbidden: true,
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
      'READY_FOR_CANDIDATE_IMPLEMENTATION means evidence is sufficient to implement/review stage-8 candidate code; it does not authorize product execution.',
      'A/S/B published D.2.3 values may be used as benchmark expectations only, not as generic defaults or substitutes for reviewed T2-6 equations.',
      'The reviewed FLM1 disposition/value/tolerance must be consumed explicitly by stage-8 qualification; implementation may not silently choose the published or recalculated value.',
    ],
  });
}
