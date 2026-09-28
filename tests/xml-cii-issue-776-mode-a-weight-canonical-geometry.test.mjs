import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-mode-a-consolidated.js', import.meta.url), 'utf8');

assert.match(source, /prepareStandaloneWeightReviewXml\(entry\.state, config\)/);
assert.match(source, /collector\(\s*prepared\.xmlText,/s);
assert.match(source, /buildXmlCiiValidatedRigidWeightLegacyView\(preparedConfig, basisRows\)/);
assert.match(source, /staleMatch1Count: validated\.validation\.staleCount/);
assert.doesNotMatch(
  source,
  /const sourceRows = collector\(\s*entry\.state\.sourceText \|\| ''/s,
  'Mode-A Weight Match must not rank raw XML geometry',
);

console.log('Issue #776 Mode-A Weight Match uses canonical prepared geometry.');
