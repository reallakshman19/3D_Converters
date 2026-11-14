// Owner D5, 13 Nov 2026: "Transferred values win" over the line list and masters. On 14 Nov the
// live step 10 put T1 127 -> 120, FluidDensity 110 -> 100 and material 106 -> 338 back from the
// masters on a transferred branch. Invented PSI116 data only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { installWeightBasisXmlDom } from '../tabs/xml-cii-2019-standalone/workers/weight-basis-xml-dom.js';
import {
  snapshotTransferProtection, restoreTransferProtection, protectExpectedEntries,
} from '../v045/tabs/xml-cii-2019-standalone/xml-cii-transfer-protection.js';

installWeightBasisXmlDom(globalThis);

const NOTE = '<!--TOPOFIX-TRANSFER-PROTECT {"v":1,"branches":{"/L\\u002d1/B1":["Temperature/Temperature1","FluidDensity","MaterialNumber"]},'
  + '"nodes":{"/L\\u002d1/B1|20":["WallThickness"]}}-->';

function psi({ note = true, t1 = '127', density = '110', material = '106', code = '106', name = 'TRANSFERRED', wall = '5.5' } = {}) {
  const node = (n) => `<Node><NodeNumber>${n}</NodeNumber><MaterialCode>${code}</MaterialCode><MaterialName>${name}</MaterialName><WallThickness>${wall}</WallThickness></Node>`;
  return `<?xml version="1.0"?>\n${note ? NOTE : ''}<PipeStressExport><Pipe><Branch><Branchname>/L-1/B1</Branchname>`
    + `<Temperature><Temperature1>${t1}</Temperature1><Temperature2>50</Temperature2></Temperature>`
    + `<FluidDensity>${density}</FluidDensity><MaterialNumber>${material}</MaterialNumber>${node(10)}${node(20)}</Branch>`
    + `<Branch><Branchname>/L-2/B1</Branchname><Temperature><Temperature1>${t1}</Temperature1></Temperature></Branch></Pipe></PipeStressExport>`;
}

const read = (xml) => {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const [b1, b2] = [...doc.getElementsByTagName('Branch')];
  const t = (el, n) => el.getElementsByTagName(n)[0]?.textContent;
  const nodes = [...b1.getElementsByTagName('Node')];
  return { t1: t(b1, 'Temperature1'), t2: t(b1, 'Temperature2'), density: t(b1, 'FluidDensity'), material: t(b1, 'MaterialNumber'),
    codes: nodes.map((n) => t(n, 'MaterialCode')), names: nodes.map((n) => t(n, 'MaterialName')),
    walls: nodes.map((n) => t(n, 'WallThickness')), otherT1: t(b2, 'Temperature1') };
};

// What the masters make of the transferred file: every listed value refilled.
const refilled = psi({ t1: '120', density: '100', material: '338', code: '338', name: 'MASTER A790', wall: '3.9' });

test('a transferred branch keeps T1, density and material over the master refill', () => {
  const snap = snapshotTransferProtection(psi());
  const out = read(restoreTransferProtection(refilled, snap).xmlText);
  assert.deepEqual([out.t1, out.density, out.material], ['127', '110', '106']);
  assert.deepEqual(out.codes, ['106', '106'], 'node codes follow the protected branch material (the CII writer reads them first)');
  assert.deepEqual(out.names, ['', ''], 'the master name belonged to another material');
});

test('only listed fields are kept; everything else keeps the master value', () => {
  const out = read(restoreTransferProtection(refilled, snapshotTransferProtection(psi())).xmlText);
  assert.equal(out.otherT1, '120', 'a branch that is not listed');
  assert.deepEqual(out.walls, ['3.9', '5.5'], 'only node 20 lists WallThickness');
});

test('a file without the note runs exactly as before', () => {
  assert.equal(snapshotTransferProtection(psi({ note: false })), null);
  assert.equal(restoreTransferProtection(refilled, null).xmlText, refilled);
});

test('the run parity check expects the kept values, so the engine input is released', () => {
  const snap = snapshotTransferProtection(psi());
  const entries = [
    { scope: 'branch', branchName: '/L-1/B1', path: ['Temperature', 'Temperature1'], expected: '120' },
    { scope: 'branch', branchName: '/L-1/B1', path: ['Temperature', 'Temperature2'], expected: '50' },
    { scope: 'node', branchName: '/L-1/B1', nodeNumber: '10', path: ['MaterialCode'], expected: '338' },
    { scope: 'node', branchName: '/L-1/B1', nodeNumber: '10', path: ['MaterialName'], expected: 'MASTER A790' },
    { scope: 'branch', branchName: '/L-2/B1', path: ['Temperature', 'Temperature1'], expected: '120' },
  ];
  assert.deepEqual(protectExpectedEntries(entries, snap).map((e) => e.expected), ['127', '50', '106', '', '120']);
});

test('an unreadable note warns and changes nothing', () => {
  const bad = psi().replace('{"v":1', '{"v":1,,');
  const r = restoreTransferProtection(refilled, snapshotTransferProtection(bad));
  assert.equal(r.xmlText, refilled);
  assert.equal(r.diagnostics[0].code, 'TRANSFER_PROTECT_UNREADABLE');
});

test('the note is carried into the run output, so converting that output again stays protected', () => {
  const lost = psi({ note: false, t1: '120', density: '100', material: '338', code: '338', name: 'MASTER A790', wall: '3.9' });
  const out = restoreTransferProtection(lost, snapshotTransferProtection(psi())).xmlText;
  assert.match(out, /^(<\?xml[^>]*\?>\n)?<!--TOPOFIX-TRANSFER-PROTECT /);
  const again = read(restoreTransferProtection(refilled, snapshotTransferProtection(out)).xmlText);
  assert.deepEqual([again.t1, again.density, again.material], ['127', '110', '106']);
});
