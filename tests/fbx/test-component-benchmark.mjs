import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { canonicalJson } from '../../tabs/model-converters/converters/fbx/canonical-json.js';
import {
  buildComponentSubjects,
  discoverComponentCatalog,
  qualifyComponents,
  validateComponentIdentityPolicy,
} from '../../tabs/model-converters/converters/fbx/benchmark/component-qualification.js';

const point = (x, y, z) => ({ x, y, z });

function validateSchema(schema, instance) {
  const program = String.raw`
import json, sys
from jsonschema import Draft202012Validator
payload = json.load(sys.stdin)
Draft202012Validator.check_schema(payload["schema"])
errors = sorted(
    Draft202012Validator(payload["schema"]).iter_errors(payload["instance"]),
    key=lambda error: (list(error.absolute_path), error.message),
)
print(json.dumps([{"path": list(error.absolute_path), "message": error.message} for error in errors]))
`;
  const python = process.env.FBX_SCHEMA_PYTHON || 'python3';
  const result = spawnSync(python, ['-c', program], {
    input: JSON.stringify({ schema, instance }), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) throw new Error(result.error?.message || result.stderr);
  return JSON.parse(result.stdout);
}

function branch(name, children) {
  return [{
    name,
    type: 'BRANCH',
    attributes: { NAME: name, REF: name, OWNER: name.replace(/\/B\d+$/, '') },
    children,
  }];
}

function fitting(type, ref, options = {}) {
  const raw = options.rawType || type;
  const start = options.apos || point(0, 0, 0);
  const end = options.lpos || point(100, 0, 0);
  return {
    name: `${type} ${ref}`,
    type,
    attributes: {
      NAME: ref,
      REF: ref,
      TYPE: raw,
      RAW_TYPE: raw,
      OWNER: options.owner || '/LINE',
      POS: options.position || start,
      APOS: start,
      LPOS: end,
      ABORE: options.abore || '100mm',
      LBORE: options.lbore || options.abore || '100mm',
      ANGL: options.angle ?? null,
      CREF: options.cref ?? null,
      SPRE: options.specification ?? '/SPEC/FAMILY',
      ORI: options.orientation ?? 'Y is N and Z is U',
      ...(options.extra || {}),
    },
  };
}

function pipe(name, options = {}) {
  return {
    name,
    type: 'PIPE',
    attributes: {
      APOS: options.apos || point(0, 0, 0),
      LPOS: options.lpos || point(100, 0, 0),
      AUTO_GENERATED_PIPE: 'true',
      GAP_MM: options.gap ?? '100',
      ROUTE_TIER: options.routeTier || 'LEGACY',
      ROUTE_SPLIT: options.routeSplit || '',
      LBORE: options.bore || '100mm',
      BORE_SOURCE: 'inherited from adjacent fitting',
    },
  };
}

function policy() {
  const family = (familyId, outerTypes, rawTypes, comparatorId, preserveRawSubtype = true) => ({
    familyId, outerTypes, rawTypes, preserveRawSubtype,
    disposition: 'QUALIFY', comparatorId, exclusionReason: null,
  });
  return {
    schema: 'FbxComponentIdentityPolicy.v1',
    policyId: 'agent-c-test-policy',
    authorityState: 'FROZEN',
    typeCatalog: [
      family('PIPE', ['PIPE'], [], 'PIPE.v1', false),
      family('ELBOW', ['ELBO'], ['ELBO', 'BEND'], 'ELBOW.v1'),
      family('TEE', ['TEE'], ['TEE'], 'TEE.v1'),
      family('REDUCER', ['REDU'], ['REDU'], 'REDUCER.v1'),
      family('FLANGE', ['FLAN'], ['FLAN', 'FBLI'], 'FLANGE.v1'),
      family('VALVE', ['VALV'], ['VALV'], 'VALVE.v1'),
      family('GASKET', ['GASK'], ['GASK'], 'GASKET.v1'),
      family('BRANCH_FITTING', ['OLET'], ['OLET'], 'BRANCH_FITTING.v1'),
      family('INSTRUMENT', ['INST'], ['INST'], 'INSTRUMENT.v1'),
    ],
    identityRules: [
      {
        ruleId: 'stable-source-identity', rank: 1, kind: 'EXACT',
        applicableFamilies: ['PIPE', 'ELBOW', 'TEE', 'REDUCER', 'FLANGE', 'VALVE', 'GASKET', 'BRANCH_FITTING', 'INSTRUMENT'],
        requiredFields: ['sourceIdentity'], normalizationRuleIds: ['trim'],
        scope: 'GLOBAL', uniquenessRequirement: 'EXACTLY_ONE', passing: true,
      },
      {
        ruleId: 'reference-branch-family', rank: 2, kind: 'EXACT',
        applicableFamilies: ['ELBOW', 'TEE', 'REDUCER', 'FLANGE', 'VALVE', 'GASKET', 'BRANCH_FITTING', 'INSTRUMENT'],
        requiredFields: ['reference', 'branchId'], normalizationRuleIds: ['trim', 'normalize-slashes'],
        scope: 'BRANCH', uniquenessRequirement: 'COLLISION_PRESERVING', passing: true,
      },
      {
        ruleId: 'synthetic-pipe-composite', rank: 3, kind: 'APPROVED_COMPOSITE',
        applicableFamilies: ['PIPE'],
        requiredFields: ['branchId', 'family', 'geometry.apos', 'geometry.lpos', 'attributes.AUTO_GENERATED_PIPE', 'attributes.ROUTE_TIER'],
        normalizationRuleIds: [], scope: 'BRANCH', uniquenessRequirement: 'COLLISION_PRESERVING', passing: true,
      },
      {
        ruleId: 'spatial-diagnostic', rank: 4, kind: 'DIAGNOSTIC_SPATIAL',
        applicableFamilies: ['PIPE', 'ELBOW', 'TEE', 'REDUCER', 'FLANGE', 'VALVE', 'GASKET', 'BRANCH_FITTING', 'INSTRUMENT'],
        requiredFields: ['branchId', 'family', 'geometry.apos'], normalizationRuleIds: [],
        scope: 'BRANCH', uniquenessRequirement: 'COLLISION_PRESERVING', passing: false,
      },
    ],
    collisionPolicy: {
      indexShape: 'MULTIMAP', preserveAllSubjects: true, mergeDuplicates: false,
      greedyResolutionAllowed: false, ambiguousState: 'AMBIGUOUS_MATCH', blockedState: 'BLOCKED_IDENTITY',
    },
    cardinalityPolicy: {
      maximumPassingCounterpartsPerReference: 1,
      maximumPassingCounterpartsPerActual: 1,
      atomicReservationRequired: true,
    },
    unknownTypePolicy: 'BLOCKED_IDENTITY',
    policyContentSha256: 'a'.repeat(64),
  };
}

const toleranceProfile = {
  schema: 'FbxBenchmarkToleranceProfile.v1',
  profileId: 'agent-c-test-tolerances',
  rules: {
    coordinate: { absolute: 0.01, relative: 0 },
    endpoint: { absolute: 0.01, relative: 0 },
    bore: { absolute: 0.001, relative: 0 },
    length: { absolute: 0.01, relative: 0 },
    angle: { absolute: 0.001, relative: 0 },
  },
};

const acceptedPolicy = validateComponentIdentityPolicy(policy());
assert.equal(acceptedPolicy.authorityState, 'FROZEN');
assert.throws(() => validateComponentIdentityPolicy({ ...policy(), authorityState: 'FROZEN', policyContentSha256: null }), /policyContentSha256/);
assert.throws(() => validateComponentIdentityPolicy({
  ...policy(), identityRules: policy().identityRules.map((rule) => rule.ruleId === 'spatial-diagnostic' ? { ...rule, passing: true } : rule),
}), /diagnostic rules cannot pass/);
assert.throws(() => validateComponentIdentityPolicy({
  ...policy(), identityRules: policy().identityRules.map((rule) => rule.ruleId === 'spatial-diagnostic'
    ? { ...rule, requiredFields: ['family', 'geometry.apos'] } : rule),
}), /must include branchId/);

const inventoryFixture = branch('/LINE/B1', [
  fitting('FLAN', '=1'), pipe('PIPE AUTO /LINE/B1 1'), fitting('OLET', '=2'),
  { name: 'SUPPORT X', type: 'SUPPORT', attributes: { TYPE: 'ATTA' } },
]);
assert.deepEqual(discoverComponentCatalog(inventoryFixture), {
  schema: 'FbxComponentCatalog.v1', branchCount: 1, componentCount: 3, supportCount: 1,
  countsByOuterType: { FLAN: 1, OLET: 1, PIPE: 1 },
  countsByRawType: { FLAN: 1, OLET: 1, PIPE: 1 },
});

const reference = branch('/LINE/B1', [
  fitting('FLAN', '=F1'),
  pipe('PIPE AUTO /LINE/B1 1'),
]);
const actual = branch('/LINE/B1', [
  pipe('PIPE AUTO /LINE/B1 1'),
  fitting('FLAN', '=F1'),
]);
const exact = await qualifyComponents({ reference, actual, identityPolicy: policy(), toleranceProfile });
assert.equal(exact.summary.componentStatus, 'PASS');
assert.equal(exact.inventory.referenceComponentCount, 2);
assert.equal(exact.inventory.actualComponentCount, 2);
assert.equal(exact.ledger.filter((record) => record.match.state === 'EXACT_MATCH').length, 2);
assert.equal(exact.ledger.filter((record) => record.match.state === 'APPROVED_EQUIVALENT').length, 2);
assert.ok(exact.ledger.every((record) => record.match.passingCounterpartSubjectId));
const zoned = await qualifyComponents({
  reference, actual, identityPolicy: policy(), toleranceProfile,
  zoneResolver: ({ branch: currentBranch }) => currentBranch.attributes.NAME.startsWith('/LINE') ? 'ZONE-LINE' : null,
});
assert.ok(zoned.ledger.every((record) => record.subjectLocator.zoneId === 'ZONE-LINE'));

const reordered = await qualifyComponents({
  reference: branch('/LINE/B1', [...reference[0].children].reverse()),
  actual: branch('/LINE/B1', [...actual[0].children].reverse()),
  identityPolicy: policy(), toleranceProfile,
});
assert.equal(canonicalJson(exact), canonicalJson(reordered), 'qualification evidence depends on input order');

const duplicateReference = branch('/LINE/B1', [fitting('FLAN', '=DUP'), fitting('FLAN', '=DUP')]);
const duplicateActual = branch('/LINE/B1', [fitting('FLAN', '=DUP')]);
const duplicate = await qualifyComponents({ reference: duplicateReference, actual: duplicateActual, identityPolicy: policy(), toleranceProfile });
assert.equal(duplicate.summary.componentStatus, 'BLOCKED');
assert.ok(duplicate.inventory.referenceCollisionGroupCount >= 1);
assert.equal(duplicate.ledger.filter((record) => record.match.state === 'AMBIGUOUS_MATCH').length, 3);
assert.equal(duplicate.collisionGroups[0].resolution, 'UNRESOLVED');

const collisionResolvingPolicy = structuredClone(policy());
collisionResolvingPolicy.identityRules = [
  collisionResolvingPolicy.identityRules[0],
  collisionResolvingPolicy.identityRules[1],
  {
    ruleId: 'reference-name-branch-family', rank: 3, kind: 'APPROVED_COMPOSITE',
    applicableFamilies: ['FLANGE'],
    requiredFields: ['reference', 'name', 'branchId', 'family'],
    normalizationRuleIds: ['trim', 'normalize-slashes'],
    scope: 'BRANCH', uniquenessRequirement: 'COLLISION_PRESERVING', passing: true,
  },
  { ...collisionResolvingPolicy.identityRules[2], rank: 4 },
  { ...collisionResolvingPolicy.identityRules[3], rank: 5 },
];
const resolvedCollision = await qualifyComponents({
  reference: branch('/LINE/B1', [
    fitting('FLAN', '=SAME', { extra: { NAME: 'FLANGE-A' } }),
    fitting('FLAN', '=SAME', { extra: { NAME: 'FLANGE-B' } }),
  ]),
  actual: branch('/LINE/B1', [
    fitting('FLAN', '=SAME', { extra: { NAME: 'FLANGE-B' } }),
    fitting('FLAN', '=SAME', { extra: { NAME: 'FLANGE-A' } }),
  ]),
  identityPolicy: collisionResolvingPolicy,
  toleranceProfile,
});
assert.equal(resolvedCollision.summary.componentStatus, 'PASS');
assert.ok(resolvedCollision.collisionGroups.some((group) => group.resolution === 'RESOLVED_BY_APPROVED_RULE'));
assert.equal(new Set(
  resolvedCollision.ledger.map((record) => record.match.passingCounterpartSubjectId),
).size, 4);

const wrongFamily = await qualifyComponents({
  reference: branch('/LINE/B1', [fitting('FLAN', '=TYPE')]),
  actual: branch('/LINE/B1', [fitting('VALV', '=TYPE')]),
  identityPolicy: policy(), toleranceProfile,
});
assert.ok(wrongFamily.ledger.every((record) => record.match.state === 'ATTRIBUTE_MISMATCH'));
assert.ok(wrongFamily.ledger.every((record) => record.mismatchCodes.includes('FAMILY_MISMATCH')));

const wrongBore = await qualifyComponents({
  reference: branch('/LINE/B1', [fitting('FLAN', '=F1', { abore: '100mm' })]),
  actual: branch('/LINE/B1', [fitting('FLAN', '=F1', { abore: '80mm' })]),
  identityPolicy: policy(), toleranceProfile,
});
assert.equal(wrongBore.summary.componentStatus, 'FAIL');
assert.ok(wrongBore.ledger.every((record) => record.match.state === 'ATTRIBUTE_MISMATCH'));
assert.ok(wrongBore.ledger.every((record) => record.mismatchCodes.includes('BOREA_MISMATCH')));

const shiftedEndpoint = await qualifyComponents({
  reference: branch('/LINE/B1', [fitting('VALV', '=V1')]),
  actual: branch('/LINE/B1', [fitting('VALV', '=V1', { lpos: point(100.1, 0, 0) })]),
  identityPolicy: policy(), toleranceProfile,
});
assert.ok(shiftedEndpoint.ledger.every((record) => record.match.state === 'GEOMETRY_MISMATCH'));

const unmatched = await qualifyComponents({
  reference: branch('/LINE/B1', [fitting('GASK', '=G1')]),
  actual: branch('/LINE/B1', [fitting('GASK', '=G2')]),
  identityPolicy: policy(), toleranceProfile,
});
assert.equal(unmatched.ledger.find((record) => record.side === 'REFERENCE').match.state, 'MISSING_ACTUAL');
assert.equal(unmatched.ledger.find((record) => record.side === 'ACTUAL').match.state, 'UNEXPECTED_ACTUAL');
assert.ok(unmatched.ledger.every((record) => record.match.passingCounterpartSubjectId === null));

const spatialOnly = await qualifyComponents({
  reference: branch('/LINE/B1', [fitting('FLAN', '=LEFT')]),
  actual: branch('/LINE/B1', [fitting('FLAN', '=RIGHT')]),
  identityPolicy: policy(), toleranceProfile,
});
assert.ok(spatialOnly.ledger.every((record) => !['EXACT_MATCH', 'APPROVED_EQUIVALENT'].includes(record.match.state)));
assert.ok(spatialOnly.ledger.every((record) => record.identityEvidence.candidateKeys.some((item) => item.ruleId === 'spatial-diagnostic')));

const missingTolerance = await qualifyComponents({
  reference: branch('/LINE/B1', [fitting('FLAN', '=T1')]),
  actual: branch('/LINE/B1', [fitting('FLAN', '=T1')]),
  identityPolicy: policy(), toleranceProfile: null,
});
assert.equal(missingTolerance.summary.componentStatus, 'BLOCKED');
assert.ok(missingTolerance.ledger.every((record) => record.match.state === 'BLOCKED_IDENTITY'));
assert.ok(missingTolerance.ledger.every((record) => record.mismatchCodes.includes('TOLERANCE_RULE_UNAVAILABLE')));

const observationalDifference = await qualifyComponents({
  reference: branch('/LINE/B1', [fitting('FLAN', '=OBS', { orientation: 'Y is N and Z is U' })]),
  actual: branch('/LINE/B1', [fitting('FLAN', '=OBS', { orientation: 'Y is S and Z is U' })]),
  identityPolicy: policy(), toleranceProfile,
});
assert.equal(observationalDifference.summary.componentStatus, 'PASS_WITH_OBSERVATIONS');
assert.ok(observationalDifference.ledger.every((record) => (
  record.comparisons.find((item) => item.fieldId === 'orientation').outcome === 'OBSERVATION'
)));

const unknown = await qualifyComponents({
  reference: branch('/LINE/B1', [{ name: 'MYSTERY 1', type: 'MYST', attributes: { TYPE: 'MYST', REF: '=M1' } }]),
  actual: branch('/LINE/B1', [{ name: 'MYSTERY 1', type: 'MYST', attributes: { TYPE: 'MYST', REF: '=M1' } }]),
  identityPolicy: policy(), toleranceProfile,
});
assert.equal(unknown.summary.componentStatus, 'BLOCKED');
assert.deepEqual(unknown.inventory.unknownReferenceTypes, ['MYST']);
assert.ok(unknown.ledger.every((record) => record.match.state === 'BLOCKED_IDENTITY'));

const subjects = await buildComponentSubjects(reference, policy(), 'REFERENCE');
assert.equal(subjects.length, 2);
assert.ok(subjects.every((subject) => /^[RA]-COMP-[0-9a-f]{24}-\d+$/.test(subject.subjectId)));
assert.ok(subjects.every((subject) => /^[0-9a-f]{64}$/.test(subject.canonicalSubjectPayloadSha256)));

const identityPolicySchema = JSON.parse(await readFile(
  new URL('../../contracts/fbx/fbx-component-identity-policy.v1.schema.json', import.meta.url), 'utf8',
));
const componentReportSchema = JSON.parse(await readFile(
  new URL('../../contracts/fbx/fbx-component-benchmark-report.v1.schema.json', import.meta.url), 'utf8',
));
assert.deepEqual(validateSchema(identityPolicySchema, policy()), []);
assert.deepEqual(validateSchema(componentReportSchema, exact), []);
assert.notDeepEqual(validateSchema(identityPolicySchema, { ...policy(), unexpected: true }), []);
assert.notDeepEqual(validateSchema(componentReportSchema, { ...exact, unexpected: true }), []);

console.log('test-component-benchmark: PASS');
