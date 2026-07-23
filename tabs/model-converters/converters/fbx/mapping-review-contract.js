import { canonicalJson } from './canonical-json.js';

export class BundleFailure extends Error {
  constructor(status, message) {
    super(`${status} ${message}`);
    this.name = 'BundleFailure';
    this.status = status;
  }
}

export class ShardFailure extends Error {
  constructor(status, message) {
    super(`${status} ${message}`);
    this.name = 'ShardFailure';
    this.status = status;
  }
}

export class FragmentFailure extends Error {
  constructor(status, message) {
    super(`${status} ${message}`);
    this.name = 'FragmentFailure';
    this.status = status;
  }
}

export class AssemblerFailure extends Error {
  constructor(status, message) {
    super(`${status} ${message}`);
    this.name = 'AssemblerFailure';
    this.status = status;
  }
}

export function failBundle(status, message) {
  throw new BundleFailure(status, message);
}

export function failShard(status, message) {
  throw new ShardFailure(status, message);
}

export function failFragment(status, message) {
  throw new FragmentFailure(status, message);
}

export function failAssembler(status, message) {
  throw new AssemblerFailure(status, message);
}

const HASH_PATTERN = /^[0-9a-f]{64}$/;
const WORK_ITEM_ID_PATTERN = /^work-[0-9a-f]{64}$/;

function requireText(value, label, fail) {
  if (typeof value !== 'string' || !value) fail('BLOCKED_REVIEW_BUNDLE_CONTRACT', `${label} is required.`);
  return value;
}

function requirePattern(value, pattern, label, fail) {
  const text = requireText(value, label, fail);
  if (!pattern.test(text)) fail('BLOCKED_REVIEW_BUNDLE_CONTRACT', `${label} has invalid syntax.`);
  return text;
}

export function validateBundleShape(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    failBundle('BLOCKED_REVIEW_BUNDLE_CONTRACT', 'Bundle must be an object.');
  }
  if (value.schema !== 'FbxMappingReviewBundle.v1') {
    failBundle('BLOCKED_REVIEW_BUNDLE_CONTRACT', 'schema must be FbxMappingReviewBundle.v1.');
  }
  const keys = Object.keys(value).sort().join('\0');
  const expected = ['bundleId', 'partitionPolicy', 'schema', 'shards', 'sourceGraphCanonicalSha256', 'worklistId'].join('\0');
  if (keys !== expected) {
    failBundle('BLOCKED_REVIEW_BUNDLE_CONTRACT', 'Bundle has missing or unexpected fields.');
  }
  requirePattern(value.bundleId, HASH_PATTERN, 'bundleId', failBundle);
  requirePattern(value.worklistId, HASH_PATTERN, 'worklistId', failBundle);
  requirePattern(value.sourceGraphCanonicalSha256, HASH_PATTERN, 'sourceGraphCanonicalSha256', failBundle);
  if (!Array.isArray(value.shards) || value.shards.length === 0) {
    failBundle('BLOCKED_REVIEW_BUNDLE_CONTRACT', 'shards must be a non-empty array.');
  }
  return value;
}

export function validateShardShape(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    failShard('BLOCKED_FRAGMENT_CONTRACT', 'Shard must be an object.');
  }
  if (value.schema !== 'FbxMappingReviewShard.v1') {
    failShard('BLOCKED_FRAGMENT_CONTRACT', 'schema must be FbxMappingReviewShard.v1.');
  }
  const keys = Object.keys(value).sort().join('\0');
  const expected = ['bundleId', 'ordinal', 'schema', 'shardId', 'sourceGraphCanonicalSha256', 'workItems', 'worklistId'].join('\0');
  if (keys !== expected) {
    failShard('BLOCKED_FRAGMENT_CONTRACT', 'Shard has missing or unexpected fields.');
  }
  requirePattern(value.bundleId, HASH_PATTERN, 'bundleId', failShard);
  requirePattern(value.worklistId, HASH_PATTERN, 'worklistId', failShard);
  requirePattern(value.sourceGraphCanonicalSha256, HASH_PATTERN, 'sourceGraphCanonicalSha256', failShard);
  requirePattern(value.shardId, HASH_PATTERN, 'shardId', failShard);
  if (!Array.isArray(value.workItems)) {
    failShard('BLOCKED_FRAGMENT_CONTRACT', 'workItems must be an array.');
  }
  return value;
}

export function validateFragmentShape(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    failFragment('BLOCKED_FRAGMENT_CONTRACT', 'Fragment must be an object.');
  }
  if (value.schema !== 'FbxMappingDecisionFragment.v1') {
    failFragment('BLOCKED_FRAGMENT_CONTRACT', 'schema must be FbxMappingDecisionFragment.v1.');
  }
  const keys = Object.keys(value).sort().join('\0');
  const expected = ['bundleId', 'decisions', 'fragmentId', 'schema', 'shardId', 'sourceGraphCanonicalSha256', 'worklistId'].join('\0');
  if (keys !== expected) {
    failFragment('BLOCKED_FRAGMENT_CONTRACT', 'Fragment has missing or unexpected fields.');
  }
  requirePattern(value.bundleId, HASH_PATTERN, 'bundleId', failFragment);
  requirePattern(value.worklistId, HASH_PATTERN, 'worklistId', failFragment);
  requirePattern(value.sourceGraphCanonicalSha256, HASH_PATTERN, 'sourceGraphCanonicalSha256', failFragment);
  requirePattern(value.shardId, HASH_PATTERN, 'shardId', failFragment);
  requirePattern(value.fragmentId, HASH_PATTERN, 'fragmentId', failFragment);
  if (!Array.isArray(value.decisions)) {
    failFragment('BLOCKED_FRAGMENT_CONTRACT', 'decisions must be an array.');
  }
  return value;
}
