import assert from 'node:assert/strict';
import {
  buildRvmAttributeScopeTree,
  buildRvmScopeRenderRows,
  countRvmAttributeScopeTree,
  rvmScopeExpansionIdsForPattern,
  rvmScopePathToNode,
} from '../../tabs/model-converters/rvmattr-scope-tree-model.js';

function makeBranch(index) {
  const site = `SITE-${String((index % 10) + 1).padStart(2, '0')}`;
  const zone = `ZONE-${String((index % 50) + 1).padStart(2, '0')}`;
  const pipe = `PIPE-${String((index % 100) + 1).padStart(3, '0')}`;
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

const hierarchy = Array.from({ length: 1000 }, (_, index) => makeBranch(index));
const tree = buildRvmAttributeScopeTree(hierarchy);
const counts = countRvmAttributeScopeTree(tree);

assert.deepEqual(counts, {
  sites: 10,
  owners: 150,
  branches: 1000,
  items: 1000,
  total: 2160,
});

const initial = buildRvmScopeRenderRows(tree, { expandedIds: new Set() });
assert.equal(initial.rows.length, 10);
assert.equal(initial.renderedBranchCount, 0);
assert.equal(initial.rows.every((row) => row.depth === 0 && row.node.kind === 'SITE'), true);

let maxRowsToReachBranch = 0;
for (const branch of hierarchy) {
  const branchId = `branch:${branch.name}`;
  const path = rvmScopePathToNode(tree, branchId);
  assert.equal(path?.length, 4, `unexpected hierarchy path for ${branchId}`);
  const expandedIds = new Set(path.slice(0, -1).map((node) => node.id));
  const projection = buildRvmScopeRenderRows(tree, { expandedIds });
  maxRowsToReachBranch = Math.max(maxRowsToReachBranch, projection.rows.length);
  assert.equal(projection.rows.some((row) => row.node.id === branchId), true);
  assert.equal(
    projection.rows.some((row) => row.node.selectable === false),
    false,
    'component descendants must stay absent until their branch is explicitly expanded',
  );
}
assert.equal(maxRowsToReachBranch, 27);
assert.ok(maxRowsToReachBranch < counts.total / 50,
  'reaching one branch should materialize only a small local fraction of the full model');

const target = hierarchy[999];
const searchExpanded = new Set(rvmScopeExpansionIdsForPattern(tree, 'BRAN-1000'));
const searchProjection = buildRvmScopeRenderRows(tree, { expandedIds: searchExpanded });
assert.equal(searchExpanded.size, 3);
assert.equal(searchProjection.rows.length, 27);
assert.equal(searchProjection.rows.some((row) => row.node.id === `branch:${target.name}`), true);
assert.equal(searchProjection.rows.some((row) => row.node.selectable === false), false);

const targetPath = rvmScopePathToNode(tree, `branch:${target.name}`);
const branchExpanded = new Set(targetPath.map((node) => node.id));
const withComponent = buildRvmScopeRenderRows(tree, { expandedIds: branchExpanded });
assert.equal(withComponent.rows.length, 28);
assert.equal(withComponent.rows.some((row) => row.node.selectable === false), true);

console.log('test-rvmattr-scope-large-939: PASS');