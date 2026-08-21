import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HP_PIPING_CLASS_REVIEW_DISPOSITIONS,
  appendHpPipingClassReviewDisposition,
  buildHpPipingClassReviewDispositionPackage,
  createHpPipingClassReviewDispositionLedger,
  hashHpPipingClassEngineeringReviewReport,
  parseHpPipingClassReviewDispositionLedger,
  summarizeHpPipingClassReviewDisposition,
  verifyHpPipingClassReviewDispositionPackage,
} from '../tabs/hp-piping-class-engineering-review-disposition.js';

function report({ pressure = 20, revision = 'A' } = {}) {
  return {
    schemaVersion: 'hp-piping-class-engineering-review-report/v1',
    reportPurpose: 'ENGINEERING_REVIEW_ONLY',
    identity: { projectId: 'HP-PROJ-001', classId: 'HP-CS-001', revision },
    authority: {
      calculationMode: 'USER_CALCULATED_KD3',
      nativeCoreKd3Qualified: false,
      codeCompliance: false,
      canUseForDesignAuthority: false,
      engineeringAuthority: 'HP_PIPING_CLASS_REVIEW_ORCHESTRATION_ONLY',
      reportPurpose: 'ENGINEERING_REVIEW_ONLY',
    },
    classBasis: { designPressureMpa: pressure, internalAllowanceMm: 3, externalAllowanceMm: 0 },
    productResults: [{ productId: 'NPS4-S160', pressureRatingMpa: 23.086120852009273, cumulativeUsage: 0.05 }],
    cycleResults: [{ productId: 'NPS4-S160', cycleId: 'C1', coreSaltMpa: 63.29949581051363, equivalentAlternatingStressMpa: 70, permissibleCycles: 10000, appliedCycles: 500, cycleUsage: 0.05 }],
    externalKdCustody: [{ productId: 'NPS4-S160', cycleId: 'C1', calculationBasis: { calculationRef: 'HP-FAT-EXT-001', checkedBy: 'ENGINEER_B' } }],
  };
}

test('review dispositions intentionally exclude approval/release semantics', () => {
  assert.deepEqual(HP_PIPING_CLASS_REVIEW_DISPOSITIONS, [
    'NO_OBJECTION_FOR_ENGINEERING_REVIEW',
    'COMMENTS_RECORDED',
    'REJECTED_FOR_ENGINEERING_REVIEW',
  ]);
  assert.equal(HP_PIPING_CLASS_REVIEW_DISPOSITIONS.some((value) => /APPROV|RELEASE/.test(value)), false);
});

test('append-only disposition binds actor and custody to the exact report SHA-256', async () => {
  const source = report();
  const expectedHash = await hashHpPipingClassEngineeringReviewReport(source);
  const ledger = await appendHpPipingClassReviewDisposition(createHpPipingClassReviewDispositionLedger(), source, {
    actor: 'ENGINEER_C', role: 'REVIEWER', disposition: 'NO_OBJECTION_FOR_ENGINEERING_REVIEW', recordedAt: '2026-08-21T10:30:00Z',
  });
  assert.equal(ledger.entries.length, 1);
  assert.equal(ledger.entries[0].sequence, 1);
  assert.equal(ledger.entries[0].reportSha256, expectedHash);
  assert.equal(ledger.entries[0].canAuthorizeRelease, undefined);
  assert.equal(ledger.entries[0].authority.canAuthorizeRelease, false);
  assert.equal(ledger.entries[0].authority.codeCompliance, false);
  assert.equal(ledger.entries[0].authority.canUseForDesignAuthority, false);
});

test('any report engineering change makes prior review custody historical instead of carrying it forward', async () => {
  const ledger = await appendHpPipingClassReviewDisposition(null, report(), {
    actor: 'ENGINEER_C', role: 'REVIEWER', disposition: 'NO_OBJECTION_FOR_ENGINEERING_REVIEW', recordedAt: '2026-08-21T10:30:00Z',
  });
  const changed = report({ pressure: 21 });
  assert.notEqual(await hashHpPipingClassEngineeringReviewReport(report()), await hashHpPipingClassEngineeringReviewReport(changed));
  const summary = await summarizeHpPipingClassReviewDisposition(ledger, changed);
  assert.equal(summary.currentDisposition, 'PENDING_REVIEW');
  assert.equal(summary.currentRecordCount, 0);
  assert.equal(summary.historicalRecordCount, 1);
});

test('comments and rejection require an explicit comment', async () => {
  for (const disposition of ['COMMENTS_RECORDED', 'REJECTED_FOR_ENGINEERING_REVIEW']) {
    await assert.rejects(
      appendHpPipingClassReviewDisposition(null, report(), { actor: 'ENGINEER_C', role: 'CHECKER', disposition, recordedAt: '2026-08-21T10:30:00Z' }),
      /comment is required/i,
    );
  }
});

test('ledger parser rejects authority promotion and non-append-only sequence corruption', async () => {
  const ledger = await appendHpPipingClassReviewDisposition(null, report(), {
    actor: 'ENGINEER_C', role: 'CHECKER', disposition: 'COMMENTS_RECORDED', comment: 'Resolve item R-01.', recordedAt: '2026-08-21T10:30:00Z',
  });
  const promoted = JSON.parse(JSON.stringify(ledger));
  promoted.authority.canAuthorizeRelease = true;
  assert.throws(() => parseHpPipingClassReviewDispositionLedger(promoted), /canAuthorizeRelease must remain false/);
  const reordered = JSON.parse(JSON.stringify(ledger));
  reordered.entries[0].sequence = 2;
  assert.throws(() => parseHpPipingClassReviewDispositionLedger(reordered), /append-only and contiguous/);
});

test('review package independently verifies embedded report hash and detects report tampering', async () => {
  const ledger = await appendHpPipingClassReviewDisposition(null, report(), {
    actor: 'ENGINEER_C', role: 'REVIEWER', disposition: 'NO_OBJECTION_FOR_ENGINEERING_REVIEW', recordedAt: '2026-08-21T10:30:00Z',
  });
  const pkg = await buildHpPipingClassReviewDispositionPackage(report(), ledger);
  const verified = await verifyHpPipingClassReviewDispositionPackage(pkg);
  assert.equal(verified.ok, true);
  assert.equal(verified.currentRecordCount, 1);
  const tampered = JSON.parse(JSON.stringify(pkg));
  tampered.report.classBasis.designPressureMpa = 22;
  const failed = await verifyHpPipingClassReviewDispositionPackage(tampered);
  assert.equal(failed.ok, false);
  assert.match(failed.error, /SHA-256 does not match/);
});
