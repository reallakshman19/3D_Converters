import assert from 'node:assert/strict';
import { reconcileCoverage } from '../../tabs/model-converters/converters/fbx/benchmark-audit/coverage-reconciliation.js';

function occurrence(occurrenceId, identityKey = occurrenceId) {
  return { occurrenceId, identityKey };
}

const complete = reconcileCoverage({
  populationId: 'supports',
  populationKind: 'SUPPORT',
  referenceOccurrences: [occurrence('r2', 'TAG-A'), occurrence('r1', 'TAG-A')],
  actualOccurrences: [occurrence('a2'), occurrence('a1')],
  pairs: [{ pairId: 'p1', referenceOccurrenceId: 'r1', actualOccurrenceId: 'a1', disposition: 'EXACT_MATCH' }],
  referenceDispositions: [{ occurrenceId: 'r2', disposition: 'MISSING_ACTUAL' }],
  actualDispositions: [{ occurrenceId: 'a2', disposition: 'UNEXPECTED_ACTUAL' }],
});
assert.equal(complete.status, 'PASS');
assert.equal(complete.referenceTotal, 2);
assert.equal(complete.actualTotal, 2);
assert.deepEqual(complete.referenceDispositionCounts, { EXACT_MATCH: 1, MISSING_ACTUAL: 1 });
assert.deepEqual(complete.actualDispositionCounts, { EXACT_MATCH: 1, UNEXPECTED_ACTUAL: 1 });
assert.deepEqual(complete.collisionBuckets, [{ side: 'reference', identityKey: 'TAG-A', occurrenceIds: ['r1', 'r2'] }]);
assert.ok(Object.isFrozen(complete));

const duplicateConsumption = reconcileCoverage({
  populationId: 'components',
  populationKind: 'COMPONENT',
  referenceOccurrences: [occurrence('r1'), occurrence('r2')],
  actualOccurrences: [occurrence('a1')],
  pairs: [
    { pairId: 'p1', referenceOccurrenceId: 'r1', actualOccurrenceId: 'a1', disposition: 'EXACT_MATCH' },
    { pairId: 'p2', referenceOccurrenceId: 'r2', actualOccurrenceId: 'a1', disposition: 'APPROVED_EQUIVALENT' },
  ],
  referenceDispositions: [],
  actualDispositions: [],
});
assert.equal(duplicateConsumption.status, 'FAIL');
assert.deepEqual(duplicateConsumption.duplicateConsumptionAttempts.map((item) => item.occurrenceId), ['a1']);

const unreconciled = reconcileCoverage({
  populationId: 'zones',
  populationKind: 'ZONE_MEMBERSHIP',
  referenceOccurrences: [occurrence('r1')],
  actualOccurrences: [],
  pairs: [],
  referenceDispositions: [],
  actualDispositions: [],
});
assert.equal(unreconciled.status, 'FAIL');
assert.deepEqual(unreconciled.unreconciledOccurrences, [{ side: 'reference', occurrenceId: 'r1' }]);

assert.throws(() => reconcileCoverage({
  populationId: 'invalid', populationKind: 'COMPONENT',
  referenceOccurrences: [occurrence('r1'), occurrence('r1')], actualOccurrences: [], pairs: [],
  referenceDispositions: [], actualDispositions: [],
}), /BLOCKED_AUDIT_IDENTITY/);

console.log('test-benchmark-coverage-reconciliation: PASS');
