import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  buildVibrationEngineeringBasisProjection,
  vibrationEngineeringBasisSourceCellId,
  VIBRATION_ENGINEERING_BASIS_SCHEMA,
} from '../tabs/vibration-integrity-engineering-basis.js';

const inputViewSource = readFileSync(new URL('../tabs/vibration-integrity-input-view.js', import.meta.url), 'utf8');
const basisViewSource = readFileSync(new URL('../tabs/vibration-integrity-engineering-basis-view.js', import.meta.url), 'utf8');

function table(kind, width, rows) {
  return Object.freeze({
    kind,
    header: Object.freeze(Array.from({ length: width }, (_, i) => `${kind}-${i}`)),
    rows: Object.freeze(rows.map((row) => Object.freeze(row.map(String)))),
    rowIds: Object.freeze(rows.map((_, index) => `${kind}:source:${String(index + 1).padStart(4, '0')}`)),
  });
}

function operating(line, caseId) {
  return [line, caseId, caseId, 'GAS', '12', 'kg/s', '18', 'kg/m3', '26', 'bara', 'absolute',
    '142', 'C', '0.00002', 'Pa*s', '44', 'm/s', 'HMB', 'R3', `REC-${caseId}`];
}

function enrichment(canonicalId, caseId, property, value, type = 'NUMBER', unit = 'm') {
  return [canonicalId, 'NON-AUTHORITATIVE-LINE', caseId, property, value, type, unit, 'EI', 'R1', 'REC', '', ''];
}

function fixture() {
  return {
    topology: table('topology', 15, [
      ['P-1', 'PIPE', 'L-100', '', '', '', '', '', '', '', '', '', '', 'CERTIFIED', 'CID-1'],
    ]),
    operating: table('operating', 20, [operating('L-100', 'CASE-A'), operating('L-100', 'CASE-B')]),
    enrichment: table('enrichment', 12, [
      enrichment('CID-1', '', 'FIT_ASSESSMENT_POINT', 'true', 'BOOLEAN', ''),
      enrichment('CID-1', '', 'OUTSIDE_DIAMETER', '0.1683'),
      enrichment('CID-1', '', 'WALL_THICKNESS', '0.00711'),
      enrichment('CID-1', '', 'MAX_UNSUPPORTED_SPAN', '6.4'),
      enrichment('CID-1', '', 'NATURAL_FREQUENCY', '2.2', 'NUMBER', 'Hz'),
      enrichment('CID-1', 'CASE-B', 'NATURAL_FREQUENCY', '2.8', 'NUMBER', 'Hz'),
    ]),
  };
}

test('joined projection mirrors topology-line assessment-point operating-case join', () => {
  const projection = buildVibrationEngineeringBasisProjection(fixture());
  assert.equal(projection.schema, VIBRATION_ENGINEERING_BASIS_SCHEMA);
  assert.equal(projection.counts.assessmentPoints, 1);
  assert.deepEqual(projection.rows.map((row) => [row.line, row.caseId, row.canonicalId]), [
    ['L-100', 'CASE-A', 'CID-1'], ['L-100', 'CASE-B', 'CID-1'],
  ]);
});

test('case-specific natural frequency overrides global while shared geometry stays global', () => {
  const [caseA, caseB] = buildVibrationEngineeringBasisProjection(fixture()).rows;
  assert.equal(caseA.fit.naturalFrequency.value, '2.2');
  assert.equal(caseA.fit.naturalFrequency.sourceSelection, 'GLOBAL');
  assert.equal(caseB.fit.naturalFrequency.value, '2.8');
  assert.equal(caseB.fit.naturalFrequency.sourceSelection, 'CASE_SPECIFIC');
  assert.equal(caseB.fit.outsideDiameter.value, '0.1683');
});

test('projected editors expose exact backing refs and stable source anchors', () => {
  const row = buildVibrationEngineeringBasisProjection(fixture()).rows[0];
  assert.deepEqual(row.process.massFlow.valueRef, {
    kind: 'operating', rowIndex: 0, rowId: 'operating:source:0001', columnIndex: 4, header: 'operating-4',
  });
  assert.equal(
    vibrationEngineeringBasisSourceCellId(row.process.massFlow.valueRef),
    'vi-source-operating-operating-source-0001-4',
  );
  assert.equal(row.fit.outsideDiameter.valueRef.kind, 'enrichment');
  assert.equal(row.identity.lineRef.kind, 'topology');
});

test('assessment point without operating case remains visible and process editing fails closed', () => {
  const tables = fixture();
  tables.operating = table('operating', 20, []);
  const row = buildVibrationEngineeringBasisProjection(tables).rows[0];
  assert.equal(row.caseId, null);
  assert.equal(row.process.phase.valueRef, null);
  assert.equal(row.fit.outsideDiameter.value, '0.1683');
});

test('UI makes Engineering basis primary while Source Data stays the backing editor contract', () => {
  assert.match(inputViewSource, /renderVibrationEngineeringBasis\(inputState\)/u);
  assert.match(inputViewSource, /<h3>Source Data<\/h3>/u);
  assert.match(inputViewSource, /<section class="vi-card vi-input-table-card vi-source-table">/u);
  assert.match(inputViewSource, /vibrationEngineeringBasisSourceCellId/u);
  assert.match(basisViewSource, /data-vi-table-cell/u);
  assert.match(basisViewSource, /href="#\$\{esc\(id\)\}"/u);
  assert.doesNotMatch(`${inputViewSource}\n${basisViewSource}`, /calculateFit\s*\(|calculateEngineering(?:Batch)?\s*\(/u);
});
