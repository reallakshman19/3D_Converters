import { buildDeterministicAivCanvasLayout } from '../converters/vibration/aiv/aiv-canvas-layout-contract.js';
import { buildAivCanvasProjection } from '../converters/vibration/aiv/aiv-canvas-projection.js';
import { aivCanvasFieldKey } from './vibration-aiv-canvas-field.js';

function esc(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function canvasStyle() {
  return `<style>
    .aiv-canvas-card{overflow:hidden}.aiv-canvas-head-actions{display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap;justify-content:flex-end}.aiv-canvas-controls,.aiv-canvas-mode-controls{display:flex;gap:5px}.aiv-canvas-badges{display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end}.aiv-canvas-badge{border:1px solid #334155;border-radius:999px;padding:3px 7px;color:#cbd5e1;font-size:10px}.aiv-canvas-badge.authority{border-color:#0369a1;color:#7dd3fc}.aiv-canvas-frame{overflow:hidden;border:1px solid #1e293b;border-radius:8px;background:#08111f;touch-action:none}.aiv-canvas-svg{display:block;width:100%;min-width:720px;min-height:260px;cursor:grab;user-select:none}.aiv-canvas-svg:active{cursor:grabbing}.aiv-canvas-node{cursor:move;outline:none}.aiv-canvas-node-shape{fill:#0f172a;stroke:#7dd3fc;stroke-width:2}.aiv-canvas-node.is-assessment .aiv-canvas-node-shape{stroke:#c4b5fd}.aiv-canvas-node.is-path .aiv-canvas-node-shape,.aiv-canvas-node.is-boundary .aiv-canvas-node-shape{stroke:#94a3b8}.aiv-canvas-node-detail{fill:none;stroke:#e2e8f0;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.aiv-canvas-node-title{fill:#e5e7eb;font-size:11px;font-weight:700}.aiv-canvas-node-subtitle,.aiv-canvas-node-result,.aiv-canvas-node-status{fill:#94a3b8;font-size:9px}.aiv-canvas-node-status{fill:#fbbf24}.aiv-canvas-relationship{cursor:pointer;outline:none}.aiv-canvas-relationship line{stroke:#38bdf8;stroke-width:2}.aiv-canvas-relationship text{fill:#cbd5e1;font-size:9px}.aiv-canvas-relationship.is-inactive line{stroke:#64748b;stroke-dasharray:6 5}.aiv-canvas-node.is-selected .aiv-canvas-node-shape,.aiv-canvas-node:focus .aiv-canvas-node-shape{stroke-width:4}.aiv-canvas-relationship.is-selected line,.aiv-canvas-relationship:focus line{stroke-width:4}.aivq-input-table tr.is-selected>td{box-shadow:inset 0 0 0 1px #38bdf8;background:#0b1f33}.aivq-input-table td.is-assumed{background:#261c08}.aivq-assumed-cell{display:block;margin-top:3px;color:#fbbf24}.aiv-canvas-svg marker path{fill:#38bdf8}.aiv-canvas-empty{padding:22px;border:1px dashed #334155;border-radius:8px;color:#94a3b8;text-align:center}.aiv-canvas-line-summary,.aiv-canvas-assumption-detail{display:flex;flex-direction:column;gap:5px;margin-top:8px;padding:8px;border:1px solid #7c2d12;border-radius:6px}.aiv-canvas-line-summary{color:#fdba74}.aiv-canvas-line-summary span,.aiv-canvas-assumption-detail small{font-size:10px;color:#94a3b8}.aiv-canvas-assumption-detail[hidden]{display:none}.aiv-canvas-assumption-list{display:flex;flex-wrap:wrap;gap:6px}.aiv-canvas-assumption-action{text-align:left}
  </style>`;
}

function topology(state) {
  if (state.readinessEnvelope?.exchange) return state.readinessEnvelope.exchange;
  if (state.topologyInput?.format === 'PARSED_EXCHANGE') return state.topologyInput.data;
  return null;
}

function canvasProjection(state) {
  return buildAivCanvasProjection({
    tables: state.tables, assumptionResolution: state.assumptionResolution,
    readinessEnvelope: state.readinessEnvelope, screeningResult: state.screeningResult, topology: topology(state),
  });
}

function badge(value, kind = '') { return value ? `<span class="aiv-canvas-badge ${esc(kind)}">${esc(value)}</span>` : ''; }
function sourceGlyph() { return '<circle r="24" class="aiv-canvas-node-shape"></circle><path d="M-11 0 L0 -10 L11 0 L0 10 Z" class="aiv-canvas-node-detail"></path>'; }
function assessmentGlyph() { return '<rect x="-22" y="-22" width="44" height="44" rx="6" class="aiv-canvas-node-shape"></rect><path d="M-12 0 H12 M0 -12 V12" class="aiv-canvas-node-detail"></path>'; }
function pathGlyph(boundary) { return boundary ? '<rect x="-27" y="-20" width="54" height="40" rx="12" class="aiv-canvas-node-shape"></rect>' : '<rect x="-24" y="-9" width="48" height="18" rx="9" class="aiv-canvas-node-shape"></rect>'; }
function nodeGlyph(node) { return node.nodeKind === 'SOURCE' ? sourceGlyph() : node.nodeKind === 'ASSESSMENT' ? assessmentGlyph() : pathGlyph(node.nodeKind === 'BOUNDARY'); }

function resultText(node) {
  const summary = node.resultSummary;
  if (!summary) return '';
  if (summary.caseCount) return `${summary.caseCount} case results`;
  if (node.nodeKind === 'SOURCE') return summary.effectiveSourcePwlDb == null ? '' : `${summary.effectiveSourcePwlDb} dB effective`;
  return summary.lof == null ? '' : `LOF ${summary.lof} · ${summary.caseId}`;
}

function statusText(item) {
  return [item.assumptionCount ? `[A] ${item.assumptionCount}` : '', item.readinessStatus ?? ''].filter(Boolean).join(' · ');
}

function nodeTableKind(node) { return node.nodeKind === 'SOURCE' ? 'sources' : node.nodeKind === 'ASSESSMENT' ? 'assessments' : ''; }

function nodeHtml(node, position) {
  const caseText = node.caseId ? ` · ${node.caseId}` : '';
  const aria = `${node.nodeKind} ${node.tag}${caseText}${statusText(node) ? ` · ${statusText(node)}` : ''}`;
  const tableKind = nodeTableKind(node);
  const tableAttr = tableKind ? ` data-aiv-table-kind="${tableKind}"` : '';
  return `<g class="aiv-canvas-node is-${esc(node.nodeKind.toLowerCase())}" transform="translate(${position.x} ${position.y})" data-aiv-canvas-node="${esc(node.nodeKey)}" data-aiv-selection-key="${esc(node.nodeKey)}"${tableAttr} data-aiv-canvas-canonical-id="${esc(node.canonicalId)}" data-aiv-canvas-case-id="${esc(node.caseId ?? '')}" data-aiv-canvas-node-kind="${esc(node.nodeKind)}" data-aiv-canvas-x="${position.x}" data-aiv-canvas-y="${position.y}" role="button" tabindex="0" aria-selected="false" aria-label="${esc(aria)}">
    <title>${esc(aria)}</title>${nodeGlyph(node)}
    <text class="aiv-canvas-node-title" x="0" y="40" text-anchor="middle">${esc(node.tag)}</text>
    <text class="aiv-canvas-node-subtitle" x="0" y="55" text-anchor="middle">${esc(node.canonicalId)}${esc(caseText)}</text>
    ${statusText(node) ? `<text class="aiv-canvas-node-status" x="0" y="70" text-anchor="middle">${esc(statusText(node))}</text>` : ''}
    ${resultText(node) ? `<text class="aiv-canvas-node-result" x="0" y="83" text-anchor="middle">${esc(resultText(node))}</text>` : ''}
  </g>`;
}

function relationshipLabel(relationship) {
  const distance = relationship.physicalDistance && relationship.physicalDistanceUnit
    ? `${relationship.physicalDistance} ${relationship.physicalDistanceUnit}` : 'distance unresolved';
  return [relationship.caseId, distance, statusText(relationship)].filter(Boolean).join(' · ');
}

function relationshipHtml(relationship, positions) {
  const sourceKey = `SOURCE:${relationship.sourceCanonicalId}:${relationship.caseId}`;
  const assessmentKey = `ASSESSMENT:${relationship.assessmentCanonicalId}`;
  const source = positions.get(sourceKey);
  const assessment = positions.get(assessmentKey);
  if (!source || !assessment) return '';
  const midX = (source.x + assessment.x) / 2;
  const midY = (source.y + assessment.y) / 2;
  const kind = relationship.applicabilityDisposition === 'APPLICABLE' ? 'applicable' : 'inactive';
  const aria = `${relationship.sourceCanonicalId} to ${relationship.assessmentCanonicalId} · ${relationshipLabel(relationship)}`;
  return `<g class="aiv-canvas-relationship is-${kind}" data-aiv-canvas-relationship="${esc(relationship.rowKey)}" data-aiv-selection-key="${esc(relationship.selectionKey)}" data-aiv-table-kind="relationships" data-aiv-source-canonical-id="${esc(relationship.sourceCanonicalId)}" data-aiv-assessment-canonical-id="${esc(relationship.assessmentCanonicalId)}" data-aiv-case-id="${esc(relationship.caseId)}" data-aiv-canvas-source-node="${esc(sourceKey)}" data-aiv-canvas-assessment-node="${esc(assessmentKey)}" role="button" tabindex="0" aria-selected="false" aria-label="${esc(aria)}">
    <title>${esc(aria)}</title><line x1="${source.x + 30}" y1="${source.y}" x2="${assessment.x - 30}" y2="${assessment.y}" marker-end="url(#aiv-canvas-arrow)"></line>
    <text x="${midX}" y="${midY - 8}" text-anchor="middle">${esc(relationshipLabel(relationship))}</text>
  </g>`;
}

function assumptionAction(item) {
  const key = aivCanvasFieldKey(item.tableKind, item.rowIndex, item.column);
  return `<button type="button" class="engineering-console-btn aiv-canvas-assumption-action" data-aiv-assumption-field-key="${esc(key)}"><strong>[A] ${esc(item.column)}</strong><br><small>${esc(item.assumedValue)} · ${esc(item.profilePath)} · ${esc(item.reason)}</small></button>`;
}

function assumptionDetail(selectionKey, label, item) {
  if (!item.assumptionCount && !item.readinessStatus) return '';
  const assumptions = item.assumptions?.map(assumptionAction).join('') ?? '';
  return `<section class="aiv-canvas-assumption-detail" data-aiv-canvas-assumption-detail="${esc(selectionKey)}" hidden>
    <strong>${esc(label)}</strong><small>Readiness: ${esc(item.readinessStatus ?? 'NOT_CHECKED')} · Assumptions: ${item.assumptionCount}</small>
    ${assumptions ? `<div class="aiv-canvas-assumption-list">${assumptions}</div>` : '<small>No resolved assumptions for this item.</small>'}
  </section>`;
}

function detailsHtml(projection) {
  const nodes = projection.nodes.map((node) => assumptionDetail(node.nodeKey, `${node.nodeKind} ${node.tag}`, node));
  const relationships = projection.relationships.map((item) => assumptionDetail(item.selectionKey, `${item.sourceCanonicalId} → ${item.assessmentCanonicalId} · ${item.caseId}`, item));
  return [...nodes, ...relationships].join('');
}

function lineSummaryNotice(projection) {
  if (!projection.lineCaseSummaries.length) return '';
  const scopes = projection.lineCaseSummaries.map((item) => `${item.line ?? '—'} / ${item.caseId}: ${item.lof}`).join(' · ');
  return `<div class="aiv-canvas-line-summary"><strong>Line/Case trace only — NON-AUTHORITATIVE FOR SCREENING</strong><span>${esc(scopes)}</span></div>`;
}

function canvasControls() {
  return `<div class="aiv-canvas-controls" role="group" aria-label="AIV canvas zoom controls"><button type="button" class="engineering-console-btn" data-aiv-canvas-action="zoom-out">−</button><button type="button" class="engineering-console-btn" data-aiv-canvas-action="reset-view">Reset view</button><button type="button" class="engineering-console-btn" data-aiv-canvas-action="zoom-in">+</button></div>`;
}

function relationshipControls() {
  return `<div class="aiv-canvas-mode-controls" role="group" aria-label="AIV canvas mode controls"><button type="button" class="engineering-console-btn" data-aiv-canvas-mode="NAVIGATE" aria-pressed="true">Navigate</button><button type="button" class="engineering-console-btn" data-aiv-canvas-mode="RELATIONSHIPS" aria-pressed="false">Relationships</button><button type="button" class="engineering-console-btn" data-aiv-canvas-action="delete-relationship" disabled>Delete relationship</button></div>`;
}

export function renderAivCanvasWorkspaceHtml(state = {}) {
  const projection = canvasProjection(state);
  const layout = buildDeterministicAivCanvasLayout(projection, state.canvasLayout ?? null);
  const positions = new Map(layout.nodes.map((node) => [node.nodeKey, node]));
  const height = Math.max(260, Math.max(0, ...layout.nodes.map((node) => node.y)) + 125);
  const relationships = projection.relationships.map((item) => relationshipHtml(item, positions)).join('');
  const nodes = projection.nodes.map((item) => nodeHtml(item, positions.get(item.nodeKey))).join('');
  const badges = `${badge(`${projection.nodes.length} nodes`)}${badge(`${projection.relationships.length} relationships`)}${badge('presentation-only', 'authority')}`;
  const vp = layout.viewport;
  const empty = '<div class="aiv-canvas-empty">Load AIV records with canonical IDs to populate the relationship canvas. Blank editable identities are not invented by the canvas.</div>';
  return `${canvasStyle()}<section class="aivq-card aiv-canvas-card">
    <div class="aivq-section-head"><div><h4>AIV relationship canvas</h4><p>Assumption/readiness labels are projected from current resolution/readiness records. Tables remain engineering authority; connector geometry never supplies physical distance.</p></div><div class="aiv-canvas-head-actions"><div class="aiv-canvas-badges">${badges}</div>${relationshipControls()}${canvasControls()}</div></div>
    ${projection.nodes.length ? `<div class="aiv-canvas-frame"><svg class="aiv-canvas-svg" data-aiv-canvas-svg="true" data-aiv-canvas-viewport-x="${vp.x}" data-aiv-canvas-viewport-y="${vp.y}" data-aiv-canvas-viewport-zoom="${vp.zoom}" role="img" aria-label="AIV source to assessment relationship canvas" viewBox="0 0 760 ${height}" preserveAspectRatio="xMidYMin meet"><defs><marker id="aiv-canvas-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 Z"></path></marker></defs><g data-aiv-canvas-scene="true" transform="translate(${vp.x} ${vp.y}) scale(${vp.zoom})"><g>${relationships}</g><g>${nodes}</g></g></svg></div>` : empty}
    ${detailsHtml(projection)}${lineSummaryNotice(projection)}
  </section>`;
}
