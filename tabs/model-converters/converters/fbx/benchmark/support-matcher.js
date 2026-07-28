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

function diagnosticGroups(stages, references, actuals, referenceIds, actualIds) {
  const groups = [];
  for (const stage of stages) {
    const referenceGroups = groupByStage(references, referenceIds, stage);
    const actualGroups = groupByStage(actuals, actualIds, stage);
    for (const key of sortedUnion(referenceGroups, actualGroups)) {
      const groupedReferenceIds = referenceGroups.get(key) || [];
      const groupedActualIds = actualGroups.get(key) || [];
      if (!groupedReferenceIds.length || !groupedActualIds.length) continue;
      groups.push({
        candidateGroupId: `support-candidate:${stage.stageId}:${groups.length + 1}`,
        stageId: stage.stageId,
        normalizedKey: JSON.parse(key),
        referenceIds: groupedReferenceIds,
        actualIds: groupedActualIds,
      });
    }
  }
  return groups.sort((left, right) => compareText(left.candidateGroupId, right.candidateGroupId));
}

function processAuthoritativeStages(authoritativeStages, references, actuals, remRef, remAct, lockedRef, lockedAct, matches, collisionGroups) {
  for (const stage of authoritativeStages) {
    const refGroups = groupByStage(references, [...remRef].filter((id) => !lockedRef.has(id)), stage);
    const actGroups = groupByStage(actuals, [...remAct].filter((id) => !lockedAct.has(id)), stage);
    for (const key of sortedUnion(refGroups, actGroups)) {
      const refIds = refGroups.get(key) || [], actIds = actGroups.get(key) || [];
      if (refIds.length === 1 && actIds.length === 1) {
        const referenceId = refIds[0], actualId = actIds[0];
        remRef.delete(referenceId); remAct.delete(actualId);
        matches.push({ stageId: stage.stageId, authority: stage.authority, approvedEquivalentRuleId: stage.approvedEquivalentRuleId, normalizedKey: JSON.parse(key), referenceId, actualId });
      } else if (refIds.length > 1 || actIds.length > 1) {
        for (const id of refIds) lockedRef.add(id);
        for (const id of actIds) lockedAct.add(id);
        collisionGroups.push({ collisionGroupId: `support-collision:${stage.stageId}:${collisionGroups.length + 1}`, stageId: stage.stageId, normalizedKey: JSON.parse(key), referenceIds: refIds, actualIds: actIds });
      }
    }
  }
}

export function matchSupportRecords(referenceRecords, actualRecords, policyValue) {
  const policy = validateSupportIdentityPolicy(policyValue);
  const references = new Map(referenceRecords.map((record) => [record.recordId, record]));
  const actuals = new Map(actualRecords.map((record) => [record.recordId, record]));
  const remRef = new Set(references.keys()), remAct = new Set(actuals.keys());
  const lockedRef = new Set(), lockedAct = new Set(), matches = [], collisionGroups = [];
  const authoritativeStages = policy.identityStages.filter((stage) => stage.authority !== 'DIAGNOSTIC_ONLY');
  const diagnosticStages = policy.identityStages.filter((stage) => stage.authority === 'DIAGNOSTIC_ONLY');
  processAuthoritativeStages(authoritativeStages, references, actuals, remRef, remAct, lockedRef, lockedAct, matches, collisionGroups);
  const unmatchedReferenceIds = [...remRef].filter((id) => !lockedRef.has(id)).sort(compareText);
  const unmatchedActualIds = [...remAct].filter((id) => !lockedAct.has(id)).sort(compareText);
  matches.sort((left, right) => compareText(left.referenceId, right.referenceId));
  collisionGroups.sort((left, right) => compareText(left.collisionGroupId, right.collisionGroupId));
  return Object.freeze({
    policy, matches: Object.freeze(matches), collisionGroups: Object.freeze(collisionGroups),
    diagnosticCandidateGroups: Object.freeze(diagnosticGroups(diagnosticStages, references, actuals, unmatchedReferenceIds, unmatchedActualIds)),
    unmatchedReferenceIds: Object.freeze(unmatchedReferenceIds), unmatchedActualIds: Object.freeze(unmatchedActualIds),
    lockedReferenceIds: Object.freeze([...lockedRef].sort(compareText)), lockedActualIds: Object.freeze([...lockedAct].sort(compareText)),
  });
}
