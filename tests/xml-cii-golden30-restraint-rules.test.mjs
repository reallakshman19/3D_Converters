// Owner decisions of 14 Nov 2026 on the GOLDEN-30 fixture:
//  A  a guide and a line stop on one node may need different gaps, or none: each restraint made
//     from a staged item keeps that item's own gap and CMPSUPGAP note;
//  G  XML restraint types X and Z are CAESAR restraint types of their own and stay X / Z;
//  H  a staged support that maps to no node is a non-blocking warning (near miss or orphan).
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import * as mainCopy from '../converters/xml-cii2019-core/support-mapping-legacy.js';
import * as v045Copy from '../v045/converters/xml-cii2019-core/support-mapping.js';
import { unmatchedStagedSupportWarnings, rememberSupportLedger, refreshUnmatchedSupportWarnings } from '../v045/tabs/xml-cii-2019-standalone/xml-cii-unmatched-supports.js';
import { psi116ProfileTypeToCaesarCode, restraintTypeToCaesarCode } from '../converters/xml-cii2019-core/restraint-type-codes.js';

class Element {
  constructor(name) { this.localName = name; this.nodeName = name; this.nodeType = 1; this.namespaceURI = null; this.childNodes = []; this._text = ''; }
  get textContent() { return this.childNodes.length ? this.childNodes.map((c) => c.textContent).join('') : this._text; }
  set textContent(value) { this.childNodes = []; this._text = String(value); }
  appendChild(child) { this.childNodes.push(child); return child; }
  removeChild(child) { this.childNodes = this.childNodes.filter((c) => c !== child); return child; }
}
const document = { createElement: (name) => new Element(name), createElementNS: (_, name) => new Element(name) };
const kids = (node, name) => node.childNodes.filter((c) => c.localName === name);
const val = (node, name) => kids(node, name)[0]?.textContent;
function nodeWithGroupGap(text) {
  const node = new Element('Node');
  const gap = new Element('CMPSUPGAP_POS');
  gap.textContent = text;
  node.appendChild(gap);
  return node;
}
const byType = (node) => Object.fromEntries(kids(node, 'Restraint').map((r) => [val(r, 'Type'), r]));

for (const [label, lib] of [['main', mainCopy], ['v045', v045Copy]]) {
  test(`${label} A: a line stop with no gap of its own stays at gap 0 next to a 5 mm guide`, () => {
    const node = nodeWithGroupGap('5mm GAP');
    const entries = [
      ...lib.xmlCiiRestraintEntriesFromSupportMatch({ kinds: ['LINESTOP'], attrs: { CMPSUPTYPE: 'LS-01' } }, node, {}),
      ...lib.xmlCiiRestraintEntriesFromSupportMatch({ kinds: ['GUIDE'], attrs: { CMPSUPTYPE: 'PG-04', CMPSUPGAP: '5mm GAP' } }, node, {}),
    ];
    lib.applyXmlRestraints(document, node, entries, {});
    const { LIM, GUI } = byType(node);
    assert.equal(val(LIM, 'Gap'), '0');
    assert.equal(val(LIM, 'CMPSUPGAP'), undefined);
    assert.equal(val(GUI, 'Gap'), '5');
    assert.equal(val(GUI, 'CMPSUPGAP'), '5mm GAP');
  });

  test(`${label} A: a 2 mm line stop does not hand its gap to a guide that has none`, () => {
    const node = nodeWithGroupGap('2mm GAP');
    const entries = [
      ...lib.xmlCiiRestraintEntriesFromSupportMatch({ kinds: ['LINESTOP'], attrs: { CMPSUPTYPE: 'LS-02', CMPSUPGAP: '2mm GAP' } }, node, {}),
      ...lib.xmlCiiRestraintEntriesFromSupportMatch({ kinds: ['GUIDE'], attrs: { CMPSUPTYPE: 'PG-41' } }, node, {}),
    ];
    lib.applyXmlRestraints(document, node, entries, {});
    const { LIM, GUI } = byType(node);
    assert.equal(val(LIM, 'Gap'), '2');
    assert.equal(val(GUI, 'Gap'), '0');
    assert.equal(val(GUI, 'CMPSUPGAP'), undefined);
  });

  test(`${label} A: a restraint with no staged item still takes the node-level gap (unchanged)`, () => {
    const node = nodeWithGroupGap('5mm GAP');
    lib.applyXmlRestraints(document, node, [{ type: 'GUI', gap: '0' }], {});
    assert.equal(val(byType(node).GUI, 'Gap'), '5');
  });

  test(`${label} G: XML restraint types X and Z stay X and Z`, () => {
    assert.equal(lib.normalizeExistingXmlCiiRestraintType('X', {}), 'X');
    assert.equal(lib.normalizeExistingXmlCiiRestraintType('Z', {}), 'Z');
    assert.equal(lib.normalizeExistingXmlCiiRestraintType('GUIDE', {}), 'GUI');
    assert.equal(lib.normalizeExistingXmlCiiRestraintType('LINESTOP', {}), 'LIM');
    const node = new Element('Node');
    lib.applyXmlRestraints(document, node, [{ type: 'X', gap: '0' }, { type: 'Z', gap: '3' }], {});
    assert.deepEqual(kids(node, 'Restraint').map((r) => val(r, 'Type')), ['X', 'Z']);
  });

  test(`${label} G: a source Z re-mapped to Y by config carries the CII Y direction, so the writer keeps it vertical`, () => {
    const restraint = new Element('Restraint');
    for (const [k, v] of [['Type', 'Z'], ['Gap', '0']]) { const c = new Element(k); c.textContent = v; restraint.appendChild(c); }
    const entry = lib.xmlCiiTypeEntryFromExistingRestraint(restraint, { xmlAxisToCiiAxis: { Z: 'Y' } });
    assert.equal(entry.type, 'Y');
    assert.deepEqual(entry.direction, { x: 0, y: 1, z: 0 });
    const plain = lib.xmlCiiTypeEntryFromExistingRestraint(restraint, {});
    assert.equal(plain.type, 'Z');
    assert.equal(plain.direction, null);
  });
}

test('H: a near miss without its restraint and an orphan on this XML\'s line warn; the rest stay silent', () => {
  const line = '/GF30-6"-P0004-A1A/B1';
  const sup = (name, branchName = line) => ({ type: 'SUPPORT', name, branchName, path: `$.${name}` });
  const ledger = {
    groups: [
      { id: 'G-in', anchor: { x: 0.8, y: 0, z: 0 }, entries: [sup('=9030/1087')] },          // 0.8 mm: inside the 1 mm tolerance
      { id: 'G-near', anchor: { x: 6501.5, y: 0, z: 1400 }, entries: [sup('=9030/1107')] },  // 1.5 mm, node has no GUI
      { id: 'G-near-ok', anchor: { x: 1.5, y: 9, z: 0 }, entries: [sup('=9030/1200')] },     // 1.5 mm, node already has GUI
      { id: 'G-orphan', anchor: { x: 20000, y: 20000, z: 0 }, entries: [sup('/PS-9999')] },
      { id: 'G-other-line', anchor: { x: 9e5, y: 0, z: 0 }, entries: [sup('/PS-7777', '/OTHER-LINE/B1')] },
      { id: 'G-valve', anchor: { x: 5e5, y: 0, z: 0 }, entries: [{ type: 'VALV', name: 'V-1', branchName: line }] },
    ],
    records: [
      { xmlIndex: 1, xmlNodeNumber: '430', xmlBranch: line, groupId: 'G-in', distanceMm: 0.8, derivedSupportTypes: ['REST'] },
      { xmlIndex: 2, xmlNodeNumber: '440', xmlBranch: line, groupId: 'G-near', distanceMm: 1.5, derivedSupportTypes: ['GUIDE'] },
      { xmlIndex: 3, xmlNodeNumber: '450', xmlBranch: line, groupId: 'G-near-ok', distanceMm: 1.5, derivedSupportTypes: ['GUIDE'] },
    ],
  };
  const finalXml = '<Node><NodeNumber>430</NodeNumber><Restraint><Type>+Y</Type></Restraint></Node>'
    + '<Node><NodeNumber>440</NodeNumber></Node>'
    + '<Node><NodeNumber>450</NodeNumber><Restraint><Type>GUI</Type></Restraint></Node>';
  const out = unmatchedStagedSupportWarnings(ledger, 1, finalXml);
  assert.deepEqual(out.map((w) => [w.code, w.severity, w.tag]), [['SUPPORT_NEAR_MISS', 'warning', '=9030/1107'], ['SUPPORT_ORPHAN', 'warning', '/PS-9999']]);
  assert.match(out[0].message, /1\.5 mm from node 440 .*no GUIDE restraint/);
  assert.match(out[1].message, /PS-9999/);
});

test('tab: a source Z the tab re-maps to Y also carries the CII Y direction, and a second pass keeps it', () => {
  const source = readFileSync(new URL('../tabs/model-converters/legacy-adapter.js', import.meta.url), 'utf8');
  const body = /function _xmlCiiTypeEntryFromExistingRestraint\(restraint, config\) \{[\s\S]*?\n\}/.exec(source)[0];
  const xmlText = (el, name) => el.childNodes.find((c) => c.localName === name)?.textContent ?? '';
  const normalize = (t, config) => { const u = String(t).trim().toUpperCase(); return config.xmlAxisToCiiAxis?.[u] || u; };
  const read = new Function('xmlCiiTypeEntryFromExistingRestraint', '_normalizeExistingXmlCiiRestraintType', '_xmlText',
    `${body}\nreturn _xmlCiiTypeEntryFromExistingRestraint;`)(mainCopy.xmlCiiTypeEntryFromExistingRestraint, normalize, xmlText);
  const config = { xmlAxisToCiiAxis: { Z: 'Y' } };
  const restraint = new Element('Restraint');
  for (const [k, v] of [['Type', 'Z'], ['Gap', '0']]) { const c = new Element(k); c.textContent = v; restraint.appendChild(c); }
  const first = read(restraint, config);
  assert.equal(first.type, 'Y');
  assert.deepEqual(first.direction, { x: 0, y: 1, z: 0 });
  const node = new Element('Node');
  mainCopy.applyXmlRestraints(document, node, [first], config);
  const second = read(kids(node, 'Restraint')[0], config);
  assert.equal(second.type, 'Y');
  assert.equal(second.direction.y, 1);
});

for (const [label, lib] of [['main', mainCopy], ['v045', v045Copy]]) {
  test(`${label} A: re-enriching an enriched node with no staged match keeps each restraint's own gap`, () => {
    const node = nodeWithGroupGap('5mm GAP');
    const src = new Element('DTXR_SOURCE'); src.textContent = 'staged-json-position-group'; node.appendChild(src);
    const mk = (fields) => { const r = new Element('Restraint'); for (const [k, v] of Object.entries(fields)) { const c = new Element(k); c.textContent = v; r.appendChild(c); } return r; };
    node.appendChild(mk({ Type: 'LIM', Stiffness: '1', Gap: '0', Friction: '-1.010100' }));
    node.appendChild(mk({ Type: 'GUI', Stiffness: '1', Gap: '5', Friction: '-1.010100', CMPSUPGAP: '5mm GAP' }));
    const entries = kids(node, 'Restraint').map((r) => lib.xmlCiiTypeEntryFromExistingRestraint(r, {}));
    lib.applyXmlRestraints(document, node, entries, {});
    const { LIM, GUI } = byType(node);
    assert.equal(val(LIM, 'Gap'), '0');
    assert.equal(val(LIM, 'CMPSUPGAP'), undefined);
    assert.equal(val(GUI, 'Gap'), '5');
  });
}

test('H: wrappers that add restraints after the base run refresh the warnings on their final XML', () => {
  const line = '/L1';
  const ledger = {
    groups: [{ id: 'G', anchor: { x: 1.5, y: 0, z: 0 }, entries: [{ type: 'SUPPORT', name: '=9030/1107', branchName: line }] }],
    records: [{ xmlIndex: 1, xmlNodeNumber: '440', xmlBranch: line, groupId: 'G', distanceMm: 1.5, derivedSupportTypes: ['GUIDE'] }],
  };
  const out = { xmlText: '<Node><NodeNumber>440</NodeNumber></Node>', diagnostics: [], logs: ['Standalone run parity PASS'] };
  rememberSupportLedger(out, ledger, 1);
  refreshUnmatchedSupportWarnings(out);
  assert.equal(out.logs.filter((l) => l.startsWith('Warning SUPPORT_NEAR_MISS')).length, 1);
  out.xmlText = '<Node><NodeNumber>440</NodeNumber><Restraint><Type>GUI</Type></Restraint></Node>';
  refreshUnmatchedSupportWarnings(out);
  assert.deepEqual(out.logs, ['Standalone run parity PASS']);
  assert.equal(out.diagnostics.filter((d) => d.type === 'staged-support-unmatched').length, 0);
});

test('G display: step-10 profile types show the codes the PSI116 writer writes; InputXML mapper unchanged', () => {
  assert.deepEqual(['X', 'Y', 'Z', '+Y', 'GUI', 'LIM', 'A'].map(psi116ProfileTypeToCaesarCode), [2, 3, 4, 14, 8, 9, 1]);
  assert.deepEqual(['X', 'Y', 'Z'].map(restraintTypeToCaesarCode), [17, 19, 18]);
});

// GOLDEN-30 rev 3 finding J (Owner "fix J", 14 Nov): the line list's insulation thickness was also
// written into the branch's InsulationDensity (50 mm became 50 kg/m3). Thickness goes to
// InsulationThickness only; the source density stays.
test('J: line-list insulation thickness never overwrites InsulationDensity', async () => {
  const { xmlCiiApplyLineListProcessData } = await import('../v045/tabs/model-converters/converters/xmltocii2019_helper/enrichment-core.js');
  const document = { createElement: (name) => new Element(name) };
  const branch = new Element('Branch');
  const density = branch.appendChild(new Element('InsulationDensity'));
  density.textContent = '120';
  xmlCiiApplyLineListProcessData(document, branch, { lineNo: 'P0001', t1: '340', insThk: '50' }, {}, 'P0001');
  const kid = (name) => branch.childNodes.find((c) => c.localName === name)?.textContent;
  assert.equal(kid('InsulationThickness'), '50');
  assert.equal(kid('InsulationDensity'), '120');
  for (const file of ['v045/tabs/model-converters/converters/xmltocii2019_helper/enrichment-core.js',
    'tabs/model-converters/converters/xmltocii2019_helper/enrichment-core-legacy.js',
    'docs/tabs/model-converters/converters/xmltocii2019_helper/enrichment-core-legacy.js',
    'tabs/model-converters/legacy-adapter.js', 'docs/tabs/model-converters/legacy-adapter.js']) {
    assert.doesNotMatch(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), /'InsulationDensity',\s*insThk/, file);
  }
});

// GOLDEN-30 finding K (Owner, 15 Nov: "This should be as per linelist, add the missing column in
// '4 preview'"): the CII takes insulation from each node, so the line list value reaches every node.
test('K: line-list insulation thickness reaches every node of the branch, and both previews show it', async () => {
  const { xmlCiiApplyLineListProcessData } = await import('../v045/tabs/model-converters/converters/xmltocii2019_helper/enrichment-core.js');
  const document = { createElement: (name) => new Element(name) };
  const branch = new Element('Branch');
  const nodes = [0, 1].map(() => branch.appendChild(new Element('Node')));
  nodes[0].appendChild(new Element('InsulationThickness')).textContent = '0';
  xmlCiiApplyLineListProcessData(document, branch, { lineNo: 'P0004', insThk: '40' }, {}, 'P0004');
  assert.deepEqual(nodes.map((n) => val(n, 'InsulationThickness')), ['40', '40']);
  assert.equal(val(branch, 'InsulationThickness'), '40');
  const ui = 'v045/tabs/xml-cii-2019-standalone/ui-adapted/';
  const src = (f) => readFileSync(new URL(`../${ui}${f}`, import.meta.url), 'utf8');
  assert.match(src('xml-cii-adapted-preview-dryrun-core.js'), /insThk,\s*insThkSource,/);
  assert.match(src('xml-cii-adapted-editable-preview-table.js'), /renderProcessField\('insThk'/);
  assert.match(src('xml-cii-adapted-mode-a-consolidated.js'), /'Insulation Thk'[\s\S]*td\(row\.insThk/);
});

// GOLDEN-30 rev 3 finding L (Owner, 14 Nov: "based on Source xml"): a wall the source XML states
// (> 0) is kept over the piping-class fill; wall 0 (every AVEVA export) is still filled.
test('L: a wall stated in the source XML wins over the piping-class fill', async () => {
  const { installWeightBasisXmlDom } = await import('../tabs/xml-cii-2019-standalone/workers/weight-basis-xml-dom.js');
  installWeightBasisXmlDom(globalThis);
  const { snapshotSourceWalls, restoreSourceWalls, expectSourceWalls } = await import('../v045/tabs/xml-cii-2019-standalone/xml-cii-source-wall.js');
  const node = (n, type, ref, ep, wall) => `<Node><NodeNumber>${n}</NodeNumber><ComponentType>${type}</ComponentType><ComponentRefNo>${ref}</ComponentRefNo><Endpoint>${ep}</Endpoint><WallThickness>${wall}</WallThickness></Node>`;
  const doc = (nodes) => `<PipeStressExport><Pipe><Branch><Branchname>/L1/B1</Branchname>${nodes.join('')}</Branch></Pipe></PipeStressExport>`;
  const source = doc([node(10, 'FLAN', '=1/1', 1, '12.7'), node(-1, 'FLAN', '=1/2', 2, '12.7'), node(60, 'ATTA', '=1/3', 0, '0')]);
  // Step 10 filled 8.18 from the class and renumbered the -1 flange end to 19.
  const run = doc([node(10, 'FLAN', '=1/1', 1, '8.18'), node(19, 'FLAN', '=1/2', 2, '8.18'), node(60, 'ATTA', '=1/3', 0, '8.18')]);
  const walls = snapshotSourceWalls(source);
  assert.equal(walls.size, 2);
  const out = restoreSourceWalls(run, walls);
  assert.deepEqual([...out.xmlText.matchAll(/<WallThickness>([^<]*)/g)].map((m) => m[1]), ['12.7', '12.7', '8.18']);
  assert.deepEqual(out.kept.map((k) => [k.nodeNumber, k.nodeOrdinal, k.runValue]), [['10', 0, '8.18'], ['19', 1, '8.18']]);
  const expected = expectSourceWalls([{ scope: 'node', branchName: '/L1/B1', nodeOrdinal: 1, path: ['WallThickness'], expected: '8.18' },
    { scope: 'node', branchName: '/L1/B1', nodeOrdinal: 2, path: ['WallThickness'], expected: '8.18' }], out.kept);
  assert.deepEqual(expected.map((e) => e.expected), ['12.7', '8.18']);
  assert.equal(snapshotSourceWalls(doc([node(10, 'FLAN', '=1/1', 1, '0')])), null, 'AVEVA wall 0 states nothing');
  assert.match(readFileSync(new URL('../v045/tabs/xml-cii-2019-standalone/xml-cii-standalone-run-parity.js', import.meta.url), 'utf8'),
    /restoreSourceWalls\(boreAuthority\.xmlText, sourceWalls\);[\s\S]*restoreTransferProtection\(walls\.xmlText, protection\)/, 'source walls are put back before transfers, so a transfer still wins');
});
