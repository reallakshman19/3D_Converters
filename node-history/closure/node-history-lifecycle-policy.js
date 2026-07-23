/**
 * Defines the node-history rollout lifecycle without selecting a production writer.
 * Callers supply policy/config versions; the returned hash binds every mode authority.
 */

import {
  canonicalSemanticJson,
  deepFreeze,
  isRecord,
  text,
} from '../../contracts/topo-enriched-xml/contract-core.js';

export const NODE_HISTORY_LIFECYCLE_SCHEMA = 'NodeHistoryLifecyclePolicy.v1';
export const NODE_HISTORY_MODES = Object.freeze([
  'BOOTSTRAP_REVIEW',
  'HISTORY_DRY_RUN',
  'HISTORY_SHADOW',
  'HISTORY_ENFORCED',
]);

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const MODE_AUTHORITIES = deepFreeze({
  BOOTSTRAP_REVIEW: {
    modeAvailable: true,
    matcherAuthority: 'NONE',
    nodePlanAuthority: 'APPROVED_BOOTSTRAP_ONLY',
    outputAuthority: 'CURRENT_PIPELINE',
    registryMutationAllowed: false,
    approvedClosureRequired: false,
  },
  HISTORY_DRY_RUN: {
    modeAvailable: true,
    matcherAuthority: 'OBSERVATION_ONLY',
    nodePlanAuthority: 'CURRENT_PIPELINE',
    outputAuthority: 'CURRENT_PIPELINE',
    registryMutationAllowed: false,
    approvedClosureRequired: false,
  },
  HISTORY_SHADOW: {
    modeAvailable: true,
    matcherAuthority: 'SHADOW_COMPARE',
    nodePlanAuthority: 'SHADOW_ONLY',
    outputAuthority: 'CURRENT_PIPELINE',
    registryMutationAllowed: false,
    approvedClosureRequired: false,
  },
  HISTORY_ENFORCED: {
    modeAvailable: false,
    matcherAuthority: 'NODE_HISTORY',
    nodePlanAuthority: 'NODE_HISTORY',
    outputAuthority: 'ASSURED_NODE_HISTORY',
    registryMutationAllowed: true,
    approvedClosureRequired: true,
  },
});

/**
 * @param {{policyVersion: string, configVersion: string}} input
 * @returns {Promise<Readonly<Record<string, unknown>>>}
 */
export async function buildNodeHistoryLifecyclePolicy(input) {
  requireRecord(input, 'lifecycle policy input');
  const policy = {
    schema: NODE_HISTORY_LIFECYCLE_SCHEMA,
    policyVersion: requireText(input.policyVersion, 'policyVersion'),
    configVersion: requireText(input.configVersion, 'configVersion'),
    defaultMode: 'BOOTSTRAP_REVIEW',
    rollbackMode: 'HISTORY_DRY_RUN',
    promotionSequence: [...NODE_HISTORY_MODES],
    modes: structuredClone(MODE_AUTHORITIES),
  };
  policy.lifecyclePolicyHash = await computeNodeHistoryLifecyclePolicyHash(policy);
  const errors = await validateNodeHistoryLifecyclePolicy(policy);
  if (errors.length) throw new TypeError(`Lifecycle policy validation failed: ${errors.join('; ')}`);
  return deepFreeze(policy);
}

/**
 * @param {Record<string, unknown>} value
 * @returns {Promise<string>}
 */
export async function computeNodeHistoryLifecyclePolicyHash(value) {
  const semantic = structuredClone(value);
  delete semantic.lifecyclePolicyHash;
  return sha256Canonical(semantic);
}

/**
 * @param {unknown} value
 * @returns {Promise<ReadonlyArray<string>>}
 */
export async function validateNodeHistoryLifecyclePolicy(value) {
  const errors = [];
  if (!isRecord(value)) return Object.freeze(['Lifecycle policy must be an object.']);
  if (value.schema !== NODE_HISTORY_LIFECYCLE_SCHEMA) errors.push(`schema must equal ${NODE_HISTORY_LIFECYCLE_SCHEMA}.`);
  for (const field of ['policyVersion', 'configVersion']) {
    if (!text(value[field])) errors.push(`${field} is required.`);
  }
  if (value.defaultMode !== 'BOOTSTRAP_REVIEW') errors.push('defaultMode must fail safe to BOOTSTRAP_REVIEW.');
  if (value.rollbackMode !== 'HISTORY_DRY_RUN') errors.push('rollbackMode must equal HISTORY_DRY_RUN.');
  validatePromotionSequence(value.promotionSequence, errors);
  validateModeAuthorities(value.modes, errors);
  if (!HASH_PATTERN.test(text(value.lifecyclePolicyHash))) errors.push('lifecyclePolicyHash is invalid.');
  else if (value.lifecyclePolicyHash !== await computeNodeHistoryLifecyclePolicyHash(value)) {
    errors.push('lifecyclePolicyHash does not match the policy.');
  }
  return Object.freeze(errors);
}

export function serializeNodeHistoryArtifact(value) {
  return `${canonicalSemanticJson(value, { excludedKeys: [] })}\n`;
}

function validatePromotionSequence(value, errors) {
  if (!Array.isArray(value) || value.join('|') !== NODE_HISTORY_MODES.join('|')) {
    errors.push('promotionSequence must use the declared lifecycle order.');
  }
}

function validateModeAuthorities(value, errors) {
  if (!isRecord(value)) {
    errors.push('modes must be an object.');
    return;
  }
  for (const mode of NODE_HISTORY_MODES) {
    if (canonicalSemanticJson(value[mode], { excludedKeys: [] })
      !== canonicalSemanticJson(MODE_AUTHORITIES[mode], { excludedKeys: [] })) {
      errors.push(`modes.${mode} authority differs from the frozen policy.`);
    }
  }
}

async function sha256Canonical(value) {
  if (!globalThis.crypto?.subtle) throw new Error('Web Crypto SHA-256 is required.');
  const bytes = new TextEncoder().encode(canonicalSemanticJson(value, { excludedKeys: [] }));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `sha256:${hex}`;
}

function requireRecord(value, field) {
  if (!isRecord(value)) throw new TypeError(`${field} must be an object.`);
}

function requireText(value, field) {
  const result = text(value);
  if (!result) throw new TypeError(`${field} is required.`);
  return result;
}
