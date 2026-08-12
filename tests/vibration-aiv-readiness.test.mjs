import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  AIV_SOURCE_CASE_CSV_HEADER,
  createAivSourceCaseCsvTemplate,
  parseAivSourceCaseCsv,
} from '../converters/vibration/aiv/source-case-csv.js';
import { buildAivReadiness } from '../converters/vibration/aiv/aiv-readiness.js';
import { serializeVibrationCsvRows } from '../converters/vibration/tabular/csv.js';
import { renderAivQualificationWorkspaceHtml } from '../tabs/vibration-aiv-qualification-view.js';

const ROOT = new URL('../', import.meta.url);
const source = (path) => fs.readFileSync(new URL(path, ROOT), 'utf8');

function exchange(connections = null) {
  return {
    schema: 'VibrationTableExchange.v1',
    sourceSchema: 'TopologyEditTableHumanExport.v1',
    sourceFormat: 'XLSX',
    completeExchange: true,
    integrityStatus: 'DECLARED_NOT_REVERIFIED',
    authority: {
      canonicalHash: 'canonical-1', projectionHash: 'projection-1', sourceHash: 'source-1',
      datasetId: 'DS-1', datasetVersion: '12', sourceExportHash: 'export-1',
    },
    elements: [
      { canonicalId: 'CAN-PSV-1', tag: 'PSV-101', type: 'VALV', line: '10-FG-101', sourceStatus: 'CERTIFIED' },
      { canonicalId: 'CAN-P-1', tag: 'P-101', type: 'PIPE', line: '10-FG-101', lengthMm: 800, sourceStatus: 'CERTIFIED' },
      { canonicalId: 'CAN-WO-1', tag: 'WO-103', type: 'OLET', line: '10-FG-101', sourceStatus: 'CERTIFIED' },
    ],
    connections: connections ?? [
      { canonicalId: 'CAN-PSV-1', nodeId: 'N-1' },
      { canonicalId: 'CAN-P-1', nodeId: 'N-1' },
      { canonicalId: 'CAN-P-1', nodeId: 'N-2' },
      { canonicalId: 'CAN-WO-1', nodeId: 'N-2' },
    ],
  };
}

function row(overrides = {}) {
  const values = {
    sourceCanonicalId: 'CAN-PSV-1', assessmentCanonicalId: 'CAN-WO-1', caseId: 'RELIEF-01',
    sourceDeviceType: 'RELIEF_VALVE', sourceState: 'RELIEVING', phase: 'GAS',
    massFlow: '53482', massFlowUnit: 'kg/h',
    p1: '98', p1Unit: 'bar', p1Basis: 'GAUGE',
    p2: '0', p2Unit: 'bar', p2Basis: 'GAUGE',
    pref: '1', prefUnit: 'bar', prefSource: 'Project pressure basis', prefSourceRevision: 'PB-1',
    temperature: '137', temperatureUnit: 'degC', mw: '21.75', mwUnit: 'g/mol',
    trimState: 'NONE', trimReduction: '', trimUnit: '', trimSource: '', trimSourceRevision: '',
    sonic: 'NON_SONIC', source: 'EI D.2.3',
    sourceRevision: 'fb549185', recordId: 'D2.3-RELIEF', status: 'CONTROLLED', reviewer: 'QUALIFICATION',
    ...overrides,
  };
  return [
    values.sourceCanonicalId, values.assessmentCanonicalId, values.caseId,
    values.sourceDeviceType, values.sourceState, values.phase,
    values.massFlow, values.massFlowUnit,
    values.p1, values.p1Unit, values.p1Basis,
    values.p2, values.p2Unit, values.p2Basis,
    values.pref, values.prefUnit, values.prefSource, values.prefSourceRevision,
    values.temperature, values.temperatureUnit,
    values.mw, values.mwUnit,
    values.trimState, values.trimReduction, values.trimUnit, values.trimSource, values.trimSourceRevision,
    values.sonic, values.source, values.sourceRevision, values.recordId, values.status, values.reviewer,
  ];
}

function parseOne(overrides = {}) {
  return parseAivSourceCaseCsv(serializeVibrationCsvRows([AIV_SOURCE_CASE_CSV_HEADER, row(overrides)]))[0];
}

test('AivSourceCaseCsv.v1 template exposes explicit P1/P2, reference-source, trim and branch-state fields', () => {
  const template = createAivSourceCaseCsvTemplate();
  assert.match(template, /Upstream Pressure Basis/u);
  assert.match(template, /Downstream Pressure Basis/u);
  assert.match(template, /Reference Pressure Source Revision/u);
  assert.match(template, /Low Noise Trim State/u);
  assert.match(template, /Low Noise Trim Source Revision/u);
  assert.match(template, /Sonic State/u);
  assert.equal(template.split(/\r?\n/u)[0].split(',').length, AIV_SOURCE_CASE_CSV_HEADER.length);
});

test('source-case parser preserves pressure values and field-level provenance without conversion', () => {
  const parsed = parseOne();
  assert.equal(parsed.sourceCanonicalId, 'CAN-PSV-1');
  assert.equal(parsed.assessmentCanonicalId, 'CAN-WO-1');
  assert.deepEqual(parsed.upstreamPressure, { value: 98, unit: 'bar', basis: 'GAUGE' });
  assert.deepEqual(parsed.downstreamPressure, { value: 0, unit: 'bar', basis: 'GAUGE' });
  assert.deepEqual(parsed.referencePressure, { value: 1, unit: 'bar' });
  assert.equal(parsed.referencePressureSource, 'Project pressure basis');
  assert.equal(parsed.referencePressureSourceRevision, 'PB-1');
  assert.deepEqual(parsed.lowNoiseTrim, { state: 'NONE' });
  assert.equal(parsed.sonicState, 'NON_SONIC');
});

test('complete non-sonic gas evidence is READY_FOR_QUALIFICATION but never prepares numerical execution', () => {
  const readiness = buildAivReadiness(exchange(), [parseOne()]);
  const item = readiness.rows[0];
  assert.equal(item.status, 'READY_FOR_QUALIFICATION');
  assert.equal(item.requestPrepared, false);
  assert.equal(item.numericalExecutionAuthorized, false);
  assert.equal(item.topology.pathStatus, 'RESOLVED');
  assert.equal(item.topology.physicalDistanceMm, null);
  assert.deepEqual(item.sourceTrace.referencePressure, {
    value: 1, unit: 'bar', source: 'Project pressure basis', sourceRevision: 'PB-1',
  });
  assert.equal(readiness.authority.calculationState, 'BLOCKED');
});

test('gauge pressure requires reference quantity plus controlled source and revision', () => {
  const missingPressure = buildAivReadiness(exchange(), [parseOne({ pref: '', prefUnit: '' })]).rows[0];
  assert.equal(missingPressure.status, 'NOT_READY');
  assert(missingPressure.missing.some((entry) => entry.code === 'AIV_REFERENCE_PRESSURE_REQUIRED'));

  const missingSource = buildAivReadiness(exchange(), [parseOne({ prefSource: '' })]).rows[0];
  assert.equal(missingSource.status, 'NOT_READY');
  assert(missingSource.missing.some((entry) => entry.code === 'AIV_REFERENCE_PRESSURE_SOURCE_REQUIRED'));

  const missingRevision = buildAivReadiness(exchange(), [parseOne({ prefSourceRevision: '' })]).rows[0];
  assert.equal(missingRevision.status, 'NOT_READY');
  assert(missingRevision.missing.some((entry) => entry.code === 'AIV_REFERENCE_PRESSURE_SOURCE_REVISION_REQUIRED'));
});

test('source-case record revision and stable record ID are readiness requirements', () => {
  const missingRevision = buildAivReadiness(exchange(), [parseOne({ sourceRevision: '' })]).rows[0];
  assert.equal(missingRevision.status, 'NOT_READY');
  assert(missingRevision.missing.some((entry) => entry.code === 'AIV_SOURCE_REVISION_REQUIRED'));
  const missingRecord = buildAivReadiness(exchange(), [parseOne({ recordId: '' })]).rows[0];
  assert.equal(missingRecord.status, 'NOT_READY');
  assert(missingRecord.missing.some((entry) => entry.code === 'AIV_SOURCE_RECORD_ID_REQUIRED'));
});

test('manufacturer trim requires dB reduction plus vendor source and source revision', () => {
  const ready = buildAivReadiness(exchange(), [parseOne({
    trimState: 'MANUFACTURER_REDUCTION', trimReduction: '30', trimUnit: 'dB',
    trimSource: 'Valve manufacturer', trimSourceRevision: 'datasheet-7',
  })]);
  assert.equal(ready.rows[0].status, 'READY_FOR_QUALIFICATION');
  assert.deepEqual(ready.rows[0].sourceTrace.lowNoiseTrim, {
    state: 'MANUFACTURER_REDUCTION', reduction: { value: 30, unit: 'dB' },
    source: 'Valve manufacturer', sourceRevision: 'datasheet-7',
  });

  const missingVendor = buildAivReadiness(exchange(), [parseOne({
    trimState: 'MANUFACTURER_REDUCTION', trimReduction: '30', trimUnit: 'dB', trimSource: '',
  })]).rows[0];
  assert.equal(missingVendor.status, 'NOT_READY');
  assert(missingVendor.missing.some((entry) => entry.code === 'AIV_LOW_NOISE_TRIM_SOURCE_REQUIRED'));

  const missingRevision = buildAivReadiness(exchange(), [parseOne({
    trimState: 'MANUFACTURER_REDUCTION', trimReduction: '30', trimUnit: 'dB',
    trimSource: 'Valve manufacturer', trimSourceRevision: '',
  })]).rows[0];
  assert.equal(missingRevision.status, 'NOT_READY');
  assert(missingRevision.missing.some((entry) => entry.code === 'AIV_LOW_NOISE_TRIM_SOURCE_REVISION_REQUIRED'));
});

test('sonic evidence remains METHOD_GAP because D.2.3 does not exercise SFF = 6', () => {
  const item = buildAivReadiness(exchange(), [parseOne({ sonic: 'SONIC' })]).rows[0];
  assert.equal(item.status, 'METHOD_GAP');
  assert(item.methodGaps.some((entry) => entry.code === 'AIV_SONIC_SFF6_BRANCH_UNQUALIFIED'));
});

test('non-gas phase remains a method gap rather than being silently calculated', () => {
  const item = buildAivReadiness(exchange(), [parseOne({ phase: 'TWO_PHASE' })]).rows[0];
  assert.equal(item.status, 'METHOD_GAP');
  assert(item.methodGaps.some((entry) => entry.code === 'AIV_PHASE_OUTSIDE_CURRENT_QUALIFICATION_ENVELOPE'));
});

test('qualification workspace exposes readiness inputs while retaining no Run/Calculate path', () => {
  const html = renderAivQualificationWorkspaceHtml({
    files: { topology: null, sourceCases: null }, readinessEnvelope: null,
    selectedRowKey: null, busy: false, error: null,
  });
  assert.match(html, /AIV data readiness/u);
  assert.match(html, /AivSourceCaseCsv\.v1/u);
  assert.match(html, /Check AIV readiness/u);
  assert.match(html, /Download AIV source-case template/u);
  assert.doesNotMatch(html, /Run AIV benchmark|Run AIV screening|data-action="calculate"/u);
});

test('AIV readiness/controller source contains no AIV numerical equation or central execution call', () => {
  const combined = [
    source('converters/vibration/aiv/aiv-readiness.js'),
    source('converters/vibration/aiv/aiv-readiness-tables.js'),
    source('tabs/vibration-aiv-qualification-tab.js'),
    source('tabs/vibration-aiv-readiness-view.js'),
  ].join('\n');
  assert.doesNotMatch(combined, /calculateEngineering(?:Batch)?|calculateAiv|PWL\s*=|LOF\s*=|sourcePower/u);
  assert.doesNotMatch(combined, /project3DPoint|SequentialCommandGateway|WorkspaceState|EventBus/u);
});
