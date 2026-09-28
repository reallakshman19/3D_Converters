import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const parity = await readFile(new URL('../tabs/xml-cii-2019-standalone/xml-cii-standalone-run-parity.js', import.meta.url), 'utf8');
const consolidated = await readFile(new URL('../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-rigid-review-mode-a.js', import.meta.url), 'utf8');
const single = await readFile(new URL('../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-run-workflow.js', import.meta.url), 'utf8');
const activeSingle = await readFile(new URL('../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-run-workflow-atta-default.js', import.meta.url), 'utf8');

assert.match(parity, /prepareStandaloneWeightReviewXml/);
assert.match(parity, /applyXmlCiiStagedGeometryAuthority/);
assert.match(consolidated, /await prepareStandaloneWeightReviewXml\(state, effectiveConfig\)/);
assert.match(single, /await prepareStandaloneWeightReviewXml\(state, effectiveConfig\)/);
assert.match(activeSingle, /await prepareStandaloneWeightReviewXml\(state, effectiveConfig\)/);
assert.doesNotMatch(consolidated, /collectXmlCiiZeroRigidWeightIssues\(state\.sourceText/);
assert.doesNotMatch(single, /collectXmlCiiZeroRigidWeightIssues\(state\.sourceText/);
assert.doesNotMatch(activeSingle, /collectXmlCiiZeroRigidWeightIssues\(state\.sourceText/);
assert.match(consolidated, /Flange length-scaled fallback/);
assert.match(single, /Flange length-scaled fallback/);
assert.match(activeSingle, /Flange length-scaled fallback/);
assert.match(consolidated, /confidence\/rank score/);
assert.match(single, /confidence\/rank score/);

console.log('Issue #776 final-review geometry authority regression passed.');
