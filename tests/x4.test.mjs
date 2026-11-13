// X4: invented PSI116 XML only. No project inputs or browser required.
import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { posix } from 'node:path';
import { assertModeBRestraintsConserved } from '../converters/xml-cii2019-core/mode-b-restraint-conservation.js';
import { closeGovernedAttaDefaultRestraintsXml } from '../v045/converters/xml-cii2019-core/atta-default-restraint-closure.js';
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
function setup(outputMode = 'both', inputs = sources()) {
  const combined = combineXmlWithNodeOffsets(inputs, { offsetStep: 100000 });
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

// Review round 1: exercise the actual governed closure, not a mock replacement.
test('X4 R1.1 Mode B ATTA zero-information LIM replaced by governed REST', async () => {
  const inputs = sources();
  inputs[0].xmlText = xml(node(10, '<Restraint><Type>LIM</Type></Restraint>').replace('ANCI', 'ATTA'), node(20));
  const { state, manifest } = setup('both', inputs);
  assert.equal(manifest.sourceOrder[0].restraintInventory.length, 0);
  const job = await liveJob(state);
  const result = await liveRun(job, runtime(undefined, (x) => {
    const closed = closeGovernedAttaDefaultRestraintsXml(x);
    assert.equal(closed.stats.zeroInformationLimitPlaceholdersReplaced, 1);
    return closed.xmlText;
  }));
  assert.equal(result.ok, true, result.error);
  assert.match(result.enrichedText, /<Type>\+Y<\/Type>/);
  assert.doesNotMatch(result.enrichedText, /<Type>LIM<\/Type><\/Restraint>/);
});

test('X4 R1.1 per-source closure copies replacement instead of retaining placeholder', () => {
  const inputs = sources();
  inputs[0].xmlText = xml(node(10, '<Restraint><Type>LIM</Type></Restraint>').replace('ANCI', 'ATTA'), node(20));
  const { manifest, xmlText } = setup('both', inputs);
  const staged = modeBStagedSourcesFromManifest(manifest, ['{}', '{}']);
  const result = closeModeBSourceRestraintsXml(xmlText, staged, {}, (x) => closeGovernedAttaDefaultRestraintsXml(x));
  assert.equal(result.changed, true);
  assert.match(result.xmlText, /<Type>\+Y<\/Type>/);
  assert.doesNotMatch(result.xmlText, /<Type>LIM<\/Type><\/Restraint>/);
});

test('X4 R1.2 blank, missing and zero Gap and missing direction cosines are equal', async () => {
  const forms = ['<Restraint><Type>GUI</Type><Gap></Gap></Restraint>',
    '<Restraint><Type>GUI</Type></Restraint>', restraint('GUI', '0', 0, 0, 0)];
  for (const before of forms) {
    const inputs = sources();
    inputs[1].xmlText = xml(node(10, before), node(20));
    const { xmlText, manifest, state } = setup('both', inputs);
    for (const after of forms) {
      // DOM serialization may self-close a blank field.
      const combined = xmlText.replace(/<Restraint><Type>GUI<\/Type>[\s\S]*?<\/Restraint>/, after);
      assertModeBRestraintsConserved(combined, manifest);
      const job = await liveJob(state);
      const result = await liveRun(job, runtime(() => combined));
      assert.equal(result.ok, true, result.error);
    }
  }
});

test('X4 R1.3 combine rejects extra identical or cross-source copied restraint', () => {
  const { xmlText, manifest } = setup();
  for (const bad of [xmlText.replace(rB, rB + rB), xmlText.replace(rB, rB + rA),
    xmlText.replace(node(100020), node(100020, rA))]) {
    assert.notEqual(bad, xmlText);
    assert.throws(() => assertModeBRestraintsConserved(bad, manifest), { code: 'MODE_B_RESTRAINT_NOT_CONSERVED' });
  }
  const originalImport = Object.getPrototypeOf(doc).importNode;
  try {
    Object.getPrototypeOf(doc).importNode = (n, deep) => {
      const clone = originalImport(n, deep);
      const first = clone.getElementsByTagName('Restraint')[0];
      if (first) first.parentNode.appendChild(first.cloneNode(true));
      return clone;
    };
    assert.throws(() => combineXmlWithNodeOffsets(sources()), { code: 'MODE_B_RESTRAINT_NOT_CONSERVED' });
  } finally { Object.getPrototypeOf(doc).importNode = originalImport; }
});

for (const [copy, build, run] of copies) {
  test(`${copy}: X4 R1.3 Run rejects duplicate of existing restraint, allows closure at empty node`, async () => {
    const job = await build(setup().state);
    refusal(await run(job, runtime((x) => x.replace(rB, rB + rB))));
    refusal(await run({ ...job, sourceText: job.sourceText.replace(rB, rB + rA) }, runtime()));
    const result = await run(job, runtime((x) => x.replace(node(100020), node(100020, rA))));
    assert.equal(result.ok, true, result.error);
    assert.match(result.enrichedText, /<NodeNumber>100020<\/NodeNumber>[\s\S]*?<Type>\+Y<\/Type>/);
  });
}

test('v045: X4 R1.3 Run parity rejects duplicate before engine and result rejects duplicate of new closure restraint', async () => {
  const job = await liveJob(setup().state);
  let called = false;
  refusal(await liveRun(job, { ...runtime(undefined, (x) => x.replace(rB, rB + rB)),
    engineRunner: async () => { called = true; return { ok: true }; } }));
  assert.equal(called, false);
  const added = restraint('LIM', '8', 0, 0, -1);
  const add = (x) => x.replace(node(100020), node(100020, added));
  refusal(await liveRun(job, runtime((x) => x.replace(added, added + added), add)));
});

test('X4 R1.4 unit directions compare within 1e-6, not by rounded bucket', async () => {
  const { xmlText, manifest, state } = setup();
  const job = await liveJob(state);
  for (const equal of [restraint('+Y', '2', 0, 2, 0), restraint('+Y', '2', 0, 0.9999999999, 0),
    restraint('+Y', '2', 0.0000005, 1, 0)]) {
    const after = xmlText.replaceAll(rA, equal);
    assertModeBRestraintsConserved(after, manifest);
    const result = await liveRun(job, runtime(() => after));
    assert.equal(result.ok, true, result.error);
  }
  for (const different of [restraint('+Y', '2', 0.000002, 1, 0), restraint('+Y', '2', 0, -1, 0),
    restraint('+Y', '2', 0, 0, 0)]) {
    const after = xmlText.replaceAll(rA, different);
    assert.throws(() => assertModeBRestraintsConserved(after, manifest), { code: 'MODE_B_RESTRAINT_NOT_CONSERVED' });
    refusal(await liveRun(job, runtime(() => after)));
  }
  // Two nearby but different directions need a one-to-one matching, even if
  // a greedy first choice would consume the only match for another occurrence.
  const inputs = sources();
  const near = (x) => restraint('+Y', '2', x, 1, 0);
  inputs[0].xmlText = xml(node(10, near(0) + near(0.0000015)), node(20));
  const combined = setup('both', inputs);
  const reordered = combined.xmlText.replace(near(0) + near(0.0000015), near(0.00000075) + near(-0.0000005));
  assert.notEqual(reordered, combined.xmlText);
  assertModeBRestraintsConserved(reordered, combined.manifest);
});


test('X4 R1.5 every production X4 import is versioned and docs mirrors match', () => {
  const repo = new URL('../', import.meta.url);
  // One current key per direct module, shared by every root/live/docs importer.
  // X5a superseded the combiner and workflow service; other X4 modules did not change.
  const direct = new Map([
    ['mode-b-restraint-conservation.js', '?v=20261113-x4-1'],
    ['xml-node-offset-combine.js', '?v=20261113-x5a-2'],
    ['xml-cii-workflow-service.js', '?v=20261113-x5a-2'],
    ['xml-cii-workflow-types.js', '?v=20261113-x4-1'],
    ['xml-cii-workflow-ui-adapter.js', '?v=20261113-x4-1'],
    ['xml-cii-mode-b-restraint-closure.js', '?v=20261113-x4-1'],
  ]);
  const references = /(['"])((?:\.{1,2}\/)[^'"\s?#]+\.(?:m?js))(\?v=[^'"\s]+)?\1/g;
  const checked = new Set();
  function walk(directory) {
    for (const entry of readdirSync(new URL(directory + '/', repo), { withFileTypes: true })) {
      const path = posix.join(directory, entry.name);
      if (entry.isDirectory() && !['backup', 'node_modules', '.bak'].includes(entry.name)) walk(path);
      else if (entry.isFile() && /\.(?:m?js|html)$/.test(entry.name)) {
        const content = readFileSync(new URL(path, repo));
        for (const match of content.toString().matchAll(references)) {
          if (!direct.has(match[2].split('/').at(-1))) continue;
          assert.equal(match[3], direct.get(match[2].split('/').at(-1)), `${path}: ${match[2]}`);
          checked.add(path);
        }
        const mirror = new URL('docs/' + path, repo);
        if (existsSync(mirror) && (checked.has(path) || direct.has(entry.name))) {
          assert.deepEqual(readFileSync(mirror), content, `${path}: docs mirror differs`);
        }
      }
    }
  }
  for (const directory of ['converters', 'tabs', 'v045', 'docs/converters', 'docs/tabs']) walk(directory);
  for (const path of ['tabs/xml-cii-2019-standalone/xml-cii-workflow-api-atta-default.js',
    'v045/tabs/xml-cii-2019-standalone/xml-cii-workflow-api-atta-default.js',
    'v045/tabs/xml-cii-2019-standalone/xml-cii-standalone-run-parity-mds-restraints.js']) {
    assert.ok(checked.has(path), path);
  }
});

// R2 N3: Run parity fills a zero-information LIM placeholder next to a real
// LIM on the same node; the filled copy duplicates the real one.
const realLim = '<Restraint><Type>LIM</Type><Stiffness>1.75E12</Stiffness><Gap>0</Gap></Restraint>';
const placeholderLim = '<Restraint><Type>LIM</Type></Restraint>';
const n3Sources = () => [
  { sourceId: 'A', fileName: 'A.xml', xmlText: xml(node(10, realLim + placeholderLim), node(20)) },
  { sourceId: 'B', fileName: 'B.xml', xmlText: xml(node(10, rB), node(20)) },
];
// Only the live (v045) Run applies the parity enricher that fills placeholders.
for (const [copy, build, run] of copies.filter(([name]) => name === 'v045')) {
  test(`${copy}: X4 R2 N3 real LIM plus filled placeholder LIM on one node runs`, async () => {
    const { state } = setup('both', n3Sources());
    const fill = (x) => x.replace(placeholderLim, realLim);
    const result = await run(await build(state), runtime((x) => x, fill));
    assert.equal(result.ok, true, result.error);
  });
  test(`${copy}: X4 R2 N3 allowance is one per placeholder and LIM only`, async () => {
    const { state } = setup('both', n3Sources());
    refusal(await run(await build(state), runtime((x) => x, (x) => x.replace(placeholderLim, realLim + realLim))));
    const nonLim = [{ sourceId: 'A', fileName: 'A.xml', xmlText: xml(node(10, rB + placeholderLim), node(20)) },
      { sourceId: 'B', fileName: 'B.xml', xmlText: xml(node(10, rA), node(20)) }];
    const { state: s2 } = setup('both', nonLim);
    refusal(await run(await build(s2), runtime((x) => x, (x) => x.replace(placeholderLim, rB))));
  });
}

test('X4 R2 N3 inventory counts placeholders; Run check allows one filled LIM per placeholder', () => {
  const combined = combineXmlWithNodeOffsets(n3Sources(), { offsetStep: 100000 });
  assert.equal(combined.manifest.sourceOrder[0].restraintInventory[0].placeholders, 1);
  assert.equal(combined.manifest.sourceOrder[1].restraintInventory[0].placeholders, undefined);
  const once = combined.xmlText.replace(placeholderLim, realLim);
  assertModeBRestraintsConserved(once, combined.manifest, 'Run', { allowAdditions: true });
  assert.throws(() => assertModeBRestraintsConserved(once, combined.manifest), /MODE_B_RESTRAINT_NOT_CONSERVED/);
  const twice = combined.xmlText.replace(placeholderLim, realLim + realLim);
  assert.throws(() => assertModeBRestraintsConserved(twice, combined.manifest, 'Run', { allowAdditions: true }),
    /unexpected restraint occurrence/);
});

test('X4 R3 allowance counts only placeholders Run used up; spaced LINE STOP accepted', () => {
  const combined = combineXmlWithNodeOffsets(n3Sources(), { offsetStep: 100000 });
  const keptPlaceholder = combined.xmlText.replace(placeholderLim, realLim + placeholderLim);
  assert.throws(() => assertModeBRestraintsConserved(keptPlaceholder, combined.manifest, 'Run', { allowAdditions: true }),
    /unexpected restraint occurrence/);
  const realStop = '<Restraint><Type>LINE STOP</Type><Stiffness>1.75E12</Stiffness><Gap>0</Gap></Restraint>';
  const stopSources = [{ sourceId: 'A', fileName: 'A.xml', xmlText: xml(node(10, realStop + '<Restraint><Type>LINE STOP</Type></Restraint>'), node(20)) },
    { sourceId: 'B', fileName: 'B.xml', xmlText: xml(node(10, rB), node(20)) }];
  const stop = combineXmlWithNodeOffsets(stopSources, { offsetStep: 100000 });
  assertModeBRestraintsConserved(stop.xmlText.replace('<Restraint><Type>LINE STOP</Type></Restraint>', realStop),
    stop.manifest, 'Run', { allowAdditions: true });
});
