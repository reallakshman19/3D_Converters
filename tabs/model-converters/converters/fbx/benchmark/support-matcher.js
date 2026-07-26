import { validateSupportIdentityPolicy } from './support-policy.js';

function compareText(left, right) {
  const a = String(left ?? '');
  const b = String(right ?? '');
  return a < b ? -1 : a > b ? 1 : 0;
}

function pathValue(record, path) {
  const parts = String(path).split('.').filter(Boolean);
  let value = record;
  for (const part of parts) {
    if (!value || typeof value !== 'object' || !Object.hasOwn(value, part)) return undefined;
    value = value[part];
  }
  return value;
}

function keyFor(record, stage) {
  const values = stage.keyPaths.map((path) => pathValue(record, path));
  if (stage.requireNonEmpty && values.some((value) => value === undefined || value === null || value === '')) return null;
  return JSON.stringify(values);
}

function groupByStage(records, ids, stage) {
  const groups = new Map();
  for (const id of ids) {
    const record = records.get(id);
    const key = keyFor(record, stage);
    if (key === null) continue;
    const list = groups.get(key) || [];
    list.push(id);
    groups.set(key, list);
  }
  for (const list of groups.values()) list.sort(compareText);
  return groups;
}

function sortedUnion(left, right) {
  return [...new Set([...left.keys(), ...right.keys()])].sort(compareText);
}

export function matchSupportRecords(referenceRecords, actualRecords, policyValue) {
  const policy = validateSupportIdentityPolicy(policyValue);
  const references = new Map(referenceRecords.map((record) => [record.recordId, record]));
  const actuals = new Map(actualRecords.map((record) => [record.recordId, record]));
  const remainingReference = new Set(references.keys());
  const remainingActual = new Set(actuals.keys());
  const lockedReference = new Set();
  const lockedActual = new Set();
  const matches = [];
  const collisionGroups = [];

  for (const stage of policy.identityStages) {
    if (stage.authority === 'DIAGNOSTIC_ONLY') continue;
    const referenceGroups = groupByStage(references, [...remainingReference].filter((id) => !lockedReference.has(id)), stage);
    const actualGroups = groupByStage(actuals, [...remainingActual].filter((id) => !lockedActual.has(id)), stage);
    for (const key of sortedUnion(referenceGroups, actualGroups)) {
      const referenceIds = referenceGroups.get(key) || [];
      const actualIds = actualGroups.get(key) || [];
      if (referenceIds.length === 1 && actualIds.length === 1) {
        const referenceId = referenceIds[0];
        const actualId = actualIds[0];
        remainingReference.delete(referenceId);
        remainingActual.delete(actualId);
        matches.push({
          stageId: stage.stageId,
          authority: stage.authority,
          normalizedKey: JSON.parse(key),
          referenceId,
          actualId,
        });
      } else if (referenceIds.length > 1 || actualIds.length > 1) {
        for (const id of referenceIds) lockedReference.add(id);
        for (const id of actualIds) lockedActual.add(id);
        collisionGroups.push({
          collisionGroupId: `support-collision:${stage.stageId}:${collisionGroups.length + 1}`,
          stageId: stage.stageId,
          normalizedKey: JSON.parse(key),
          referenceIds,
          actualIds,
        });
      }
    }
  }

  matches.sort((left, right) => compareText(left.referenceId, right.referenceId));
  collisionGroups.sort((left, right) => compareText(left.collisionGroupId, right.collisionGroupId));
  return Object.freeze({
    policy,
    matches: Object.freeze(matches),
    collisionGroups: Object.freeze(collisionGroups),
    unmatchedReferenceIds: Object.freeze([...remainingReference].filter((id) => !lockedReference.has(id)).sort(compareText)),
    unmatchedActualIds: Object.freeze([...remainingActual].filter((id) => !lockedActual.has(id)).sort(compareText)),
    lockedReferenceIds: Object.freeze([...lockedReference].sort(compareText)),
    lockedActualIds: Object.freeze([...lockedActual].sort(compareText)),
  });
}
