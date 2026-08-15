import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('production input workspace renders the unified view and no duplicate flare/canvas view', async () => {
  const input = await read('tabs/vibration-aiv-input-view.js');
  assert.equal(input.includes("renderAivUnifiedCanvasWorkspaceHtml"), true);
  assert.equal(input.includes("renderAivCanvasWorkspaceHtml"), false);
  assert.equal(input.includes("renderAivFlareNetworkAuthoringHtml"), false);
  assert.equal(input.includes("vibration-aiv-canvas-view.js"), false);
  assert.equal(input.includes("vibration-aiv-flare-network-view.js"), false);
});

test('qualification creates one unified controller and no legacy canvas/flare controller', async () => {
  const qualification = await read('tabs/vibration-aiv-qualification-tab.js');
  assert.equal(qualification.includes('createAivUnifiedCanvasController'), true);
  assert.equal(qualification.includes('createAivCanvasInteractionController'), false);
  assert.equal(qualification.includes('createAivFlareNetworkAuthoringController'), false);
  assert.equal(qualification.includes('vibration-aiv-canvas-controller.js'), false);
  assert.equal(qualification.includes('vibration-aiv-flare-network-controller.js'), false);
  assert.equal(qualification.includes('canvasController.destroy();'), true);
});

test('unified renderer owns exactly one SVG and authoring controls own none', async () => {
  const [view, authorView] = await Promise.all([
    read('tabs/vibration-aiv-unified-canvas-view.js'),
    read('tabs/vibration-aiv-unified-canvas-author-view.js'),
  ]);
  assert.equal((view.match(/<svg\b/gu) ?? []).length, 1);
  assert.equal((authorView.match(/<svg\b/gu) ?? []).length, 0);
  assert.equal(view.includes('data-aiv-unified-canvas-svg="true"'), true);
  assert.equal(view.includes('renderAivUnifiedCanvasSelectedDetailHtml'), true);
  assert.equal(view.includes('vibration-aiv-canvas-view.js'), false);
});

test('unified controller keeps NETWORK_DRIVEN relationship mode inspection-only', async () => {
  const controller = await read('tabs/vibration-aiv-unified-canvas-controller.js');
  assert.equal(controller.includes('isNetworkDriven(container)) return;'), true);
  assert.equal(controller.includes('moveAivFlareNetworkNodePresentation'), true);
  assert.equal(controller.includes('applyAivUnifiedNetworkAuthorAction'), true);
  assert.equal(controller.includes('applyAivUnifiedNetworkAuthorChange'), true);
  assert.equal(controller.includes('createAivCanvasInteractionController'), false);
  assert.equal(controller.includes('createAivFlareNetworkAuthoringController'), false);
});

test('unified production view/controller add no acoustic equation or pixel-distance authority', async () => {
  const sources = await Promise.all([
    'tabs/vibration-aiv-unified-canvas-view.js',
    'tabs/vibration-aiv-unified-canvas-controller.js',
    'tabs/vibration-aiv-unified-canvas-author.js',
    'tabs/vibration-aiv-unified-canvas-inspector.js',
  ].map(read));
  for (const source of sources) {
    assert.equal(source.includes('Math.log('), false);
    assert.equal(source.includes('Math.log10('), false);
    assert.equal(source.includes('svgPixelsAuthoritativeForDistance: true'), false);
  }
});
