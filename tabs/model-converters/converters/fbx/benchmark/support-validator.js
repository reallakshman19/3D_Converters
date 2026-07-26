import { collectSupportRecords, buildSupportInventory } from './support-records.js';
import { matchSupportRecords } from './support-matcher.js';
import { compareMatchedSupport } from './support-comparator.js';

function compareText(left, right) {
  const a = String(left ?? '');
  const b = String(right ?? '');
  return a < b ? -1 : a > b ? 1 : 0;
}

function recordView(record) {
  return record ? {
    recordId: record.recordId,
    sourceLocator: record.sourceLocator,
    parentBranch: record.parentBranch,
    ownerBranch: record.ownerBranch,
    sourceRef: record.sourceRef,
    sourceName: record.sourceName,
    supportTag: record.supportTag,
    rawType: record.rawType,
    supportClass: record.supportClass,
    position: record.position,
    orientation: record.orientation,
  } : null;
}

function collisionEntries(group, referenceById, actualById) {
  const entries = [];
  for (const referenceId of group.referenceIds) {
    entries.push({
      ledgerKey: `collision:reference:${referenceId}`,
      disposition: 'FAIL',
      matchState: 'DUPLICATE_IDENTITY',
      reference: recordView(referenceById.get(referenceId)),
      actual: null,
      identityResult: {
        stageId: group.stageId,
        collisionGroupId: group.collisionGroupId,
        normalizedKey: group.normalizedKey,
        candidateRecordIds: group.actualIds,
        state: 'AMBIGUOUS',
      },
      fieldResults: [],
    });
  }
  for (const actualId of group.actualIds) {
    entries.push({
      ledgerKey: `collision:actual:${actualId}`,
      disposition: 'FAIL',
      matchState: 'DUPLICATE_IDENTITY',
      reference: null,
      actual: recordView(actualById.get(actualId)),
      identityResult: {
        stageId: group.stageId,
        collisionGroupId: group.collisionGroupId,
        normalizedKey: group.normalizedKey,
        candidateRecordIds: group.referenceIds,
        state: 'AMBIGUOUS',
      },
      fieldResults: [],
    });
  }
  return entries;
}

function diagnosticCandidates(matching) {
  const byReference = new Map();
  const byActual = new Map();
  for (const group of matching.diagnosticCandidateGroups) {
    for (const id of group.referenceIds) {
      const list = byReference.get(id) || [];
      list.push({ groupId: group.candidateGroupId, stageId: group.stageId, recordIds: group.actualIds });
      byReference.set(id, list);
    }
    for (const id of group.actualIds) {
      const list = byActual.get(id) || [];
      list.push({ groupId: group.candidateGroupId, stageId: group.stageId, recordIds: group.referenceIds });
      byActual.set(id, list);
    }
  }
  return { byReference, byActual };
}

function flattenCandidateIds(groups) {
  return [...new Set((groups || []).flatMap((group) => group.recordIds))].sort(compareText);
}

function dispositionFor(matchState) {
  if (matchState === 'EXACT_MATCH') return 'PASS';
  if (matchState === 'APPROVED_EQUIVALENT') return 'OBSERVATION';
  if (matchState === 'BLOCKED') return 'BLOCKED';
  return 'FAIL';
}

function summarize(entries) {
  const countsByMatchState = {};
  const countsByDisposition = {};
  for (const entry of entries) {
    countsByMatchState[entry.matchState] = (countsByMatchState[entry.matchState] || 0) + 1;
    countsByDisposition[entry.disposition] = (countsByDisposition[entry.disposition] || 0) + 1;
  }
  let status = 'PASS';
  if (countsByDisposition.FAIL) status = 'FAIL';
  else if (countsByDisposition.BLOCKED) status = 'BLOCKED';
  else if (countsByDisposition.OBSERVATION) status = 'PASS_WITH_OBSERVATIONS';
  return { countsByMatchState, countsByDisposition, status };
}

export function validateSupportBenchmark({
  reference,
  actual,
  identityPolicy,
  toleranceProfile,
  propertyRules = [],
  normalizers = {},
  orientationComparator,
  hostResolver,
  hostRequired = false,
}) {
  const referenceRecords = collectSupportRecords(reference);
  const actualRecords = collectSupportRecords(actual);
  const referenceById = new Map(referenceRecords.map((record) => [record.recordId, record]));
  const actualById = new Map(actualRecords.map((record) => [record.recordId, record]));
  const matching = matchSupportRecords(referenceRecords, actualRecords, identityPolicy);
  const ledgerEntries = [];
  const candidates = diagnosticCandidates(matching);

  for (const match of matching.matches) {
    const referenceRecord = referenceById.get(match.referenceId);
    const actualRecord = actualById.get(match.actualId);
    const comparison = compareMatchedSupport(referenceRecord, actualRecord, {
      identityPolicy: matching.policy,
      identityAuthority: match.authority,
      toleranceProfile,
      propertyRules,
      normalizers,
      orientationComparator,
      hostResolver,
      hostRequired,
    });
    ledgerEntries.push({
      ledgerKey: `match:${match.referenceId}:${match.actualId}`,
      disposition: dispositionFor(comparison.matchState),
      matchState: comparison.matchState,
      reference: recordView(referenceRecord),
      actual: recordView(actualRecord),
      identityResult: {
        stageId: match.stageId,
        collisionGroupId: null,
        normalizedKey: match.normalizedKey,
        candidateRecordIds: [],
        approvedEquivalentRuleId: match.approvedEquivalentRuleId,
        state: match.authority,
      },
      classResult: comparison.classResult,
      hostResult: comparison.hostResult,
      fieldResults: comparison.fieldResults,
    });
  }

  for (const group of matching.collisionGroups) {
    ledgerEntries.push(...collisionEntries(group, referenceById, actualById));
  }

  for (const referenceId of matching.unmatchedReferenceIds) {
    ledgerEntries.push({
      ledgerKey: `missing:${referenceId}`,
      disposition: 'FAIL',
      matchState: 'MISSING_ACTUAL',
      reference: recordView(referenceById.get(referenceId)),
      actual: null,
      identityResult: {
        stageId: null, collisionGroupId: null, normalizedKey: null,
        candidateRecordIds: flattenCandidateIds(candidates.byReference.get(referenceId)),
        diagnosticCandidateGroups: candidates.byReference.get(referenceId) || [],
        state: candidates.byReference.has(referenceId) ? 'CANDIDATE_ONLY' : 'UNRESOLVED',
      },
      fieldResults: [],
    });
  }
  for (const actualId of matching.unmatchedActualIds) {
    ledgerEntries.push({
      ledgerKey: `unexpected:${actualId}`,
      disposition: 'FAIL',
      matchState: 'UNEXPECTED_ACTUAL',
      reference: null,
      actual: recordView(actualById.get(actualId)),
      identityResult: {
        stageId: null, collisionGroupId: null, normalizedKey: null,
        candidateRecordIds: flattenCandidateIds(candidates.byActual.get(actualId)),
        diagnosticCandidateGroups: candidates.byActual.get(actualId) || [],
        state: candidates.byActual.has(actualId) ? 'CANDIDATE_ONLY' : 'UNRESOLVED',
      },
      fieldResults: [],
    });
  }

  ledgerEntries.sort((left, right) => compareText(left.ledgerKey, right.ledgerKey));
  const referenceLedgerCount = ledgerEntries.filter((entry) => entry.reference).length;
  const actualLedgerCount = ledgerEntries.filter((entry) => entry.actual).length;
  const coverage = {
    referenceLedgerCount,
    actualLedgerCount,
    referencesCoveredExactlyOnce: referenceLedgerCount === referenceRecords.length,
    actualsCoveredExactlyOnce: actualLedgerCount === actualRecords.length,
    discardedReferenceCount: referenceRecords.length - referenceLedgerCount,
    discardedActualCount: actualRecords.length - actualLedgerCount,
  };
  coverage.invariantsPassed = coverage.referencesCoveredExactlyOnce
    && coverage.actualsCoveredExactlyOnce
    && coverage.discardedReferenceCount === 0
    && coverage.discardedActualCount === 0;

  return Object.freeze({
    schema: 'FbxSupportBenchmarkReport.v1',
    identityPolicyId: matching.policy.policyId,
    toleranceProfileId: toleranceProfile.profileId,
    referenceInventory: buildSupportInventory(referenceRecords),
    actualInventory: buildSupportInventory(actualRecords),
    coverage: Object.freeze(coverage),
    ledgerEntries: Object.freeze(ledgerEntries),
    summary: Object.freeze(summarize(ledgerEntries)),
  });
}
