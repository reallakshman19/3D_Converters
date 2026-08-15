import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  CHAPTER_IX_STATIC_QUALIFICATION_CANDIDATE_VERSION,
  evaluateChapterIxStaticQualificationCandidate,
} from '../converters/b313-chapter-ix/static-qualification-candidate.js';
import { verifyChapterIxStaticQualificationCandidateFile } from '../scripts/verify-b313-ch9-static-qualification-candidate.mjs';

const hash = (value) => `sha256:${value.repeat(64)}`;

function checkedSource(sourceId, role, standard, edition, marker) {
  return {
    sourceId,
    role,
    standard,
    edition,
    documentHash: hash(marker),
    qualificationState: 'INDEPENDENTLY_CHECKED',
    controlledSourceVerified: true,
    status: 'INDEPENDENTLY_CHECKED',
    verifiedBy: 'ENGINEER_A',
    independentCheckBy: 'ENGINEER_B',
    verifiedAt: '2026-08-15T10:00:00Z',
    independentCheckedAt: '2026-08-15T11:00:00Z',
  };
}

function candidate() {
  const methodSource = checkedSource('SRC-B313-METHOD', 'B313_CHAPTER_IX', 'ASME B31.3', '2024', '1');
  const allowableSource = checkedSource('SRC-B313-ALLOW', 'B313_ALLOWABLE_STRESS', 'ASME B31.3', '2024', '2');
  const dimensionSource = checkedSource('SRC-B3610', 'PIPE_DIMENSION', 'ASME B36.10M', '2022', '3');
  const toleranceSource = checkedSource('SRC-A530', 'PRODUCT_TOLERANCE', 'ASTM A530/A530M', '2024', '4');
  return {
    candidateVersion: CHAPTER_IX_STATIC_QUALIFICATION_CANDIDATE_VERSION,
    method: { methodId: 'B313-CH9-PF-2024-R1', methodRevision: '1.0.0', b313Edition: '2024' },
    basisPackage: {
      packageVersion: 'b313-ch9-basis-package/v1',
      query: {
        materialId: 'TEST-CS', b313Edition: '2024', materialTemperatureC: 100, productId: 'TEST-NPS4',
      },
      masters: {
        sources: [methodSource, allowableSource, dimensionSource, toleranceSource],
        materialAllowable: [{
          materialId: 'TEST-CS', b313Edition: '2024', temperatureC: 100,
          allowableStressMpa: 138, sourceId: 'SRC-B313-ALLOW', sourceLocator: 'TEST-ALLOWABLE-POINT',
          qualificationState: 'INDEPENDENTLY_CHECKED',
        }],
        pipeProduct: [{
          productId: 'TEST-NPS4', materialId: 'TEST-CS', dimensionId: 'DIM-NPS4',
          productSpec: 'ASTM A106', manufacturingProcess: 'SEAMLESS', toleranceRuleId: 'TOL-A530',
          qualificationState: 'INDEPENDENTLY_CHECKED',
        }],
        pipeDimension: [{
          dimensionId: 'DIM-NPS4', nps: '4', schedule: 'TEST', odMm: 114.3, nominalWallMm: 13.49,
          dimensionStandard: 'ASME B36.10M', dimensionEdition: '2022', sourceId: 'SRC-B3610',
          sourceLocator: 'TEST-DIMENSION-POINT', qualificationState: 'INDEPENDENTLY_CHECKED',
        }],
        manufacturingTolerance: [{
          toleranceRuleId: 'TOL-A530', productSpec: 'ASTM A106', manufacturingProcess: 'SEAMLESS',
          minusTolerancePct: 12.5, toleranceStandard: 'ASTM A530/A530M', toleranceEdition: '2024',
          sourceId: 'SRC-A530', sourceLocator: 'TEST-TOLERANCE-RULE',
          qualificationState: 'INDEPENDENTLY_CHECKED',
        }],
      },
    },
    benchmark: {
      benchmarkId: 'TEST-CLASS-E-P01', methodId: 'B313-CH9-PF-2024-R1',
      oracleClass: 'CLASS_E_CODE_LICENSED', sourceId: 'SRC-B313-METHOD', independent: true,
      status: 'INDEPENDENTLY_CHECKED', producedBy: 'ENGINEER_C', reviewedBy: 'ENGINEER_D',
      input: { designPressureMpa: 20, internalAllowanceMm: 3, externalAllowanceMm: 0 },
      expected: {
        pressureDesignThicknessMm: 7.7103934983403475,
        requiredMinimumThicknessMm: 10.710393498340348,
        pressureRatingMpa: 23.086120852009273,
      },
      tolerance: { type: 'RELATIVE', value: 1e-12 },
    },
  };
}

test('complete static candidate proves governed basis and independent numerical parity but remains non-authorizing', () => {
  const result = evaluateChapterIxStaticQualificationCandidate(candidate());
  assert.equal(result.ok, true);
  assert.equal(result.candidateState, 'EVIDENCE_COMPLETE_NOT_AUTHORIZED');
  assert.equal(result.evidenceComplete, true);
  assert.equal(result.basis.resolverState, 'RESOLVED_NOT_AUTHORIZED');
  assert.equal(result.comparison.pass, true);
  assert.equal(result.qualification.packageState, 'EVIDENCE_COMPLETE_NOT_AUTHORIZED');
  assert.equal(result.canPromoteCalculationAuthority, false);
});

test('candidate blocks when a governed basis source is not independently checked', () => {
  const input = candidate();
  input.basisPackage.masters.sources.find((row) => row.sourceId === 'SRC-A530').qualificationState = 'SOURCE_PENDING';
  const result = evaluateChapterIxStaticQualificationCandidate(input);
  assert.equal(result.candidateState, 'BASIS_EVIDENCE_PENDING');
  assert.equal(result.canPromoteCalculationAuthority, false);
  assert(result.basis.issues.includes('TOLERANCE_SOURCE_NOT_INDEPENDENTLY_CHECKED'));
});

test('candidate blocks a numerical mismatch without changing the expected oracle', () => {
  const input = candidate();
  input.benchmark.expected.pressureRatingMpa = 22;
  const result = evaluateChapterIxStaticQualificationCandidate(input);
  assert.equal(result.candidateState, 'BENCHMARK_MISMATCH');
  assert.equal(result.comparison.pass, false);
  assert.equal(result.canPromoteCalculationAuthority, false);
});

test('candidate blocks missing independent producer/reviewer custody', () => {
  const input = candidate();
  input.benchmark.reviewedBy = input.benchmark.producedBy;
  const result = evaluateChapterIxStaticQualificationCandidate(input);
  assert.equal(result.candidateState, 'BENCHMARK_EVIDENCE_PENDING');
  assert(result.issues.includes('BENCHMARK_CUSTODY_INCOMPLETE'));
});

test('file verifier executes the same candidate contract', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hp-ch9-static-qual-'));
  const filePath = path.join(dir, 'candidate.json');
  fs.writeFileSync(filePath, JSON.stringify(candidate(), null, 2));
  const result = verifyChapterIxStaticQualificationCandidateFile(filePath);
  assert.equal(result.candidateState, 'EVIDENCE_COMPLETE_NOT_AUTHORIZED');
  assert.equal(result.canPromoteCalculationAuthority, false);
});
