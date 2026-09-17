const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');
const { createStaticEsmFixture } = require('./xml-cii-standalone-esm-fixture-helper');

const root = path.resolve(__dirname, '..');

class SimpleElement {
  constructor(name) {
    this.nodeType = 1;
    this.nodeName = name;
    this.localName = name;
    this.namespaceURI = '';
    this.children = [];
    this.parentNode = null;
    this._textContent = '';
  }
  get childNodes() { return this.children; }
  appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
  get textContent() { return this.children.length ? this.children.map((child) => child.textContent).join('') : this._textContent; }
  set textContent(value) { this.children = []; this._textContent = String(value ?? ''); }
}

class SimpleDocument {
  constructor(rootElement) { this.documentElement = rootElement; }
  createElement(name) { return new SimpleElement(name); }
  createElementNS(_namespace, name) { return new SimpleElement(name); }
  getElementsByTagName(name) {
    const wanted = String(name).toUpperCase();
    const out = [];
    const visit = (node) => {
      if (String(node.localName || node.nodeName).toUpperCase() === wanted) out.push(node);
      for (const child of node.children || []) visit(child);
    };
    if (this.documentElement) visit(this.documentElement);
    return out;
  }
}

function decodeEntities(value) {
  return String(value).replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
}

function parseXml(xmlText) {
  const tokenPattern = /<[^>]+>|[^<]+/g;
  const stack = [];
  let rootElement = null;
  let token;
  while ((token = tokenPattern.exec(String(xmlText).replace(/^\s*<\?xml[^>]*>\s*/i, '')))) {
    const part = token[0];
    if (!part.trim() || part.startsWith('<!--') || part.startsWith('<?')) continue;
    if (part.startsWith('</')) { stack.pop(); continue; }
    if (!part.startsWith('<')) { if (stack.length) stack[stack.length - 1]._textContent += decodeEntities(part); continue; }
    const selfClosing = /\/>\s*$/.test(part);
    const body = part.slice(1, selfClosing ? -2 : -1).trim();
    const name = body.match(/^([^\s/>]+)/)?.[1];
    if (!name) continue;
    const element = new SimpleElement(name);
    if (!rootElement) rootElement = element;
    if (stack.length) stack[stack.length - 1].appendChild(element);
    if (!selfClosing) stack.push(element);
  }
  if (!rootElement) throw new Error('No root element parsed.');
  return new SimpleDocument(rootElement);
}

function escapeText(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function serializeNode(node) {
  if (!node.children.length) return `<${node.nodeName}>${escapeText(node._textContent)}</${node.nodeName}>`;
  return `<${node.nodeName}>${node.children.map(serializeNode).join('')}</${node.nodeName}>`;
}

globalThis.DOMParser = class { parseFromString(text) { return parseXml(text); } };
globalThis.XMLSerializer = class { serializeToString(node) { return node instanceof SimpleDocument ? serializeNode(node.documentElement) : serializeNode(node); } };

function childText(parent, name) {
  const child = (parent.childNodes || []).find((node) => node.localName === name);
  return String(child?.textContent || '').trim();
}

function nodesByNumber(xmlText) {
  const doc = parseXml(xmlText);
  return new Map(doc.getElementsByTagName('Node').map((node) => [childText(node, 'NodeNumber'), node]));
}

function branchXml(nodes) {
  return `<PipeStressExport><Pipe><Branch><Branchname>/OD-AUTH</Branchname>${nodes.join('')}</Branch></Pipe></PipeStressExport>`;
}

function node(number, type, ref, endpoint, od) {
  return `<Node><NodeNumber>${number}</NodeNumber><ComponentType>${type}</ComponentType><ComponentRefNo>${ref}</ComponentRefNo><Endpoint>${endpoint}</Endpoint><OutsideDiameter>${od}</OutsideDiameter><Position>${number} 0 0</Position></Node>`;
}

async function loadResolver() {
  const { tempRoot } = createStaticEsmFixture(root, {
    prefix: 'xml-cii-effective-od-',
    entryFiles: ['converters/xml-cii2019-core/outside-diameter-resolver.js'],
  });
  return import(pathToFileURL(path.join(tempRoot, 'converters/xml-cii2019-core/outside-diameter-resolver.js')).href);
}

(async () => {
  const { applyXmlCiiOutsideDiameterResolver } = await loadResolver();

  const reported = branchXml([
    node(100, 'PIPE', 'P-LEFT', 0, 60.3),
    node(110, 'FLAN', 'F-1', 1, 60.3),
    node(120, 'FLAN', 'F-1', 2, 26.7),
    node(130, 'PIPE', 'P-RIGHT', 0, 60.3),
  ]);
  const resolved = applyXmlCiiOutsideDiameterResolver(reported);
  const byNumber = nodesByNumber(resolved.xmlText);
  assert.strictEqual(childText(byNumber.get('110'), 'OutsideDiameter'), '60.3');
  assert.strictEqual(childText(byNumber.get('120'), 'OutsideDiameter'), '26.7', 'raw endpoint OD must remain source evidence');
  assert.strictEqual(childText(byNumber.get('110'), 'EffectiveOutsideDiameter'), '60.3');
  assert.strictEqual(childText(byNumber.get('120'), 'EffectiveOutsideDiameter'), '60.3');
  assert.strictEqual(resolved.stats.effectiveOutsideDiameterResolvedFromConnectivity, 2);
  assert.strictEqual(resolved.appliedCount, 2, 'effective OD writes must cause caller to retain returned XML');

  const asymmetric = branchXml([
    node(200, 'PIPE', 'P-60', 0, 60.3),
    node(210, 'VALV', 'V-1', 1, 114.3),
    node(220, 'VALV', 'V-1', 2, 26.7),
    node(230, 'PIPE', 'P-89', 0, 88.9),
  ]);
  const asymmetricResult = applyXmlCiiOutsideDiameterResolver(asymmetric);
  const asymmetricNodes = nodesByNumber(asymmetricResult.xmlText);
  assert.strictEqual(childText(asymmetricNodes.get('210'), 'EffectiveOutsideDiameter'), '60.3');
  assert.strictEqual(childText(asymmetricNodes.get('220'), 'EffectiveOutsideDiameter'), '88.9', 'outward connectivity must preserve side-specific size authority');
  assert.strictEqual(childText(asymmetricNodes.get('210'), 'OutsideDiameter'), '114.3');
  assert.strictEqual(childText(asymmetricNodes.get('220'), 'OutsideDiameter'), '26.7');

  const negative = branchXml([
    node(300, 'PIPE', 'P-A', 0, 60.3),
    node(310, 'INST', 'I-1', 1, 26.7),
    node(320, 'PIPE', 'P-B', 0, 60.3),
    node(330, 'REDU', 'R-1', 1, 60.3),
    node(340, 'REDU', 'R-1', 2, 88.9),
    node(350, 'PIPE', 'P-C', 0, 88.9),
  ]);
  const negativeResult = applyXmlCiiOutsideDiameterResolver(negative);
  const negativeNodes = nodesByNumber(negativeResult.xmlText);
  assert.strictEqual(childText(negativeNodes.get('310'), 'EffectiveOutsideDiameter'), '', 'unpaired/unknown component must not be guessed');
  assert.strictEqual(childText(negativeNodes.get('330'), 'EffectiveOutsideDiameter'), '', 'reducer size-change authority must not be flattened');
  assert.strictEqual(childText(negativeNodes.get('340'), 'EffectiveOutsideDiameter'), '', 'reducer size-change authority must not be flattened');

  console.log('PASS xml-cii outside-diameter effective authority');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
