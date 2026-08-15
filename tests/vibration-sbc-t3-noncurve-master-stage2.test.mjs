import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EI_AVIFF_SBC_T3_NONCURVE_MASTER_IDS,
  inspectEiAviffSbcT3RuleCandidate,
  inspectEiAviffSbcT3ScoreCandidate,
} from '../converters/vibration/masters/ei-aviff-sbc-t3-noncurve-candidate.js';

const ids = EI_AVIFF_SBC_T3_NONCURVE_MASTER_IDS;

test('Stage-2 non-curve candidate masters reproduce D7 geometry score inputs', async () => {
  const [fitting, length, valve, schedule, diameter] = await Promise.all([
    inspectEiAviffSbcT3ScoreCandidate(ids.geometryScores, 'FITTING_TYPE', 'WELDOLET'),
    inspectEiAviffSbcT3ScoreCandidate(ids.geometryScores, 'BRANCH_LENGTH_MM', 'GT_600_MM'),
    inspectEiAviffSbcT3ScoreCandidate(
      ids.geometryScores, 'VALVE_FLANGE_BELOW_ANSI_900', 'ONE_VALVE_OR_INTEGRAL_DBB',
    ),
    inspectEiAviffSbcT3ScoreCandidate(ids.geometryScores, 'PARENT_PIPE_SCHEDULE', '80'),
    inspectEiAviffSbcT3ScoreCandidate(ids.geometryScores, 'SBC_MIN_DIAMETER_IN', '1.5'),
  ]);
  const scores = [fitting, length, valve, schedule, diameter].map((item) => item.row.score);
  assert.deepEqual(scores, [0.9, 0.9, 0.5, 0.5, 0.6]);
  assert.equal(scores.reduce((sum, value) => sum + value, 0) / scores.length, 0.68);
  assert(scores.every((item, index) => [fitting, length, valve, schedule, diameter][index].status === 'CANDIDATE_ONLY'));
});

test('location and combination candidates reproduce D6/D7 source rules', async () => {
  const [bend, sch40, combination, spanRule] = await Promise.all([
    inspectEiAviffSbcT3ScoreCandidate(ids.locationScores, 'LOCATION', 'BEND'),
    inspectEiAviffSbcT3ScoreCandidate(ids.locationScores, 'PARENT_PIPE_SCHEDULE', '40'),
    inspectEiAviffSbcT3RuleCandidate(ids.combinationRule),
    inspectEiAviffSbcT3RuleCandidate(ids.spanRule),
  ]);
  assert.equal((bend.row.score + sch40.row.score) / 2, 0.8);
  assert.equal(combination.data.mainlineMultiplier, 1.42);
  assert.equal(combination.data.unknownMainlineLofForAssessment, 1.0);
  assert.equal(combination.data.locationLofWhenMainlineUnknown, 1.0);
  assert.deepEqual(spanRule.data, { belowMinimumLof: 0.7, atOrAboveMinimumLof: 0.2 });
  assert.equal(combination.authority.screeningAuthority, 'NOT_AUTHORIZED');
});

test('candidate lookup is exact and does not invent an off-grid score', async () => {
  await assert.rejects(
    () => inspectEiAviffSbcT3ScoreCandidate(ids.geometryScores, 'SBC_MIN_DIAMETER_IN', '1.25'),
    /SBC_T3_MASTER_GRID_MISS/u,
  );
});
