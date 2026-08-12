export const AIV_BENCHMARK_KERNEL_QUALIFICATION_SCHEMA = 'AivBenchmarkKernelQualification.v1';
export const AIV_BENCHMARK_KERNEL_QUALIFICATION_STATUS = Object.freeze({
  NOT_READY: 'NOT_READY',
  PARTIAL_STAGES_1_TO_7: 'PARTIAL_STAGES_1_TO_7',
  READY_FOR_STAGES_8_TO_10_IMPLEMENTATION: 'READY_FOR_STAGES_8_TO_10_IMPLEMENTATION',
  INVALID_EVIDENCE: 'INVALID_EVIDENCE',
  PASS: 'PASS',
});

const ALL_STAGES = Object.freeze([
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

function sha256Value(value) {
  return /^sha256:[0-9a-f]{64}$/u.test(String(value ?? '').trim().toLowerCase());
}

function artifactOf(value) {
  if (!value) return null;
  if (value.document && typeof value.document === 'object') {
    return { document: value.document, artifactSha256: value.artifactSha256 ?? null };
  }
  return { document: value, artifactSha256: value.artifactSha256 ?? value.evidenceSha256 ?? null };
}

function validateCandidateParity(artifact) {
  const doc = artifact?.document;
  return sha256Value(artifact?.artifactSha256)
    && doc?.schema === 'AivKernelCandidateParity.v1'
    && doc.methodId === 'VIB.AIV.ACOUSTIC'
    && doc.status === 'CANDIDATE_PARITY_PASS'
    && doc.counts?.total === 8
    && doc.counts?.passed === 8
    && doc.counts?.failed === 0
    && Array.isArray(doc.candidateStatus?.implementedStages)
    && doc.candidateStatus.implementedStages.length === 7
    && Array.isArray(doc.blockedStages)
    && doc.blockedStages.length === 3
    && doc.authority?.productionEquationAuthorized === false
    && doc.authority?.screeningAuthority === 'NOT_AUTHORIZED'
    && doc.authority?.designAuthority === false;
}

function validateStage8Gate(artifact) {
  const doc = artifact?.document;
  return sha256Value(artifact?.artifactSha256)
    && doc?.schema === 'AivDiscontinuityStage8EvidenceGate.v1'
    && doc.methodId === 'VIB.AIV.ACOUSTIC'
    && doc.stageId === 'CALCULATE_DISCONTINUITY_RESULT'
    && doc.status === 'READY_FOR_CANDIDATE_IMPLEMENTATION'
    && doc.readyForCandidateImplementation === true
    && doc.authority?.productionEquationAuthorized === false
    && doc.authority?.screeningAuthority === 'NOT_AUTHORIZED'
    && doc.authority?.designAuthority === false;
}

function validateCompleteProductPath(artifact) {
  const doc = artifact?.document;
  return sha256Value(artifact?.artifactSha256)
    && doc?.schema === 'AivProductPathBenchmarkParityReceipt.v1'
    && doc.methodId === 'VIB.AIV.ACOUSTIC'
    && doc.status === 'PASS'
    && doc.releaseTarget === 'BENCHMARK_ONLY'
    && doc.completeKernelStageCount === 10
    && doc.resultContractsValidated === true
    && doc.sourceAssessmentLineScopesValidated === true
    && doc.authorityTransitionApplied === false
    && doc.screeningAuthority === 'NOT_AUTHORIZED'
    && doc.designAuthority === false;
}

function evidenceRow(id, artifact, validator) {
  if (!artifact) return { evidenceId: id, status: 'PENDING', artifactSha256: null, observedSchema: null };
  const valid = validator(artifact);
  return {
    evidenceId: id,
    status: valid ? 'SATISFIED' : 'INVALID_EVIDENCE',
    artifactSha256: artifact.artifactSha256 ?? null,
    observedSchema: artifact.document?.schema ?? null,
  };
}

function stageRows(candidateParityValid, stage8GateValid, completeProductPathValid) {
  return ALL_STAGES.map((stageId, index) => {
    let status = 'PENDING';
    let basis = null;
    if (index < 7 && candidateParityValid) {
      status = 'QUALIFICATION_PARITY_PASS';
      basis = 'AivKernelCandidateParity.v1';
    } else if (index === 7 && stage8GateValid && !completeProductPathValid) {
      status = 'READY_FOR_CANDIDATE_IMPLEMENTATION';
      basis = 'AivDiscontinuityStage8EvidenceGate.v1';
    }
    if (completeProductPathValid) {
      status = 'PRODUCT_PATH_PARITY_PASS';
      basis = 'AivProductPathBenchmarkParityReceipt.v1';
    }
    return { sequence: index + 1, stageId, status, basis };
  });
}

export function buildAivBenchmarkKernelQualification({ evidence = {} } = {}) {
  const candidateParity = artifactOf(evidence.candidateParity);
  const stage8Gate = artifactOf(evidence.stage8EvidenceGate);
  const completeProductPath = artifactOf(evidence.productPathBenchmarkParity);

  const rows = [
    evidenceRow('CANDIDATE_STAGES_1_TO_7_PARITY', candidateParity, validateCandidateParity),
    evidenceRow('STAGE_8_HUMAN_EVIDENCE_GATE', stage8Gate, validateStage8Gate),
    evidenceRow('COMPLETE_PRODUCT_PATH_BENCHMARK_PARITY', completeProductPath, validateCompleteProductPath),
  ];
  const invalid = rows.some((row) => row.status === 'INVALID_EVIDENCE');
  const candidateParityValid = rows[0].status === 'SATISFIED';
  const stage8GateValid = rows[1].status === 'SATISFIED';
  const completeProductPathValid = rows[2].status === 'SATISFIED';

  let status = AIV_BENCHMARK_KERNEL_QUALIFICATION_STATUS.NOT_READY;
  if (invalid) status = AIV_BENCHMARK_KERNEL_QUALIFICATION_STATUS.INVALID_EVIDENCE;
  else if (completeProductPathValid && candidateParityValid && stage8GateValid) {
    status = AIV_BENCHMARK_KERNEL_QUALIFICATION_STATUS.PASS;
  } else if (candidateParityValid && stage8GateValid) {
    status = AIV_BENCHMARK_KERNEL_QUALIFICATION_STATUS.READY_FOR_STAGES_8_TO_10_IMPLEMENTATION;
  } else if (candidateParityValid) {
    status = AIV_BENCHMARK_KERNEL_QUALIFICATION_STATUS.PARTIAL_STAGES_1_TO_7;
  }

  const stages = stageRows(candidateParityValid, stage8GateValid, completeProductPathValid);
  return deepFreeze({
    schema: AIV_BENCHMARK_KERNEL_QUALIFICATION_SCHEMA,
    methodId: 'VIB.AIV.ACOUSTIC',
    releaseTarget: 'BENCHMARK_ONLY',
    status,
    releaseGateSatisfied: status === AIV_BENCHMARK_KERNEL_QUALIFICATION_STATUS.PASS,
    evidence: rows,
    stages,
    counts: {
      totalStages: stages.length,
      productPathQualifiedStages: stages.filter((row) => row.status === 'PRODUCT_PATH_PARITY_PASS').length,
      candidateParityStages: stages.filter((row) => row.status === 'QUALIFICATION_PARITY_PASS').length,
      readyForImplementationStages: stages.filter((row) => row.status === 'READY_FOR_CANDIDATE_IMPLEMENTATION').length,
      pendingStages: stages.filter((row) => row.status === 'PENDING').length,
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
    nextAction: status === AIV_BENCHMARK_KERNEL_QUALIFICATION_STATUS.PASS
      ? 'USE_AS_RELEASE_READINESS_EVIDENCE_ONLY'
      : status === AIV_BENCHMARK_KERNEL_QUALIFICATION_STATUS.READY_FOR_STAGES_8_TO_10_IMPLEMENTATION
        ? 'IMPLEMENT_AND_QUALIFY_STAGES_8_TO_10_WITH_REVIEWED_EVIDENCE'
        : status === AIV_BENCHMARK_KERNEL_QUALIFICATION_STATUS.PARTIAL_STAGES_1_TO_7
          ? 'COMPLETE_STAGE_8_HUMAN_EVIDENCE_GATE'
          : 'REPAIR_OR_COMPLETE_REQUIRED_EVIDENCE',
    notes: [
      'Candidate arithmetic parity for stages 1–7 is necessary but not sufficient for BENCHMARK_ONLY release.',
      'A complete AivProductPathBenchmarkParityReceipt.v1 is required before this qualification can PASS.',
      'This qualification object never registers the kernel, enables UI execution, or changes engineering authority.',
    ],
  });
}
