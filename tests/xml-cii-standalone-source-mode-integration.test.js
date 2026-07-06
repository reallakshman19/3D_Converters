const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

const root = path.resolve(__dirname, '..');
const fixtureRoot = path.join(root, 'tests/fixtures/xml-cii-standalone');
function read(relPath) { return fs.readFileSync(path.join(root, relPath), 'utf8'); }
function readFixture(name) { return fs.readFileSync(path.join(fixtureRoot, name), 'utf8'); }
function copyFile(tempRoot, relPath) { const target = path.join(tempRoot, relPath); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(path.join(root, relPath), target); }
function gitBlobSha(text) { const buf = Buffer.from(text, 'utf8'); return crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${buf.length}\0`), buf])).digest('hex'); }

function fixtureFiles() {
  return [
    'tabs/xml-cii-2019-standalone/xml-cii-source-mode-integration-proof.js',
    'tabs/xml-cii-2019-standalone/xml-cii-master-context.js',
    'tabs/xml-cii-2019-standalone/xml-cii-regex-tester.js',
    'tabs/xml-cii-2019-standalone/xml-cii-resolver-json-trace.js',
    'tabs/xml-cii-2019-standalone/xml-cii-manual-element-sideload.js',
    'tabs/xml-cii-2019-standalone/xml-cii-preview-diagnostics-audit.js',
    'tabs/xml-cii-2019-standalone/xml-cii-weight-match.js',
    'tabs/xml-cii-2019-standalone/xml-cii-support-type-mapper.js',
    'tabs/xml-cii-2019-standalone/xml-cii-output-run-readiness.js',
    'tabs/xml-cii-2019-standalone/xml-cii-workflow-api.js',
    'tabs/xml-cii-2019-standalone/xml-cii-workflow-types.js',
    'tabs/xml-cii-2019-standalone/xml-cii-workflow-source-detect.js',
    'tabs/xml-cii-2019-standalone/xml-cii-workflow-service.js',
    'tabs/xml-cii-2019-standalone/xml-cii-workflow-engine-client.js',
    'tabs/xml-cii-2019-standalone/xml-cii-inputxml-enrichment.js',
    'tabs/xml-cii-2019-standalone/xml-cii-workflow-ui-adapter.js',
    'tabs/xml-cii-2019-standalone/xml-cii-standalone-default-config.js',
    'converters/xml-cii2019-core/master-context.js',
    'converters/xml-cii2019-core/config.js',
    'converters/xml-cii2019-core/piping-class-resolver.js',
    'converters/xml-cii2019-core/pipe-component-data-adapter.js',
    'converters/xml-cii2019-core/support-mapping-config.js',
    'converters/xml-cii2019-core/line-density-resolver.js',
    'converters/xml-cii2019-core/linelist-mapping.js',
    'support/SupportKindResolver.js',
    'vendor/create-pipe-data-db.js',
  ];
}

function prepareEsmFixture() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'xml-cii-source-mode-proof-'));
  fs.writeFileSync(path.join(tempRoot, 'package.json'), '{"type":"module"}', 'utf8');
  for (const relPath of fixtureFiles()) copyFile(tempRoot, relPath);
  return tempRoot;
}

class SimpleElement { constructor(name) { this.nodeName = name; this.localName = name; this.attributes = new Map(); this.children = []; this.parentNode = null; this._textContent = ''; } getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; } setAttribute(name, value) { this.attributes.set(name, String(value)); } hasAttribute(name) { return this.attributes.has(name); } removeAttribute(name) { this.attributes.delete(name); } appendChild(child) { child.parentNode = this; this.children.push(child); return child; } remove() { if (!this.parentNode) return; const i = this.parentNode.children.indexOf(this); if (i >= 0) this.parentNode.children.splice(i, 1); } get textContent() { return this.children.length ? this.children.map((child) => child.textContent).join('') : this._textContent; } set textContent(value) { this.children = []; this._textContent = String(value ?? ''); } }
class SimpleDocument { constructor(rootElement) { this.documentElement = rootElement; } createElement(name) { return new SimpleElement(name); } querySelector() { return null; } getElementsByTagName(name) { const out = []; const wanted = String(name).toUpperCase(); const visit = (node) => { if (String(node.localName || node.nodeName).toUpperCase() === wanted) out.push(node); for (const child of node.children || []) visit(child); }; if (this.documentElement) visit(this.documentElement); return out; } }
function decodeEntities(value) { return String(value).replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&'); }
function parseAttrs(attrText, element) { String(attrText || '').replace(/([A-Za-z_][\w:.-]*)\s*=\s*"([^"]*)"/g, (_, key, value) => { element.setAttribute(key, decodeEntities(value)); return ''; }); }
function parseXml(xmlText) { const stack = []; let rootElement = null; for (const token of String(xmlText).replace(/^\s*<\?xml[^>]*>\s*/i, '').match(/<[^>]+>|[^<]+/g) || []) { if (!token.trim() || token.startsWith('<?') || token.startsWith('<!--')) continue; if (token.startsWith('</')) { stack.pop(); continue; } if (token.startsWith('<')) { const selfClosing = /\/?>\s*$/.test(token) && /\/\s*>$/.test(token); const body = token.slice(1, selfClosing ? -2 : -1).trim(); const name = body.match(/^([^\s/>]+)/)?.[1]; if (!name) continue; const el = new SimpleElement(name); parseAttrs(body.slice(name.length), el); if (!rootElement) rootElement = el; if (stack.length) stack[stack.length - 1].appendChild(el); if (!selfClosing) stack.push(el); } else if (stack.length) stack[stack.length - 1]._textContent += decodeEntities(token); } return new SimpleDocument(rootElement); }
function escapeText(value) { return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function escapeAttr(value) { return escapeText(value).replace(/"/g, '&quot;'); }
function serializeNode(node) { const attrs = Array.from(node.attributes.entries()).map(([name, value]) => ` ${name}="${escapeAttr(value)}"`).join(''); const body = `${node._textContent ? escapeText(node._textContent) : ''}${node.children.map(serializeNode).join('')}`; return body ? `<${node.nodeName}${attrs}>${body}</${node.nodeName}>` : `<${node.nodeName}${attrs}/>`; }

globalThis.DOMParser = class { parseFromString(text) { return parseXml(text); } };
globalThis.XMLSerializer = class { serializeToString(node) { return node instanceof SimpleDocument ? serializeNode(node.documentElement) : serializeNode(node); } };

function protectedRouteShas() {
  return {
    'tabs/model-converters/WorkflowShell.js': '5160dada907b597584f259fe8130727e7554e218',
    'tabs/model-converters/xml-cii-workflow-runner.js': '407b990f9442ffe83abdec60f30ffe1c2e032f9b',
    'tabs/model-converters/xml-cii-finalise-run-button.js': '9075e3d0f8962b326d3c0a710213075f9ad300bc',
    'converters/py-worker.js': '70f390ca861d44967c41cc9c19c7f1757a9c6296',
    'converters/invocation-builder.js': '33e2ec1b9f4fb3f5a39e25bcc9dd0fc33808ba26',
  };
}

(async () => {
  const tempRoot = prepareEsmFixture();
  const proofApi = await import(pathToFileURL(path.join(tempRoot, 'tabs/xml-cii-2019-standalone/xml-cii-source-mode-integration-proof.js')).href);
  const psiExpected = readFixture('psi116-basic-expected-enriched.xml');
  const xmlEngineCalls = [];
  const inputXmlEngineCalls = [];
  const report = await proofApi.buildStandaloneSourceModeIntegrationProof({
    xmlMode: { sourceName: 'psi116-basic-input.xml', sourceText: readFixture('psi116-basic-input.xml'), outputMode: 'both', supportMapperTestInput: 'Pipe Rest and Guide', componentRows: [{ id: 'xml-weight-gap', componentType: 'VALVE', bore: '10', rating: '900', length: '250', weight: '0' }] },
    inputXmlMode: { sourceName: 'inputxml-side-load-input.xml', sourceText: readFixture('inputxml-side-load-input.xml'), elementSideLoadText: readFixture('inputxml-side-load.txt'), outputMode: 'both', supportMapperTestInput: 'DTXR_POS=Pipe Rest\nDTXR_PS=Directional Anchor', componentRows: [{ id: 'inputxml-weight-gap', componentType: 'VALVE', bore: '10', rating: '900', length: '250', weight: '0' }] },
    xmlRuntime: { engineRunner: async (job) => { xmlEngineCalls.push(job); return { ok: true, sourceKind: 'xml', outputKind: 'enrichedXML', enrichedText: psiExpected, enrichedName: 'psi116.integration.xml', ciiText: 'XML CII', ciiName: 'psi116.integration.cii', diagnostics: { integration: true }, logs: ['xml integration engine'] }; } },
    inputXmlRuntime: { engineRunner: async (job) => { inputXmlEngineCalls.push(job); assert.strictEqual(job.options.outputMode, 'cii-only'); return { ok: true, sourceKind: 'inputxml', outputKind: 'enrichedInputXML', enrichedText: '', enrichedName: '', ciiText: 'INPUTXML CII', ciiName: 'inputxml.integration.cii', diagnostics: { integration: true }, logs: ['inputxml integration engine'] }; } },
  });
  assert.strictEqual(report.schema, 'xml-cii-2019-source-mode-integration-proof/v1');
  assert.strictEqual(report.xmlMode.status, 'passed', `XML proof gaps: ${report.xmlMode.gaps.join(',')}`);
  assert.strictEqual(report.inputXmlMode.status, 'passed', `InputXML proof gaps: ${report.inputXmlMode.gaps.join(',')}`);
  assert.strictEqual(report.overallStatus, 'passed');
  assert(report.xmlMode.apiBoundaryUsed, 'XML proof must use public API boundary');
  assert(report.inputXmlMode.apiBoundaryUsed, 'InputXML proof must use public API boundary');
  assert.strictEqual(xmlEngineCalls.length, 1, 'XML mode must call fake engine through API once');
  assert.strictEqual(inputXmlEngineCalls.length, 1, 'InputXML both mode must call fake CII engine once after enrichment');
  assert.strictEqual(xmlEngineCalls[0].sourceKind, 'xml');
  assert.strictEqual(inputXmlEngineCalls[0].sourceKind, 'inputxml');
  assert(report.xmlMode.artifacts.enriched, 'XML enriched artifact expected');
  assert(report.xmlMode.artifacts.cii, 'XML CII artifact expected');
  assert(report.inputXmlMode.artifacts.enriched, 'InputXML enriched artifact expected');
  assert(report.inputXmlMode.artifacts.cii, 'InputXML CII artifact expected');
  assert.deepStrictEqual(report.protectedRoutes.changedForbiddenFiles, []);

  for (const [file, sha] of Object.entries(protectedRouteShas())) assert.strictEqual(gitBlobSha(read(file)), sha, `${file} must remain unchanged`);
  const helperSource = read('tabs/xml-cii-2019-standalone/xml-cii-source-mode-integration-proof.js');
  for (const token of ['document', 'querySelector', 'createElement', 'window']) assert(!helperSource.includes(token), `integration helper must be DOM-free: ${token}`);
  assert(helperSource.includes('runXmlCii2019Workflow(job, runtime)'), 'integration proof must call public final API boundary');
  const workflowSource = read('.github/workflows/xml-cii-standalone-mission01.yml');
  assert(workflowSource.includes('xml-cii-standalone-source-mode-integration.test.js'), 'workflow must run Mission J integration test');

  console.log('XML CII standalone source-mode integration checks passed.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
