import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { decideMissingStagedRestRestraint } from '../converters/xml-cii2019-core/staged-restraint-fallback-policy.js';

test('ANCI missing restraint adopts staged REST', () => {
  const result = decideMissingStagedRestRestraint({ componentType: 'ANCI', stagedSupportTypes: ['REST'] });
  assert.equal(result.apply, true);
  assert.equal(result.reason, 'missing-restraint-with-staged-rest');
});

test('ledger REST also qualifies ANCI missing restraint', () => {
  assert.equal(decideMissingStagedRestRestraint({ componentType: 'ANCI', ledgerSupportTypes: ['REST'] }).apply, true);
});

test('existing uploaded restraint is preserved', () => {
  const result = decideMissingStagedRestRestraint({ componentType: 'ANCI', hasExistingRestraint: true, stagedSupportTypes: ['REST'] });
  assert.equal(result.apply, false);
  assert.equal(result.reason, 'existing-restraint-preserved');
});

test('non-support carrier is not mutated', () => {
  assert.equal(decideMissingStagedRestRestraint({ componentType: 'PIPE', stagedSupportTypes: ['REST'] }).apply, false);
});

test('non-REST staged support does not create REST', () => {
  assert.equal(decideMissingStagedRestRestraint({ componentType: 'ANCI', stagedSupportTypes: ['GUIDE'] }).apply, false);
});

test('JSON restraint disable remains authoritative', () => {
  const result = decideMissingStagedRestRestraint({ componentType: 'ANCI', stagedSupportTypes: ['REST'], jsonRestraintsEnabled: false });
  assert.equal(result.apply, false);
  assert.equal(result.reason, 'json-restraints-disabled');
});

test('standalone enrichment integrates ledger source paths with shared support mapping', async () => {
  const source = await readFile(new URL('../tabs/xml-cii-2019-standalone/xml-cii-standalone-dtxr-enrichment.js', import.meta.url), 'utf8');
  assert.match(source, /resolveXmlCiiSupportKind/);
  assert.match(source, /sourcePaths/);
  assert.match(source, /restraintEntriesFromSupportKind\('REST'/);
  assert.match(source, /applyXmlRestraints\(document, node, entries, config\)/);
  assert.match(source, /stagedRestRestraintsAdded/);
  assert.match(source, /existing-restraint-preserved/);
});
