import assert from 'node:assert/strict';
import test from 'node:test';
import {
  appendHpPipingClassReviewDisposition,
  buildHpPipingClassReviewDispositionPackage,
  summarizeHpPipingClassReviewDisposition,
} from '../tabs/hp-piping-class-engineering-review-disposition.js';
import {
  HP_PIPING_CLASS_REVIEW_PACKAGE_VERIFICATION_RECEIPT_VERSION,
  serializeHpPipingClassReviewPackageVerificationReceipt,
  verifyHpPipingClassReviewPackageJson,
  verifyHpPipingClassReviewPackageObject,
} from '../tabs/hp-piping-class-review-package-verifier.js';

function report({ pressure = 20, revision = 'A' } = {}) {
  return {
    schemaVersion: 'hp-piping-class-engineering-review-report/v1',
    reportPurpose: 'ENGINEERING_REVIEW_ONLY',
    identity: { projectId: 'HP-PROJ-001', classId: 'HP-CS-001', revision },
    sourceContracts: { projectVersion: 'hp-piping-class-project/v2', orchestratorVersion: 'hp-piping-class-orchestrator/v1', resultExportVersion: 'hp-piping-class-result-export/v1' },
    method: { b313Edition: '2024', viii3Edition: '2025', calculationMode: 'USER_CALCULATED_KD3' },
    authority: {
      calculationMode: 'USER_CALCULATED_KD3',
      nativeCoreKd3Qualified: false,
      codeCompliance: false,
      canUseForDesignAuthority: false,
      engineeringAuthority: 'HP_PIPING_CLASS_REVIEW_ORCHESTRATION_ONLY',
      reportPurpose: 'ENGINEERING_REVIEW_ONLY',
    },
    classBasis: { designPressureMpa: pressure, internalAllowanceMm: 3, externalAllowanceMm: 0 },
    reviewSummary: { projectState: 'CALCULATED_NOT_AUTHORIZED', resultRoundTrip: { ok: true } },
    productInputs: [{ productId: 'NPS4-S160', nominalSize: 'NPS 4', outsideDiameterMm: 114.3, allowableStressMpa: 138, nominalWallMm: 13.49, minusTolerancePct: 12.5 }],
    productResults: [{ productId: 'NPS4-S160', reviewPriority: 'FATIGUE_EVALUATED', staticPass: true, requiredNominalThicknessMm: 12.240449712388969, pressureRatingMpa: 23.086120852009273, cumulativeUsage: 0.05, engineeringState: 'REVIEW_COMPLETE_NOT_AUTHORIZED' }],
    cycleResults: [{ productId: 'NPS4-S160', cycleId: 'C1', coreSaltMpa: 63.29949581051363, equivalentAlternatingStressMpa: 70, permissibleCycles: 10000, appliedCycles: 500, cycleUsage: 0.05 }],
    externalKdCustody: [{ productId: 'NPS4-S160', cycleId: 'C1', calculationBasis: { calculationRef: 'HP-FAT-EXT-001', checkedBy: 'ENGINEER_B' } }],
    advisories: [],
    limitations: ['REVIEW ONLY — NO DESIGN AUTHORITY.'],
  };
}

async function validPackage(sourceReport = report()) {
  const ledger = await appendHpPipingClassReviewDisposition(null, sourceReport, {
    actor: 'ENGINEER_C',
    role: 'REVIEWER',
    disposition: 'NO_OBJECTION_FOR_ENGINEERING_REVIEW',
    recordedAt: '2026-08-21T10:30:00Z',
  });
  return buildHpPipingClassReviewDispositionPackage(sourceReport, ledger);
}

test('valid review package yields a bounded verification receipt without authority promotion', async () => {
  const pkg = await validPackage();
  const result = await verifyHpPipingClassReviewPackageJson(JSON.stringify(pkg));
  assert.equal(result.ok, true);
  assert.equal(result.receipt.schemaVersion, HP_PIPING_CLASS_REVIEW_PACKAGE_VERIFICATION_RECEIPT_VERSION);
  assert.equal(result.receipt.currentDisposition, 'NO_OBJECTION_FOR_ENGINEERING_REVIEW');
  assert.equal(result.receipt.currentActor, 'ENGINEER_C');
  assert.equal(result.receipt.currentRecordCount, 1);
  assert.equal(result.receipt.historicalRecordCount, 0);
  assert.equal(result.receipt.trust.reportContentSha256Binding, 'PASS');
  assert.equal(result.receipt.trust.embeddedReportSchemaRoundTrip, 'PASS');
  assert.equal(result.receipt.trust.ledgerStructuralValidation, 'PASS');
  assert.equal(result.receipt.trust.storedSummaryRecomputation, 'PASS');
  assert.equal(result.receipt.trust.ledgerEntryCryptographicIntegrity, 'NOT_AVAILABLE_V1');
  assert.equal(result.receipt.trust.reviewerIdentityAuthentication, 'NOT_AVAILABLE_USER_DECLARED');
  assert.equal(result.receipt.trust.digitalSignature, false);
  assert.equal(result.receipt.trust.codeCompliance, false);
  assert.equal(result.receipt.trust.designAuthority, false);
  assert.equal(result.receipt.trust.releaseAuthority, false);
});

test('embedded report tamper is detected by SHA-256 recomputation', async () => {
  const pkg = JSON.parse(JSON.stringify(await validPackage()));
  pkg.report.classBasis.designPressureMpa = 21;
  const result = await verifyHpPipingClassReviewPackageObject(pkg);
  assert.equal(result.ok, false);
  assert.equal(result.issues[0].code, 'HP_REVIEW_PACKAGE_CONTENT_BINDING_FAILED');
  assert.match(result.issues[0].message, /SHA-256/i);
});

test('stored summary tamper is detected by fresh report-plus-ledger recomputation', async () => {
  const pkg = JSON.parse(JSON.stringify(await validPackage()));
  pkg.summary.currentDisposition = 'REJECTED_FOR_ENGINEERING_REVIEW';
  const result = await verifyHpPipingClassReviewPackageObject(pkg);
  assert.equal(result.ok, false);
  assert.equal(result.issues[0].code, 'HP_REVIEW_PACKAGE_SUMMARY_MISMATCH');
});

test('non-contiguous ledger sequence and authority promotion both fail closed', async () => {
  const brokenSequence = JSON.parse(JSON.stringify(await validPackage()));
  brokenSequence.ledger.entries[0].sequence = 2;
  const sequenceResult = await verifyHpPipingClassReviewPackageObject(brokenSequence);
  assert.equal(sequenceResult.ok, false);
  assert.equal(sequenceResult.issues[0].code, 'HP_REVIEW_PACKAGE_CONTENT_BINDING_FAILED');
  assert.match(sequenceResult.issues[0].message, /append-only and contiguous/);

  const promoted = JSON.parse(JSON.stringify(await validPackage()));
  promoted.authority.canAuthorizeRelease = true;
  const authorityResult = await verifyHpPipingClassReviewPackageObject(promoted);
  assert.equal(authorityResult.ok, false);
  assert.equal(authorityResult.issues[0].code, 'HP_REVIEW_PACKAGE_CONTENT_BINDING_FAILED');
  assert.match(authorityResult.issues[0].message, /canAuthorizeRelease must remain false/);
});

test('historical custody is reported separately when package report hash changes legitimately', async () => {
  const oldReport = report();
  const oldLedger = await appendHpPipingClassReviewDisposition(null, oldReport, {
    actor: 'ENGINEER_C', role: 'REVIEWER', disposition: 'NO_OBJECTION_FOR_ENGINEERING_REVIEW', recordedAt: '2026-08-21T10:30:00Z',
  });
  const changedReport = report({ pressure: 21, revision: 'B' });
  const pkg = await buildHpPipingClassReviewDispositionPackage(changedReport, oldLedger);
  const result = await verifyHpPipingClassReviewPackageObject(pkg);
  assert.equal(result.ok, true);
  assert.equal(result.receipt.currentDisposition, 'PENDING_REVIEW');
  assert.equal(result.receipt.currentRecordCount, 0);
  assert.equal(result.receipt.historicalRecordCount, 1);
});

test('semantic key reordering of stored summary does not create a false tamper finding', async () => {
  const pkg = JSON.parse(JSON.stringify(await validPackage()));
  const summary = await summarizeHpPipingClassReviewDisposition(pkg.ledger, pkg.report);
  pkg.summary = Object.fromEntries(Object.entries(JSON.parse(JSON.stringify(summary))).reverse());
  const result = await verifyHpPipingClassReviewPackageObject(pkg);
  assert.equal(result.ok, true);
});

test('invalid JSON is classified without throwing and verification receipt stays non-authorizing', async () => {
  const invalid = await verifyHpPipingClassReviewPackageJson('{not-json');
  assert.equal(invalid.ok, false);
  assert.equal(invalid.issues[0].code, 'HP_REVIEW_PACKAGE_JSON_INVALID');

  const pkg = await validPackage();
  const valid = await verifyHpPipingClassReviewPackageObject(pkg);
  const serialized = serializeHpPipingClassReviewPackageVerificationReceipt(valid.receipt);
  const parsed = JSON.parse(serialized);
  assert.equal(parsed.trust.designAuthority, false);
  assert.equal(parsed.trust.releaseAuthority, false);
  assert.equal(parsed.trust.codeCompliance, false);
});
