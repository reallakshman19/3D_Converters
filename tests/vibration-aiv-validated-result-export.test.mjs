import assert from 'node:assert/strict';
import test from 'node:test';
import { AIV_DEFAULT_ASSUMPTION_PROFILE } from '../converters/vibration/aiv/aiv-assumption-profile.js';
import {
  AIV_D23_PRODUCT_PATH_VALIDATION,
  buildAivD23ValidatedExportPackage,
} from '../tabs/vibration-aiv-validation-records.js';
import { renderAivResultShellsHtml } from '../tabs/vibration-aiv-result-view.js';

test('committed D.2.3 validation exposes Source Assessment and Line result contracts', () => {
  assert.equal(AIV_D23_PRODUCT_PATH_VALIDATION.status, 'PASS');
  assert.equal(AIV_D23_PRODUCT_PATH_VALIDATION.counts.passed, 22);
  assert.equal(AIV_D23_PRODUCT_PATH_VALIDATION.sourceResults.every((item) => item.schema === 'AivSourceResult.v1'), true);
  assert.equal(AIV_D23_PRODUCT_PATH_VALIDATION.assessmentResult.schema, 'AivAssessmentResult.v1');
  assert.equal(AIV_D23_PRODUCT_PATH_VALIDATION.lineResult.schema, 'AivLineCaseSummary.v1');
  assert.equal(AIV_D23_PRODUCT_PATH_VALIDATION.assessmentResult.lof, 0.29);
  assert.equal(AIV_D23_PRODUCT_PATH_VALIDATION.lineResult.lof, 1.48);
  assert.equal(AIV_D23_PRODUCT_PATH_VALIDATION.lineResult.valuesAreNotInterchangeable, true);
});

test('validated export package includes assumptions and retains no screening/design authority', () => {
  const payload = buildAivD23ValidatedExportPackage({ assumptionProfile: AIV_DEFAULT_ASSUMPTION_PROFILE });
  assert.equal(payload.schema, 'AivValidatedBenchmarkExportPackage.v1');
  assert.equal(payload.validationStatus, 'PASS');
  assert.equal(payload.validationRecord.status, 'PASS');
  assert.equal(payload.assumptionProfile.schema, 'AivAssumptionProfile.v1');
  assert.equal(payload.benchmarkInputsModified, false);
  assert.equal(payload.screeningAuthority, 'NOT_AUTHORIZED');
  assert.equal(payload.designAuthority, false);
});

test('modified benchmark export is explicitly not applicable', () => {
  const payload = buildAivD23ValidatedExportPackage({
    assumptionProfile: AIV_DEFAULT_ASSUMPTION_PROFILE,
    benchmarkModified: true,
  });
  assert.equal(payload.validationStatus, 'NOT_APPLICABLE_MODIFIED_INPUTS');
  assert.equal(payload.benchmarkInputsModified, true);
});

test('result view shows validated values only for an unmodified controlled benchmark', () => {
  const validated = renderAivResultShellsHtml({ benchmark: { loaded: { modified: false } } });
  assert.match(validated, /Validated EI D\.2\.3 benchmark results/u);
  assert.match(validated, /164\.6851759525391/u);
  assert.match(validated, /1\.48/u);
  assert.match(validated, /Export validation package/u);

  const modified = renderAivResultShellsHtml({ benchmark: { loaded: { modified: true } } });
  assert.doesNotMatch(modified, /Validated EI D\.2\.3 benchmark results/u);
  assert.match(modified, /validation result is not applicable/u);
});
