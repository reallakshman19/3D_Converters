import test from 'node:test';
import assert from 'node:assert/strict';
import {
  engineeringNumber, parseCiiEngineeringFields, ciiBranchFieldMatches,
  ciiNodeWeightMatches
} from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-propagation-proof.mjs';

const branch = '/GLRD-1000-6"-P4110001-93833-01/B6';
const other = '/GLRD-1000-2"-P4110003-93833-01/B2';
const row = (...entries) => entries.join('  ');
function element(from, to, b, p = 0, t = 0, density = 0, rigidPtr = 0) {
  return [
    row(from.toFixed(5), to.toFixed(5), 0, 0, 0, 168.3),
    row(7.112, 0, 0, t, t, t),
    row(0, 0, 0, 0, 0, 0),
    row(p, 0, 0, 0, 0, 0),
    row(0, 0, 0, 0, 0, 0),
    row(0, density, 0, 0, 0, 0),
    row(0, 0, 0, 0, 0, 0),
    row(0, 0, 0, 0, 0, 0),
    row(0, 0, 0, 0, 0),
    ' '.repeat(24) + '0',
    '1 ' + b,
    '0',
    row(0, rigidPtr, 0, 0, 0, 0),
    row(0, 0, 0, 0, 0, 0),
    row(0, 0, 0),
  ];
}
const sample = [
  '#$ VERSION', '5', '#$ CONTROL', '2 0 0 0 0 0', '#$ ELEMENTS',
  ...element(10, 20, branch, 50, 145, 900, 1),
  ...element(30, 40, other, 0, 0, 0, 0),
  '#$ RIGID', row(368, 125),
].join('\n');

test('absence and temp sentinel never convert to engineering zero', () => {
  for (const value of [null, undefined, '', '—', '-', 'n/a', 'hello']) {
    assert.equal(engineeringNumber(value), null);
  }
  assert.equal(engineeringNumber(0), 0);
  assert.equal(engineeringNumber('-100000', true), null);
});
test('CII identity and fixed row slots: unrelated zeros are not matches', () => {
  const parsed = parseCiiEngineeringFields(sample);
  assert.equal(parsed.elements.length, 2);
  assert.equal(ciiBranchFieldMatches(parsed, branch, 'p1', 50), true);
  assert.equal(ciiBranchFieldMatches(parsed, branch, 'p1', 0), false);
  assert.equal(ciiBranchFieldMatches(parsed, branch, 't1', 145), true);
  assert.equal(ciiBranchFieldMatches(parsed, branch, 'density', 900), true);
  assert.equal(ciiBranchFieldMatches(parsed, branch, 'p1', '—'), null);
  assert.equal(ciiBranchFieldMatches(parsed, other, 'p1', 0), true);
});
test('weight requires owning element RIGID pointer', () => {
  const parsed = parseCiiEngineeringFields(sample);
  assert.equal(ciiNodeWeightMatches(parsed, branch, 20, 12.5), true);
  assert.equal(ciiNodeWeightMatches(parsed, branch, 20, 0), false);
  assert.equal(ciiNodeWeightMatches(parsed, other, 40, 12.5), false);
  assert.equal(ciiNodeWeightMatches(parsed, branch, -1, 12.5), null);
});
test('malformed output blocks instead of globally searching CII bytes', () => {
  assert.throws(() => parseCiiEngineeringFields(sample.replace('#$ ELEMENTS', '#$ GARBLED')),
    /CII_ELEMENT_BLOCK_COUNT_INVALID/);
  assert.throws(() => parseCiiEngineeringFields(sample.replace('2 0 0 0 0 0', '3 0 0 0 0 0')),
    /CII_CONTROL_ELEMENT_COUNT_MISMATCH/);
});
