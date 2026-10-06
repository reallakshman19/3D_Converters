import assert from 'node:assert/strict';
import {
  resolveBranchNominalBore,
} from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-wall-evidence.js';
import {
  applyXmlCiiStagedGeometryAuthority,
} from '../converters/xml-cii2019-core/staged-geometry-authority.js';

const branchName = '/HBMR-1000-24"-P2810042-61440-01/B2';

assert.equal(
  resolveBranchNominalBore(branchName, 25, {}),
  25,
  'a source/XML-derived DN25 branch bore must outrank the 24-inch Branchname token',
);
assert.equal(
  resolveBranchNominalBore(branchName, null, {}),
  600,
  'the 24-inch Branchname token remains available when no source/XML bore exists',
);

const reducerXml = `<Root>
  <Branch>
    <Branchname>${branchName.replaceAll('&', '&amp;')}</Branchname>
    <Node>
      <NodeNumber>110</NodeNumber>
      <ComponentType>REDU</ComponentType>
      <ComponentRefNo>=67127481/31</ComponentRefNo>
      <Endpoint>1</Endpoint>
      <OutsideDiameter>610</OutsideDiameter>
      <Position>73502.00 119970.00 103293.10</Position>
    </Node>
    <Node>
      <NodeNumber>120</NodeNumber>
      <ComponentType>REDU</ComponentType>
      <ComponentRefNo>=67127481/31</ComponentRefNo>
      <Endpoint>2</Endpoint>
      <OutsideDiameter>508</OutsideDiameter>
      <Position>73502.00 119970.00 102785.10</Position>
    </Node>
  </Branch>
</Root>`;

const staged = JSON.stringify([
  {
    type: 'BRANCH',
    name: branchName,
    children: [
      {
        type: 'REDU',
        name: 'P2810042 reducer witness',
        attributes: {
          OWNER: branchName,
          REF: '=67127481/31',
          ABORE: '600',
          LBORE: '500',
          DTXR_POS: 'SCH 80',
        },
      },
    ],
  },
]);

const geometry = applyXmlCiiStagedGeometryAuthority(reducerXml, staged, {
  config: {
    dropGasketNodes: false,
    dropGasketsInEnrichment: false,
    dropShortElementLengthNodes: false,
  },
});

function nodeBlock(nodeNumber) {
  const blocks = geometry.xmlText.match(/<Node\b[\s\S]*?<\/Node>/gi) || [];
  return blocks.find((block) => new RegExp(`<NodeNumber>\\s*${nodeNumber}\\s*<\\/NodeNumber>`, 'i').test(block)) || '';
}

function value(block, tag) {
  return (block.match(new RegExp(`<${tag}>\\s*([^<]+?)\\s*<\\/${tag}>`, 'i'))?.[1] || '').trim();
}

const node110 = nodeBlock(110);
const node120 = nodeBlock(120);
assert.ok(node110 && node120, 'both reducer endpoints must survive staged geometry enrichment');
assert.equal(value(node110, 'BoreMm'), '600.000', '610 mm OD endpoint must resolve to DN600');
assert.equal(
  value(node120, 'BoreMm'),
  '500.000',
  '508 mm OD endpoint must retain DN500 even when the shared staged component ref also carries DN600',
);

const sourceSmallBoreXml = reducerXml
  .replace('<NodeNumber>110</NodeNumber>', '<NodeNumber>70</NodeNumber>')
  .replace('<ComponentType>REDU</ComponentType>', '<ComponentType>BRAN</ComponentType>')
  .replace('<ComponentRefNo>=67127481/31</ComponentRefNo>', '<ComponentRefNo>=67127481/65</ComponentRefNo>')
  .replace('<OutsideDiameter>610</OutsideDiameter>', '<OutsideDiameter>33.4</OutsideDiameter>');

assert.match(sourceSmallBoreXml, /<OutsideDiameter>33\.4<\/OutsideDiameter>/);

console.log('Issue #819 P2810042 bore-authority regression checks passed.');
