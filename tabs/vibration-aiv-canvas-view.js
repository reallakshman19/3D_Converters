import { buildDeterministicAivCanvasLayout } from '../converters/vibration/aiv/aiv-canvas-layout-contract.js';
import { buildAivCanvasProjection } from '../converters/vibration/aiv/aiv-canvas-projection.js';
import { aivCanvasFieldKey } from './vibration-aiv-canvas-field.js';
import { renderAivCanvasFilterControls } from './vibration-aiv-canvas-filter.js';
import { renderAivCanvasNodeGlyph, renderAivCanvasStatusGlyphs } from './vibration-aiv-canvas-icons.js';
import {
  renderAivCanvasAssessmentResultHtml,
  renderAivCanvasRelationshipResultHtml,
  renderAivCanvasSourceResultHtml,
} from './vibration-aiv-canvas-results.js';

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
    .aiv-canvas-card{overflow:hidden}.aiv-canvas-head-actions{display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap;justify-content:flex-end}.aiv-canvas-controls,.aiv-canvas-mode-controls,.aiv-canvas-filter-controls{display:flex;gap:5px;align-items:center;flex-wrap:wrap}.aiv-canvas-filter-controls label{display:flex;align-items:center;gap:4px;color:#94a3b8;font-size:10px}.aiv-canvas-filter-controls select{background:#0b1220;color:#e5e7eb;border:1px solid #334155;border-radius:4px;padding:4px}.aiv-canvas-badges{display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end}.aiv-canvas-badge{border:1px solid #334155;border-radius:999px;padding:3px 7px;color:#cbd5e1;font-size:10px}.aiv-canvas-badge.authority{border-color:#0369a1;color:#7dd3fc}.aiv-canvas-frame{overflow:hidden;border:1px solid #1e293b;border-radius:8px;background:#08111f;touch-action:none}.aiv-canvas-svg{display:block;width:100%;min-width:720px;min-height:260px;cursor:grab;user-select:none}.aiv-canvas-svg:active{cursor:grabbing}.aiv-canvas-node{cursor:move;outline:none}.aiv-canvas-node-shape{fill:#0f172a;stroke:#7dd3fc;stroke-width:2}.aiv-canvas-node.is-assessment .aiv-canvas-node-shape{stroke:#c4b5fd}.aiv-canvas-node.is-path .aiv-canvas-node-shape,.aiv-canvas-node.is-boundary .aiv-canvas-node-shape{stroke:#94a3b8}.aiv-canvas-node-detail{fill:none;stroke:#e2e8f0;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.aiv-canvas-node-glyph-text{fill:#e2e8f0;font-size:18px;font-weight:700}.aiv-canvas-node-title{fill:#e5e7eb;font-size:11px;font-weight:700}.aiv-canvas-node-subtitle,.aiv-canvas-node-result,.aiv-canvas-node-status{fill:#94a3b8;font-size:9px}.aiv-canvas-node-status{fill:#fbbf24}.aiv-canvas-status-glyph circle{fill:#0b1220;stroke:#cbd5e1;stroke-width:1}.aiv-canvas-status-glyph text{fill:#f8fafc;font-size:6px;font-weight:700}.aiv-canvas-status-glyph.is-warning circle,.aiv-canvas-status-glyph.is-input_incomplete circle{stroke:#f59e0b}.aiv-canvas-status-glyph.is-result_available circle{stroke:#22c55e}.aiv-canvas-status-glyph.is-assumption circle{stroke:#fbbf24}.aiv-canvas-relationship{cursor:pointer;outline:none}.aiv-canvas-relationship line{stroke:#38bdf8;stroke-width:2}.aiv-canvas-relationship>text{fill:#cbd5e1;font-size:9px}.aiv-canvas-relationship.is-inactive line{stroke:#64748b;stroke-dasharray:6 5}.aiv-canvas-node.is-selected .aiv-canvas-node-shape,.aiv-canvas-node:focus .aiv-canvas-node-shape{stroke-width:4}.aiv-canvas-relationship.is-selected line,.aiv-canvas-relationship:focus line{stroke-width:4}.aivq-input-table tr.is-selected>td{box-shadow:inset 0 0 0 1px #38bdf8;background:#0b1f33}.aivq-input-table td.is-assumed{background:#261c08}.aivq-assumed-cell{display:block;margin-top:3px;color:#fbbf24}.aiv-canvas-svg marker path{fill:#38bdf8}.aiv-canvas-empty{padding:22px;border:1px dashed #334155;border-radius:8px;color:#94a3b8;text-align:center}.aiv-canvas-line-summary,.aiv-canvas-selected-detail{display:flex;flex-direction:column;gap:7px;margin-top:8px;padding:10px;border:1px solid #334155;border-radius:6px}.aiv-canvas-line-summary{border-color:#7c2d12;color:#fdba74}.aiv-canvas-line-summary span,.aiv-canvas-selected-detail small{font-size:10px;color:#94a3b8}.aiv-canvas-selected-detail[hidden],.aiv-canvas-detail-panel[hidden],.is-filtered{display:none!important}.aiv-canvas-detail-tabs{display:flex;gap:5px;flex-wrap:wrap;border-bottom:1px solid #334155;padding-bottom:6px}.aiv-canvas-detail-tabs button[aria-selected="true"]{border-color:#38bdf8;color:#7dd3fc}.aiv-canvas-detail-panel{display:flex;flex-direction:column;gap:7px}.aiv-canvas-detail-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:6px}.aiv-canvas-detail-grid span{display:flex;flex-direction:column;gap:2px;border:1px solid #1e293b;border-radius:5px;padding:6px}.aiv-canvas-detail-grid small{color:#94a3b8}.aiv-canvas-input-values{display:grid;grid-template-columns:minmax(150px,.8fr) minmax(180px,1.2fr);gap:3px 10px;margin:0}.aiv-canvas-input-values dt{color:#94a3b8}.aiv-canvas-input-values dd{margin:0;word-break:break-word}.aiv-canvas-assumption-list{display:flex;flex-wrap:wrap;gap:6px}.aiv-canvas-assumption-action{text-align:left}.aiv-canvas-result-detail,.aiv-canvas-result-case{display:flex;flex-direction:column;gap:6px}.aiv-canvas-result-case+.aiv-canvas-result-case{border-top:1px solid #334155;padding-top:8px}.aiv-canvas-result-grid,.aiv-canvas-result-authority{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:6px}.aiv-canvas-result-grid span,.aiv-canvas-result-authority span{display:flex;flex-direction:column;gap:2px;border:1px solid #1e293b;border-radius:5px;padding:6px}.aiv-canvas-result-grid small,.aiv-canvas-result-authority small{color:#94a3b8}.aiv-canvas-contribution-table{overflow:auto}.aiv-canvas-contribution-table table{width:100%;border-collapse:collapse;font-size:10px}.aiv-canvas-contribution-table th,.aiv-canvas-contribution-table td{border-bottom:1px solid #1e293b;padding:4px;text-align:left}.aiv-canvas-card:not([data-aiv-canvas-active-mode="RESULTS"]) .aiv-canvas-node-result{display:none}.aiv-canvas-card[data-aiv-canvas-active-mode="RESULTS"] .aiv-canvas-node-result{fill:#86efac;font-weight:700}
  </style>`;
}

function topology(state) {
  if (state.readinessEnvelope?.exchange) return state.readinessEnvelope.exchange;
  if (state.topologyInput?.format === 'PARSED_EXCHANGE') return state.topologyInput.data;
  return state.topology ?? null;
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

function filterAttrs(item) {
  return ` data-aiv-filterable="true" data-aiv-canvas-cases="${esc((item.caseIds ?? []).join('|'))}" data-aiv-canvas-line="${esc(item.line ?? '')}"`;
}

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

function nodeTableKind(node) {
  if (node.nodeKind === 'SOURCE') return 'sources';
  if (node.nodeKind === 'ASSESSMENT') return 'assessments';
  return '';
}

function nodeHtml(node, position) {
  const caseText = node.caseId ? ` · ${node.caseId}` : '';
  const aria = `${node.nodeKind} ${node.tag}${caseText}${statusText(node) ? ` · ${statusText(node)}` : ''}`;
  const tableKind = nodeTableKind(node);
  const tableAttr = tableKind ? ` data-aiv-table-kind="${tableKind}"` : '';
  return `<g class="aiv-canvas-node is-${esc(node.nodeKind.toLowerCase())}" transform="translate(${position.x} ${position.y})" data-aiv-canvas-node="${esc(node.nodeKey)}" data-aiv-selection-key="${esc(node.nodeKey)}"${tableAttr}${filterAttrs(node)} data-aiv-canvas-canonical-id="${esc(node.canonicalId)}" data-aiv-canvas-case-id="${esc(node.caseId ?? '')}" data-aiv-canvas-node-kind="${esc(node.nodeKind)}" data-aiv-canvas-icon-type="${esc(node.iconType)}" data-aiv-canvas-x="${position.x}" data-aiv-canvas-y="${position.y}" role="button" tabindex="0" aria-selected="false" aria-label="${esc(aria)}">
    <title>${esc(aria)}</title>${renderAivCanvasNodeGlyph(node)}${renderAivCanvasStatusGlyphs(node.statusGlyphs)}
    <text class="aiv-canvas-node-title" x="0" y="40" text-anchor="middle">${esc(node.tag)}</text>
    <text class="aiv-canvas-node-subtitle" x="0" y="55" text-anchor="middle">${esc(node.canonicalId)}${esc(caseText)}</text>
    ${statusText(node) ? `<text class="aiv-canvas-node-status" x="0" y="70" text-anchor="middle">${esc(statusText(node))}</text>` : ''}
    ${resultText(node) ? `<text class="aiv-canvas-node-result" x="0" y="83" text-anchor="middle">${esc(resultText(node))}</text>` : ''}
  </g>`;
}

function relationshipLabel(relationship) {
  const distance = relationship.physicalDistance && relationship.physicalDistanceUnit
    ? `${relationship.physicalDistance} ${relationship.physicalDistanceUnit}`
    : 'distance unresolved';
  return [relationship.caseId, distance, statusText(relationship)].filter(Boolean).join(' · ');
}

function relationshipHtml(relationship, positions) {
  const sourceKey = `SOURCE:${relationship.sourceCanonicalId}:${relationship.caseId}`;
  const assessmentKey = `ASSESSMENT:${relationship.assessmentCanonicalId}`;
  const source = positions.get(sourceKey);
  const assessment = positions.get(assessmentKey);
  if (!source || !assessment) return '';
  const x1 = source.x + 30;
  const x2 = assessment.x - 30;
  const midX = (source.x + assessment.x) / 2;
  const midY = (source.y + assessment.y) / 2;
  const kind = relationship.applicabilityDisposition === 'APPLICABLE' ? 'applicable' : 'inactive';
  const aria = `${relationship.sourceCanonicalId} to ${relationship.assessmentCanonicalId} · ${relationshipLabel(relationship)}`;
  return `<g class="aiv-canvas-relationship is-${kind}" data-aiv-canvas-relationship="${esc(relationship.rowKey)}" data-aiv-selection-key="${esc(relationship.selectionKey)}" data-aiv-table-kind="relationships"${filterAttrs(relationship)} data-aiv-source-canonical-id="${esc(relationship.sourceCanonicalId)}" data-aiv-assessment-canonical-id="${esc(relationship.assessmentCanonicalId)}" data-aiv-case-id="${esc(relationship.caseId)}" data-aiv-canvas-source-node="${esc(sourceKey)}" data-aiv-canvas-assessment-node="${esc(assessmentKey)}" role="button" tabindex="0" aria-selected="false" aria-label="${esc(aria)}">
    <title>${esc(aria)}</title><line x1="${x1}" y1="${source.y}" x2="${x2}" y2="${assessment.y}" marker-end="url(#aiv-canvas-arrow)"></line>
    <text x="${midX}" y="${midY - 8}" text-anchor="middle">${esc(relationshipLabel(relationship))}</text>
    <g transform="translate(${midX} ${midY})">${renderAivCanvasStatusGlyphs(relationship.statusGlyphs)}</g>
  </g>`;
}

function assumptionAction(item) {
  const key = aivCanvasFieldKey(item.tableKind, item.rowIndex, item.column);
  return `<button type="button" class="engineering-console-btn aiv-canvas-assumption-action" data-aiv-assumption-field-key="${esc(key)}"><strong>[A] ${esc(item.column)}</strong><br><small>${esc(item.assumedValue)} · ${esc(item.profilePath)} · ${esc(item.reason)}</small></button>`;
}

function inputValuesHtml(values = {}) {
  const rows = Object.entries(values).filter(([, value]) => String(value ?? '').trim());
  if (!rows.length) return '<small>No table-backed values are available for this presentation node.</small>';
  return `<dl class="aiv-canvas-input-values">${rows.map(([key, value]) => `<dt>${esc(key)}</dt><dd>${esc(value)}</dd>`).join('')}</dl>`;
}

function provenanceHtml(values = {}) {
  const rows = Object.entries(values).filter(([key, value]) => String(value ?? '').trim()
    && /(Source|Revision|Record ID|Status|Reviewer)/u.test(key));
  if (!rows.length) return '<small>No explicit table provenance fields are populated.</small>';
  return `<dl class="aiv-canvas-input-values">${rows.map(([key, value]) => `<dt>${esc(key)}</dt><dd>${esc(value)}</dd>`).join('')}</dl>`;
}

function detailMetric(label, value) {
  return `<span><small>${esc(label)}</small><strong>${esc(value ?? '—')}</strong></span>`;
}

function summaryHtml(item, kind) {
  if (kind === 'RELATIONSHIP') {
    return `<div class="aiv-canvas-detail-grid">${detailMetric('Source', item.sourceCanonicalId)}${detailMetric('Assessment', item.assessmentCanonicalId)}${detailMetric('Case', item.caseId)}${detailMetric('Line', item.line)}${detailMetric('Applicability', item.applicabilityDisposition)}${detailMetric('Physical distance', item.physicalDistance && item.physicalDistanceUnit ? `${item.physicalDistance} ${item.physicalDistanceUnit}` : '—')}${detailMetric('Readiness', item.readinessStatus ?? 'NOT_CHECKED')}${detailMetric('Assumptions', item.assumptionCount)}</div>`;
  }
  return `<div class="aiv-canvas-detail-grid">${detailMetric('Canonical ID', item.canonicalId)}${detailMetric('Kind', item.nodeKind)}${detailMetric('Icon type', item.iconType)}${detailMetric('Case', item.caseId ?? (item.caseIds?.join(', ') || '—'))}${detailMetric('Line', item.line)}${detailMetric('Readiness', item.readinessStatus ?? 'NOT_CHECKED')}${detailMetric('Screening status', item.screeningStatus ?? 'NOT_RUN')}${detailMetric('Assumptions', item.assumptionCount)}</div>`;
}

function t26Html(item) {
  const summary = item?.resultSummary;
  const cases = summary?.caseCount ? summary.cases : summary ? [summary] : [];
  const rows = cases.filter((entry) => entry.t26Intermediates).map((entry) => {
    const t26 = entry.t26Intermediates;
    return `<div><strong>${esc(entry.caseId)}</strong><div class="aiv-canvas-detail-grid">${detailMetric('FLM1', t26.FLM1)}${detailMetric('FLM2', t26.FLM2)}${detailMetric('Lf', t26.Lf)}${detailMetric('B', t26.B)}${detailMetric('log10(N)', t26.log10N)}</div></div>`;
  });
  return rows.length ? rows.join('') : '<small>No returned T2-6 intermediates for this Assessment.</small>';
}

function tabButton(id, label, selected = false) {
  return `<button type="button" class="engineering-console-btn" data-aiv-detail-tab="${id}" role="tab" aria-selected="${selected ? 'true' : 'false'}">${esc(label)}</button>`;
}

function panel(id, html, selected = false) {
  return `<div class="aiv-canvas-detail-panel" data-aiv-detail-panel="${id}" role="tabpanel"${selected ? '' : ' hidden'}>${html}</div>`;
}

function selectedDetail(selectionKey, label, item, resultHtml = '', kind = 'NODE') {
  const assumptions = item.assumptions?.map(assumptionAction).join('') ?? '';
  const calculationLabel = kind === 'RELATIONSHIP' ? 'Contribution' : kind === 'ASSESSMENT' ? 'Contributions' : 'Calculation';
  const tabs = [
    tabButton('summary', 'Summary', true), tabButton('inputs', 'Inputs'), tabButton('calculation', calculationLabel),
    ...(kind === 'ASSESSMENT' ? [tabButton('t26', 'T2-6')] : []), tabButton('assumptions', 'Assumptions'), tabButton('provenance', 'Provenance'),
  ].join('');
  const panels = [
    panel('summary', summaryHtml(item, kind), true),
    panel('inputs', inputValuesHtml(item.inputValues)),
    panel('calculation', resultHtml || '<small>No screening result is available yet. Inputs and identity remain selectable before calculation.</small>'),
    ...(kind === 'ASSESSMENT' ? [panel('t26', t26Html(item))] : []),
    panel('assumptions', assumptions ? `<div class="aiv-canvas-assumption-list">${assumptions}</div>` : '<small>No resolved assumptions for this item.</small>'),
    panel('provenance', provenanceHtml(item.inputValues)),
  ].join('');
  return `<section class="aiv-canvas-selected-detail" data-aiv-canvas-assumption-detail="${esc(selectionKey)}" hidden><strong>${esc(label)}</strong><div class="aiv-canvas-detail-tabs" role="tablist">${tabs}</div>${panels}</section>`;
}

function detailsHtml(projection) {
  const nodes = projection.nodes.filter((node) => ['SOURCE', 'ASSESSMENT'].includes(node.nodeKind)).map((node) => selectedDetail(
    node.nodeKey, `${node.nodeKind} ${node.tag}`, node,
    node.nodeKind === 'SOURCE' ? renderAivCanvasSourceResultHtml(node) : renderAivCanvasAssessmentResultHtml(node),
    node.nodeKind,
  ));
  const relationships = projection.relationships.map((item) => selectedDetail(
    item.selectionKey, `${item.sourceCanonicalId} → ${item.assessmentCanonicalId} · ${item.caseId}`,
    item, renderAivCanvasRelationshipResultHtml(item), 'RELATIONSHIP',
  ));
  return [...nodes, ...relationships].join('');
}

function lineSummaryNotice(projection) {
  if (!projection.lineCaseSummaries.length) return '';
  const rows = projection.lineCaseSummaries.map((item) => `<span data-aiv-filterable="true" data-aiv-canvas-cases="${esc(item.caseId)}" data-aiv-canvas-line="${esc(item.line ?? '')}">${esc(item.line ?? '—')} / ${esc(item.caseId)}: ${esc(item.lof)}</span>`).join('');
  return `<div class="aiv-canvas-line-summary"><strong>Line/Case trace only — NON-AUTHORITATIVE FOR SCREENING</strong>${rows}</div>`;
}

function emptyCanvas() {
  return '<div class="aiv-canvas-empty">Load AIV records with canonical IDs to populate the relationship canvas. Blank editable identities are not invented by the canvas.</div>';
}

function canvasHeight(layout) {
  const maxY = Math.max(0, ...layout.nodes.map((node) => node.y));
  return Math.max(260, maxY + 125);
}

function canvasControls() {
  return `<div class="aiv-canvas-controls" role="group" aria-label="AIV canvas zoom controls"><button type="button" class="engineering-console-btn" data-aiv-canvas-action="zoom-out" aria-label="Zoom out">−</button><button type="button" class="engineering-console-btn" data-aiv-canvas-action="reset-view">Reset view</button><button type="button" class="engineering-console-btn" data-aiv-canvas-action="zoom-in" aria-label="Zoom in">+</button></div>`;
}

function relationshipControls() {
  return `<div class="aiv-canvas-mode-controls" role="group" aria-label="AIV canvas mode controls">
    <button type="button" class="engineering-console-btn" data-aiv-canvas-mode="NAVIGATE" aria-pressed="true">Navigate</button>
    <button type="button" class="engineering-console-btn" data-aiv-canvas-mode="RELATIONSHIPS" aria-pressed="false">Relationships</button>
    <button type="button" class="engineering-console-btn" data-aiv-canvas-mode="RESULTS" aria-pressed="false">Results</button>
    <button type="button" class="engineering-console-btn" data-aiv-canvas-action="delete-relationship" disabled>Delete relationship</button>
  </div>`;
}

export function renderAivCanvasWorkspaceHtml(state = {}) {
  const projection = canvasProjection(state);
  const layout = buildDeterministicAivCanvasLayout(projection, state.canvasLayout ?? null);
  const positions = new Map(layout.nodes.map((node) => [node.nodeKey, node]));
  const height = canvasHeight(layout);
  const relationships = projection.relationships.map((item) => relationshipHtml(item, positions)).join('');
  const nodes = projection.nodes.map((item) => nodeHtml(item, positions.get(item.nodeKey))).join('');
  const badges = `${badge(`${projection.nodes.length} nodes`)}${badge(`${projection.relationships.length} relationships`)}${badge('presentation-only', 'authority')}`;
  const vp = layout.viewport;
  return `${canvasStyle()}<section class="aivq-card aiv-canvas-card" data-aiv-canvas-active-mode="NAVIGATE">
    <div class="aivq-section-head"><div><h4>AIV relationship canvas</h4><p>Case/line filters synchronize canvas, result and editable table presentation. Assessment contribution rows come from current screening results; combined PWL is never reconstructed in UI code.</p></div><div class="aiv-canvas-head-actions"><div class="aiv-canvas-badges">${badges}</div>${renderAivCanvasFilterControls(projection)}${relationshipControls()}${canvasControls()}</div></div>
    ${projection.nodes.length ? `<div class="aiv-canvas-frame"><svg class="aiv-canvas-svg" data-aiv-canvas-svg="true" data-aiv-canvas-viewport-x="${vp.x}" data-aiv-canvas-viewport-y="${vp.y}" data-aiv-canvas-viewport-zoom="${vp.zoom}" role="img" aria-label="AIV source to assessment relationship canvas" viewBox="0 0 760 ${height}" preserveAspectRatio="xMidYMin meet"><defs><marker id="aiv-canvas-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 Z"></path></marker></defs><g data-aiv-canvas-scene="true" transform="translate(${vp.x} ${vp.y}) scale(${vp.zoom})"><g class="aiv-canvas-relationships">${relationships}</g><g class="aiv-canvas-nodes">${nodes}</g></g></svg></div>` : emptyCanvas()}
    ${detailsHtml(projection)}${lineSummaryNotice(projection)}
  </section>`;
}
