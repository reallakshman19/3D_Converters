import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..');
const tab = fs.readFileSync(path.join(repo, 'tabs/hp-piping-class-tab.js'), 'utf8');
const controller = fs.readFileSync(path.join(repo, 'tabs/hp-piping-class-workspace-controller.js'), 'utf8');

test('native HP editor owns v2 state, persistence and canonical orchestration seam', () => {
  assert.match(tab, /createHpPipingClassWorkspaceController/);
  assert.match(controller, /evaluateHpPipingClassProject/);
  assert.match(controller, /HP_PIPING_CLASS_WORKSPACE_STORAGE_KEY/);
  assert.match(tab, /Run review calculation/);
  assert.match(tab, /data-hp-bind/);
});

test('native editors cover class basis, products, wall custody, transients and external KD-3 evidence', () => {
  for (const token of [
    'classBasis.designPressureMpa',
    'calculationBasis.outsideDiameterMm',
    'wallState.fatigueWallBasis',
    'transient.states',
    'transient.transitions',
    'fatigueEvidence',
    'equivalentAlternatingStressMpa',
    'permissibleCycles',
    'calculationBasis.checkedBy',
  ]) assert.match(tab, new RegExp(token.replaceAll('.', '\\.')));
});

test('UI layer contains no Chapter IX engineering equations or native KD-3 implementation', () => {
  for (const forbidden of [
    /Math\.exp\(/,
    /Math\.log\(/,
    /calculateAutomaticSeq/,
    /fatigueCurveData/,
    /pressureDesignThicknessMm\s*=/,
    /alternatingStressIntensityMpa\s*=.*pressure/i,
  ]) assert.doesNotMatch(tab, forbidden);
});

test('authority is visible as review-only and controller rejects promotion', () => {
  assert.match(tab, /CORE KD-3 · NOT QUALIFIED/);
  assert.match(tab, /DESIGN AUTHORITY · FALSE/);
  assert.match(tab, /REVIEW ONLY/);
  assert.match(controller, /AUTHORITY_PROMOTION_BLOCKED/);
  assert.match(controller, /authorityPromotionDetected/);
});

test('legacy compatibility remains lazy and does not own native editor state', () => {
  assert.match(tab, /document\.createElement\('iframe'\)/);
  assert.match(tab, /Open legacy workspace/);
  const root = tab.match(/container\.innerHTML = `([\s\S]*?)`;\n\n  const panelHost/);
  assert.ok(root, 'native root template not found');
  assert.doesNotMatch(root[1], /<iframe/i);
});
