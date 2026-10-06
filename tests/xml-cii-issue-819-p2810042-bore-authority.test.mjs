import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveBranchNominalBore,
} from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-wall-evidence.js';
import {
  applyXmlCiiStagedGeometryAuthority,
} from '../converters/xml-cii2019-core/staged-geometry-authority.js';

let boreAuthorityModule = null;
try {
  boreAuthorityModule = await import('../converters/xml-cii2019-core/bore-authority.js');
} catch {}

const branchName = '/HBMR-1000-24"-P2810042-61440-01/B2';

test('source/XML branch bore outranks Branchname regex and regex remains fallback', () => {
  assert.equal(
    resolveBranchNominalBore(branchName, 25, {}),
    25,
    'a source/XML-derived DN25 branch bore must outrank the 24-inch Branchname token',
  );
  assert.equal(
    resolveBranchNominalBore(branchName, null, {}),
    600,
    'the 24-inch Branchname token remains available only when no source/XML bore exists',
  );
});

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

function nodeBlock(xmlText, nodeNumber) {
  const blocks = xmlText.match(/<Node\b[\s\S]*?<\/Node>/gi) || [];
  return blocks.find((block) => new RegExp(`<NodeNumber>\\s*${nodeNumber}\\s*<\\/NodeNumber>`, 'i').test(block)) || '';
}

function value(block, tag) {
  return (block.match(new RegExp(`<${tag}>\\s*([^<]+?)\\s*<\\/${tag}>`, 'i'))?.[1] || '').trim();
}

test('shared staged component ref cannot collapse REDU endpoint-specific XML OD', () => {
  const geometry = applyXmlCiiStagedGeometryAuthority(reducerXml, staged, {
    config: {
      dropGasketNodes: false,
      dropGasketsInEnrichment: false,
      dropShortElementLengthNodes: false,
    },
  });
  const node110 = nodeBlock(geometry.xmlText, 110);
  const node120 = nodeBlock(geometry.xmlText, 120);
  assert.ok(node110 && node120, 'both reducer endpoints must survive staged geometry enrichment');
  assert.equal(value(node110, 'BoreMm'), '600.000', '610 mm OD endpoint must resolve to DN600');
  assert.equal(
    value(node120, 'BoreMm'),
    '500.000',
    '508 mm OD endpoint must retain DN500 even when the shared staged component ref also carries DN600',
  );
});

test('Branchname fallback is validated against DTXR/JSON-trace bore and flagged on mismatch', () => {
  const resolver = boreAuthorityModule?.resolveXmlCiiBoreAuthority;
  assert.equal(
    typeof resolver,
    'function',
    'C02 requires one shared bore-authority resolver that can publish fallback/trace validation',
  );
  const result = resolver({
    branchName,
    validationTraceBoreMm: 50,
    config: {},
  });
  assert.equal(result.boreMm, 600);
  assert.equal(result.source, 'branch-name-fallback');
  assert.equal(result.fallbackUsed, true);
  assert.equal(result.traceMismatch, true);
  assert.equal(result.needsReview, true);
  assert.equal(result.validationTraceBoreMm, 50);
});

console.log('Issue #819 P2810042 bore-authority regression checks completed.');
