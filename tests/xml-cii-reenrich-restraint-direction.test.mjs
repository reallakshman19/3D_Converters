// Owner, 14 Nov 2026: converting an already-enriched XML runs enrichment a second time. A node
// with an existing +Y (direction 0,1,0) and an existing GUI with no direction and a CMPSUPGAP note
// came out with the GUI turned vertical (0,1,0) and its CMPSUPGAP dropped, which changed 12 guide
// records in the CII. A re-enriched restraint must keep its own direction (or none) and its note.
import assert from 'node:assert/strict';
import test from 'node:test';
import * as mainCopy from '../converters/xml-cii2019-core/support-mapping-legacy.js';
// The live main app serves step 10 (Output / Run) from v045/, which has its own copy.
import * as v045Copy from '../v045/converters/xml-cii2019-core/support-mapping.js';
import { readFileSync } from 'node:fs';

// The 3D Model Converters tab has its own reader in legacy-adapter.js (that module needs a
// browser to import), so its source is taken as is and run against the shared writer.
const tabSource = readFileSync(new URL('../tabs/model-converters/legacy-adapter.js', import.meta.url), 'utf8');
const tabReaderSource = /function _xmlCiiTypeEntryFromExistingRestraint\(restraint, config\) \{[\s\S]*?\n\}/.exec(tabSource)[0];
const tabReader = new Function('xmlCiiTypeEntryFromExistingRestraint', '_normalizeExistingXmlCiiRestraintType', '_xmlText',
  `${tabReaderSource}\nreturn _xmlCiiTypeEntryFromExistingRestraint;`)(
  mainCopy.xmlCiiTypeEntryFromExistingRestraint,
  (t) => String(t ?? '').trim().toUpperCase(),
  (el, name) => el.childNodes.find((c) => c.localName === name)?.textContent ?? '');
const tabCopy = { xmlCiiTypeEntryFromExistingRestraint: tabReader, applyXmlRestraints: mainCopy.applyXmlRestraints };

class Element {
  constructor(name) { this.localName = name; this.nodeName = name; this.nodeType = 1; this.namespaceURI = null; this.childNodes = []; this._text = ''; }
  get textContent() { return this.childNodes.length ? this.childNodes.map((c) => c.textContent).join('') : this._text; }
  set textContent(value) { this.childNodes = []; this._text = String(value); }
  appendChild(child) { this.childNodes.push(child); return child; }
  removeChild(child) { this.childNodes = this.childNodes.filter((c) => c !== child); return child; }
}
const document = { createElement: (name) => new Element(name), createElementNS: (_, name) => new Element(name) };
const el = (name, fields) => {
  const e = new Element(name);
  for (const [k, v] of Object.entries(fields)) { const c = new Element(k); c.textContent = v; e.appendChild(c); }
  return e;
};
const kids = (node, name) => node.childNodes.filter((c) => c.localName === name);
const val = (node, name) => kids(node, name)[0]?.textContent;

function enrichedNode() {
  const node = new Element('Node');
  node.appendChild(el('Restraint', { Type: '+Y', Stiffness: '1751270000000', Gap: '0', Friction: '0.3',
    DirectionCosineX: '0.000000000', DirectionCosineY: '1.000000000', DirectionCosineZ: '0.000000000' }));
  node.appendChild(el('Restraint', { Type: 'GUI', Stiffness: '1751270000000', Gap: '5', Friction: '-1.010100', CMPSUPGAP: '5mm GAP' }));
  return node;
}

for (const [label, lib] of [['main', mainCopy], ['v045', v045Copy], ['model-converters tab', tabCopy]]) {
  function reenrich(node) {
    const entries = kids(node, 'Restraint').map((r) => lib.xmlCiiTypeEntryFromExistingRestraint(r, {})).filter((e) => e.type);
    lib.applyXmlRestraints(document, node, entries, {});
    return node;
  }

  test(`${label}: second pass keeps a direction-less GUI direction-less and keeps its CMPSUPGAP`, () => {
    const node = reenrich(enrichedNode());
    const [rest, gui] = kids(node, 'Restraint');
    assert.equal(val(rest, 'Type'), '+Y');
    assert.equal(val(rest, 'DirectionCosineY'), '1.000000000');
    assert.equal(val(gui, 'Type'), 'GUI');
    assert.equal(val(gui, 'DirectionCosineX'), undefined);
    assert.equal(val(gui, 'DirectionCosineY'), undefined);
    assert.equal(val(gui, 'Gap'), '5');
    assert.equal(val(gui, 'CMPSUPGAP'), '5mm GAP');
  });

  test(`${label}: re-enrichment is idempotent: a third pass changes nothing`, () => {
    const snap = (n) => JSON.stringify(kids(n, 'Restraint').map((r) => r.childNodes.map((c) => [c.localName, c.textContent])));
    const twice = reenrich(enrichedNode());
    const before = snap(twice);
    assert.equal(snap(reenrich(twice)), before);
  });

  test(`${label}: a restraint with its own direction keeps exactly that direction`, () => {
    const node = new Element('Node');
    node.appendChild(el('Restraint', { Type: '+Y', Stiffness: '1', Gap: '0', Friction: '0.3',
      DirectionCosineX: '0.000000000', DirectionCosineY: '1.000000000', DirectionCosineZ: '0.000000000' }));
    node.appendChild(el('Restraint', { Type: 'GUI', Stiffness: '1', Gap: '0', Friction: '-1.010100',
      DirectionCosineX: '0.000000000', DirectionCosineY: '0.000000000', DirectionCosineZ: '1.000000000' }));
    const [, gui] = kids(reenrich(node), 'Restraint');
    assert.equal(val(gui, 'DirectionCosineZ'), '1.000000000');
    assert.equal(val(gui, 'DirectionCosineY'), '0.000000000');
  });
}
