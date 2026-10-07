import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { resolveBranchLineKeySuggestion } from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-branch-line-map-actions.js';

// Same-designator ambiguity must remain fail-closed with all authoritative loaded candidates.
const ambiguous = resolveBranchLineKeySuggestion(
  '/AREA-P4110099/B1',
  ['P4110001', 'P4110003'],
);
assert.equal(ambiguous.status, 'ambiguous');
assert.equal(ambiguous.key, '');
assert.deepEqual(ambiguous.candidates, ['P4110001', 'P4110003']);

// Cross-designator near-family evidence must also remain fail-closed, but unlike a
// generic miss it must explain that the plausible loaded family would require
// changing the branch designator.
const blocked = resolveBranchLineKeySuggestion(
  '/AREA-B4110004/B1',
  ['P4110001', 'P4110003'],
);
assert.equal(blocked.status, 'blocked');
assert.equal(blocked.key, '');
assert.equal(blocked.method, 'cross-designator-family');
assert.equal(blocked.reason, 'DESIGNATOR_CHANGE_NOT_AUTHORIZED');
assert.deepEqual(blocked.candidates, ['P4110001', 'P4110003']);
assert.ok(Array.isArray(blocked.evidence) && blocked.evidence.length > 0);

// The UI must show the blocked reason/candidates while preserving no-assignment.
const actionsSource = await readFile(
  new URL('../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-branch-line-map-actions.js', import.meta.url),
  'utf8',
);
assert.match(actionsSource, /DESIGNATOR_CHANGE_NOT_AUTHORIZED/);
assert.match(actionsSource, /Cross-designator/);
assert.match(actionsSource, /left for review/);

console.log('test-xml-cii-branch-line-ambiguity-safety-942: PASS');
