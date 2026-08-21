import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const core = await readFile(new URL('../tabs/hp-piping-class-engineering-review-disposition.js', import.meta.url), 'utf8');
const enhancer = await readFile(new URL('../tabs/hp-piping-class-engineering-review-disposition-enhancer.js', import.meta.url), 'utf8');
const route = await readFile(new URL('../tabs/engineering-workspace-tab.js', import.meta.url), 'utf8');

test('active HP route composes review disposition after report export and cleans it up independently', () => {
  assert.match(route, /hp-piping-class-engineering-review-report-enhancer\.js/);
  assert.match(route, /hp-piping-class-engineering-review-disposition-enhancer\.js/);
  assert.match(route, /installHpPipingClassEngineeringReviewDispositionEnhancer/);
  assert.match(route, /destroyReviewDisposition/);
});

test('disposition enhancer re-evaluates the canonical project instead of trusting visible report text', () => {
  assert.match(enhancer, /validateHpPipingClassProject/);
  assert.match(enhancer, /evaluateHpPipingClassProject/);
  assert.match(enhancer, /buildHpPipingClassEngineeringReviewReport/);
  assert.match(enhancer, /includeEvidence: true/);
  assert.doesNotMatch(enhancer, /innerText.*pressure|textContent.*Salt/i);
});

test('review custody is stored separately from the HP engineering project and context fallback retires on edits', () => {
  assert.match(enhancer, /HP_PIPING_CLASS_REVIEW_DISPOSITION_STORAGE_KEY/);
  assert.match(enhancer, /readStoredProject\(\) \?\? contextProject/);
  assert.match(enhancer, /contextProject = null/);
  assert.doesNotMatch(enhancer, /setItem\(HP_PIPING_CLASS_WORKSPACE_STORAGE_KEY/);
});

test('UI exposes only non-authorizing review dispositions, append-only language and declared-identity disclosure', () => {
  for (const token of [
    'NO_OBJECTION_FOR_ENGINEERING_REVIEW',
    'COMMENTS_RECORDED',
    'REJECTED_FOR_ENGINEERING_REVIEW',
    'Records cannot be edited or deleted here',
    'REVIEW CUSTODY ONLY',
    'No design-release or Code authority granted',
    'user-declared',
    'not a digital signature',
  ]) assert.ok(enhancer.toLowerCase().includes(token.toLowerCase()), `missing ${token}`);
  assert.doesNotMatch(enhancer, />Approved<|APPROVED_FOR_DESIGN|DESIGN_APPROVED/);
});

test('report binding uses Web Crypto SHA-256 and package verification fails closed without claiming identity authentication', () => {
  assert.match(core, /crypto\?\.subtle/);
  assert.match(core, /SHA-256/);
  assert.match(core, /serializeHpPipingClassEngineeringReviewReportJson/);
  assert.match(core, /canAuthorizeRelease: false/);
  assert.match(core, /actorIdentityAuthority: 'USER_DECLARED'/);
  assert.match(core, /digitalSignature: false/);
  assert.match(core, /verifyHpPipingClassReviewDispositionPackage/);
  assert.doesNotMatch(core, /Math\.exp|Math\.log/);
  assert.doesNotMatch(enhancer, /Math\.exp|Math\.log/);
});
