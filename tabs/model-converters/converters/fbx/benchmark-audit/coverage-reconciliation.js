import {
  deepFreeze, fail, requireArray, requireClosedObject, requireText, stableCompare,
} from './audit-utils.js';

const INPUT_KEYS = [
  'populationId', 'populationKind', 'referenceOccurrences', 'actualOccurrences',
  'pairs', 'referenceDispositions', 'actualDispositions',
];
const OCCURRENCE_KEYS = ['occurrenceId', 'identityKey'];
const PAIR_KEYS = ['pairId', 'referenceOccurrenceId', 'actualOccurrenceId', 'disposition'];
const DISPOSITION_KEYS = ['occurrenceId', 'disposition'];

function normalizedOccurrences(values, label) {
  const seen = new Set();
  return requireArray(values, label).map((value, index) => {
    const item = requireClosedObject(value, `${label}[${index}]`, OCCURRENCE_KEYS);
    const occurrenceId = requireText(item.occurrenceId, `${label}[${index}].occurrenceId`);
    if (seen.has(occurrenceId)) fail('BLOCKED_AUDIT_IDENTITY', `${label} repeats ${occurrenceId}.`);
    seen.add(occurrenceId);
    return { occurrenceId, identityKey: requireText(item.identityKey, `${label}[${index}].identityKey`) };
  }).sort((left, right) => stableCompare(left.occurrenceId, right.occurrenceId));
}

function normalizedPairs(values, references, actuals) {
  const pairIds = new Set();
  return requireArray(values, 'pairs').map((value, index) => {
    const item = requireClosedObject(value, `pairs[${index}]`, PAIR_KEYS);
    const pairId = requireText(item.pairId, `pairs[${index}].pairId`);
    if (pairIds.has(pairId)) fail('BLOCKED_AUDIT_IDENTITY', `pairs repeats ${pairId}.`);
    pairIds.add(pairId);
    const referenceOccurrenceId = requireKnown(item.referenceOccurrenceId, references, `pairs[${index}].referenceOccurrenceId`);
    const actualOccurrenceId = requireKnown(item.actualOccurrenceId, actuals, `pairs[${index}].actualOccurrenceId`);
    return { pairId, referenceOccurrenceId, actualOccurrenceId, disposition: requireText(item.disposition, `pairs[${index}].disposition`) };
  }).sort((left, right) => stableCompare(left.pairId, right.pairId));
}

function requireKnown(value, known, label) {
  const id = requireText(value, label);
  if (!known.has(id)) fail('BLOCKED_AUDIT_IDENTITY', `${label} references unknown occurrence ${id}.`);
  return id;
}

function normalizedDispositions(values, known, label) {
  return requireArray(values, label).map((value, index) => {
    const item = requireClosedObject(value, `${label}[${index}]`, DISPOSITION_KEYS);
    return {
      occurrenceId: requireKnown(item.occurrenceId, known, `${label}[${index}].occurrenceId`),
      disposition: requireText(item.disposition, `${label}[${index}].disposition`),
    };
  }).sort((left, right) => stableCompare(left.occurrenceId, right.occurrenceId));
}

function collisionBuckets(side, occurrences) {
  const groups = new Map();
  for (const item of occurrences) {
    if (!groups.has(item.identityKey)) groups.set(item.identityKey, []);
    groups.get(item.identityKey).push(item.occurrenceId);
  }
  return [...groups.entries()].filter(([, ids]) => ids.length > 1).map(([identityKey, occurrenceIds]) => ({
    side, identityKey, occurrenceIds: [...occurrenceIds].sort(stableCompare),
  })).sort((left, right) => stableCompare(`${left.side}:${left.identityKey}`, `${right.side}:${right.identityKey}`));
}

function consumptionCounts(occurrences, pairs, dispositions, side) {
  const counts = new Map(occurrences.map((item) => [item.occurrenceId, []]));
  const pairKey = side === 'reference' ? 'referenceOccurrenceId' : 'actualOccurrenceId';
  for (const pair of pairs) counts.get(pair[pairKey]).push({ source: 'pair', id: pair.pairId, disposition: pair.disposition });
  for (const item of dispositions) counts.get(item.occurrenceId).push({ source: 'disposition', id: item.occurrenceId, disposition: item.disposition });
  return counts;
}

function duplicateAttempts(side, counts) {
  return [...counts.entries()].filter(([, uses]) => uses.length > 1).map(([occurrenceId, uses]) => ({
    side, occurrenceId, uses: uses.map((item) => ({ ...item })),
  })).sort((left, right) => stableCompare(left.occurrenceId, right.occurrenceId));
}

function unreconciled(side, counts) {
  return [...counts.entries()].filter(([, uses]) => uses.length === 0).map(([occurrenceId]) => ({ side, occurrenceId }))
    .sort((left, right) => stableCompare(left.occurrenceId, right.occurrenceId));
}

function dispositionCounts(counts) {
  const result = {};
  for (const uses of counts.values()) for (const item of uses) result[item.disposition] = (result[item.disposition] || 0) + 1;
  return Object.fromEntries(Object.entries(result).sort(([left], [right]) => stableCompare(left, right)));
}

function equation(name, left, right) {
  return { name, left, right, pass: left === right };
}

function pairUseCount(counts) {
  let total = 0;
  for (const uses of counts.values()) total += uses.filter((item) => item.source === 'pair').length;
  return total;
}

export function reconcileCoverage(input) {
  const value = requireClosedObject(input, 'coverage input', INPUT_KEYS);
  const referenceOccurrences = normalizedOccurrences(value.referenceOccurrences, 'referenceOccurrences');
  const actualOccurrences = normalizedOccurrences(value.actualOccurrences, 'actualOccurrences');
  const referenceIds = new Set(referenceOccurrences.map((item) => item.occurrenceId));
  const actualIds = new Set(actualOccurrences.map((item) => item.occurrenceId));
  const pairs = normalizedPairs(value.pairs, referenceIds, actualIds);
  const referenceDispositions = normalizedDispositions(value.referenceDispositions, referenceIds, 'referenceDispositions');
  const actualDispositions = normalizedDispositions(value.actualDispositions, actualIds, 'actualDispositions');
  const referenceCounts = consumptionCounts(referenceOccurrences, pairs, referenceDispositions, 'reference');
  const actualCounts = consumptionCounts(actualOccurrences, pairs, actualDispositions, 'actual');
  const duplicateConsumptionAttempts = [...duplicateAttempts('reference', referenceCounts), ...duplicateAttempts('actual', actualCounts)];
  const unreconciledOccurrences = [...unreconciled('reference', referenceCounts), ...unreconciled('actual', actualCounts)];
  const equations = [
    equation('reference coverage', [...referenceCounts.values()].filter((uses) => uses.length === 1).length, referenceOccurrences.length),
    equation('actual coverage', [...actualCounts.values()].filter((uses) => uses.length === 1).length, actualOccurrences.length),
    equation('reference pair use', pairUseCount(referenceCounts), pairs.length),
    equation('actual pair use', pairUseCount(actualCounts), pairs.length),
  ];
  const status = duplicateConsumptionAttempts.length || unreconciledOccurrences.length || equations.some((item) => !item.pass) ? 'FAIL' : 'PASS';
  return deepFreeze({
    schema: 'FbxCoverageReconciliation.v1',
    populationId: requireText(value.populationId, 'populationId'),
    populationKind: requireText(value.populationKind, 'populationKind'),
    referenceTotal: referenceOccurrences.length,
    actualTotal: actualOccurrences.length,
    matchedPairCount: pairs.length,
    referenceDispositionCounts: dispositionCounts(referenceCounts),
    actualDispositionCounts: dispositionCounts(actualCounts),
    collisionBuckets: [...collisionBuckets('reference', referenceOccurrences), ...collisionBuckets('actual', actualOccurrences)],
    duplicateConsumptionAttempts,
    reconciliationEquations: equations,
    unreconciledOccurrences,
    status,
  });
}
