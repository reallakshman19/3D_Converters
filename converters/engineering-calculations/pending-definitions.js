import {
  ENGINEERING_CALCULATION_CONTRACT_VERSION,
  createEngineeringCalculationError,
} from './contracts.js';
import { composeEngineeringQualification } from './qualification.js';
import { resolveFitPhysicalContext } from '../vibration/fit/physical-context.js';

const FIT_ID = 'VIB.FIV.FLOW_TURBULENCE';

const PENDING = Object.freeze([
  ['PIPE.EXTERNAL_PRESSURE.CHECK', 'PIPE', 'External Pressure Check', 428],
  ['PIPE.BRANCH.REINFORCEMENT', 'PIPE', 'Branch Reinforcement Assessment', 428],
  ['PIPE.SHELL_INDENTATION', 'PIPE', 'Pipe Shell / Local Loading Assessment', 428],
  [FIT_ID, 'VIB', 'Flow-Induced Turbulence (FIT) Screening', 429],
  ['VIB.AIV.ACOUSTIC', 'VIB', 'Acoustic-Induced Vibration Screening', 429],
  ['VIB.SBC.SMALL_BORE', 'VIB', 'Small-Bore Connection Vibration Screening', 429],
  ['VIB.CAVITATION.FLASHING', 'VIB', 'Cavitation / Flashing Screening', 429],
  ['VIB.SURGE.MOMENTUM', 'VIB', 'Surge / Momentum Load Screening', 429],
  ['VIB.SLUG.TIME_HISTORY', 'VIB', 'Slug Load / Time-History Assessment', 429],
  ['RELIEF.GAS.REACTION_FORCE', 'RELIEF', 'Gas / Vapour Relief Reaction Force', 430],
  ['RELIEF.LIQUID.REACTION_FORCE', 'RELIEF', 'Liquid Relief Reaction Force', 430],
  ['SUPPORT.TRUNNION.LOCAL_STRESS', 'SUPPORT', 'Trunnion Local Stress Assessment', 431],
  ['SUPPORT.WELDED_SHOE.CHECK', 'SUPPORT', 'Welded Shoe Assessment', 431],
  ['EQUIP.API610.NOZZLE_LOADS', 'EQUIP', 'API 610 Nozzle Load Check', 432],
  ['EQUIP.API617.LOAD_CHECK', 'EQUIP', 'API 617 Load Check', 432],
  ['EQUIP.NEMA_SM23.LOAD_CHECK', 'EQUIP', 'NEMA SM23 Load Check', 432],
  ['FLANGE.LEAKAGE.CHECK', 'FLANGE', 'Flange Leakage Assessment', 433],
  ['FLANGE.GRE.CHECK', 'FLANGE', 'GRE Flange Assessment', 433],
  ['HAZARD.BLAST.SCREENING', 'HAZARD', 'Blast Screening', 434],
]);

const FIT_PREFLIGHT_INPUTS = Object.freeze([
  Object.freeze({
    key: 'outsideDiameter', label: 'Outside diameter', type: 'number', required: true,
    quantity: 'length', canonicalUnit: 'm', minExclusive: 0,
  }),
  Object.freeze({
    key: 'wallThickness', label: 'Wall thickness', type: 'number', required: true,
    quantity: 'length', canonicalUnit: 'm', minExclusive: 0,
  }),
  Object.freeze({
    key: 'massFlow', label: 'Mass flow rate', type: 'number', required: true,
    quantity: 'mass_flow', canonicalUnit: 'kg/s', min: 0,
  }),
  Object.freeze({
    key: 'density', label: 'Fluid density', type: 'number', required: true,
    quantity: 'density', canonicalUnit: 'kg/m3', minExclusive: 0,
  }),
  Object.freeze({
    key: 'maximumUnsupportedSpan', label: 'Maximum unsupported span', type: 'number', required: false,
    quantity: 'length', canonicalUnit: 'm', minExclusive: 0,
  }),
]);

const FIT_FIELD_MAP = Object.freeze({
  outsideDiameterM: 'outsideDiameter',
  wallThicknessM: 'wallThickness',
  massFlowKgS: 'massFlow',
  densityKgM3: 'density',
  maximumUnsupportedSpanM: 'maximumUnsupportedSpan',
});

function blockedCalculation(id, issueNumber) {
  return {
    ok: false,
    errors: [createEngineeringCalculationError(
      'ENGINEERING_METHOD_BLOCKED',
      `${id} is blocked pending engineering qualification issue #${issueNumber}.`,
      { qualificationIssue: issueNumber },
    )],
    qualification: composeEngineeringQualification({
      method: 'BLOCKED',
      data: 'DRAFT',
      designAuthority: false,
      reasons: [`QUALIFICATION_ISSUE_${issueNumber}_OPEN`],
    }),
  };
}

function fitPhysicalInput(input) {
  return {
    outsideDiameterM: input.outsideDiameter,
    wallThicknessM: input.wallThickness,
    massFlowKgS: input.massFlow,
    densityKgM3: input.density,
    ...(input.maximumUnsupportedSpan !== undefined
      ? { maximumUnsupportedSpanM: input.maximumUnsupportedSpan }
      : {}),
  };
}

function fitPreflightValidation(input) {
  const physical = resolveFitPhysicalContext(fitPhysicalInput(input));
  if (!physical.ok) {
    return {
      ok: false,
      errors: physical.errors.map((error) => createEngineeringCalculationError(
        error.code === 'FIT_INPUT_REQUIRED' ? 'INPUT_REQUIRED' : 'INPUT_INVALID',
        error.message,
        { fitCode: error.code, ...error.details },
        FIT_FIELD_MAP[error.field] ?? error.field,
      )),
    };
  }
  return {
    ok: true,
    applicability: {
      applicable: null,
      status: 'NOT_EVALUATED',
      limitations: ['FIT method applicability is unavailable until qualification issue #429 is closed.'],
    },
    preflight: {
      authority: physical.authority,
      status: 'PHYSICAL_PREFLIGHT_ONLY',
      canonicalInput: physical.canonicalInput,
      derived: physical.derived,
      evidence: physical.evidence,
    },
  };
}

function fitPreflightOverrides(issueNumber) {
  return {
    purpose: 'Validate and resolve universal FIT physical inputs while numerical screening remains blocked pending engineering qualification issue #429.',
    inputs: FIT_PREFLIGHT_INPUTS,
    validateInput: fitPreflightValidation,
    applicability: {
      description: 'Physical preflight is available; FIT method applicability and engineering authority remain pending issue #429.',
      limitations: [
        'Physical preflight does not establish FIT method applicability.',
        'No numerical FIT screening kernel is registered.',
        `Qualification gate: GitHub issue #${issueNumber}.`,
      ],
    },
    ui: {
      preflightEnabled: true,
      preflightLabel: 'Physical preflight only',
    },
  };
}

export function createPendingEngineeringCalculationDefinition([id, family, name, issueNumber]) {
  const overrides = id === FIT_ID ? fitPreflightOverrides(issueNumber) : {};
  const baseUi = {
    visible: true,
    executionModes: [],
    minimumQualificationToShow: 'IMPLEMENTED',
    blockedReason: `Pending qualification issue #${issueNumber}`,
  };
  return {
    contractVersion: ENGINEERING_CALCULATION_CONTRACT_VERSION,
    id,
    family,
    name,
    shortName: name,
    methodRevision: 'pending-qualification',
    purpose: `${name} placeholder for catalogue discovery only; numerical implementation is not authorized until qualification issue #${issueNumber} is answered.`,
    authority: {
      calculationState: 'BLOCKED',
      qualificationState: 'BLOCKED',
      codeCompliance: false,
    },
    applicability: {
      description: `Method boundary and engineering authority are pending issue #${issueNumber}.`,
      limitations: [
        'No numerical engineering kernel is registered.',
        `Qualification gate: GitHub issue #${issueNumber}.`,
      ],
    },
    inputs: [],
    outputs: [],
    qualificationIssue: issueNumber,
    ...overrides,
    ui: { ...baseUi, ...(overrides.ui ?? {}) },
    calculate() {
      return blockedCalculation(id, issueNumber);
    },
  };
}

export const PENDING_ENGINEERING_CALCULATION_DEFINITIONS = Object.freeze(
  PENDING.map(createPendingEngineeringCalculationDefinition),
);
