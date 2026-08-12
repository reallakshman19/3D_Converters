import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { ENGINEERING_WORKSPACE_SUBTABS } from '../tabs/engineering-workspace-tab.js';

const extensionSource = fs.readFileSync(new URL('../core/engineering-tabs-extension.js', import.meta.url), 'utf8');
const landingSource = fs.readFileSync(new URL('../tabs/vibrations-landing-tab.js', import.meta.url), 'utf8');

test('Engineering Calculations workspace exposes the exact five requested items in order', () => {
  assert.deepEqual(
    ENGINEERING_WORKSPACE_SUBTABS.map(({ id, label }) => ({ id, label })),
    [
      { id: 'calculations', label: 'Calculations' },
      { id: 'b313-material-factors', label: 'B31.3 Material Factors' },
      { id: 'empirical-weight-tuning', label: 'Empirical Weight Tuning' },
      { id: 'hp-piping-class', label: 'HP Piping Class' },
      { id: 'vibrations', label: 'Vibrations' },
    ],
  );
});

test('Vibrations landing page exposes FIT and opens the existing FIT workspace dynamically', () => {
  assert.match(landingSource, /<h2>Vibrations<\/h2>/u);
  assert.match(landingSource, /Flow-Induced Turbulence \(FIT\)/u);
  assert.match(landingSource, /VIB\.FIV\.FLOW_TURBULENCE/u);
  assert.match(landingSource, /BENCHMARK ONLY/u);
  assert.match(landingSource, /data-vibrations-action="open-fit"/u);
  assert.match(landingSource, /import\('\.\/vibration-integrity-tab\.js\?v=vibration-integrity-fit-2'\)/u);
  assert.match(landingSource, /Engineering Calculations \/ Vibrations \/ FIT/u);
  assert.match(landingSource, /← Vibrations/u);
});

test('Vibrations landing page is presentation/navigation only', () => {
  assert.doesNotMatch(landingSource, /calculateFit\s*\(/u);
  assert.doesNotMatch(landingSource, /calculateEngineering(?:Batch)?\s*\(/u);
  assert.doesNotMatch(landingSource, /<canvas|createElement\(['"]canvas/iu);
  assert.doesNotMatch(landingSource, /riskScore|Risk Score|Facility Score|Vibration Score/u);
});

test('Engineering extension has one top-level Engineering Calculations entry and legacy vibration deep-link migration', () => {
  assert.match(extensionSource, /id: 'engineering-calculations'/u);
  assert.match(extensionSource, /label: 'Engineering Calculations'/u);
  assert.doesNotMatch(extensionSource, /label: 'Vibration Integrity'/u);
  assert.match(extensionSource, /LEGACY_VIBRATION_TAB_ID = 'vibration-integrity'/u);
  assert.match(extensionSource, /subtabId: 'vibrations'/u);
  assert.match(extensionSource, /vibrationPage: 'fit'/u);
});
