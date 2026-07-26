import assert from 'node:assert/strict';
import { validateSupportBenchmark } from '../../tabs/model-converters/converters/fbx/benchmark/support-validator.js';
import {
  benchmarkFixture, identityPolicy, normalizers, propertyRules, supportNode, toleranceProfile,
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

console.log('test-support-benchmark-failures: PASS');
