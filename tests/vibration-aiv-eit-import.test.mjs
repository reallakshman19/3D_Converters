import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAivEitImport } from '../converters/vibration/aiv/aiv-eit-import.js';
import { buildAivEitExport } from '../converters/vibration/aiv/aiv-eit-export.js';
import { AIV_SOURCE_CSV_HEADER } from '../converters/vibration/aiv/source-csv.js';
import { AIV_ASSESSMENT_CSV_HEADER } from '../converters/vibration/aiv/assessment-csv.js';

function value(row, header, column) {
  return row[header.indexOf(column)];
}

function modernDocument() {
  return {
    options: { title: 'Modern round trip', version: 5, id: 10, project: 20 },
    lines: [{
      rid: '1', pnid: 'RELIEF-COMBINED', lref: '8IN-FLARE-HEADER', modules: 'aiv', pi: 1, si: 1,
      aiv: '0.29', maxLof: '0.29', pwl: '160', aivAuthorityScope: 'ASSESSMENT',
      aivAssessmentCanonicalId: 'AIV-ASSESS-HDR-001', aivConfiguredLineCaseTraceLof: 1.48,
      aivConfiguredLineCaseTraceAuthoritative: false,
      aiv_data: JSON.stringify([
        { vt: 'Relief', sourceCanonicalId: 'RV-101', assessmentCanonicalId: 'AIV-ASSESS-HDR-001', caseId: 'RELIEF-COMBINED', sourceDeviceType: 'RELIEF_VALVE', sourceState: 'RELIEVING', phase: 'GAS', sonicState: 'SONIC', mfr: '26307.874944', usp: '50', dsp: '10', ust: '26.85', lof: 0.29, sourcePwl: 160, pointPwl: 148.7540692513, combinedPointPwl: 149.5630257285, distance: 38, distanceUnit: 'm', distanceAuthority: 'EXPLICIT_SEGMENT_ENGINEERING_LENGTH_SUM', simultaneousSourceGroup: 'FLARE-GROUP-1', segmentIds: ['RV101-BRANCH', 'SUBHEADER-4IN', 'HEADER-8IN'] },
        { vt: 'Relief', sourceCanonicalId: 'RV-102', assessmentCanonicalId: 'AIV-ASSESS-HDR-001', caseId: 'RELIEF-COMBINED', sourceDeviceType: 'RELIEF_VALVE', sourceState: 'RELIEVING', phase: 'GAS', sonicState: 'SONIC', mfr: '13185.171066', usp: '50', dsp: '10', ust: '26.85', lof: 0.29, sourcePwl: 154, pointPwl: 141.8662326132, combinedPointPwl: 149.5630257285, distance: 41, distanceUnit: 'm', distanceAuthority: 'EXPLICIT_SEGMENT_ENGINEERING_LENGTH_SUM', simultaneousSourceGroup: 'FLARE-GROUP-1', segmentIds: ['RV102-BRANCH', 'SUBHEADER-4IN', 'HEADER-8IN'] },
      ]),
    }],
    pipes: [{ pi: 1, od: '219.1', id: '202.74', wt: '8.18', branchOd: '114.3', branchWt: '6.02', mat: 'Carbon Steel', assessmentCanonicalId: 'AIV-ASSESS-HDR-001', assessmentType: 'WELDED_TEE', duplexState: 'NO' }],
    streams: [
      { si: 1, desc: 'RV-101', phase: 'gas', mfr: '26307.874944', t: '26.85', p: '50', mw: '20', sourceCanonicalId: 'RV-101', caseId: 'RELIEF-COMBINED' },
      { si: 2, desc: 'RV-102', phase: 'gas', mfr: '13185.171066', t: '26.85', p: '50', mw: '20', sourceCanonicalId: 'RV-102', caseId: 'RELIEF-COMBINED' },
    ],
    mats: [],
  };
}

function legacyDocument() {
  return {
    options: { title: 'Legacy EI example', version: 5 },
    lines: [{
      rid: '8', pnid: 'Figure D-1', lref: 'Relief line (downstream of PSV)', modules: 'fit,fip,aiv,tra',
      pi: 5, si: 7, aiv: '1.48', pwl: '164.69', maxLof: '1.77',
      aiv_data: JSON.stringify([{ vt: 'Relief', mfr: '53482', usp: '99', dsp: '1', ust: '137', lof: 1.4842587976269557 }]),
      customLegacy: 'keep-me',
    }],
    pipes: [{ pi: 5, od: '168.275', wt: '7.112', mat: 'Carbon Steel' }],
    streams: [{ si: 7, desc: 'Relief', phase: 'gas', mfr: '53482', t: '137', p: '99', mw: '21.75' }],
    mats: [{ id: 'legacy-material' }],
  };
}

function screeningPackage(imported) {
  return {
    schema: 'AivScreeningExportPackage.v1',
    result: {
      schema: 'AivCalculatorResult.v1', qualificationMode: 'screening', screeningResultScope: 'ASSESSMENT',
      lineCaseSummaryAuthoritativeForScreening: false,
      authority: { screeningAuthority: 'AUTHORIZED', designAuthority: false },
      sourceResults: [{ sourceCanonicalId: 'EIT-SOURCE-8-1', caseId: 'Figure D-1', effectiveSourcePwlDb: 160 }],
      assessmentResults: [{
        assessmentCanonicalId: 'EIT-ASSESS-8', line: 'Relief line (downstream of PSV)', caseId: 'Figure D-1',
        contributingSourceCanonicalIds: ['EIT-SOURCE-8-1'], combinedPointPwlDb: 149.5630257285,
        sourceContributionsAtPoint: [{ sourceCanonicalId: 'EIT-SOURCE-8-1', pointPwlDb: 149.5630257285 }],
        lof: 0.29,
      }],
      lineCaseSummaries: [{ caseId: 'Figure D-1', assessmentCanonicalIds: ['EIT-ASSESS-8'], lof: 1.48, authoritativeForScreening: false }],
    },
    inputs: {
      sources: [{
        sourceCanonicalId: 'EIT-SOURCE-8-1', caseId: 'Figure D-1', sourceDeviceType: 'RELIEF_VALVE', sourceState: 'RELIEVING', phase: 'GAS', sonicState: 'SONIC',
        massFlow: { value: 53482, unit: 'kg/h' }, upstreamPressure: { value: 99, unit: 'bar', basis: 'ABSOLUTE' }, downstreamPressure: { value: 1, unit: 'bar', basis: 'ABSOLUTE' },
        upstreamTemperature: { value: 137, unit: 'C' }, molecularWeight: { value: 21.75, unit: 'g/mol' }, lowNoiseTrim: { state: 'NONE' },
      }],
      assessments: [{
        assessmentCanonicalId: 'EIT-ASSESS-8', assessmentType: 'OTHER_WELDED_DISCONTINUITY',
        mainOutsideDiameter: { value: 168.275, unit: 'mm' }, mainInsideDiameter: { value: 154.051, unit: 'mm' }, mainWallThickness: { value: 7.112, unit: 'mm' },
        material: 'Carbon Steel', duplexState: 'NO',
      }],
      relationships: [{
        sourceCanonicalId: 'EIT-SOURCE-8-1', assessmentCanonicalId: 'EIT-ASSESS-8', caseId: 'Figure D-1',
        physicalDistance: { value: 38, unit: 'm' }, distanceSource: 'reviewed engineering path', distanceSourceRevision: '1', applicabilityDisposition: 'APPLICABLE',
      }],
      topology: imported.topology,
    },
    flareNetworkEvidence: null,
    eitImportEvidence: imported.evidence,
  };
}

test('imports modern AIV-only EIT into canonical working rows without promoting prior result authority', () => {
  const imported = parseAivEitImport(JSON.stringify(modernDocument()), { sourceName: 'small-flare.eit' });
  assert.equal(imported.schema, 'AivEitImportPackage.v1');
  assert.deepEqual(imported.counts, { documentLines: 1, documentPipes: 1, documentStreams: 2, aivLines: 1, sources: 2, assessments: 1, relationships: 2, derivedInsideDiameters: 0 });
  assert.equal(imported.importedResults[0].importedResultAuthority, 'REVIEW_REQUIRED');
  assert.equal(imported.importedResults[0].currentScreeningAuthority, false);
  assert.equal(imported.importedResults[0].importedResultKind, 'PRIOR_ASSESSMENT_SCREENING_TRACE');
  assert.equal(value(imported.tables.sources[0], AIV_SOURCE_CSV_HEADER, 'Source Canonical ID'), 'RV-101');
  assert.equal(value(imported.tables.sources[0], AIV_SOURCE_CSV_HEADER, 'Sonic State'), 'SONIC');
  assert.equal(value(imported.tables.assessments[0], AIV_ASSESSMENT_CSV_HEADER, 'Branch Outside Diameter'), '114.3');
  assert.deepEqual(imported.evidence.detailEvidence[0].segmentIds, ['RV101-BRANCH', 'SUBHEADER-4IN', 'HEADER-8IN']);
});

test('legacy EI AIV line stays review-required and derives only missing main ID from explicit OD/WT', () => {
  const imported = parseAivEitImport(JSON.stringify(legacyDocument()), { sourceName: 'worked-examples.eit' });
  assert.equal(imported.importedResults[0].importedResultKind, 'LEGACY_LINE_LEVEL_RESULT');
  assert.equal(imported.importedResults[0].importedAivLof, 1.48);
  assert.equal(imported.authority.importedResultsAreCurrentScreeningAuthority, false);
  assert.equal(imported.counts.derivedInsideDiameters, 1);
  assert.equal(value(imported.tables.assessments[0], AIV_ASSESSMENT_CSV_HEADER, 'Main Inside Diameter'), '154.051');
  assert.equal(value(imported.tables.sources[0], AIV_SOURCE_CSV_HEADER, 'Sonic State'), 'UNRESOLVED');
});

test('EIT import topology is connectivity-only and never derives physical distance from presentation geometry', () => {
  const imported = parseAivEitImport(JSON.stringify(modernDocument()), { sourceName: 'small-flare.eit' });
  assert.equal(imported.topology.schema, 'AivFlareNetworkTopologyExchange.v1');
  assert.equal(imported.topology.authority.syntheticDirectPathProjection, true);
  assert.equal(imported.topology.authority.svgPixelsAuthoritativeForDistance, false);
  assert.equal(imported.topology.segments[0].physicalLength.value, 38);
});

test('invalid EIT version fails closed before creating working state', () => {
  const document = modernDocument();
  document.options.version = 4;
  assert.throws(() => parseAivEitImport(JSON.stringify(document)), /AIV_EIT_IMPORT_CONTRACT_INVALID/);
});

test('re-export of imported mixed-module legacy file preserves unrelated content and replaces only AIV authority fields', () => {
  const imported = parseAivEitImport(JSON.stringify(legacyDocument()), { sourceName: 'worked-examples.eit' });
  const built = buildAivEitExport({ screeningPackage: screeningPackage(imported), title: imported.title });
  const line = built.document.lines[0];
  assert.equal(line.modules, 'fit,fip,aiv,tra');
  assert.equal(line.customLegacy, 'keep-me');
  assert.equal(line.maxLof, '1.77');
  assert.equal(line.aiv, '0.29');
  assert.equal(line.aivMaxAuthoritativeAssessmentLof, '0.29');
  assert.equal(line.aivConfiguredLineCaseTraceAuthoritative, false);
  assert.deepEqual(built.document.mats, [{ id: 'legacy-material' }]);
});
