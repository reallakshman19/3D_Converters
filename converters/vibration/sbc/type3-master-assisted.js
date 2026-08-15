import { resolveVibrationUserEngineeringData } from '../user-engineering-data.js';
import {
  EI_AVIFF_SBC_T3_MASTER_IDS,
  inspectEiAviffSbcT3TableCandidate,
  resolveEiAviffSbcT3CurveCandidate,
} from '../masters/ei-aviff-sbc-t3-candidate.js';
import {
  EI_AVIFF_SBC_T3_NONCURVE_MASTER_IDS,
  inspectEiAviffSbcT3RuleCandidate,
  inspectEiAviffSbcT3ScoreCandidate,
} from '../masters/ei-aviff-sbc-t3-noncurve-candidate.js';
import {
  SBC_TYPE3_BLOCKERS,
  SBC_TYPE3_RECORD_KEY,
  combineSbcType3Terms,
} from './type3-user-data.js';

export const SBC_TYPE3_MASTER_ASSISTED_METHOD_ID =
  'VIB.SBC.T3.TYPE3.MASTER_ASSISTED_CANDIDATE';

const AUTHORITY = Object.freeze({
  engineeringAuthority: 'NONE',
  screeningAuthority: 'NOT_AUTHORIZED',
  designAuthority: false,
  masterDataAuthority: false,
  methodStatus: 'CANDIDATE_MASTER_ASSISTED',
  qualificationStatus: 'NOT_QUALIFIED',
});

const FIGURE_BY_BLOCKER = Object.freeze({
  [SBC_TYPE3_BLOCKERS.figureT31]: 'T3-1',
  [SBC_TYPE3_BLOCKERS.figureT32]: 'T3-2',
  [SBC_TYPE3_BLOCKERS.figureT33]: 'T3-3',
  [SBC_TYPE3_BLOCKERS.figureT34]: 'T3-4',
});

function positiveNumber(value, code) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) throw new TypeError(code);
  return numeric;
}

function normalizedScheduleText(value) {
  return String(value ?? '').trim().toUpperCase()
    .replace(/^SCHEDULE\s*/u, '').replace(/^SCH\s*/u, '');
}

export function sbcT3ParentScheduleKey(value) {
  const raw = normalizedScheduleText(value);
  if (raw === '10S') return '10S';
  const schedule = Number(raw);
  if (!Number.isFinite(schedule) || schedule < 10) {
    throw new Error('SBC_T3_PARENT_SCHEDULE_NOT_READY');
  }
  if (schedule > 160) return 'GT_160';
  const lower = [160, 80, 40, 20, 10].find((item) => schedule >= item);
  return lower === 10 ? '10S' : String(lower);
}

export function sbcT3BranchLengthKey(value) {
  const lengthMm = positiveNumber(value, 'SBC_T3_BRANCH_LENGTH_REQUIRED');
  if (lengthMm <= 200) return 'LE_200_MM';
  if (lengthMm <= 400) return 'GT_200_LE_400_MM';
  if (lengthMm <= 600) return 'GT_400_LE_600_MM';
  return 'GT_600_MM';
}

function valveScoreSelector(physical) {
  const rating = positiveNumber(
    physical.valvePressureClass,
    'SBC_T3_VALVE_PRESSURE_CLASS_REQUIRED',
  );
  const config = String(physical.valveConfiguration ?? '').trim().toUpperCase();
  if (rating >= 900) {
    if (config === 'FLANGE_ONLY') {
      return ['VALVE_FLANGE_ANSI_900_OR_GREATER', 'FLANGE_ONLY'];
    }
    if (['ONE_OR_MORE_VALVES', 'ONE_VALVE_OR_INTEGRAL_DBB', 'TWO_OR_MORE_VALVES'].includes(config)) {
      return ['VALVE_FLANGE_ANSI_900_OR_GREATER', 'ONE_OR_MORE_VALVES'];
    }
  } else if (['FLANGE_ONLY', 'ONE_VALVE_OR_INTEGRAL_DBB', 'TWO_OR_MORE_VALVES'].includes(config)) {
    return ['VALVE_FLANGE_BELOW_ANSI_900', config];
  }
  throw new Error('SBC_T3_VALVE_CONFIGURATION_NOT_READY');
}

function score(masterId, dimension, key) {
  return inspectEiAviffSbcT3ScoreCandidate(masterId, dimension, String(key));
}

async function geometryComponentC(physical) {
  if (physical.firstSpanHasUnsupportedMass !== true) {
    return Object.freeze({ value: 0, evidence: Object.freeze([]) });
  }
  const ids = EI_AVIFF_SBC_T3_NONCURVE_MASTER_IDS;
  const [valveDimension, valveKey] = valveScoreSelector(physical);
  const selectors = [
    [ids.geometryScores, 'FITTING_TYPE', physical.fittingKey],
    [ids.geometryScores, 'BRANCH_LENGTH_MM', sbcT3BranchLengthKey(physical.branchLengthMm)],
    [ids.geometryScores, valveDimension, valveKey],
    [ids.geometryScores, 'PARENT_PIPE_SCHEDULE', sbcT3ParentScheduleKey(physical.parentSchedule)],
    [ids.geometryScores, 'SBC_MIN_DIAMETER_IN', positiveNumber(physical.sbcMinDiameterIn, 'SBC_T3_DIAMETER_REQUIRED')],
  ];
  const evidence = await Promise.all(selectors.map((entry) => score(...entry)));
  const value = evidence.reduce((sum, item) => sum + item.row.score, 0) / evidence.length;
  return Object.freeze({ value, evidence: Object.freeze(evidence) });
}

async function minimumSpanComponentE(physical) {
  const size = positiveNumber(physical.sbcMinDiameterIn, 'SBC_T3_DIAMETER_REQUIRED');
  const firstSpanM = positiveNumber(physical.firstSpanLengthM, 'SBC_T3_FIRST_SPAN_REQUIRED');
  const ids = EI_AVIFF_SBC_T3_MASTER_IDS;
  const nonCurveIds = EI_AVIFF_SBC_T3_NONCURVE_MASTER_IDS;
  const [fitting, limit, rule] = await Promise.all([
    inspectEiAviffSbcT3TableCandidate(ids.fittingSpanFactors, { fittingKey: physical.fittingKey }),
    inspectEiAviffSbcT3TableCandidate(ids.firstSpanLimits, { sbcSizeIn: size }),
    inspectEiAviffSbcT3RuleCandidate(nonCurveIds.spanRule),
  ]);
  const modifiedSpanM = firstSpanM * fitting.row.fittingSpanFactor;
  const value = modifiedSpanM < limit.row.minimumAllowableFirstSpanM
    ? rule.data.belowMinimumLof : rule.data.atOrAboveMinimumLof;
  return Object.freeze({ value, modifiedSpanM, fitting, limit, rule });
}

async function firstLocationLof(physical, suppliedMainlineLof) {
  const ids = EI_AVIFF_SBC_T3_NONCURVE_MASTER_IDS;
  const rule = await inspectEiAviffSbcT3RuleCandidate(ids.combinationRule);
  if (suppliedMainlineLof === null) {
    return Object.freeze({
      mainlineLof: rule.data.unknownMainlineLofForAssessment,
      value: rule.data.locationLofWhenMainlineUnknown,
      evidence: Object.freeze([rule]),
    });
  }
  if (suppliedMainlineLof >= 1) {
    return Object.freeze({
      mainlineLof: suppliedMainlineLof,
      value: rule.data.locationLofWhenMainlineAtLeast1,
      evidence: Object.freeze([rule]),
    });
  }
  const [location, schedule] = await Promise.all([
    score(ids.locationScores, 'LOCATION', String(physical.locationKey ?? '').trim().toUpperCase()),
    score(ids.locationScores, 'PARENT_PIPE_SCHEDULE', sbcT3ParentScheduleKey(physical.parentSchedule)),
  ]);
  return Object.freeze({
    mainlineLof: suppliedMainlineLof,
    value: (location.row.score + schedule.row.score) / 2,
    evidence: Object.freeze([location, schedule, rule]),
  });
}

function curveRequest(scopeId, blockerId, sizeIn, spanM) {
  return Object.freeze({
    mechanismId: 'smallBoreConnections', blockerId, scopeId,
    recordKey: SBC_TYPE3_RECORD_KEY,
    xValue: String(sizeIn), xUnit: 'in', yValue: String(spanM), yUnit: 'm',
    value: '', unit: '1', sourceReference: '',
    notes: 'Manual curve read required while T3 curve master is quarantined.',
  });
}

function curveRequests(scopeId, physical, spanComponent) {
  const size = positiveNumber(physical.sbcMinDiameterIn, 'SBC_T3_DIAMETER_REQUIRED');
  const firstSpan = positiveNumber(physical.firstSpanLengthM, 'SBC_T3_FIRST_SPAN_REQUIRED');
  const dBlocker = physical.firstSpanHasUnsupportedMass
    ? SBC_TYPE3_BLOCKERS.figureT31 : SBC_TYPE3_BLOCKERS.figureT32;
  return Object.freeze([
    curveRequest(scopeId, dBlocker, size, firstSpan / spanComponent.fitting.row.fittingSpanFactor),
    curveRequest(scopeId, SBC_TYPE3_BLOCKERS.figureT33, size,
      positiveNumber(physical.subsequentMassSpanM, 'SBC_T3_SUBSEQUENT_MASS_SPAN_REQUIRED')),
    curveRequest(scopeId, SBC_TYPE3_BLOCKERS.figureT34, size,
      positiveNumber(physical.subsequentNoMassSpanM, 'SBC_T3_SUBSEQUENT_NO_MASS_SPAN_REQUIRED')),
  ]);
}

function resolveCurve(userRows, request, term) {
  const resolution = resolveVibrationUserEngineeringData(userRows, {
    ...request, valueType: 'NUMBER',
  });
  if (resolution.status !== 'RESOLVED_USER_INPUT') {
    return Object.freeze({
      ok: false, resolution,
      problem: Object.freeze({ term, status: resolution.status, reason: resolution.reason ?? null }),
    });
  }
  const value = Number(resolution.value);
  if (!Number.isFinite(value) || value < 0) {
    return Object.freeze({
      ok: false, resolution,
      problem: Object.freeze({ term, status: 'INVALID_INPUT', reason: 'NON_NEGATIVE_NUMBER_REQUIRED' }),
    });
  }
  return Object.freeze({ ok: true, value, resolution });
}

function normalizeMainlineLof(value) {
  if (value === undefined || value === null || value === '') return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) throw new TypeError('SBC_T3_MAINLINE_LOF_INVALID');
  return numeric;
}

export async function createSbcType3MasterAssistedCurveTemplate(options = {}) {
  const scopeId = String(options.scopeId ?? '').trim();
  if (!scopeId) throw new TypeError('SBC Type-3 master-assisted template requires a scopeId.');
  const physical = options.physical ?? {};
  if (typeof physical.firstSpanHasUnsupportedMass !== 'boolean') {
    throw new TypeError('SBC_T3_FIRST_SPAN_MASS_FLAG_REQUIRED');
  }
  const spanComponent = await minimumSpanComponentE(physical);
  return curveRequests(scopeId, physical, spanComponent);
}

function notReady(scopeId, reason, curveRequestsValue = Object.freeze([])) {
  return Object.freeze({
    ok: false, status: 'NOT_READY', methodId: SBC_TYPE3_MASTER_ASSISTED_METHOD_ID,
    scopeId,
    problems: Object.freeze([Object.freeze({
      term: 'masterAssistance', status: 'NOT_READY', reason,
    })]),
    curveRequests: curveRequestsValue,
    authority: AUTHORITY,
  });
}

export async function calculateSbcType3MasterAssistedCandidate(options = {}) {
  const scopeId = String(options.scopeId ?? '').trim();
  if (!scopeId) throw new TypeError('SBC Type-3 master-assisted evaluation requires a scopeId.');
  const physical = options.physical ?? {};
  if (typeof physical.firstSpanHasUnsupportedMass !== 'boolean') {
    return notReady(scopeId, 'SBC_T3_FIRST_SPAN_MASS_FLAG_REQUIRED');
  }
  try {
    const [c, eSpan, combination] = await Promise.all([
      geometryComponentC(physical), minimumSpanComponentE(physical),
      inspectEiAviffSbcT3RuleCandidate(EI_AVIFF_SBC_T3_NONCURVE_MASTER_IDS.combinationRule),
    ]);
    const location = await firstLocationLof(physical, normalizeMainlineLof(options.mainlineLof));
    const requests = curveRequests(scopeId, physical, eSpan);
    const curves = requests.map((request, index) => resolveCurve(
      options.userRows ?? [], request, ['LOFGEOM(D)', 'LOFGEOM(F)', 'LOFGEOM(G)'][index],
    ));
    const problems = curves.filter((item) => !item.ok).map((item) => item.problem);
    if (problems.length) {
      return Object.freeze({
        ok: false, status: 'NOT_READY', methodId: SBC_TYPE3_MASTER_ASSISTED_METHOD_ID,
        scopeId, problems: Object.freeze(problems), curveRequests: requests, authority: AUTHORITY,
      });
    }
    const quarantine = requests.map((request) => (
      resolveEiAviffSbcT3CurveCandidate(FIGURE_BY_BLOCKER[request.blockerId])
    ));
    const evidence = [
      ...c.evidence, eSpan.fitting, eSpan.limit, eSpan.rule,
      ...location.evidence, combination, ...curves.map((item) => item.resolution),
    ];
    const result = combineSbcType3Terms({
      scopeId, methodId: SBC_TYPE3_MASTER_ASSISTED_METHOD_ID,
      status: 'CALCULATED_MASTER_ASSISTED_CANDIDATE', authority: AUTHORITY, evidence,
      terms: {
        hasMass: physical.firstSpanHasUnsupportedMass,
        c: c.value, d: curves[0].value, e: eSpan.value,
        firstLocation: location.value, f: curves[1].value, g: curves[2].value,
        mainlineLof: location.mainlineLof,
        multiplier: combination.data.mainlineMultiplier,
      },
    });
    return Object.freeze({
      ...result,
      physical: Object.freeze({ ...physical }),
      curveRequests: requests,
      curveMasterStatus: Object.freeze(quarantine),
      masterAssistance: Object.freeze({
        geometryC: c.value, minimumSpanE: eSpan.value,
        modifiedMinimumSpanM: eSpan.modifiedSpanM,
        locationLof: location.value,
        mainlineLofForAssessment: location.mainlineLof,
        mainlineMultiplier: combination.data.mainlineMultiplier,
      }),
    });
  } catch (error) {
    return notReady(scopeId, String(error?.message || error));
  }
}
