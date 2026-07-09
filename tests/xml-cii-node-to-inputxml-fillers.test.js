const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

const root = path.resolve(__dirname, '..');

class SimpleElement {
  constructor(name) {
    this.nodeName = name;
    this.localName = name;
    this.children = [];
    this.parentNode = null;
    this._textContent = '';
  }
  appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
  get textContent() { return this.children.length ? this.children.map((child) => child.textContent).join('') : this._textContent; }
  set textContent(value) { this.children = []; this._textContent = String(value ?? ''); }
}
class SimpleDocument {
  constructor(rootElement) { this.documentElement = rootElement; this.children = rootElement ? [rootElement] : []; }
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
  const source = String(xmlText).replace(/^\s*<\?xml[^>]*>\s*/i, '');
  const tokenPattern = /<[^>]+>|[^<]+/g;
  const stack = [];
  let rootElement = null;
  let token;
  while ((token = tokenPattern.exec(source))) {
    const part = token[0];
    if (!part.trim() || part.startsWith('<!--') || part.startsWith('<?')) continue;
    if (part.startsWith('</')) { stack.pop(); continue; }
    if (part.startsWith('<')) {
      const selfClosing = /\/>\s*$/.test(part);
      const body = part.slice(1, selfClosing ? -2 : -1).trim();
      const nameMatch = body.match(/^([^\s/>]+)/);
      if (!nameMatch) continue;
      const element = new SimpleElement(nameMatch[1]);
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

globalThis.DOMParser = class { parseFromString(text) { return parseXml(text); } };

function prepareEsmFixture() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'xml-cii-5c-fillers-'));
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

function nodeXml(nodeNumber, x, y, z, od = 100) {
  return `<Node><NodeNumber>${nodeNumber}</NodeNumber><NodeName>N${nodeNumber}</NodeName><ComponentType>PIPE</ComponentType><OutsideDiameter>${od}</OutsideDiameter><Position>${x} ${y} ${z}</Position></Node>`;
}

(async () => {
  const tempRoot = prepareEsmFixture();
  const api = await import(pathToFileURL(path.join(tempRoot, 'tabs/model-converters/xml-cii-node-to-inputxml-core.js')).href);
  const xml = `<PipeStressExport><Pipe>
    <Branch><Branchname>/MAIN</Branchname>${nodeXml(10, 0, 0, 0)}${nodeXml(20, 1000, 0, 0)}${nodeXml(30, 2000, 0, 0)}</Branch>
    <Branch><Branchname>/DEAD-HIT</Branchname>${nodeXml(100, 500, 200, 0)}${nodeXml(110, 500, 50, 0)}</Branch>
    <Branch><Branchname>/DEAD-FAR</Branchname>${nodeXml(200, 1500, 800, 0)}${nodeXml(210, 1500, 700, 0)}</Branch>
    <Branch><Branchname>/PARALLEL</Branchname>${nodeXml(300, 300, 100, 0)}${nodeXml(310, 800, 100, 0)}</Branch>
    <Branch><Branchname>/SHORT</Branchname>${nodeXml(400, 2500, 0, 0)}${nodeXml(410, 2539, 0, 0)}</Branch>
  </Pipe></PipeStressExport>`;
  const result = api.buildInputXmlFromNodeXml(xml, { applyEnrichment: false, fillerNodeBase: 900000 });
  assert.strictEqual(result.ok, true, '5C generator should succeed');
  assert.strictEqual(result.diagnostics.summary.routeElementCount, 6, 'first pass should build the complete base route before ray filler pass');
  assert.strictEqual(result.diagnostics.summary.shortFillerCount, 1, 'first-pass route segment below 50mm should remain a short filler');
  assert.strictEqual(result.diagnostics.summary.rayFillerCount, 1, 'only the dead end with perpendicular hit within 5D should become a ray filler');
  assert(result.diagnostics.shortFillers.some((row) => row.from === 400 && row.to === 410 && row.fillerType === 'short'), 'short filler should be retained as first-pass filler');
  const ray = result.diagnostics.rayFillers[0];
  assert.strictEqual(ray.sourceDeadEndNode, 110, 'ray filler should originate at the true dead end');
  assert.strictEqual(Math.round(ray.lengthMm), 50, 'ray filler length should be the ray distance to perpendicular line hit');
  assert.strictEqual(ray.hitElement, '10->20', 'ray filler should hit the perpendicular main line segment');
  assert(result.diagnostics.fillerRejected.some((row) => row.node === 210 && row.reason === 'NO_PERPENDICULAR_HIT_WITHIN_5D'), 'far dead end should be rejected by 5D rule');
  assert(result.coreInputXmlText.includes('FROM_NODE="110.000000" TO_NODE="900000.000000"'), 'ray filler should be emitted after second-pass detection with a synthetic target node');
  assert(result.coreInputXmlText.includes('FROM_NODE="400.000000" TO_NODE="410.000000"'), 'short filler should remain as the original generated route element');
  assert(result.coreInputXmlText.includes('DELTA_Z="50.000000"'), 'ray filler delta should match the ray length using CAESAR axis mapping');
  console.log('XML CII 5C short and ray filler checks passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
