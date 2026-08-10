const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const evidencePath = path.join(root, 'tabs/xml-cii-2019-standalone/xml-cii-conversion-evidence.js');
let source = fs.readFileSync(evidencePath, 'utf8').replace(/\bexport\s+(?=function|const|let|class)/g, '');
source += '\n;globalThis.__x004 = { digestXmlCiiEvidenceText, buildXmlCiiConversionEvidence, buildXmlCiiConversionEvidenceXml };';
const context = vm.createContext({ console, Map, WeakSet });
new vm.Script(source, { filename: evidencePath }).runInContext(context);
const evidenceApi = context.__x004;

assert.strictEqual(evidenceApi.digestXmlCiiEvidenceText('abc'), 'fnv1a32:1a47e90b:3');

const state = {
  sourceText: '<PipeStressExport/>',
  stagedJsonText: '{"x":1}',
  sourceNameOverride: 'sample.xml',
  previewDiagnosticsAuditStatus: 'built',
  previewDiagnosticsAuditReport: {
    branchRows: [{ branchName: '/B1', lineKey: 'P4110001', pipingClass: '93834', rating: '150', wallThickness: 5.54 }],
    matchedFacts: [{ field: 'rating', value: '150', source: 'preview' }],
  },
};
const config = JSON.stringify({
  overrides: {
    rigidWeightMatch1: { '/B1::480': 120.734 },
    rigidWeightFinal: { '/B1::480': 15 },
    rigidWeight: { '/B1::480': 15 },
  },
});
const evidence = evidenceApi.buildXmlCiiConversionEvidence(state, config);
assert.strictEqual(evidence.snapshots.preview.name, 'preview');
assert.strictEqual(evidence.snapshots.RigidMatch1.name, 'RigidMatch1');
assert.strictEqual(evidence.snapshots.Rigidmatch2.name, 'Rigidmatch2');
assert.strictEqual(JSON.parse(evidence.snapshots.RigidMatch1.canonicalJson).decisionsKgByKey['/B1::480'], 120.734);
assert.strictEqual(JSON.parse(evidence.snapshots.Rigidmatch2.canonicalJson).decisionsKgByKey['/B1::480'], 15);

const engineDigest = evidenceApi.digestXmlCiiEvidenceText('<engine/>');
const parseDigest = evidenceApi.digestXmlCiiEvidenceText('<parse/>');
const ciiDigest = evidenceApi.digestXmlCiiEvidenceText('CII');
const xml = evidenceApi.buildXmlCiiConversionEvidenceXml(evidence, {
  engineRequestXmlDigest: engineDigest,
  converterParseXmlDigest: parseDigest,
  ciiDigest,
});
assert(xml.includes('<preview '));
assert(xml.includes('<RigidMatch1 '));
assert(xml.includes('<Rigidmatch2 '));
assert(xml.includes(`engineRequestXml="${engineDigest}"`));
assert(xml.includes(`converterParseXml="${parseDigest}"`));
assert(xml.includes(`cii="${ciiDigest}"`));

const custodySource = fs.readFileSync(path.join(root, 'converters/scripts/xml_to_cii2019_coordinate_custody.py'), 'utf8');
assert(custodySource.includes('CONVERTER_PARSE_XML_DIGEST='), 'Python parser boundary must emit the exact converter-parse XML digest.');
const serviceSource = fs.readFileSync(path.join(root, 'tabs/xml-cii-2019-standalone/xml-cii-workflow-service.js'), 'utf8');
assert(serviceSource.includes('normalized.diagnostics.converterInputDigest = parity.evidence.engineInputDigest'), 'Service must retain the exact engine-request XML digest.');
const apiSource = fs.readFileSync(path.join(root, 'tabs/xml-cii-2019-standalone/xml-cii-workflow-api-atta-default.js'), 'utf8');
assert(apiSource.includes('converterParseDigestFromLogs'));
assert(apiSource.includes('engineRequestXmlDigest'));
assert(apiSource.includes('converterParseXmlDigest'));

console.log('XML CII X004 immutable evidence local regression passed.');
