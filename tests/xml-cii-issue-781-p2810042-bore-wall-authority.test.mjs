import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  applyXmlCiiStagedGeometryAuthority,
} from '../converters/xml-cii2019-core/staged-geometry-authority.js';
import {
  applyPreviewBoreWallAuthority,
} from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-bore-wall-authority.js';
import {
  resolveBranchNominalBore,
} from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-wall-evidence.js';

const BRANCH = '/HBMR-1000-24"-P2810042-61440-01/B2';

const classRows = [
  { 'Piping Class': '61440', Size: '1', SCH: '160', 'Wall thickness': '6.35', convertedBore: 25 },
  { 'Piping Class': '61440', Size: '2', SCH: '160', 'Wall thickness': '8.7376', convertedBore: 50 },
  { 'Piping Class': '61440', Size: '18', SCH: '80', 'Wall thickness': '23.8252', convertedBore: 450 },
  { 'Piping Class': '61440', Size: '20', SCH: '80', 'Wall thickness': '26.1874', convertedBore: 500 },
  { 'Piping Class': '61440', Size: '24', SCH: '80', 'Wall thickness': '30.9626', convertedBore: 600 },
];

const config = {
  pipingClass: { masterRows: classRows },
  weight: { npsToDn: { '1':25, '2':50, '18':450, '20':500, '24':600 } },
};

function leaf(name, value = '') {
  return { nodeType: 1, localName: name, nodeName: name, textContent: String(value), childNodes: [] };
}
function element(name, fields = {}) {
  return {
    nodeType: 1, localName: name, nodeName: name, textContent: '',
    childNodes: Object.entries(fields).map(([key, value]) => leaf(key, value)),
  };
}
function fakeBranch(name, nodeFields = {}) {
  return {
    nodeType: 1, localName: 'Branch', nodeName: 'Branch', textContent: '',
    childNodes: [leaf('Branchname', name), element('Node', nodeFields)],
  };
}
function fakeDocument(branches) {
  return {
    getElementsByTagName(name) {
      if (name === 'parsererror') return [];
      if (name === 'Branch') return branches;
      return [];
    },
  };
}
function tag(block, name) {
  return block.match(new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`, 'i'))?.[1]?.trim() || '';
}
function nodeBlocks(xml) {
  return [...xml.matchAll(/<Node\b[\s\S]*?<\/Node>/gi)].map((m) => m[0]);
}

test('P2810042 source bore beats the 24-inch Branchname regex', () => {
  assert.equal(resolveBranchNominalBore(BRANCH, 500, config), 500);
  assert.equal(resolveBranchNominalBore(BRANCH, 25, config), 25);
});

test('24-inch regex remains fallback-only and DTXR/json bore mismatch stays auditable', () => {
  const source = fakeDocument([
    fakeBranch(BRANCH, {
      NodeNumber: 120,
      ComponentRefNo: '=REDU-500',
      Endpoint: 2,
      ComponentType: 'REDU',
    }),
  ]);
  const staged = JSON.stringify([
    {
      type: 'BRANCH',
      name: BRANCH,
      children: [{
        type: 'PIPE',
        name: '=PIPE-500',
        attributes: {
          OWNER: BRANCH,
          REF: '=PIPE-500',
          ABORE: '500',
          DTXR_POS: 'PIPE NPS 20 SCH 80',
        },
      }],
    },
  ]);
  const result = applyPreviewBoreWallAuthority({
    xmlText: '<unused/>',
    stagedJsonText: staged,
    config,
    sourceDocument: source,
    result: {
      branchRows: [{ branchName: BRANCH, sizeMm: null, pipingClass: '61440' }],
      nodeRows: [],
    },
  });
  const row = result.branchRows[0];
  assert.equal(row.sizeMm, 600, 'regex is permitted only because no XML bore exists');
  assert.ok(
    row.dtxrWallEvidenceRecords.some((record) => record.disposition === 'REJECTED_BORE_MISMATCH' && Number(record.boreMm) === 500),
    'fallback bore must expose the mismatched staged/DTXR component bore instead of silently accepting 24-inch authority',
  );
  assert.ok(row.dtxrWallRejectedEvidenceCount >= 1);
});

test('node authority restores P2810042 component bores and exact class walls without staged JSON', () => {
  const cases = [
    ['70', 33.4, 25, 6.35],
    ['90', 60.3, 50, 8.7376],
    ['150', 457, 450, 23.8252],
    ['120', 508, 500, 26.1874],
    ['110', 610, 600, 30.9626],
  ];
  const xml = `<Root><Branch><Branchname>${BRANCH}</Branchname>${cases.map(([node, od]) => `
    <Node>
      <NodeNumber>${node}</NodeNumber>
      <ComponentType>${node === '120' || node === '110' ? 'REDU' : 'PIPE'}</ComponentType>
      <PipingClass>61440</PipingClass>
      <OutsideDiameter>${od}</OutsideDiameter>
      <BoreMm>600.000</BoreMm>
      <WallThickness>30.9626</WallThickness>
    </Node>`).join('')}</Branch></Root>`;
  const result = applyXmlCiiStagedGeometryAuthority(xml, '', { config });
  const blocks = nodeBlocks(result.xmlText);
  assert.equal(blocks.length, cases.length);
  cases.forEach(([node, _od, expectedBore, expectedWall], index) => {
    assert.equal(tag(blocks[index], 'NodeNumber'), node);
    assert.equal(Number(tag(blocks[index], 'BoreMm')), expectedBore, `node ${node} bore must follow XML OutsideDiameter`);
    assert.ok(
      Math.abs(Number(tag(blocks[index], 'WallThickness')) - expectedWall) < 1e-6,
      `node ${node} wall must follow 61440 DN${expectedBore}, not branch DN600`,
    );
  });
});

test('final Standalone process parity must not overwrite component wall with one branch wall', () => {
  const source = fs.readFileSync(
    new URL('../tabs/xml-cii-2019-standalone/xml-cii-standalone-run-parity.js', import.meta.url),
    'utf8',
  );
  assert.doesNotMatch(
    source,
    /\{\s*name:\s*['"]WallThickness['"][^\n]*value:\s*row\.wallThickness/,
    'final process parity must preserve node-level wall authority established before converter input',
  );
});
