import { AIV_T2_6_ERRATA_FEED_EQUATION } from './aiv-errata-evidence.js';

export const AIV_T26_SCHEMA = 'AivT26DiscontinuityResult.v1';
export const AIV_T26_SOURCE_BINDING = Object.freeze({
  publication: 'Energy Institute AVIFF 2nd Edition',
  technicalModule: 'T2.7',
  flowchartId: 'T2-6',
  sourceRepository: 'reallaksh19/Advanced_Analysis',
  sourceMergeCommit: 'ca53d589b79fc34f5a5616c0ce7de00e06c13df4',
  sourceFlowchartBlob: '176d98565f582983c78868aa6210848a16f75881',
  sourceRegisterBlob: '968e48e679e8a50e7a1247a24cfd7adfc63ca37c',
  qualificationState: 'SOURCE_CORROBORATED_D2_3_REPRODUCED',
  productionReleaseQualificationRequired: true,
  designAuthority: false,
});

const SUPPORTED_TYPES = Object.freeze(['WELDOLET', 'WELDED_TEE']);
const SUPPORTED_LENGTH_UNITS = Object.freeze(['mm', 'm']);

function issue(kind, code, field, message) {
  return Object.freeze({ kind, code, field, message });
}

function lengthMm(quantity, field) {
  const value = Number(quantity?.value);
  const unit = String(quantity?.unit ?? '').trim();
  if (!(value > 0)) throw new RangeError(`${field} must be finite and positive.`);
  if (unit === 'mm') return value;
  if (unit === 'm') return value * 1000;
  throw new RangeError(`${field} must use mm or m.`);
}

function errataLog10N(B) {
  const c = AIV_T2_6_ERRATA_FEED_EQUATION.coefficients;
  return c.c0 + c.cLog10B * Math.log10(B) + c.cInvSqrtB / Math.sqrt(B) + c.cInvBPower / B ** 0.1;
}

function flm1(ratio) {
  if (ratio >= 10) return 0.5;
  return -0.07 + 0.91 * ratio + 1.32 / ratio - 0.48 * ratio ** 1.5 + 0.065 * ratio ** 2;
}

function flm2(pointPwlDb) {
  return 0.29 + 0.09 * Math.tanh((pointPwlDb - 172) / 2.9);
}

function flm3(pointPwlDb) {
  return 0.263 + 0.087 * Math.tanh((pointPwlDb - 172) / 2.9);
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

export function validateAivT26Assessment(assessment) {
  const issues = [];
  if (!assessment || typeof assessment !== 'object') {
    issues.push(issue('MISSING', 'AIV_T26_ASSESSMENT_REQUIRED', 'assessment', 'T2.6 requires an assessment record.'));
    return Object.freeze({ valid: false, issues });
  }
  if (!SUPPORTED_TYPES.includes(assessment.assessmentType)) {
    issues.push(issue('METHOD_GAP', 'AIV_T26_ASSESSMENT_TYPE_UNQUALIFIED', 'assessment.assessmentType', 'Current T2.6 screening envelope is limited to WELDOLET and WELDED_TEE.'));
  }
  for (const [field, quantity] of [
    ['mainOutsideDiameter', assessment.mainOutsideDiameter],
    ['mainWallThickness', assessment.mainWallThickness],
    ['branchOutsideDiameter', assessment.branchOutsideDiameter],
  ]) {
    if (!quantity) issues.push(issue('MISSING', 'AIV_T26_DIMENSION_REQUIRED', `assessment.${field}`, `${field} is required by T2.6.`));
    else if (!(Number(quantity.value) > 0)) issues.push(issue('INVALID', 'AIV_T26_DIMENSION_NOT_POSITIVE', `assessment.${field}`, `${field} must be greater than zero.`));
    else if (!SUPPORTED_LENGTH_UNITS.includes(String(quantity.unit ?? '').trim())) issues.push(issue('INVALID', 'AIV_T26_DIMENSION_UNIT_UNSUPPORTED', `assessment.${field}`, `${field} must use mm or m.`));
  }
  if (!['YES', 'NO'].includes(assessment.duplexState)) {
    issues.push(issue('MISSING', 'AIV_T26_DUPLEX_STATE_REQUIRED', 'assessment.duplexState', 'T2.6 requires explicit YES or NO Duplex state.'));
  }
  return Object.freeze({ valid: issues.length === 0, issues: Object.freeze(issues) });
}

export function calculateAivT26Discontinuity({ pointPwlDb, assessment } = {}) {
  const validation = validateAivT26Assessment(assessment);
  if (!validation.valid) {
    const error = new Error(`AIV_T26_INPUT_INVALID:${validation.issues.map((item) => item.code).join(',')}`);
    error.name = 'AivT26InputError';
    error.issues = validation.issues;
    throw error;
  }
  if (!Number.isFinite(pointPwlDb)) throw new TypeError('AIV T2.6 point PWL must be finite.');
  const DextMm = lengthMm(assessment.mainOutsideDiameter, 'Main Outside Diameter');
  const wallMm = lengthMm(assessment.mainWallThickness, 'Main Wall Thickness');
  const branchDextMm = lengthMm(assessment.branchOutsideDiameter, 'Branch Outside Diameter');
  const shapeRatio = DextMm / wallMm;
  const S = 91.9 - shapeRatio;
  const A = 3.28e-7 * shapeRatio ** 3 - 8.503e-5 * shapeRatio ** 2 + 7.063e-3 * shapeRatio + 0.816;
  const B = A * (pointPwlDb - 0.112762 * S - 0.001812 * S ** 2 + 4.307277e-5 * S ** 3);
  if (!(B > 0) || !Number.isFinite(B)) throw new RangeError('AIV T2.6 B must be finite and positive.');
  const log10N = errataLog10N(B);
  const N = 10 ** log10N;
  const diameterRatio = DextMm / branchDextMm;
  const FLM1 = flm1(diameterRatio);
  const NAfterFLM1 = N * FLM1;
  const FLM2Applied = assessment.assessmentType === 'WELDOLET';
  const FLM2 = FLM2Applied ? flm2(pointPwlDb) : 1;
  const NAfterFLM2 = NAfterFLM1 * FLM2;
  const FLM3Applied = assessment.duplexState === 'YES';
  const FLM3 = FLM3Applied ? flm3(pointPwlDb) : 1;
  const NAfterFLM3 = NAfterFLM2 * FLM3;
  const LfRaw = 3.1 - 0.1303 * Math.log(NAfterFLM3);
  const Lf = clamp01(LfRaw);
  const lof = Lf >= 0.5 ? Lf : 0.29;
  return Object.freeze({
    schema: AIV_T26_SCHEMA,
    A, S, B, log10N, N, diameterRatio,
    FLM1, FLM1Mode: 'SOURCE_CALCULATED', calculatedFLM1FromGeometry: FLM1,
    FLM2, FLM2Applied, NAfterFLM1, NAfterFLM2,
    FLM3, FLM3Applied, NAfterFLM3,
    LfRaw, Lf, lof,
    sourceBinding: AIV_T26_SOURCE_BINDING,
  });
}
