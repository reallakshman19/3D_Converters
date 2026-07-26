export function supportNode({
  name,
  ref,
  tag,
  owner,
  supportClass,
  pos,
  orientation = 'Y is N and Z is U',
  rawType = 'ATTA',
  gap = '0',
}) {
  return {
    name: `SUPPORT ${tag}`,
    type: 'SUPPORT',
    attributes: {
      NAME: name,
      REF: ref,
      OWNER: owner,
      TYPE: rawType,
      RAW_TYPE: rawType,
      POS: pos,
      ORI: orientation,
      SUPPORT_TAG: tag,
      SUPPORT_TYPE: supportClass,
      SUPPORT_KIND: supportClass,
      SUPPORT_MAPPER_KIND: supportClass,
      NODEGAP: gap,
    },
  };
}

export function benchmarkFixture() {
  const owner = '/SITE/PIPE/B1';
  return [{
    name: owner,
    type: 'BRANCH',
    attributes: { NAME: owner, OWNER_SITE: '/SITE' },
    children: [
      supportNode({ name: '/S-001.1', ref: '=100/1', tag: 'S-001', owner, supportClass: 'REST', pos: { x: 1, y: 2, z: 3 } }),
      supportNode({ name: '/S-002.1', ref: '=100/2', tag: 'SHARED', owner, supportClass: 'REST', pos: { x: 4, y: 5, z: 6 } }),
      supportNode({ name: '/S-002.2', ref: '=100/3', tag: 'SHARED', owner, supportClass: 'GUIDE', pos: { x: 4, y: 5, z: 6 } }),
    ],
  }];
}

export function identityPolicy({ allowUnclassified = false } = {}) {
  return {
    schema: 'FbxSupportIdentityPolicy.v1',
    policyId: 'test-support-policy',
    identityStages: [
      { stageId: 'SOURCE_REF_OWNER', rank: 1, authority: 'EXACT', keyPaths: ['sourceRef', 'ownerBranch'] },
      { stageId: 'SOURCE_NAME_OWNER', rank: 2, authority: 'EXACT', keyPaths: ['sourceName', 'ownerBranch'] },
      { stageId: 'TAG_OWNER', rank: 3, authority: 'EXACT', keyPaths: ['supportTag', 'ownerBranch'] },
    ],
    classAuthority: {
      emptyExplicitClassDisposition: allowUnclassified ? 'ALLOW_UNCLASSIFIED' : 'BLOCKED_CLASSIFICATION',
      explicitConflictDisposition: 'BLOCKED_CLASSIFICATION',
    },
  };
}

export const toleranceProfile = {
  schema: 'FbxBenchmarkToleranceProfile.v1',
  profileId: 'test-tolerance-profile',
  supportPositionTolerance: { absolute: 0.01, relative: 0 },
  scalarEngineeringTolerance: { absolute: 0.001, relative: 0 },
};

export const propertyRules = [
  { fieldId: 'gap', attribute: 'NODEGAP', normalizerId: 'plain-number', requiredForClasses: ['REST', 'GUIDE'] },
];

export const normalizers = {
  'plain-number': (value) => Number(value),
};
