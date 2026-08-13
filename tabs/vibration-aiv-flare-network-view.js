import { renderAivFlareNetworkSvg } from './vibration-aiv-flare-network-svg.js';

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function option(value, label = value) { return `<option value="${esc(value)}">${esc(label)}</option>`; }

function networkStyle() {
  return `<style>
    .aiv-network-editor{display:flex;flex-direction:column;gap:10px;border-color:#0e7490}.aiv-network-authoring-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.aiv-network-authoring-grid fieldset{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;border:1px solid #334155;border-radius:6px}.aiv-network-authoring-grid legend{color:#7dd3fc;font-weight:700}.aiv-network-authoring-grid label{display:flex;flex-direction:column;gap:4px;color:#94a3b8;font-size:11px}.aiv-network-authoring-grid input,.aiv-network-authoring-grid select,.aiv-network-table-wrap input,.aiv-network-table-wrap select{border:1px solid #334155;border-radius:4px;background:#0b1220;color:#e5e7eb;padding:5px}.aiv-network-svg-frame{overflow:auto;border:1px solid #1e293b;border-radius:8px}.aiv-network-table-wrap{overflow:auto}.aiv-network-table-wrap h5{margin:4px 0 6px}.aiv-network-mode{display:flex;gap:8px;align-items:center;padding:8px;border:1px solid #334155;border-radius:6px;color:#94a3b8}.aiv-network-mode strong{color:#e5e7eb}.aiv-network-mode.is-active{border-color:#15803d;background:#09261b}.aiv-network-mode.is-manual{border-color:#92400e;background:#2b1b08}@media(max-width:900px){.aiv-network-authoring-grid{grid-template-columns:1fr}.aiv-network-authoring-grid fieldset{grid-template-columns:1fr}}
  </style>`;
}

function nodeRows(network) {
  if (!network.nodes.length) return '<tr><td colspan="6">No flare-network nodes yet.</td></tr>';
  return network.nodes.map((node) => `<tr>
    <td>${esc(node.canonicalId)}</td><td>${esc(node.kind)}</td><td>${esc(node.tag)}</td><td>${esc(node.line ?? '')}</td>
    <td>${esc(node.sourceInput?.caseId ?? '')}</td>
    <td><button type="button" class="engineering-console-btn" data-aiv-network-delete-node="${esc(node.canonicalId)}">Delete</button></td>
  </tr>`).join('');
}

function segmentRows(network) {
  if (!network.segments.length) return '<tr><td colspan="7">No flare-network pipe segments yet.</td></tr>';
  return network.segments.map((segment) => `<tr>
    <td>${esc(segment.segmentId)}</td><td>${esc(segment.fromNodeId)}</td><td>${esc(segment.toNodeId)}</td><td>${esc(segment.line ?? '')}</td>
    <td><input type="number" min="0" step="any" data-aiv-network-segment-length="${esc(segment.segmentId)}" value="${esc(segment.physicalLength?.value ?? '')}" aria-label="${esc(segment.segmentId)} engineering length"></td>
    <td><select data-aiv-network-segment-unit="${esc(segment.segmentId)}">${['m', 'mm'].map((unit) => `<option value="${unit}"${segment.physicalLength?.unit === unit ? ' selected' : ''}>${unit}</option>`).join('')}</select></td>
    <td><button type="button" class="engineering-console-btn" data-aiv-network-delete-segment="${esc(segment.segmentId)}">Delete</button></td>
  </tr>`).join('');
}

function generatedSummary(state) {
  const generated = state.generatedInputSet;
  if (!generated) return '<span>Generated tables <strong>inactive</strong></span>';
  const unresolved = generated.pathEvidence.filter((item) => item.status !== 'RESOLVED').length;
  return `<span>Sources <strong>${generated.tables.sources.rows.length}</strong></span><span>Assessments <strong>${generated.tables.assessments.rows.length}</strong></span><span>Relationships <strong>${generated.tables.relationships.rows.length}</strong></span><span>Unresolved paths <strong>${unresolved}</strong></span>`;
}

function modeNotice(state) {
  if (state.flareNetworkActive) {
    return '<div class="aiv-network-mode is-active"><strong>AUTO-GENERATED TABLE MODE ACTIVE</strong><span>Network edits regenerate Sources / Assessments / Source→Assessment tables and invalidate stale readiness/results.</span></div>';
  }
  return '<div class="aiv-network-mode is-manual"><strong>TABLE/IMPORT MODE ACTIVE</strong><span>The graph is retained for editing, but current AIV tables are manual/imported. The next graph edit intentionally regenerates all three tables from the network.</span></div>';
}

export function renderAivFlareNetworkAuthoringHtml(state = {}) {
  const network = state.flareNetwork;
  if (!network) return '';
  const nodeOptions = network.nodes.map((node) => option(node.canonicalId, `${node.canonicalId} · ${node.kind}`)).join('');
  return `${networkStyle()}<section class="aivq-card aiv-network-editor" data-aiv-network-editor="true">
    <div class="aivq-section-head"><div><h4>Flare network authoring</h4><p>Draw engineering connectivity here. Pipe length is an explicit segment property; dragging/stretching SVG presentation never changes metres. AIV working tables regenerate automatically after every network edit.</p></div><div class="aiv-canvas-badges"><span class="aiv-canvas-badge authority">graph-authoritative connectivity</span><span class="aiv-canvas-badge authority">explicit segment length</span></div></div>
    ${modeNotice(state)}
    <div class="aivq-benchmark-facts">${generatedSummary(state)}</div>
    <div class="aiv-network-authoring-grid">
      <fieldset><legend>Add network node</legend>
        <label>Canonical ID <input data-aiv-network-new-node-id placeholder="PSV-101 / J-101 / WO-101"></label>
        <label>Kind <select data-aiv-network-new-node-kind>${['SOURCE', 'ASSESSMENT', 'JUNCTION', 'CONNECTION', 'BOUNDARY', 'OFF_PAGE'].map((item) => option(item)).join('')}</select></label>
        <label>Operating Case <input data-aiv-network-new-node-case placeholder="required for Source"></label>
        <label>Line <input data-aiv-network-new-node-line placeholder="flare line ID"></label>
        <label>Tag <input data-aiv-network-new-node-tag placeholder="display tag"></label>
        <button type="button" class="engineering-console-btn primary" data-aiv-network-action="add-node">Add node</button>
      </fieldset>
      <fieldset><legend>Add pipe segment</legend>
        <label>Segment ID <input data-aiv-network-new-segment-id placeholder="FL-P-001"></label>
        <label>From <select data-aiv-network-new-segment-from><option value="">Select…</option>${nodeOptions}</select></label>
        <label>To <select data-aiv-network-new-segment-to><option value="">Select…</option>${nodeOptions}</select></label>
        <label>Engineering length <input type="number" min="0" step="any" data-aiv-network-new-segment-length placeholder="12.4"></label>
        <label>Unit <select data-aiv-network-new-segment-unit>${option('m')}${option('mm')}</select></label>
        <label>Line <input data-aiv-network-new-segment-line placeholder="flare line ID"></label>
        <button type="button" class="engineering-console-btn primary" data-aiv-network-action="add-segment">Connect pipe</button>
      </fieldset>
    </div>
    <div class="aiv-network-svg-frame">${renderAivFlareNetworkSvg(network)}</div>
    <div class="aiv-network-table-wrap"><h5>Network nodes</h5><table class="aivq-input-table"><thead><tr><th>Canonical ID</th><th>Kind</th><th>Tag</th><th>Line</th><th>Case</th><th>Action</th></tr></thead><tbody>${nodeRows(network)}</tbody></table></div>
    <div class="aiv-network-table-wrap"><h5>Pipe segments</h5><table class="aivq-input-table"><thead><tr><th>Segment</th><th>From</th><th>To</th><th>Line</th><th>Engineering length</th><th>Unit</th><th>Action</th></tr></thead><tbody>${segmentRows(network)}</tbody></table></div>
  </section>`;
}
