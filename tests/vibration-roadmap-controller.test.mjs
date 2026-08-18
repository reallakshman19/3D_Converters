import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldShowVibrationRoadmap, VIBRATION_ROADMAP_STATE_EVENT } from '../tabs/vibration-roadmap-controller.js';
import { buildVibrationRoadmapProjection } from '../converters/vibration/roadmap/projection.js';
import { renderVibrationRoadmapPanel } from '../tabs/vibration-roadmap-panel.js';

test('roadmap only mounts for Vibration family or its landing', () => {
  assert.equal(shouldShowVibrationRoadmap({ family: 'VIB' }, {}), true);
  assert.equal(shouldShowVibrationRoadmap({ family: 'PIPE' }, { familyLanding: 'VIB' }), true);
  assert.equal(shouldShowVibrationRoadmap({ family: 'PIPE' }, {}), false);
});

test('roadmap event has a dedicated presentation-only channel', () => {
  assert.equal(VIBRATION_ROADMAP_STATE_EVENT, 'vibration-roadmap-state');
});

test('active calculation is highlighted without changing roadmap authority', () => {
  const projection = buildVibrationRoadmapProjection({ context: { calculationId: 'VIB.AIV.ACOUSTIC' } });
  const html = renderVibrationRoadmapPanel(projection);
  assert.match(html, /class="vibration-roadmap-node is-active"[^>]*data-calc-id="VIB\.AIV\.ACOUSTIC"/);
  assert.equal(projection.authority.engineeringAuthority, 'NONE');
});

test('collapsed presentation retains non-binding authority statement', () => {
  const projection = buildVibrationRoadmapProjection();
  const html = renderVibrationRoadmapPanel(projection, { collapsed: true });
  assert.match(html, /vibration-roadmap-panel is-collapsed/);
  assert.match(html, /Guidance only · not an applicability or completion gate/);
});
