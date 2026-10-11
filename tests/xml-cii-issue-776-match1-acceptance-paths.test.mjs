import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const renderer = await readFile(new URL('../tabs/model-converters/converters/xmltocii2019_helper/weight-match-renderer.js', import.meta.url), 'utf8');
const standalone = await readFile(new URL('../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-weight-match-v2.js', import.meta.url), 'utf8');
const actions = await readFile(new URL('../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-mode-a-weight-actions.js', import.meta.url), 'utf8');
const bulk = await readFile(new URL('../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-mode-a-bulk-weight.js', import.meta.url), 'utf8');

assert.match(renderer, /buildXmlCiiRigidWeightMatch1Provenance/);
assert.match(renderer, /rigidWeightProposalMeta/);
assert.match(renderer, /data-wm-row-index/);
assert.match(renderer, /buildXmlCiiValidatedRigidWeightLegacyView/);
assert.match(standalone, /withXmlCiiRigidWeightMatch1\(clean, \{ \.\.\.candidates, \.\.\.manual \}, proposalMeta\)/);
assert.match(standalone, /proposalMeta\[key\]\?\.acceptanceMethod === 'manual'/);
assert.doesNotMatch(standalone, /withXmlCiiRigidWeightFinal\s*\(/, 'Match-1 must not automatically commit Final Match-2');
assert.match(renderer, /input\.dataset\.wmSelectionOrigin === 'candidate' \? 'candidate' : 'manual'/);
assert.match(actions, /buildXmlCiiRigidWeightMatch1Provenance\(change, config/);
assert.match(actions, /rigidWeightMatch1Provenance/);
for (const field of ['componentRefNo','boreMm','rating','lengthMm','elementLengthSource']) {
  assert.match(bulk, new RegExp(field));
}

console.log('Issue #776 Match-1 acceptance paths carry provenance.');
