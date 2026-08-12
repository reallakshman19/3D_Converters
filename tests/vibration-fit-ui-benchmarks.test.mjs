import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parseVibrationTableExchangeCsv } from '../converters/vibration/exchange/parse-csv.js';
import { parseVibrationEnrichmentCsv } from '../converters/vibration/tabular/enrichment.js';
import { parseVibrationOperatingCaseCsv } from '../converters/vibration/tabular/operating-cases.js';
import {
  buildVibrationFitUiBenchmarkCase,
  VIBRATION_FIT_UI_BENCHMARK_CASES,
  VIBRATION_FIT_UI_BENCHMARK_SOURCE,
} from '../tabs/vibration-integrity-benchmarks.js';
import { serializeVibrationIntegrityInputTable } from '../tabs/vibration-integrity-input-model.js';

const controlled = JSON.parse(readFileSync(
  new URL('../Benchmarks/VibrationFIT/fit-ei-worked-examples-v1.json', import.meta.url),
  'utf8',
));

function enrichmentMap(rows) {
  return new Map(rows.map((row) => [row.property, row]));
}

function assertInputParity(uiCase, controlledCase) {
  const operating = parseVibrationOperatingCaseCsv(
    serializeVibrationIntegrityInputTable(uiCase.tables.operating),
  )[0];
  const enrichment = enrichmentMap(parseVibrationEnrichmentCsv(
    serializeVibrationIntegrityInputTable(uiCase.tables.enrichment),
  ));
  const source = controlledCase.input;

  assert.equal(operating.phase, source.phase);
  assert.equal(operating.density.value, source.densityKgM3);
  assert.equal(operating.density.unit, 'kg/m3');
  assert.equal(operating.massFlow?.value, source.massFlowKgS);
  assert.equal(operating.velocity?.value, source.fluidVelocityMS);
  assert.equal(operating.dynamicViscosity?.value, source.gasDynamicViscosityPaS);
  assert.equal(enrichment.get('FIT_ASSESSMENT_POINT').value, true);
  assert.equal(enrichment.get('OUTSIDE_DIAMETER').value, source.outsideDiameterM);
  assert.equal(enrichment.get('WALL_THICKNESS').value, source.wallThicknessM);
  assert.equal(enrichment.get('MAX_UNSUPPORTED_SPAN').value, source.maximumUnsupportedSpanM);
  assert.equal(enrichment.get('INSIDE_DIAMETER')?.value, source.insideDiameterM);
}

test('UI benchmark catalogue exactly covers the controlled five EI worked cases', () => {
  assert.equal(VIBRATION_FIT_UI_BENCHMARK_CASES.length, 5);
  assert.deepEqual(
    VIBRATION_FIT_UI_BENCHMARK_CASES.map((entry) => entry.id),
    controlled.cases.map((entry) => entry.id),
  );
  assert.equal(VIBRATION_FIT_UI_BENCHMARK_SOURCE.benchmarkSetId, controlled.benchmarkSetId);
  assert.equal(VIBRATION_FIT_UI_BENCHMARK_SOURCE.commit, controlled.source.commit);
  assert.equal(VIBRATION_FIT_UI_BENCHMARK_SOURCE.gitBlob, controlled.source.gitBlob);
  assert.equal(VIBRATION_FIT_UI_BENCHMARK_SOURCE.relativeTolerance, controlled.roundingPolicy.relativeTolerance);
});

test('every UI benchmark builds production-parseable topology, operating and enrichment tables', () => {
  for (const controlledCase of controlled.cases) {
    const uiCase = buildVibrationFitUiBenchmarkCase(controlledCase.id);
    const topology = parseVibrationTableExchangeCsv(
      serializeVibrationIntegrityInputTable(uiCase.tables.topology),
      { sourceFileName: `${controlledCase.id}.csv` },
    );
    assert.equal(topology.elements.length, 1);
    assert.equal(topology.completeExchange, false);
    assert.equal(topology.elements[0].canonicalId, uiCase.identity.canonicalId);
    assert.equal(topology.elements[0].line, uiCase.identity.line);
    assertInputParity(uiCase, controlledCase);
  }
});

test('published UI targets are identical to controlled EI target values', () => {
  for (const controlledCase of controlled.cases) {
    const uiCase = buildVibrationFitUiBenchmarkCase(controlledCase.id);
    assert.equal(uiCase.published.standardLof, controlledCase.published.standardLof);
    assert.equal(uiCase.published.referenceBand, controlledCase.published.referenceBand);
    assert.equal(uiCase.published.standardFvPa, controlledCase.published.standardFvPa);
    assert.equal(uiCase.published.supportStiffness, controlledCase.published.supportStiffness);
    assert.equal(uiCase.published.supportCategory, controlledCase.published.supportCategory);
    assert.equal(uiCase.modified, false);
  }
});

test('unknown benchmark IDs fail closed', () => {
  assert.throws(
    () => buildVibrationFitUiBenchmarkCase('NOT-A-BENCHMARK'),
    /Unknown FIT benchmark case/u,
  );
});
