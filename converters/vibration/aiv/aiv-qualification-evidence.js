export const AIV_QUALIFICATION_EVIDENCE_SCHEMA = 'AivQualificationEvidence.v1';

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export const AIV_EI_D23_SOURCE = deepFreeze({
  sourceId: 'AIV-SRC-EI-D2-3',
  repository: 'reallaksh19/Common',
  commit: 'fb549185b9b27edc2379734240320a85c5bef9f6',
  path: 'Energy-Institute-AVIFF---Worked-Examples.doc.docx',
  gitBlob: 'ceee15ed5f7f320045d5f3979024e2e8664613f2',
  locator: 'Appendix D / D.2.3 High Frequency Acoustic Excitation (T2.7)',
  evidenceClass: 'EI_WORKED_EXAMPLE',
  productionAuthority: false,
});

export const AIV_D23_BENCHMARK_CASES = deepFreeze([
  {
    benchmarkId: 'AIV-EI-D2-3-RELIEF-SOURCE',
    sourceId: AIV_EI_D23_SOURCE.sourceId,
    caseLabel: 'Relief valve lifts',
    evidenceState: 'PUBLISHED_VALUES_CAPTURED_PARTIAL_CHAIN',
    publishedInputs: {
      sourceDeviceType: 'RELIEF_VALVE',
      upstreamPressure: { value: 98, unit: 'barg' },
      downstreamPressure: { value: 0, unit: 'barg' },
      publishedUpstreamPressureAbsolute: { value: 9.9, unit: 'MPa abs' },
      publishedDownstreamPressureAbsolute: { value: 0.1, unit: 'MPa abs' },
      massFlow: { value: 53482, unit: 'kg/h' },
      publishedMassFlowNormalized: { value: 14.86, unit: 'kg/s' },
      upstreamTemperature: { value: 137, unit: 'degC' },
      publishedTemperatureAbsolute: { value: 410, unit: 'K' },
      molecularWeight: { value: 21.75, unit: 'g/mol' },
      sonicState: 'NON_SONIC',
      sonicFlowFactorDb: 0,
    },
    publishedOutputs: { sourcePwlDb: 164.7 },
    tolerance: {
      sourcePwlDb: 0.05,
      rationale: 'Published source PWL is reported to one decimal place; tolerance is half the displayed increment.',
    },
    traceIds: [
      'AIV-SRC-EI-D2-3-PRESSURE', 'AIV-SRC-EI-D2-3-NONSONIC',
      'AIV-SRC-EI-D2-3-SOURCE-PWL', 'AIV-SRC-EI-D2-3-155DB',
    ],
  },
  {
    benchmarkId: 'AIV-EI-D2-3-RECYCLE-SOURCE',
    sourceId: AIV_EI_D23_SOURCE.sourceId,
    caseLabel: 'Recycle valve opens',
    evidenceState: 'PUBLISHED_VALUES_CAPTURED_PARTIAL_CHAIN',
    publishedInputs: {
      sourceDeviceType: 'CONTROL_VALVE',
      upstreamPressure: { value: 87, unit: 'barg' },
      downstreamPressure: { value: 25, unit: 'barg' },
      publishedUpstreamPressureAbsolute: { value: 8.8, unit: 'MPa abs' },
      publishedDownstreamPressureAbsolute: { value: 2.6, unit: 'MPa abs' },
      massFlow: { value: 53482, unit: 'kg/h' },
      upstreamTemperature: { value: 137, unit: 'degC' },
      molecularWeight: { value: 21.75, unit: 'g/mol' },
      sonicState: 'NON_SONIC',
      sonicFlowFactorDb: 0,
      lowNoiseTrim: {
        state: 'MANUFACTURER_REDUCTION',
        reduction: { value: 30, unit: 'dB', qualifier: 'approximately' },
      },
    },
    publishedOutputs: { sourcePwlDb: 159.4 },
    tolerance: {
      sourcePwlDb: 0.05,
      rationale: 'Published source PWL is reported to one decimal place; tolerance is half the displayed increment.',
    },
    traceIds: [
      'AIV-SRC-EI-D2-3-PRESSURE', 'AIV-SRC-EI-D2-3-NONSONIC',
      'AIV-SRC-EI-D2-3-TRIM', 'AIV-SRC-EI-D2-3-SOURCE-PWL', 'AIV-SRC-EI-D2-3-155DB',
    ],
  },
  {
    benchmarkId: 'AIV-EI-D2-3-RELIEF-DISCONTINUITY',
    sourceId: AIV_EI_D23_SOURCE.sourceId,
    caseLabel: 'Relief source to first evaluated bypass weldolet',
    evidenceState: 'PUBLISHED_VALUES_CAPTURED_PARTIAL_CHAIN',
    publishedInputs: {
      assessmentDescription: '2-inch bypass weldolet',
      sourceToAssessmentDistance: { value: 0.8, unit: 'm' },
      mainPipeInsideDiameter: { value: 154, unit: 'mm' },
      mainPipeOutsideDiameter: { value: 168.3, unit: 'mm' },
      mainPipeWallThickness: { value: 7.11, unit: 'mm' },
      branchOutsideDiameter: { value: 60.3, unit: 'mm' },
      sourcePwlDb: 164.7,
    },
    publishedIntermediates: {
      attenuationDb: 0.312,
      assessmentPwlDb: 164.4,
      A: 0.93989,
      S: 68.229,
      B: 152.207,
      log10N: 9.9026,
      N: 7.99e9,
      diameterRatioDextOverDextBranch: 2.791,
    },
    publishedFinal: null,
    qualificationGap: 'FINAL_T2_6_LOF_NOT_YET_CAPTURED_FROM_CONTROLLED_SOURCE',
    traceIds: ['AIV-SRC-EI-D2-3-ATTENUATION', 'AIV-SRC-EI-D2-3-T2-6'],
  },
]);

export const AIV_METHOD_TRACE_FOUNDATION = deepFreeze([
  {
    traceId: 'AIV-SRC-EI-D2-3-PRESSURE', namespace: 'AIV-SRC', sourceId: AIV_EI_D23_SOURCE.sourceId,
    locator: AIV_EI_D23_SOURCE.locator,
    subject: 'Worked-example P1/P2 pressure basis and gauge-to-absolute treatment',
    qualificationState: 'WORKED_EXAMPLE_EVIDENCE_CAPTURED',
    benchmarkIds: ['AIV-EI-D2-3-RELIEF-SOURCE', 'AIV-EI-D2-3-RECYCLE-SOURCE'],
  },
  {
    traceId: 'AIV-SRC-EI-D2-3-NONSONIC', namespace: 'AIV-SRC', sourceId: AIV_EI_D23_SOURCE.sourceId,
    locator: AIV_EI_D23_SOURCE.locator,
    subject: 'Published D.2.3 cases use non-sonic branch with SFF = 0',
    qualificationState: 'WORKED_EXAMPLE_EVIDENCE_CAPTURED',
    benchmarkIds: ['AIV-EI-D2-3-RELIEF-SOURCE', 'AIV-EI-D2-3-RECYCLE-SOURCE'],
  },
  {
    traceId: 'AIV-SRC-EI-D2-3-TRIM', namespace: 'AIV-SRC', sourceId: AIV_EI_D23_SOURCE.sourceId,
    locator: AIV_EI_D23_SOURCE.locator,
    subject: 'Manufacturer low-noise-trim reduction in recycle-valve example',
    qualificationState: 'WORKED_EXAMPLE_EVIDENCE_CAPTURED',
    benchmarkIds: ['AIV-EI-D2-3-RECYCLE-SOURCE'],
  },
  {
    traceId: 'AIV-SRC-EI-D2-3-SOURCE-PWL', namespace: 'AIV-SRC', sourceId: AIV_EI_D23_SOURCE.sourceId,
    locator: AIV_EI_D23_SOURCE.locator,
    subject: 'Published source-PWL benchmark outputs',
    qualificationState: 'WORKED_EXAMPLE_OUTPUT_CAPTURED',
    benchmarkIds: ['AIV-EI-D2-3-RELIEF-SOURCE', 'AIV-EI-D2-3-RECYCLE-SOURCE'],
  },
  {
    traceId: 'AIV-SRC-EI-D2-3-155DB', namespace: 'AIV-SRC', sourceId: AIV_EI_D23_SOURCE.sourceId,
    locator: AIV_EI_D23_SOURCE.locator,
    subject: 'Worked-example behavior around the 155 dB source-level branch',
    qualificationState: 'WORKED_EXAMPLE_BRANCH_EVIDENCE_ONLY',
    benchmarkIds: ['AIV-EI-D2-3-RELIEF-SOURCE', 'AIV-EI-D2-3-RECYCLE-SOURCE'],
    gaps: ['PRODUCTION_THRESHOLD_RULE_REQUIRES_MAIN_GUIDANCE_TRACE'],
  },
  {
    traceId: 'AIV-SRC-EI-D2-3-ATTENUATION', namespace: 'AIV-SRC', sourceId: AIV_EI_D23_SOURCE.sourceId,
    locator: AIV_EI_D23_SOURCE.locator,
    subject: 'Published relief-source downstream attenuation example',
    qualificationState: 'WORKED_EXAMPLE_EVIDENCE_CAPTURED',
    benchmarkIds: ['AIV-EI-D2-3-RELIEF-DISCONTINUITY'],
  },
  {
    traceId: 'AIV-SRC-EI-D2-3-T2-6', namespace: 'AIV-SRC', sourceId: AIV_EI_D23_SOURCE.sourceId,
    locator: AIV_EI_D23_SOURCE.locator,
    subject: 'Published T2-6 weldolet intermediate chain',
    qualificationState: 'PARTIAL_WORKED_EXAMPLE_CHAIN_CAPTURED',
    benchmarkIds: ['AIV-EI-D2-3-RELIEF-DISCONTINUITY'],
    gaps: ['FINAL_T2_6_LOF_NOT_YET_CAPTURED_FROM_CONTROLLED_SOURCE'],
  },
  {
    traceId: 'AIV-SRC-GAP-SONIC-SFF6', namespace: 'AIV-SRC', sourceId: AIV_EI_D23_SOURCE.sourceId,
    locator: AIV_EI_D23_SOURCE.locator, subject: 'Sonic SFF = 6 branch',
    qualificationState: 'INDEPENDENT_BENCHMARK_REQUIRED', benchmarkIds: [],
  },
  {
    traceId: 'AIV-SRC-GAP-MULTI-SOURCE', namespace: 'AIV-SRC', sourceId: AIV_EI_D23_SOURCE.sourceId,
    locator: AIV_EI_D23_SOURCE.locator, subject: 'Multiple simultaneous acoustic sources',
    qualificationState: 'INDEPENDENT_BENCHMARK_REQUIRED', benchmarkIds: [],
  },
  {
    traceId: 'AIV-EQ-GAP-MAIN-GUIDANCE', namespace: 'AIV-EQ', sourceId: null, locator: null,
    subject: 'Production equation chain and corrected EI main-guidance/errata source locations',
    qualificationState: 'SOURCE_LOCATION_AND_ERRATA_FREEZE_REQUIRED', benchmarkIds: [],
  },
]);

export const AIV_QUALIFICATION_EVIDENCE = deepFreeze({
  schema: AIV_QUALIFICATION_EVIDENCE_SCHEMA,
  methodId: 'VIB.AIV.ACOUSTIC',
  authority: {
    calculationState: 'BLOCKED', qualificationState: 'BLOCKED',
    screeningAuthority: 'NOT_AUTHORIZED', designAuthority: false,
  },
  sources: [AIV_EI_D23_SOURCE],
  traceItems: AIV_METHOD_TRACE_FOUNDATION,
  benchmarks: AIV_D23_BENCHMARK_CASES,
  productionEquationAuthorized: false,
});
