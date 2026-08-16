import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  FIT_AUTHORITY_BOUNDARY,
  VIBRATION_FIT_ENGINEERING_CALCULATION_DEFINITION as fit,
} from '../converters/engineering-calculations/adapters/vibration-fit.js';
import { composeEngineeringQualification } from '../converters/engineering-calculations/qualification.js';

const adapterSource = fs.readFileSync(
  new URL('../converters/engineering-calculations/adapters/vibration-fit.js', import.meta.url),
  'utf8',
);
const familySource = fs.readFileSync(
  new URL('../tabs/engineering-calculation-vibration-family.js', import.meta.url),
  'utf8',
);
const consoleSource = fs.readFileSync(
  new URL('../tabs/engineering-calculation-console-view.js', import.meta.url),
  'utf8',
);

test('FIT authority boundary is immutable screening-only metadata', () => {
  assert.equal(Object.isFrozen(FIT_AUTHORITY_BOUNDARY), true);
  assert.equal(Object.isFrozen(fit.authority), true);
  assert.deepEqual(FIT_AUTHORITY_BOUNDARY, {
    engineeringUse: 'BOUNDED_SCREENING_ONLY',
    designAuthority: false,
    designAuthorityDisposition: 'NOT_A_DESIGN_CHECK',
    codeCompliance: false,
    codeComplianceDisposition: 'NOT_A_CODE_COMPLIANCE_CHECK',
    futureAuthorityRoute: 'SEPARATE_QUALIFIED_ASSESSMENT_REQUIRED',
  });
  assert.equal(fit.authority.designAuthority, false);
  assert.equal(fit.authority.designAuthorityDisposition, 'NOT_A_DESIGN_CHECK');
  assert.equal(fit.authority.codeCompliance, false);
  assert.equal(fit.authority.codeComplianceDisposition, 'NOT_A_CODE_COMPLIANCE_CHECK');
  assert.equal(fit.authority.futureAuthorityRoute, 'SEPARATE_QUALIFIED_ASSESSMENT_REQUIRED');
});

test('Production lifecycle plus Screening data cannot become design authority', () => {
  const qualification = composeEngineeringQualification({
    method: 'PRODUCTION_AUTHORIZED',
    data: 'SCREENING',
    designAuthority: true,
  });
  assert.equal(qualification.effective, 'SCREENING');
  assert.equal(qualification.designAuthority, false);
});

test('FIT definition states reference bands are not code/design acceptance criteria', () => {
  const limitations = fit.applicability.limitations.join('\n');
  assert.match(limitations, /not a design acceptance check/u);
  assert.match(limitations, /not a qualified code-compliance PASS\/FAIL criterion/u);
  assert.match(limitations, /separate qualified assessment/u);
  assert.match(fit.ui.warning, /not a design check or code-compliance check/u);
});

test('FIT adapter has no in-place design or code authority promotion path', () => {
  assert.doesNotMatch(adapterSource, /designAuthority:\s*true/u);
  assert.doesNotMatch(adapterSource, /codeCompliance:\s*true/u);
  assert.match(adapterSource, /checks:\s*\[\]/u);
  assert.match(adapterSource, /SEPARATE_QUALIFIED_ASSESSMENT_REQUIRED/u);
});

test('FIT UI distinguishes screening use from design and code compliance', () => {
  assert.match(familySource, /Design use: SCREENING ONLY/u);
  assert.match(familySource, /Code compliance: NOT A CODE CHECK/u);
  assert.match(familySource, /FIT is a bounded screening method, not a design\/code check/u);
  assert.match(consoleSource, /SCREENING USE ONLY/u);
  assert.match(consoleSource, /NOT A CODE CHECK/u);
});
