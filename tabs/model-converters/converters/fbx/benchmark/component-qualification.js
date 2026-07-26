import { canonicalJson, deepFreeze } from '../canonical-json.js';
import { sha256Hex } from '../sha256.js';
import {
  BUILTIN_NORMALIZERS, GEOMETRY_FIELDS, PASSING_STATES, REPORT_SCHEMA,
  canonicalKey, cloneJson, compareText, fail, fnv1a64,
} from './component-common.js';
import {
  buildComponentSubjects, discoverComponentCatalog, fieldValue,
} from './component-catalog.js';
import {
  COMPONENT_COMPARATORS, commonComparisons,
} from './component-comparators.js';
import { validateComponentIdentityPolicy } from './component-policy.js';

export {
  buildComponentSubjects,
  COMPONENT_COMPARATORS,
  discoverComponentCatalog,
  validateComponentIdentityPolicy,
};

function normalizeIdentityValue(value, normalizerIds, normalizers) {
  let result = cloneJson(value);
  for (const id of normalizerIds) {
    const normalizer = normalizers[id];
    if (typeof normalizer !== 'function') {
      fail(`normalization rule ${id} is unavailable.`);
    }
    result = normalizer(result);
  }
  return result;
}

function identityKey(subject, rule, normalizers) {
  if (!rule.applicableFamilies.includes(subject.family)) return null;
  const values = [];
  for (const path of rule.requiredFields) {
    const raw = fieldValue(subject, path);
    if (raw === undefined || raw === null || raw === '') return null;
    values.push(normalizeIdentityValue(raw, rule.normalizationRuleIds, normalizers));
  }
  return canonicalKey({ scope: rule.scope, values });
}

function indexRule(subjects, rule, normalizers, reservations) {
  const index = new Map();
  for (const subject of subjects) {
    if (reservations.has(subject.subjectId)) continue;
    const key = identityKey(subject, rule, normalizers);
    if (key === null) continue;
    const list = index.get(key) || [];
    list.push(subject.subjectId);
    index.set(key, list);
  }
  for (const list of index.values()) list.sort(compareText);
  return index;
}

function candidateRecord(rule, key, candidates) {
  return {
    ruleId: rule.ruleId,
    normalizedKey: key,
    candidateSubjectIds: [...candidates],
    resolution: candidates.length === 0 ? 'NONE'
      : candidates.length === 1 ? 'UNIQUE' : 'COLLISION',
  };
}

function resolveMatches(reference, actual, policy, normalizers) {
  const referenceReserved = new Set(), actualReserved = new Set();
  const matches = new Map(), candidateEvidence = new Map(), collisionGroups = [];
  const addEvidence = (subjectId, record) => {
    const list = candidateEvidence.get(subjectId) || [];
    list.push(record);
    candidateEvidence.set(subjectId, list);
  };
  for (const rule of policy.identityRules) {
    const referenceIndex = indexRule(reference, rule, normalizers, referenceReserved);
    const actualIndex = indexRule(actual, rule, normalizers, actualReserved);
    const keys = [...new Set([...referenceIndex.keys(), ...actualIndex.keys()])]
      .sort(compareText);
    for (const key of keys) {
      const refs = referenceIndex.get(key) || [], acts = actualIndex.get(key) || [];
      for (const id of refs) addEvidence(id, candidateRecord(rule, key, acts));
      for (const id of acts) addEvidence(id, candidateRecord(rule, key, refs));
      if (refs.length > 1 || acts.length > 1) {
        collisionGroups.push({
          collisionGroupId: `COL-${fnv1a64(
            `${rule.ruleId}\n${key}\n${refs.join('|')}\n${acts.join('|')}`,
          )}`,
          identityRuleId: rule.ruleId,
          normalizedKey: key,
          referenceSubjectIds: [...refs],
          actualSubjectIds: [...acts],
          resolution: 'UNRESOLVED',
          resolutionRuleIds: [],
        });
        continue;
      }
      if (!rule.passing || refs.length !== 1 || acts.length !== 1) continue;
      const referenceId = refs[0], actualId = acts[0];
      if (referenceReserved.has(referenceId) || actualReserved.has(actualId)) {
        fail('atomic reservation invariant failed.');
      }
      referenceReserved.add(referenceId);
      actualReserved.add(actualId);
      const match = {
        referenceId, actualId, ruleId: rule.ruleId, ruleKind: rule.kind,
      };
      matches.set(referenceId, match);
      matches.set(actualId, match);
    }
  }
  for (const group of collisionGroups) {
    const allIds = [...group.referenceSubjectIds, ...group.actualSubjectIds];
    if (allIds.length && allIds.every((id) => matches.has(id))) {
      group.resolution = 'RESOLVED_BY_APPROVED_RULE';
      group.resolutionRuleIds = [...new Set(
        allIds.map((id) => matches.get(id).ruleId),
      )].sort(compareText);
    }
  }
  for (const list of candidateEvidence.values()) {
    list.sort((left, right) => compareText(left.ruleId, right.ruleId)
      || compareText(left.normalizedKey, right.normalizedKey));
  }
  collisionGroups.sort((left, right) => (
    compareText(left.identityRuleId, right.identityRuleId)
    || compareText(left.normalizedKey, right.normalizedKey)
  ));
  collisionGroups.forEach((group, index) => {
    group.collisionGroupId = `COL-${String(index + 1).padStart(6, '0')}-${group.collisionGroupId.slice(4)}`;
  });
  return { matches, candidateEvidence, collisionGroups };
}

function classificationForMatch(match, comparisons, topologyState) {
  if (topologyState === 'FAIL') return 'TOPOLOGY_MISMATCH';
  if (comparisons.some((item) => item.outcome === 'BLOCKED')) {
    return 'BLOCKED_IDENTITY';
  }
  const failures = comparisons.filter((item) => item.outcome === 'FAIL');
  if (failures.some((item) => GEOMETRY_FIELDS.has(item.fieldId))) {
    return 'GEOMETRY_MISMATCH';
  }
  if (failures.length) return 'ATTRIBUTE_MISMATCH';
  return match.ruleKind === 'APPROVED_COMPOSITE'
    ? 'APPROVED_EQUIVALENT' : 'EXACT_MATCH';
}

function pairResult(reference, actual, match, context) {
  if (reference.disposition !== 'QUALIFY' || actual.disposition !== 'QUALIFY') {
    return {
      state: 'BLOCKED_IDENTITY', comparisons: [],
      diagnostics: ['NON_QUALIFIED_COMPONENT_DISPOSITION'],
    };
  }
  if (reference.family !== actual.family
    || reference.comparatorId !== actual.comparatorId) {
    const comparisons = commonComparisons(reference, actual, context);
    return {
      state: 'ATTRIBUTE_MISMATCH',
      comparisons,
      diagnostics: [...new Set([
        'COMPONENT_FAMILY_OR_COMPARATOR_MISMATCH',
        ...comparisons.flatMap((item) => item.diagnosticCodes),
      ])].sort(compareText),
    };
  }
  const comparator = context.comparators[reference.comparatorId];
  if (typeof comparator !== 'function') {
    return {
      state: 'BLOCKED_IDENTITY', comparisons: [],
      diagnostics: ['COMPARATOR_UNAVAILABLE'],
    };
  }
  const comparisons = [
    ...commonComparisons(reference, actual, context),
    ...comparator(reference, actual, context),
  ].sort((left, right) => compareText(left.fieldId, right.fieldId));
  const topologyState = context.topologyByReferenceId?.[reference.subjectId]
    ?? 'NOT_APPLICABLE';
  return {
    state: classificationForMatch(match, comparisons, topologyState),
    comparisons,
    diagnostics: [...new Set(
      comparisons.flatMap((item) => item.diagnosticCodes),
    )].sort(compareText),
  };
}

function inventory(subjects) {
  const byFamily = new Map(), byRawType = new Map();
  for (const subject of subjects) {
    byFamily.set(subject.family, (byFamily.get(subject.family) || 0) + 1);
    byRawType.set(
      subject.rawType ?? 'UNKNOWN',
      (byRawType.get(subject.rawType ?? 'UNKNOWN') || 0) + 1,
    );
  }
  const objectOf = (map) => Object.fromEntries(
    [...map.entries()].sort(([left], [right]) => compareText(left, right)),
  );
  return {
    count: subjects.length,
    countsByFamily: objectOf(byFamily),
    countsByRawType: objectOf(byRawType),
  };
}

function baseLedger(subject, candidates, collisions) {
  return {
    ledgerRecordId: `LEDGER-${subject.subjectId}`,
    side: subject.side,
    subjectId: subject.subjectId,
    subjectLocator: {
      zoneId: subject.zoneId,
      branchId: subject.branchId,
      owner: subject.owner,
      canonicalSubjectPayloadSha256: subject.canonicalSubjectPayloadSha256,
      multiplicityIndex: subject.multiplicityIndex,
    },
    classification: {
      family: subject.family,
      outerType: subject.outerType,
      rawType: subject.rawType,
      subtype: subject.subtype,
    },
    identityEvidence: {
      candidateKeys: candidates || [],
      selectedRuleId: null,
      equivalenceRuleId: null,
      collisionGroupIds: collisions
        .map((item) => item.collisionGroupId).sort(compareText),
    },
    match: {
      state: 'BLOCKED_IDENTITY',
      counterpartSubjectIds: [],
      passingCounterpartSubjectId: null,
    },
    comparisons: [],
    mismatchCodes: [],
    evidenceReferences: [],
    recordStatus: 'BLOCKED',
  };
}

function statusForState(state) {
  if (PASSING_STATES.has(state)) return 'PASS';
  if (state === 'BLOCKED_IDENTITY' || state === 'AMBIGUOUS_MATCH') {
    return 'BLOCKED';
  }
  return 'FAIL';
}

function collisionIds(subjectId, collisionGroups) {
  return collisionGroups.filter((group) => (
    group.referenceSubjectIds.includes(subjectId)
    || group.actualSubjectIds.includes(subjectId)
  ));
}

function ledgerRecords(reference, actual, resolution, context) {
  const byId = new Map([...reference, ...actual]
    .map((subject) => [subject.subjectId, subject]));
  const records = new Map();
  for (const subject of byId.values()) {
    records.set(subject.subjectId, baseLedger(
      subject,
      resolution.candidateEvidence.get(subject.subjectId),
      collisionIds(subject.subjectId, resolution.collisionGroups),
    ));
  }
  const processed = new Set();
  for (const match of resolution.matches.values()) {
    if (processed.has(match.referenceId)) continue;
    processed.add(match.referenceId);
    const referenceSubject = byId.get(match.referenceId);
    const actualSubject = byId.get(match.actualId);
    const result = pairResult(referenceSubject, actualSubject, match, context);
    for (const [id, counterpart] of [
      [match.referenceId, match.actualId],
      [match.actualId, match.referenceId],
    ]) {
      const record = records.get(id);
      record.identityEvidence.selectedRuleId = match.ruleId;
      record.match.state = result.state;
      record.match.counterpartSubjectIds = [counterpart];
      record.match.passingCounterpartSubjectId = PASSING_STATES.has(result.state)
        ? counterpart : null;
      record.comparisons = cloneJson(result.comparisons);
      record.mismatchCodes = [...result.diagnostics];
      record.recordStatus = statusForState(result.state);
    }
  }
  for (const subject of reference) {
    if (resolution.matches.has(subject.subjectId)) continue;
    const record = records.get(subject.subjectId);
    const groups = collisionIds(subject.subjectId, resolution.collisionGroups);
    record.match.state = groups.length ? 'AMBIGUOUS_MATCH'
      : subject.disposition === 'QUALIFY' ? 'MISSING_ACTUAL' : 'BLOCKED_IDENTITY';
    record.match.counterpartSubjectIds = [...new Set(
      groups.flatMap((group) => group.actualSubjectIds),
    )].sort(compareText);
    record.mismatchCodes = [groups.length ? 'IDENTITY_COLLISION'
      : subject.disposition === 'QUALIFY'
        ? 'MISSING_ACTUAL' : 'NON_QUALIFIED_COMPONENT_DISPOSITION'];
    record.recordStatus = statusForState(record.match.state);
  }
  for (const subject of actual) {
    if (resolution.matches.has(subject.subjectId)) continue;
    const record = records.get(subject.subjectId);
    const groups = collisionIds(subject.subjectId, resolution.collisionGroups);
    record.match.state = groups.length ? 'AMBIGUOUS_MATCH'
      : subject.disposition === 'QUALIFY'
        ? 'UNEXPECTED_ACTUAL' : 'BLOCKED_IDENTITY';
    record.match.counterpartSubjectIds = [...new Set(
      groups.flatMap((group) => group.referenceSubjectIds),
    )].sort(compareText);
    record.mismatchCodes = [groups.length ? 'IDENTITY_COLLISION'
      : subject.disposition === 'QUALIFY'
        ? 'UNEXPECTED_ACTUAL' : 'NON_QUALIFIED_COMPONENT_DISPOSITION'];
    record.recordStatus = statusForState(record.match.state);
  }
  return [...records.values()].sort((left, right) => (
    compareText(left.side, right.side)
    || compareText(left.classification.family, right.classification.family)
    || compareText(left.subjectId, right.subjectId)
  ));
}

function summaryOf(ledger, referenceCount, actualCount) {
  const statesOverall = {}, statesByFamily = {}, familyStatuses = {};
  for (const record of ledger) {
    statesOverall[record.match.state] = (statesOverall[record.match.state] || 0) + 1;
    const family = record.classification.family;
    statesByFamily[family] ||= {};
    statesByFamily[family][record.match.state] = (
      statesByFamily[family][record.match.state] || 0
    ) + 1;
  }
  for (const family of Object.keys(statesByFamily).sort(compareText)) {
    const states = statesByFamily[family], keys = Object.keys(states);
    const familyRecords = ledger.filter((record) => record.classification.family === family);
    const hasObservations = familyRecords.some((record) => record.comparisons.some((item) => (
      item.outcome === 'OBSERVATION' && item.diagnosticCodes.length
    )));
    familyStatuses[family] = keys.some((state) => state === 'BLOCKED_IDENTITY'
      || state === 'AMBIGUOUS_MATCH') ? 'BLOCKED'
      : keys.some((state) => !PASSING_STATES.has(state)) ? 'FAIL'
        : hasObservations ? 'PASS_WITH_OBSERVATIONS' : 'PASS';
  }
  const statuses = new Set(Object.values(familyStatuses));
  const componentStatus = statuses.has('BLOCKED') ? 'BLOCKED'
    : statuses.has('FAIL') ? 'FAIL'
      : statuses.has('PASS_WITH_OBSERVATIONS') ? 'PASS_WITH_OBSERVATIONS' : 'PASS';
  const referenceCoverageCount = ledger
    .filter((record) => record.side === 'REFERENCE').length;
  const actualCoverageCount = ledger
    .filter((record) => record.side === 'ACTUAL').length;
  return {
    statesByFamily,
    statesOverall,
    referenceCoverageCount,
    actualCoverageCount,
    referenceCoverageComplete: referenceCoverageCount === referenceCount,
    actualCoverageComplete: actualCoverageCount === actualCount,
    familyStatuses,
    componentStatus,
  };
}

export async function qualifyComponents({
  reference,
  actual,
  identityPolicy: policyValue,
  toleranceProfile,
  normalizers = {},
  comparators = {},
  topologyByReferenceId = {},
  zoneResolver = null,
  executionIdentity = {},
  benchmarkIdentity = {},
} = {}) {
  const policy = validateComponentIdentityPolicy(policyValue);
  if (policy.authorityState !== 'FROZEN') {
    fail('component identity policy must be FROZEN.');
  }
  const referenceSubjects = await buildComponentSubjects(
    reference, policy, 'REFERENCE', { zoneResolver },
  );
  const actualSubjects = await buildComponentSubjects(
    actual, policy, 'ACTUAL', { zoneResolver },
  );
  if (!referenceSubjects.length) {
    fail('reference component population must not be empty.');
  }
  const normalizerRegistry = { ...BUILTIN_NORMALIZERS, ...normalizers };
  const comparatorRegistry = { ...COMPONENT_COMPARATORS, ...comparators };
  const resolution = resolveMatches(
    referenceSubjects, actualSubjects, policy, normalizerRegistry,
  );
  const context = {
    toleranceProfile,
    comparators: comparatorRegistry,
    topologyByReferenceId,
  };
  const ledger = ledgerRecords(
    referenceSubjects, actualSubjects, resolution, context,
  );
  const referenceInventory = inventory(referenceSubjects);
  const actualInventory = inventory(actualSubjects);
  const reportPayload = {
    schema: REPORT_SCHEMA,
    benchmarkIdentity: cloneJson(benchmarkIdentity),
    executionIdentity: {
      ...cloneJson(executionIdentity),
      componentIdentityPolicyIdentity: {
        policyId: policy.policyId,
        contentSha256: policy.policyContentSha256,
      },
      toleranceProfileIdentity: toleranceProfile?.profileId ? {
        profileId: toleranceProfile.profileId,
        contentSha256: toleranceProfile.contentSha256 ?? null,
      } : null,
    },
    inventory: {
      referenceComponentCount: referenceInventory.count,
      actualComponentCount: actualInventory.count,
      referenceCountsByFamily: referenceInventory.countsByFamily,
      actualCountsByFamily: actualInventory.countsByFamily,
      referenceCountsByRawType: referenceInventory.countsByRawType,
      actualCountsByRawType: actualInventory.countsByRawType,
      unknownReferenceTypes: [...new Set(referenceSubjects
        .filter((item) => item.family === 'UNKNOWN')
        .map((item) => item.rawType).filter(Boolean))].sort(compareText),
      unknownActualTypes: [...new Set(actualSubjects
        .filter((item) => item.family === 'UNKNOWN')
        .map((item) => item.rawType).filter(Boolean))].sort(compareText),
      referenceCollisionGroupCount: resolution.collisionGroups
        .filter((item) => item.referenceSubjectIds.length > 1).length,
      actualCollisionGroupCount: resolution.collisionGroups
        .filter((item) => item.actualSubjectIds.length > 1).length,
    },
    ledger,
    collisionGroups: resolution.collisionGroups,
    summary: summaryOf(
      ledger, referenceSubjects.length, actualSubjects.length,
    ),
    canonicalOrdering: {
      ledger: ['side', 'classification.family', 'subjectId'],
      collisionGroups: ['identityRuleId', 'normalizedKey', 'collisionGroupId'],
      comparisons: ['fieldId'],
    },
  };
  const reportDigest = await sha256Hex(canonicalJson(reportPayload));
  const report = { ...reportPayload, reportId: `FBCOMP-${reportDigest.slice(0, 32)}` };
  return deepFreeze(report);
}
