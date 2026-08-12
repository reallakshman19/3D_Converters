export const VIBRATION_INTEGRITY_MECHANISMS = Object.freeze([
  Object.freeze({
    id: 'fit',
    label: 'FIT',
    title: 'Flow-induced turbulence',
    sourceSection: 'EI AVIFF T2.2',
    implementationState: 'BENCHMARK_ONLY',
  }),
  Object.freeze({
    id: 'mechanicalExcitation',
    label: 'Mechanical',
    title: 'Mechanical excitation',
    sourceSection: 'EI AVIFF T2.3',
    implementationState: 'NOT_IMPLEMENTED',
  }),
  Object.freeze({
    id: 'reciprocatingPulsation',
    label: 'Recip / PD',
    title: 'Pulsation from reciprocating / positive-displacement items',
    sourceSection: 'EI AVIFF T2.4',
    implementationState: 'NOT_IMPLEMENTED',
  }),
  Object.freeze({
    id: 'rotatingStall',
    label: 'Rotating stall',
    title: 'Pulsation from rotating stall',
    sourceSection: 'EI AVIFF T2.5',
    implementationState: 'NOT_IMPLEMENTED',
  }),
  Object.freeze({
    id: 'deadlegPulsation',
    label: 'Deadlegs',
    title: 'Flow-induced pulsation from deadlegs',
    sourceSection: 'EI AVIFF worked-example section',
    implementationState: 'NOT_IMPLEMENTED',
  }),
  Object.freeze({
    id: 'corrugationPulsation',
    label: 'Corrugations',
    title: 'Pulsation from corrugated pipes',
    sourceSection: 'EI Subsea AVIFF E4.3',
    implementationState: 'NOT_IMPLEMENTED',
  }),
  Object.freeze({
    id: 'slugFlow',
    label: 'Slug',
    title: 'Slug flow',
    sourceSection: 'EI AVIFF specialist assessment',
    implementationState: 'NOT_IMPLEMENTED',
  }),
  Object.freeze({
    id: 'aiv',
    label: 'AIV',
    title: 'High-frequency acoustic-induced vibration',
    sourceSection: 'EI AVIFF T2.7',
    implementationState: 'NOT_IMPLEMENTED',
  }),
  Object.freeze({
    id: 'valveTransients',
    label: 'Transients',
    title: 'Valve transients',
    sourceSection: 'EI AVIFF T2.8',
    implementationState: 'NOT_IMPLEMENTED',
  }),
  Object.freeze({
    id: 'cavitationFlashing',
    label: 'Cav / flash',
    title: 'Cavitation and flashing',
    sourceSection: 'EI AVIFF T2.9',
    implementationState: 'NOT_IMPLEMENTED',
  }),
  Object.freeze({
    id: 'thermowells',
    label: 'Thermowells',
    title: 'Thermowells',
    sourceSection: 'ASME PTC 19.3 TW-2016',
    implementationState: 'NOT_IMPLEMENTED',
  }),
  Object.freeze({
    id: 'smallBoreConnections',
    label: 'SBC',
    title: 'Small-bore connections',
    sourceSection: 'EI AVIFF Guidelines',
    implementationState: 'NOT_IMPLEMENTED',
  }),
]);

const MECHANISM_BY_ID = new Map(
  VIBRATION_INTEGRITY_MECHANISMS.map((mechanism) => [mechanism.id, mechanism]),
);

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function fitAssessment(row, mechanism) {
  const governing = finiteNumber(row?.governingReferenceLof);
  const standard = finiteNumber(row?.standardLof);
  const lof = governing ?? standard;
  const calculated = lof !== null;
  return Object.freeze({
    mechanism,
    assessmentState: calculated ? 'CALCULATED_BENCHMARK' : 'NOT_CALCULATED',
    calculated,
    lof,
    referenceBand: row?.referenceBand ?? null,
    qualificationState: row?.qualificationState ?? null,
  });
}

function unavailableAssessment(mechanism) {
  return Object.freeze({
    mechanism,
    assessmentState: 'NOT_IMPLEMENTED',
    calculated: false,
    lof: null,
    referenceBand: null,
    qualificationState: null,
  });
}

export function buildVibrationMechanismAssessment(row, mechanismId) {
  const mechanism = MECHANISM_BY_ID.get(mechanismId);
  if (!mechanism) throw new Error(`Unknown vibration mechanism: ${mechanismId}`);
  if (mechanism.id === 'fit') return fitAssessment(row, mechanism);
  return unavailableAssessment(mechanism);
}

export function buildVibrationMechanismMatrixRow(row) {
  const assessments = VIBRATION_INTEGRITY_MECHANISMS.map((mechanism) => (
    buildVibrationMechanismAssessment(row, mechanism.id)
  ));
  const implementedGoverning = assessments.find((assessment) => (
    assessment.mechanism.id === 'fit' && assessment.calculated
  )) ?? null;
  return Object.freeze({
    row,
    assessments: Object.freeze(assessments),
    implementedGoverning,
    fullScreeningGoverningEstablished: false,
  });
}
