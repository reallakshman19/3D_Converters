import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..');
const ui = fs.readFileSync(path.join(repo, 'tabs/hp-kd320-evidence-intake-tab.js'), 'utf8');
const workspace = fs.readFileSync(path.join(repo, 'tabs/engineering-workspace-tab.js'), 'utf8');
const facade = fs.readFileSync(path.join(repo, 'engineering/hp-class-standardization/qualification/kd320-q2/csv-four-record-intake.js'), 'utf8');
const parser = fs.readFileSync(path.join(repo, 'engineering/hp-class-standardization/qualification/kd320-q2/csv-intake.js'), 'utf8');

test('Engineering workspace registers the R2 KD320 evidence intake subtab', () => {
  assert.match(workspace, /id: 'hp-kd320-evidence-intake'/);
  assert.match(workspace, /label: 'KD320 Evidence Intake'/);
  assert.match(workspace, /hp-kd320-evidence-intake-tab\.js\?v=20260819-kd320-csv-intake-2/);
  assert.match(workspace, /renderHpKd320EvidenceIntakeTab/);
  assert.match(workspace, /hp-piping-class-workbench-tab\.js\?v=20260816-hp-real-workbench-2/);
});

test('intake UI exposes file upload, exact templates and all four record classes', () => {
  assert.match(ui, /Upload CSV/);
  assert.match(ui, /Download exact template/);
  assert.match(ui, /KD320_CSV_MODES\.CONTROLLED_SOURCE/);
  assert.match(ui, /KD320_CSV_MODES\.EDITION_SEMANTIC/);
  assert.match(ui, /KD320_CSV_MODES\.QF022_ORACLE/);
  assert.match(ui, /KD320_CSV_MODES\.QF023_PROJECT_CALC/);
  assert.match(ui, /Qualification gate/);
  assert.match(ui, /Gate blockers/);
  assert.match(ui, /DESIGN AUTHORITY FALSE/);
  assert.match(ui, /No automatic oracle admission/);
  assert.match(ui, /previewKd320EvidenceCsv/);
});

test('UI keeps parsed rows visible when file-level set blockers exist', () => {
  assert.match(ui, /File-level contract blockers/);
  assert.match(ui, /result\.rows\.map/);
  assert.doesNotMatch(ui, /fileIssues\?\.length\) return/);
});

test('UI remains presentation-only and contains no KD320 engineering arithmetic', () => {
  for (const forbidden of [/Math\.exp\(/, /Math\.log\(/, /calculateAutomaticSeq/, /interpolateFatigueLife/, /permissibleCycles\s*=/]) {
    assert.doesNotMatch(ui, forbidden);
  }
  assert.doesNotMatch(ui, /canUseForDesignAuthority\s*:\s*true/);
  assert.doesNotMatch(ui, /nativeCoreKd3Qualified\s*:\s*true/);
});

test('four-record facade delegates existing QF022/QF023 and qualification gates', () => {
  assert.match(facade, /previewLegacyCsv/);
  assert.match(facade, /evaluateKd320Q2AdmissionCandidate/);
  assert.match(facade, /evaluateKd320EditionReconciliation/);
  assert.match(facade, /productionKernelAllowed:\s*false/);
  assert.match(facade, /automaticPromotionAllowed:\s*false/);
  assert.doesNotMatch(facade, /productionKernelAllowed:\s*true/);
  assert.doesNotMatch(facade, /automaticPromotionAllowed:\s*true/);
  assert.match(parser, /evaluateKd320Q2AdmissionCandidate/);
  assert.match(parser, /evaluateKd320EditionReconciliation/);
});
