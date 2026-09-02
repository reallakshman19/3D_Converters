import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { buildVibrationRoadmapProjection } from '../converters/vibration/roadmap/projection.js';
import { renderVibrationRoadmapPanel } from '../tabs/vibration-roadmap-panel.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const controllerSource = fs.readFileSync(path.join(ROOT, 'tabs/vibration-roadmap-controller.js'), 'utf8');

function diagnostic(code, message) {
  return {
    code,
    message,
    details: {},
    authority: {
      purpose: 'UI_NAVIGATION_DIAGNOSTIC_ONLY',
      engineeringAuthority: 'NONE',
      screeningAuthority: 'NOT_AUTHORIZED',
      designAuthority: false,
      determinesApplicability: false,
      determinesCompleteness: false,
      blocksCalculation: false,
    },
  };
}

test('VIB-UI-002 controller does not silently optional-chain workspace or assessment clicks', () => {
  assert.doesNotMatch(controllerSource, /workspaceTab\([^)]*\)\?\.click\(\)/);
  assert.doesNotMatch(controllerSource, /assessmentRow\([^)]*\)\?\.click\(\)/);
  assert.match(controllerSource, /VIBRATION_ROADMAP_WORKSPACE_TARGET_NOT_FOUND/);
  assert.match(controllerSource, /VIBRATION_ROADMAP_ASSESSMENT_TARGET_NOT_FOUND/);
  assert.match(controllerSource, /failNavigation\(/);
});

test('VIB-UI-002 navigation failures render a visible non-authoritative diagnostic', () => {
  const projection = buildVibrationRoadmapProjection({
    context: {
      navigationDiagnostic: diagnostic(
        'VIBRATION_ROADMAP_WORKSPACE_TARGET_NOT_FOUND',
        'Case task is not available in the current workspace view.',
      ),
    },
  });
  const html = renderVibrationRoadmapPanel(projection);
  assert.match(html, /data-roadmap-navigation-message/);
  assert.match(html, /data-roadmap-navigation-code="VIBRATION_ROADMAP_WORKSPACE_TARGET_NOT_FOUND"/);
  assert.match(html, /Navigation unavailable/);
  assert.match(html, /Case task is not available in the current workspace view\./);
  assert.match(html, /no engineering authority and no calculation blocking/i);
});

test('VIB-UI-002 malformed diagnostic authority is not projected', () => {
  const bad = diagnostic('BAD', 'Bad diagnostic');
  bad.authority.blocksCalculation = true;
  const html = renderVibrationRoadmapPanel(buildVibrationRoadmapProjection({
    context: { navigationDiagnostic: bad },
  }));
  assert.doesNotMatch(html, /data-roadmap-navigation-message/);
});
