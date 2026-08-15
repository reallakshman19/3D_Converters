import assert from 'node:assert/strict';
import test from 'node:test';

import { buildAivEitExport, serializeAivEitExport } from '../converters/vibration/aiv/aiv-eit-export.js';
import { parseAivEitImport } from '../converters/vibration/aiv/aiv-eit-import.js';
import { buildAivMasterEvidence, selectAivMasterEvidence } from '../converters/vibration/aiv/aiv-master-evidence.js';
import { buildAivScreeningExportPackage } from '../converters/vibration/aiv/aiv-screening-export.js';

function source() {
  return {
    sourceCanonicalId: 'SRC-1', caseId: 'CASE-1', sourceDeviceType: 'RELIEF_VALVE', sourceState: 'RELIEVING',
    phase: 'GAS', massFlow: { value: 10, unit: 'kg/s' },
    upstreamPressure: { value: 5, unit: 'MPa', basis: 'ABSOLUTE' },
    downstreamPressure: { value: 1, unit: 'MPa', basis: 'ABSOLUTE' },
    upstreamTemperature: { value: 300, unit: 'K' }, molecularWeight: { value: 20, unit: 'g/mol' },
    lowNoiseTrim: { state: 'NONE' }, sonicState: 'NON_SONIC',
  };
}
function assessment() {
  return {
    assessmentCanonicalId: 'ASSMT-1', assessmentType: 'WELDED_TEE',
    mainOutsideDiameter: { value: 219.1, unit: 'mm' }, mainInsideDiameter: { value: 202.74, unit: 'mm' },
    mainWallThickness: { value: 8.18, unit: 'mm' }, branchOutsideDiameter: { value: 114.3, unit: 'mm' },
    branchWallThickness: { value: 6.02, unit: 'mm' }, material: 'Carbon Steel', duplexState: 'NO',
  };
}
function relationship() {
  return {
    sourceCanonicalId: 'SRC-1', assessmentCanonicalId: 'ASSMT-1', caseId: 'CASE-1',
    physicalDistance: { value: 0.8, unit: 'm' }, distanceSource: 'MODEL', distanceSourceRevision: 'R1',
    simultaneousSourceGroup: 'G1', applicabilityDisposition: 'APPLICABLE',
  };
}
function table(kind, header, rows) { return { kind, header, rows }; }
function masterResolution() {
  return {
    schema: 'AivMasterResolution.v1',
    tables: {
      sources: table('sources', ['Source Canonical ID', 'Operating Case', 'Source Device Type'], [['SRC-1', 'CASE-1', 'RELIEF_VALVE']]),
      assessments: table('assessments', ['Assessment Canonical ID', 'Assessment Type', 'Main Outside Diameter'], [['ASSMT-1', 'WELDED_TEE', '219.1']]),
      relationships: table('relationships', ['Source Canonical ID', 'Assessment Canonical ID', 'Operating Case'], [['SRC-1', 'ASSMT-1', 'CASE-1']]),
    },
    resolutions: [
      { tableKind: 'sources', rowIndex: 0, column: 'Source Device Type', value: 'RELIEF_VALVE', origin: 'PINNED_MASTER', masterTable: 'sourceDevices', masterRecordId: 'SRC-PSV', sourceDocumentId: 'DOC-AIV-SOURCE-MAP', sourceCommit: 'MASTER-COMMIT' },
      { tableKind: 'assessments', rowIndex: 0, column: 'Assessment Type', value: 'WELDED_TEE', origin: 'PINNED_MASTER', masterTable: 'components', masterRecordId: 'CMP-TEE', sourceDocumentId: 'DOC-AIV-MAP', sourceCommit: 'MASTER-COMMIT' },
      { tableKind: 'assessments', rowIndex: 0, column: 'Main Outside Diameter', value: '219.1', origin: 'PINNED_MASTER', masterTable: 'pipeDimensions', masterRecordId: 'DIM-200-40', sourceDocumentId: 'DOC-ASME-B3610', sourceCommit: 'MASTER-COMMIT' },
    ],
    unresolved: [],
    policy: { explicitValuesOverrideMaster: true, masterOverridesAssumptions: true, screeningAuthorityConferred: false, designAuthority: false },
  };
}
function result() {
  const authority = { screeningAuthority: 'AUTHORIZED', engineeringAuthority: 'SCREENING', designAuthority: false };
  return {
    schema: 'AivCalculatorResult.v1', qualificationMode: 'screening', stageOrder: ['VALIDATE_INPUT'], implementedStageCount: 10,
    screeningResultScope: 'ASSESSMENT', lineCaseSummaryAuthoritativeForScreening: false, authority,
    sourceResults: [{ sourceCanonicalId: 'SRC-1', caseId: 'CASE-1', effectiveSourcePwlDb: 160, trace: { traceIds: ['SOURCE'] } }],
    assessmentResults: [{
      assessmentCanonicalId: 'ASSMT-1', assessmentType: 'WELDED_TEE', line: 'L-1', caseId: 'CASE-1',
      contributingSourceCanonicalIds: ['SRC-1'], combinedPointPwlDb: 159.7,
      sourceContributionsAtPoint: [{ sourceCanonicalId: 'SRC-1', pointPwlDb: 159.7 }], lof: 0.29, authority,
    }],
    lineCaseSummaries: [{ caseId: 'CASE-1', assessmentCanonicalIds: ['ASSMT-1'], lof: 1.48, authoritativeForScreening: false }],
  };
}

function screeningPackage(extra = {}) {
  return buildAivScreeningExportPackage({
    result: result(), sources: [source()], assessments: [assessment()], relationships: [relationship()],
    topology: null, masterResolution: masterResolution(), ...extra,
  });
}

test('master evidence converts transient row indices to stable engineering identities', () => {
  const evidence = buildAivMasterEvidence(masterResolution());
  assert.equal(evidence.schema, 'AivMasterEvidence.v1');
  assert.equal(evidence.resolvedFieldCount, 3);
  assert.equal(evidence.policy.screeningAuthorityConferred, false);
  assert.deepEqual(evidence.records[0].identity, { assessmentCanonicalId: 'ASSMT-1' });
  assert.equal(selectAivMasterEvidence(evidence, { tableKind: 'sources', sourceCanonicalId: 'SRC-1', caseId: 'CASE-1' }).length, 1);
  assert.equal(selectAivMasterEvidence(evidence, { tableKind: 'relationships', sourceCanonicalId: 'SRC-1', assessmentCanonicalId: 'ASSMT-1', caseId: 'CASE-1' }).length, 0);
});

test('screening JSON export retains exact master record/document/commit lineage without promoting authority', () => {
  const payload = screeningPackage();
  assert.equal(payload.masterEvidence.resolvedFieldCount, 3);
  assert.equal(payload.provenance.masterEngineeringQualificationImplied, false);
  const od = payload.masterEvidence.records.find((item) => item.column === 'Main Outside Diameter');
  assert.deepEqual({
    identity: od.identity,
    masterTable: od.masterTable,
    masterRecordId: od.masterRecordId,
    sourceDocumentId: od.sourceDocumentId,
    sourceCommit: od.sourceCommit,
    value: od.value,
  }, {
    identity: { assessmentCanonicalId: 'ASSMT-1' },
    masterTable: 'pipeDimensions',
    masterRecordId: 'DIM-200-40',
    sourceDocumentId: 'DOC-ASME-B3610',
    sourceCommit: 'MASTER-COMMIT',
    value: '219.1',
  });
});

test('EIT aiv_data retains source and assessment master evidence additively', () => {
  const document = buildAivEitExport({ screeningPackage: screeningPackage() }).document;
  const detail = JSON.parse(document.lines[0].aiv_data)[0];
  assert.equal(detail.masterEvidence.length, 3);
  assert(detail.masterEvidence.some((item) => item.tableKind === 'sources' && item.masterRecordId === 'SRC-PSV'));
  assert(detail.masterEvidence.some((item) => item.tableKind === 'assessments' && item.masterRecordId === 'CMP-TEE'));
  assert(detail.masterEvidence.some((item) => item.masterRecordId === 'DIM-200-40'));
  assert.equal(detail.masterEvidence.some((item) => item.tableKind === 'relationships'), false);
});

test('EIT import and re-export retain imported master lineage even without a live master resolution', () => {
  const firstText = serializeAivEitExport({ screeningPackage: screeningPackage(), title: 'Master lineage' });
  const imported = parseAivEitImport(firstText, { sourceName: 'master-lineage.eit' });
  const importedMaster = imported.evidence.detailEvidence[0].originalDetail.masterEvidence;
  assert.equal(importedMaster.length, 3);

  const withoutLiveMaster = buildAivScreeningExportPackage({
    result: result(), sources: [source()], assessments: [assessment()], relationships: [relationship()],
    topology: null, masterResolution: null, eitImportEvidence: imported.evidence,
  });
  const secondText = serializeAivEitExport({ screeningPackage: withoutLiveMaster, title: 'Master lineage' });
  const secondDetail = JSON.parse(JSON.parse(secondText).lines[0].aiv_data)[0];
  assert.deepEqual(secondDetail.masterEvidence, importedMaster);
});
