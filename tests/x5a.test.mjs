// X5a: invented PSI116 data only; no private inputs or new dependencies.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, existsSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { posix, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as combiner from '../converters/xml-cii2019-core/xml-node-offset-combine.js';
import * as ui from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-mode-b-xml-export.js';
import { installWeightBasisXmlDom } from '../tabs/xml-cii-2019-standalone/workers/weight-basis-xml-dom.js';
import { createModeASourceEntry } from '../tabs/xml-cii-2019-standalone/xml-cii-mode-a-batch.js';
import { singleXmlCiiSourceState } from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-processing-mode.js';
import { buildXmlCiiWorkflowJobFromUiState as rootJob } from '../tabs/xml-cii-2019-standalone/xml-cii-workflow-ui-adapter.js';
import { buildXmlCiiWorkflowJobFromUiState as liveJob } from '../v045/tabs/xml-cii-2019-standalone/xml-cii-workflow-ui-adapter.js';
import { runXmlCii2019Workflow as rootRun } from '../tabs/xml-cii-2019-standalone/xml-cii-workflow-api.js';
import { runXmlCii2019Workflow as liveRun } from '../v045/tabs/xml-cii-2019-standalone/xml-cii-workflow-api-atta-default.js';

installWeightBasisXmlDom(globalThis);
// Explicit test-only DOM ports, as in X4, for the existing Node XML adapter.
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

const node = (n, x) => `<Node><NodeNumber>${n}</NodeNumber><ComponentType>PIPE</ComponentType><Position>${x} 0 0</Position><OutsideDiameter>100</OutsideDiameter><WallThickness>5</WallThickness></Node>`;
const pipe = (name, offset = 0) => `<Pipe><Branch><Branchname>${name}</Branchname>${node(10 + offset, 0)}${node(20 + offset, 1000)}</Branch></Pipe>`;
const xml = (...pipes) => `<PipeStressExport><Units>mm</Units>${pipes.join('')}</PipeStressExport>`;
const configA = { overrides: { rating: { 'B': '150', 'A': '300' }, rigidWeight: { '/INVENTED-A::10': 12 } },
  linelist: { branchLineKeyMap: { '/INVENTED-A': 'LA' }, masterRows: [{ secret: 'DO_NOT_CAPTURE_MASTER' }] },
  weight: { finalizedMatches: [{ issueId: 'issue-1', candidateId: 'c1', weight: 12 }] }, stagedJsonText: 'DO_NOT_CAPTURE_STAGED' };
const configB = { overrides: { material: { 'B': 'invented' } }, linelist: { branchLineKeyMap: { '/INVENTED-B': 'LB', '/OTHER': 'LC' } },
  weight: { finalizedMatches: [{ issueId: 'issue-1', weight: 21 }, { issueId: 'issue-2', weight: 33 }] } };
const sources = (a = configA, b = configB) => [
  { sourceId: 'A', fileName: 'A.xml', xmlText: xml(pipe('/INVENTED-A')), supportConfigJson: JSON.stringify(a) },
  { sourceId: 'B', fileName: 'B.xml', xmlText: xml(pipe('/INVENTED-B')), supportConfigJson: JSON.stringify(b) },
];
const combine = (inputs = sources()) => combiner.combineXmlWithNodeOffsets(inputs);
const counts = [
  { sourceId: 'A', fileName: 'A.xml', sourceOrdinal: 1, overrides: 2, overrideEntries: 3, branchLineKeyMap: 1, finalizedMatches: 1 },
  { sourceId: 'B', fileName: 'B.xml', sourceOrdinal: 2, overrides: 1, overrideEntries: 1, branchLineKeyMap: 2, finalizedMatches: 2 },
];
const code = 'MODE_B_SOURCE_CONFIG_NOT_APPLIED';
const copies = [['root', rootJob, rootRun], ['v045', liveJob, liveRun]];
const stateFor = ({ xmlText, manifest }) => singleXmlCiiSourceState({ supportConfigJson: '{}', options: { outputMode: 'both' } }, null, xmlText, 'xml', { modeBManifest: manifest });
function legacy(combined) {
  const manifest = structuredClone(combined.manifest);
  delete manifest.sourceConfigVersion;
  for (const row of manifest.sourceOrder) delete row.sourceConfig;
  return { ...combined, manifest };
}
function runtime(engineRunner = async job => ({ ok: true, enrichedText: job.sourceText, ciiText: 'invented CII', diagnostics: { warnings: ['existing warning'] }, logs: [] })) {
  return { engineRunner, runParityEnricher: async job => ({ applied: true, xmlText: job.sourceText,
    evidence: { ok: true, engineInputDigest: 'invented' }, stats: {}, logs: [] }) };
}

test('X5a T1 captures both enabled source configs only; stable independent SHA-256', () => {
  const entries = sources().map(s => createModeASourceEntry({ fileName: s.fileName, sourceText: s.xmlText, supportConfigJson: s.supportConfigJson }));
  const disabled = createModeASourceEntry({ fileName: 'disabled.xml', sourceText: xml(pipe('/DISABLED')), supportConfigJson: JSON.stringify(configA) });
  disabled.enabled = false;
  const active = entries[0];
  const ref = { current: { xmlProcessingMode: 'mode-b', sourceText: active.sourceText, supportConfigJson: active.supportConfigJson,
    branchSelection: active.branchSelection, sourceBatch: { mode: 'separate-models', activeSourceId: active.sourceId, sources: [...entries, disabled], sharedSupportConfigJson: '{}' } } };
  const combined = combine(ui.modeBCombineSources(ref, 'source'));
  assert.equal(combined.manifest.sourceConfigVersion, 1);
  assert.equal(combined.manifest.schema, 'xml-node-offset-combine/v1');
  assert.deepEqual(combined.manifest.sourceOrder.map(r => r.fileName), ['A.xml', 'B.xml']);
  for (const [i, cfg] of [configA, configB].entries()) {
    const { sha256, ...payload } = combined.manifest.sourceOrder[i].sourceConfig;
    assert.deepEqual(payload, { overrides: cfg.overrides, branchLineKeyMap: cfg.linelist.branchLineKeyMap, finalizedMatches: cfg.weight.finalizedMatches });
    // Independent literal canonical key order, independent Node crypto.
    const expected = i === 0
      ? '{"branchLineKeyMap":{"/INVENTED-A":"LA"},"finalizedMatches":[{"candidateId":"c1","issueId":"issue-1","weight":12}],"overrides":{"rating":{"A":"300","B":"150"},"rigidWeight":{"/INVENTED-A::10":12}}}'
      : '{"branchLineKeyMap":{"/INVENTED-B":"LB","/OTHER":"LC"},"finalizedMatches":[{"issueId":"issue-1","weight":21},{"issueId":"issue-2","weight":33}],"overrides":{"material":{"B":"invented"}}}';
    assert.equal(sha256, createHash('sha256').update(expected).digest('hex'));
  }
  const reordered = { ...configA, overrides: { rigidWeight: configA.overrides.rigidWeight, rating: { A: '300', B: '150' } } };
  assert.equal(combine(sources(reordered)).manifest.sourceOrder[0].sourceConfig.sha256, combined.manifest.sourceOrder[0].sourceConfig.sha256);
  assert.doesNotMatch(JSON.stringify(combined.manifest), /DO_NOT_CAPTURE/);
});

test('X5a T2 empty configs hide notice and produce no warning; plain Single unchanged', async () => {
  const combined = combine(sources({}, { overrides: {}, linelist: { branchLineKeyMap: {} }, weight: { finalizedMatches: [] } }));
  const notice = { hidden: false, textContent: 'stale' };
  ui.updateModeBSourceConfigNotice(notice, combined.manifest);
  assert.deepEqual(notice, { hidden: true, textContent: '' });
  for (const [, build, run] of copies) {
    const result = await run(await build(stateFor(combined)), runtime());
    assert.equal(result.ok, true, result.error);
    assert.deepEqual(result.diagnostics.warnings, ['existing warning']);
    assert.equal(result.diagnostics.modeBSourceConfigNotApplied, undefined);
  }
  const plain = singleXmlCiiSourceState(stateFor(combined), null, sources()[0].xmlText, 'xml');
  assert.equal(plain.modeBManifest, null);
  ui.updateModeBSourceConfigNotice(notice, plain.modeBManifest);
  assert.equal(notice.hidden, true);
});

test('X5a T3 nonempty config gives visible notice and exact per-source Run warning counts', async () => {
  const combined = combine();
  const notice = { hidden: true, textContent: '' };
  ui.updateModeBSourceConfigNotice(notice, combined.manifest);
  assert.equal(notice.hidden, false);
  assert.match(notice.textContent, /A\.xml \(A\): overrides=2 groups, overrideEntries=3, branchLineKeyMap=1, finalizedMatches=1/);
  assert.match(notice.textContent, /B\.xml \(B\): overrides=1 groups, overrideEntries=1, branchLineKeyMap=2, finalizedMatches=2/);
  const state = stateFor(combined);
  const effective = JSON.parse(state.supportConfigJson);
  assert.equal(effective.overrides, undefined);
  assert.equal(effective.linelist?.branchLineKeyMap, undefined);
  assert.equal(effective.weight?.finalizedMatches, undefined);
  for (const [, build, run] of copies) {
    const result = await run(await build(state), runtime());
    assert.equal(result.ok, true, result.error);
    assert.deepEqual(result.diagnostics.modeBSourceConfigNotApplied, { code, sources: counts, message: notice.textContent });
    assert.deepEqual(result.diagnostics.warnings, ['existing warning', notice.textContent]);
  }
});

test('X5a T4 legacy X4 manifest without sourceConfig still runs with no new warning', async () => {
  const old = legacy(combine());
  const notice = { hidden: false, textContent: 'stale' };
  ui.updateModeBSourceConfigNotice(notice, old.manifest);
  assert.equal(notice.hidden, true);
  for (const [, build, run] of copies) {
    const result = await run(await build(stateFor(old)), runtime());
    assert.equal(result.ok, true, result.error);
    assert.equal(result.diagnostics.modeBSourceConfigNotApplied, undefined);
  }
});

test('X5a T7 counts all entries in large override groups, in notice and Run', async () => {
  const combined = combine(sources({ overrides: { rigidWeight: Object.fromEntries(Array.from({ length: 500 }, (_, i) => [`node-${i}`, i + 1])), rating: {} } }, {}));
  const notice = { hidden: true, textContent: '' };
  ui.updateModeBSourceConfigNotice(notice, combined.manifest);
  assert.equal(notice.hidden, false);
  assert.match(notice.textContent, /overrides=2 groups, overrideEntries=500/);
  for (const [, build, run] of copies) {
    const result = await run(await build(stateFor(combined)), runtime());
    assert.equal(result.ok, true, result.error);
    const warning = result.diagnostics.modeBSourceConfigNotApplied;
    assert.equal(warning.sources[0].overrides, 2);
    assert.equal(warning.sources[0].overrideEntries, 500);
    assert.equal(warning.sources[1].overrideEntries, 0);
    assert.equal(warning.message, notice.textContent);
  }
});

test('X5a T8 invalid capture containers refuse, including explicit empty array', () => {
  for (const cfg of [{ overrides: [] }, { overrides: { rigidWeight: 'bad' } }, { overrides: { rigidWeight: [] } },
    { overrides: null }, { linelist: { branchLineKeyMap: 'bad' } }, { weight: { finalizedMatches: {} } }]) {
    assert.throws(() => combine(sources(cfg)), { code: 'MODE_B_SOURCE_CONFIG_INVALID' });
  }
  assert.throws(() => combine(sources({ overrides: [] })), /use \{\}, not \[\], for empty overrides/);
});

test('X5a T9 restored or tampered manifests flag invalid types and digest before Run', async () => {
  const change = [
    row => { row.sourceConfig.overrides = 'bad'; },
    row => { row.sourceConfig.overrides.rigidWeight = []; },
    row => { row.sourceConfig.branchLineKeyMap = 'bad'; },
    row => { row.sourceConfig.finalizedMatches = 'bad'; },
    row => { row.sourceConfig.sha256 = '0'.repeat(64); },
    row => { row.sourceConfig.overrides.rigidWeight['/INVENTED-A::10'] = 999; },
    row => { delete row.sourceConfig; },
  ];
  for (const mutate of change) {
    const combined = JSON.parse(JSON.stringify(combine()));
    mutate(combined.manifest.sourceOrder[0]);
    const notice = { hidden: true, textContent: '' };
    ui.updateModeBSourceConfigNotice(notice, combined.manifest);
    assert.equal(notice.hidden, false);
    assert.match(notice.textContent, /^MODE_B_SOURCE_CONFIG_INVALID:/);
    assert.doesNotMatch(notice.textContent, /overrideEntries=/);
    for (const [, build, run] of copies) {
      let engineCalled = false;
      const result = await run(await build(stateFor(combined)), runtime(async () => { engineCalled = true; return { ok: true }; }));
      assert.equal(result.ok, false);
      assert.match(result.error, /^MODE_B_SOURCE_CONFIG_INVALID:/);
      assert.equal(engineCalled, false);
    }
  }
  const empty = combine(sources({}, {}));
  empty.manifest.sourceOrder[0].sourceConfig.sha256 = '0'.repeat(64);
  const notice = { hidden: true, textContent: '' };
  ui.updateModeBSourceConfigNotice(notice, empty.manifest);
  assert.match(notice.textContent, /^MODE_B_SOURCE_CONFIG_INVALID:/);
});

const repo = new URL('../', import.meta.url);
function nativeEngine(copy, dir) {
  return async job => {
    const input = join(dir, 'input.xml'), output = join(dir, 'output.cii');
    writeFileSync(input, job.sourceText);
    const script = fileURLToPath(new URL((copy === 'root' ? '' : 'v045/') + 'converters/scripts/xml_to_cii2019_patched.py', repo));
    const python = process.env.PYTHON || 'python';
    const run = spawnSync(python, [script, '--input', input, '--output', output, '--support-config-json', job.supportConfigJson], { encoding: 'utf8' });
    assert.equal(run.status, 0, run.error?.message || run.stderr || run.stdout);
    return { ok: true, enrichedText: job.sourceText, ciiText: readFileSync(output, 'utf8'), diagnostics: {}, logs: [] };
  };
}

test('X5a T5 pre-X5a equivalent manifest and new capture yield identical XML and actual native CII bytes', async () => {
  const combined = combine(), old = legacy(combined);
  assert.equal(combined.xmlText, xml(pipe('/INVENTED-A'), pipe('/INVENTED-B', 100000)));
  assert.equal(combined.xmlText, combine(sources({}, {})).xmlText);
  const dir = mkdtempSync(join(tmpdir(), 'x5a-invented-'));
  try {
    for (const [copy, build, run] of copies) {
      const before = await build(stateFor(old)), after = await build(stateFor(combined));
      assert.equal(after.supportConfigJson, before.supportConfigJson);
      const a = await run(before, runtime(nativeEngine(copy, dir)));
      const b = await run(after, runtime(nativeEngine(copy, dir)));
      assert.equal(a.ok, true, a.error); assert.equal(b.ok, true, b.error);
      assert.deepEqual(Buffer.from(b.enrichedText), Buffer.from(a.enrichedText));
      assert.ok(a.ciiText.includes('#$ ELEMENTS'));
      assert.deepEqual(Buffer.from(b.ciiText), Buffer.from(a.ciiText));
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('X5a T6 all production importers in the X5a chain are versioned and docs mirrors match', () => {
  const seeds = ['converters/xml-cii2019-core/mode-b-source-config.js', 'converters/xml-cii2019-core/xml-node-offset-combine.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-mode-b-xml-export.js', 'tabs/xml-cii-2019-standalone/xml-cii-workflow-service.js'];
  const changed = new Set([...seeds, ...seeds.map(p => 'docs/' + p), 'v045/tabs/xml-cii-2019-standalone/xml-cii-workflow-service.js']);
  changed.add('v045/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-final-rigid-review.js');
  // Preserve X4's direct-import contract in the broader X5a graph check too.
  const x4Direct = new Map([
    ['mode-b-restraint-conservation.js', '?v=20261113-x4-1'],
    ['xml-node-offset-combine.js', '?v=20261113-x5a-2'],
    ['xml-cii-workflow-service.js', '?v=20261113-x5a-2'],
    ['xml-cii-workflow-types.js', '?v=20261113-x4-1'],
    ['xml-cii-workflow-ui-adapter.js', '?v=20261113-x4-1'],
    ['xml-cii-mode-b-restraint-closure.js', '?v=20261113-x4-1'],
  ]);
  const references = /(['"])((?:\.{1,2}\/)[^'"\s?#]+\.(?:m?js))(\?v=[^'"\s]+)?\1/g;
  const refs = new Map();
  function walk(directory) {
    for (const entry of readdirSync(new URL(directory + '/', repo), { withFileTypes: true })) {
      const path = posix.join(directory, entry.name);
      if (entry.isDirectory() && !['backup', 'node_modules', '.bak'].includes(entry.name)) walk(path);
      else if (entry.isFile() && /\.(?:m?js|html)$/.test(entry.name)) {
        refs.set(path, [...readFileSync(new URL(path, repo), 'utf8').matchAll(references)].map(m => ({ target: posix.normalize(posix.join(posix.dirname(path), m[2])), version: m[3] })));
      }
    }
  }
  for (const dir of ['converters', 'tabs', 'v045', 'core', 'docs/converters', 'docs/tabs', 'docs/core']) walk(dir);
  for (const path of ['index.html', 'main-rhbg-fitguard.js', 'docs/index.html', 'docs/main-rhbg-fitguard.js']) {
    refs.set(path, [...readFileSync(new URL(path, repo), 'utf8').matchAll(references)].map(m => ({ target: posix.normalize(posix.join(posix.dirname(path), m[2])), version: m[3] })));
  }
  let previousSize;
  do {
    previousSize = changed.size;
    for (const [path, matches] of refs) if (matches.some(m => changed.has(m.target))) changed.add(path);
  } while (previousSize !== changed.size);
  for (const [path, matches] of refs) for (const m of matches) {
    const directVersion = x4Direct.get(posix.basename(m.target));
    if (directVersion) assert.equal(m.version, directVersion, `${path}: ${m.target}`);
    if (changed.has(m.target)) assert.equal(m.version, '?v=20261113-x5a-2', `${path}: ${m.target}`);
  }
  const divergentAtBase = new Set(['tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events-mode-a.js', 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-workflow-shell-mode-a-easy-bulk-v6.js']);
  for (const path of changed) {
    if (path.startsWith('docs/') || divergentAtBase.has(path)) continue;
    const mirror = new URL('docs/' + path, repo);
    if (existsSync(mirror)) assert.deepEqual(readFileSync(mirror), readFileSync(new URL(path, repo)), `${path}: docs mirror differs`);
  }
});
