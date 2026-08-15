import {
  createAivCanvasLayout,
  moveAivCanvasLayoutNode,
} from '../converters/vibration/aiv/aiv-canvas-layout-contract.js';
import { moveAivFlareNetworkNodePresentation } from '../converters/vibration/aiv/aiv-flare-network.js';
import { createAivCanvasFilterController } from './vibration-aiv-canvas-filter.js';
import {
  AIV_CANVAS_MODE,
  advanceAivCanvasRelationshipState,
  aivCanvasRelationshipEndpoint,
  aivCanvasRelationshipIdentityFromElement,
  createAivCanvasRelationshipState,
  setAivCanvasRelationshipMode,
} from './vibration-aiv-canvas-relationship.js';
import {
  aivCanvasSelectionFromElement,
  applyAivCanvasSelection,
} from './vibration-aiv-canvas-selection.js';
import {
  applyAivUnifiedNetworkAuthorAction,
  applyAivUnifiedNetworkAuthorChange,
} from './vibration-aiv-unified-canvas-author.js';
import { AIV_INPUT_MODE } from './vibration-aiv-engineering-revision.js';

function text(value) { return String(value ?? '').trim(); }
function number(value) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function card(container) { return container.querySelector('[data-aiv-unified-canvas]'); }
function svg(container) { return container.querySelector('[data-aiv-unified-canvas-svg]'); }
function viewport(container) { return container.querySelector('[data-aiv-canvas-viewport]'); }
function inputMode(container) { return card(container)?.dataset.aivInputMode ?? AIV_INPUT_MODE.TABLE_DRIVEN; }
function isNetworkDriven(container) { return inputMode(container) === AIV_INPUT_MODE.NETWORK_DRIVEN; }

function domNodes(container) {
  return [...container.querySelectorAll('[data-aiv-unified-canvas-svg] [data-aiv-canvas-node]')].map((element, displayOrder) => ({
    nodeKey: text(element.dataset.aivCanvasNode),
    canonicalId: text(element.dataset.aivCanvasCanonicalId),
    caseId: text(element.dataset.aivCanvasCaseId) || null,
    nodeKind: text(element.dataset.aivCanvasNodeKind) || null,
    x: number(element.dataset.aivCanvasX),
    y: number(element.dataset.aivCanvasY),
    displayOrder,
  }));
}

function reconcileLayout(container, previous) {
  const incoming = domNodes(container);
  const existing = new Map((previous?.nodes ?? []).map((node) => [node.nodeKey, node]));
  const networkDriven = isNetworkDriven(container);
  return createAivCanvasLayout({
    viewport: previous?.viewport,
    nodes: incoming.map((node) => networkDriven ? node : ({ ...node, ...(existing.get(node.nodeKey) ?? {}) })),
  });
}

function positions(layout) { return new Map(layout.nodes.map((node) => [node.nodeKey, node])); }
function canonicalPositions(container, layout) {
  const byKey = positions(layout);
  return new Map([...container.querySelectorAll('[data-aiv-unified-canvas-svg] [data-aiv-network-canonical-id]')]
    .map((element) => [text(element.dataset.aivNetworkCanonicalId), byKey.get(text(element.dataset.aivCanvasNode))]));
}
function setLine(line, from, to) {
  if (!line || !from || !to) return;
  line.setAttribute('x1', from.x); line.setAttribute('y1', from.y);
  line.setAttribute('x2', to.x); line.setAttribute('y2', to.y);
}
function redraw(container, layout) {
  const byKey = positions(layout);
  const byCanonical = canonicalPositions(container, layout);
  for (const element of container.querySelectorAll('[data-aiv-unified-canvas-svg] [data-aiv-canvas-node]')) {
    const point = byKey.get(text(element.dataset.aivCanvasNode));
    if (!point) continue;
    element.setAttribute('transform', `translate(${point.x} ${point.y})`);
    element.dataset.aivCanvasX = point.x; element.dataset.aivCanvasY = point.y;
  }
  for (const segment of container.querySelectorAll('[data-aiv-unified-canvas-svg] [data-aiv-network-segment]')) {
    const from = byCanonical.get(text(segment.dataset.aivNetworkFrom)); const to = byCanonical.get(text(segment.dataset.aivNetworkTo));
    setLine(segment.querySelector('line'), from, to);
    const label = segment.querySelector('text');
    if (label && from && to) { label.setAttribute('x', (from.x + to.x) / 2); label.setAttribute('y', (from.y + to.y) / 2 - 7); }
  }
  for (const line of container.querySelectorAll('[data-aiv-unified-canvas-svg] [data-aiv-path-from]')) {
    setLine(line, byCanonical.get(text(line.dataset.aivPathFrom)), byCanonical.get(text(line.dataset.aivPathTo)));
  }
  for (const relation of container.querySelectorAll('[data-aiv-unified-canvas-svg] [data-aiv-logical-only]')) {
    const from = byKey.get(text(relation.dataset.aivCanvasSourceNode)); const to = byKey.get(text(relation.dataset.aivCanvasAssessmentNode));
    setLine(relation.querySelector('line'), from, to);
    const label = relation.querySelector('text');
    if (label && from && to) { label.setAttribute('x', (from.x + to.x) / 2); label.setAttribute('y', (from.y + to.y) / 2 - 8); }
  }
  const group = viewport(container);
  if (group) group.setAttribute('transform', `translate(${layout.viewport.x} ${layout.viewport.y}) scale(${layout.viewport.zoom})`);
}

function svgPoint(svgElement, event) {
  const rect = svgElement.getBoundingClientRect(); const box = svgElement.viewBox.baseVal;
  return { x: (event.clientX - rect.left) * box.width / rect.width, y: (event.clientY - rect.top) * box.height / rect.height };
}
function setModeButtons(container, mode) {
  for (const button of container.querySelectorAll('[data-aiv-canvas-mode]')) button.classList.toggle('is-active', button.dataset.aivCanvasMode === mode);
}

export function createAivUnifiedCanvasController(container, {
  getNetwork = () => null,
  onNetworkChange = () => {},
  onPresentationChange = () => {},
  onCreateRelationship = () => false,
  onDeleteRelationship = () => false,
  onSelectionChange = () => {},
  onError = () => {},
} = {}) {
  let layout = null;
  let relationship = createAivCanvasRelationshipState({ mode: AIV_CANVAS_MODE.NAVIGATE });
  let gesture = null;
  const filter = createAivCanvasFilterController(container, { onSelectionFiltered: () => select(null) });

  function select(selection) {
    applyAivCanvasSelection(container, selection);
    onSelectionChange(selection);
  }
  function sync() {
    if (!svg(container)) return;
    layout = reconcileLayout(container, layout);
    redraw(container, layout);
    filter.sync();
    setModeButtons(container, relationship.mode);
  }
  function updateViewport(next) {
    layout = createAivCanvasLayout({ nodes: layout.nodes, viewport: next });
    redraw(container, layout);
  }
  function action(event) {
    const author = event.target.closest('[data-aiv-network-editor]');
    if (author) {
      try {
        const result = applyAivUnifiedNetworkAuthorAction(getNetwork(), author, event.target);
        if (result.handled) onNetworkChange(result.network);
      } catch (error) { onError(error); }
      return;
    }
    const mode = event.target.closest('[data-aiv-canvas-mode]')?.dataset.aivCanvasMode;
    if (mode) {
      relationship = setAivCanvasRelationshipMode(relationship, mode);
      setModeButtons(container, relationship.mode);
      return;
    }
    const command = event.target.closest('[data-aiv-canvas-action]')?.dataset.aivCanvasAction;
    if (!command || !layout) return;
    if (command === 'zoom-in') updateViewport({ ...layout.viewport, zoom: Math.min(3, layout.viewport.zoom * 1.2) });
    if (command === 'zoom-out') updateViewport({ ...layout.viewport, zoom: Math.max(0.35, layout.viewport.zoom / 1.2) });
    if (command === 'reset-view') updateViewport({ x: 0, y: 0, zoom: 1 });
  }
  function change(event) {
    const author = event.target.closest('[data-aiv-network-editor]');
    if (!author) return;
    try {
      const result = applyAivUnifiedNetworkAuthorChange(getNetwork(), author, event.target);
      if (result.handled) onNetworkChange(result.network);
    } catch (error) { onError(error); }
  }
  function pointerDown(event) {
    const canvas = svg(container); if (!canvas || !layout || event.button !== 0) return;
    const node = event.target.closest('[data-aiv-canvas-node]'); const start = svgPoint(canvas, event);
    if (node) {
      const key = text(node.dataset.aivCanvasNode); const current = positions(layout).get(key); if (!current) return;
      gesture = { kind: 'NODE', pointerId: event.pointerId, key, start, x: current.x, y: current.y, canonicalId: text(node.dataset.aivNetworkCanonicalId) || null, moved: false };
    } else gesture = { kind: 'PAN', pointerId: event.pointerId, start, x: layout.viewport.x, y: layout.viewport.y, moved: false };
    canvas.setPointerCapture?.(event.pointerId);
  }
  function pointerMove(event) {
    const canvas = svg(container); if (!gesture || !canvas || gesture.pointerId !== event.pointerId) return;
    const point = svgPoint(canvas, event); const dx = point.x - gesture.start.x; const dy = point.y - gesture.start.y;
    gesture.moved ||= Math.abs(dx) + Math.abs(dy) > 2;
    if (gesture.kind === 'PAN') updateViewport({ ...layout.viewport, x: gesture.x + dx, y: gesture.y + dy });
    else {
      layout = moveAivCanvasLayoutNode(layout, gesture.key, gesture.x + dx / layout.viewport.zoom, gesture.y + dy / layout.viewport.zoom);
      redraw(container, layout);
    }
  }
  function pointerUp(event) {
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const finished = gesture; gesture = null;
    if (finished.kind === 'NODE' && finished.moved && finished.canonicalId && isNetworkDriven(container)) {
      const point = positions(layout).get(finished.key);
      try { onPresentationChange(moveAivFlareNetworkNodePresentation(getNetwork(), finished.canonicalId, point.x, point.y)); }
      catch (error) { onError(error); }
    }
  }
  function canvasClick(event) {
    if (gesture?.moved) return;
    const element = event.target.closest('[data-aiv-canvas-node],[data-aiv-canvas-relationship]');
    if (!element) return;
    const selection = aivCanvasSelectionFromElement(element); select(selection);
    if (relationship.mode !== AIV_CANVAS_MODE.RELATIONSHIPS || isNetworkDriven(container)) return;
    const advanced = advanceAivCanvasRelationshipState(relationship, aivCanvasRelationshipEndpoint(element));
    relationship = advanced.state;
    if (advanced.createRequest && onCreateRelationship(advanced.createRequest)) select({ selectionKey: `REL:${advanced.createRequest.sourceCanonicalId}:${advanced.createRequest.assessmentCanonicalId}:${advanced.createRequest.caseId}` });
  }
  function keyDown(event) {
    if (!['Delete', 'Backspace'].includes(event.key) || isNetworkDriven(container)) return;
    const selected = container.querySelector('[data-aiv-canvas-relationship].is-selected');
    const identity = aivCanvasRelationshipIdentityFromElement(selected);
    if (identity && onDeleteRelationship(identity)) { event.preventDefault(); select(null); }
  }

  container.addEventListener('click', action);
  container.addEventListener('click', canvasClick);
  container.addEventListener('change', change);
  container.addEventListener('pointerdown', pointerDown);
  container.addEventListener('pointermove', pointerMove);
  container.addEventListener('pointerup', pointerUp);
  container.addEventListener('pointercancel', pointerUp);
  container.addEventListener('keydown', keyDown);

  return Object.freeze({
    sync,
    getLayout: () => layout,
    destroy() {
      filter.destroy();
      container.removeEventListener('click', action); container.removeEventListener('click', canvasClick);
      container.removeEventListener('change', change); container.removeEventListener('pointerdown', pointerDown);
      container.removeEventListener('pointermove', pointerMove); container.removeEventListener('pointerup', pointerUp);
      container.removeEventListener('pointercancel', pointerUp); container.removeEventListener('keydown', keyDown);
    },
  });
}
