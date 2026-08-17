import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applySupportPositionMatchPolicy,
  resolveSupportPositionMatchPolicy,
  supportPositionMatchExample,
} from '../tabs/xml-cii-2019-standalone/xml-cii-support-position-match-policy.js';
import { buildStandaloneDtxrResolutionLedger } from '../tabs/xml-cii-2019-standalone/xml-cii-trace-resolution-ledger.js';

const BRANCH_ROOT = '/ASIM-1847-3"-S8810332-91261M7-01';
const XML = `<?xml version="1.0"?><CAESARII><Branch><Branchname>${BRANCH_ROOT}/B1</Branchname><Node><NodeNumber>280</NodeNumber><NodeName>SL-1847103.2.1</NodeName><ComponentType>ANCI</ComponentType><Position>0 0 0</Position></Node></Branch></CAESARII>`;

function stagedAt(distanceMm) {
  return JSON.stringify([{
    type: 'BRANCH',
    name: BRANCH_ROOT,
    children: [{
      type: 'DTXR_POS',
      attributes: { POS: `${distanceMm} 0 0` },
      children: [{
        type: '/MDS-Ancillaries/ANCI/ST501-80mm',
        attributes: {
          DTXR: 'LINE STOP',
          MDSSUPPTYPE: 'ST501',
          CMPSUPGAP: 'GAP=35mm',
          NAME: '/SL-1847103.1.3',
        },
      }],
    }],
  }]);
}

function resolveAt(distanceMm, config) {
  const applied = applySupportPositionMatchPolicy(config);
  const ledger = buildStandaloneDtxrResolutionLedger(XML, stagedAt(distanceMm), applied.config);
  return { applied, record: ledger.records[0], ledger };
}

test('supportPositionMatch exposes an explicit 20 mm euclidean configuration', () => {
  assert.deepEqual(supportPositionMatchExample(20), {
    supportPositionMatch: { enabled: true, toleranceMm: 20, mode: 'euclidean' },
  });
  const policy = resolveSupportPositionMatchPolicy(supportPositionMatchExample(20));
  assert.equal(policy.valid, true);
  assert.equal(policy.mode, 'euclidean');
  assert.equal(policy.toleranceMm, 20);
  assert.equal(policy.source, 'supportPositionMatch.toleranceMm');
});

test('euclidean tolerance accepts 19.99 mm and exactly 20.00 mm', () => {
  for (const distance of [19.99, 20.00]) {
    const { record, ledger } = resolveAt(distance, supportPositionMatchExample(20));
    assert.equal(record.status, 'RESOLVED_POS');
    assert.equal(record.coordinateToleranceMm, 20);
    assert.ok(Math.abs(record.positionDistanceMm - distance) < 1e-9);
    assert.equal(ledger.toleranceMm, 20);
  }
});

test('euclidean tolerance rejects 20.01 mm', () => {
  const { record, ledger } = resolveAt(20.01, supportPositionMatchExample(20));
  assert.equal(record.status, 'UNRESOLVED');
  assert.equal(record.coordinateToleranceMm, 20);
  assert.equal(record.positionDistanceMm, null);
  assert.equal(ledger.toleranceMm, 20);
});

test('new tolerance overrides legacy 1 mm primary-style configuration only for configured DTXR recovery', () => {
  const config = {
    coordinateTolerance: 1,
    resolverJsonTrace: { coordinateTolerance: 6 },
    supportPositionMatch: { enabled: true, toleranceMm: 20, mode: 'euclidean' },
  };
  const { applied, record } = resolveAt(10, config);
  assert.equal(applied.policy.toleranceMm, 20);
  assert.equal(applied.config.coordinateTolerance, 1, 'legacy primary coordinate tolerance remains untouched');
  assert.equal(applied.config.resolverJsonTrace.coordinateTolerance, 20);
  assert.equal(applied.config.dtxrCoordinateToleranceMm, 20);
  assert.equal(record.status, 'RESOLVED_POS');
});

test('legacy configurations remain backward compatible when supportPositionMatch is absent', () => {
  const policy = resolveSupportPositionMatchPolicy({ resolverJsonTrace: { coordinateTolerance: 6 } });
  assert.equal(policy.valid, true);
  assert.equal(policy.mode, 'euclidean');
  assert.equal(policy.toleranceMm, 6);
  assert.equal(policy.source, 'legacy');
});

test('unqualified axis-box mode fails closed instead of being approximated as a radius', () => {
  const config = { supportPositionMatch: { enabled: true, toleranceMm: 20, mode: 'axis-box' } };
  const applied = applySupportPositionMatchPolicy(config);
  assert.equal(applied.policy.valid, false);
  assert.match(applied.policy.reason, /Only euclidean is currently qualified/);
  assert.strictEqual(applied.config, config);
});
