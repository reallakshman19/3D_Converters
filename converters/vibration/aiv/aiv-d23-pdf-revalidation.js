export const AIV_D23_PDF_REVALIDATION_SCHEMA = 'AivD23PdfRevalidation.v1';

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export const AIV_EI_EXAMPLES_PDF_SOURCE = deepFreeze({
  sourceId: 'AIV-SRC-EI-D2-3-PDF',
  repository: 'reallaksh19/Common',
  commit: 'fb549185b9b27edc2379734240320a85c5bef9f6',
  path: 'EI examples.pdf',
  gitBlob: '1ddef94f81bd30570d1b1f86b1d3e2acdcc17dec',
  sizeBytes: 1602640,
  locator: 'Appendix D / D.2.3 High Frequency Acoustic Excitation, printed pages 183-185',
  evidenceClass: 'EI_WORKED_EXAMPLE_PDF_REVALIDATION',
  sourceExtractionSchema: 'AivD23ExamplesSourceExtraction.v1',
  sourceExtractionCommand: 'extract:aiv-ei-d23-source',
  directBinaryExtractionState: 'CONTROLLED_EXTRACTION_GATE_IMPLEMENTED_EXECUTION_PENDING',
  productionAuthority: false,
});

export const AIV_D23_PDF_REVALIDATION = deepFreeze({
  schema: AIV_D23_PDF_REVALIDATION_SCHEMA,
  methodId: 'VIB.AIV.ACOUSTIC',
  source: AIV_EI_EXAMPLES_PDF_SOURCE,
  validationState: 'PUBLISHED_CHAIN_REVALIDATED_DIRECT_BLOB_EXTRACTION_GATE_IMPLEMENTED',
  sourceCases: {
    relief: {
      upstreamPressure: { value: 98, unit: 'barg' },
      downstreamPressure: { value: 0, unit: 'barg' },
      massFlow: { value: 53482, unit: 'kg/h' },
      upstreamTemperature: { value: 137, unit: 'degC' },
      molecularWeight: { value: 21.75, unit: 'g/mol' },
      sonicState: 'NON_SONIC',
      sonicFlowFactorDb: 0,
      publishedSourcePwlDb: 164.7,
    },
    recycle: {
      upstreamPressure: { value: 87, unit: 'barg' },
      downstreamPressure: { value: 25, unit: 'barg' },
      massFlow: { value: 53482, unit: 'kg/h' },
      upstreamTemperature: { value: 136.7, unit: 'degC' },
      molecularWeight: { value: 21.75, unit: 'g/mol' },
      sonicState: 'NON_SONIC',
      sonicFlowFactorDb: 0,
      publishedSourcePwlDb: 159.4,
      lowNoiseTrim: {
        state: 'MANUFACTURER_REDUCTION',
        reduction: { value: 30, unit: 'dB', qualifier: 'approximately' },
        consequence: 'REDUCED_SOURCE_PWL_BELOW_155_DB_AND_MAIN_LINE_LOF_SET_TO_0_29',
      },
    },
  },
  reliefFirstDiscontinuity: {
    assessmentDescription: '2-inch bypass weldolet',
    sourceToAssessmentDistance: { value: 0.8, unit: 'm' },
    mainPipeInsideDiameter: { value: 154, unit: 'mm' },
    mainPipeOutsideDiameter: { value: 168.3, unit: 'mm' },
    mainPipeWallThickness: { value: 7.11, unit: 'mm' },
    branchOutsideDiameter: { value: 60.3, unit: 'mm' },
    published: {
      attenuationDb: 0.312,
      sourcePwlDb: 164.7,
      assessmentPwlDb: 164.4,
      A: 0.93989,
      S: 68.229,
      B: 152.207,
      log10N: 9.9026,
      N: 7.99e9,
      diameterRatio: 2.791,
      FLM1: 1.2133,
      NAfterFLM1: 9.70e9,
      FLM2: 0.2009,
      NAfterFLM2: 1.95e9,
      materialDuplex: false,
      Lf: 0.31,
      LOF: 0.29,
    },
    arithmeticReconciliation: {
      state: 'OPEN',
      item: 'FLM1',
      equationRecalculatedFromDisplayedInputs: 1.2109758194311824,
      publishedValue: 1.2133,
      absoluteDifference: 0.002324180568817627,
      relativeDifferenceFraction: 0.001915586061829413,
      consequence: 'FINAL_LOF_UNCHANGED_AT_0_29',
      requiredDisposition: 'RECONCILE_PRINTED_EQUATION_DISPLAYED_INPUTS_AND_PUBLISHED_FLM1_BEFORE_PRODUCTION_TRANSCRIPTION',
    },
  },
  remainingQualificationGates: [
    'DIRECT_EXTRACT_PINNED_EI_EXAMPLES_PDF',
    'RECONCILE_D2_3_PUBLISHED_FLM1_ARITHMETIC',
    'CONTROLLED_T2_7_HUMAN_RECONCILIATION',
    'INDEPENDENT_SONIC_SFF6_BENCHMARK',
    'INDEPENDENT_MULTI_SOURCE_BENCHMARK',
    'RETAINED_WORKBOOK_RECONCILIATION',
    'INDEPENDENT_VIBRATION_ENGINEER_PROMOTION_REVIEW',
  ],
  authority: {
    calculationState: 'BLOCKED',
    qualificationState: 'BLOCKED',
    screeningAuthority: 'NOT_AUTHORIZED',
    designAuthority: false,
    productionEquationAuthorized: false,
  },
});
