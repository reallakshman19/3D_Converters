import { buildDeterministicAivCanvasLayout, createAivCanvasLayout } from '../converters/vibration/aiv/aiv-canvas-layout-contract.js';
import { renderAivCanvasFilterControls } from './vibration-aiv-canvas-filter.js';
import { renderAivCanvasNodeGlyph, renderAivCanvasStatusGlyphs } from './vibration-aiv-canvas-icons.js';
import {
  AIV_INPUT_MODE,
  currentAivInputRevision,
  isAivLineageCurrent,
} from './vibration-aiv-engineering-revision.js';
import { renderAivUnifiedCanvasAuthoringHtml } from './vibration-aiv-unified-canvas-author-view.js?v=20260816-aiv-526-editor-2';
import { renderAivUnifiedCanvasSelectedDetailHtml } from './vibration-aiv-unified-canvas-inspector.js?v=20260816-aiv-526-editor-2';
import { buildAivUnifiedCanvasProjection } from './vibration-aiv-unified-canvas-projection.js';

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}
function text(value) { return String(value ?? '').trim(); }
function filterAttrs(cases, line) {
  return ` data-aiv-filterable="true" data-aiv-canvas-cases="${esc((cases ?? []).filter(Boolean).join('|'))}" data-aiv-canvas-line="${esc(line ?? '')}"`;
}
function sourceKey(id, caseId) { return caseId ? `SOURCE:${id}:${caseId}` : `NETWORK_NODE:${id}`; }
function nodeKey(node) {
  if (node.nodeKind === 'SOURCE') return sourceKey(node.canonicalId, node.caseId);
  if (node.nodeKind === 'ASSESSMENT') return `ASSESSMENT:${node.canonicalId}`;
  return `NETWORK_NODE:${node.canonicalId}`;
}
function iconType(node) {
  if (node.nodeKind === 'SOURCE') return node.iconType ?? 'UNKNOWN_SOURCE';
  if (node.nodeKind === 'ASSESSMENT') return node.iconType ?? 'UNKNOWN_ASSESSMENT';
  return ({ JUNCTION: 'JUNCTION', CONNECTION: 'CONNECTION_NODE', OFF_PAGE: 'OFF_PAGE', BOUNDARY: 'BOUNDARY' })[node.nodeKind] ?? 'PIPE_PATH';
}
function topology(state) {
  return state.readinessEnvelope?.exchange
    ?? ((state.topologyInput?.format === 'PARSED_EXCHANGE' || state.topologyInput?.format === 'FLARE_NETWORK') ? state.topologyInput.data : state.topology)
    ?? null;
}
function projection(state) {
  return buildAivUnifiedCanvasProjection({
    tables: state.tables, assumptionResolution: state.assumptionResolution,
    readinessEnvelope: state.readinessEnvelope, screeningResult: state.screeningResult,
    topology: topology(state), inputMode: state.inputMode,
    flareNetwork: state.flareNetwork, generatedInputSet: state.generatedInputSet,
  });
}
function entityMap(value) {
  return new Map(value.entityNodes.map((node) => [node.nodeKind === 'SOURCE'
    ? `${node.canonicalId}\u0000${node.caseId ?? ''}` : `${node.canonicalId}\u0000`, node]));
}
function mergedPhysicalNodes(value) {
  const entities = entityMap(value);
  return value.physicalNodes.map((node) => {
    const entity = entities.get(`${node.canonicalId}\u0000${node.nodeKind === 'SOURCE' ? (node.caseId ?? '') : ''}`);
    return { ...entity, ...node, nodeKind: node.nodeKind,
      nodeKey: entity?.nodeKey ?? nodeKey(node), selectionKey: entity?.selectionKey ?? entity?.nodeKey ?? nodeKey(node),
      iconType: entity?.iconType ?? iconType(node), statusGlyphs: entity?.statusGlyphs ?? [], resultSummary: entity?.resultSummary ?? null };
  });
}
function layoutFor(value) {
  if (value.inputMode === AIV_INPUT_MODE.NETWORK_DRIVEN) {
    return createAivCanvasLayout({ nodes: mergedPhysicalNodes(value).map((node, displayOrder) => ({
      nodeKey: node.nodeKey, canonicalId: node.canonicalId, caseId: node.caseId ?? null,
      nodeKind: node.nodeKind, x: node.presentation.x, y: node.presentation.y, displayOrder,
    })) });
  }
  return buildDeterministicAivCanvasLayout({ schema: 'AivCanvasProjection.v1', nodes: value.entityNodes });
}
function positionMap(layout) { return new Map(layout.nodes.map((node) => [node.nodeKey, node])); }
function canonicalPositionMap(nodes, layout) {
  const layoutByKey = positionMap(layout);
  return new Map(nodes.map((node) => [node.canonicalId, layoutByKey.get(node.nodeKey)]));
}
function resultText(node) {
  const result = node.resultSummary;
  if (!result) return '';
  if (node.nodeKind === 'SOURCE') return result.effectiveSourcePwlDb == null ? '' : `<text class="aiv-canvas-node-result" x="0" y="53" text-anchor="middle">${esc(result.effectiveSourcePwlDb)} dB</text>`;
  const parts = [result.combinedPointPwlDb == null ? '' : `${result.combinedPointPwlDb} dB`, result.lof == null ? '' : `LOF ${result.lof}`].filter(Boolean);
  return parts.length ? `<text class="aiv-canvas-node-result" x="0" y="53" text-anchor="middle">${esc(parts.join(' · '))}</text>` : '';
}
function nodeHtml(node, position) {
  const cases = node.caseIds ?? (node.caseId ? [node.caseId] : []);
  return `<g class="aiv-canvas-node is-${esc(text(node.nodeKind).toLowerCase())}" transform="translate(${position.x} ${position.y})" data-aiv-canvas-node="${esc(node.nodeKey)}" data-aiv-selection-key="${esc(node.selectionKey ?? node.nodeKey)}" data-aiv-canvas-node-kind="${esc(node.nodeKind)}" data-aiv-canvas-canonical-id="${esc(node.canonicalId)}" data-aiv-canvas-case-id="${esc(node.caseId ?? '')}" data-aiv-network-canonical-id="${esc(node.canonicalId)}" data-aiv-canvas-x="${position.x}" data-aiv-canvas-y="${position.y}"${filterAttrs(cases, node.line)} tabindex="0" role="button" aria-selected="false">
    ${renderAivCanvasNodeGlyph({ ...node, iconType: iconType(node) })}${renderAivCanvasStatusGlyphs(node.statusGlyphs)}
    <text class="aiv-canvas-node-title" x="0" y="36" text-anchor="middle">${esc(node.tag || node.canonicalId)}</text>
    <text class="aiv-canvas-node-subtitle" x="0" y="44" text-anchor="middle">${esc(node.canonicalId)}</text>${resultText(node)}
  </g>`;
}
function segmentLabel(segment) {
  return segment.engineeringLength ? `${segment.engineeringLength.value} ${segment.engineeringLength.unit}` : 'length unresolved';
}
function physicalSegmentHtml(segment, positions) {
  const from = positions.get(segment.fromNodeId); const to = positions.get(segment.toNodeId);
  if (!from || !to) return '';
  const key = `SEGMENT:${segment.segmentId}`;
  return `<g class="aiv-network-segment${segment.engineeringLength ? '' : ' is-unresolved'}" data-aiv-network-segment="${esc(segment.segmentId)}" data-aiv-canvas-segment="${esc(key)}" data-aiv-selection-key="${esc(key)}" data-aiv-network-from="${esc(segment.fromNodeId)}" data-aiv-network-to="${esc(segment.toNodeId)}"${filterAttrs([], segment.line)} tabindex="0" role="button" aria-selected="false">
    <line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}"></line><text x="${(from.x + to.x) / 2}" y="${(from.y + to.y) / 2 - 7}" text-anchor="middle">${esc(segment.segmentId)} · ${esc(segmentLabel(segment))}</text>
  </g>`;
}
function relationLabel(item) {
  if (item.primitiveKind === 'LOGICAL_RELATIONSHIP') {
    const distance = item.explicitDistance ? `${item.explicitDistance.value} ${item.explicitDistance.unit}` : 'distance unresolved';
    return `${distance} · logical relationship`;
  }
  return item.pathDistanceM == null ? text(item.pathStatus) : `${item.pathDistanceM} m · ${text(item.pathStatus)}`;
}
function relationshipAttrs(item) {
  const source = sourceKey(item.sourceCanonicalId, item.caseId); const assessment = `ASSESSMENT:${item.assessmentCanonicalId}`;
  return ` data-aiv-canvas-relationship="${esc(item.selectionKey)}" data-aiv-selection-key="${esc(item.selectionKey)}" data-aiv-canvas-source-node="${esc(source)}" data-aiv-canvas-assessment-node="${esc(assessment)}" data-aiv-source-canonical-id="${esc(item.sourceCanonicalId)}" data-aiv-assessment-canonical-id="${esc(item.assessmentCanonicalId)}" data-aiv-case-id="${esc(item.caseId)}"${filterAttrs([item.caseId], item.line)} tabindex="0" role="button" aria-selected="false"`;
}
function logicalRelationshipHtml(item, layout) {
  const positions = positionMap(layout); const from = positions.get(sourceKey(item.sourceCanonicalId, item.caseId)); const to = positions.get(`ASSESSMENT:${item.assessmentCanonicalId}`);
  if (!from || !to) return '';
  return `<g class="aiv-canvas-relationship is-logical"${relationshipAttrs(item)} data-aiv-logical-only="true"><line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke-dasharray="8 6"></line><text x="${(from.x + to.x) / 2}" y="${(from.y + to.y) / 2 - 8}" text-anchor="middle">${esc(relationLabel(item))}</text></g>`;
}
function pathRelationshipHtml(item, segmentMap, positions) {
  const lines = item.segmentIds.map((id) => segmentMap.get(id)).filter(Boolean).map((segment) => {
    const from = positions.get(segment.fromNodeId); const to = positions.get(segment.toNodeId);
    return from && to ? `<line data-aiv-path-segment-id="${esc(segment.segmentId)}" data-aiv-path-from="${esc(segment.fromNodeId)}" data-aiv-path-to="${esc(segment.toNodeId)}" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}"></line>` : '';
  }).join('');
  return `<g class="aiv-canvas-relationship is-path-overlay is-${esc(text(item.pathStatus).toLowerCase())}"${relationshipAttrs(item)} data-aiv-path-status="${esc(item.pathStatus)}" data-aiv-path-distance-m="${esc(item.pathDistanceM ?? '')}">${lines}<title>${esc(relationLabel(item))}</title></g>`;
}
function relationshipsHtml(value, layout, physicalNodes) {
  if (value.inputMode !== AIV_INPUT_MODE.NETWORK_DRIVEN) return value.relationships.map((item) => logicalRelationshipHtml(item, layout)).join('');
  const positions = canonicalPositionMap(physicalNodes, layout);
  const segmentMap = new Map(value.physicalSegments.map((segment) => [segment.segmentId, segment]));
  return value.relationships.map((item) => pathRelationshipHtml(item, segmentMap, positions)).join('');
}
function summaryHtml(value) {
  if (!value.lineCaseSummaries.length) return '';
  return `<div class="aiv-canvas-line-summary">${value.lineCaseSummaries.map((item) => `<span>${esc(item.line || 'Unassigned line')} · ${esc(item.caseId || 'Unassigned case')} · non-authoritative trace</span>`).join('')}</div>`;
}
function currentnessHtml(state) {
  const revision = currentAivInputRevision(state);
  if (revision === 0) return '';
  const readinessCurrent = isAivLineageCurrent(state, 'readiness');
  const screeningCurrent = isAivLineageCurrent(state, 'screening');
  if (readinessCurrent && screeningCurrent) {
    return `<div class="aivq-banner is-qualified" data-aiv-canvas-currentness="current"><strong>Engineering revision ${revision} · current.</strong><span>Readiness and registered screening results match the active inputs.</span></div>`;
  }
  const readiness = readinessCurrent ? 'current' : 'needs check';
  const screening = screeningCurrent ? 'current' : 'needs run';
  return `<div class="aivq-banner is-warning" data-aiv-canvas-currentness="stale"><strong>Engineering inputs changed · revision ${revision}.</strong><span>Readiness: ${readiness} · screening/results: ${screening}. Run the missing checks before relying on or exporting results.</span></div>`;
}

export function renderAivUnifiedCanvasWorkspaceHtml(state = {}) {
  const value = projection(state); const networkDriven = value.inputMode === AIV_INPUT_MODE.NETWORK_DRIVEN;
  const physicalNodes = networkDriven ? mergedPhysicalNodes(value) : []; const layout = layoutFor(value); const layoutPositions = positionMap(layout);
  const nodes = networkDriven ? physicalNodes : value.entityNodes; const canonicalPositions = networkDriven ? canonicalPositionMap(physicalNodes, layout) : new Map();
  const physicalSegments = networkDriven ? value.physicalSegments.map((item) => physicalSegmentHtml(item, canonicalPositions)).join('') : '';
  const nodeMarkup = nodes.map((node) => nodeHtml(node, layoutPositions.get(node.nodeKey ?? nodeKey(node)))).join('');
  const relationshipMarkup = relationshipsHtml(value, layout, physicalNodes);
  const modeLabel = networkDriven ? 'NETWORK_DRIVEN · graph authority' : 'TABLE_DRIVEN · table authority';
  return `<section class="aivq-card aiv-canvas-card" data-aiv-unified-canvas="true" data-aiv-input-mode="${esc(value.inputMode)}">
    <div class="aivq-section-head"><div><h4>AIV Network Canvas Editor</h4><p>One SVG is the AIV input editor, topology view, relationship view and registered-result surface.</p></div><div class="aiv-canvas-badges"><span class="aiv-canvas-badge authority">${esc(modeLabel)}</span><span class="aiv-canvas-badge authority">SVG x/y = presentation only</span><span class="aiv-canvas-badge authority">registered results</span></div></div>
    <div class="aiv-canvas-head-actions"><button type="button" class="engineering-console-btn is-active" data-aiv-canvas-mode="NAVIGATE">Navigate</button><button type="button" class="engineering-console-btn" data-aiv-canvas-mode="RELATIONSHIPS">${networkDriven ? 'Inspect paths' : 'Relationships'}</button><button type="button" class="engineering-console-btn" data-aiv-canvas-action="zoom-in">Zoom +</button><button type="button" class="engineering-console-btn" data-aiv-canvas-action="zoom-out">Zoom −</button><button type="button" class="engineering-console-btn" data-aiv-canvas-action="reset-view">Reset view</button></div>
    ${currentnessHtml(state)}${renderAivUnifiedCanvasAuthoringHtml(state)}
    ${renderAivCanvasFilterControls({ nodes, relationships: value.relationships })}
    <div class="aiv-canvas-frame"><svg class="aiv-canvas-svg" data-aiv-canvas-svg="true" data-aiv-unified-canvas-svg="true" viewBox="0 0 900 520" role="img" aria-label="AIV unified network canvas editor"><g data-aiv-canvas-viewport="true">${physicalSegments}${relationshipMarkup}${nodeMarkup}</g></svg></div>
    <div class="aivq-readiness-note"><strong>Authority:</strong> graph edits regenerate calculation tables; physical lengths/path overlays come only from explicit engineering evidence; table mode edits working rows; no SVG distance inference.</div>
    ${summaryHtml(value)}<div data-aiv-canvas-selected-detail-host>${renderAivUnifiedCanvasSelectedDetailHtml(state, state.selectedCanvasKey)}</div>
  </section>`;
}
