// X4: invented PSI116 XML only. No project inputs or browser required.
import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { installWeightBasisXmlDom } from '../tabs/xml-cii-2019-standalone/workers/weight-basis-xml-dom.js';
import { combineXmlWithNodeOffsets } from '../converters/xml-cii2019-core/xml-node-offset-combine.js';
import { singleXmlCiiSourceState } from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-processing-mode.js';
import { buildXmlCiiWorkflowJobFromUiState as rootJob } from '../tabs/xml-cii-2019-standalone/xml-cii-workflow-ui-adapter.js';
import { buildXmlCiiWorkflowJobFromUiState as liveJob } from '../v045/tabs/xml-cii-2019-standalone/xml-cii-workflow-ui-adapter.js';
import { runXmlCii2019Workflow as rootRun } from '../tabs/xml-cii-2019-standalone/xml-cii-workflow-api.js';
import { closeModeBSourceRestraintsXml } from '../v045/tabs/xml-cii-2019-standalone/xml-cii-mode-b-restraint-closure.js';
import { modeBStagedSourcesFromManifest } from '../converters/xml-cii2019-core/xml-node-offset-combine.js';
import { runXmlCii2019Workflow as liveRun } from '../v045/tabs/xml-cii-2019-standalone/xml-cii-workflow-api-atta-default.js';

installWeightBasisXmlDom(globalThis);
if (!globalThis.crypto?.subtle) globalThis.crypto = webcrypto;
// Explicit test-only DOM ports missing in the repository's Node DOM adapter.
const doc = new DOMParser().parseFromString('<R/>', 'application/xml');
const proto = Object.getPrototypeOf(doc.documentElement);
const oldGet = proto.getElementsByTagName;
proto.getElementsByTagName = function (tag) {
  if (tag !== '*') return oldGet.call(this, tag);
  const result = [];
  const visit = (node) => { for (const c of node.childNodes || []) if (c.nodeType === 1) { result.push(c); visit(c); } };
  visit(this);
  return result;
};
Object.getPrototypeOf(doc).importNode = (node, deep) => node.cloneNode(Boolean(deep));

const restraint = (type, gap, x, y, z) => `<Restraint><Type>${type}</Type><Gap>${gap}</Gap><DirectionCosineX>${x}</DirectionCosineX><DirectionCosineY>${y}</DirectionCosineY><DirectionCosineZ>${z}</DirectionCosineZ></Restraint>`;
const node = (n, restraints = '') => `<Node><NodeNumber>${n}</NodeNumber><ComponentType>ANCI</ComponentType><Position>0 0 0</Position>${restraints}</Node>`;
const xml = (...nodes) => `<PipeStressExport><Units>mm</Units><Pipe><Branch><Branchname>/INVENTED</Branchname>${nodes.join('')}</Branch></Pipe></PipeStressExport>`;
const rA = restraint('+Y', '2', 0, 1, 0);
const rB = restraint('GUI', '3', 1, 0, 0);
const rHelper = restraint('LIM', '5', 0, 0, 1);
const sources = () => [
  { sourceId: 'A', fileName: 'A.xml', xmlText: xml(node(10, rA + rA), node(20), node(-1, rHelper)) },
  { sourceId: 'B', fileName: 'B.xml', xmlText: xml(node(10, rB), node(20), node(-1, rHelper)) },
];
const copies = [['root', rootJob, rootRun], ['v045', liveJob, liveRun]];
function setup(outputMode = 'both') {
  const combined = combineXmlWithNodeOffsets(sources(), { offsetStep: 100000 });
  const state = singleXmlCiiSourceState({ supportConfigJson: '{}', options: { outputMode } }, null,
    combined.xmlText, 'xml', { modeBManifest: combined.manifest });
  return { ...combined, state };
}
function runtime(transform = (x) => x, parityTransform = (x) => x) {
  return {
    runParityEnricher: async (job) => ({ applied: true, xmlText: parityTransform(job.sourceText),
      evidence: { ok: true, engineInputDigest: 'invented' }, stats: {}, logs: [] }),
    engineRunner: async (job) => ({ ok: true, enrichedText: job.options.outputMode === 'cii-only' ? '' : transform(job.sourceText),
      enrichedName: 'out.xml', ciiText: job.options.outputMode === 'enriched-only' ? null : 'invented CII', ciiName: 'out.cii', logs: [] }),
  };
}
function refusal(result) {
  assert.equal(result.ok, false, JSON.stringify(result));
  assert.match(result.error, /^MODE_B_RESTRAINT_NOT_CONSERVED:/);
  assert.equal(result.enrichedText, '');
  assert.equal(result.ciiText, null);
  assert.ok(!result.diagnostics?.warnings?.some((warning) => String(warning).includes('MODE_B_RESTRAINT_NOT_CONSERVED')));
}
for (const [copy, build, run] of copies) {
  test(`${copy}: X4 carries source inventory and exact offsets to Run; permits additions`, async () => {
    const { manifest, state, xmlText } = setup();
    assert.deepEqual(manifest.sourceOrder.map((s) => s.offset), [0, 100000]);
    assert.deepEqual(manifest.sourceOrder[1].numberMap[0], { sourceNumber: 10, outputNumber: 100010 });
    const job = await build(state);
    assert.deepEqual(job.modeBManifest, manifest);
    const result = await run(job, runtime((x) => x.replace(rB, rB + rA)));
    assert.equal(result.ok, true, result.error);
    assert.ok(result.enrichedText.includes('100010'));
    assert.notEqual(result.enrichedText, xmlText);
  });
  for (const [name, transform] of [
    ['type', (x) => x.replace(rB, rB.replace('GUI', 'LIM'))],
    ['gap', (x) => x.replace(rB, rB.replace('<Gap>3</Gap>', '<Gap>4</Gap>'))],
    ['direction', (x) => x.replace(rB, rB.replace('<DirectionCosineX>1</DirectionCosineX>', '<DirectionCosineX>-1</DirectionCosineX>'))],
    ['duplicate occurrence', (x) => x.replace(rA + rA, rA)],
    ['cross-source relocation', (x) => x.replace(rB, '').replace(rA + rA, rA + rA + rB)],
    ['negative helper source loss', (x) => x.replace(rHelper, '')],
  ]) {
    test(`${copy}: X4 refuses output ${name} loss and releases neither output`, async () => {
      const { state } = setup();
      const job = await build(state);
      refusal(await run(job, runtime(transform)));
    });
  }
  test(`${copy}: X4 refuses damage in combined input before engine release`, async () => {
    const { state } = setup();
    const job = await build(state);
    let called = false;
    const bad = { ...job, sourceText: job.sourceText.replace(rB, '') };
    refusal(await run(bad, { ...runtime(), engineRunner: async () => { called = true; return { ok: true }; } }));
    assert.equal(called, false);
  });
  test(`${copy}: X4 refuses a Mode B run with missing pre-combination evidence`, async () => {
    const { state } = setup();
    const job = await build(state);
    delete job.modeBManifest;
    refusal(await run(job, runtime()));
  });
}

test('v045: X4 refuses loss during run parity before CII-only conversion', async () => {
  const { state } = setup('cii-only');
  const job = await liveJob(state);
  let called = false;
  refusal(await liveRun(job, { ...runtime(undefined, (x) => x.replace(rB, '')),
    engineRunner: async () => { called = true; return { ok: true, ciiText: 'invented CII' }; } }));
  assert.equal(called, false);
});

// Force the combiner to lose a restraint during clone, not after snapshotting.
test('X4 refuses loss during actual XML combination', () => {
  const documentPrototype = Object.getPrototypeOf(doc);
  const originalImport = documentPrototype.importNode;
  try {
    documentPrototype.importNode = (n, deep) => {
      const clone = originalImport(n, deep);
      const first = clone.getElementsByTagName('Restraint')[0];
      if (first) first.parentNode.removeChild(first);
      return clone;
    };
    assert.throws(() => combineXmlWithNodeOffsets(sources()), { code: 'MODE_B_RESTRAINT_NOT_CONSERVED' });
  } finally { documentPrototype.importNode = originalImport; }
});

test('X4 refuses when per-source closure changes a gap that would be silently discarded by copy-back', () => {
  const { manifest, xmlText } = setup();
  const staged = modeBStagedSourcesFromManifest(manifest, ['{}', '{}']);
  const close = (input) => ({ changed: true, xmlText: input.replace('<Gap>2</Gap>', '<Gap>7</Gap>'), stats: {} });
  assert.throws(() => closeModeBSourceRestraintsXml(xmlText, staged, {}, close), { code: 'MODE_B_RESTRAINT_NOT_CONSERVED' });
});

test('X4 refuses a closed restraint copied onto a different source node occurrence', () => {
  const { manifest, xmlText } = setup();
  const staged = modeBStagedSourcesFromManifest(manifest, ['{}', '{}']);
  const close = (input) => ({ changed: true, xmlText: input.replace('<NodeNumber>10</NodeNumber>', '<NodeNumber>20</NodeNumber>'), stats: {} });
  assert.throws(() => closeModeBSourceRestraintsXml(xmlText, staged, {}, close), { code: 'MODE_B_RESTRAINT_NOT_CONSERVED' });
});

test('v045: X4 refuses loss of a restraint newly added by Run enrichment', async () => {
  const { state } = setup();
  const job = await liveJob(state);
  const added = restraint('LIM', '8', 0, 0, -1);
  const add = (x) => x.replace(rB, rB + added);
  const remove = (x) => x.replace(added, '');
  refusal(await liveRun(job, runtime(remove, add)));
});

for (const [copy, build, run] of copies) {
  test(`${copy}: X4 refuses missing combined XML from a successful both-output Run`, async () => {
    const job = await build(setup().state);
    refusal(await run(job, runtime(() => '')));
  });
  test(`${copy}: X4 refuses an unowned restrained positive node`, async () => {
    const job = await build(setup().state);
    refusal(await run(job, runtime((x) => x.replace('</Branch>', node(777, rB) + '</Branch>'))));
  });
  test(`${copy}: X4 retains XML verification for CII-only output`, async () => {
    const { state, manifest } = setup('cii-only');
    const job = await build(state);
    assert.deepEqual(job.modeBManifest, manifest);
    const result = await run(job, runtime());
    assert.equal(result.ok, true, result.error);
    assert.equal(result.enrichedText, '');
    assert.equal(result.ciiText, 'invented CII');
  });
}

test('X4 rejects tampered source map/config even with unchanged XML', async () => {
  const job = await liveJob(setup().state);
  const config = JSON.parse(job.supportConfigJson);
  config.modeB.sources[1].maxNode += 1;
  refusal(await liveRun({ ...job, supportConfigJson: JSON.stringify(config) }, runtime()));
});

test('X4 refuses relocation between distinct negative helpers with identical NodeNumber', async () => {
  const inputs = sources();
  inputs[1].xmlText = xml(node(10, rB), node(-1, rHelper), node(-1).replace('0 0 0', '9 0 0'));
  const combined = combineXmlWithNodeOffsets(inputs);
  const state = singleXmlCiiSourceState({ supportConfigJson: '{}', options: { outputMode: 'both' } }, null,
    combined.xmlText, 'xml', { modeBManifest: combined.manifest });
  const job = await liveJob(state);
  const move = (x) => x.replace(node(-1, rHelper) + node(-1).replace('0 0 0', '9 0 0'),
    node(-1) + node(-1, rHelper).replace('0 0 0', '9 0 0'));
  refusal(await liveRun(job, runtime(move)));
});
