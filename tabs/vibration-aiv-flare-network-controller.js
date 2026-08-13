import {
  addAivFlareNetworkNode,
  addAivFlareNetworkSegment,
  deleteAivFlareNetworkNode,
  deleteAivFlareNetworkSegment,
  setAivFlareNetworkSegmentLength,
} from '../converters/vibration/aiv/aiv-flare-network-mutations.js';

function value(editor, selector) { return String(editor.querySelector(selector)?.value ?? '').trim(); }

function defaultPosition(network) {
  const index = network.nodes.length;
  return { x: 110 + (index % 4) * 220, y: 100 + Math.floor(index / 4) * 130 };
}

function createNode(editor, network) {
  const canonicalId = value(editor, '[data-aiv-network-new-node-id]');
  const kind = value(editor, '[data-aiv-network-new-node-kind]');
  const caseId = value(editor, '[data-aiv-network-new-node-case]');
  const line = value(editor, '[data-aiv-network-new-node-line]');
  const tag = value(editor, '[data-aiv-network-new-node-tag]');
  return addAivFlareNetworkNode(network, {
    canonicalId, kind, line, tag, presentation: defaultPosition(network),
    ...(kind === 'SOURCE' ? { sourceInput: { caseId } } : {}),
    ...(kind === 'ASSESSMENT' ? { assessmentInput: {} } : {}),
  });
}

function createSegment(editor, network) {
  const segmentId = value(editor, '[data-aiv-network-new-segment-id]');
  const fromNodeId = value(editor, '[data-aiv-network-new-segment-from]');
  const toNodeId = value(editor, '[data-aiv-network-new-segment-to]');
  const length = value(editor, '[data-aiv-network-new-segment-length]');
  const unit = value(editor, '[data-aiv-network-new-segment-unit]') || 'm';
  const line = value(editor, '[data-aiv-network-new-segment-line]');
  return addAivFlareNetworkSegment(network, {
    segmentId, fromNodeId, toNodeId, line,
    physicalLength: length ? { value: Number(length), unit } : null,
  });
}

export function createAivFlareNetworkAuthoringController(container, callbacks = {}) {
  function apply(editor, mutator) {
    try {
      const current = callbacks.getNetwork?.();
      if (!current) return;
      callbacks.onNetworkChange?.(mutator(editor, current));
    } catch (error) {
      callbacks.onError?.(error);
    }
  }

  function click(event) {
    const editor = event.target.closest('[data-aiv-network-editor]');
    if (!editor) return;
    const action = event.target.closest('[data-aiv-network-action]')?.dataset.aivNetworkAction;
    if (action === 'add-node') { apply(editor, createNode); return; }
    if (action === 'add-segment') { apply(editor, createSegment); return; }
    const segmentId = event.target.closest('[data-aiv-network-delete-segment]')?.dataset.aivNetworkDeleteSegment;
    if (segmentId) { apply(editor, (_, network) => deleteAivFlareNetworkSegment(network, segmentId)); return; }
    const nodeId = event.target.closest('[data-aiv-network-delete-node]')?.dataset.aivNetworkDeleteNode;
    if (nodeId) apply(editor, (_, network) => deleteAivFlareNetworkNode(network, nodeId));
  }

  function change(event) {
    const editor = event.target.closest('[data-aiv-network-editor]');
    if (!editor) return;
    const segmentId = event.target.dataset.aivNetworkSegmentLength || event.target.dataset.aivNetworkSegmentUnit;
    if (!segmentId) return;
    const lengthInput = editor.querySelector(`[data-aiv-network-segment-length="${CSS.escape(segmentId)}"]`);
    const unitInput = editor.querySelector(`[data-aiv-network-segment-unit="${CSS.escape(segmentId)}"]`);
    const length = String(lengthInput?.value ?? '').trim();
    const unit = String(unitInput?.value ?? 'm').trim();
    apply(editor, (_, network) => setAivFlareNetworkSegmentLength(network, segmentId, length ? Number(length) : null, unit));
  }

  container.addEventListener('click', click);
  container.addEventListener('change', change);
  return Object.freeze({ destroy() { container.removeEventListener('click', click); container.removeEventListener('change', change); } });
}
