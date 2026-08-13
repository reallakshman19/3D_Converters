import { AIV_FLARE_NETWORK_SCHEMA, createAivFlareNetwork } from '../converters/vibration/aiv/aiv-flare-network.js';

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}
function network(value) { return value?.schema === AIV_FLARE_NETWORK_SCHEMA ? value : createAivFlareNetwork(value); }

function nodeShape(node) {
  if (node.kind === 'SOURCE') return '<path d="M-22 -18 L18 -18 L28 0 L18 18 L-22 18 Z"></path>';
  if (node.kind === 'ASSESSMENT') return '<path d="M-22 0 L0 -22 L22 0 L0 22 Z"></path>';
  if (node.kind === 'BOUNDARY') return '<rect x="-24" y="-20" width="48" height="40" rx="4"></rect>';
  if (node.kind === 'OFF_PAGE') return '<path d="M-25 -16 L10 -16 L25 0 L10 16 L-25 16 Z"></path>';
  return '<circle cx="0" cy="0" r="14"></circle>';
}

function segmentLabel(segment) {
  return segment.physicalLength
    ? `${segment.physicalLength.value} ${segment.physicalLength.unit}`
    : 'length unresolved';
}

function segmentHtml(segment, positions) {
  const from = positions.get(segment.fromNodeId);
  const to = positions.get(segment.toNodeId);
  if (!from || !to) return '';
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const unresolved = segment.physicalLength ? '' : ' is-unresolved';
  return `<g class="aiv-network-segment${unresolved}" data-aiv-network-segment="${esc(segment.segmentId)}" data-aiv-network-from="${esc(segment.fromNodeId)}" data-aiv-network-to="${esc(segment.toNodeId)}" data-aiv-engineering-length="${esc(segment.physicalLength?.value ?? '')}" data-aiv-engineering-length-unit="${esc(segment.physicalLength?.unit ?? '')}" tabindex="0" role="button" aria-label="Pipe segment ${esc(segment.segmentId)} ${esc(segmentLabel(segment))}">
    <line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}"></line>
    <text x="${mx}" y="${my - 7}" text-anchor="middle">${esc(segment.segmentId)} · ${esc(segmentLabel(segment))}</text>
  </g>`;
}

function nodeHtml(node) {
  const position = node.presentation;
  return `<g class="aiv-network-node is-${esc(node.kind.toLowerCase())}" transform="translate(${position.x} ${position.y})" data-aiv-network-node="${esc(node.canonicalId)}" data-aiv-network-node-kind="${esc(node.kind)}" data-aiv-network-x="${position.x}" data-aiv-network-y="${position.y}" tabindex="0" role="button" aria-label="${esc(node.kind)} ${esc(node.tag)}">
    ${nodeShape(node)}<text class="aiv-network-node-title" x="0" y="36" text-anchor="middle">${esc(node.tag)}</text>
    <text class="aiv-network-node-subtitle" x="0" y="49" text-anchor="middle">${esc(node.canonicalId)}</text>
  </g>`;
}

export function renderAivFlareNetworkSvg(networkInput, { width = 900, height = 520 } = {}) {
  const value = network(networkInput);
  const positions = new Map(value.nodes.map((node) => [node.canonicalId, node.presentation]));
  const segments = value.segments.map((segment) => segmentHtml(segment, positions)).join('');
  const nodes = value.nodes.map(nodeHtml).join('');
  return `<svg class="aiv-flare-network-svg" data-aiv-flare-network-svg="true" data-aiv-network-id="${esc(value.networkId)}" data-aiv-network-revision="${esc(value.revision)}" viewBox="0 0 ${Number(width)} ${Number(height)}" role="img" aria-label="AIV flare network ${esc(value.networkId)}">
    <style>
      .aiv-flare-network-svg{width:100%;min-height:360px;background:#08111f}.aiv-network-segment line{stroke:#64748b;stroke-width:4}.aiv-network-segment text{fill:#cbd5e1;font-size:10px}.aiv-network-segment.is-unresolved line{stroke:#f59e0b;stroke-dasharray:8 6}.aiv-network-node{fill:#0f172a;stroke:#7dd3fc;stroke-width:2;cursor:move}.aiv-network-node.is-assessment{stroke:#c4b5fd}.aiv-network-node.is-boundary,.aiv-network-node.is-off_page{stroke:#94a3b8}.aiv-network-node-title{fill:#e5e7eb;font-size:11px;font-weight:700;stroke:none}.aiv-network-node-subtitle{fill:#94a3b8;font-size:9px;stroke:none}.aiv-network-node:focus,.aiv-network-segment:focus{outline:none;filter:drop-shadow(0 0 4px #38bdf8)}
    </style>
    <g class="aiv-network-segments">${segments}</g><g class="aiv-network-nodes">${nodes}</g>
  </svg>`;
}
