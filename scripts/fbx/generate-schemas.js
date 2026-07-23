const fs = require('fs');
const worklist = JSON.parse(fs.readFileSync('contracts/fbx/fbx-mapping-worklist.v1.schema.json', 'utf8'));
const decisionSet = JSON.parse(fs.readFileSync('contracts/fbx/fbx-mapping-decision-set.v1.schema.json', 'utf8'));

const shardSchema = {
  '$schema': 'https://json-schema.org/draft/2020-12/schema',
  '$id': 'FbxMappingReviewShard.v1',
  'title': 'FbxMappingReviewShard.v1',
  'type': 'object',
  'additionalProperties': false,
  'required': ['schema', 'bundleId', 'worklistId', 'sourceGraphCanonicalSha256', 'shardId', 'ordinal', 'workItems'],
  'properties': {
    'schema': { 'const': 'FbxMappingReviewShard.v1' },
    'bundleId': { '$ref': '#/$defs/sha256' },
    'worklistId': { '$ref': '#/$defs/sha256' },
    'sourceGraphCanonicalSha256': { '$ref': '#/$defs/sha256' },
    'shardId': { '$ref': '#/$defs/sha256' },
    'ordinal': { 'type': 'integer', 'minimum': 0 },
    'workItems': { 'type': 'array', 'items': { '$ref': '#/$defs/workItem' } }
  },
  '$defs': {
    'sha256': worklist.$defs.sha256,
    'sourceId': worklist.$defs.sourceId,
    'occurrenceId': worklist.$defs.occurrenceId,
    'typeEvidence': worklist.$defs.typeEvidence,
    'nameEvidence': worklist.$defs.nameEvidence,
    'geometryEvidence': worklist.$defs.geometryEvidence,
    'workItem': worklist.$defs.workItem
  }
};
fs.writeFileSync('contracts/fbx/fbx-mapping-review-shard.v1.schema.json', JSON.stringify(shardSchema, null, 2) + '\n');

const fragmentSchema = {
  '$schema': 'https://json-schema.org/draft/2020-12/schema',
  '$id': 'FbxMappingDecisionFragment.v1',
  'title': 'FbxMappingDecisionFragment.v1',
  'type': 'object',
  'additionalProperties': false,
  'required': ['schema', 'fragmentId', 'bundleId', 'worklistId', 'sourceGraphCanonicalSha256', 'shardId', 'decisions'],
  'properties': {
    'schema': { 'const': 'FbxMappingDecisionFragment.v1' },
    'fragmentId': { '$ref': '#/$defs/sha256' },
    'bundleId': { '$ref': '#/$defs/sha256' },
    'worklistId': { '$ref': '#/$defs/sha256' },
    'sourceGraphCanonicalSha256': { '$ref': '#/$defs/sha256' },
    'shardId': { '$ref': '#/$defs/sha256' },
    'decisions': { 'type': 'array', 'items': { '$ref': '#/$defs/decision' } }
  },
  '$defs': {
    'sha256': decisionSet.$defs.sha256,
    'workItemId': decisionSet.$defs.workItemId,
    'exclusion': decisionSet.$defs.exclusion,
    'promotion': decisionSet.$defs.promotion,
    'decision': decisionSet.$defs.decision
  }
};
fs.writeFileSync('contracts/fbx/fbx-mapping-decision-fragment.v1.schema.json', JSON.stringify(fragmentSchema, null, 2) + '\n');
