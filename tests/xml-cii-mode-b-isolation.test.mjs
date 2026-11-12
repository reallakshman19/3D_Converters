// Mode B "Use Combined XML in Single" keeps the node-offset manifest, and the
// converter config gets the source ranges that stop cross-source island joins
// (RCA-02/RCA-03, Owner 12 Nov). Synthetic data only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { singleXmlCiiSourceState } from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-processing-mode.js';
import { modeBSupportConfigBlock } from '../converters/xml-cii2019-core/xml-node-offset-combine.js';
import { commonModeASupportConfig } from '../tabs/xml-cii-2019-standalone/xml-cii-mode-a-batch.js';
import { commonModeASupportConfig as commonV045 } from '../v045/tabs/xml-cii-2019-standalone/xml-cii-mode-a-batch.js';

const manifest = {
  schema: 'xml-node-offset-combine/v1', offsetStep: 100000, headerSource: 'A.xml', sourceCount: 3,
  automaticCrossSourceJoins: 0,
  sourceOrder: [
    { sourceId: 'S1', fileName: 'A.xml', basis: 'enriched', offset: 0, positiveIdCount: 3, pipeCount: 1,
      numberMap: [{ sourceNumber: 10, outputNumber: 10 }, { sourceNumber: 50, outputNumber: 50 }, { sourceNumber: 3760, outputNumber: 3760 }] },
    { sourceId: '', fileName: 'A.xml', basis: 'enriched', offset: 100000, positiveIdCount: 2, pipeCount: 1,
      numberMap: [{ sourceNumber: 10, outputNumber: 100010 }, { sourceNumber: 3760, outputNumber: 103760 }] },
    { sourceId: 'S3', fileName: 'C.xml', basis: 'source', offset: 200000, positiveIdCount: 0, pipeCount: 1, numberMap: [] },
  ],
};

test('the manifest becomes one source range per source, with unique ids', () => {
  const block = modeBSupportConfigBlock(manifest);
  assert.deepEqual(block, { schema: 'xml-cii-mode-b-sources/v1', offsetStep: 100000, sources: [
    { sourceId: '1:S1', fileName: 'A.xml', offset: 0, minNode: 10, maxNode: 3760 },
    { sourceId: '2:A.xml', fileName: 'A.xml', offset: 100000, minNode: 100010, maxNode: 103760 },
  ] });
  assert.throws(() => modeBSupportConfigBlock(null), /MODE_B_MANIFEST_REQUIRED/);
  assert.throws(() => modeBSupportConfigBlock({ schema: 'other', sourceOrder: [] }), /MODE_B_MANIFEST_REQUIRED/);
});

test('Use in Single keeps the manifest and puts the source ranges in the converter config', () => {
  const state = { xmlProcessingMode: 'mode-b', supportConfigJson: JSON.stringify({ rating: { a: 1 }, overrides: { x: 1 } }),
    masterContext: { datasetRefs: { weight: 'w' }, config: {} } };
  const next = singleXmlCiiSourceState(state, { name: 'Mode-B-combined.xml' }, '<PipeStressExport/>', 'xml', { modeBManifest: manifest });
  assert.equal(next.modeBManifest, manifest);
  const config = JSON.parse(next.supportConfigJson);
  assert.deepEqual(config.modeB, modeBSupportConfigBlock(manifest));
  assert.deepEqual(config.rating, { a: 1 });
  assert.equal(config.overrides, undefined);
  assert.deepEqual(next.masterContext.config, config);
});

test('a later plain Single load, and Mode A, drop the stale Mode B ranges', () => {
  const combined = singleXmlCiiSourceState({ supportConfigJson: '{}' }, { name: 'c.xml' }, '<x/>', 'xml', { modeBManifest: manifest });
  const plain = singleXmlCiiSourceState(combined, { name: 'other.xml' }, '<y/>', 'xml');
  assert.equal(plain.modeBManifest, null);
  assert.equal(JSON.parse(plain.supportConfigJson).modeB, undefined);
  for (const common of [commonModeASupportConfig, commonV045]) {
    assert.equal(JSON.parse(common(combined.supportConfigJson)).modeB, undefined);
  }
});
