import assert from 'node:assert/strict';
import {
  buildRvmAttributeScopeTree,
  buildRvmScopeRenderRows,
  rvmScopePathToNode,
} from '../../tabs/model-converters/rvmattr-scope-tree-model.js';

function makeBranch(index, siteCount = 9) {
  const site = `SITE-${String((index % siteCount) + 1).padStart(2, '0')}`;
  const zone = `ZONE-${String((index % 27) + 1).padStart(2, '0')}`;
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
    ],
  };
}

const hierarchy = Array.from({ length: 810 }, (_, index) => makeBranch(index));
const tree = buildRvmAttributeScopeTree(hierarchy);

const initial = buildRvmScopeRenderRows(tree, { expandedIds: new Set() });
assert.equal(initial.rows.length, 9);
assert.equal(initial.rows.every((row) => row.depth === 0 && row.node.kind === 'SITE'), true);

for (const branch of hierarchy) {
  const branchId = `branch:${branch.name}`;
  const path = rvmScopePathToNode(tree, branchId);
  assert.ok(path, `missing path for ${branchId}`);
  assert.equal(path.at(0)?.kind, 'SITE');
  assert.equal(path.at(-1)?.id, branchId);

  const expandedIds = new Set(path.slice(0, -1).map((node) => node.id));
  const visible = buildRvmScopeRenderRows(tree, { expandedIds });
  assert.equal(
    visible.rows.some((row) => row.node.id === branchId),
    true,
    `branch not reachable through explicit expansion path: ${branchId}`,
  );
}

console.log('test-rvmattr-scope-reachability-937: PASS');
