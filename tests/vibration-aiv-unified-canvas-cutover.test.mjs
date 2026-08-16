import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
const unifiedModules = [
  'tabs/vibration-aiv-unified-canvas-projection.js',
  'tabs/vibration-aiv-unified-canvas-view.js',
  'tabs/vibration-aiv-unified-canvas-controller.js',
  'tabs/vibration-aiv-unified-canvas-author.js',
  'tabs/vibration-aiv-unified-canvas-author-view.js',
  'tabs/vibration-aiv-unified-canvas-inspector.js',
  'tabs/vibration-aiv-unified-canvas-editor.js',
  'tabs/vibration-aiv-unified-canvas-editor-controller.js',
  'tabs/vibration-aiv-unified-canvas-editor-view.js',
  'tabs/vibration-aiv-unified-canvas-table-author.js',
  'tabs/vibration-aiv-unified-canvas-labels.js',
];

test('production input workspace renders the unified view and no duplicate flare/canvas view', async () => {
  const input = await read('tabs/vibration-aiv-input-view.js');
  assert.equal(input.includes('renderAivUnifiedCanvasWorkspaceHtml'), true);
  assert.equal(input.includes('renderAivCanvasWorkspaceHtml'), false);
  assert.equal(input.includes('renderAivFlareNetworkAuthoringHtml'), false);
  assert.equal(input.includes('vibration-aiv-canvas-view.js'), false);
  assert.equal(input.includes('vibration-aiv-flare-network-view.js'), false);
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

test('unified renderer owns one SVG while the visible editor and label controls add no second SVG', async () => {
  const [view, authorView, editorView, labels] = await Promise.all([
    read('tabs/vibration-aiv-unified-canvas-view.js'),
    read('tabs/vibration-aiv-unified-canvas-author-view.js'),
    read('tabs/vibration-aiv-unified-canvas-editor-view.js'),
    read('tabs/vibration-aiv-unified-canvas-labels.js'),
  ]);
  assert.equal((view.match(/<svg\b/gu) ?? []).length, 1);
  assert.equal((authorView.match(/<svg\b/gu) ?? []).length, 0);
  assert.equal((editorView.match(/<svg\b/gu) ?? []).length, 0);
  assert.equal((labels.match(/<svg\b/gu) ?? []).length, 0);
  assert.equal(view.includes('data-aiv-unified-canvas-svg="true"'), true);
  assert.equal(view.includes('data-aiv-canvas-segment'), true);
  assert.equal(view.includes('AIV Network Canvas Editor'), true);
});

test('visible editor exposes graph, table and engineering label controls on the one-canvas surface', async () => {
  const [authorView, editorView, controller, qualification, view] = await Promise.all([
    read('tabs/vibration-aiv-unified-canvas-author-view.js'),
    read('tabs/vibration-aiv-unified-canvas-editor-view.js'),
    read('tabs/vibration-aiv-unified-canvas-controller.js'),
    read('tabs/vibration-aiv-qualification-tab.js'),
    read('tabs/vibration-aiv-unified-canvas-view.js'),
  ]);
  assert.equal(authorView.includes('data-aiv-canvas-editor-tool="PLACE_NODE"'), true);
  assert.equal(authorView.includes('data-aiv-canvas-editor-tool="CONNECT_SEGMENT"'), true);
  assert.equal(authorView.includes('data-aiv-canvas-editor-action="delete-selected"'), true);
  assert.equal(authorView.includes('data-aiv-canvas-table-action="add-source"'), true);
  assert.equal(authorView.includes('data-aiv-canvas-table-action="add-assessment"'), true);
  assert.equal(editorView.includes('data-aiv-network-node-path'), true);
  assert.equal(editorView.includes('data-aiv-network-segment-field'), true);
  assert.equal(editorView.includes('data-aiv-table-cell'), true);
  assert.equal(controller.includes('createAivUnifiedCanvasEditorController'), true);
  assert.equal(controller.includes('setLabelModePresentation'), true);
  assert.equal(qualification.includes('addAivUnifiedCanvasTableRow'), true);
  assert.equal((view.match(/data-aiv-canvas-label-mode=/gu) ?? []).length > 0, true);
  for (const mode of ['NORMAL', 'PROCESS', 'GEOMETRY', 'RESULTS', 'COMPLETENESS']) assert.equal(view.includes(mode), true);
});

test('unified controller keeps graph drag and label switching presentation-only', async () => {
  const controller = await read('tabs/vibration-aiv-unified-canvas-controller.js');
  assert.equal(controller.includes('moveAivFlareNetworkNodePresentation'), true);
  assert.equal(controller.includes('applyAivUnifiedNetworkAuthorAction'), true);
  assert.equal(controller.includes('applyAivUnifiedNetworkAuthorChange'), true);
  assert.equal(controller.includes('revealAivCanvasSelection'), true);
  assert.equal(controller.includes('activateAivCanvasDetailTab'), true);
  assert.equal(controller.includes('moveAivCanvasDetailTab'), true);
  assert.equal(controller.includes('focusAivCanvasField'), true);
  assert.equal(controller.includes('relationship.mode !== AIV_CANVAS_MODE.RELATIONSHIPS || isNetworkDriven(container)'), true);
  assert.equal(controller.includes('labelMode = setLabelModePresentation'), true);
  assert.equal(controller.includes('markAivEngineeringInputChanged'), false);
  assert.equal(controller.includes('createAivCanvasInteractionController'), false);
  assert.equal(controller.includes('createAivFlareNetworkAuthoringController'), false);
});

test('new unified production modules stay below 300 physical lines', async () => {
  for (const path of unifiedModules) {
    const source = await read(path);
    const lines = source.split(/\r?\n/u).length;
    assert(lines < 300, `${path} has ${lines} physical lines`);
  }
});

test('unified editor modules add no acoustic equation or pixel-distance authority', async () => {
  const sources = await Promise.all(unifiedModules.map(read));
  for (const source of sources) {
    assert.equal(source.includes('Math.log('), false);
    assert.equal(source.includes('Math.log10('), false);
    assert.equal(source.includes('svgPixelsAuthoritativeForDistance: true'), false);
    assert.equal(source.includes('physicalLength = dx'), false);
    assert.equal(source.includes('physicalLength = dy'), false);
  }
});
