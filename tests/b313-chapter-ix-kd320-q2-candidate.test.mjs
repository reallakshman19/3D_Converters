import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  evaluateKd320Q2AdmissionCandidate,
  KD320_Q2_REQUIRED_SEMANTICS,
} from '../engineering/hp-class-standardization/qualification/kd320-q2/intake.js';
import { verifyKd320Q2CandidateFile } from '../scripts/verify-b313-ch9-kd320-q2-candidate.mjs';

const ISO_A = '2026-08-18T08:00:00Z';
const ISO_B = '2026-08-18T09:00:00Z';
const HASH_A = `sha256:${'a'.repeat(64)}`;
const HASH_B = `sha256:${'b'.repeat(64)}`;

function receipt(receiptId, hash) {
  return {
    receiptId, status: 'VERIFIED', secureStorageRef: `secure://${receiptId}`,
    documentSha256: hash, exactLocators: ['controlled-locator-1'],
    verifiedBy: 'Extractor A', verifiedAt: ISO_A,
    independentCheckBy: 'Checker B', independentCheckedAt: ISO_B,
  };
}

function semantic(semanticId, index) {
  return {
    semanticId, status: 'INDEPENDENTLY_CHECKED',
    controlledSourceRef: index === 0 ? 'Q1-SRC-B313-2024' : 'Q1-SRC-VIII3-2025',
    exactSourceLocator: `controlled-locator-${index + 1}`,
    controlledSemanticRef: `secure://semantic/${semanticId}`,
    units: index === 0 ? 'NOT_APPLICABLE' : 'MPa_OR_METHOD_SPECIFIC',
    signConvention: 'CONTROLLED_RULE_RECORDED',
    selectionRule: 'CONTROLLED_RULE_RECORDED',
    interpolationRule: 'CONTROLLED_RULE_RECORDED_OR_NOT_APPLICABLE',
    applicabilityRule: 'CONTROLLED_RULE_RECORDED',
    extractedBy: 'Extractor A', extractedAt: ISO_A,
    independentCheckBy: 'Checker B', independentCheckedAt: ISO_B,
  };
}

function chain() {
  return {
    alternatingStressIntensityMpa: 63.299495811,
    associatedMeanStressMpa: 27.6830252,
    correctionParameters: [{
      name: 'CONTROLLED_PARAMETER_1', value: 0.2, units: 'DIMENSIONLESS',
      semanticRef: 'KD320-SEM-006',
    }],
    equivalentAlternatingStressMpa: 70,
    permissibleCycles: 10000,
  };
}

function completeCandidate() {
  return {
    schema: 'kd320-q2-admission-candidate/v1',
    target: {
      b313Edition: '2024', viii3Edition: '2025',
      methodId: 'KD3-FATIGUE-001', routeId: 'ROUTE-KD3-2024',
    },
    authority: {
      nativeCoreKd3Qualified: false, codeCompliance: false,
      canUseForDesignAuthority: false, productionKernelAllowed: false,
      automaticPromotionAllowed: false,
    },
    sourceReceipts: [
      receipt('Q1-SRC-B313-2024', HASH_A),
      receipt('Q1-SRC-VIII3-2025', HASH_B),
    ],
    semanticItems: KD320_Q2_REQUIRED_SEMANTICS.map(semantic),
    projectOracle: {
      benchmarkId: 'KD3-QF-023', evidenceClass: 'INDEPENDENT_CHECKED_PROJECT_CALCULATION',
      methodId: 'KD3-FATIGUE-001', routeId: 'ROUTE-KD3-2024',
      calculationRef: 'CALC-KD3-001', locationId: 'BORE',
      b313Edition: '2024', viii3Edition: '2025',
      controlledSourceReceiptRefs: ['Q1-SRC-B313-2024', 'Q1-SRC-VIII3-2025'],
      semanticRefs: KD320_Q2_REQUIRED_SEMANTICS.slice(1, 11),
      chain: chain(), calculatedBy: 'Engineer A', calculatedAt: ISO_A,
      checkedBy: 'Engineer B', checkedAt: ISO_B,
    },
    publishedOracle: {
      benchmarkId: 'KD3-QF-022', evidenceClass: 'PRIMARY_PUBLISHED_NUMERICAL_ORACLE',
      viii3Edition: '2025', methodId: 'KD3-FATIGUE-001',
      bibliographicRef: 'PRIMARY-PUBLICATION-REF',
      exactLocator: 'worked-example-locator', sourceSha256: HASH_A, chain: chain(),
      extractedBy: 'Researcher A', extractedAt: ISO_A,
      admittedBy: 'Reviewer B', admittedAt: ISO_B,
    },
  };
}

test('partial candidate remains Q1 pending and cannot promote authority', () => {
  const candidate = completeCandidate();
  candidate.sourceReceipts[1].status = 'PENDING_CONTROLLED_SOURCE_RECEIPT';
  const result = evaluateKd320Q2AdmissionCandidate(candidate);
  assert.equal(result.state, 'Q1_CONTROLLED_EVIDENCE_PENDING');
  assert.equal(result.q1Complete, false);
  assert.equal(result.authority.nativeCoreKd3Qualified, false);
  assert.equal(result.authority.productionKernelAllowed, false);
});

test('Q1 complete plus project oracle keeps primary published oracle as explicit blocker', () => {
  const candidate = completeCandidate();
  candidate.publishedOracle = null;
  const result = evaluateKd320Q2AdmissionCandidate(candidate);
  assert.equal(result.state, 'Q2_PROJECT_ORACLE_RETAINED_PRIMARY_PENDING');
  assert.equal(result.q2OracleAdmissionReady, false);
  assert.ok(result.blockers.includes('PRIMARY_PUBLISHED_ORACLE_MISSING'));
});

test('complete controlled evidence plus both oracle slots reaches Q2 admission only', () => {
  const result = evaluateKd320Q2AdmissionCandidate(completeCandidate());
  assert.equal(result.state, 'Q2_ORACLE_ADMISSION_READY');
  assert.equal(result.q2OracleAdmissionReady, true);
  assert.equal(result.nextStage, 'Q3_ISOLATED_NATIVE_KERNEL_IMPLEMENTATION_CANDIDATE');
  assert.equal(result.authority.nativeCoreKd3Qualified, false);
  assert.equal(result.authority.canUseForDesignAuthority, false);
});

test('receipt checker collision blocks Q1 completion after identity normalization', () => {
  const candidate = completeCandidate();
  candidate.sourceReceipts[0].independentCheckBy = ' extractor a ';
  const result = evaluateKd320Q2AdmissionCandidate(candidate);
  assert.equal(result.q1Complete, false);
  assert.ok(result.blockers.some((code) => code.includes('INDEPENDENT_RECEIPT_CHECK_MISSING')));
});

test('semantic omission blocks Q1 exit', () => {
  const candidate = completeCandidate();
  candidate.semanticItems = candidate.semanticItems.slice(0, -1);
  const result = evaluateKd320Q2AdmissionCandidate(candidate);
  assert.equal(result.q1Complete, false);
  assert.equal(result.q2OracleAdmissionReady, false);
});

test('project oracle must retain the full Salt to mean stress to parameters to Seq to N chain', () => {
  const candidate = completeCandidate();
  candidate.projectOracle.chain.permissibleCycles = null;
  const result = evaluateKd320Q2AdmissionCandidate(candidate);
  assert.equal(result.q2OracleAdmissionReady, false);
  assert.ok(result.blockers.includes('PROJECT_ORACLE:N_INVALID'));
});

test('authority promotion request is rejected independently of evidence completeness', () => {
  const candidate = completeCandidate();
  candidate.authority.nativeCoreKd3Qualified = true;
  const result = evaluateKd320Q2AdmissionCandidate(candidate);
  assert.equal(result.ok, false);
  assert.ok(result.blockers.includes('AUTHORITY_PROMOTION_PROHIBITED'));
  assert.equal(result.authority.nativeCoreKd3Qualified, false);
});

test('unexpected semantic rows are rejected instead of being silently ignored', () => {
  const candidate = completeCandidate();
  candidate.semanticItems.push({ ...candidate.semanticItems[0], semanticId: 'KD320-SEM-999' });
  const result = evaluateKd320Q2AdmissionCandidate(candidate);
  assert.equal(result.ok, false);
  assert.ok(result.blockers.includes('SEMANTIC_ITEM_SET_MISMATCH'));
});

test('file verifier consumes the same candidate contract', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kd320-q2-'));
  const file = path.join(dir, 'candidate.json');
  fs.writeFileSync(file, JSON.stringify(completeCandidate(), null, 2));
  const result = verifyKd320Q2CandidateFile(file, { requireReady: true });
  assert.equal(result.q2OracleAdmissionReady, true);
  assert.equal(result.requireReady, true);
});
