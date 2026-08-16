import { createEngineeringCapabilityLifecycle } from '../../engineering-calculations/lifecycle.js';

export const SBC_PUBLIC_CALCULATION_ID = 'VIB.SBC.SMALL_BORE';
export const SBC_ASSESSMENT_UNIT_TYPE = 'SBC_CONNECTION';
export const SBC_VERTICAL_MANIFEST_VERSION = 'SbcVerticalManifest.v1';

export const SBC_VERTICAL_ISSUES = Object.freeze({
  scaffold: 563,
  family: 429,
  type3Evidence: 514,
  roadmapPr: 560,
});

export const SBC_TYPE_IDS = Object.freeze(['TYPE_1', 'TYPE_2', 'TYPE_3', 'TYPE_4']);

export const SBC_VERTICAL_LIFECYCLE = createEngineeringCapabilityLifecycle({
  state: 'RESERVED',
  issueNumbers: [SBC_VERTICAL_ISSUES.scaffold, SBC_VERTICAL_ISSUES.family],
  notes: [
    'Public API/UI slot exists but SBC numerical execution remains fail-closed.',
    'Qualification and authority promotion are separate reviewed operations.',
  ],
});

const COMMON_BLOCKERS = Object.freeze([
  'SBC_ENGINEERING_METHOD_SPECIFICATION_NOT_FROZEN',
  'SBC_MAIN_LINE_ASSESSMENT_CONTRACT_NOT_QUALIFIED',
  'SBC_REQUIRED_ACTION_CONTRACT_NOT_QUALIFIED',
]);

function typeSlot(typeId, exampleId, nextFile, targetFunction, options = {}) {
  return Object.freeze({
    schema: 'SbcTypeImplementationSlot.v1',
    typeId,
    assessmentUnitType: SBC_ASSESSMENT_UNIT_TYPE,
    lifecycle: SBC_VERTICAL_LIFECYCLE,
    executionAllowed: false,
    owningIssues: Object.freeze([
      SBC_VERTICAL_ISSUES.scaffold,
      SBC_VERTICAL_ISSUES.family,
      ...(options.issueNumbers ?? []),
    ]),
    benchmarkRequirements: Object.freeze({
      publishedB1: Object.freeze({ required: true, exampleId }),
      independentB2: Object.freeze({ required: true, minimumFamilies: 1 }),
      branchBoundaryRegression: 'REQUIRED_ADDITIONAL_EVIDENCE',
    }),
    requiredTraceNamespaces: Object.freeze([
      'SBC-APP-*', 'SBC-TYPE-*', 'SBC-EQ-*', 'SBC-TBL-*',
      'SBC-FIG-*', 'SBC-CONST-*', 'SBC-ASS-*', 'SBC-SRC-*', 'SBC-UNIT-*',
    ]),
    blockedBy: Object.freeze([...COMMON_BLOCKERS, ...(options.blockedBy ?? [])]),
    nextImplementationSeam: nextFile,
    implementationTarget: targetFunction,
  });
}

export const SBC_TYPE_IMPLEMENTATION_SLOTS = Object.freeze({
  TYPE_1: typeSlot('TYPE_1', 'EI_APPENDIX_D5', 'converters/vibration/sbc/type1/calculate-type1.js', 'calculateSbcType1'),
  TYPE_2: typeSlot('TYPE_2', 'EI_APPENDIX_D6', 'converters/vibration/sbc/type2/calculate-type2.js', 'calculateSbcType2'),
  TYPE_3: typeSlot('TYPE_3', 'EI_APPENDIX_D7', 'converters/vibration/sbc/type3/calculate-type3.js', 'calculateSbcType3', {
    issueNumbers: [SBC_VERTICAL_ISSUES.type3Evidence],
    blockedBy: [
      'SBC_T3_CURVES_BLOCKED_SOURCE_DATA_CONFLICT',
      'SBC_TYPE3_INDEPENDENT_B2_NOT_FROZEN',
      'EXISTING_TYPE3_CANDIDATE_NOT_PRODUCTION_AUTHORITY',
    ],
  }),
  TYPE_4: typeSlot('TYPE_4', 'EI_APPENDIX_D8', 'converters/vibration/sbc/type4/calculate-type4.js', 'calculateSbcType4'),
});

export const SBC_MAIN_LINE_INPUT_REQUIREMENT = Object.freeze({
  sourceContract: 'QUALIFIED_EI_MAIN_LINE_ASSESSMENT',
  fitOnlyAccepted: false,
  assessmentCompletenessRequired: true,
  unknownMainLineRule: 'SOURCE_QUALIFICATION_REQUIRED_BEFORE_IMPLEMENTATION',
});

export function getSbcTypeImplementationSlot(typeId) {
  const key = String(typeId ?? '').trim().toUpperCase();
  return SBC_TYPE_IMPLEMENTATION_SLOTS[key] ?? null;
}
