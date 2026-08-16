import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const MATRIX = JSON.parse(readFileSync(
  new URL('../ValidationRecords/VibrationMasters/t29-pf01-reconciliation-matrix-v1.json', import.meta.url),
  'utf8',
));
const BENCHMARKS = JSON.parse(readFileSync(
  new URL('../ValidationRecords/VibrationMasters/t29-pf01-benchmark-matrix-v1.json', import.meta.url),
  'utf8',
));
const SOURCE_CONTRACT = JSON.parse(readFileSync(
  new URL('../ValidationRecords/VibrationMasters/t29-pf01-source-contract-v1.json', import.meta.url),
  'utf8',
));

function close(actual, expected, tolerance = 1e-12) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
}

test('PF01 keeps controlled source identity pinned and numerical authority blocked', () => {
  assert.equal(MATRIX.controlledSource.gitBlobSha1,
    'sha1:9d3eccc56429411e17c07a579bdebbd13cb0bdc5');
  assert.equal(MATRIX.controlledSource.sizeBytes, 10348594);
  assert.equal(MATRIX.decisions.numericalKernelAuthorized, false);
  assert.equal(MATRIX.decisions.candidateRowsMayBeActivatedAsMaster, false);
  assert.equal(MATRIX.decisions.synthesisMayDriveProductionEquations, false);
  assert.equal(MATRIX.decisions.synthesisMayDriveBranchAcceptance, false);
  assert.equal(MATRIX.authority.screeningAuthority, 'NOT_AUTHORIZED');
  assert.equal(MATRIX.authority.designAuthority, false);
});

test('PF01 preserves the four-row candidate and explicit synthesis conflicts', () => {
  assert.deepEqual(
    MATRIX.candidateEvidence.rows.map(({ valveType, FL }) => [valveType, FL]),
    [['Ball', 0.6], ['Butterfly', 0.62], ['Globe', 0.9], ['Gate', 0.6]],
  );
  const states = new Map(MATRIX.reconciliationItems.map((item) => [item.id, item.state]));
  assert.equal(states.get('T29-REC-FL-BALL'), 'CONFLICT');
  assert.equal(states.get('T29-REC-FL-BUTTERFLY'), 'CONFLICT');
  assert.equal(states.get('T29-REC-FL-GLOBE'), 'PARTIAL_MATCH_TAXONOMY_CONFLICT');
  assert.equal(states.get('T29-REC-FL-GATE'), 'OMISSION_CONFLICT');
  assert.equal(states.get('T29-REC-EQ-PRESSURE-DROP'), 'EQUATION_CONFLICT');
  assert.equal(states.get('T29-REC-BRANCHES'), 'SYNTHESIS_ONLY_UNVERIFIED');
});

test('independent Globe arithmetic replay and unit-invariance pair stay frozen', () => {
  const pa = BENCHMARKS.arithmeticVectors.find((item) => item.id === 'T29-ARITH-001-GLOBE-PA');
  const bar = BENCHMARKS.arithmeticVectors.find((item) => item.id === 'T29-ARITH-002-GLOBE-BAR');
  const paCalculated = pa.inputs.FL ** 2 * (pa.inputs.P1 - 0.96 * pa.inputs.Pv);
  const barCalculated = bar.inputs.FL ** 2 * (bar.inputs.P1 - 0.96 * bar.inputs.Pv);
  close(paCalculated, 11050579.7424);
  close(barCalculated, 110.505797424);
  close(paCalculated / 100000, barCalculated);
  assert.equal(pa.branchOracle, null);
  assert.equal(bar.branchOracle, null);
});

test('decision and boundary oracles remain unavailable instead of inheriting synthesis rules', () => {
  assert.ok(BENCHMARKS.decisionBranchVectors.length >= 6);
  for (const vector of BENCHMARKS.decisionBranchVectors) {
    assert.equal(vector.state, 'PENDING_CONTROLLED_SOURCE_ORACLE');
    assert.equal(vector.expectedRegime, null);
    assert.equal(vector.expectedLof, null);
  }
  assert.equal(BENCHMARKS.promotionGate.decisionBranchOracleComplete, false);
  assert.equal(BENCHMARKS.promotionGate.boundaryOracleComplete, false);
  assert.equal(BENCHMARKS.promotionGate.candidateKernelAuthorized, false);
  assert.equal(BENCHMARKS.promotionGate.screeningAuthorityAuthorized, false);
});

test('source contract and reconciliation package agree on fail-closed authority', () => {
  assert.equal(SOURCE_CONTRACT.authority.engineeringAuthority, 'NONE');
  assert.equal(SOURCE_CONTRACT.authority.screeningAuthority, 'NOT_AUTHORIZED');
  assert.equal(SOURCE_CONTRACT.authority.designAuthority, false);
  assert.equal(SOURCE_CONTRACT.qualification.appendixA.disposition,
    'NOT_QUALIFIED_FOR_T29_NUMERICAL_MUTATION');
});
