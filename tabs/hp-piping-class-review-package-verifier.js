import {
  HP_PIPING_CLASS_REVIEW_DISPOSITION_PACKAGE_V1_VERSION,
  HP_PIPING_CLASS_REVIEW_DISPOSITION_PACKAGE_VERSION,
  HP_PIPING_CLASS_REVIEW_CHAIN_INTEGRITY,
  HP_PIPING_CLASS_REVIEW_CHAIN_NOT_AVAILABLE_V1,
  parseHpPipingClassReviewDispositionLedger,
  summarizeHpPipingClassReviewDisposition,
  verifyHpPipingClassReviewDispositionPackage,
} from './hp-piping-class-engineering-review-disposition.js';
import {
  HP_PIPING_CLASS_ENGINEERING_REVIEW_REPORT_VERSION,
  verifyHpPipingClassEngineeringReviewReportRoundTrip,
} from './hp-piping-class-engineering-review-report.js';

export const HP_PIPING_CLASS_REVIEW_PACKAGE_VERIFICATION_RECEIPT_VERSION = 'hp-piping-class-review-package-verification-receipt/v2';
const PACKAGE_VERSIONS = new Set([HP_PIPING_CLASS_REVIEW_DISPOSITION_PACKAGE_V1_VERSION, HP_PIPING_CLASS_REVIEW_DISPOSITION_PACKAGE_VERSION]);
const INTEGRITY_STATES = new Set([HP_PIPING_CLASS_REVIEW_CHAIN_NOT_AVAILABLE_V1, HP_PIPING_CLASS_REVIEW_CHAIN_INTEGRITY]);

function text(value) { return String(value ?? '').trim(); }
function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
}
function canonicalJson(value) { return JSON.stringify(canonicalize(value)); }
function identity(report = {}) {
  return Object.freeze({ projectId: text(report.identity?.projectId), classId: text(report.identity?.classId), revision: text(report.identity?.revision) });
}
function trustMatrix(packageVerification) {
  return Object.freeze({
    reportContentSha256Binding: 'PASS', embeddedReportSchemaRoundTrip: 'PASS', ledgerStructuralValidation: 'PASS',
    storedSummaryRecomputation: 'PASS', ledgerEntryCryptographicIntegrity: packageVerification.ledgerEntryCryptographicIntegrity,
    ledgerHeadSha256: packageVerification.ledgerHeadSha256, reviewerIdentityAuthentication: 'NOT_AVAILABLE_USER_DECLARED',
    digitalSignature: false, nativeCoreKd3Qualified: false, codeCompliance: false, designAuthority: false, releaseAuthority: false,
  });
}
function issue(code, message) { return Object.freeze({ code, message: String(message ?? '') }); }
function assertPackageShape(pkg) {
  if (!pkg || typeof pkg !== 'object' || Array.isArray(pkg)) throw Object.assign(new TypeError('HP review package must be a JSON object.'), { code: 'HP_REVIEW_PACKAGE_OBJECT_REQUIRED' });
  if (!PACKAGE_VERSIONS.has(pkg.schemaVersion)) throw Object.assign(new TypeError(`Unsupported HP review package schema ${text(pkg.schemaVersion) || '(blank)'}.`), { code: 'HP_REVIEW_PACKAGE_SCHEMA_UNSUPPORTED' });
  if (pkg.report?.schemaVersion !== HP_PIPING_CLASS_ENGINEERING_REVIEW_REPORT_VERSION) throw Object.assign(new TypeError('Embedded engineering-review report schema is unsupported.'), { code: 'HP_REVIEW_PACKAGE_REPORT_SCHEMA_UNSUPPORTED' });
}
function integrityLimitation(packageVerification) {
  return packageVerification.ledgerEntryCryptographicIntegrity === HP_PIPING_CLASS_REVIEW_CHAIN_INTEGRITY
    ? 'The v2 SHA-256 hash chain is internally self-consistent and detects un-rehashed entry mutation, but it is not an external signature, trusted timestamp, or reviewer-identity proof.'
    : 'The legacy v1 review ledger has no entry hash chain; independently modified review-entry content cannot be proven authentic from this package alone.';
}

export async function verifyHpPipingClassReviewPackageObject(packageValue) {
  try {
    const pkg = clone(packageValue);
    assertPackageShape(pkg);
    const packageVerification = await verifyHpPipingClassReviewDispositionPackage(pkg);
    if (!packageVerification.ok) throw Object.assign(new TypeError(packageVerification.error || 'Review package verification failed.'), { code: 'HP_REVIEW_PACKAGE_CONTENT_BINDING_FAILED' });
    const reportVerification = verifyHpPipingClassEngineeringReviewReportRoundTrip(pkg.report);
    if (!reportVerification.ok) throw Object.assign(new TypeError(reportVerification.error || 'Embedded engineering-review report round trip failed.'), { code: 'HP_REVIEW_PACKAGE_REPORT_ROUNDTRIP_FAILED' });
    const ledger = parseHpPipingClassReviewDispositionLedger(pkg.ledger);
    const recomputedSummary = await summarizeHpPipingClassReviewDisposition(ledger, pkg.report);
    if (canonicalJson(pkg.summary) !== canonicalJson(recomputedSummary)) throw Object.assign(new TypeError('Stored review-package summary does not match a fresh recomputation from the embedded report and ledger.'), { code: 'HP_REVIEW_PACKAGE_SUMMARY_MISMATCH' });

    const reportIdentity = identity(pkg.report);
    const currentHash = packageVerification.reportSha256;
    const currentEntries = ledger.entries.filter((entry) => entry.reportSha256 === currentHash && entry.projectId === reportIdentity.projectId && entry.classId === reportIdentity.classId && entry.revision === reportIdentity.revision);
    const historicalEntries = ledger.entries.filter((entry) => !currentEntries.includes(entry));
    const current = currentEntries.at(-1) ?? null;
    const receipt = Object.freeze({
      schemaVersion: HP_PIPING_CLASS_REVIEW_PACKAGE_VERIFICATION_RECEIPT_VERSION,
      verificationPurpose: 'INDEPENDENT_REVIEW_PACKAGE_SELF_CONSISTENCY', verificationAuthority: 'PACKAGE_SELF_CONSISTENCY_ONLY',
      packageSchemaVersion: pkg.schemaVersion, reportSchemaVersion: pkg.report.schemaVersion, reportSha256: currentHash,
      identity: reportIdentity, currentDisposition: current?.disposition ?? 'PENDING_REVIEW', currentActor: current?.actor ?? null,
      currentRole: current?.role ?? null, currentRecordedAt: current?.recordedAt ?? null,
      currentRecordCount: currentEntries.length, historicalRecordCount: historicalEntries.length,
      reportProductCount: pkg.report.productResults?.length ?? 0, reportCycleCount: pkg.report.cycleResults?.length ?? 0,
      externalKdCustodyCount: pkg.report.externalKdCustody?.length ?? 0, projectState: text(pkg.report.reviewSummary?.projectState) || null,
      trust: trustMatrix(packageVerification),
      limitations: Object.freeze([
        'PASS means the embedded report hash, report schema round trip, ledger structure/authority and stored summary are internally consistent.',
        integrityLimitation(packageVerification),
        'Reviewer/checker identity is USER_DECLARED and is not authenticated by PKI or digital signature.',
        'Native CORE KD-3 / KD320 remains not qualified by this verification.',
        'This verification does not establish ASME Code compliance, design approval or release authority.',
      ]),
    });
    return Object.freeze({
      ok: true, package: Object.freeze(pkg), ledger, recomputedSummary,
      currentEntries: Object.freeze(currentEntries.map((entry) => Object.freeze(clone(entry)))),
      historicalEntries: Object.freeze(historicalEntries.map((entry) => Object.freeze(clone(entry)))),
      receipt, issues: Object.freeze([]),
    });
  } catch (error) {
    return Object.freeze({ ok: false, package: null, ledger: null, recomputedSummary: null, currentEntries: Object.freeze([]), historicalEntries: Object.freeze([]), receipt: null, issues: Object.freeze([issue(error?.code || 'HP_REVIEW_PACKAGE_VERIFICATION_FAILED', error?.message || error)]) });
  }
}

export async function verifyHpPipingClassReviewPackageJson(textValue) {
  let parsed;
  try { parsed = JSON.parse(String(textValue ?? '')); }
  catch (error) {
    return Object.freeze({ ok: false, package: null, ledger: null, recomputedSummary: null, currentEntries: Object.freeze([]), historicalEntries: Object.freeze([]), receipt: null, issues: Object.freeze([issue('HP_REVIEW_PACKAGE_JSON_INVALID', `Review package JSON is invalid: ${error.message}`)]) });
  }
  return verifyHpPipingClassReviewPackageObject(parsed);
}

export function serializeHpPipingClassReviewPackageVerificationReceipt(receipt) {
  if (receipt?.schemaVersion !== HP_PIPING_CLASS_REVIEW_PACKAGE_VERIFICATION_RECEIPT_VERSION) throw new TypeError('Unsupported HP review-package verification receipt schema.');
  const trust = receipt.trust ?? {};
  if (receipt.verificationAuthority !== 'PACKAGE_SELF_CONSISTENCY_ONLY'
      || !INTEGRITY_STATES.has(trust.ledgerEntryCryptographicIntegrity)
      || trust.reviewerIdentityAuthentication !== 'NOT_AVAILABLE_USER_DECLARED'
      || trust.digitalSignature !== false || trust.nativeCoreKd3Qualified !== false || trust.codeCompliance !== false
      || trust.designAuthority !== false || trust.releaseAuthority !== false) {
    throw new TypeError('HP review-package verification receipt cannot promote integrity, identity or engineering authority beyond the verified package state.');
  }
  if (trust.ledgerEntryCryptographicIntegrity === HP_PIPING_CLASS_REVIEW_CHAIN_INTEGRITY && !/^[0-9a-f]{64}$/u.test(String(trust.ledgerHeadSha256 ?? ''))) {
    throw new TypeError('v2 verification receipt requires the verified SHA-256 ledger chain head.');
  }
  if (trust.ledgerEntryCryptographicIntegrity === HP_PIPING_CLASS_REVIEW_CHAIN_NOT_AVAILABLE_V1 && trust.ledgerHeadSha256 !== null) {
    throw new TypeError('Legacy v1 verification receipt cannot claim a ledger chain head.');
  }
  return `${JSON.stringify(receipt, null, 2)}\n`;
}
