import {
  buildFitVibrationMechanismAssessmentSet,
  createVibrationMechanismAssessmentSet,
} from '../converters/vibration/mechanisms/index.js';

export const VIBRATION_INTEGRITY_MECHANISMS = Object.freeze([
  Object.freeze({
    id: 'fit', label: 'FIT', title: 'Flow-induced turbulence',
    sourceSection: 'EI AVIFF T2.2', implementationState: 'BENCHMARK_ONLY',
  }),
  Object.freeze({
    id: 'mechanicalExcitation', label: 'Mechanical', title: 'Mechanical excitation',
    sourceSection: 'EI AVIFF T2.3', implementationState: 'NOT_IMPLEMENTED',
  }),
  Object.freeze({
    id: 'reciprocatingPulsation', label: 'Recip / PD',
    title: 'Pulsation from reciprocating / positive-displacement items',
    sourceSection: 'EI AVIFF T2.4', implementationState: 'NOT_IMPLEMENTED',
  }),
  Object.freeze({
    id: 'rotatingStall', label: 'Rotating stall', title: 'Pulsation from rotating stall',
    sourceSection: 'EI AVIFF T2.5', implementationState: 'NOT_IMPLEMENTED',
  }),
  Object.freeze({
    id: 'deadlegPulsation', label: 'Deadlegs', title: 'Flow-induced pulsation from deadlegs',
    sourceSection: 'EI AVIFF worked-example section', implementationState: 'NOT_IMPLEMENTED',
  }),
  Object.freeze({
    id: 'corrugationPulsation', label: 'Corrugations', title: 'Pulsation from corrugated pipes',
    sourceSection: 'EI Subsea AVIFF E4.3', implementationState: 'NOT_IMPLEMENTED',
  }),
  Object.freeze({
    id: 'slugFlow', label: 'Slug', title: 'Slug flow',
    sourceSection: 'EI AVIFF specialist assessment', implementationState: 'NOT_IMPLEMENTED',
  }),
  Object.freeze({
    id: 'aiv', label: 'AIV', title: 'High-frequency acoustic-induced vibration',
    sourceSection: 'EI AVIFF T2.7', implementationState: 'NOT_IMPLEMENTED',
  }),
  Object.freeze({
    id: 'valveTransients', label: 'Transients', title: 'Valve transients',
    sourceSection: 'EI AVIFF T2.8', implementationState: 'NOT_IMPLEMENTED',
  }),
  Object.freeze({
    id: 'cavitationFlashing', label: 'Cav / flash', title: 'Cavitation and flashing',
    sourceSection: 'EI AVIFF T2.9', implementationState: 'NOT_IMPLEMENTED',
  }),
  Object.freeze({
    id: 'thermowells', label: 'Thermowells', title: 'Thermowells',
    sourceSection: 'ASME PTC 19.3 TW-2016', implementationState: 'NOT_IMPLEMENTED',
  }),
  Object.freeze({
    id: 'smallBoreConnections', label: 'SBC', title: 'Small-bore connections',
    sourceSection: 'EI AVIFF Guidelines', implementationState: 'NOT_IMPLEMENTED',
  }),
]);

const MECHANISM_BY_ID = new Map(
  VIBRATION_INTEGRITY_MECHANISMS.map((mechanism) => [mechanism.id, mechanism]),
);

function rowScope(row = {}) {
  return { line: row.line, caseId: row.caseId ?? null, canonicalId: row.canonicalId };
}

function fitAssessment(row, mechanism, context) {
  const contractSet = buildFitVibrationMechanismAssessmentSet({
    row,
    fitDetail: context.fitDetail ?? null,
    resultState: context.resultState ?? null,
    benchmark: context.benchmark ?? null,
    workingCells: context.workingCells ?? null,
  });
  const item = contractSet.items[0];
  return Object.freeze({
    mechanism,
    contractSet,
    itemId: item.itemId,
    assessmentState: item.assessmentState === 'CALCULATED' ? 'CALCULATED_BENCHMARK' : item.assessmentState,
    calculated: Boolean(item.result?.calculated),
    lof: item.result?.governingLof ?? null,
    referenceBand: item.result?.referenceBand ?? null,
    qualificationState: item.qualification?.effective ?? null,
    resultState: item.resultState,
  });
}

function unavailableAssessment(row, mechanism) {
  const contractSet = createVibrationMechanismAssessmentSet({
    mechanismId: mechanism.id,
    scope: rowScope(row),
    items: [],
  });
  return Object.freeze({
    mechanism,
    contractSet,
    itemId: null,
    assessmentState: 'NOT_IMPLEMENTED',
    calculated: false,
    lof: null,
    referenceBand: null,
    qualificationState: null,
    resultState: 'UNRUN',
  });
}

export function buildVibrationMechanismAssessment(row, mechanismId, context = {}) {
  const mechanism = MECHANISM_BY_ID.get(mechanismId);
  if (!mechanism) throw new Error(`Unknown vibration mechanism: ${mechanismId}`);
  if (mechanism.id === 'fit') return fitAssessment(row, mechanism, context);
  return unavailableAssessment(row, mechanism);
}

export function buildVibrationMechanismMatrixRow(row, context = {}) {
  const assessments = VIBRATION_INTEGRITY_MECHANISMS.map((mechanism) => (
    buildVibrationMechanismAssessment(row, mechanism.id, context)
  ));
  const retainedImplementedGoverning = assessments.find((assessment) => (
    assessment.mechanism.id === 'fit' && assessment.calculated
  )) ?? null;
  const implementedGoverning = retainedImplementedGoverning?.resultState === 'CURRENT_RESULT'
    ? retainedImplementedGoverning
    : null;
  return Object.freeze({
    row,
    assessments: Object.freeze(assessments),
    implementedGoverning,
    retainedImplementedGoverning,
    fullScreeningGoverningEstablished: false,
  });
}
