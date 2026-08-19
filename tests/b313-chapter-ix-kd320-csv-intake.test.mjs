import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getKd320EvidenceCsvTemplate,
  KD320_CSV_MODES,
  KD320_PROJECT_CSV_HEADERS,
  KD320_PUBLISHED_CSV_HEADERS,
  previewKd320EvidenceCsv,
} from '../engineering/hp-class-standardization/qualification/kd320-q2/csv-intake.js';

function escape(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function csv(headers, row) {
  return `${headers.join(',')}\n${headers.map((header) => escape(row[header] ?? '')).join(',')}\n`;
}

const correctionParameters = JSON.stringify([
  { name: 'Kmean', value: 1.125, units: 'ratio', semanticRef: 'KD320-SEM-006' },
]);
const semanticRefs = Array.from({ length: 10 }, (_, i) => `KD320-SEM-${String(i + 2).padStart(3, '0')}`).join(';');
const receiptRefs = 'Q1-SRC-B313-2024;Q1-SRC-VIII3-2025';

function projectRow(overrides = {}) {
  return {
    calculation_ref: 'CALC-001', location_id: 'LOC-001', b313_edition: '2024', viii3_edition: '2025',
    salt_mpa: '63.2994958105', associated_mean_stress_mpa: '25', correction_parameters_json: correctionParameters,
    seq_mpa: '70', permissible_cycles: '10000', calculated_by: 'Engineer A', calculated_at: '2026-08-18T10:00:00Z',
    checked_by: 'Engineer B', checked_at: '2026-08-18T11:00:00Z', semantic_refs: semanticRefs,
    source_receipt_refs: receiptRefs, ...overrides,
  };
}

function publishedRow(overrides = {}) {
  return {
    reference_id: 'PVP2025-154710', source_code_edition: '2025', target_viii3_edition: '2025',
    bibliographic_ref: 'doi:10.1115/PVP2025-154710', exact_locator: 'Section 3.2 Table 3',
    source_sha256: `sha256:${'a'.repeat(64)}`, controlled_2025_secure_storage_ref: '',
    controlled_2025_document_sha256: '', semantic_reconciliation_json: '[]', salt_mpa: '63.3',
    associated_mean_stress_mpa: '20', correction_parameters_json: correctionParameters, seq_mpa: '70',
    permissible_cycles: '10000', extracted_by: 'Extractor A', extracted_at: '2026-08-18T10:00:00Z',
    admitted_by: 'Admitter B', admitted_at: '2026-08-18T11:00:00Z', ...overrides,
  };
}

function reconciliationRows() {
  return Array.from({ length: 12 }, (_, i) => {
    const semanticId = `KD320-SEM-${String(i + 2).padStart(3, '0')}`;
    return {
      semanticId, sourceEdition: '2023', targetEdition: '2025', sourceLocator: `paper:${semanticId}`,
      targetControlledLocator: `controlled:${semanticId}`, controlledSemanticRef: `secure:${semanticId}`,
      comparisonStatus: 'IDENTICAL', comparedBy: 'Comparator A', comparedAt: '2026-08-18T12:00:00Z',
      independentCheckBy: 'Checker B', independentCheckedAt: '2026-08-18T13:00:00Z',
    };
  });
}

test('templates expose exact two-mode contracts without numerical defaults', () => {
  const project = getKd320EvidenceCsvTemplate(KD320_CSV_MODES.PROJECT);
  const published = getKd320EvidenceCsvTemplate(KD320_CSV_MODES.PUBLISHED);
  assert.equal(project.split('\n')[0], KD320_PROJECT_CSV_HEADERS.join(','));
  assert.equal(published.split('\n')[0], KD320_PUBLISHED_CSV_HEADERS.join(','));
  assert.match(project, /2024,2025/);
  assert.match(published, /,2025,2025,/);
  assert.doesNotMatch(project, /63\.299|10000/);
});

test('valid checked project row preflights before Q1 and remains non-authoritative', () => {
  const result = previewKd320EvidenceCsv(csv(KD320_PROJECT_CSV_HEADERS, projectRow()), KD320_CSV_MODES.PROJECT);
  assert.equal(result.ok, true);
  assert.equal(result.rows[0].preflightState, 'PROJECT_ORACLE_READY_FOR_Q2_CANDIDATE');
  assert.equal(result.rows[0].admission.state, 'Q1_CONTROLLED_EVIDENCE_PENDING');
  assert.equal(result.rows[0].admission.q2OracleAdmissionReady, false);
  assert.equal(result.rows[0].authority.nativeCoreKd3Qualified, false);
  assert.equal(result.rows[0].authority.canUseForDesignAuthority, false);
});

test('project preflight blocks same-person calculation/check custody', () => {
  const row = projectRow({ checked_by: ' engineer a ' });
  const result = previewKd320EvidenceCsv(csv(KD320_PROJECT_CSV_HEADERS, row), KD320_CSV_MODES.PROJECT);
  assert.equal(result.ok, false);
  assert.equal(result.rows[0].preflightState, 'CSV_CONTRACT_BLOCKED');
  assert(result.rows[0].issues.some((item) => item.code === 'INDEPENDENT_CHECK_IDENTITY_REQUIRED'));
});

test('project preflight blocks edition drift before Q2 evaluation', () => {
  const row = projectRow({ viii3_edition: '2023' });
  const result = previewKd320EvidenceCsv(csv(KD320_PROJECT_CSV_HEADERS, row), KD320_CSV_MODES.PROJECT);
  assert.equal(result.rows[0].ok, false);
  assert(result.rows[0].issues.some((item) => item.code === 'VIII3_EDITION_MISMATCH'));
});

test('direct 2025 published oracle preflights and remains Q1-gated', () => {
  const result = previewKd320EvidenceCsv(csv(KD320_PUBLISHED_CSV_HEADERS, publishedRow()), KD320_CSV_MODES.PUBLISHED);
  assert.equal(result.ok, true);
  assert.equal(result.rows[0].preflightState, 'PUBLISHED_ORACLE_READY_FOR_Q2_CANDIDATE');
  assert.equal(result.rows[0].admission.state, 'Q1_CONTROLLED_EVIDENCE_PENDING');
  assert.equal(result.rows[0].admission.authority.productionKernelAllowed, false);
});

test('PVP2025-154710 source edition 2023 routes to the existing edition gate', () => {
  const row = publishedRow({ source_code_edition: '2023' });
  const result = previewKd320EvidenceCsv(csv(KD320_PUBLISHED_CSV_HEADERS, row), KD320_CSV_MODES.PUBLISHED);
  assert.equal(result.ok, true);
  assert.equal(result.rows[0].preflightState, 'PUBLISHED_ORACLE_REQUIRES_EDITION_RECONCILIATION');
  assert.equal(result.rows[0].editionReconciliation.state, 'CONTROLLED_2025_RECONCILIATION_PENDING');
  assert.equal(result.rows[0].editionReconciliation.targetQf022Ready, false);
});

test('complete 2023-to-2025 reconciliation can become ready for Q2 submission but never auto-admits', () => {
  const row = publishedRow({
    source_code_edition: '2023',
    controlled_2025_secure_storage_ref: 'secure://viii3/2025',
    controlled_2025_document_sha256: `sha256:${'b'.repeat(64)}`,
    semantic_reconciliation_json: JSON.stringify(reconciliationRows()),
  });
  const result = previewKd320EvidenceCsv(csv(KD320_PUBLISHED_CSV_HEADERS, row), KD320_CSV_MODES.PUBLISHED);
  assert.equal(result.rows[0].editionReconciliation.state, 'EDITION_RECONCILIATION_READY_FOR_Q2_ADMISSION');
  assert.equal(result.rows[0].editionReconciliation.editionReconciliationReady, true);
  assert.equal(result.rows[0].editionReconciliation.targetQf022Ready, false);
  assert.equal(result.rows[0].editionReconciliation.authority.q2OracleAdmissionReady, false);
});

test('2023 published rows cannot use a reconciliation route qualified for another reference', () => {
  const row = publishedRow({ source_code_edition: '2023', reference_id: 'OTHER-PAPER' });
  const result = previewKd320EvidenceCsv(csv(KD320_PUBLISHED_CSV_HEADERS, row), KD320_CSV_MODES.PUBLISHED);
  assert.equal(result.rows[0].ok, false);
  assert(result.rows[0].issues.some((item) => item.code === 'PUBLISHED_RECONCILIATION_ROUTE_UNSUPPORTED'));
});

test('unknown CSV headers fail closed at file level', () => {
  const headers = [...KD320_PROJECT_CSV_HEADERS, 'unexpected'];
  const source = csv(headers, { ...projectRow(), unexpected: 'x' });
  const result = previewKd320EvidenceCsv(source, KD320_CSV_MODES.PROJECT);
  assert.equal(result.ok, false);
  assert(result.fileIssues.some((item) => item.code === 'CSV_HEADERS_UNKNOWN' || item.code === 'CSV_HEADERS_MISSING'));
});

test('blank mean stress is not silently converted to physical zero', () => {
  const row = projectRow({ associated_mean_stress_mpa: '' });
  const result = previewKd320EvidenceCsv(csv(KD320_PROJECT_CSV_HEADERS, row), KD320_CSV_MODES.PROJECT);
  assert.equal(result.rows[0].ok, false);
  assert(result.rows[0].issues.some((item) => item.code === 'FINITE_NUMBER_REQUIRED' && item.field === 'associated_mean_stress_mpa'));
});

test('UTF-8 BOM is tolerated but unterminated quotes fail closed', () => {
  const source = `\uFEFF${csv(KD320_PROJECT_CSV_HEADERS, projectRow())}`;
  assert.equal(previewKd320EvidenceCsv(source, KD320_CSV_MODES.PROJECT).ok, true);
  const malformed = `${KD320_PROJECT_CSV_HEADERS.join(',')}\n\"unterminated`;
  const blocked = previewKd320EvidenceCsv(malformed, KD320_CSV_MODES.PROJECT);
  assert.equal(blocked.ok, false);
  assert(blocked.fileIssues.some((item) => item.code === 'CSV_PARSE_INVALID'));
});

test('invalid correction-parameter semantic references fail preflight', () => {
  const invalid = JSON.stringify([{ name: 'K', value: 1, units: 'ratio', semanticRef: 'KD320-SEM-999' }]);
  const row = projectRow({ correction_parameters_json: invalid });
  const result = previewKd320EvidenceCsv(csv(KD320_PROJECT_CSV_HEADERS, row), KD320_CSV_MODES.PROJECT);
  assert.equal(result.rows[0].ok, false);
  assert(result.rows[0].issues.some((item) => item.code === 'CORRECTION_PARAMETER_INVALID'));
});
