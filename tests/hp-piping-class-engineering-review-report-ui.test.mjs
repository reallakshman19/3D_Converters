import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const report = await readFile(new URL('../tabs/hp-piping-class-engineering-review-report.js', import.meta.url), 'utf8');
const enhancer = await readFile(new URL('../tabs/hp-piping-class-engineering-review-report-enhancer.js', import.meta.url), 'utf8');
const route = await readFile(new URL('../tabs/engineering-workspace-tab.js', import.meta.url), 'utf8');

test('active HP route composes and cleans up the report enhancer without replacing the workbench', () => {
  assert.match(route, /hp-piping-class-product-bulk-workbench-tab\.js/);
  assert.match(route, /hp-piping-class-intake-package-enhancer\.js/);
  assert.match(route, /hp-piping-class-engineering-review-report-enhancer\.js/);
  assert.match(route, /installHpPipingClassEngineeringReviewReportEnhancer/);
  assert.match(route, /destroyReviewReport/);
});

test('report UI only exports from a canonical re-evaluation and verified report transaction', () => {
  assert.match(enhancer, /validateHpPipingClassProject/);
  assert.match(enhancer, /evaluateHpPipingClassProject/);
  assert.match(enhancer, /includeEvidence: true/);
  assert.match(enhancer, /verifyHpPipingClassEngineeringReviewReportRoundTrip/);
  assert.match(enhancer, /Export review HTML/);
  assert.match(enhancer, /Export review JSON/);
  assert.match(enhancer, /data-hpwb-class-result-matrix/);
});

test('report contract delegates numerical result custody to the existing canonical result-export contract', () => {
  assert.match(report, /buildHpPipingClassResultExport/);
  assert.match(report, /verifyHpPipingClassResultRoundTrip/);
  assert.match(report, /sortHpPipingClassResultRows/);
  assert.doesNotMatch(report, /Math\.exp|Math\.log/);
  assert.doesNotMatch(enhancer, /Math\.exp|Math\.log/);
});

test('standalone report remains visibly review-only and retains external KD custody', () => {
  assert.match(report, /ENGINEERING_REVIEW_ONLY/);
  assert.match(report, /REVIEW ONLY · NO DESIGN AUTHORITY/);
  assert.match(report, /Native CORE KD-3 \/ KD320 remains not qualified/);
  assert.match(report, /externalKdCustody/);
  assert.match(report, /calculationBasis/);
  assert.match(report, /calculationRef/);
  assert.match(report, /checkedBy/);
});
