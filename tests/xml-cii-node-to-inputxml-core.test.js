const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

const root = path.resolve(__dirname, '..');

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8');
}

class SimpleElement {
  constructor(name) {
    this.nodeName = name;
    this.localName = name;
    this.attributes = new Map();
    this.children = [];
    this.parentNode = null;
    this._textContent = '';
  }
  getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  hasAttribute(name) { return this.attributes.has(name); }
  removeAttribute(name) { this.attributes.delete(name); }
  appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
  remove() { if (!this.parentNode) return; const idx = this.parentNode.children.indexOf(this); if (idx >= 0) this.parentNode.children.splice(idx, 1); this.parentNode = null; }
  get textContent() { return this.children.length ? this.children.map((child) => child.textContent).join('') : this._textContent; }
  set textContent(value) { this.children = []; this._textContent = String(value ?? ''); }
}

class SimpleDocument {
  constructor(rootElement) {
    this.documentElement = rootElement;
    this.children = rootElement ? [rootElement] : [];
  }
  createElement(name) { return new SimpleElement(name); }
  querySelector(selector) { return selector === 'parsererror' ? null : null; }
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
  return String(value)
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

function parseAttributes(attrText, element) {
  const pattern = /([A-Za-z_][\w:.-]*)\s*=\s*"([^"]*)"/g;
  let match;
  while ((match = pattern.exec(attrText))) element.setAttribute(match[1], decodeEntities(match[2]));
}

function parseXml(xmlText) {
  const source = String(xmlText).replace(/^\s*<\?xml[^>]*>\s*/i, '');
  const tokenPattern = /<[^>]+>|[^<]+/g;
  const stack = [];
  let rootElement = null;
  let token;
  while ((token = tokenPattern.exec(source))) {
    const part = token[0];
    if (!part.trim()) continue;
    if (part.startsWith('<!--') || part.startsWith('<?')) continue;
    if (part.startsWith('</')) { stack.pop(); continue; }
    if (part.startsWith('<')) {
      const selfClosing = /\/>\s*$/.test(part);
      const body = part.slice(1, selfClosing ? -2 : -1).trim();
      const nameMatch = body.match(/^([^\s/>]+)/);
      if (!nameMatch) continue;
      const element = new SimpleElement(nameMatch[1]);
      parseAttributes(body.slice(nameMatch[1].length), element);
      if (!rootElement) rootElement = element;
      if (stack.length) stack[stack.length - 1].appendChild(element);
      if (!selfClosing) stack.push(element);
    } else if (stack.length) {
      stack[stack.length - 1]._textContent += decodeEntities(part);
    }
  }
  if (!rootElement) throw new Error('No root element parsed.');
  return new SimpleDocument(rootElement);
}

function escapeText(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeAttr(value) { return escapeText(value).replace(/"/g, '&quot;'); }
function serializeNode(node) {
  const attrs = Array.from(node.attributes.entries()).map(([name, value]) => ` ${name}="${escapeAttr(value)}"`).join('');
  if (!node.children.length && !node._textContent) return `<${node.nodeName}${attrs}/>`;
  const body = `${node._textContent ? escapeText(node._textContent) : ''}${node.children.map(serializeNode).join('')}`;
  return `<${node.nodeName}${attrs}>${body}</${node.nodeName}>`;
}

globalThis.DOMParser = class { parseFromString(text) { return parseXml(text); } };
globalThis.XMLSerializer = class { serializeToString(node) { return node instanceof SimpleDocument ? serializeNode(node.documentElement) : serializeNode(node); } };

function prepareEsmFixture() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'xml-cii-5c-test-'));
  fs.writeFileSync(path.join(tempRoot, 'package.json'), '{"type":"module"}', 'utf8');
  const files = [
    'tabs/model-converters/xml-cii-node-to-inputxml-core.js',
    'tabs/xml-cii-2019-standalone/xml-cii-inputxml-enrichment.js',
    'tabs/xml-cii-2019-standalone/xml-cii-workflow-types.js',
  ];
  for (const relPath of files) {
    const sourcePath = path.join(root, relPath);
    const targetPath = path.join(tempRoot, relPath);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(sourcePath, targetPath);
  }
  return tempRoot;
}

function assertLauncherSemantics(result) {
  assert.strictEqual(result.ok, true, '5C generator should succeed');
  assert(result.coreInputXmlText.includes('<CAESARII xmlns="COADE" VERSION="11.00" XML_TYPE="Input">'), 'core output must be CAESARII InputXML');
  assert(result.coreInputXmlText.includes('FROM_NODE="10.000000" TO_NODE="20.000000"'), 'first launcher element should use first available positive route nodes 10 -> 20');
  assert(result.coreInputXmlText.includes('DELTA_Z="181.900000"'), 'first launcher element should map AVEVA northing delta into CAESAR Z with project north convention');
  assert(result.coreInputXmlText.includes('<RIGID WEIGHT="430.000000" TYPE="Unspecified"/>'), 'node 20 RIGID evidence should generate a RIGID child with converted weight');
  assert(result.coreInputXmlText.includes('<RESTRAINT NUM="1" NODE="30.000000" TYPE="17.000000"'), 'node-level +Y support should generate a CAESAR restraint at node 30');
  assert(result.elementSideLoadText.includes('ELEMENT 20->30'), 'side-load should include generated element keys');
  assert(result.elementSideLoadText.includes('DTXR_PS=Pipe Rest XRT01'), 'side-load should carry node DTXR_PS evidence');
  assert(result.diagnostics.summary.elementCount > 20, 'launcher benchmark should generate many elements from positive topology route nodes');
  assert(result.diagnostics.summary.rigidCount > 0, 'diagnostics should count rigid evidence');
  assert(result.diagnostics.summary.restraintNodeCount > 0, 'diagnostics should count source node restraints');
  assert(result.finalInputXmlText.includes('<Point_properties_basis>TO</Point_properties_basis>'), 'existing enrichment module should be applied to matched side-load rows');
}

function assertSifSemantics(api) {
  const synthetic = `<PipeStressExport><Pipe><Branch><Branchname>/SIF-TEST/B1</Branchname><Node><NodeNumber>10</NodeNumber><ComponentType>PIPE</ComponentType><Position>0 0 0</Position><OutsideDiameter>168.3</OutsideDiameter></Node><Node><NodeNumber>20</NodeNumber><ComponentType>BRAN</ComponentType><ConnectionType>TEE</ConnectionType><Position>100 0 0</Position><OutsideDiameter>168.3</OutsideDiameter><SIF>1</SIF></Node></Branch></Pipe></PipeStressExport>`;
  const result = api.buildInputXmlFromNodeXml(synthetic, { applyEnrichment: false, defaultTeeSifType: 5 });
  assert(result.coreInputXmlText.includes('<SIF NODE="20.000000" TYPE="5.000000"'), 'TEE/BRAN evidence should generate an SIF slot at TO node using default type 5');
  assert.strictEqual(result.diagnostics.summary.sifCount, 1, 'diagnostics should count generated SIF node evidence');
}

(async () => {
  const tempRoot = prepareEsmFixture();
  const api = await import(pathToFileURL(path.join(tempRoot, 'tabs/model-converters/xml-cii-node-to-inputxml-core.js')).href);
  const launcherXml = read('Benchmarks/LAUNCHERTOPO.XML');
  const result = api.buildInputXmlFromNodeXml(launcherXml, {
    sourceName: 'LAUNCHERTOPO.XML',
    supportConfigJson: JSON.stringify({ defaultTeeSifType: 5, defaultFriction: 0.3, defaultStiffness: 1751270000000, defaultGap: 0 }),
  });
  assertLauncherSemantics(result);
  assertSifSemantics(api);
  console.log('XML CII 5C node-to-InputXML core checks passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
