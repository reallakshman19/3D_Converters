import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { renderVibrationRoadmapPanel } from '../tabs/vibration-roadmap-panel.js';
import {
  buildVibrationRoadmapScopeChoices,
  isGovernedVibrationRoadmapScopeChoices,
  resolveVibrationRoadmapScopeSelection,
} from '../tabs/vibration-roadmap-scope-selection.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function rows() {
  return [
    { rowKey: 'ROW-1', line: '10-P-100', caseId: 'NORMAL', canonicalId: 'LINE-A' },
    { rowKey: 'ROW-2', line: '10-P-100', caseId: 'STARTUP', canonicalId: 'LINE-A' },
  ];
}

function selectedAssessment(scopeChoices) {
  return Object.freeze({
    schema: 'VibrationIntegrityRoadmapAssessmentContext.v1',
    rowKey: 'ROW-1',
    scopeChoices,
    lineCaseAssessmentStatus: Object.freeze({
      schema: 'VibrationLineCaseAssessmentStatus.v1',
      scope: Object.freeze({ line: '10-P-100', caseId: 'NORMAL', canonicalId: 'LINE-A' }),
      state: 'REQUIRED_ASSESSMENT_INCOMPLETE',
      nextActionCode: 'COMPLETE_REQUIRED_ASSESSMENTS',
      completeness: Object.freeze({ state: 'INCOMPLETE' }),
      screeningEvidence: Object.freeze({ state: 'CURRENT' }),
      authority: Object.freeze({
        purpose: 'LINE_CASE_WORKFLOW_STATUS_PROJECTION_ONLY',
        determinesApplicability: false,
        determinesCompleteness: false,
      }),
    }),
    authority: Object.freeze({
      purpose: 'SELECTED_REGISTER_SCOPE_WORKFLOW_CONTEXT_ONLY',
      determinesApplicability: false,
      determinesCompleteness: false,
      createsCaseIdentity: false,
      persistenceAuthority: 'NONE',
    }),
  });
}

function projection(selected) {
  return Object.freeze({
    schema: 'VibrationRoadmapProjection.v1',
    context: Object.freeze({ selectedAssessment: selected }),
    phases: Object.freeze([]),
    authority: Object.freeze({ purpose: 'VISUAL_NAVIGATION_GUIDANCE_ONLY' }),
  });
}

test('scope choices preserve exact current register identity without creating case identity', () => {
  const value = buildVibrationRoadmapScopeChoices(rows(), 'ROW-1');
  assert.equal(value.state, 'AVAILABLE');
  assert.equal(value.selectedRowKey, 'ROW-1');
  assert.deepEqual(value.choices.map((choice) => choice.rowKey), ['ROW-1', 'ROW-2']);
  assert.equal(value.choices[1].caseId, 'STARTUP');
  assert.equal(value.authority.createsCaseIdentity, false);
  assert.equal(value.authority.persistenceAuthority, 'NONE');
  assert.equal(isGovernedVibrationRoadmapScopeChoices(value), true);
});

test('duplicate row keys fail closed instead of selecting an ambiguous case', () => {
  const value = buildVibrationRoadmapScopeChoices([...rows(), { ...rows()[1], caseId: 'ALT' }], 'ROW-1');
  assert.equal(value.state, 'AMBIGUOUS_ROW_KEY');
  assert.deepEqual(value.choices, []);
  assert.equal(resolveVibrationRoadmapScopeSelection(value, 'ROW-1'), null);
});

test('missing selected row fails closed', () => {
  const value = buildVibrationRoadmapScopeChoices(rows(), 'ROW-X');
  assert.equal(value.state, 'SELECTED_ROW_UNAVAILABLE');
  assert.deepEqual(value.choices, []);
});

test('selection accepts only governed exact row keys', () => {
  const value = buildVibrationRoadmapScopeChoices(rows(), 'ROW-1');
  assert.equal(resolveVibrationRoadmapScopeSelection(value, 'ROW-2')?.caseId, 'STARTUP');
  assert.equal(resolveVibrationRoadmapScopeSelection(value, 'ROW-X'), null);
  assert.equal(resolveVibrationRoadmapScopeSelection({ ...value, authority: {} }, 'ROW-2'), null);
});

test('right rail renders exact line case and canonical scope choices', () => {
  const scopes = buildVibrationRoadmapScopeChoices(rows(), 'ROW-1');
  const html = renderVibrationRoadmapPanel(projection(selectedAssessment(scopes)));
  assert.match(html, /data-roadmap-assessment-select/);
  assert.match(html, /10-P-100 · NORMAL · LINE-A/);
  assert.match(html, /10-P-100 · STARTUP · LINE-A/);
  assert.match(html, /value="ROW-1" selected/);
  assert.match(html, /value="ROW-2"/);
});

test('ungoverned scope choices never render a selector', () => {
  const scopes = { ...buildVibrationRoadmapScopeChoices(rows(), 'ROW-1'), authority: {} };
  const html = renderVibrationRoadmapPanel(projection(selectedAssessment(scopes)));
  assert.doesNotMatch(html, /data-roadmap-assessment-select/);
  assert.match(html, /Selected assessment/);
});

test('bridge publishes current workspace rows as navigation-only scope choices', () => {
  const source = fs.readFileSync(path.join(ROOT, 'tabs/vibration-integrity-roadmap-bridge.js'), 'utf8');
  assert.match(source, /buildVibrationRoadmapScopeChoices/);
  assert.match(source, /state\.workspace\?\.rows/);
  assert.match(source, /scopeChoices/);
});

test('controller delegates selector changes to the existing facility row control', () => {
  const source = fs.readFileSync(path.join(ROOT, 'tabs/vibration-roadmap-controller.js'), 'utf8');
  assert.match(source, /data-roadmap-assessment-select/);
  assert.match(source, /resolveVibrationRoadmapScopeSelection/);
  assert.match(source, /querySelectorAll\('\[data-vi-row\]'\)/);
  assert.match(source, /assessmentRow\(container, selected\.rowKey\)\?\.click\(\)/);
});
