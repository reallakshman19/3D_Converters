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
const physicalKey = 'WPC1::SRC-A::%2FB1::REF%3A134234934%2FTEST';
const config = JSON.stringify({
  weightIdentity: { sourceId: 'SRC-A' },
  weightReviewLifecycle: {
    finalReviewDisposition: 'explicit-final-accepted',
    explicitFinalReview: true,
  },
  overrides: {
    rigidWeightMatch1: { [physicalKey]: 120.734 },
    rigidWeightFinal: { [physicalKey]: 15 },
    // Compatibility materialization must not be allowed to masquerade as Final evidence.
    rigidWeight: { '/B1::480': 999 },
  },
});
const evidence = evidenceApi.buildXmlCiiConversionEvidence(state, config);
assert.strictEqual(evidence.snapshots.preview.name, 'preview');
assert.strictEqual(evidence.snapshots.RigidMatch1.name, 'RigidMatch1');
assert.strictEqual(evidence.snapshots.Rigidmatch2.name, 'Rigidmatch2');
const match1Payload = JSON.parse(evidence.snapshots.RigidMatch1.canonicalJson);
const finalPayload = JSON.parse(evidence.snapshots.Rigidmatch2.canonicalJson);
assert.strictEqual(match1Payload.decisionsKgByKey[physicalKey], 120.734);
assert.strictEqual(match1Payload.identity, 'physical-component');
assert.strictEqual(match1Payload.sourceId, 'SRC-A');
assert.strictEqual(finalPayload.decisionsKgByKey[physicalKey], 15);
assert.strictEqual(finalPayload.decisionsKgByKey['/B1::480'], undefined, 'Transient compatibility keys must not enter Rigidmatch2 evidence.');
assert.strictEqual(finalPayload.action, 'explicit-final-accepted');
assert.strictEqual(finalPayload.explicitFinalReview, true);

const skipped = evidenceApi.buildXmlCiiConversionEvidence(state, JSON.stringify({
  weightIdentity: { sourceId: 'SRC-A' },
  weightReviewLifecycle: {
    finalReviewDisposition: 'explicit-skip-use-match1',
    explicitFinalReview: true,
  },
  overrides: {
    rigidWeightMatch1: { [physicalKey]: 75 },
    rigidWeightFinal: {},
    rigidWeight: { '/B1::530': 128.89501 },
  },
}));
const skippedFinal = JSON.parse(skipped.snapshots.Rigidmatch2.canonicalJson);
assert.strictEqual(skippedFinal.decisionCount, 0);
assert.strictEqual(skippedFinal.action, 'explicit-skip-use-match1');
assert.deepStrictEqual(skippedFinal.decisionsKgByKey, {});

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

console.log('XML CII X004 immutable physical-weight evidence regression passed.');
