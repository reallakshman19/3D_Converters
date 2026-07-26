import assert from 'node:assert/strict';
import { validateSupportBenchmark } from '../../tabs/model-converters/converters/fbx/benchmark/support-validator.js';
import {
  benchmarkFixture, explicitHostResolver, identityPolicy, normalizers, propertyRules, supportNode, toleranceProfile,
} from './support-benchmark-fixtures.mjs';

function validate(actual, options = {}) {
  return validateSupportBenchmark({
    reference: benchmarkFixture(),
    actual,
    identityPolicy: options.identityPolicy || identityPolicy(),
    toleranceProfile,
    propertyRules,
    normalizers,
    orientationComparator: options.orientationComparator,
    hostResolver: options.hostResolver || explicitHostResolver,
    hostRequired: options.hostRequired ?? true,
  });
}

{
  const actual = benchmarkFixture();
  actual[0].children.shift();
  const report = validate(actual);
  assert.equal(report.summary.countsByMatchState.MISSING_ACTUAL, 1);
  assert.equal(report.summary.status, 'FAIL');
}

{
  const actual = benchmarkFixture();
  actual[0].children.push(supportNode({
    name: '/S-999.1', ref: '=999/1', tag: 'S-999', owner: '/SITE/PIPE/B1', supportClass: 'REST', pos: { x: 9, y: 9, z: 9 },
  }));
  const report = validate(actual);
  assert.equal(report.summary.countsByMatchState.UNEXPECTED_ACTUAL, 1);
}

{
  const actual = benchmarkFixture();
  actual[0].children[0].attributes.REF = '=100/2';
  actual[0].children[0].attributes.NAME = '/S-002.1';
  const report = validate(actual);
  assert.ok(report.summary.countsByMatchState.DUPLICATE_IDENTITY >= 2);
  assert.equal(report.coverage.invariantsPassed, true);
}

{
  const actual = benchmarkFixture();
  actual[0].children[0].attributes.SUPPORT_TYPE = 'GUIDE';
  actual[0].children[0].attributes.SUPPORT_KIND = 'GUIDE';
  actual[0].children[0].attributes.SUPPORT_MAPPER_KIND = 'GUIDE';
  const report = validate(actual);
  assert.equal(report.summary.countsByMatchState.TYPE_MISMATCH, 1);
}

{
  const actual = benchmarkFixture();
  actual[0].children[0].attributes.POS.x += 0.02;
  const report = validate(actual);
  assert.equal(report.summary.countsByMatchState.POSITION_MISMATCH, 1);
}

{
  const actual = benchmarkFixture();
  actual[0].children[0].attributes.ORI = 'Y is S and Z is U';
  const report = validate(actual);
  assert.equal(report.summary.countsByMatchState.BLOCKED, 1);
  assert.equal(report.summary.status, 'BLOCKED');
}

{
  const actual = benchmarkFixture();
  actual[0].children[0].attributes.NODEGAP = '2';
  const report = validate(actual);
  assert.equal(report.summary.countsByMatchState.PROPERTY_MISMATCH, 1);
}

{
  const reference = benchmarkFixture();
  const actual = benchmarkFixture();
  for (const dataset of [reference, actual]) {
    dataset[0].children[0].attributes.SUPPORT_TYPE = '';
    dataset[0].children[0].attributes.SUPPORT_KIND = '';
    dataset[0].children[0].attributes.SUPPORT_MAPPER_KIND = '';
  }
  const blocked = validateSupportBenchmark({
    reference,
    actual,
    identityPolicy: identityPolicy(),
    toleranceProfile,
    propertyRules,
    normalizers,
  });
  assert.equal(blocked.summary.countsByMatchState.BLOCKED, 1);
  const allowed = validateSupportBenchmark({
    reference,
    actual,
    identityPolicy: identityPolicy({ allowUnclassified: true }),
    toleranceProfile,
    propertyRules,
    normalizers,
  });
  assert.equal(allowed.summary.countsByMatchState.EXACT_MATCH, 3);
}

{
  const actual = benchmarkFixture();
  actual[0].children[0].attributes.HOST_REF = 'PIPE-999';
  const report = validate(actual);
  assert.equal(report.summary.countsByMatchState.HOST_MISMATCH, 1);
}

{
  const actual = benchmarkFixture();
  delete actual[0].children[0].attributes.HOST_REF;
  const report = validate(actual);
  assert.equal(report.summary.countsByMatchState.ORPHAN_SUPPORT, 1);
}

{
  const policy = identityPolicy();
  policy.identityStages[0].authority = 'APPROVED_EQUIVALENT';
  assert.throws(
    () => validate(benchmarkFixture(), { identityPolicy: policy }),
    /approvedEquivalentRuleId is required/,
  );
}

{
  const reference = benchmarkFixture();
  const actual = benchmarkFixture();
  actual[0].children[0].attributes.REF = '=CHANGED';
  actual[0].children[0].attributes.NAME = '/CHANGED';
  const policy = identityPolicy();
  policy.identityStages[2].authority = 'DIAGNOSTIC_ONLY';
  const report = validateSupportBenchmark({
    reference,
    actual,
    identityPolicy: policy,
    toleranceProfile,
    propertyRules,
    normalizers,
    hostResolver: explicitHostResolver,
    hostRequired: true,
  });
  const missing = report.ledgerEntries.find((entry) => entry.matchState === 'MISSING_ACTUAL');
  const unexpected = report.ledgerEntries.find((entry) => entry.matchState === 'UNEXPECTED_ACTUAL');
  assert.equal(missing.identityResult.state, 'CANDIDATE_ONLY');
  assert.equal(unexpected.identityResult.state, 'CANDIDATE_ONLY');
  assert.equal(missing.identityResult.candidateRecordIds.length, 1);
  assert.equal(unexpected.identityResult.candidateRecordIds.length, 1);
}

{
  const actual = benchmarkFixture();
  actual[0].children[0].attributes.ORI = 'equivalent orientation';
  const report = validate(actual, {
    orientationComparator: () => ({ authorityId: 'TEST_ORIENTATION_POLICY', angularResidual: 0.25 }),
  });
  assert.equal(report.summary.countsByMatchState.EXACT_MATCH, 3);
}

{
  const actual = benchmarkFixture();
  actual[0].children[0].attributes.ORI = 'different orientation';
  const report = validate(actual, {
    orientationComparator: () => ({ authorityId: 'TEST_ORIENTATION_POLICY', angularResidual: 0.75 }),
  });
  assert.equal(report.summary.countsByMatchState.ORIENTATION_MISMATCH, 1);
}

{
  const actual = benchmarkFixture();
  const report = validate(actual, {
    hostResolver: ({ record }) => ({ state: 'RESOLVED', hostIdentity: record.attributes.HOST_REF }),
  });
  assert.equal(report.summary.countsByMatchState.BLOCKED, 3);
}

console.log('test-support-benchmark-failures: PASS');
