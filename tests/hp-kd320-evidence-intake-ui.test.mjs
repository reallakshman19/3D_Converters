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
const semantic = fs.readFileSync(path.join(repo, 'engineering/hp-class-standardization/qualification/kd320-q1/semantic-csv-intake.js'), 'utf8');
const parser = fs.readFileSync(path.join(repo, 'engineering/hp-class-standardization/qualification/kd320-q2/csv-intake.js'), 'utf8');

test('Engineering workspace registers the Q1 semantic intake cache identity', () => {
  assert.match(workspace, /id: 'hp-kd320-evidence-intake'/);
  assert.match(workspace, /label: 'KD320 Evidence Intake'/);
  assert.match(workspace, /hp-kd320-evidence-intake-tab\.js\?v=20260819-kd320-q1-semantic-intake-1/);
  assert.match(workspace, /renderHpKd320EvidenceIntakeTab/);
  assert.match(workspace, /hp-piping-class-workbench-tab\.js\?v=20260816-hp-real-workbench-2/);
});

test('intake UI preserves all four first-class record classes', () => {
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

test('CONTROLLED_SOURCE exposes a Q1 semantic sub-package without adding a fifth record class', () => {
  assert.match(ui, /CONTROLLED_SOURCE sub-package — Q1 semantic contract/);
  assert.match(ui, /Download Q1 semantic template/);
  assert.match(ui, /Upload Q1 semantic CSV/);
  assert.match(ui, /previewKd320Q1SemanticCsv/);
  assert.match(ui, /KD320-SEM-001…014/);
  assert.doesNotMatch(ui, /KD320_CSV_MODES\.Q1_SEMANTIC/);
});

test('Q1 semantic UI warns that complete semantics still require separately verified receipts', () => {
  assert.match(ui, /does not make Q1 complete until source receipts are separately verified/);
  assert.match(ui, /no field for licensed Code text, equations, fatigue-curve points, or native numerical values/i);
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

test('Q1 semantic adapter delegates readiness to the existing Q2 evaluator and cannot promote authority', () => {
  assert.match(semantic, /evaluateKd320Q2AdmissionCandidate/);
  assert.match(semantic, /PENDING_CONTROLLED_SOURCE_RECEIPT/);
  assert.match(semantic, /productionKernelAllowed:\s*false/);
  assert.match(semantic, /automaticPromotionAllowed:\s*false/);
  assert.doesNotMatch(semantic, /productionKernelAllowed:\s*true/);
  assert.doesNotMatch(semantic, /automaticPromotionAllowed:\s*true/);
  assert.doesNotMatch(semantic, /engineeringDefinition/);
});

test('four-record facade continues to delegate existing QF022/QF023 and qualification gates', () => {
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
