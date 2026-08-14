import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const CSV_PATH = new URL(
  '../docs/Masters/Vibration/ei-aviff-t28-valve-closure-characteristics.candidate.csv',
  import.meta.url,
);
const RECEIPT_PATH = new URL(
  '../ValidationRecords/VibrationMasters/ei-aviff-t28-valve-closure-workbook-candidate-v1.json',
  import.meta.url,
);
const QUALIFICATION_PATH = new URL(
  '../ValidationRecords/VibrationMasters/ei-aviff-t28-qualification-review-v1.json',
  import.meta.url,
);

function readRows() {
  const lines = readFileSync(CSV_PATH, 'utf8').trim().split('\n');
  const headers = lines.shift().split(',');
  return lines.map((line) => Object.fromEntries(
    line.split(',').map((value, index) => [headers[index], value]),
  ));
}

function readReceipt() {
  return JSON.parse(readFileSync(RECEIPT_PATH, 'utf8'));
}

function phi(row, closingTimeSeconds) {
  return -(Number(row.coefficientA) / closingTimeSeconds) - Number(row.coefficientB);
}

function rowByValve(rows, valveType) {
  const key = valveType.toLowerCase();
  return rows.find((row) => row.valveType.toLowerCase() === key);
}

function resolveInputs({ valveType, closingTimeSeconds, pipeDiameterInches }, receipt) {
  const assumption = receipt.independentEiCorroboration.findings.unknownInputAssumption;
  if (!valveType || !Number.isFinite(closingTimeSeconds)) {
    assert.ok(Number.isFinite(pipeDiameterInches) && pipeDiameterInches > 0);
    return {
      valveType: assumption.assumedValveType,
      closingTimeSeconds: pipeDiameterInches * assumption.closingTimeSecondsPerPipeDiameterInch,
      assumptionApplied: true,
    };
  }
  return { valveType, closingTimeSeconds, assumptionApplied: false };
}

function evaluateCandidate(input) {
  const rows = readRows();
  const receipt = readReceipt();
  const resolved = resolveInputs(input, receipt);
  const maxTime = receipt.independentEiCorroboration.findings.validClosingTimeMax_s;
  if (resolved.closingTimeSeconds > maxTime) {
    return { status: 'OUTSIDE_VALIDITY', resolved };
  }
  if (input.upstreamPipeLengthM > 100) {
    return { status: 'DETAILED_PRESSURE_SURGE_ANALYSIS', lof: 1.0, resolved };
  }
  if (input.maximumForceKN < 1) {
    return { status: 'STOP_WITH_ZERO_LOF', lof: 0.0, resolved };
  }
  const row = rowByValve(rows, resolved.valveType);
  assert.ok(row, `missing valve row ${resolved.valveType}`);
  return {
    status: 'PHI_AVAILABLE',
    phi: phi(row, resolved.closingTimeSeconds),
    resolved,
  };
}

test('T2.8 candidate has exactly five corroborated source coefficient rows', () => {
  const rows = readRows();
  assert.equal(rows.length, 5);
  assert.deepEqual(
    rows.map(({ valveType, coefficientA, coefficientB }) => [
      valveType, Number(coefficientA), Number(coefficientB),
    ]),
    [
      ['full bore ball', 1.281, 0.27],
      ['reduced bore ball', 1.268, 0.362],
      ['Butterfly', 2.877, 0.275],
      ['Globe', 2.266, 0.32],
      ['Gate', 3.41, 0.315],
    ],
  );
  assert.ok(rows.every(({ validClosingTimeMax_s }) => validClosingTimeMax_s === '30'));
});

test('candidate replays workbook cached phi values at eight seconds', () => {
  const rows = readRows();
  assert.equal(phi(rowByValve(rows, 'Butterfly'), 8), -0.634625);
  assert.equal(phi(rowByValve(rows, 'Gate'), 8), -0.74125);
  assert.equal(phi(rowByValve(rows, 'Globe'), 8), -0.6032500000000001);
});

test('all five source functions evaluate at the inclusive 30 second validity boundary', () => {
  for (const row of readRows()) {
    const result = evaluateCandidate({
      valveType: row.valveType,
      closingTimeSeconds: 30,
      pipeDiameterInches: 8,
      upstreamPipeLengthM: 100,
      maximumForceKN: 1,
    });
    assert.equal(result.status, 'PHI_AVAILABLE');
    assert.equal(result.phi, phi(row, 30));
  }
});

test('closure times above 30 seconds fail outside the source validity range', () => {
  const result = evaluateCandidate({
    valveType: 'Globe',
    closingTimeSeconds: 30.000001,
    pipeDiameterInches: 8,
    upstreamPipeLengthM: 100,
    maximumForceKN: 1,
  });
  assert.equal(result.status, 'OUTSIDE_VALIDITY');
});

test('unknown type or closing time applies the explicit EI globe and 1 second per inch assumption', () => {
  const unknownType = evaluateCandidate({
    valveType: '',
    closingTimeSeconds: 5,
    pipeDiameterInches: 8,
    upstreamPipeLengthM: 100,
    maximumForceKN: 1,
  });
  assert.deepEqual(unknownType.resolved, {
    valveType: 'Globe',
    closingTimeSeconds: 8,
    assumptionApplied: true,
  });
  assert.equal(unknownType.phi, -0.6032500000000001);

  const unknownTime = evaluateCandidate({
    valveType: 'Gate',
    closingTimeSeconds: Number.NaN,
    pipeDiameterInches: 8,
    upstreamPipeLengthM: 100,
    maximumForceKN: 1,
  });
  assert.deepEqual(unknownTime.resolved, unknownType.resolved);
  assert.equal(unknownTime.phi, unknownType.phi);
});

test('flowchart boundaries retain exact Lup and Fmax engineering dispositions', () => {
  const atLupBoundary = evaluateCandidate({
    valveType: 'Gate',
    closingTimeSeconds: 8,
    pipeDiameterInches: 8,
    upstreamPipeLengthM: 100,
    maximumForceKN: 1,
  });
  assert.equal(atLupBoundary.status, 'PHI_AVAILABLE');

  const overLupBoundary = evaluateCandidate({
    valveType: 'Gate',
    closingTimeSeconds: 8,
    pipeDiameterInches: 8,
    upstreamPipeLengthM: 100.000001,
    maximumForceKN: 1,
  });
  assert.deepEqual(
    { status: overLupBoundary.status, lof: overLupBoundary.lof },
    { status: 'DETAILED_PRESSURE_SURGE_ANALYSIS', lof: 1.0 },
  );

  const belowForceBoundary = evaluateCandidate({
    valveType: 'Gate',
    closingTimeSeconds: 8,
    pipeDiameterInches: 8,
    upstreamPipeLengthM: 100,
    maximumForceKN: 0.999999,
  });
  assert.deepEqual(
    { status: belowForceBoundary.status, lof: belowForceBoundary.lof },
    { status: 'STOP_WITH_ZERO_LOF', lof: 0.0 },
  );
});

test('sudden-closure criterion is strict less-than', () => {
  const criterion = (tClose, lup, soundSpeed) => tClose < (2 * lup / soundSpeed);
  assert.equal(criterion(0.199999, 100, 1000), true);
  assert.equal(criterion(0.2, 100, 1000), false);
  assert.equal(criterion(0.200001, 100, 1000), false);
});

test('candidate remains fail-closed pending controlled Git-object reconciliation', () => {
  const rows = readRows();
  const receipt = readReceipt();
  assert.ok(rows.every((row) => row.publicationState === 'CANDIDATE'));
  assert.ok(rows.every((row) => row.engineeringAuthority === 'NONE'));
  assert.ok(rows.every((row) => row.screeningAuthority === 'NOT_AUTHORIZED'));
  assert.equal(receipt.independentEiCorroboration.status, 'PASS');
  assert.equal(receipt.reconciliation.status, 'CONTROLLED_SOURCE_RECONCILIATION_REQUIRED');
  assert.equal(receipt.qualificationStatus, 'NOT_QUALIFIED');
  assert.equal(receipt.masterValuesPublished, false);
  assert.deepEqual(receipt.authority, {
    engineeringAuthority: 'NONE',
    screeningAuthority: 'NOT_AUTHORIZED',
    designAuthority: false,
  });
});

test('qualification review passes calculation matrix but blocks final qualification on controlled source', () => {
  const review = JSON.parse(readFileSync(QUALIFICATION_PATH, 'utf8'));
  assert.equal(review.calculationQualification.status, 'PASS');
  assert.equal(review.independentSourceCorroboration.status, 'PASS');
  assert.equal(review.controlledSourceReconciliation.status, 'BLOCKED_ENVIRONMENT');
  assert.equal(review.controlledSourceReconciliation.satisfiedByPublicCopies, false);
  assert.equal(review.qualificationStatus, 'NOT_QUALIFIED');
  assert.equal(review.qualificationBlocker, 'CONTROLLED_SOURCE_RECONCILIATION_REQUIRED');
  assert.equal(review.publicationState, 'CANDIDATE');
  assert.equal(review.masterValuesPublished, false);
});
