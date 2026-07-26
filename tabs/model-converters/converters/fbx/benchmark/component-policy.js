import { deepFreeze } from '../canonical-json.js';
import {
  COMPONENT_FAMILIES, POLICY_SCHEMA, cloneJson, exactKeys, fail,
  requireArray, requireBoolean, requireObject, requireText, stringArray,
} from './component-common.js';

function validateTypeCatalog(entries) {
  const seenFamilies = new Set();
  const result = requireArray(entries, 'policy.typeCatalog').map((entry, index) => {
    const label = `policy.typeCatalog[${index}]`;
    exactKeys(entry, [
      'familyId', 'outerTypes', 'rawTypes', 'preserveRawSubtype', 'disposition',
      'comparatorId', 'exclusionReason',
    ], label);
    const familyId = requireText(entry.familyId, `${label}.familyId`);
    if (!COMPONENT_FAMILIES.includes(familyId)) fail(`${label}.familyId is unsupported.`);
    if (seenFamilies.has(familyId)) fail(`duplicate family catalog ${familyId}.`);
    seenFamilies.add(familyId);
    const disposition = requireText(entry.disposition, `${label}.disposition`);
    if (!['QUALIFY', 'EXCLUDE_WITH_REASON', 'BLOCK'].includes(disposition)) {
      fail(`${label}.disposition is invalid.`);
    }
    const exclusionReason = entry.exclusionReason ?? null;
    if (disposition === 'EXCLUDE_WITH_REASON') {
      requireText(exclusionReason, `${label}.exclusionReason`);
    } else if (exclusionReason !== null) {
      fail(`${label}.exclusionReason is only valid for exclusions.`);
    }
    const comparatorId = entry.comparatorId ?? null;
    if (disposition === 'QUALIFY') requireText(comparatorId, `${label}.comparatorId`);
    if (disposition !== 'QUALIFY' && comparatorId !== null) {
      fail(`${label}.comparatorId is only valid for qualified families.`);
    }
    return {
      familyId,
      outerTypes: stringArray(entry.outerTypes, `${label}.outerTypes`, { allowEmpty: false })
        .map((item) => item.toUpperCase()),
      rawTypes: stringArray(entry.rawTypes, `${label}.rawTypes`)
        .map((item) => item.toUpperCase()),
      preserveRawSubtype: requireBoolean(
        entry.preserveRawSubtype, `${label}.preserveRawSubtype`,
      ),
      disposition,
      comparatorId,
      exclusionReason,
    };
  });
  for (let leftIndex = 0; leftIndex < result.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < result.length; rightIndex += 1) {
      const left = result[leftIndex], right = result[rightIndex];
      const outerOverlap = left.outerTypes.some((type) => right.outerTypes.includes(type));
      const rawOverlap = !left.rawTypes.length || !right.rawTypes.length
        || left.rawTypes.some((type) => right.rawTypes.includes(type));
      if (outerOverlap && rawOverlap) {
        fail(`type catalogs ${left.familyId} and ${right.familyId} overlap.`);
      }
    }
  }
  return result;
}

function validateIdentityRules(entries) {
  const ranks = new Set(), ids = new Set();
  const result = requireArray(entries, 'policy.identityRules').map((entry, index) => {
    const label = `policy.identityRules[${index}]`;
    exactKeys(entry, [
      'ruleId', 'rank', 'kind', 'applicableFamilies', 'requiredFields',
      'normalizationRuleIds', 'scope', 'uniquenessRequirement', 'passing',
    ], label);
    const ruleId = requireText(entry.ruleId, `${label}.ruleId`);
    if (ids.has(ruleId)) fail(`duplicate identity rule ${ruleId}.`);
    ids.add(ruleId);
    if (!Number.isInteger(entry.rank) || entry.rank < 1) {
      fail(`${label}.rank must be a positive integer.`);
    }
    if (ranks.has(entry.rank)) fail(`duplicate identity rank ${entry.rank}.`);
    ranks.add(entry.rank);
    const kind = requireText(entry.kind, `${label}.kind`);
    if (![
      'EXACT', 'APPROVED_COMPOSITE',
      'DIAGNOSTIC_STRUCTURAL', 'DIAGNOSTIC_SPATIAL',
    ].includes(kind)) fail(`${label}.kind is invalid.`);
    const passing = requireBoolean(entry.passing, `${label}.passing`);
    if (kind.startsWith('DIAGNOSTIC_') && passing) {
      fail(`${label} diagnostic rules cannot pass.`);
    }
    const applicableFamilies = stringArray(
      entry.applicableFamilies, `${label}.applicableFamilies`, { allowEmpty: false },
    ).map((family) => {
      if (!COMPONENT_FAMILIES.includes(family)) {
        fail(`${label}.applicableFamilies contains unsupported family ${family}.`);
      }
      return family;
    });
    const scope = requireText(entry.scope, `${label}.scope`);
    if (!['GLOBAL', 'ZONE', 'OWNER', 'BRANCH'].includes(scope)) {
      fail(`${label}.scope is invalid.`);
    }
    const uniquenessRequirement = requireText(
      entry.uniquenessRequirement, `${label}.uniquenessRequirement`,
    );
    if (!['EXACTLY_ONE', 'COLLISION_PRESERVING'].includes(uniquenessRequirement)) {
      fail(`${label}.uniquenessRequirement is invalid.`);
    }
    const requiredFields = stringArray(
      entry.requiredFields, `${label}.requiredFields`, { allowEmpty: false },
    );
    const scopeField = { ZONE: 'zoneId', OWNER: 'owner', BRANCH: 'branchId' }[scope];
    if (scopeField && !requiredFields.includes(scopeField)) {
      fail(`${label}.requiredFields must include ${scopeField} for ${scope} scope.`);
    }
    return {
      ruleId,
      rank: entry.rank,
      kind,
      applicableFamilies,
      requiredFields,
      normalizationRuleIds: stringArray(
        entry.normalizationRuleIds, `${label}.normalizationRuleIds`,
      ),
      scope,
      uniquenessRequirement,
      passing,
    };
  });
  return result.sort((left, right) => left.rank - right.rank);
}

export function validateComponentIdentityPolicy(value) {
  exactKeys(value, [
    'schema', 'policyId', 'authorityState', 'typeCatalog', 'identityRules',
    'collisionPolicy', 'cardinalityPolicy', 'unknownTypePolicy', 'policyContentSha256',
  ], 'policy');
  if (value.schema !== POLICY_SCHEMA) fail(`policy.schema must be ${POLICY_SCHEMA}.`);
  const authorityState = requireText(value.authorityState, 'policy.authorityState');
  if (!['DRAFT', 'FROZEN', 'RETIRED'].includes(authorityState)) {
    fail('policy.authorityState is invalid.');
  }
  const collisionPolicy = requireObject(value.collisionPolicy, 'policy.collisionPolicy');
  exactKeys(collisionPolicy, [
    'indexShape', 'preserveAllSubjects', 'mergeDuplicates',
    'greedyResolutionAllowed', 'ambiguousState', 'blockedState',
  ], 'policy.collisionPolicy');
  if (collisionPolicy.indexShape !== 'MULTIMAP') {
    fail('policy.collisionPolicy.indexShape must be MULTIMAP.');
  }
  if (collisionPolicy.preserveAllSubjects !== true
    || collisionPolicy.mergeDuplicates !== false
    || collisionPolicy.greedyResolutionAllowed !== false) {
    fail('policy.collisionPolicy must preserve duplicates without greedy resolution.');
  }
  if (collisionPolicy.ambiguousState !== 'AMBIGUOUS_MATCH'
    || collisionPolicy.blockedState !== 'BLOCKED_IDENTITY') {
    fail('policy.collisionPolicy states are invalid.');
  }
  const cardinalityPolicy = requireObject(
    value.cardinalityPolicy, 'policy.cardinalityPolicy',
  );
  exactKeys(cardinalityPolicy, [
    'maximumPassingCounterpartsPerReference',
    'maximumPassingCounterpartsPerActual',
    'atomicReservationRequired',
  ], 'policy.cardinalityPolicy');
  if (cardinalityPolicy.maximumPassingCounterpartsPerReference !== 1
    || cardinalityPolicy.maximumPassingCounterpartsPerActual !== 1
    || cardinalityPolicy.atomicReservationRequired !== true) {
    fail('policy.cardinalityPolicy must enforce atomic one-to-one matching.');
  }
  if (value.unknownTypePolicy !== 'BLOCKED_IDENTITY') {
    fail('policy.unknownTypePolicy must be BLOCKED_IDENTITY.');
  }
  const policy = {
    schema: POLICY_SCHEMA,
    policyId: requireText(value.policyId, 'policy.policyId'),
    authorityState,
    typeCatalog: validateTypeCatalog(value.typeCatalog),
    identityRules: validateIdentityRules(value.identityRules),
    collisionPolicy: cloneJson(collisionPolicy),
    cardinalityPolicy: cloneJson(cardinalityPolicy),
    unknownTypePolicy: value.unknownTypePolicy,
    policyContentSha256: value.policyContentSha256 ?? null,
  };
  if (authorityState === 'FROZEN') {
    requireText(policy.policyContentSha256, 'policy.policyContentSha256');
    if (!/^[0-9a-f]{64}$/.test(policy.policyContentSha256)) {
      fail('policy.policyContentSha256 must be lowercase SHA-256.');
    }
  }
  return deepFreeze(policy);
}

export function catalogEntryForTypes(outerType, rawType, policy) {
  const candidates = policy.typeCatalog.filter((entry) => (
    entry.outerTypes.includes(outerType)
    && (!entry.rawTypes.length || entry.rawTypes.includes(rawType))
  ));
  if (candidates.length > 1) {
    fail(`component type ${outerType}/${rawType} resolves to multiple catalog entries.`);
  }
  return candidates[0] ?? null;
}
