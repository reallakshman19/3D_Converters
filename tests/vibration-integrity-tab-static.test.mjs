import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { renderVibrationIntegrityHtml } from '../tabs/vibration-integrity-view.js';

const controllerSource = fs.readFileSync(new URL('../tabs/vibration-integrity-tab.js', import.meta.url), 'utf8');
const viewSource = fs.readFileSync(new URL('../tabs/vibration-integrity-view.js', import.meta.url), 'utf8');
const extensionSource = fs.readFileSync(new URL('../core/engineering-tabs-extension.js', import.meta.url), 'utf8');

function state() {
  const rowKey = '["L-100","NORMAL","CAN-1"]';
  return {
    files: {
      topology: { name: 'model.xlsx', format: 'XLSX', kind: 'Complete five-sheet XLSX expected' },
      operating: { name: 'cases.csv', kind: 'VibrationOperatingCaseCsv.v1' },
      enrichment: { name: 'enrichment.csv', kind: 'VibrationEnrichmentCsv.v1' },
    },
    allowLimitedExchange: false,
    busy: false,
    error: null,
    filters: { line: '', completeness: '', band: '', candidate: '' },
    sort: { field: 'line', direction: 'asc' },
    detailTab: 'summary',
    envelope: {
      imports: {
        topologyFormat: 'XLSX', exchangeIntegrityStatus: 'DECLARED_NOT_REVERIFIED',
        operatingCaseCount: 2, enrichmentCount: 6,
      },
      workflow: {
        register: {
          rows: [
            { line: 'L-100', caseId: 'NORMAL', completenessStatus: 'CALCULATED', referenceBand: 'LOF_LT_0_3' },
            { line: 'L-200', caseId: 'DESIGN', completenessStatus: 'DATA_INCOMPLETE', referenceBand: null },
          ],
        },
      },
    },
    workspace: {
      selectedRowKey: rowKey,
      summary: {
        totalRows: 2, visibleRows: 2, calculatedRows: 1, incompleteRows: 1,
        calculationFailedRows: 0, candidateForEngineeringReviewRows: 1,
      },
      rows: [
        {
          rowKey, line: 'L-100', caseId: 'NORMAL', canonicalId: 'CAN-1',
          completenessStatus: 'CALCULATED', standardLof: 0.276, refinedLof: null,
          governingReferenceLof: 0.276, referenceBand: 'LOF_LT_0_3',
          qualificationState: 'BENCHMARK_ONLY', phaseEvidenceStrength: 'EI_PUBLISHED_EXAMPLE',
          correlationEvidenceStrength: 'EI_PUBLISHED_EXAMPLE', candidateForEngineeringReview: true,
        },
        {
          rowKey: '["L-200","DESIGN","CAN-2"]', line: 'L-200', caseId: 'DESIGN', canonicalId: 'CAN-2',
          completenessStatus: 'DATA_INCOMPLETE', standardLof: null, refinedLof: null,
          governingReferenceLof: null, referenceBand: null, qualificationState: null,
          phaseEvidenceStrength: null, correlationEvidenceStrength: null, candidateForEngineeringReview: false,
        },
      ],
      detail: {
        summary: { line: 'L-100', caseId: 'NORMAL', canonicalId: 'CAN-1', qualificationState: 'BENCHMARK_ONLY' },
        inputs: { values: { phase: 'GAS' }, units: { outsideDiameter: 'mm' }, qualificationMode: 'benchmark' },
        operatingCase: { line: 'L-100', caseId: 'NORMAL', source: 'HMB-1' },
        enrichment: [], evidenceQualification: { qualification: { effective: 'BENCHMARK_ONLY' } },
        sourceTrace: { assessmentPoint: { source: 'VIB-REVIEW' } },
        diagnostics: { missing: [], invalid: [], errorCodes: [], centralErrors: [] },
      },
    },
  };
}

test('Vibration Integrity renders benchmark-only table workspace with explicit provenance state', () => {
  const html = renderVibrationIntegrityHtml(state());
  assert.match(html, /Vibration Integrity/u);
  assert.match(html, /BENCHMARK ONLY/u);
  assert.match(html, /NOT SCREENING \/ DESIGN AUTHORITY/u);
  assert.match(html, /3D EDIT table export/u);
  assert.match(html, /DECLARED_NOT_REVERIFIED/u);
  assert.match(html, /CAN-1/u);
  assert.match(html, /DATA_INCOMPLETE/u);
  assert.match(html, /BENCHMARK_ONLY/u);
  assert.match(html, /EI_PUBLISHED_EXAMPLE/u);
  assert.match(html, /Review candidate/u);
});

test('non-calculated table cells remain blank-state markers rather than synthetic zeroes', () => {
  const html = renderVibrationIntegrityHtml(state());
  const incompleteRow = html.match(/CAN-2[\s\S]*?<\/tr>/u)?.[0] ?? '';
  assert.match(incompleteRow, /DATA_INCOMPLETE/u);
  assert.match(incompleteRow, /vi-empty/u);
  assert.doesNotMatch(incompleteRow, />0<|>0\.0+/u);
});

test('visible vibration product has no canvas, universal score, pass or direct engineering kernel call', () => {
  const combined = `${controllerSource}\n${viewSource}`;
  assert.doesNotMatch(combined, /<canvas|createElement\(['"]canvas/iu);
  assert.doesNotMatch(combined, /riskScore|Risk Score|Facility Score|Vibration Score/u);
  assert.doesNotMatch(controllerSource, /calculateFit\s*\(/u);
  assert.doesNotMatch(controllerSource, /calculateEngineering(?:Batch)?\s*\(/u);
  assert.match(controllerSource, /runVibrationFacilityFitBenchmarkFromTables/u);
  assert.match(controllerSource, /buildVibrationWorkspaceModel/u);
  assert.match(controllerSource, /serializeVibrationFacilityFitRegisterCsv/u);
});

test('Engineering navigation registers the dedicated table workspace tab', () => {
  assert.match(extensionSource, /id: 'vibration-integrity'/u);
  assert.match(extensionSource, /label: 'Vibration Integrity'/u);
  assert.match(extensionSource, /renderVibrationIntegrityTab/u);
});

test('tab exposes XLSX preferred and limited CSV handling without qualification-mode controls', () => {
  const html = renderVibrationIntegrityHtml({ ...state(), files: { ...state().files, topology: {
    name: 'elements.csv', format: 'CSV_ELEMENTS_ONLY', kind: 'Elements-only CSV · limited provenance',
  } } });
  assert.match(html, /Limited topology input/u);
  assert.match(html, /five-sheet XLSX export/u);
  assert.match(html, /Allow limited Elements-only CSV/u);
  assert.doesNotMatch(html, /qualification-mode|screening mode|design mode/iu);
});
