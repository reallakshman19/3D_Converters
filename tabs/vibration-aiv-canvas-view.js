import { buildDeterministicAivCanvasLayout } from '../converters/vibration/aiv/aiv-canvas-layout-contract.js';
import { buildAivCanvasProjection } from '../converters/vibration/aiv/aiv-canvas-projection.js';

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function canvasStyle() {
  return `<style>
    .aiv-canvas-card{overflow:hidden}.aiv-canvas-badges{display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end}.aiv-canvas-badge{border:1px solid #334155;border-radius:999px;padding:3px 7px;color:#cbd5e1;font-size:10px}.aiv-canvas-badge.authority{border-color:#0369a1;color:#7dd3fc}.aiv-canvas-frame{overflow:auto;border:1px solid #1e293b;border-radius:8px;background:#08111f}.aiv-canvas-svg{display:block;width:100%;min-width:720px;min-height:260px}.aiv-canvas-node-shape{fill:#0f172a;stroke:#7dd3fc;stroke-width:2}.aiv-canvas-node.is-assessment .aiv-canvas-node-shape{stroke:#c4b5fd}.aiv-canvas-node.is-path .aiv-canvas-node-shape,.aiv-canvas-node.is-boundary .aiv-canvas-node-shape{stroke:#94a3b8}.aiv-canvas-node-detail{fill:none;stroke:#e2e8f0;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.aiv-canvas-node-title{fill:#e5e7eb;font-size:11px;font-weight:700}.aiv-canvas-node-subtitle,.aiv-canvas-node-result{fill:#94a3b8;font-size:9px}.aiv-canvas-relationship line{stroke:#38bdf8;stroke-width:2}.aiv-canvas-relationship text{fill:#cbd5e1;font-size:9px}.aiv-canvas-relationship.is-inactive line{stroke:#64748b;stroke-dasharray:6 5}.aiv-canvas-svg marker path{fill:#38bdf8}.aiv-canvas-empty{padding:22px;border:1px dashed #334155;border-radius:8px;color:#94a3b8;text-align:center}.aiv-canvas-line-summary{display:flex;flex-direction:column;gap:3px;margin-top:8px;padding:8px;border:1px solid #7c2d12;border-radius:6px;color:#fdba74}.aiv-canvas-line-summary span{font-size:10px;color:#94a3b8}
  </style>`;
}

function topology(state) {
  if (state.readinessEnvelope?.exchange) return state.readinessEnvelope.exchange;
  if (state.topologyInput?.format === 'PARSED_EXCHANGE') return state.topologyInput.data;
  return null;
}

function canvasProjection(state) {
  return buildAivCanvasProjection({
    tables: state.tables,
    assumptionResolution: state.assumptionResolution,
    readinessEnvelope: state.readinessEnvelope,
    screeningResult: state.screeningResult,
    topology: topology(state),
  });
}

function badge(text, kind = '') {
  return text ? `<span class="aiv-canvas-badge ${esc(kind)}">${esc(text)}</span>` : '';
}

function sourceGlyph() {
  return '<circle r="24" class="aiv-canvas-node-shape"></circle><path d="M-11 0 L0 -10 L11 0 L0 10 Z" class="aiv-canvas-node-detail"></path>';
}

function assessmentGlyph() {
  return '<rect x="-22" y="-22" width="44" height="44" rx="6" class="aiv-canvas-node-shape"></rect><path d="M-12 0 H12 M0 -12 V12" class="aiv-canvas-node-detail"></path>';
}

function pathGlyph(boundary) {
  return boundary
    ? '<rect x="-27" y="-20" width="54" height="40" rx="12" class="aiv-canvas-node-shape"></rect>'
    : '<rect x="-24" y="-9" width="48" height="18" rx="9" class="aiv-canvas-node-shape"></rect>';
}

function nodeGlyph(node) {
  if (node.nodeKind === 'SOURCE') return sourceGlyph();
  if (node.nodeKind === 'ASSESSMENT') return assessmentGlyph();
  return pathGlyph(node.nodeKind === 'BOUNDARY');
}

function resultText(node) {
  const summary = node.resultSummary;
  if (!summary) return '';
  if (summary.caseCount) return `${summary.caseCount} case results`;
  if (node.nodeKind === 'SOURCE') return summary.effectiveSourcePwlDb == null ? '' : `${summary.effectiveSourcePwlDb} dB effective`;
  return summary.lof == null ? '' : `LOF ${summary.lof} · ${summary.caseId}`;
}

function nodeHtml(node, position) {
  const caseText = node.caseId ? ` · ${node.caseId}` : '';
  const aria = `${node.nodeKind} ${node.tag}${caseText}`;
  return `<g class="aiv-canvas-node is-${esc(node.nodeKind.toLowerCase())}" transform="translate(${position.x} ${position.y})" data-aiv-canvas-node="${esc(node.nodeKey)}" aria-label="${esc(aria)}">
    <title>${esc(aria)}</title>${nodeGlyph(node)}
    <text class="aiv-canvas-node-title" x="0" y="40" text-anchor="middle">${esc(node.tag)}</text>
    <text class="aiv-canvas-node-subtitle" x="0" y="55" text-anchor="middle">${esc(node.canonicalId)}${esc(caseText)}</text>
    ${resultText(node) ? `<text class="aiv-canvas-node-result" x="0" y="70" text-anchor="middle">${esc(resultText(node))}</text>` : ''}
  </g>`;
}

function relationshipLabel(relationship) {
  const distance = relationship.physicalDistance && relationship.physicalDistanceUnit
    ? `${relationship.physicalDistance} ${relationship.physicalDistanceUnit}`
    : 'distance unresolved';
  return `${relationship.caseId} · ${distance}`;
}

function relationshipHtml(relationship, positions) {
  const source = positions.get(`SOURCE:${relationship.sourceCanonicalId}:${relationship.caseId}`);
  const assessment = positions.get(`ASSESSMENT:${relationship.assessmentCanonicalId}`);
  if (!source || !assessment) return '';
  const x1 = source.x + 30;
  const x2 = assessment.x - 30;
  const midX = (x1 + x2) / 2;
  const midY = (source.y + assessment.y) / 2;
  const kind = relationship.applicabilityDisposition === 'APPLICABLE' ? 'applicable' : 'inactive';
  return `<g class="aiv-canvas-relationship is-${kind}" data-aiv-canvas-relationship="${esc(relationship.rowKey)}">
    <title>${esc(`${relationship.sourceCanonicalId} to ${relationship.assessmentCanonicalId} · ${relationshipLabel(relationship)}`)}</title>
    <line x1="${x1}" y1="${source.y}" x2="${x2}" y2="${assessment.y}" marker-end="url(#aiv-canvas-arrow)"></line>
    <text x="${midX}" y="${midY - 8}" text-anchor="middle">${esc(relationshipLabel(relationship))}</text>
  </g>`;
}

function lineSummaryNotice(projection) {
  if (!projection.lineCaseSummaries.length) return '';
  const scopes = projection.lineCaseSummaries.map((item) => `${item.line ?? '—'} / ${item.caseId}: ${item.lof}`).join(' · ');
  return `<div class="aiv-canvas-line-summary"><strong>Line/Case trace only — NON-AUTHORITATIVE FOR SCREENING</strong><span>${esc(scopes)}</span></div>`;
}

function emptyCanvas() {
  return '<div class="aiv-canvas-empty">Load AIV records with canonical IDs to populate the relationship canvas. Blank editable identities are not invented by the canvas.</div>';
}

function canvasHeight(layout) {
  const maxY = Math.max(0, ...layout.nodes.map((node) => node.y));
  return Math.max(260, maxY + 110);
}

export function renderAivCanvasWorkspaceHtml(state = {}) {
  const projection = canvasProjection(state);
  const layout = buildDeterministicAivCanvasLayout(projection, state.canvasLayout ?? null);
  const positions = new Map(layout.nodes.map((node) => [node.nodeKey, node]));
  const height = canvasHeight(layout);
  const relationships = projection.relationships.map((item) => relationshipHtml(item, positions)).join('');
  const nodes = projection.nodes.map((item) => nodeHtml(item, positions.get(item.nodeKey))).join('');
  const badges = `${badge(`${projection.nodes.length} nodes`)}${badge(`${projection.relationships.length} relationships`)}${badge('presentation-only', 'authority')}`;
  return `${canvasStyle()}<section class="aivq-card aiv-canvas-card">
    <div class="aivq-section-head"><div><h4>AIV relationship canvas</h4><p>Dedicated SVG navigation surface. Tables remain engineering authority; connector geometry never supplies physical distance.</p></div><div class="aiv-canvas-badges">${badges}</div></div>
    ${projection.nodes.length ? `<div class="aiv-canvas-frame"><svg class="aiv-canvas-svg" role="img" aria-label="AIV source to assessment relationship canvas" viewBox="0 0 760 ${height}" preserveAspectRatio="xMidYMin meet">
      <defs><marker id="aiv-canvas-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 Z"></path></marker></defs>
      <g class="aiv-canvas-relationships">${relationships}</g><g class="aiv-canvas-nodes">${nodes}</g>
    </svg></div>` : emptyCanvas()}
    ${lineSummaryNotice(projection)}
  </section>`;
}
