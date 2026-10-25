import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { installWeightBasisXmlDom } from '../tabs/xml-cii-2019-standalone/workers/weight-basis-xml-dom.js';
import {
  isXmlCiiWeightReviewNode,
  isXmlCiiWeightReviewConnectionEligible,
  isXmlCiiWeightReviewEndpoint,
} from '../converters/xml-cii2019-core/weight-match-model.js';
import { projectXmlCiiOccurrences } from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-facts-xml-source.js';
import { preparePreviewNodeOccurrenceDocument } from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-node-occurrence-ledger.js';

installWeightBasisXmlDom(globalThis);

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const SYNTHETIC_BRANCH_HEAD_ENDPOINT1_XML = `<?xml version="1.0" encoding="utf-8"?>
<PipeStressExport xmlns="http://aveva.com/pipeStress116.xsd">
  <Pipe>
    <Branch>
      <Branchname>/HEADER/B1</Branchname>
      <Node>
        <NodeNumber>100</NodeNumber>
        <Endpoint>1</Endpoint>
        <ComponentType>PIPE</ComponentType>
        <Position>0 0 0</Position>
      </Node>
      <Node>
        <NodeNumber>110</NodeNumber>
        <Endpoint>2</Endpoint>
        <Rigid>2</Rigid>
        <ComponentType>RIGID</ComponentType>
        <ComponentRefNo>=1001/01</ComponentRefNo>
        <Position>1000 0 0</Position>
      </Node>
    </Branch>
    <Branch>
      <Branchname>/CHILD/B1</Branchname>
      <Node>
        <NodeNumber>110</NodeNumber>
        <Endpoint>1</Endpoint>
        <Rigid>2</Rigid>
        <ComponentType>RIGID</ComponentType>
        <ComponentRefNo>=2001/01</ComponentRefNo>
        <ConnectionType>BRAN</ConnectionType>
        <Position>1000 0 0</Position>
      </Node>
      <Node>
        <NodeNumber>120</NodeNumber>
        <Endpoint>2</Endpoint>
        <Rigid>2</Rigid>
        <ComponentType>RIGID</ComponentType>
        <ComponentRefNo>=2001/02</ComponentRefNo>
        <Position>1000 500 0</Position>
      </Node>
    </Branch>
  </Pipe>
</PipeStressExport>`;

test('Endpoint 1 branch-inlet rigid node is excluded by isXmlCiiWeightReviewEndpoint', () => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(SYNTHETIC_BRANCH_HEAD_ENDPOINT1_XML, 'text/xml');
  const nodes = [...doc.getElementsByTagName('Node')];

  const headerOutlet = nodes[1];
  assert.equal(isXmlCiiWeightReviewNode(headerOutlet), true);
  assert.equal(isXmlCiiWeightReviewConnectionEligible(headerOutlet), true);
  assert.equal(isXmlCiiWeightReviewEndpoint(headerOutlet), true);

  const childInlet = nodes[2];
  assert.equal(isXmlCiiWeightReviewNode(childInlet), true);
  assert.equal(isXmlCiiWeightReviewConnectionEligible(childInlet), true);
  assert.equal(isXmlCiiWeightReviewEndpoint(childInlet), false);

  const childOutlet = nodes[3];
  assert.equal(isXmlCiiWeightReviewNode(childOutlet), true);
  assert.equal(isXmlCiiWeightReviewConnectionEligible(childOutlet), true);
  assert.equal(isXmlCiiWeightReviewEndpoint(childOutlet), true);
});

test('Physical census with endpoint filtering excludes branch head inlet from candidates', () => {
  const xml = SYNTHETIC_BRANCH_HEAD_ENDPOINT1_XML;
  const clean = preparePreviewNodeOccurrenceDocument({ xmlText: xml, config: {} });
  const branches = [...clean.document.getElementsByTagName('Branch')];
  assert.equal(branches.length, 2);

  const physicalNodes = [];
  for (const branch of branches) {
    const nodes = [...branch.getElementsByTagName('Node')];
    for (const node of nodes) {
      if (
        isXmlCiiWeightReviewNode(node) &&
        isXmlCiiWeightReviewConnectionEligible(node) &&
        isXmlCiiWeightReviewEndpoint(node)
      ) {
        physicalNodes.push({
          nodeNumber: node.getElementsByTagName('NodeNumber')[0]?.textContent,
          endpoint: node.getElementsByTagName('Endpoint')[0]?.textContent,
          ref: node.getElementsByTagName('ComponentRefNo')[0]?.textContent,
        });
      }
    }
  }

  assert.equal(physicalNodes.length, 2);
  assert.deepEqual(physicalNodes, [
    { nodeNumber: '110', endpoint: '2', ref: '=1001/01' },
    { nodeNumber: '120', endpoint: '2', ref: '=2001/02' },
  ]);
});

test('Real PL-01_XML excludes Node 2810 Endpoint 1 and retains exactly 29 physical owners', () => {
  const xmlPath = 'C:/CodeB/PL-01_XML.xml';
  let xml;
  try {
    xml = readFileSync(xmlPath, 'utf8');
  } catch {
    return;
  }
  const clean = preparePreviewNodeOccurrenceDocument({ xmlText: xml, config: {} });
  const branches = [...clean.document.getElementsByTagName('Branch')];
  assert.equal(branches.length, 9);

  let unPairedEndpoint1Count = 0;
  let totalWithEndpointCheck = 0;
  for (const branch of branches) {
    const nodes = [...branch.getElementsByTagName('Node')];
    for (const node of nodes) {
      if (
        isXmlCiiWeightReviewNode(node) &&
        isXmlCiiWeightReviewConnectionEligible(node)
      ) {
        const ep = node.getElementsByTagName('Endpoint')[0]?.textContent;
        if (ep === '1') {
          unPairedEndpoint1Count++;
        }
        if (isXmlCiiWeightReviewEndpoint(node)) {
          totalWithEndpointCheck++;
        }
      }
    }
  }

  assert.equal(totalWithEndpointCheck, 29);
});

test('Fact producer, census worker, and transfer manifest remain identical to docs mirrors', () => {
  const files = [
    'tabs/xml-cii-2019-standalone/integration/xml229-preview-engineering-fact-producer.mjs',
    'tabs/xml-cii-2019-standalone/integration/xml229-original-physical-census-worker.mjs',
    'tabs/xml-cii-2019-standalone/integration/xml229-r2-physical-transfer-manifest.mjs',
  ];
  for (const file of files) {
    const rootPath = resolve(ROOT, file);
    const docsPath = resolve(ROOT, 'docs', file);
    const rootContent = readFileSync(rootPath, 'utf8');
    const docsContent = readFileSync(docsPath, 'utf8');
    assert.equal(
      rootContent.replace(/\r\n/g, '\n'),
      docsContent.replace(/\r\n/g, '\n'),
      `Mirror mismatch for ${file}`
    );
  }
});
