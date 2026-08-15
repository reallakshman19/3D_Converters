import { deepFreezeVibrationMaster } from './canonical.js';
import { buildVibrationMasterRegistry, inspectVibrationMasterCandidate } from './registry.js';

const EI_COMMON_SOURCE = Object.freeze({
  repository: 'reallaksh19/Common', commit: 'fb549185b9b27edc2379734240320a85c5bef9f6',
  path: 'EI - AVIFF Guidelines 2nd Edition.pdf', gitBlobSha1: '9d3eccc56429411e17c07a579bdebbd13cb0bdc5',
  sizeBytes: 10348594,
});
const P0_SOURCE = Object.freeze({
  repository: 'reallaksh19/Advanced_Analysis', commit: '6111ddbc0f27dd95b50a80c569a2c4daba3b3921',
  path: 'docs/EI data/P0_SBC_Master_Data.md', gitBlobSha1: '5312c9e2cf86af9e940ba722fcbee64702aeccd3',
  sizeBytes: 21154,
});
const EXAMPLES_SOURCE = Object.freeze({
  repository: 'reallaksh19/Advanced_Analysis', commit: '6111ddbc0f27dd95b50a80c569a2c4daba3b3921',
  path: 'docs/EI data/EI_AVIFF_Guidelines_2nd_Edition_Examples.md',
  gitBlobSha1: 'c050cd90802c27241c510c6f0ac43bfaf7a89e9d', sizeBytes: 99120,
});
const COMMON = Object.freeze({
  schema: 'VibrationMaster.v1', methodId: 'VIB.SBC.T3.TYPE3',
  edition: 'EI AVIFF 2nd Edition (2008)', revision: 'STAGE2-NONCURVE-CANDIDATE',
  authorityClass: 'EI_METHOD_MASTER', publicationState: 'CANDIDATE',
});
export const EI_AVIFF_SBC_T3_NONCURVE_MASTER_IDS = Object.freeze({
  geometryScores: 'EI_AVIFF.T3.FLOWCHART_T3_3.GEOMETRY_SCORES',
  locationScores: 'EI_AVIFF.T3.FLOWCHART_T3_9.LOCATION_SCORES',
  spanRule: 'EI_AVIFF.T3.TABLE_T3_2.MINIMUM_SPAN_RULE',
  combinationRule: 'EI_AVIFF.T3.TYPE3.COMBINATION_RULE',
});

const GEOMETRY_ROWS = Object.freeze([
  ['FITTING_TYPE','SHORT_CONTOURED_BODY',0.4],['FITTING_TYPE','CONTOURED_BODY',0.6],
  ['FITTING_TYPE','FORGED_REDUCING_TEE',0.6],['FITTING_TYPE','WELDED_TEE',0.6],
  ['FITTING_TYPE','WELDOLET',0.9],['FITTING_TYPE','THREADOLET_FULLY_BACK_WELDED',0.9],
  ['FITTING_TYPE','SCREWED_FULLY_BACK_WELDED',0.9],['FITTING_TYPE','THREADOLET',0.95],
  ['FITTING_TYPE','SCREWED',0.95],['FITTING_TYPE','SOCKOLET',1.0],
  ['FITTING_TYPE','THREADOLET_PARTIALLY_BACK_WELDED',1.1],['FITTING_TYPE','SCREWED_PARTIALLY_BACK_WELDED',1.1],
  ['FITTING_TYPE','SET_ON',1.3],['FITTING_TYPE','SET_IN',1.3],['FITTING_TYPE','SET_THRU',1.3],
  ['BRANCH_LENGTH_MM','LE_200_MM',0.1],['BRANCH_LENGTH_MM','GT_200_LE_400_MM',0.3],
  ['BRANCH_LENGTH_MM','GT_400_LE_600_MM',0.7],['BRANCH_LENGTH_MM','GT_600_MM',0.9],
  ['VALVE_FLANGE_BELOW_ANSI_900','FLANGE_ONLY',0.2],
  ['VALVE_FLANGE_BELOW_ANSI_900','ONE_VALVE_OR_INTEGRAL_DBB',0.5],
  ['VALVE_FLANGE_BELOW_ANSI_900','TWO_OR_MORE_VALVES',0.9],
  ['VALVE_FLANGE_ANSI_900_OR_GREATER','FLANGE_ONLY',0.5],
  ['VALVE_FLANGE_ANSI_900_OR_GREATER','ONE_OR_MORE_VALVES',0.9],
  ['PARENT_PIPE_SCHEDULE','10S',0.9],['PARENT_PIPE_SCHEDULE','20',0.8],
  ['PARENT_PIPE_SCHEDULE','40',0.7],['PARENT_PIPE_SCHEDULE','80',0.5],
  ['PARENT_PIPE_SCHEDULE','160',0.3],['PARENT_PIPE_SCHEDULE','GT_160',0.3],
  ['SBC_MIN_DIAMETER_IN','0.5',0.9],['SBC_MIN_DIAMETER_IN','0.75',0.8],
  ['SBC_MIN_DIAMETER_IN','1',0.7],['SBC_MIN_DIAMETER_IN','1.5',0.6],['SBC_MIN_DIAMETER_IN','2',0.5],
].map(([dimension, key, score]) => Object.freeze({ dimension, key, score })));

const LOCATION_ROWS = Object.freeze([
  ['LOCATION','VALVE',0.9],['LOCATION','REDUCER',0.9],['LOCATION','BEND',0.9],['LOCATION','TEE',0.9],
  ['LOCATION','MID_SPAN',0.7],['LOCATION','PARTIALLY_FIXED_SUPPORT',0.6],['LOCATION','FIXED_SUPPORT',0.1],
  ['PARENT_PIPE_SCHEDULE','10S',0.9],['PARENT_PIPE_SCHEDULE','20',0.8],['PARENT_PIPE_SCHEDULE','40',0.7],
  ['PARENT_PIPE_SCHEDULE','80',0.5],['PARENT_PIPE_SCHEDULE','160',0.3],['PARENT_PIPE_SCHEDULE','GT_160',0.3],
].map(([dimension, key, score]) => Object.freeze({ dimension, key, score })));

function source(base, locator) { return { ...base, locator }; }
const MASTERS = Object.freeze([
  Object.freeze({ ...COMMON, masterId: EI_AVIFF_SBC_T3_NONCURVE_MASTER_IDS.geometryScores,
    source: source(EI_COMMON_SOURCE, { sourceType:'RULE', identifier:'Flowchart T3-3 geometry scoring', section:'T3 / Appendix C', printedPage:74 }),
    dataSchema:'SbcT3GeometryScoreMaster.v1', data:{ aggregation:'ARITHMETIC_MEAN_OF_FIVE_SCORES', rows:GEOMETRY_ROWS } }),
  Object.freeze({ ...COMMON, masterId: EI_AVIFF_SBC_T3_NONCURVE_MASTER_IDS.locationScores,
    source: source(EI_COMMON_SOURCE, { sourceType:'RULE', identifier:'Flowchart T3-9 location scoring', section:'T3 / Appendix C.1.10', printedPage:80 }),
    dataSchema:'SbcT3LocationScoreMaster.v1', data:{ rows:LOCATION_ROWS } }),
  Object.freeze({ ...COMMON, masterId: EI_AVIFF_SBC_T3_NONCURVE_MASTER_IDS.spanRule,
    source: source(P0_SOURCE, { sourceType:'RULE', identifier:'Table T3-2 minimum-span disposition', section:'T3', printedPage:81, pdfPage:89 }),
    dataSchema:'SbcT3MinimumSpanRule.v1', data:{ belowMinimumLof:0.7, atOrAboveMinimumLof:0.2 } }),
  Object.freeze({ ...COMMON, masterId: EI_AVIFF_SBC_T3_NONCURVE_MASTER_IDS.combinationRule,
    source: source(EXAMPLES_SOURCE, { sourceType:'RULE', identifier:'Worked Examples D5-D8 SBC combination', section:'Appendix D' }),
    dataSchema:'SbcT3CombinationRule.v1', data:{ mainlineMultiplier:1.42, unknownMainlineLofForAssessment:1.0,
      locationLofWhenMainlineUnknown:1.0, locationLofWhenMainlineAtLeast1:1.0 } }),
]);

let registryPromise = null;
export function buildEiAviffSbcT3NonCurveCandidateRegistry() {
  registryPromise ??= buildVibrationMasterRegistry(MASTERS);
  return registryPromise;
}

export async function inspectEiAviffSbcT3NonCurveCandidate(masterId) {
  const registry = await buildEiAviffSbcT3NonCurveCandidateRegistry();
  return inspectVibrationMasterCandidate(registry, masterId);
}

export async function inspectEiAviffSbcT3ScoreCandidate(masterId, dimension, key) {
  const inspected = await inspectEiAviffSbcT3NonCurveCandidate(masterId);
  const rows = inspected.master.data?.rows;
  if (!Array.isArray(rows)) throw new Error('SBC_T3_SCORE_MASTER_INVALID');
  const row = rows.find((item) => item.dimension === dimension && item.key === String(key)) ?? null;
  if (!row) throw new Error('SBC_T3_MASTER_GRID_MISS');
  return deepFreezeVibrationMaster({
    schema:'SbcT3CandidateScoreResolution.v1', status:'CANDIDATE_ONLY', row,
    provenance:inspected.provenance, authority:inspected.authority,
  });
}

export async function inspectEiAviffSbcT3RuleCandidate(masterId) {
  const inspected = await inspectEiAviffSbcT3NonCurveCandidate(masterId);
  if (Array.isArray(inspected.master.data?.rows)) throw new Error('SBC_T3_RULE_MASTER_INVALID');
  return deepFreezeVibrationMaster({
    schema:'SbcT3CandidateRuleResolution.v1', status:'CANDIDATE_ONLY', data:inspected.master.data,
    provenance:inspected.provenance, authority:inspected.authority,
  });
}
