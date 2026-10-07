import assert from 'node:assert/strict';
import * as scopeTree from '../../tabs/model-converters/rvmattr-scope-tree-model.js';

function branch(index) {
  const siteNo = (index % 9) + 1;
  const zoneNo = (index % 27) + 1;
  const site = `SITE-${String(siteNo).padStart(2, '0')}`;
  const zone = `ZONE-${String(zoneNo).padStart(2, '0')}`;
  const pipe = `PIPE-${String(index % 90).padStart(3, '0')}`;
  return {
    name: `/${site}/${zone}/${pipe}/BRAN-${String(index + 1).padStart(4, '0')}`,
    type: 'BRANCH',
    attributes: {
      OWNER_SITE: site,
      OWNER: `/${site}/${zone}/${pipe}`,
    },
    children: [
      { type: 'PIPE', name: `P-${index + 1}`, attributes: { REF: `=P${index + 1}` } },
      { type: 'SUPPORT', attributes: { NAME: `REST-${index + 1}` } },
    ],
  };
}

const hierarchy = Array.from({ length: 810 }, (_, index) => branch(index));
const tree = scopeTree.buildRvmAttributeScopeTree(hierarchy);
const counts = scopeTree.countRvmAttributeScopeTree(tree);

assert.equal(counts.branches, 810);
assert.equal(counts.sites, 9);
assert.equal(typeof scopeTree.buildRvmScopeRenderRows, 'function',
  'large hierarchy needs a pure expansion-bounded render-row contract');

if (typeof scopeTree.buildRvmScopeRenderRows === 'function') {
  const initial = scopeTree.buildRvmScopeRenderRows(tree, {
    expandedIds: new Set(),
    pageSize: 40,
  });
  assert.equal(initial.totalBranchCount, 810);
  assert.equal(initial.renderedBranchCount, 0);
  assert.equal(initial.rows.length, 9);
  assert.equal(initial.rows.every((row) => row.depth === 0 && row.node.kind === 'SITE'), true);

  const firstSite = tree[0];
  const expanded = scopeTree.buildRvmScopeRenderRows(tree, {
    expandedIds: new Set([firstSite.id]),
    pageSize: 40,
  });
  assert.equal(expanded.rows.length > initial.rows.length, true);
  assert.equal(expanded.rows.length < counts.total, true,
    'expanding one site must not materialize the complete 810-branch tree');
}

console.log('test-rvmattr-scope-tree-lazy-932: PASS');
