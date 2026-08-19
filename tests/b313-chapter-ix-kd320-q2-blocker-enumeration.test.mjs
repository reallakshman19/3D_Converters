import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateKd320Q2AdmissionCandidate,
  KD320_Q2_REQUIRED_SEMANTICS,
} from '../engineering/hp-class-standardization/qualification/kd320-q2/intake.js';

const ISO_A = '2026-08-18T08:00:00Z';
const ISO_B = '2026-08-18T09:00:00Z';
const HASH_A = `sha256:${'a'.repeat(64)}`;
const HASH_B = `sha256:${'b'.repeat(64)}`;

function targetAndAuthority() {
  return {
    schema: 'kd320-q2-admission-candidate/v1',
    target: {
      b313Edition: '2024',
      viii3Edition: '2025',
      methodId: 'KD3-FATIGUE-001',
      routeId: 'ROUTE-KD3-2024',
    },
    authority: {
      nativeCoreKd3Qualified: false,
      codeCompliance: false,
      canUseForDesignAuthority: false,
      productionKernelAllowed: false,
      automaticPromotionAllowed: false,
    },
  };
}

function pendingCandidate() {
  return {
    ...targetAndAuthority(),
    sourceReceipts: ['Q1-SRC-B313-2024', 'Q1-SRC-VIII3-2025'].map((receiptId) => ({
      receiptId,
      status: 'PENDING_CONTROLLED_SOURCE_RECEIPT',
      secureStorageRef: null,
      documentSha256: null,
      exactLocators: [],
      verifiedBy: null,
      verifiedAt: null,
      independentCheckBy: null,
      independentCheckedAt: null,
    })),
    semanticItems: KD320_Q2_REQUIRED_SEMANTICS.map((semanticId, index) => ({
      semanticId,
      status: 'PENDING_CONTROLLED_SOURCE',
      controlledSourceRef: index === 0 ? 'Q1-SRC-B313-2024' : 'Q1-SRC-VIII3-2025',
      exactSourceLocator: null,
      controlledSemanticRef: null,
      units: null,
      signConvention: null,
      selectionRule: null,
      interpolationRule: null,
      applicabilityRule: null,
      extractedBy: null,
      extractedAt: null,
      independentCheckBy: null,
      independentCheckedAt: null,
    })),
  };
}

function receipt(receiptId, documentSha256) {
  return {
    receiptId,
    status: 'VERIFIED',
    secureStorageRef: `secure://${receiptId}`,
    documentSha256,
    exactLocators: ['controlled-locator'],
    verifiedBy: 'Extractor A',
    verifiedAt: ISO_A,
    independentCheckBy: 'Checker B',
    independentCheckedAt: ISO_B,
  };
}

function semantic(semanticId, index) {
  return {
    semanticId,
    status: 'INDEPENDENTLY_CHECKED',
    controlledSourceRef: index === 0 ? 'Q1-SRC-B313-2024' : 'Q1-SRC-VIII3-2025',
    exactSourceLocator: `controlled-locator-${index + 1}`,
    controlledSemanticRef: `secure://semantic/${semanticId}`,
    units: 'METHOD_SPECIFIC',
    signConvention: 'CONTROLLED_RULE_RECORDED',
    selectionRule: 'CONTROLLED_RULE_RECORDED',
    interpolationRule: 'CONTROLLED_RULE_RECORDED_OR_NOT_APPLICABLE',
    applicabilityRule: 'CONTROLLED_RULE_RECORDED',
    extractedBy: 'Extractor A',
    extractedAt: ISO_A,
    independentCheckBy: 'Checker B',
    independentCheckedAt: ISO_B,
  };
}

function chain() {
  return {
    alternatingStressIntensityMpa: 63.299495811,
    associatedMeanStressMpa: 27.6830252,
    correctionParameters: [{
      name: 'CONTROLLED_PARAMETER_1',
      value: 0.2,
      units: 'DIMENSIONLESS',
      semanticRef: 'KD320-SEM-006',
    }],
    equivalentAlternatingStressMpa: 70,
    permissibleCycles: 10000,
  };
}

function readyCandidate() {
  return {
    ...targetAndAuthority(),
    sourceReceipts: [
      receipt('Q1-SRC-B313-2024', HASH_A),
      receipt('Q1-SRC-VIII3-2025', HASH_B),
    ],
    semanticItems: KD320_Q2_REQUIRED_SEMANTICS.map(semantic),
    projectOracle: {
      benchmarkId: 'KD3-QF-023',
      evidenceClass: 'INDEPENDENT_CHECKED_PROJECT_CALCULATION',
      methodId: 'KD3-FATIGUE-001',
      routeId: 'ROUTE-KD3-2024',
      calculationRef: 'CALC-KD3-001',
      locationId: 'BORE',
      b313Edition: '2024',
      viii3Edition: '2025',
      controlledSourceReceiptRefs: ['Q1-SRC-B313-2024', 'Q1-SRC-VIII3-2025'],
      semanticRefs: KD320_Q2_REQUIRED_SEMANTICS.slice(1, 11),
      chain: chain(),
      calculatedBy: 'Engineer A',
      calculatedAt: ISO_A,
      checkedBy: 'Engineer B',
      checkedAt: ISO_B,
    },
    publishedOracle: {
      benchmarkId: 'KD3-QF-022',
      evidenceClass: 'PRIMARY_PUBLISHED_NUMERICAL_ORACLE',
      viii3Edition: '2025',
      methodId: 'KD3-FATIGUE-001',
      bibliographicRef: 'PRIMARY-PUBLICATION-REF',
      exactLocator: 'worked-example-locator',
      sourceSha256: HASH_A,
      chain: chain(),
      extractedBy: 'Researcher A',
      extractedAt: ISO_A,
      admittedBy: 'Reviewer B',
      admittedAt: ISO_B,
    },
  };
}

test('pending Q2 candidate enumerates blockers across all required receipts and semantics', () => {
  const result = evaluateKd320Q2AdmissionCandidate(pendingCandidate());
  assert.equal(result.state, 'Q1_CONTROLLED_EVIDENCE_PENDING');
  assert.equal(result.q1Complete, false);
  assert.ok(result.blockers.includes('Q1-SRC-B313-2024:STATUS_NOT_VERIFIED'));
  assert.ok(result.blockers.includes('Q1-SRC-VIII3-2025:STATUS_NOT_VERIFIED'));
  assert.ok(result.blockers.includes('KD320-SEM-001:STATUS_NOT_INDEPENDENTLY_CHECKED'));
  assert.ok(result.blockers.includes('KD320-SEM-014:STATUS_NOT_INDEPENDENTLY_CHECKED'));
});

test('full Q2 evidence still reaches admission readiness without authority promotion', () => {
  const result = evaluateKd320Q2AdmissionCandidate(readyCandidate());
  assert.equal(result.ok, true);
  assert.equal(result.q2OracleAdmissionReady, true);
  assert.equal(result.state, 'Q2_ORACLE_ADMISSION_READY');
  assert.equal(result.authority.nativeCoreKd3Qualified, false);
  assert.equal(result.authority.productionKernelAllowed, false);
});
