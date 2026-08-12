import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  AIV_ASSESSMENT_CSV_HEADER,
  createAivAssessmentCsvTemplate,
  parseAivAssessmentCsv,
} from '../converters/vibration/aiv/assessment-csv.js';
import { buildAivReadiness } from '../converters/vibration/aiv/aiv-readiness.js';
import {
  AIV_SOURCE_CSV_HEADER,
  createAivSourceCsvTemplate,
  parseAivSourceCsv,
} from '../converters/vibration/aiv/source-csv.js';
import {
  AIV_SOURCE_ASSESSMENT_CSV_HEADER,
  createAivSourceAssessmentCsvTemplate,
  parseAivSourceAssessmentCsv,
} from '../converters/vibration/aiv/source-assessment-csv.js';
import { serializeVibrationCsvRows } from '../converters/vibration/tabular/csv.js';
import { renderAivQualificationWorkspaceHtml } from '../tabs/vibration-aiv-qualification-view.js';

const ROOT = new URL('../', import.meta.url);
const sourceText = (path) => fs.readFileSync(new URL(path, ROOT), 'utf8');

function exchange() {
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
      { canonicalId: 'CAN-RV-1', tag: 'RV-102', type: 'VALV', line: '10-FG-101', sourceStatus: 'CERTIFIED' },
      { canonicalId: 'CAN-P-1', tag: 'P-101', type: 'PIPE', line: '10-FG-101', lengthMm: 800, sourceStatus: 'CERTIFIED' },
      { canonicalId: 'CAN-WO-1', tag: 'WO-103', type: 'OLET', line: '10-FG-101', sourceStatus: 'CERTIFIED' },
      { canonicalId: 'CAN-WO-2', tag: 'WO-104', type: 'OLET', line: '10-FG-101', sourceStatus: 'CERTIFIED' },
    ],
    connections: [
      { canonicalId: 'CAN-PSV-1', nodeId: 'N-1' },
      { canonicalId: 'CAN-RV-1', nodeId: 'N-1' },
      { canonicalId: 'CAN-P-1', nodeId: 'N-1' },
      { canonicalId: 'CAN-P-1', nodeId: 'N-2' },
      { canonicalId: 'CAN-WO-1', nodeId: 'N-2' },
      { canonicalId: 'CAN-WO-2', nodeId: 'N-2' },
    ],
  };
}

function sourceRow(overrides = {}) {
  const v = {
    id: 'CAN-PSV-1', caseId: 'RELIEF-01', device: 'RELIEF_VALVE', state: 'RELIEVING', phase: 'GAS',
    flow: '53482', flowUnit: 'kg/h', p1: '98', p1Unit: 'bar', p1Basis: 'GAUGE',
    p2: '0', p2Unit: 'bar', p2Basis: 'GAUGE', pref: '1', prefUnit: 'bar',
    prefSource: 'Project pressure basis', prefRevision: 'PB-1', temperature: '137', temperatureUnit: 'degC',
    mw: '21.75', mwUnit: 'g/mol', trimState: 'NONE', trimReduction: '', trimUnit: '', trimSource: '',
    trimRevision: '', sonic: 'NON_SONIC', source: 'EI D.2.3', sourceRevision: 'fb549185',
    recordId: 'D2.3-RELIEF', status: 'CONTROLLED', reviewer: 'QUALIFICATION', ...overrides,
  };
  return [
    v.id, v.caseId, v.device, v.state, v.phase, v.flow, v.flowUnit,
    v.p1, v.p1Unit, v.p1Basis, v.p2, v.p2Unit, v.p2Basis,
    v.pref, v.prefUnit, v.prefSource, v.prefRevision,
    v.temperature, v.temperatureUnit, v.mw, v.mwUnit,
    v.trimState, v.trimReduction, v.trimUnit, v.trimSource, v.trimRevision,
    v.sonic, v.source, v.sourceRevision, v.recordId, v.status, v.reviewer,
  ];
}

function assessmentRow(overrides = {}) {
  const v = {
    id: 'CAN-WO-1', type: 'WELDOLET', mainOd: '168.3', mainOdUnit: 'mm', mainId: '154', mainIdUnit: 'mm',
    mainWt: '7.11', mainWtUnit: 'mm', branchOd: '60.3', branchOdUnit: 'mm', branchWt: '', branchWtUnit: '',
    material: 'Carbon Steel', duplex: 'NO', source: 'EI D.2.3', revision: 'fb549185',
    recordId: 'D2.3-WO-1', status: 'CONTROLLED', reviewer: 'QUALIFICATION', ...overrides,
  };
  return [
    v.id, v.type, v.mainOd, v.mainOdUnit, v.mainId, v.mainIdUnit,
    v.mainWt, v.mainWtUnit, v.branchOd, v.branchOdUnit, v.branchWt, v.branchWtUnit,
    v.material, v.duplex, v.source, v.revision, v.recordId, v.status, v.reviewer,
  ];
}

function relationshipRow(overrides = {}) {
  const v = {
    sourceId: 'CAN-PSV-1', assessmentId: 'CAN-WO-1', caseId: 'RELIEF-01', distance: '0.8', distanceUnit: 'm',
    distanceSource: 'EI D.2.3', distanceRevision: 'fb549185', group: '', applicability: 'APPLICABLE',
    source: 'EI D.2.3 relationship', revision: 'fb549185', recordId: 'D2.3-REL-1',
    status: 'CONTROLLED', reviewer: 'QUALIFICATION', ...overrides,
  };
  return [
    v.sourceId, v.assessmentId, v.caseId, v.distance, v.distanceUnit,
    v.distanceSource, v.distanceRevision, v.group, v.applicability,
    v.source, v.revision, v.recordId, v.status, v.reviewer,
  ];
}

function parseSources(rows = [sourceRow()]) {
  return parseAivSourceCsv(serializeVibrationCsvRows([AIV_SOURCE_CSV_HEADER, ...rows]));
}
function parseAssessments(rows = [assessmentRow()]) {
  return parseAivAssessmentCsv(serializeVibrationCsvRows([AIV_ASSESSMENT_CSV_HEADER, ...rows]));
}
function parseRelationships(rows = [relationshipRow()]) {
  return parseAivSourceAssessmentCsv(serializeVibrationCsvRows([AIV_SOURCE_ASSESSMENT_CSV_HEADER, ...rows]));
}

function readiness({ sources = parseSources(), assessments = parseAssessments(), relationships = parseRelationships() } = {}) {
  return buildAivReadiness(exchange(), sources, assessments, relationships);
}

test('split templates make source, assessment and relationship ownership explicit', () => {
  const sourceTemplate = createAivSourceCsvTemplate();
  const assessmentTemplate = createAivAssessmentCsvTemplate();
  const relationshipTemplate = createAivSourceAssessmentCsvTemplate();
  assert.match(sourceTemplate, /Upstream Pressure Basis/u);
  assert.doesNotMatch(sourceTemplate, /Assessment Canonical ID/u);
  assert.match(assessmentTemplate, /Assessment Type/u);
  assert.match(assessmentTemplate, /Main Inside Diameter/u);
  assert.match(relationshipTemplate, /Physical Distance/u);
  assert.match(relationshipTemplate, /Simultaneous Source Group/u);
});

test('source parser preserves process evidence once without assessment identity', () => {
  const parsed = parseSources()[0];
  assert.equal(parsed.sourceCanonicalId, 'CAN-PSV-1');
  assert.equal(parsed.caseId, 'RELIEF-01');
  assert.equal('assessmentCanonicalId' in parsed, false);
  assert.deepEqual(parsed.upstreamPressure, { value: 98, unit: 'bar', basis: 'GAUGE' });
  assert.deepEqual(parsed.referencePressure, { value: 1, unit: 'bar' });
});

test('assessment parser preserves geometry/material evidence independently of source process data', () => {
  const parsed = parseAssessments()[0];
  assert.equal(parsed.assessmentCanonicalId, 'CAN-WO-1');
  assert.equal(parsed.assessmentType, 'WELDOLET');
  assert.deepEqual(parsed.mainInsideDiameter, { value: 154, unit: 'mm' });
  assert.deepEqual(parsed.branchOutsideDiameter, { value: 60.3, unit: 'mm' });
  assert.equal(parsed.duplexState, 'NO');
  assert.equal('massFlow' in parsed, false);
});

test('relationship parser owns physical distance, applicability and simultaneous-source grouping', () => {
  const parsed = parseRelationships([relationshipRow({ group: 'SIM-1' })])[0];
  assert.deepEqual(parsed.physicalDistance, { value: 0.8, unit: 'm' });
  assert.equal(parsed.distanceSource, 'EI D.2.3');
  assert.equal(parsed.distanceSourceRevision, 'fb549185');
  assert.equal(parsed.applicabilityDisposition, 'APPLICABLE');
  assert.equal(parsed.simultaneousSourceGroup, 'SIM-1');
});

test('complete split evidence is READY_FOR_QUALIFICATION but never prepares numerical execution', () => {
  const item = readiness().rows[0];
  assert.equal(item.status, 'READY_FOR_QUALIFICATION');
  assert.equal(item.requestPrepared, false);
  assert.equal(item.numericalExecutionAuthorized, false);
  assert.deepEqual(item.physicalDistance, { value: 0.8, unit: 'm' });
  assert.equal(item.topology.physicalDistanceMm, null);
  assert.equal(item.relationshipTrace.distanceSource, 'EI D.2.3');
  assert.equal(item.assessmentTrace.assessmentType, 'WELDOLET');
});

test('one source can map to multiple assessments without duplicating process evidence', () => {
  const assessments = parseAssessments([
    assessmentRow(),
    assessmentRow({ id: 'CAN-WO-2', recordId: 'D2.3-WO-2' }),
  ]);
  const relationships = parseRelationships([
    relationshipRow(),
    relationshipRow({ assessmentId: 'CAN-WO-2', recordId: 'D2.3-REL-2', distance: '1.2' }),
  ]);
  const result = readiness({ sources: parseSources(), assessments, relationships });
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows.filter((row) => row.sourceCanonicalId === 'CAN-PSV-1').length, 2);
  assert(result.rows.every((row) => row.status === 'READY_FOR_QUALIFICATION'));
});

test('multiple sources can contribute to one assessment with an explicit simultaneous-source group', () => {
  const sources = parseSources([
    sourceRow(),
    sourceRow({ id: 'CAN-RV-1', caseId: 'RELIEF-01', device: 'CONTROL_VALVE', state: 'OPEN', recordId: 'D2.3-RV' }),
  ]);
  const relationships = parseRelationships([
    relationshipRow({ group: 'SIM-A' }),
    relationshipRow({ sourceId: 'CAN-RV-1', group: 'SIM-A', recordId: 'D2.3-REL-RV' }),
  ]);
  const result = readiness({ sources, assessments: parseAssessments(), relationships });
  assert.equal(result.rows.length, 2);
  assert(result.rows.every((row) => row.assessmentCanonicalId === 'CAN-WO-1'));
  assert(result.rows.every((row) => row.simultaneousSourceGroup === 'SIM-A'));
});

test('applicable relationship fails closed without engineering distance provenance', () => {
  const missingDistance = readiness({
    relationships: parseRelationships([relationshipRow({ distance: '', distanceUnit: '' })]),
  }).rows[0];
  assert.equal(missingDistance.status, 'NOT_READY');
  assert(missingDistance.missing.some((entry) => entry.code === 'AIV_PHYSICAL_DISTANCE_REQUIRED'));

  const missingSource = readiness({
    relationships: parseRelationships([relationshipRow({ distanceSource: '' })]),
  }).rows[0];
  assert.equal(missingSource.status, 'NOT_READY');
  assert(missingSource.missing.some((entry) => entry.code === 'AIV_DISTANCE_SOURCE_REQUIRED'));
});

test('missing source or assessment joins fail closed instead of inventing records', () => {
  const missingSource = readiness({ sources: [] }).rows[0];
  assert.equal(missingSource.status, 'NOT_READY');
  assert(missingSource.missing.some((entry) => entry.code === 'AIV_SOURCE_JOIN_REQUIRED'));

  const missingAssessment = readiness({ assessments: [] }).rows[0];
  assert.equal(missingAssessment.status, 'NOT_READY');
  assert(missingAssessment.missing.some((entry) => entry.code === 'AIV_ASSESSMENT_JOIN_REQUIRED'));
});

test('gauge pressure still requires explicit reference quantity and provenance', () => {
  const result = readiness({
    sources: parseSources([sourceRow({ pref: '', prefUnit: '', prefSource: '', prefRevision: '' })]),
  }).rows[0];
  assert.equal(result.status, 'NOT_READY');
  assert(result.missing.some((entry) => entry.code === 'AIV_REFERENCE_PRESSURE_REQUIRED'));
  assert(result.missing.some((entry) => entry.code === 'AIV_REFERENCE_PRESSURE_SOURCE_REQUIRED'));
  assert(result.missing.some((entry) => entry.code === 'AIV_REFERENCE_PRESSURE_SOURCE_REVISION_REQUIRED'));
});

test('sonic source remains METHOD_GAP pending human benchmark acceptance', () => {
  const result = readiness({ sources: parseSources([sourceRow({ sonic: 'SONIC' })]) }).rows[0];
  assert.equal(result.status, 'METHOD_GAP');
  assert(result.methodGaps.some((entry) => entry.code === 'AIV_SONIC_SFF6_BRANCH_UNQUALIFIED'));
});

test('NOT_APPLICABLE relationship needs no distance but remains explicit', () => {
  const relationships = parseRelationships([relationshipRow({
    applicability: 'NOT_APPLICABLE', distance: '', distanceUnit: '', distanceSource: '', distanceRevision: '',
  })]);
  const result = readiness({ relationships }).rows[0];
  assert.equal(result.status, 'NOT_APPLICABLE');
  assert.equal(result.physicalDistance, null);
});

test('qualification workspace exposes split inputs while retaining no Run/Calculate path', () => {
  const html = renderAivQualificationWorkspaceHtml({
    files: { topology: null, sources: null, assessments: null, relationships: null },
    readinessEnvelope: null, selectedRowKey: null, busy: false, error: null,
  });
  assert.match(html, /AIV working evidence/u);
  assert.match(html, /AivSourceCsv\.v2/u);
  assert.match(html, /AivAssessmentCsv\.v1/u);
  assert.match(html, /AivSourceAssessmentCsv\.v1/u);
  assert.match(html, /Check AIV readiness/u);
  assert.doesNotMatch(html, /Run AIV benchmark|Run AIV screening|data-action="calculate"/u);
});

test('AIV readiness/controller source remains free of numerical engineering execution', () => {
  const combined = [
    sourceText('converters/vibration/aiv/aiv-readiness.js'),
    sourceText('converters/vibration/aiv/aiv-readiness-tables.js'),
    sourceText('tabs/vibration-aiv-qualification-tab.js'),
    sourceText('tabs/vibration-aiv-readiness-view.js'),
  ].join('\n');
  assert.doesNotMatch(combined, /calculateEngineering(?:Batch)?|calculateAiv|sourcePower/u);
  assert.doesNotMatch(combined, /project3DPoint|SequentialCommandGateway|WorkspaceState|EventBus/u);
});
