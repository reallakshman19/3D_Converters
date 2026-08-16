import {
  createAivUnifiedNetworkNodeAt,
  createAivUnifiedNetworkSegmentBetween,
  deleteAivUnifiedNetworkSelection,
} from './vibration-aiv-unified-canvas-author.js';
import {
  AIV_UNIFIED_CANVAS_EDITOR_TOOL,
  advanceAivUnifiedCanvasSegmentConnection,
  aivUnifiedCanvasEditorInstruction,
  createAivUnifiedCanvasEditorState,
  setAivUnifiedCanvasEditorTool,
} from './vibration-aiv-unified-canvas-editor.js';
import { AIV_INPUT_MODE } from './vibration-aiv-engineering-revision.js';

function text(value) { return String(value ?? '').trim(); }
function card(container) { return container.querySelector('[data-aiv-unified-canvas]'); }
function svg(container) { return container.querySelector('[data-aiv-unified-canvas-svg]'); }
function editor(container) { return container.querySelector('[data-aiv-network-editor]'); }
function isNetworkDriven(container) { return card(container)?.dataset.aivInputMode === AIV_INPUT_MODE.NETWORK_DRIVEN; }
function canvasObject(event) { return event.target?.closest?.('[data-aiv-canvas-node],[data-aiv-canvas-segment],[data-aiv-canvas-relationship]') ?? null; }
function editingControl(event) { return Boolean(event.target?.closest?.('input,textarea,select,[contenteditable="true"]')); }
function pointFromEvent(canvas, event) {
  const rect = canvas.getBoundingClientRect(); const box = canvas.viewBox.baseVal;
  return { x: (event.clientX - rect.left) * box.width / rect.width, y: (event.clientY - rect.top) * box.height / rect.height };
}

export function createAivUnifiedCanvasEditorController(container, callbacks = {}) {
  let state = createAivUnifiedCanvasEditorState();
  const getNetwork = callbacks.getNetwork ?? (() => null);
  const getSelection = callbacks.getSelection ?? (() => null);
  const toCanvasPoint = callbacks.toCanvasPoint ?? ((event) => pointFromEvent(svg(container), event));

  function sync() {
    const status = container.querySelector('[data-aiv-canvas-editor-status]');
    if (status) status.textContent = aivUnifiedCanvasEditorInstruction(state);
    for (const button of container.querySelectorAll('[data-aiv-canvas-editor-tool]')) {
      const active = button.dataset.aivCanvasEditorTool === state.tool;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    }
  }
  function reset() { state = createAivUnifiedCanvasEditorState(); sync(); }
  function setTool(tool) { state = setAivUnifiedCanvasEditorTool(state, tool); sync(); }
  function commit(network) { callbacks.onNetworkChange?.(network); reset(); }
  function deleteSelected() {
    if (!isNetworkDriven(container)) return false;
    try {
      commit(deleteAivUnifiedNetworkSelection(getNetwork(), getSelection()?.selectionKey));
      callbacks.onSelectionChange?.(null);
    } catch (error) { callbacks.onError?.(error); }
    return true;
  }
  function placeNode(event) {
    const author = editor(container);
    if (!svg(container) || !author || canvasObject(event)) return false;
    try { commit(createAivUnifiedNetworkNodeAt(getNetwork(), author, toCanvasPoint(event))); }
    catch (error) { callbacks.onError?.(error); }
    return true;
  }
  function connectNode(event) {
    const node = event.target?.closest?.('[data-aiv-canvas-node]');
    if (!node) return false;
    try {
      const advanced = advanceAivUnifiedCanvasSegmentConnection(state, text(node.dataset.aivNetworkCanonicalId));
      state = advanced.state; sync();
      if (advanced.completed) {
        commit(createAivUnifiedNetworkSegmentBetween(
          getNetwork(), editor(container), advanced.completed.fromNodeId, advanced.completed.toNodeId,
        ));
      }
    } catch (error) { callbacks.onError?.(error); reset(); }
    return true;
  }
  function handleClick(event) {
    const tool = event.target?.closest?.('[data-aiv-canvas-editor-tool]')?.dataset.aivCanvasEditorTool;
    if (tool) { setTool(tool); return true; }
    const action = event.target?.closest?.('[data-aiv-canvas-editor-action]')?.dataset.aivCanvasEditorAction;
    if (action === 'cancel') { reset(); return true; }
    if (action === 'delete-selected') return deleteSelected();
    if (!isNetworkDriven(container) || !event.target?.closest?.('[data-aiv-unified-canvas-svg]')) return false;
    if (state.tool === AIV_UNIFIED_CANVAS_EDITOR_TOOL.PLACE_NODE) return placeNode(event);
    if (state.tool === AIV_UNIFIED_CANVAS_EDITOR_TOOL.CONNECT_SEGMENT) return connectNode(event);
    return false;
  }
  function handleKeyDown(event) {
    if (event.key === 'Escape' && state.tool !== AIV_UNIFIED_CANVAS_EDITOR_TOOL.SELECT) { reset(); return true; }
    if (editingControl(event)) return false;
    if (['Delete', 'Backspace'].includes(event.key) && isNetworkDriven(container)) return deleteSelected();
    return false;
  }

  return Object.freeze({
    sync, handleClick, handleKeyDown,
    isDirectEditActive: () => state.tool !== AIV_UNIFIED_CANVAS_EDITOR_TOOL.SELECT,
    destroy: reset,
  });
}
