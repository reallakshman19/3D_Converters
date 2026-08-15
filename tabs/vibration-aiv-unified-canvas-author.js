import {
  addAivFlareNetworkNode,
  addAivFlareNetworkSegment,
  deleteAivFlareNetworkNode,
  deleteAivFlareNetworkSegment,
  setAivFlareNetworkSegmentLength,
  updateAivFlareNetworkNode,
} from '../converters/vibration/aiv/aiv-flare-network-mutations.js';

function text(value) { return String(value ?? '').trim(); }
function value(editor, selector) { return text(editor?.querySelector(selector)?.value); }

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
  const sourceDeviceType = value(editor, '[data-aiv-network-new-source-device]');
  const assessmentType = value(editor, '[data-aiv-network-new-assessment-type]');
  return addAivFlareNetworkNode(network, {
    canonicalId, kind, line, tag, presentation: defaultPosition(network),
    ...(kind === 'SOURCE' ? { sourceInput: { caseId, ...(sourceDeviceType ? { sourceDeviceType } : {}) } } : {}),
    ...(kind === 'ASSESSMENT' ? { assessmentInput: assessmentType ? { assessmentType } : {} } : {}),
  });
}

function createSegment(editor, network) {
  const length = value(editor, '[data-aiv-network-new-segment-length]');
  return addAivFlareNetworkSegment(network, {
    segmentId: value(editor, '[data-aiv-network-new-segment-id]'),
    fromNodeId: value(editor, '[data-aiv-network-new-segment-from]'),
    toNodeId: value(editor, '[data-aiv-network-new-segment-to]'),
    line: value(editor, '[data-aiv-network-new-segment-line]'),
    physicalLength: length ? {
      value: Number(length),
      unit: value(editor, '[data-aiv-network-new-segment-unit]') || 'm',
    } : null,
  });
}

function updateNode(network, target) {
  const nodeId = text(target.dataset.aivNetworkNodeId);
  const field = text(target.dataset.aivNetworkNodeField);
  const node = network.nodes.find((item) => item.canonicalId === nodeId);
  if (!node) throw new RangeError(`Unknown AIV flare-network node ${nodeId}.`);
  const next = text(target.value);
  if (field === 'tag' || field === 'line') return updateAivFlareNetworkNode(network, nodeId, { [field]: next });
  if (field === 'caseId' || field === 'sourceDeviceType') {
    return updateAivFlareNetworkNode(network, nodeId, { sourceInput: { ...(node.sourceInput ?? {}), [field]: next } });
  }
  if (field === 'assessmentType') {
    return updateAivFlareNetworkNode(network, nodeId, { assessmentInput: { ...(node.assessmentInput ?? {}), assessmentType: next } });
  }
  throw new RangeError(`Unsupported AIV flare-network node field ${field}.`);
}

export function applyAivUnifiedNetworkAuthorAction(network, editor, target) {
  const action = target?.closest?.('[data-aiv-network-action]')?.dataset.aivNetworkAction;
  if (action === 'add-node') return Object.freeze({ handled: true, network: createNode(editor, network) });
  if (action === 'add-segment') return Object.freeze({ handled: true, network: createSegment(editor, network) });
  const segmentId = target?.closest?.('[data-aiv-network-delete-segment]')?.dataset.aivNetworkDeleteSegment;
  if (segmentId) return Object.freeze({ handled: true, network: deleteAivFlareNetworkSegment(network, segmentId) });
  const nodeId = target?.closest?.('[data-aiv-network-delete-node]')?.dataset.aivNetworkDeleteNode;
  if (nodeId) return Object.freeze({ handled: true, network: deleteAivFlareNetworkNode(network, nodeId) });
  return Object.freeze({ handled: false, network });
}

export function applyAivUnifiedNetworkAuthorChange(network, editor, target) {
  if (target?.dataset?.aivNetworkNodeField) {
    return Object.freeze({ handled: true, network: updateNode(network, target) });
  }
  const segmentId = target?.dataset?.aivNetworkSegmentLength || target?.dataset?.aivNetworkSegmentUnit;
  if (!segmentId) return Object.freeze({ handled: false, network });
  const length = value(editor, `[data-aiv-network-segment-length="${CSS.escape(segmentId)}"]`);
  const unit = value(editor, `[data-aiv-network-segment-unit="${CSS.escape(segmentId)}"]`) || 'm';
  return Object.freeze({
    handled: true,
    network: setAivFlareNetworkSegmentLength(network, segmentId, length ? Number(length) : null, unit),
  });
}
