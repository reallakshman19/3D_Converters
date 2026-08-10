const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

function loadExports(relPath, exportNames) {
  const file = path.join(root, relPath);
  let source = fs.readFileSync(file, 'utf8')
    .replace(/^import\s+[\s\S]*?;\s*$/gm, '')
    .replace(/\bexport\s+(?=function|const|let|class)/g, '');
  source += `\n;globalThis.__x003Exports = { ${exportNames.join(', ')} };`;
  const context = vm.createContext({ console, encodeURIComponent });
  new vm.Script(source, { filename: file }).runInContext(context);
  return context.__x003Exports;
}

const lifecycle = loadExports('converters/xml-cii2019-core/weight-review-lifecycle.js', [
  'persistXmlCiiRigidMatch1Config',
  'prepareXmlCiiRunWeightLifecycle',
]);
const identity = loadExports('converters/xml-cii2019-core/weight-component-identity.js', [
  'buildXmlCiiPhysicalWeightIdentity',
  'decorateXmlCiiWeightReviewRows',
  'dedupeXmlCiiPhysicalWeightRows',
  'migrateXmlCiiWeightDecisionMap',
  'resolveXmlCiiWeightDecision',
]);
const conservation = loadExports('converters/xml-cii2019-core/split-rigid-weight-propagation.js', [
  'buildXmlCiiSplitRigidWeightConservation',
]);

const match1 = lifecycle.persistXmlCiiRigidMatch1Config({
  overrides: {
    rigidWeight: {
      '/B1::480': 120.734,
      '/B2::480': 15,
      '480': 999,
    },
  },
});
assert.strictEqual(match1.overrides.rigidWeight, undefined, 'RigidMatch1 persistence must not leave a second authority bucket behind.');
assert.strictEqual(match1.overrides.rigidWeightMatch1['/B1::480'], 120.734);
assert.strictEqual(match1.overrides.rigidWeightMatch1['/B2::480'], 15);
assert(!Object.prototype.hasOwnProperty.call(match1.overrides.rigidWeightMatch1, '480'), 'Plain NodeNumber keys must be rejected.');
assert(match1.weightReviewLifecycle.rejectedUnscopedKeys.some((row) => row.key === '480'));

let runConfig = lifecycle.prepareXmlCiiRunWeightLifecycle(match1);
assert.strictEqual(runConfig.weightReviewLifecycle.effectiveAuthority, 'RigidMatch1');
assert.strictEqual(runConfig.overrides.rigidWeight['/B1::480'], 120.734);

// A stale legacy rigidWeight value is never promoted to Final. It is demoted
// to Match1-compatible history unless an explicit rigidWeightFinal exists.
runConfig = lifecycle.prepareXmlCiiRunWeightLifecycle({
  overrides: { rigidWeight: { '/B1::480': 15 } },
});
assert.strictEqual(runConfig.weightReviewLifecycle.effectiveAuthority, 'RigidMatch1');
assert.strictEqual(runConfig.weightReviewLifecycle.legacyRigidWeightDemotedToMatch1, true);
assert.strictEqual(runConfig.overrides.rigidWeightFinal['/B1::480'], undefined);
assert.strictEqual(runConfig.overrides.rigidWeightMatch1['/B1::480'], 15);

const physicalKey = 'WPC1::SRC-A::%2FB1::REF%3A134234934%2FTEST';
runConfig = lifecycle.prepareXmlCiiRunWeightLifecycle({
  overrides: {
    rigidWeightMatch1: { [physicalKey]: 120.734 },
    rigidWeightFinal: { [physicalKey]: 15 },
    rigidWeight: { '/B1::480': 999 },
  },
});
assert.strictEqual(runConfig.weightReviewLifecycle.effectiveAuthority, 'Rigidmatch2');
assert.strictEqual(runConfig.overrides.rigidWeightFinal[physicalKey], 15);
assert.strictEqual(runConfig.overrides.rigidWeight[physicalKey], 15);
assert.strictEqual(runConfig.overrides.rigidWeightMatch1[physicalKey], 120.734, 'Final review must not rewrite RigidMatch1 history.');

const splitRows = [
  { key: '/B1::478', branchName: '/B1', nodeNumber: '478', nodeOrdinal: 10, endpoint: '1', componentType: 'FLAN', componentRefNo: '=134234934/TEST', position: '1 2 3' },
  { key: '/B1::480', branchName: '/B1', nodeNumber: '480', nodeOrdinal: 11, endpoint: '2', componentType: 'RIGID', componentRefNo: '=134234934/TEST', position: '4 5 6' },
];
const identified = identity.decorateXmlCiiWeightReviewRows(splitRows, { sourceId: 'SRC-A' });
assert.strictEqual(identified[0].key, identified[1].key, 'Split children of one physical component must share one decision key.');
assert.notStrictEqual(identified[0].componentOccurrenceId, identified[1].componentOccurrenceId, 'Child occurrences remain independently traceable.');
assert(identified[0].key.startsWith('WPC1::SRC-A::'));
assert.strictEqual(identity.dedupeXmlCiiPhysicalWeightRows(identified).length, 1, 'Final review must show one row per physical component.');

const otherSource = identity.buildXmlCiiPhysicalWeightIdentity(splitRows[1], { sourceId: 'SRC-B' });
assert.notStrictEqual(otherSource.decisionKey, identified[1].decisionKey, 'Mode A sources must never collide in persisted weight authority.');
const otherBranch = identity.buildXmlCiiPhysicalWeightIdentity({ ...splitRows[1], branchName: '/B2' }, { sourceId: 'SRC-A' });
assert.notStrictEqual(otherBranch.decisionKey, identified[1].decisionKey, 'Same engineering node/component ref in another branch must not collide.');

const migrated = identity.migrateXmlCiiWeightDecisionMap({ '/B1::480': 120.734 }, identified, { sourceId: 'SRC-A' });
assert.strictEqual(Object.keys(migrated.accepted).length, 1);
assert.strictEqual(migrated.accepted[identified[1].decisionKey], 120.734);
assert.strictEqual(migrated.migrations[0].fromKey, '/B1::480');
const resolved = identity.resolveXmlCiiWeightDecision(migrated.accepted, identified[0], { sourceId: 'SRC-A' });
assert.strictEqual(resolved.weight, 120.734);
assert.strictEqual(resolved.legacy, false);

function row({ weight, endpoint, rigid, nodeNumber, componentType = 'RIGID', sourceIndex = 0 }) {
  return { ref: '134234934/TEST', branchName: '/B1', componentRefNo: '=134234934/TEST', componentType, weight, endpoint, rigid, nodeNumber, sourceIndex };
}

let ledger = conservation.buildXmlCiiSplitRigidWeightConservation([
  row({ weight: 0, endpoint: 1, rigid: 1, nodeNumber: 478, componentType: 'FLAN', sourceIndex: 0 }),
  row({ weight: 120.734, endpoint: 2, rigid: 2, nodeNumber: 480, sourceIndex: 1 }),
]);
assert.strictEqual(ledger.status, 'conserved-single-owner');
assert.strictEqual(ledger.selectedPhysicalMassKg, 120.734);
assert.strictEqual(ledger.childMassSumKg, 120.734);

ledger = conservation.buildXmlCiiSplitRigidWeightConservation([
  row({ weight: 120.734, endpoint: 1, rigid: 1, nodeNumber: 478, componentType: 'FLAN', sourceIndex: 0 }),
  row({ weight: 120.734, endpoint: 2, rigid: 2, nodeNumber: 480, sourceIndex: 1 }),
]);
assert.strictEqual(ledger.status, 'legacy-duplicate-copies-collapsed');
assert.strictEqual(ledger.childMassSumKg, 241.468);
assert.strictEqual(ledger.correctedChildMassSumKg, 120.734);
assert.strictEqual(ledger.owner.nodeNumber, 480);
assert.strictEqual(ledger.corrections.length, 1);

ledger = conservation.buildXmlCiiSplitRigidWeightConservation([
  row({ weight: 15, endpoint: 1, rigid: 1, nodeNumber: 478, componentType: 'FLAN', sourceIndex: 0 }),
  row({ weight: 120.734, endpoint: 2, rigid: 2, nodeNumber: 480, sourceIndex: 1 }),
]);
assert.strictEqual(ledger.status, 'review-required-different-positive-masses');

const paritySource = fs.readFileSync(path.join(root, 'tabs/xml-cii-2019-standalone/xml-cii-standalone-run-parity.js'), 'utf8');
assert(paritySource.includes('persistXmlCiiRigidMatch1Config'), 'Parent Weight Match binding must persist RigidMatch1 separately.');
assert(paritySource.includes('rigidWeight: { ...match1 }'), 'Weight Match may use only a transient legacy mirror.');

const finalAuthoritySource = fs.readFileSync(path.join(root, 'converters/xml-cii2019-core/final-weight-review-authority.js'), 'utf8');
assert(finalAuthoritySource.includes('collectXmlCiiFinalWeightReviewRows'), 'Final review needs a dedicated all-component authority collector.');
assert(finalAuthoritySource.includes('sourceIdentityRows'), 'Final authority must union source identity rows with candidate-rich rows.');
assert(!finalAuthoritySource.includes('lengthMm <= 6'), 'Short/zero-length physical components must not bypass Final review.');
assert(!finalAuthoritySource.includes('endpointEligible'), 'Endpoint-1-only components must not bypass Final review.');

const finalReviewSource = fs.readFileSync(path.join(root, 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-run-workflow-atta-default.js'), 'utf8');
assert(finalReviewSource.includes('collectXmlCiiFinalWeightReviewRows'), 'Final review must enumerate every eligible physical component, not only candidate-rich or zero rows.');
assert(!finalReviewSource.includes('collectXmlCiiZeroRigidWeightIssues'), 'Mapped/positive Match1 values must not bypass Final review.');
assert(finalReviewSource.includes('rigidWeightFinal'), 'Final review must write its own authority bucket.');
assert(finalReviewSource.includes("finalReviewDisposition: 'explicit-final-accepted'"));
assert(finalReviewSource.includes("return false;\n  }\n}"), 'Final-review execution failures must block the run.');
assert(finalReviewSource.includes("key.startsWith('WPC1::')"), 'Final acceptance must use physical-component decision keys.');
assert(finalReviewSource.includes('Source XML ${source} kg · Final confirmation required'), 'Positive source XML mass must be visible evidence, not a bypass.');

const adapterSource = fs.readFileSync(path.join(root, 'tabs/xml-cii-2019-standalone/xml-cii-workflow-ui-adapter.js'), 'utf8');
assert(adapterSource.includes('prepareXmlCiiRunWeightLifecycle(config)'), 'Run job must materialize Final > Match1 authority.');
assert(adapterSource.includes('materializeXmlCiiLegacyWeightCompatibility'), 'Legacy branch/node keys may exist only as run-boundary compatibility materialization.');

const invocationSource = fs.readFileSync(path.join(root, 'converters/xml-cii-2019-standalone/invocation-builder.js'), 'utf8');
assert(invocationSource.includes("argv.push('--weight-scale', '10')"), 'X003 must retain the explicit kg→N compatibility scale 10.');

assert.strictEqual(120.734 * 10, 1207.34);
assert.strictEqual(75 * 10, 750);
assert.strictEqual(128.89501 * 10, 1288.9501);
console.log('XML CII X003 physical weight-authority regression passed.');
