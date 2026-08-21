import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const verifier = await readFile(new URL('../tabs/hp-piping-class-review-package-verifier.js', import.meta.url), 'utf8');
const tab = await readFile(new URL('../tabs/hp-piping-class-review-package-verifier-tab.js', import.meta.url), 'utf8');
const route = await readFile(new URL('../tabs/engineering-workspace-tab.js', import.meta.url), 'utf8');

test('Engineering Workspace exposes the verifier as an independent subtab', () => {
  assert.match(route, /id: 'hp-review-package-verify'/);
  assert.match(route, /label: 'HP Review Package Verify'/);
  assert.match(route, /hp-piping-class-review-package-verifier-tab\.js/);
  assert.match(route, /renderHpPipingClassReviewPackageVerifierTab/);
});

test('verifier is read-only with respect to HP project and review ledger storage', () => {
  assert.match(tab, /This tool does not import or modify the HP engineering project/);
  assert.doesNotMatch(tab, /localStorage\.setItem|sessionStorage\.setItem/);
  assert.doesNotMatch(tab, /HP_PIPING_CLASS_WORKSPACE_STORAGE_KEY/);
  assert.doesNotMatch(tab, /HP_PIPING_CLASS_REVIEW_DISPOSITION_STORAGE_KEY/);
  assert.doesNotMatch(tab, /data-hpwb-bind|serializeHpPipingClassWorkspaceProject/);
});

test('UI clearly separates verified self-consistency from unavailable identity and ledger-entry authenticity', () => {
  for (const token of [
    'PACKAGE SELF-CONSISTENCY VERIFIED',
    'v1 review entries are not hash-chained or digitally signed',
    'Reviewer/checker identity is user-declared',
    'does not prove actor authenticity, Code compliance, design approval or release authority',
    'CURRENT means the entry binds to the exact embedded report hash and identity. It does not mean design-approved.',
  ]) assert.ok(tab.includes(token), `missing verifier disclosure: ${token}`);
  assert.match(verifier, /ledgerEntryCryptographicIntegrity: 'NOT_AVAILABLE_V1'/);
  assert.match(verifier, /reviewerIdentityAuthentication: 'NOT_AVAILABLE_USER_DECLARED'/);
  assert.match(verifier, /digitalSignature: false/);
  assert.match(verifier, /codeCompliance: false/);
  assert.match(verifier, /designAuthority: false/);
  assert.match(verifier, /releaseAuthority: false/);
});

test('verifier recomputes package summary rather than trusting exported summary text', () => {
  assert.match(verifier, /summarizeHpPipingClassReviewDisposition/);
  assert.match(verifier, /canonicalJson\(pkg\.summary\) !== canonicalJson\(recomputedSummary\)/);
  assert.match(verifier, /HP_REVIEW_PACKAGE_SUMMARY_MISMATCH/);
});

test('verifier uses existing disposition/report validators and adds no engineering formula path', () => {
  assert.match(verifier, /verifyHpPipingClassReviewDispositionPackage/);
  assert.match(verifier, /verifyHpPipingClassEngineeringReviewReportRoundTrip/);
  assert.match(verifier, /parseHpPipingClassReviewDispositionLedger/);
  assert.doesNotMatch(verifier, /Math\.exp|Math\.log/);
  assert.doesNotMatch(tab, /Math\.exp|Math\.log/);
});

test('verification receipt export is available only after a successful verification result', () => {
  assert.match(tab, /data-hp-review-package-action="receipt" disabled/);
  assert.match(tab, /receiptButton\.disabled = !state\.result\?\.ok/);
  assert.match(tab, /serializeHpPipingClassReviewPackageVerificationReceipt/);
});
