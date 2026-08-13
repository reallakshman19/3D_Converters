import {
  createAivCanvasLayout,
  moveAivCanvasLayoutNode,
} from '../converters/vibration/aiv/aiv-canvas-layout-contract.js';

export const AIV_CANVAS_ZOOM_MIN = 0.4;
export const AIV_CANVAS_ZOOM_MAX = 2.5;
const ZOOM_STEP = 1.2;

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function viewport(value = {}) {
  return Object.freeze({
    x: finite(value.x),
    y: finite(value.y),
    zoom: clamp(finite(value.zoom, 1), AIV_CANVAS_ZOOM_MIN, AIV_CANVAS_ZOOM_MAX),
  });
}

export function panAivCanvasViewport(current, dx, dy) {
  const value = viewport(current);
  return Object.freeze({ ...value, x: value.x + finite(dx), y: value.y + finite(dy) });
}

export function zoomAivCanvasViewport(current, factor) {
  const value = viewport(current);
  const next = value.zoom * finite(factor, 1);
  return Object.freeze({ ...value, zoom: clamp(next, AIV_CANVAS_ZOOM_MIN, AIV_CANVAS_ZOOM_MAX) });
}

export function reconcileAivCanvasPresentationLayout(freshInput, persistedInput = null) {
  const fresh = createAivCanvasLayout(freshInput);
  if (!persistedInput) return fresh;
  const persisted = createAivCanvasLayout(persistedInput);
  const prior = new Map(persisted.nodes.map((node) => [node.nodeKey, node]));
  return createAivCanvasLayout({
    viewport: persisted.viewport,
    nodes: fresh.nodes.map((node) => {
      const retained = prior.get(node.nodeKey);
      return retained ? { ...node, x: retained.x, y: retained.y, collapsed: retained.collapsed } : node;
    }),
  });
}

function nodeFromElement(element, displayOrder) {
  return {
    nodeKey: element.dataset.aivCanvasNode,
    canonicalId: element.dataset.aivCanvasCanonicalId,
    caseId: element.dataset.aivCanvasCaseId || null,
    nodeKind: element.dataset.aivCanvasNodeKind || null,
    x: finite(element.dataset.aivCanvasX),
    y: finite(element.dataset.aivCanvasY),
    displayOrder,
    collapsed: false,
  };
}

function layoutFromSvg(svg) {
  const nodes = [...svg.querySelectorAll('[data-aiv-canvas-node]')]
    .map((element, index) => nodeFromElement(element, index));
  return createAivCanvasLayout({
    nodes,
    viewport: {
      x: finite(svg.dataset.aivCanvasViewportX),
      y: finite(svg.dataset.aivCanvasViewportY),
      zoom: finite(svg.dataset.aivCanvasViewportZoom, 1),
    },
  });
}

function elementMap(svg) {
  return new Map([...svg.querySelectorAll('[data-aiv-canvas-node]')]
    .map((element) => [element.dataset.aivCanvasNode, element]));
}

function redrawRelationships(svg, layout) {
  const positions = new Map(layout.nodes.map((node) => [node.nodeKey, node]));
  for (const group of svg.querySelectorAll('[data-aiv-canvas-relationship]')) {
    const source = positions.get(group.dataset.aivCanvasSourceNode);
    const assessment = positions.get(group.dataset.aivCanvasAssessmentNode);
    if (!source || !assessment) continue;
    const line = group.querySelector('line');
    const label = group.querySelector('text');
    line?.setAttribute('x1', String(source.x + 30));
    line?.setAttribute('y1', String(source.y));
    line?.setAttribute('x2', String(assessment.x - 30));
    line?.setAttribute('y2', String(assessment.y));
    label?.setAttribute('x', String((source.x + assessment.x) / 2));
    label?.setAttribute('y', String((source.y + assessment.y) / 2 - 8));
  }
}

function applyLayout(svg, layout) {
  const value = layout.viewport;
  svg.querySelector('[data-aiv-canvas-scene]')
    ?.setAttribute('transform', `translate(${value.x} ${value.y}) scale(${value.zoom})`);
  svg.dataset.aivCanvasViewportX = String(value.x);
  svg.dataset.aivCanvasViewportY = String(value.y);
  svg.dataset.aivCanvasViewportZoom = String(value.zoom);
  const elements = elementMap(svg);
  for (const node of layout.nodes) {
    const element = elements.get(node.nodeKey);
    if (!element) continue;
    element.dataset.aivCanvasX = String(node.x);
    element.dataset.aivCanvasY = String(node.y);
    element.setAttribute('transform', `translate(${node.x} ${node.y})`);
  }
  redrawRelationships(svg, layout);
}

function svgDelta(svg, clientDx, clientDy, zoom = 1) {
  const rect = svg.getBoundingClientRect?.();
  const viewBox = svg.viewBox?.baseVal;
  if (!rect || !viewBox || !(rect.width > 0) || !(rect.height > 0)) {
    return { x: clientDx / zoom, y: clientDy / zoom };
  }
  return {
    x: clientDx * (viewBox.width / rect.width) / zoom,
    y: clientDy * (viewBox.height / rect.height) / zoom,
  };
}

function setSelection(runtime, target) {
  for (const item of runtime.container.querySelectorAll('[data-aiv-canvas-node],[data-aiv-canvas-relationship]')) {
    const selected = item === target;
    item.classList.toggle('is-selected', selected);
    item.setAttribute('aria-selected', selected ? 'true' : 'false');
  }
  runtime.selectedKind = target.hasAttribute('data-aiv-canvas-node') ? 'node' : 'relationship';
  runtime.selectedKey = runtime.selectedKind === 'node'
    ? target.dataset.aivCanvasNode
    : target.dataset.aivCanvasRelationship;
}

function canvasTarget(event) {
  return event.target?.closest?.('[data-aiv-canvas-node],[data-aiv-canvas-relationship]') ?? null;
}

function restoreSelection(runtime, svg) {
  if (!runtime.selectedKey) return;
  const attribute = runtime.selectedKind === 'node' ? 'aivCanvasNode' : 'aivCanvasRelationship';
  const selector = runtime.selectedKind === 'node' ? '[data-aiv-canvas-node]' : '[data-aiv-canvas-relationship]';
  const selected = [...svg.querySelectorAll(selector)]
    .find((item) => item.dataset[attribute] === runtime.selectedKey);
  if (selected) setSelection(runtime, selected);
}

function syncRuntime(runtime) {
  const svg = runtime.container.querySelector('[data-aiv-canvas-svg]');
  if (!svg) return;
  runtime.layout = reconcileAivCanvasPresentationLayout(layoutFromSvg(svg), runtime.layout);
  applyLayout(svg, runtime.layout);
  restoreSelection(runtime, svg);
}

function startPointer(runtime, event) {
  const svg = event.target?.closest?.('[data-aiv-canvas-svg]');
  if (!svg || event.target?.closest?.('[data-aiv-canvas-action]')) return;
  const target = canvasTarget(event);
  if (target) setSelection(runtime, target);
  if (target?.hasAttribute('data-aiv-canvas-relationship')) return;
  const nodeKey = target?.dataset?.aivCanvasNode ?? null;
  const node = nodeKey ? runtime.layout?.nodes.find((item) => item.nodeKey === nodeKey) : null;
  runtime.pointer = {
    type: node ? 'NODE' : 'PAN', pointerId: event.pointerId,
    startClientX: event.clientX, startClientY: event.clientY, nodeKey,
    startX: node?.x ?? runtime.layout?.viewport.x ?? 0,
    startY: node?.y ?? runtime.layout?.viewport.y ?? 0,
  };
  svg.setPointerCapture?.(event.pointerId);
  event.preventDefault?.();
}

function movePointer(runtime, event) {
  const active = runtime.pointer;
  if (!active || event.pointerId !== active.pointerId || !runtime.layout) return;
  const svg = runtime.container.querySelector('[data-aiv-canvas-svg]');
  if (!svg) return;
  const dx = event.clientX - active.startClientX;
  const dy = event.clientY - active.startClientY;
  if (active.type === 'NODE') {
    const delta = svgDelta(svg, dx, dy, runtime.layout.viewport.zoom);
    runtime.layout = moveAivCanvasLayoutNode(runtime.layout, active.nodeKey, active.startX + delta.x, active.startY + delta.y);
  } else {
    const delta = svgDelta(svg, dx, dy, 1);
    runtime.layout = createAivCanvasLayout({
      nodes: runtime.layout.nodes,
      viewport: panAivCanvasViewport(
        { ...runtime.layout.viewport, x: active.startX, y: active.startY },
        delta.x,
        delta.y,
      ),
    });
  }
  applyLayout(svg, runtime.layout);
  event.preventDefault?.();
}

function endPointer(runtime, event) {
  if (!runtime.pointer || event.pointerId !== runtime.pointer.pointerId) return;
  runtime.container.querySelector('[data-aiv-canvas-svg]')?.releasePointerCapture?.(event.pointerId);
  runtime.pointer = null;
}

function wheel(runtime, event) {
  const svg = event.target?.closest?.('[data-aiv-canvas-svg]');
  if (!svg || !runtime.layout) return;
  const factor = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
  runtime.layout = createAivCanvasLayout({
    nodes: runtime.layout.nodes,
    viewport: zoomAivCanvasViewport(runtime.layout.viewport, factor),
  });
  applyLayout(svg, runtime.layout);
  event.preventDefault();
}

function click(runtime, event) {
  const action = event.target?.closest?.('[data-aiv-canvas-action]')?.dataset.aivCanvasAction;
  if (!action || !runtime.layout) return;
  const svg = runtime.container.querySelector('[data-aiv-canvas-svg]');
  if (!svg) return;
  let next = viewport({ x: 0, y: 0, zoom: 1 });
  if (action === 'zoom-in') next = zoomAivCanvasViewport(runtime.layout.viewport, ZOOM_STEP);
  if (action === 'zoom-out') next = zoomAivCanvasViewport(runtime.layout.viewport, 1 / ZOOM_STEP);
  runtime.layout = createAivCanvasLayout({ nodes: runtime.layout.nodes, viewport: next });
  applyLayout(svg, runtime.layout);
}

function keydown(runtime, event) {
  if (!['Enter', ' '].includes(event.key)) return;
  const target = canvasTarget(event);
  if (!target) return;
  setSelection(runtime, target);
  event.preventDefault();
}

export function createAivCanvasInteractionController(container) {
  const runtime = { container, layout: null, pointer: null, selectedKey: null, selectedKind: null };
  const handlers = {
    pointerdown: (event) => startPointer(runtime, event),
    pointermove: (event) => movePointer(runtime, event),
    pointerup: (event) => endPointer(runtime, event),
    pointercancel: (event) => endPointer(runtime, event),
    wheel: (event) => wheel(runtime, event),
    click: (event) => click(runtime, event),
    keydown: (event) => keydown(runtime, event),
  };
  for (const [type, handler] of Object.entries(handlers)) {
    container.addEventListener(type, handler, type === 'wheel' ? { passive: false } : undefined);
  }
  return Object.freeze({
    sync: () => syncRuntime(runtime),
    getLayout: () => runtime.layout,
    destroy: () => {
      for (const [type, handler] of Object.entries(handlers)) container.removeEventListener(type, handler);
      runtime.pointer = null;
      runtime.layout = null;
    },
  });
}
