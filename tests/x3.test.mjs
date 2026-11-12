import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as frozen from '../v045/tabs/xml-cii-2019-standalone/xml-cii-frozen-run-package.js';

const sha = text => createHash('sha256').update(text, 'utf8').digest('hex');
const refused = /FROZEN_RUN_NOT_EXPORTABLE:/;
// Entirely invented source branches at offsets 0 and 100000.
const branch = (name, a, b) => `<Branch><Name>${name}</Name><Node><NodeNumber>${a}</NodeNumber></Node><Node><NodeNumber>${b}</NodeNumber></Node></Branch>`;
const xml = `<PipeStressExport><Units>mm</Units>${branch('A', 10, 20)}${branch('B', 100010, 100020)}</PipeStressExport>`;
const sources = [
  { sourceId: '1:A', fileName: 'A.xml', offset: 0, minNode: 10, maxNode: 20 },
  { sourceId: '2:B', fileName: 'B.xml', offset: 100000, minNode: 100010, maxNode: 100020 },
];
const marker = 'X3_PRIVATE_STAGED_MARKER_49e7db';
const texts = [`{ "invented": "A", "note": "µ", "marker": "${marker}" }\r\n`, '{"invented":"B"}'];
const entries = (stagedTexts = texts) => sources.map(({ offset, ...row }, i) => ({ ...row, stagedJsonText: stagedTexts[i] }));
const records = (stagedTexts = texts) => entries(stagedTexts).map(({stagedJsonText, ...row}) => ({ ...row, byteLength: Buffer.byteLength(stagedJsonText, 'utf8'), sha256: sha(stagedJsonText) }));
const seal = rows => sha(JSON.stringify(rows));
const config = JSON.stringify({ modeB: { schema: 'xml-cii-mode-b-sources/v1', offsetStep: 100000, sources } });
const element = (a, b) => {
  const rows = Array(15).fill('0 0 0 0 0 0');
  rows[0] = `${a} ${b} 100 0 0 50`;
  return rows.join('\n');
};
const cii = `#$ CONTROL\n2 0 0 0 0 0\n0 0 0 0 0 0\n0\n0\n#$ ELEMENTS\n${element(10,20)}\n${element(100010,100020)}\n#$ RIGID\n`;
function result({ modeB = true, stagedTexts = texts } = {}) {
  const rows = modeB ? records(stagedTexts) : [];
  return { ok: true, ciiText: cii, ciiName: 'invented.cii', finalRigidReviewEvidence: {
    sourceKind: 'xml', engineInputText: xml, stagedJsonText: modeB ? '' : texts[0],
    supportConfigJson: modeB ? config : '{}', effectiveSourceName: 'invented.xml',
    effectiveOptions: { coordsMode: 'first', kgToNewton: true, splitCondensedValveFlange: false, useRestraintTypeBasedOnJson: true },
    engineInputSha256: sha(xml), originalCiiSha256: sha(cii), weightScale: 10,
    modeBStagedSources: rows, modeBStagedSourcesSha256: seal(rows),
  } };
}
const build = options => frozen.buildFrozenCiiRunPackage(result(options));
const session = (stagedTexts = texts) => ({ modeBStagedSources: entries(stagedTexts), stagedJsonText: texts[0] });
const verify = (pkg, current = session()) => frozen.verifyFrozenCiiRunPackage(pkg, current);
// Supply tampered rows explicitly so that the original verifier also receives
// a well-shaped modified package, not an exception in the test setup.
function replaceRows(pkg, rows, rehash = false) {
  pkg.payloads.modeBStagedSources = rows;
  if (rehash) pkg.hashes.modeBStagedSourcesSha256 = seal(rows);
}

test('X3 T1 capture seals the exact per-source UTF-8 text, including CRLF and non-ASCII', async () => {
  const captured = await frozen.captureModeBStagedSources(entries());
  assert.deepEqual(captured.modeBStagedSources, records());
  assert.equal(captured.modeBStagedSourcesSha256, seal(records()));
});

test('X3 T2 frozen export and JSON round trip preserve both source records and seal', async () => {
  const pkg = await build();
  assert.deepEqual(pkg.payloads.modeBStagedSources, records());
  assert.equal(pkg.hashes.modeBStagedSourcesSha256, seal(records()));
  assert.equal((await verify(JSON.parse(JSON.stringify(pkg)))).status, 'PASS_FROZEN_CONVERTER_BOUNDARY');
});

test('X3 T3 changed session staged JSON is refused on load, even with the same byte length', async () => {
  const pkg = await build();
  const current = session(); current.modeBStagedSources[0].stagedJsonText = texts[0].replace('"A"', '"C"');
  assert.equal(Buffer.byteLength(current.modeBStagedSources[0].stagedJsonText), records()[0].byteLength);
  await assert.rejects(verify(pkg, current), /MODE_B_STAGED_JSON_MISMATCH: 1:A/);
});

test('X3 T4 individual staged SHA is independently checked even if outer digest was recomputed', async () => {
  const pkg = await build();
  const rows = records(); rows[1].sha256 = sha('{"invented":"C"}');
  replaceRows(pkg, rows, true);
  await assert.rejects(verify(pkg), /MODE_B_STAGED_JSON_MISMATCH: 2:B/);
});

test('X3 T5 changing an individual digest or source range breaks the outer seal', async () => {
  for (const mutate of [r => { r[0].sha256 = '0'.repeat(64); }, r => { r[1].maxNode++; }, r => { r[0].byteLength++; }]) {
    const pkg = await build(); const rows = records(); mutate(rows);
    replaceRows(pkg, rows);
    await assert.rejects(verify(pkg), /FROZEN_RUN_NOT_EXPORTABLE: Package SHA-256 mismatch for modeBStagedSourcesSha256/);
  }
});

test('X3 T6 source reassignment or reordering cannot pass a recomputed outer seal', async () => {
  for (const mutate of [r => { r[0].sourceId = '2:B'; }, r => r.reverse(), r => { r[0].maxNode++; }]) {
    const pkg = await build(); const rows = records(); mutate(rows);
    replaceRows(pkg, rows, true);
    await assert.rejects(verify(pkg), /FROZEN_RUN_NOT_EXPORTABLE: Mode B staged-source identity or node range/);
  }
});

test('X3 T7 omission of source payload, seal, or a source row is refused', async () => {
  for (const mutate of [
    p => { delete p.payloads.modeBStagedSources; },
    p => { delete p.hashes.modeBStagedSourcesSha256; },
    p => { delete p.payloads.modeBStagedSources; delete p.hashes.modeBStagedSourcesSha256; },
    p => replaceRows(p, records().slice(0, 1), true),
  ]) {
    const pkg = await build(); mutate(pkg);
    await assert.rejects(verify(pkg), refused);
  }
});

test('X3 T8 one source without staged JSON has an explicit empty-string digest', async () => {
  const pkg = await build({ stagedTexts: [texts[0], ''] });
  assert.equal(pkg.payloads.modeBStagedSources[1].byteLength, 0);
  assert.equal(pkg.payloads.modeBStagedSources[1].sha256, sha(''));
  assert.equal((await verify(pkg, session([texts[0], '']))).status, 'PASS_FROZEN_CONVERTER_BOUNDARY');
  await assert.rejects(verify(pkg, {modeBStagedSources: entries().slice(0,1)}), /MODE_B_STAGED_JSON_MISSING: 2:B/);
});

test('X3 T9 export refuses staged bytes changed after Run even if their individual digest was replaced', async () => {
  const r = result();
  const row = r.finalRigidReviewEvidence.modeBStagedSources[0];
  row.sha256 = sha('{"invented":"changed after run"}'); row.byteLength++;
  await assert.rejects(frozen.buildFrozenCiiRunPackage(r), /FROZEN_RUN_NOT_EXPORTABLE: Mode B staged-source evidence differs/);
});

test('X3 T10 non-Mode-B packages export no staged text; legacy load needs matching session', async () => {
  const pkg = await build({ modeB: false });
  assert.equal(Object.hasOwn(pkg.payloads, 'stagedJsonText'), false);
  assert.equal(pkg.payloads.stagedJsonByteLength, Buffer.byteLength(texts[0]));
  assert.equal(pkg.hashes.stagedJsonSha256, sha(texts[0]));
  assert.equal(JSON.stringify(pkg).includes(marker), false);
  await assert.rejects(verify(pkg, {}), /STAGED_JSON_MISSING/);
  await assert.rejects(verify(pkg, {stagedJsonText: '{}'}), /STAGED_JSON_MISMATCH/);
  assert.deepEqual(pkg.payloads.modeBStagedSources, []);
  assert.equal(pkg.hashes.modeBStagedSourcesSha256, seal([]));
  assert.equal((await verify(pkg)).status, 'PASS_FROZEN_CONVERTER_BOUNDARY');
  delete pkg.payloads.modeBStagedSources; delete pkg.hashes.modeBStagedSourcesSha256;
  delete pkg.payloads.stagedJsonByteLength; pkg.payloads.stagedJsonText = texts[0];
  await assert.rejects(verify(pkg, {}), /STAGED_JSON_MISSING/);
  assert.equal((await verify(pkg)).status, 'PASS_FROZEN_CONVERTER_BOUNDARY');
});

test('X3 T11 old Mode B run evidence containing only hashes cannot be exported as a complete seal', async () => {
  const r = result();
  for (const row of r.finalRigidReviewEvidence.modeBStagedSources) {
    row.stagedJsonSha256 = row.sha256; delete row.sha256; delete row.byteLength;
  }
  delete r.finalRigidReviewEvidence.modeBStagedSourcesSha256;
  await assert.rejects(frozen.buildFrozenCiiRunPackage(r), refused);
});


test('X3 T12 workflow service carries the Run seal into a frozen export', async () => {
  const { runXmlCii2019WorkflowService } = await import('../v045/tabs/xml-cii-2019-standalone/xml-cii-workflow-service.js');
  const stagedSources = entries();
  const job = { sourceKind: 'xml', sourceName: 'invented.xml', sourceText: xml,
    supportConfigJson: config, stagedJsonText: '', modeBStagedSources: stagedSources,
    options: result().finalRigidReviewEvidence.effectiveOptions };
  const run = await runXmlCii2019WorkflowService(job, {
    // Explicit injected boundaries; no Python or private benchmark is needed.
    runParityEnricher: async input => ({ applied: true, xmlText: input.sourceText,
      evidence: { ok: true, engineInputDigest: sha(input.sourceText) }, logs: [], stats: {} }),
    engineRunner: async input => {
      assert.deepEqual(input.modeBStagedSources, stagedSources);
      return { ok: true, ciiText: cii, ciiName: 'invented.cii', logs: [], diagnostics: {} };
    },
  });
  assert.equal(run.ok, true);
  assert.deepEqual(run.finalRigidReviewEvidence.modeBStagedSources, records());
  assert.equal(run.finalRigidReviewEvidence.modeBStagedSourcesSha256, seal(records()));
  assert.equal((await verify(await frozen.buildFrozenCiiRunPackage(run))).status, 'PASS_FROZEN_CONVERTER_BOUNDARY');
});


test('X3 T13 exported package contains no staged content or raw text field', async () => {
  const pkg = await build();
  const exported = JSON.stringify(pkg, null, 2);
  assert.equal(exported.includes(marker), false);
  assert.equal(exported.includes('stagedJsonText'), false);
  assert.deepEqual(pkg.payloads.modeBStagedSources, records());
  const r = result();
  r.finalRigidReviewEvidence.modeBStagedSources[0].stagedJsonText = texts[0];
  r.finalRigidReviewEvidence.modeBStagedSourcesSha256 = seal(r.finalRigidReviewEvidence.modeBStagedSources);
  await assert.rejects(frozen.buildFrozenCiiRunPackage(r), /unexpected fields/);
});

test('X3 T14 missing session data refuses with a named code, never with the package digest alone', async () => {
  const pkg = await build();
  await assert.rejects(frozen.verifyFrozenCiiRunPackage(pkg), /MODE_B_STAGED_JSON_MISSING: 1:A/);
  await assert.rejects(verify(pkg, {modeBStagedSources: entries().slice(0,1)}), /MODE_B_STAGED_JSON_MISSING: 2:B/);
  const current = session(); delete current.modeBStagedSources[0].stagedJsonText;
  await assert.rejects(verify(pkg, current), /MODE_B_STAGED_JSON_MISSING: 1:A/);
  current.modeBStagedSources[0].stagedJsonText = '';
  await assert.rejects(verify(pkg, current), /MODE_B_STAGED_JSON_MISSING: 1:A/);
});

test('X3 T15 session source identity, duplicate records, byte length and JSON validity are checked', async () => {
  const pkg = await build();
  for (const change of [r => { r[0].maxNode++; }, r => r.push({...r[0]}), r => {r[0].stagedJsonText += ' ';}]) {
    const current = session(); change(current.modeBStagedSources);
    await assert.rejects(verify(pkg,current), /MODE_B_STAGED_JSON_MISMATCH: 1:A/);
  }
  const invalid = ['not JSON', texts[1]];
  await assert.rejects(verify(await build({stagedTexts: invalid}), session(invalid)), /MODE_B_STAGED_JSON_INVALID: 1:A/);
});
