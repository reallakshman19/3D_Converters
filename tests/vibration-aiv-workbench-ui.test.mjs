import test from 'node:test';
import assert from 'node:assert/strict';
import { renderAivQualificationWorkspaceHtml } from '../tabs/vibration-aiv-qualification-view.js';
import { renderAivFlareNetworkAuthoringHtml } from '../tabs/vibration-aiv-flare-network-view.js';
import { createInitialAivQualificationState } from '../tabs/vibration-aiv-state.js';

test('AIV workbench presents import/readiness/results before secondary qualification evidence', () => {
  const html = renderAivQualificationWorkspaceHtml(createInitialAivQualificationState());
  assert.match(html, /EI AVIFF · screening workbench/);
  assert.match(html, /SCREENING QUALIFIED/);
  assert.match(html, /aivq-banner is-qualified/);
  assert.match(html, /data-aiv-file="eit"/);
  assert.match(html, /Import EI \.eit/);
  assert.match(html, /Qualification evidence & method trace/);
  assert.doesNotMatch(html, /TABLE\/IMPORT MODE ACTIVE/);
  assert.ok(html.indexOf('Start an AIV assessment') < html.indexOf('AIV result scopes'));
  assert.ok(html.indexOf('AIV result scopes') < html.indexOf('Qualification evidence & method trace'));
});

test('secondary engineering tools are progressive disclosures rather than equal-weight page sections', () => {
  const html = renderAivQualificationWorkspaceHtml(createInitialAivQualificationState());
  assert.match(html, /<details class="aivq-disclosure"><summary><span>Flare network authoring<\/span>/);
  assert.match(html, /<details class="aivq-disclosure"><summary><span>Controlled benchmark & assumptions<\/span>/);
  assert.match(html, /<details class="aivq-disclosure"><summary><span>Working data tables<\/span>/);
  assert.match(html, /<details class="aivq-disclosure aivq-evidence-disclosure">/);
});

test('flare authoring no longer injects a competing local style block', () => {
  const state = createInitialAivQualificationState();
  const html = renderAivFlareNetworkAuthoringHtml(state);
  assert.doesNotMatch(html, /<style>/);
  assert.match(html, /Working-table mode/);
  assert.match(html, /connectivity from graph/);
  assert.match(html, /explicit engineering length/);
});
