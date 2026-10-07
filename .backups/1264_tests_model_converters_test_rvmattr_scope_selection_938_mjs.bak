import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { _filterStagedHierarchyByScope } from '../../tabs/model-converters/converters/stagedjson-xml-helpers.js';

const hierarchy = [
  {
    name: '/SITE-A/ZONE-1/PIPE-1/BRAN-1',
    type: 'BRANCH',
    attributes: { OWNER_SITE: 'SITE-A', OWNER: '/SITE-A/ZONE-1/PIPE-1' },
    children: [],
  },
  {
    name: '/SITE-A/ZONE-1/PIPE-1/BRAN-2',
    type: 'BRANCH',
    attributes: { OWNER_SITE: 'SITE-A', OWNER: '/SITE-A/ZONE-1/PIPE-1' },
    children: [],
  },
  {
    name: '/SITE-B/ZONE-2/PIPE-2/BRAN-3',
    type: 'BRANCH',
    attributes: { OWNER_SITE: 'SITE-B', OWNER: '/SITE-B/ZONE-2/PIPE-2' },
    children: [],
  },
];

function names(scope) {
  return _filterStagedHierarchyByScope(hierarchy, scope).hierarchy.map((row) => row.name);
}

assert.deepEqual(
  names({ wildcard: '', selectedIds: ['branch:/SITE-A/ZONE-1/PIPE-1/BRAN-2'] }),
  ['/SITE-A/ZONE-1/PIPE-1/BRAN-2'],
  'an individually selected branch remains conversion authority even when not rendered',
);
assert.deepEqual(
  names({ wildcard: '', selectedIds: ['owner:SITE-A/ZONE-1/PIPE-1'] }),
  ['/SITE-A/ZONE-1/PIPE-1/BRAN-1', '/SITE-A/ZONE-1/PIPE-1/BRAN-2'],
  'ancestor selection governs all descendant branches',
);
assert.deepEqual(
  names({ wildcard: 'BRAN-3', selectedIds: ['branch:/SITE-A/ZONE-1/PIPE-1/BRAN-2'] }),
  ['/SITE-A/ZONE-1/PIPE-1/BRAN-2', '/SITE-B/ZONE-2/PIPE-2/BRAN-3'],
  'wildcard and checked selection are an OR branch-set authority',
);
assert.deepEqual(
  names({ wildcard: '', selectedIds: [] }),
  hierarchy.map((row) => row.name),
  'cleared selection plus blank wildcard is explicit full scope',
);

const root = new URL('../../', import.meta.url);
const legacy = await readFile(new URL('tabs/model-converters/legacy-adapter.js', root), 'utf8');
const addon = await readFile(new URL('tabs/model-converters/rvmattr-scope-tree-addon.js', root), 'utf8');

assert.match(
  legacy,
  /card\.__rvmScopeSelectedIds\s*=\s*selected/,
  'legacy popup must publish its authoritative selection Set to the progressive tree',
);
assert.match(
  addon,
  /card\.__rvmScopeSelectedIds\s+instanceof\s+Set/,
  'progressive tree must reuse the popup selection Set instead of creating independent custody',
);
assert.doesNotMatch(
  addon,
  /selection:\s*selectionStates\(treeElement\)/,
  'progressive tree must not initialize an independent checkbox-derived selection authority',
);

console.log('test-rvmattr-scope-selection-938: PASS');
