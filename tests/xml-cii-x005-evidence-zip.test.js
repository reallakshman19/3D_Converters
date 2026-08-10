const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const zlib = require('zlib');

const root = path.resolve(__dirname, '..');
const zipPath = path.join(root, 'tabs/xml-cii-2019-standalone/xml-cii-evidence-zip.js');
let source = fs.readFileSync(zipPath, 'utf8')
  .replace(/^import\s+[^;]+;\s*$/gm, '')
  .replace(/\bexport\s+(?=function|const|let|class)/g, '');
source += '\n;globalThis.__x005 = { crc32XmlCiiZip, buildDeterministicXmlCiiZip, buildXmlCiiEvidenceZipPackage };';
function digest(value) {
  const raw = String(value ?? '');
  let hash = 0x811c9dc5;
  for (let i = 0; i < raw.length; i += 1) { hash ^= raw.charCodeAt(i); hash = Math.imul(hash, 0x01000193) >>> 0; }
  return `fnv1a32:${hash.toString(16).padStart(8, '0')}:${raw.length}`;
}
const context = vm.createContext({ console, TextEncoder, Uint8Array, Uint32Array, DataView, Blob, URL, setTimeout, digestXmlCiiEvidenceText: digest });
new vm.Script(source, { filename: zipPath }).runInContext(context);
const api = context.__x005;

assert.strictEqual(api.crc32XmlCiiZip(new TextEncoder().encode('123456789')), 0xcbf43926);

const state = {
  sourceNameOverride: 'GLRD-1000-PI-01.xml',
  sourceText: '<source/>',
  result: {
    enrichedText: '<enriched/>',
    enrichedEvidenceXml: '<ConversionEvidence><preview/><RigidMatch1/><Rigidmatch2/></ConversionEvidence>\n',
    ciiText: 'CII\n',
    conversionEvidence: { schema: 'xml-cii-conversion-evidence/v1' },
    conversionEvidenceDigests: {
      engineRequestXmlDigest: digest('<engine/>'),
      converterParseXmlDigest: digest('<parse/>'),
      ciiDigest: digest('CII\n'),
    },
    diagnostics: {
      engineRequestXmlText: '<engine/>',
      converterParseXmlText: '<parse/>',
      runParityEvidence: { ok: true, engineInputDigest: digest('<engine/>') },
      runParityStats: { endpointOutsideDiameterResolvedFromFlowPath: 6 },
      weightConservation: [{ physicalComponentGroupId: '/B1::R1', status: 'conserved-single-owner', selectedPhysicalMassKg: 15, childMassSumKg: 15 }],
    },
    topologyFindingsText: '{"schema":"topology"}',
    ciiInputSource: 'original',
  },
};
const first = api.buildXmlCiiEvidenceZipPackage(state);
const second = api.buildXmlCiiEvidenceZipPackage(state);
assert.deepStrictEqual(Buffer.from(first.bytes), Buffer.from(second.bytes), 'ZIP output must be byte-deterministic.');
assert.strictEqual(first.manifest.qualificationStatus, 'PACKAGE_COMPLETE');
assert.deepStrictEqual(first.manifest.missingRequired, []);
assert.strictEqual(first.zipName, 'GLRD-1000-PI-01.enriched-evidence.zip');

function readStoredZip(buffer) {
  const files = new Map();
  let offset = 0;
  while (offset + 4 <= buffer.length) {
    const sig = buffer.readUInt32LE(offset);
    if (sig !== 0x04034b50) break;
    const method = buffer.readUInt16LE(offset + 8);
    assert.strictEqual(method, 0, 'X005 ZIP must use deterministic STORE mode.');
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const name = buffer.subarray(nameStart, nameStart + nameLength).toString('utf8');
    const dataStart = nameStart + nameLength + extraLength;
    files.set(name, buffer.subarray(dataStart, dataStart + compressedSize));
    offset = dataStart + compressedSize;
  }
  return files;
}

const files = readStoredZip(Buffer.from(first.bytes));
const folder = 'GLRD-1000-PI-01/';
for (const name of [
  'GLRD-1000-PI-01.source.xml',
  'GLRD-1000-PI-01.enriched.xml',
  'GLRD-1000-PI-01.enriched-evidence.xml',
  'GLRD-1000-PI-01.engine-input.xml',
  'GLRD-1000-PI-01.converter-parse-input.xml',
  'GLRD-1000-PI-01.cii',
  'GLRD-1000-PI-01.diagnostics.json',
  'GLRD-1000-PI-01.topology.json',
  'GLRD-1000-PI-01.geometry-parity.json',
  'GLRD-1000-PI-01.weight-conservation.json',
  'GLRD-1000-PI-01.manifest.json',
]) assert(files.has(folder + name), `Missing ZIP artifact ${name}`);
assert.strictEqual(files.get(folder + 'GLRD-1000-PI-01.engine-input.xml').toString('utf8'), '<engine/>');
assert.strictEqual(files.get(folder + 'GLRD-1000-PI-01.converter-parse-input.xml').toString('utf8'), '<parse/>');
const manifest = JSON.parse(files.get(folder + 'GLRD-1000-PI-01.manifest.json').toString('utf8'));
assert.strictEqual(manifest.qualificationStatus, 'PACKAGE_COMPLETE');
assert.strictEqual(manifest.deterministicZip, true);

const phaseSource = fs.readFileSync(path.join(root, 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-phase-panels.js'), 'utf8');
assert(phaseSource.includes('appendXmlCiiEvidenceZipControl(card, stateRef)'));
const controlSource = fs.readFileSync(path.join(root, 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-evidence-zip.js'), 'utf8');
assert(controlSource.includes("createElement('button', 'Save Enriched XML ZIP')"));
const custodySource = fs.readFileSync(path.join(root, 'converters/scripts/xml_to_cii2019_coordinate_custody.py'), 'utf8');
assert(custodySource.includes('CONVERTER_PARSE_XML_PATH='));
const engineSource = fs.readFileSync(path.join(root, 'converters/xml-cii-2019-standalone/engine.js'), 'utf8');
assert(engineSource.includes("lastMarker(stdout, 'CONVERTER_PARSE_XML_PATH')"));
assert(engineSource.includes('converterParseXmlText = pyodide.FS.readFile'));

console.log('XML CII X005 deterministic evidence ZIP local regression passed.');
