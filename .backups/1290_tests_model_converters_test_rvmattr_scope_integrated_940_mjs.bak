import assert from 'node:assert/strict';

import {
  buildRvmAttributeScopeTree,
  buildRvmScopeRenderRows,
  rvmScopePathToNode,
} from '../../tabs/model-converters/rvmattr-scope-tree-model.js';
import {
  applyRvmScopeSelection,
  countSelectedRvmBranches,
} from '../../tabs/model-converters/rvmattr-scope-selection-model.js';
import { _filterStagedHierarchyByScope } from '../../tabs/model-converters/converters/stagedjson-xml-helpers.js';

function makeBranch(index) {
  const site = `SITE-${String((index % 9) + 1).padStart(2, '0')}`;
  const zone = `ZONE-${String((index % 27) + 1).padStart(2, '0')}`;
  const pipe = `PIPE-${String(index % 90).padStart(3, '0')}`;
  return {
    name: `/${site}/${zone}/${pipe}/BRAN-${String(index + 1).padStart(4, '0')}`,
    type: 'BRANCH',
    attributes: {
      OWNER_SITE: site,
      OWNER: `/${site}/${zone}/${pipe}`,
    },
    children: [{ type: 'PIPE', name: `P-${index + 1}` }],
  };
}

const hierarchy = Array.from({ length: 810 }, (_, index) => makeBranch(index));
const tree = buildRvmAttributeScopeTree(hierarchy);
const selected = new Set();

// Fresh mixed scenario: select one whole Site through ancestor custody.
const firstSite = tree[0];
applyRvmScopeSelection(selected, [firstSite.selectId], true);
assert.equal(
  countSelectedRvmBranches(tree, selected),
  firstSite.branchKeys.length,
  'selected branch count must include hidden descendants governed by an ancestor selection',
);

// Progressive navigation: reveal one selected descendant path only.
const targetBranch = firstSite.branchKeys.at(-1);
const path = rvmScopePathToNode(tree, `branch:${targetBranch}`);
const expandedIds = new Set(path.slice(0, -1).map((node) => node.id));
const projection = buildRvmScopeRenderRows(tree, { expandedIds });

assert.equal(projection.totalBranchCount, 810);
assert.ok(projection.renderedBranchCount > 0);
assert.ok(projection.renderedBranchCount < 810);
assert.equal(
  countSelectedRvmBranches(tree, selected),
  firstSite.branchKeys.length,
  'navigation/render state must not change selected branch count',
);

// Wildcard is combined with checked scope by OR.
const wildcardTarget = hierarchy.find((row) => !row.name.startsWith(`/${firstSite.label}/`));
assert.ok(wildcardTarget);
const wildcard = wildcardTarget.name.split('/').at(-1);
const converted = _filterStagedHierarchyByScope(hierarchy, {
  wildcard,
  selectedIds: [...selected],
});
const expected = new Set([
  ...firstSite.branchKeys,
  wildcardTarget.name,
]);
assert.deepEqual(
  new Set(converted.hierarchy.map((row) => row.name)),
  expected,
  'conversion must equal selected hierarchy branches OR wildcard matches exactly',
);

// Cleared selection + blank wildcard remains explicit full scope.
assert.equal(
  _filterStagedHierarchyByScope(hierarchy, { wildcard: '', selectedIds: [] }).hierarchy.length,
  810,
);

console.log('test-rvmattr-scope-integrated-940: PASS');
