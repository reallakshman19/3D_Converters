import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { renderVibrationRoadmapPanel } from '../tabs/vibration-roadmap-panel.js';
import {
  buildVibrationWorkspaceNavigationRequest,
  isGovernedVibrationWorkspaceNavigationRequest,
  resolveVibrationCaseActionWorkspace,
} from '../tabs/vibration-roadmap-workspace-routing.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function selectedAssessment(nextActionCode = 'AUTHOR_T1_IDENTIFICATION') {
  return Object.freeze({
    schema: 'VibrationIntegrityRoadmapAssessmentContext.v1',
    authority: Object.freeze({
      purpose: 'SELECTED_REGISTER_SCOPE_WORKFLOW_CONTEXT_ONLY',
      determinesApplicability: false,
      determinesCompleteness: false,
      createsCaseIdentity: false,
      persistenceAuthority: 'NONE',
    }),
    lineCaseAssessmentStatus: Object.freeze({
      schema: 'VibrationLineCaseAssessmentStatus.v1',
      scope: Object.freeze({ line: '10-P-100', caseId: 'NORMAL', canonicalId: 'LINE-A' }),
      state: 'IDENTIFICATION_MISSING',
      nextActionCode,
      completeness: Object.freeze({ state: 'INCOMPLETE' }),
      screeningEvidence: Object.freeze({ state: 'NONE' }),
      authority: Object.freeze({
        purpose: 'LINE_CASE_WORKFLOW_STATUS_PROJECTION_ONLY',
        determinesApplicability: false,
        determinesCompleteness: false,
      }),
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

test('case action routing uses existing identification and screening workspaces only', () => {
  assert.equal(resolveVibrationCaseActionWorkspace('AUTHOR_T1_IDENTIFICATION').workspaceId, 'identification');
  assert.equal(resolveVibrationCaseActionWorkspace('REVIEW_NOT_APPLICABLE_EVIDENCE').workspaceId, 'identification');
  assert.equal(resolveVibrationCaseActionWorkspace('COMPLETE_REQUIRED_ASSESSMENTS').workspaceId, 'screening');
  assert.equal(resolveVibrationCaseActionWorkspace('REVIEW_ASSESSMENT_GAPS').workspaceId, 'screening');
  assert.equal(resolveVibrationCaseActionWorkspace('UNSUPPORTED_ACTION'), null);
});

test('navigation request fails closed for mismatched or unsupported workspace routes', () => {
  const valid = buildVibrationWorkspaceNavigationRequest({
    workspaceId: 'identification', actionCode: 'AUTHOR_T1_IDENTIFICATION',
  });
  assert.equal(isGovernedVibrationWorkspaceNavigationRequest(valid), true);
  assert.equal(buildVibrationWorkspaceNavigationRequest({
    workspaceId: 'screening', actionCode: 'AUTHOR_T1_IDENTIFICATION',
  }), null);
  assert.equal(buildVibrationWorkspaceNavigationRequest({
    workspaceId: 'activity', actionCode: 'UNSUPPORTED_ACTION',
  }), null);
  assert.equal(isGovernedVibrationWorkspaceNavigationRequest({ ...valid, authority: {} }), false);
});

test('governed selected case renders an executable central workspace action', () => {
  const html = renderVibrationRoadmapPanel(projection(selectedAssessment()));
  assert.match(html, /Open case task/);
  assert.match(html, /data-vibration-workspace-id="identification"/);
  assert.match(html, /data-vibration-workflow-action="AUTHOR_T1_IDENTIFICATION"/);
});

test('unsupported governed next action stays visible but non-clickable', () => {
  const html = renderVibrationRoadmapPanel(projection(selectedAssessment('UNSUPPORTED_ACTION')));
  assert.match(html, /UNSUPPORTED_ACTION/);
  assert.match(html, /No central workspace route is registered/);
  assert.doesNotMatch(html, /data-vibration-workspace-id=/);
});

test('outer console forwards workspace action before calculation navigation without remount', () => {
  const source = fs.readFileSync(path.join(ROOT, 'tabs/engineering-calculations-tab.js'), 'utf8');
  const workspaceBranch = source.indexOf("closest('[data-vibration-workspace-id]')");
  const calculationBranch = source.indexOf("closest('[data-calc-id]')");
  assert.ok(workspaceBranch >= 0 && workspaceBranch < calculationBranch);
  assert.match(source, /host\.dispatchEvent\(new EventClass\(VIBRATION_WORKSPACE_REQUEST_EVENT/);
  const start = source.indexOf('function openMountedVibrationWorkspace');
  const end = source.indexOf('\n  function buildRequest', start);
  assert.doesNotMatch(source.slice(start, end), /resetForDefinition/);
});

test('mounted Vibration Integrity workspace accepts governed request and cleans listener', () => {
  const source = fs.readFileSync(path.join(ROOT, 'tabs/vibration-integrity-tab.js'), 'utf8');
  assert.match(source, /isGovernedVibrationWorkspaceNavigationRequest\(request\)/);
  assert.match(source, /state\.workspaceTab = request\.workspaceId/);
  assert.match(source, /source: 'RIGHT_RAIL_CASE_ACTION'/);
  assert.match(source, /addEventListener\(VIBRATION_WORKSPACE_REQUEST_EVENT, onWorkspaceRequest\)/);
  assert.match(source, /removeEventListener\(VIBRATION_WORKSPACE_REQUEST_EVENT, onWorkspaceRequest\)/);
});
