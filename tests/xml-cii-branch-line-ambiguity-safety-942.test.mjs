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

const cacheRoot = new URL('../', import.meta.url);
const cacheFiles = [
  ['tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-branch-line-map-panel.js', 'xml-cii-adapted-branch-line-map-actions.js?v=20261007-branch-line-l4-1'],
  ['tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-renderer.js', 'xml-cii-adapted-branch-line-map-panel.js?v=20261007-branch-line-l2-1'],
  ['tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-renderer-v7.js', 'xml-cii-adapted-preview-renderer.js?v=20261007-branch-line-l2-1'],
  ['tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-diagnostics-audit-v7.js', 'xml-cii-adapted-preview-renderer-v7.js?v=20261007-branch-line-l2-1'],
  ['tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-phase-panels-mode-a.js', 'xml-cii-adapted-preview-diagnostics-audit-v7.js?v=20261007-branch-line-l2-1'],
  ['tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-workflow-shell-mode-a-easy-bulk-v6.js', 'xml-cii-adapted-phase-panels-mode-a.js?v=20261007-branch-line-l2-1'],
  ['tabs/xml-cii-2019-standalone-tab.js', 'xml-cii-adapted-workflow-shell-mode-a-easy-bulk-v6.js?v=20261007-branch-line-l4-1'],
];
for (const [path, expected] of cacheFiles) {
  const source = await readFile(new URL(path, cacheRoot), 'utf8');
  assert.equal(source.includes(expected), true, `L2 cache chain missing ${expected} in ${path}`);
}

console.log('test-xml-cii-branch-line-ambiguity-safety-942: PASS');
