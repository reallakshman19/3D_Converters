import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..');
const ui = fs.readFileSync(path.join(repo, 'tabs/hp-kd320-evidence-intake-tab.js'), 'utf8');
const workspace = fs.readFileSync(path.join(repo, 'tabs/engineering-workspace-tab.js'), 'utf8');
const parser = fs.readFileSync(path.join(repo, 'engineering/hp-class-standardization/qualification/kd320-q2/csv-intake.js'), 'utf8');

test('Engineering workspace registers a dedicated KD320 evidence intake subtab', () => {
  assert.match(workspace, /id: 'hp-kd320-evidence-intake'/);
  assert.match(workspace, /label: 'KD320 Evidence Intake'/);
  assert.match(workspace, /hp-kd320-evidence-intake-tab\.js\?v=20260819-kd320-csv-intake-1/);
  assert.match(workspace, /renderHpKd320EvidenceIntakeTab/);
  assert.match(workspace, /hp-piping-class-workbench-tab\.js\?v=20260816-hp-real-workbench-2/);
});

test('intake UI exposes file upload, exact templates, two modes, state, blockers and authority warning', () => {
  assert.match(ui, /Upload CSV/);
  assert.match(ui, /Download exact template/);
  assert.match(ui, /KD320_CSV_MODES\.PROJECT/);
  assert.match(ui, /KD320_CSV_MODES\.PUBLISHED/);
  assert.match(ui, /Q2 \/ edition gate/);
  assert.match(ui, /Gate blockers/);
  assert.match(ui, /DESIGN AUTHORITY FALSE/);
  assert.match(ui, /No automatic oracle admission/);
  assert.match(ui, /previewKd320EvidenceCsv/);
});

test('UI remains presentation-only and contains no KD320 engineering arithmetic', () => {
  for (const forbidden of [/Math\.exp\(/, /Math\.log\(/, /calculateAutomaticSeq/, /interpolateFatigueLife/, /permissibleCycles\s*=/]) {
    assert.doesNotMatch(ui, forbidden);
  }
  assert.doesNotMatch(ui, /canUseForDesignAuthority\s*:\s*true/);
  assert.doesNotMatch(ui, /nativeCoreKd3Qualified\s*:\s*true/);
});

test('CSV adapter reuses existing Q2 and edition evaluators and never promotes authority', () => {
  assert.match(parser, /evaluateKd320Q2AdmissionCandidate/);
  assert.match(parser, /evaluateKd320EditionReconciliation/);
  assert.match(parser, /productionKernelAllowed:\s*false/);
  assert.match(parser, /automaticPromotionAllowed:\s*false/);
  assert.doesNotMatch(parser, /productionKernelAllowed:\s*true/);
  assert.doesNotMatch(parser, /automaticPromotionAllowed:\s*true/);
});
