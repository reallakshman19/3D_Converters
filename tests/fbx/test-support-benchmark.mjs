import assert from 'node:assert/strict';
import { canonicalJson } from '../../tabs/model-converters/converters/fbx/canonical-json.js';
import { collectSupportRecords, buildSupportInventory } from '../../tabs/model-converters/converters/fbx/benchmark/support-records.js';
import { validateSupportBenchmark } from '../../tabs/model-converters/converters/fbx/benchmark/support-validator.js';
import {
  benchmarkFixture, explicitHostResolver, identityPolicy, normalizers, propertyRules, toleranceProfile,
} from './support-benchmark-fixtures.mjs';

const reference = benchmarkFixture();
const records = collectSupportRecords(reference);
assert.equal(records.length, 3);
const inventory = buildSupportInventory(records);
assert.deepEqual(inventory.countsByClass, { GUIDE: 1, REST: 2 });
assert.equal(inventory.duplicateTagGroups.length, 1);
assert.equal(inventory.duplicateTagGroups[0].supportTag, 'SHARED');

const actual = structuredClone(reference);
const report = validateSupportBenchmark({
  reference,
  actual,
  identityPolicy: identityPolicy(),
  toleranceProfile,
  propertyRules,
  normalizers,
  hostResolver: explicitHostResolver,
  hostRequired: true,
});
assert.equal(report.summary.status, 'PASS');
assert.deepEqual(report.summary.countsByMatchState, { EXACT_MATCH: 3 });
assert.equal(report.coverage.invariantsPassed, true);

const reorderedReference = structuredClone(reference);
reorderedReference[0].children.reverse();
const reorderedActual = structuredClone(actual);
reorderedActual[0].children.reverse();
const reordered = validateSupportBenchmark({
  reference: reorderedReference,
  actual: reorderedActual,
  identityPolicy: identityPolicy(),
  toleranceProfile,
  propertyRules,
  normalizers,
  hostResolver: explicitHostResolver,
  hostRequired: true,
});
assert.equal(canonicalJson(reordered), canonicalJson(report), 'support evidence depends on input ordering');

console.log('test-support-benchmark: PASS');
