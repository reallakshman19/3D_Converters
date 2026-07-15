import assert from 'node:assert/strict';
import test from 'node:test';

import { check1885Fixtures } from '../tools/generate-1885-stagedjson-fixtures.mjs';

function findByRef(nodes, ref) {
  const stack = Array.isArray(nodes) ? [...nodes] : [nodes];
  while (stack.length) {
    const node = stack.shift();
    if (!node || typeof node !== 'object') continue;
    if (node.attributes?.REF === ref || node.attributes?.NAME === ref || node.name?.includes(ref)) return node;
    if (Array.isArray(node.children)) stack.push(...node.children);
  }
  return null;
}

function oneXmlNodeForRef(xml, ref) {
  const nodes = (xml.match(/<Node>[\s\S]*?<\/Node>/g) || [])
    .filter((node) => node.includes(`<ComponentRefNo>${ref}</ComponentRefNo>`));
  assert.equal(nodes.length, 1, `expected one XML node for ${ref}`);
  return nodes[0];
}

test('1885 committed enrichment fixtures reproduce exactly', () => {
  const generated = check1885Fixtures();
  assert.equal(generated.enrichment.audit.summary.geometryChanged, false);
  assert.equal(generated.enrichment.audit.summary.coordinateChanged, false);

  const manifest = JSON.parse(generated.manifest);
  assert.equal(manifest.summary.sourceNodes, manifest.summary.enrichedNodes);
  assert.ok(manifest.summary.stage2Records > 0);
  assert.equal(manifest.summary.stage2Branches, 2);
});

test('1885 module-1 enrichment resolves accepted line and class authority', () => {
  const generated = check1885Fixtures();
  const enriched = generated.enrichment.enrichedStagedJson;

  const elbow = findByRef(enriched, '=1006649732/51428');
  assert.ok(elbow, 'benchmark elbow was not found');
  assert.equal(elbow.enrichedAttributes.lineNo, 'S8810103');
  assert.equal(elbow.enrichedAttributes.pipingClass, '91261');
  assert.equal(elbow.enrichedAttributes.pressureRating, 900);
  assert.equal(elbow.enrichedAttributes.pipeOdMm, 219.1);
  assert.equal(elbow.enrichedAttributes.wallThicknessMm, 12.7);
  assert.equal(elbow.enrichedAttributes.corrosionAllowanceMm, 1);
  assert.equal(elbow.enrichedAttributes.insulationThicknessMm, 100);

  for (const ref of ['=1006649732/51494', '=1006649732/51499']) {
    const component = findByRef(enriched, ref);
    assert.ok(component, `${ref} was not found`);
    assert.equal(component.enrichedAttributes.lineNo, 'S8810101');
    assert.equal(component.enrichedAttributes.pipingClass, '91261');
    assert.equal(component.enrichedAttributes.pressureRating, 900);
    assert.equal(component.enrichedAttributes.pipeOdMm, 273);
    assert.equal(component.enrichedAttributes.wallThicknessMm, 15.09);
    assert.equal(component.enrichedAttributes.corrosionAllowanceMm, 1);
    assert.equal(component.enrichedAttributes.insulationThicknessMm, 120);
  }
});

test('1885 condensed XML is generated from EnrichedSjson, not raw Sjson fallbacks', () => {
  const generated = check1885Fixtures();
  const xml = generated.enrichedXml;

  assert.match(xml, /<DateTime>15\/07\/2026, 12:30:00<\/DateTime>/);

  const elbow = oneXmlNodeForRef(xml, '=1006649732/51428');
  assert.match(elbow, /<NodeNumber>1570<\/NodeNumber>/);
  assert.match(elbow, /<Endpoint>0<\/Endpoint>/);
  assert.match(elbow, /<ComponentType>ELBO<\/ComponentType>/);
  assert.match(elbow, /<OutsideDiameter>219\.1<\/OutsideDiameter>/);
  assert.match(elbow, /<WallThickness>12\.7<\/WallThickness>/);
  assert.match(elbow, /<CorrosionAllowance>1<\/CorrosionAllowance>/);
  assert.match(elbow, /<InsulationThickness>100<\/InsulationThickness>/);

  const tee = oneXmlNodeForRef(xml, '=1006649732/51494');
  assert.match(tee, /<NodeNumber>2280<\/NodeNumber>/);
  assert.match(tee, /<ComponentType>BRAN<\/ComponentType>/);
  assert.match(tee, /<ConnectionType>TEE<\/ConnectionType>/);
  assert.match(tee, /<OutsideDiameter>273<\/OutsideDiameter>/);
  assert.match(tee, /<WallThickness>15\.09<\/WallThickness>/);
  assert.match(tee, /<InsulationThickness>120<\/InsulationThickness>/);

  const reducer = oneXmlNodeForRef(xml, '=1006649732/51499');
  assert.match(reducer, /<NodeNumber>2370<\/NodeNumber>/);
  assert.match(reducer, /<ComponentType>REDU<\/ComponentType>/);
  assert.match(reducer, /<OutsideDiameter>273<\/OutsideDiameter>/);
  assert.match(reducer, /<WallThickness>15\.09<\/WallThickness>/);
  assert.match(reducer, /<AlphaAngle>[^<]+<\/AlphaAngle>/);

  const root = '/ASIM-1885-10&quot;-S8810101-91261M7-HC-01';
  assert.equal((xml.match(new RegExp(`<Branchname>${root}<\\/Branchname>`, 'g')) || []).length, 1);
  assert.doesNotMatch(xml, new RegExp(`${root}\\/B0*\\d+<\\/Branchname>`, 'i'));
});
