// Mode B (RCA-01, Owner 12 Nov): each source's staged JSON reaches the Run and
// closes restraints only on that source's pipes. Synthetic data only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { installWeightBasisXmlDom } from '../tabs/xml-cii-2019-standalone/workers/weight-basis-xml-dom.js';
import { modeBStagedSourcesFromManifest } from '../converters/xml-cii2019-core/xml-node-offset-combine.js';
import { singleXmlCiiSourceState } from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-processing-mode.js';
import { normalizeWorkflowJob } from '../v045/tabs/xml-cii-2019-standalone/xml-cii-workflow-types.js';
import { closeModeBSourceRestraintsXml } from '../v045/tabs/xml-cii-2019-standalone/xml-cii-mode-b-restraint-closure.js';

installWeightBasisXmlDom(globalThis);

const manifest = {
  schema: 'xml-node-offset-combine/v1', offsetStep: 100000, headerSource: 'A.xml', sourceCount: 2, automaticCrossSourceJoins: 0,
  sourceOrder: [
    { sourceId: 'A', fileName: 'A.xml', basis: 'enriched', offset: 0, positiveIdCount: 2, pipeCount: 1,
      numberMap: [{ sourceNumber: 10, outputNumber: 10 }, { sourceNumber: 20, outputNumber: 20 }] },
    { sourceId: 'B', fileName: 'B.xml', basis: 'enriched', offset: 100000, positiveIdCount: 2, pipeCount: 1,
      numberMap: [{ sourceNumber: 10, outputNumber: 100010 }, { sourceNumber: 20, outputNumber: 100020 }] },
  ],
};

const node = (number) => `<Node><NodeNumber>${number}</NodeNumber><ComponentType>ANCI</ComponentType><Position>0 0 0</Position></Node>`;
const pipe = (a, b) => `<Pipe><Branch><Branchname>/P${a}</Branchname>${node(a)}${node(b)}</Branch></Pipe>`;
const COMBINED = `<PipeStressExport><Units>mm</Units>${pipe(10, 20)}${pipe(100010, 100020)}</PipeStressExport>`;

test('Use in Single keeps each source staged JSON with its node range', () => {
  const staged = modeBStagedSourcesFromManifest(manifest, ['{"a":1}', '']);
  assert.deepEqual(staged, [
    { sourceId: '1:A', fileName: 'A.xml', minNode: 10, maxNode: 20, stagedJsonText: '{"a":1}' },
    { sourceId: '2:B', fileName: 'B.xml', minNode: 100010, maxNode: 100020, stagedJsonText: '' },
  ]);
  const state = singleXmlCiiSourceState({ supportConfigJson: '{}' }, { name: 'c.xml' }, COMBINED, 'xml',
    { modeBManifest: manifest, modeBStagedTexts: ['{"a":1}', '{"b":2}'] });
  assert.equal(state.stagedJsonText, '');
  assert.deepEqual(state.modeBStagedSources.map((s) => [s.sourceId, s.stagedJsonText]), [['1:A', '{"a":1}'], ['2:B', '{"b":2}']]);
  const plain = singleXmlCiiSourceState(state, { name: 'p.xml' }, '<x/>', 'xml');
  assert.equal(plain.modeBStagedSources, null);
});

test('the Run job keeps checked Mode B staged sources', () => {
  const base = { sourceText: COMBINED, sourceKind: 'xml', supportConfigJson: '{}' };
  const ok = normalizeWorkflowJob({ ...base, modeBStagedSources: modeBStagedSourcesFromManifest(manifest, ['{}', '{}']) });
  assert.equal(ok.ok, true);
  assert.equal(ok.job.modeBStagedSources.length, 2);
  assert.deepEqual(normalizeWorkflowJob(base).job.modeBStagedSources, []);
  assert.equal(normalizeWorkflowJob({ ...base, modeBStagedSources: [{ sourceId: '', minNode: 1, maxNode: 2 }] }).ok, false);
});

test('each source is closed alone and its new restraints land on its own nodes', () => {
  const sources = modeBStagedSourcesFromManifest(manifest, ['JSON-A', 'JSON-B']);
  const seen = [];
  // Stand-in closure: records what it was given, appends one restraint per node.
  const close = (xmlText, stagedJsonText) => {
    const document = new DOMParser().parseFromString(xmlText, 'application/xml');
    const numbers = [...document.getElementsByTagName('NodeNumber')].map((n) => n.textContent);
    seen.push({ stagedJsonText, numbers });
    for (const n of [...document.getElementsByTagName('Node')]) {
      const restraint = document.createElement('Restraint');
      const type = document.createElement('Type');
      type.textContent = stagedJsonText === 'JSON-A' ? 'GUI' : 'LIM';
      restraint.appendChild(type);
      n.appendChild(restraint);
    }
    return { xmlText: new XMLSerializer().serializeToString(document), changed: true, stats: { mdsGuideRestraintsAdded: 1 }, diagnostics: [] };
  };
  const out = closeModeBSourceRestraintsXml(COMBINED, sources, {}, close);
  assert.deepEqual(seen, [
    { stagedJsonText: 'JSON-A', numbers: ['10', '20'] },
    { stagedJsonText: 'JSON-B', numbers: ['100010', '100020'] },
  ]);
  const document = new DOMParser().parseFromString(out.xmlText, 'application/xml');
  const types = [...document.getElementsByTagName('Node')].map((n) => [
    n.getElementsByTagName('NodeNumber')[0].textContent,
    [...n.getElementsByTagName('Type')].map((t) => t.textContent).join(','),
  ]);
  assert.deepEqual(types, [['10', 'GUI'], ['20', 'GUI'], ['100010', 'LIM'], ['100020', 'LIM']]);
  assert.equal(out.stats.mdsGuideRestraintsAdded, 2);
});

test('a source without staged JSON is skipped and reported; mixed ownership is refused', () => {
  const sources = modeBStagedSourcesFromManifest(manifest, ['JSON-A', '']);
  const calls = [];
  const out = closeModeBSourceRestraintsXml(COMBINED, sources, {}, (x, s) => { calls.push(s); return { changed: false, diagnostics: [] }; });
  assert.deepEqual(calls, ['JSON-A']);
  assert.ok(out.diagnostics.some((d) => d.type === 'mode-b-source-restraint-closure-skipped' && d.sourceId === '2:B'));
  const mixed = `<PipeStressExport><Pipe><Branch>${node(10)}${node(100010)}</Branch></Pipe></PipeStressExport>`;
  assert.throws(() => closeModeBSourceRestraintsXml(mixed, sources, {}, () => ({})), /MODE_B_SOURCE_OWNERSHIP_UNRESOLVED/);
});

test('review fix: stale Mode B staged sources never reach a Run without the matching modeB config', async () => {
  const { modeBStagedSourcesForRun } = await import('../v045/tabs/xml-cii-2019-standalone/xml-cii-workflow-ui-adapter.js');
  const { buildModeAExecutionState } = await import('../v045/tabs/xml-cii-2019-standalone/xml-cii-mode-a-batch.js');
  const { selectXmlCiiProcessingMode } = await import('../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-processing-mode.js');
  const single = singleXmlCiiSourceState({ supportConfigJson: '{}' }, { name: 'c.xml' }, COMBINED, 'xml',
    { modeBManifest: manifest, modeBStagedTexts: ['A', 'B'] });
  assert.equal(modeBStagedSourcesForRun(single).length, 2);
  // Same state but a config without the matching modeB block (e.g. Mode A): nothing is sent.
  assert.deepEqual(modeBStagedSourcesForRun({ ...single, supportConfigJson: '{}' }), []);
  const other = JSON.parse(single.supportConfigJson); other.modeB.sources[0].maxNode = 99;
  assert.deepEqual(modeBStagedSourcesForRun({ ...single, supportConfigJson: JSON.stringify(other) }), []);
  // Mode switch and the Mode A per-source state clear the fields.
  const ref = { current: single };
  selectXmlCiiProcessingMode(ref, 'mode-a', () => {});
  assert.equal(ref.current.modeBStagedSources, null);
  assert.equal(ref.current.modeBManifest, null);
  const run = buildModeAExecutionState(single, { sourceId: 'C', fileName: 'C.xml', sourceText: '<x/>', stagedJsonText: '{}' });
  assert.equal(run.modeBStagedSources, null);
});
