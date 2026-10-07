import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  buildRvmAttributeScopeTree,
  countRvmAttributeScopeTree,
} from '../../tabs/model-converters/rvmattr-scope-tree-model.js';
import { matchesRvmScope, matchesScopeFields, splitScopeTokens } from '../../converters/rvm-scope-pattern.js';
import { _filterStagedHierarchyByScope } from '../../tabs/model-converters/converters/stagedjson-xml-helpers.js';

const hierarchy = [
  {
    name: '/SITE-A/PIPE-1/BRAN-1',
    attributes: { OWNER_SITE: 'SITE-A', OWNER: '/SITE-A/PIPE-1' },
    children: [
      { type: 'PIPE', name: 'P-1', attributes: { REF: '=P1' } },
      {
        type: 'SUPPORT', attributes: { NAME: 'REST-1' }, children: [
          { type: 'MEMBER', attributes: { REF: '=M1' } },
        ],
      },
    ],
  },
  {
    name: '/SITE-A/PIPE-1/BRAN-2',
    attributes: { OWNER_SITE: 'SITE-A', OWNER: '/SITE-A/PIPE-1' },
    children: [{ type: 'VALV', attributes: { NAME: 'V-1' } }],
  },
];

const tree = buildRvmAttributeScopeTree(hierarchy);
assert.equal(tree.length, 1);
assert.equal(tree[0].id, 'site:SITE-A');
assert.equal(tree[0].children[0].id, 'owner:SITE-A/PIPE-1');
const branches = tree[0].children[0].children;
assert.deepEqual(branches.map((node) => node.id), [
  'branch:/SITE-A/PIPE-1/BRAN-1',
  'branch:/SITE-A/PIPE-1/BRAN-2',
]);
assert.deepEqual(branches[0].children.map((node) => node.label), ['P-1', 'REST-1']);
assert.equal(branches[0].children[1].children[0].label, '=M1');
assert.equal(branches[0].selectable, true);
assert.equal(branches[0].children[0].selectable, false);
assert.deepEqual(countRvmAttributeScopeTree(tree), {
  sites: 1, owners: 1, branches: 2, items: 4, total: 8,
});
assert.equal(branches[0].scopeFields.includes('/SITE-A/PIPE-1/BRAN-1'), true);
assert.equal(branches[0].scopeFields.includes('/SITE-A/PIPE-1'), true);

const wildcardHierarchy = [
  {
    name: '/ASIM-1837-XX-YY--PL/B2',
    type: 'BRANCH',
    attributes: { OWNER_SITE: 'SITE-A', OWNER: '/SITE-A/ZONE-12/PIPE-7' },
    children: [],
  },
  {
    name: '/ASIM-1838-AA-BB--PL/B3',
    type: 'BRANCH',
    attributes: { OWNER_SITE: 'SITE-A', OWNER: '/SITE-A/ZONE-13/PIPE-8' },
    children: [],
  },
  {
    name: '/ASIM-1885-PL-3"-S8810009-91261M7-01/B2',
    type: 'BRANCH',
    attributes: { OWNER_SITE: 'SITE-B', OWNER: '/SITE-B/ZONE-88/PIPE-9' },
    children: [],
  },
  {
    name: '/GLRD-1000-P4110010-61440-01/B1',
    type: 'BRANCH',
    attributes: { OWNER_SITE: 'SITE-C', OWNER: '/SITE-C/ZONE-41/PIPE-10' },
    children: [],
  },
];

function branchNames(scope) {
  return _filterStagedHierarchyByScope(wildcardHierarchy, scope)
    .hierarchy.map((row) => row.name);
}

// PA1 oracle: expected branch identities are declared before production filtering.
const scopeTruth = Object.freeze({
  quoted183: ['/ASIM-1837-XX-YY--PL/B2', '/ASIM-1838-AA-BB--PL/B3'],
  siteB: ['/ASIM-1885-PL-3"-S8810009-91261M7-01/B2'],
  combined: ['/ASIM-1837-XX-YY--PL/B2', '/ASIM-1885-PL-3"-S8810009-91261M7-01/B2'],
  none: [],
  full: wildcardHierarchy.map((row) => row.name),
});

assert.deepEqual(branchNames({ wildcard: '"183*-*--PL"', selectedIds: [] }), scopeTruth.quoted183);
assert.deepEqual(branchNames({ wildcard: '183*-*--PL', selectedIds: [] }), scopeTruth.quoted183);
assert.deepEqual(branchNames({ wildcard: '', selectedIds: ['site:SITE-B'] }), scopeTruth.siteB);
assert.deepEqual(
  branchNames({ wildcard: '1837*--PL', selectedIds: ['site:SITE-B'] }),
  scopeTruth.combined,
);
assert.deepEqual(branchNames({ wildcard: 'NO-SUCH-*', selectedIds: [] }), scopeTruth.none);
assert.deepEqual(branchNames({ wildcard: '', selectedIds: [] }), scopeTruth.full);
assert.deepEqual(branchNames('183*-*--PL'), scopeTruth.quoted183);

// A wildcard may match one atomic field, but may not bridge unrelated hierarchy fields.
assert.deepEqual(branchNames({ wildcard: 'SITE-A*91261M7', selectedIds: [] }), scopeTruth.none);

assert.equal(matchesRvmScope(wildcardHierarchy[0], '"183*-*--PL"'), true);
assert.equal(matchesRvmScope(wildcardHierarchy[2], '"183*-*--PL"'), false);
assert.deepEqual(splitScopeTokens('"183*-*--PL"'), ['183*-*--PL']);
assert.equal(matchesScopeFields(['/A/183.X-ABC--PL'], '183.X*--PL'), true);
assert.equal(matchesScopeFields(['/A/1830X-ABC--PL'], '183.X*--PL'), false);
assert.equal(matchesScopeFields(['183-AAA', 'BBB--PL'], '183*--PL'), false);
assert.equal(matchesScopeFields(['prefix 183-AAA-BBB--PL suffix'], '183*--PL'), true);

const root = new URL('../../', import.meta.url);
const addon = await readFile(new URL(
  'tabs/model-converters/rvmattr-scope-tree-addon.js', root), 'utf8');
const shell = await readFile(new URL(
  'tabs/model-converters/ModelConvertersTab.js', root), 'utf8');
const indexSource = await readFile(new URL(
  'tabs/model-converters/index.js', root), 'utf8');
const shim = await readFile(new URL('tabs/model-converters-tab.js', root), 'utf8');
const wrapper = await readFile(new URL(
  'tabs/model-converters/ModelConvertersTab-fbx2-managed-reference.js', root), 'utf8');
const appRuntime = await readFile(new URL('core/app-standalone-runtime.js', root), 'utf8');
const app = await readFile(new URL('core/app.js', root), 'utf8');
const main = await readFile(new URL('main-rhbg-fitguard.js', root), 'utf8');
const html = await readFile(new URL('index.html', root), 'utf8');

assert.match(addon, /Convert full scope/);
const legacy = await readFile(new URL('tabs/model-converters/legacy-adapter.js', root), 'utf8');
assert.match(legacy, /data-scope-convert-full/);
assert.match(legacy, /Convert full scope/);
assert.match(legacy, /wildcard:\s*''[\s\S]*selectedIds:\s*\[\]/);
assert.match(addon, /data-rvm-tree-toggle/);
assert.match(addon, /parseRmssAttributes/);
assert.match(addon, /buildRvmAttributeScopeTree/);
assert.match(addon, /buildRvmScopeRenderRows/);
assert.match(addon, /rvmScopeExpansionIdsForPattern/);
assert.match(addon, /MutationObserver/);
assert.match(addon, /matchesScopeFields/);
assert.doesNotMatch(addon, /function wildcardRegex/);
assert.doesNotMatch(addon, /\.slice\(0\s*,\s*\d+/);
assert.match(legacy, /matchesRvmScope/);
assert.doesNotMatch(legacy, /normalized\.includes\('\*'\)\s*\?\s*`\^/);
assert.match(shell, /installRvmAttrScopeTreeAddon/);
assert.match(shell, /rvmattr-scope-tree-addon\.js\?v=20261007-rvm-reachability-2/);
// The scope addon retains its own release. Shared parents advance when any
// converter dependency changes; verify the actual fresh parent URLs separately.
assert.match(indexSource, /ModelConvertersTab-fbx2-managed-reference\.js\?v=20261007-rvm-reachability-2/);
assert.match(shim, /model-converters\/index\.js\?v=20261007-rvm-reachability-2/);
assert.match(shim, /model-converters\/legacy-adapter\.js\?v=20261007-rvm-scope-matcher-1/);
assert.match(wrapper, /ModelConvertersTab\.js\?v=20261007-rvm-reachability-2/);
assert.match(appRuntime, /model-converters-tab\.js\?v=20261007-rvm-reachability-2/);
assert.match(app, /app-standalone-runtime\.js\?v=20261007-rvm-reachability-2/);
assert.match(app, /model-converters-tab\.js\?v=20261007-rvm-reachability-2/);
assert.match(main, /core\/app\.js\?v=20261007-rvm-reachability-2/);
assert.match(html, /main-rhbg-fitguard\.js\?v=20261007-rvm-reachability-2/);

console.log('test-rvmattr-scope-tree: PASS');
