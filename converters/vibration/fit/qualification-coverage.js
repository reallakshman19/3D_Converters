const EVIDENCE = Object.freeze({
  EI_WORKED_EXAMPLE_POINT: 'EI_WORKED_EXAMPLE_POINT',
  RETAINED_WORKBOOK_PARITY: 'RETAINED_WORKBOOK_PARITY',
  INDEPENDENT_HAND_BENCHMARK: 'INDEPENDENT_HAND_BENCHMARK',
  EQUIVALENCE_TEST: 'EQUIVALENCE_TEST',
  NO_INDEPENDENT_EXAMPLE: 'NO_INDEPENDENT_EXAMPLE',
});

export const FIT_QUALIFICATION_EVIDENCE_TYPES = EVIDENCE;

const STANDARD_CORRELATION_EVIDENCE = Object.freeze({
  STIFF: Object.freeze({
    evidenceTypes: Object.freeze([EVIDENCE.EI_WORKED_EXAMPLE_POINT, EVIDENCE.RETAINED_WORKBOOK_PARITY]),
    evidenceIds: Object.freeze(['EI-D4-FIT-SEPARATOR-INLET-20IN', 'FIT-WORKBOOK-STANDARD-STIFF']),
    independentExampleCoverage: true,
  }),
  MEDIUM_STIFF: Object.freeze({
    evidenceTypes: Object.freeze([EVIDENCE.EI_WORKED_EXAMPLE_POINT, EVIDENCE.RETAINED_WORKBOOK_PARITY]),
    evidenceIds: Object.freeze([
      'EI-D2-FIT-RECYCLE-SUCTION-6IN',
      'EI-D2-FIT-RELIEF-UPSTREAM-4IN',
      'EI-D2-FIT-RELIEF-DOWNSTREAM-6IN',
      'FIT-WORKBOOK-STANDARD-MEDIUM-STIFF',
    ]),
    independentExampleCoverage: true,
  }),
  MEDIUM_SMALL: Object.freeze({
    evidenceTypes: Object.freeze([EVIDENCE.INDEPENDENT_HAND_BENCHMARK, EVIDENCE.RETAINED_WORKBOOK_PARITY]),
    evidenceIds: Object.freeze(['FIT-HAND-STANDARD-FAMILY-MEDIUM-SMALL', 'FIT-WORKBOOK-STANDARD-MEDIUM-SMALL']),
    independentExampleCoverage: false,
  }),
  MEDIUM_LARGE: Object.freeze({
    evidenceTypes: Object.freeze([EVIDENCE.INDEPENDENT_HAND_BENCHMARK, EVIDENCE.RETAINED_WORKBOOK_PARITY]),
    evidenceIds: Object.freeze(['FIT-HAND-MULTIPHASE-MEDIUM-003', 'FIT-WORKBOOK-STANDARD-MEDIUM-LARGE']),
    independentExampleCoverage: false,
  }),
  FLEXIBLE_SMALL: Object.freeze({
    evidenceTypes: Object.freeze([EVIDENCE.INDEPENDENT_HAND_BENCHMARK, EVIDENCE.RETAINED_WORKBOOK_PARITY]),
    evidenceIds: Object.freeze(['FIT-HAND-FLEX-SMALL-LOF-105-FN2', 'FIT-WORKBOOK-STANDARD-FLEXIBLE-SMALL']),
    independentExampleCoverage: false,
  }),
  FLEXIBLE_LARGE: Object.freeze({
    evidenceTypes: Object.freeze([EVIDENCE.EI_WORKED_EXAMPLE_POINT, EVIDENCE.RETAINED_WORKBOOK_PARITY]),
    evidenceIds: Object.freeze(['EI-D4-FIT-PRODUCED-WATER-10IN', 'FIT-WORKBOOK-STANDARD-FLEXIBLE-LARGE']),
    independentExampleCoverage: true,
  }),
});

function frozenEvidence({ evidenceTypes = [], evidenceIds = [], independentExampleCoverage = false, ...details }) {
  return Object.freeze({
    ...details,
    evidenceTypes: Object.freeze([...evidenceTypes]),
    evidenceIds: Object.freeze([...evidenceIds]),
    independentExampleCoverage,
  });
}

function phasePathEvidence(calculation) {
  const phase = calculation.input?.phase;
  if (phase === 'GAS') {
    return frozenEvidence({
      phase,
      path: 'SINGLE_PHASE_GAS',
      evidenceTypes: [EVIDENCE.EI_WORKED_EXAMPLE_POINT, EVIDENCE.RETAINED_WORKBOOK_PARITY],
      evidenceIds: [
        'EI-D2-FIT-RECYCLE-SUCTION-6IN',
        'EI-D2-FIT-RELIEF-UPSTREAM-4IN',
        'EI-D2-FIT-RELIEF-DOWNSTREAM-6IN',
        'WB-REF-001',
      ],
      independentExampleCoverage: true,
    });
  }
  if (phase === 'LIQUID') {
    return frozenEvidence({
      phase,
      path: 'SINGLE_PHASE_LIQUID',
      evidenceTypes: [EVIDENCE.EI_WORKED_EXAMPLE_POINT, EVIDENCE.INDEPENDENT_HAND_BENCHMARK],
      evidenceIds: ['EI-D4-FIT-PRODUCED-WATER-10IN', 'FIT-HAND-LIQ-STIFF-001'],
      independentExampleCoverage: true,
    });
  }
  if (phase === 'MULTIPHASE' && calculation.hydraulics?.resolutionMode === 'AGGREGATE_EFFECTIVE') {
    return frozenEvidence({
      phase,
      path: 'MULTIPHASE_AGGREGATE_EFFECTIVE',
      evidenceTypes: [EVIDENCE.EI_WORKED_EXAMPLE_POINT, EVIDENCE.EQUIVALENCE_TEST],
      evidenceIds: ['EI-D4-FIT-SEPARATOR-INLET-20IN', 'FIT-D4-AGGREGATE-COMPONENT-EQUIVALENCE'],
      independentExampleCoverage: true,
    });
  }
  if (phase === 'MULTIPHASE' && calculation.hydraulics?.resolutionMode === 'COMPONENT_DERIVED') {
    return frozenEvidence({
      phase,
      path: 'MULTIPHASE_COMPONENT_DERIVED',
      evidenceTypes: [EVIDENCE.RETAINED_WORKBOOK_PARITY, EVIDENCE.INDEPENDENT_HAND_BENCHMARK, EVIDENCE.EQUIVALENCE_TEST],
      evidenceIds: ['WB-REF-003', 'FIT-HAND-MULTIPHASE-MEDIUM-003', 'FIT-D4-AGGREGATE-COMPONENT-EQUIVALENCE'],
      independentExampleCoverage: false,
    });
  }
  return frozenEvidence({
    phase: phase ?? null,
    path: 'UNCLASSIFIED',
    evidenceTypes: [EVIDENCE.NO_INDEPENDENT_EXAMPLE],
    evidenceIds: [],
    independentExampleCoverage: false,
  });
}

function standardCorrelationEvidence(calculation) {
  const supportCategory = calculation.standard?.correlation?.category ?? calculation.support?.category ?? null;
  const entry = STANDARD_CORRELATION_EVIDENCE[supportCategory];
  if (!entry) {
    return frozenEvidence({
      supportCategory,
      evidenceTypes: [EVIDENCE.NO_INDEPENDENT_EXAMPLE],
      evidenceIds: [],
      independentExampleCoverage: false,
    });
  }
  return frozenEvidence({ supportCategory, ...entry });
}

function advancedCorrelationEvidence(calculation) {
  if (!calculation.advanced) {
    return frozenEvidence({
      used: false,
      supportCategory: calculation.support?.category ?? null,
      evidenceTypes: [],
      evidenceIds: [],
      independentExampleCoverage: false,
    });
  }
  return frozenEvidence({
    used: true,
    supportCategory: calculation.advanced.correlation?.category ?? calculation.support?.category ?? null,
    evidenceTypes: [EVIDENCE.INDEPENDENT_HAND_BENCHMARK, EVIDENCE.RETAINED_WORKBOOK_PARITY],
    evidenceIds: [
      'FIT-HAND-FLEX-SMALL-LOF-105-FN2',
      'FIT-HAND-FLEX-SMALL-LOF-105-FN3',
      'FIT-WORKBOOK-ADVANCED-CORRELATION',
    ],
    independentExampleCoverage: false,
  });
}

function referenceBandEvidence(calculation) {
  return frozenEvidence({
    evidenceTypes: [EVIDENCE.EI_WORKED_EXAMPLE_POINT, EVIDENCE.INDEPENDENT_HAND_BENCHMARK],
    evidenceIds: [
      'EI-D2-FIT-RECYCLE-SUCTION-6IN',
      'EI-D2-FIT-RELIEF-UPSTREAM-4IN',
      'EI-D2-FIT-RELIEF-DOWNSTREAM-6IN',
      'EI-D4-FIT-SEPARATOR-INLET-20IN',
      'EI-D4-FIT-PRODUCED-WATER-10IN',
      'FIT-HAND-FLEX-SMALL-LOF-095',
      'FIT-HAND-FLEX-SMALL-LOF-100-FN1',
      'FIT-HAND-FLEX-SMALL-LOF-105-FN2',
    ],
    independentExampleCoverage: true,
  });
}

export function evaluateFitQualificationCoverage(calculation = {}) {
  return Object.freeze({
    coverageId: 'FIT-REFERENCE-COVERAGE-V1',
    screeningQualified: false,
    engineeringAuthority: 'NONE',
    phasePath: phasePathEvidence(calculation),
    standardCorrelation: standardCorrelationEvidence(calculation),
    advancedCorrelation: advancedCorrelationEvidence(calculation),
    referenceBand: referenceBandEvidence(calculation),
    limitations: Object.freeze([
      'EVIDENCE_COVERAGE_DOES_NOT_GRANT_ENGINEERING_AUTHORITY',
      'EI_WORKED_EXAMPLES_COVER_ONLY_SPECIFIC_METHOD_POINTS',
      'ADVANCED_CORRELATIONS_HAVE_NO_EI_APPENDIX_D_WORKED_EXAMPLE_POINT_IN_THIS QUALIFICATION_SET'.replace('THIS QUALIFICATION', 'THIS_QUALIFICATION'),
      'MANUAL_DIAMETER_GAP_219_1_TO_273_MM_REMAINS_FAIL_CLOSED',
    ]),
  });
}
