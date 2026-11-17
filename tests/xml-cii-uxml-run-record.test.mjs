// Run record (Owner 17 Nov 2026): one Run's own provenance and hashes, kept for the step-10 download.
import assert from 'node:assert/strict';
import test from 'node:test';
import { installWeightBasisXmlDom } from '../tabs/xml-cii-2019-standalone/workers/weight-basis-xml-dom.js';
import {
  buildUxmlRunRecord, clearUxmlRunRecords, rememberUxmlRunRecord, sha256Text, transferKept, uxmlRunRecordFileText, uxmlRunRecords,
} from '../v045/tabs/xml-cii-2019-standalone/xml-cii-uxml-run-record.js';

installWeightBasisXmlDom(globalThis);

const NOTE = '<!--TOPOFIX-TRANSFER-PROTECT {"v":1,"branches":{"/L\u002d1/B1":["Temperature/Temperature1","FluidDensity"]}}-->';
const psi = ({ note = true, t1 = '127', density = '110' } = {}) => `<?xml version="1.0"?>\n${note ? NOTE : ''}<PipeStressExport><Pipe><Branch>`
  + `<Branchname>/L-1/B1</Branchname><Temperature><Temperature1>${t1}</Temperature1></Temperature><FluidDensity>${density}</FluidDensity>`
  + '<Node><NodeNumber>10</NodeNumber></Node></Branch></Pipe></PipeStressExport>';

const stage = (xmlText) => ({ xmlText, provenance: { rows: [{ row: 0 }], counts: { unexplained: 0 } }, engineeringProvenance: { rows: [], counts: {} } });
const job = { sourceName: 'L1.xml', sourceText: psi(), stagedJsonText: '', supportConfigJson: '{}' };

test('the record holds this Run\'s provenance, the CII input XML and its hashes', async () => {
  const out = psi({ note: false });
  const r = await buildUxmlRunRecord({ job, stageInputXml: job.sourceText, stage: stage(out), evidence: { ok: true, comparisons: 4, mismatchCount: 0 },
    compare: { equal: true }, vendor: 'vendor/uxml-v2 (test)', ms: 1 });
  assert.equal(r.format, 'uxml-run-record');
  assert.equal(r.ciiInputXml, out);
  assert.equal(r.hashes.ciiInputXml, await sha256Text(out));
  assert.equal(r.hashes.sourceXml, await sha256Text(job.sourceText));
  assert.equal(r.hashes.stagedJson, null);
  assert.deepEqual(r.provenance.rows, [{ row: 0 }]);
  assert.deepEqual(r.parity, { ok: true, comparisons: 4, mismatches: 0 });
  assert.equal(await sha256Text('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('transfer-protected values are listed with whether the CII input XML kept them', () => {
  const kept = transferKept(psi(), psi({ note: false }));
  assert.deepEqual(kept.values.map((v) => [v.path, v.value, v.now, v.kept]), [['Temperature/Temperature1', '127', '127', true], ['FluidDensity', '110', '110', true]]);
  const lost = transferKept(psi(), psi({ note: false, t1: '120' }));
  assert.deepEqual(lost.values.map((v) => [v.path, v.now, v.kept]), [['Temperature/Temperature1', '120', false], ['FluidDensity', '110', true]]);
  assert.equal(transferKept(psi({ note: false }), psi()), null);
});

test('only the last Run\'s records are kept, one per model, in one download', async () => {
  clearUxmlRunRecords();
  rememberUxmlRunRecord({ model: 'a.xml', n: 1 });
  rememberUxmlRunRecord({ model: 'b.xml', n: 1 });
  rememberUxmlRunRecord({ model: 'a.xml', n: 2 });
  assert.deepEqual(uxmlRunRecords().map((r) => [r.model, r.n]), [['b.xml', 1], ['a.xml', 2]]);
  const file = JSON.parse(uxmlRunRecordFileText());
  assert.equal(file.format, 'uxml-run-records');
  assert.equal(file.records.length, 2);
  clearUxmlRunRecords();
  assert.equal(uxmlRunRecords().length, 0);
});
