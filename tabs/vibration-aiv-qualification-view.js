import { renderAivInlineSymbol } from './vibration-aiv-inline-symbols.js';

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const COVERAGE = Object.freeze([
  ['AIV-SRC-EI-D2-3-PRESSURE', 'Pressure basis', 'EI D.2.3', 'COVERED', 'Worked example converts gauge conditions to absolute P1/P2 for T2.7.'],
  ['AIV-SRC-EI-D2-3-NONSONIC', 'Non-sonic source branch', 'EI D.2.3', 'COVERED', 'Published relief and recycle cases use SFF = 0.'],
  ['AIV-SRC-EI-D2-3-TRIM', 'Low-noise trim', 'EI D.2.3', 'COVERED', 'Recycle-valve example applies manufacturer noise reduction.'],
  ['AIV-SRC-EI-D2-3-155DB', '155 dB source branch', 'EI D.2.3', 'COVERED', 'Worked example exercises source-level screening branch behavior.'],
  ['AIV-SRC-EI-D2-3-ATTENUATION', 'Downstream discontinuity attenuation', 'EI D.2.3', 'COVERED', 'Relief case evaluates a downstream weldolet after source attenuation.'],
  ['AIV-SRC-EI-D2-3-T2-6', 'T2-6 weldolet assessment chain', 'EI D.2.3', 'COVERED', 'Published geometry/intermediate chain is available for qualification.'],
  ['AIV-SRC-GAP-SONIC-SFF6', 'Sonic SFF = 6 branch', 'Independent benchmark required', 'GAP', 'The controlled D.2.3 cases do not exercise the sonic branch.'],
  ['AIV-SRC-GAP-MULTI-SOURCE', 'Multiple simultaneous sources', 'Independent benchmark required', 'GAP', 'Must be qualified separately before production behavior is adopted.'],
]);

function coverageRows() {
  return COVERAGE.map(([traceId, item, evidence, status, note]) => `<tr><td><code>${esc(traceId)}</code></td><td>${esc(item)}</td><td>${esc(evidence)}</td><td><span class="aivq-status ${status === 'COVERED' ? 'ok' : 'gap'}">${esc(status)}</span></td><td>${esc(note)}</td></tr>`).join('');
}

export function renderAivQualificationWorkspaceHtml() {
  return `<div class="aivq-root">
    <header class="aivq-header"><div><h3>Acoustic-Induced Vibration</h3><p class="aivq-mono">VIB.AIV.ACOUSTIC</p></div><div class="aivq-authority"><strong>BLOCKED</strong><span>NOT SCREENING / NOT DESIGN AUTHORITY</span></div></header>
    <section class="aivq-card aivq-banner"><strong>Qualification workspace only.</strong><span>No numerical AIV kernel is exposed from this surface. Readiness, benchmark execution and screening remain unavailable until issue #441 gates are closed.</span></section>
    <section class="aivq-card"><h4>Controlled source set</h4><div class="aivq-grid">
      <div><small>Qualification issue</small><strong>#441</strong></div>
      <div><small>EI worked-example source</small><strong>Energy-Institute-AVIFF---Worked-Examples.doc.docx</strong><span>Common @ fb549185b9b27edc2379734240320a85c5bef9f6 · blob ceee15ed5f7f320045d5f3979024e2e8664613f2</span></div>
      <div><small>Advanced_Analysis visual lineage</small><strong>Sequential engineering SVG symbols</strong><span>Advanced_Analysis @ 6463b39866f68eb6476bfa41764538eb19f8b9f9</span></div>
      <div><small>Topology authority</small><strong>TopologyEditTableHumanExport.v1</strong><span>Elements + Connections + Source Mapping + Catalogue Evidence + Export Metadata</span></div>
    </div></section>
    <section class="aivq-card"><div class="aivq-section-head"><div><h4>Table-first SVG adaptation</h4><p>SVG is limited to inline engineering glyphs. It does not project coordinates or render plant/model geometry.</p></div></div>
      <div class="aivq-example-table"><table><thead><tr><th>Symbol</th><th>Role</th><th>Example</th><th>Engineering meaning</th></tr></thead><tbody>
        <tr><td>${renderAivInlineSymbol({ type: 'RELIEF_VALVE', role: 'SOURCE' })}</td><td>Acoustic source</td><td>Relief/control/restriction device</td><td>Identity only; process/source calculation remains in the qualified AIV kernel.</td></tr>
        <tr><td>${renderAivInlineSymbol({ type: 'PIPE', role: 'PROPAGATION_PATH' })}</td><td>Propagation path</td><td>Certified connected piping row</td><td>Connectivity evidence only; SVG/pixel distance is never an AIV input.</td></tr>
        <tr><td>${renderAivInlineSymbol({ type: 'OLET', role: 'ASSESSMENT' })}</td><td>Assessment point</td><td>Weldolet / welded discontinuity</td><td>Source identity and assessment identity remain distinct canonical records.</td></tr>
      </tbody></table></div>
    </section>
    <section class="aivq-card"><div class="aivq-section-head"><div><h4>EI D.2.3 qualification coverage</h4><p>Coverage is evidence classification, not screening authority or a confidence score.</p></div></div>
      <div class="aivq-example-table"><table><thead><tr><th>Trace ID</th><th>Method item</th><th>Evidence</th><th>Coverage</th><th>Consequence</th></tr></thead><tbody>${coverageRows()}</tbody></table></div>
    </section>
    <section class="aivq-card"><h4>Permanent UI boundary</h4><ul class="aivq-list"><li>Advanced_Analysis remains topology/model author.</li><li>AIV consumes certified table exchange and separate process/enrichment authorities.</li><li>No 3D viewer, free-form topology canvas, geometry editor or click-on-model calculation workflow is added.</li><li>No AIV PWL, attenuation, LOF, threshold or pass/safe logic is implemented in UI code.</li><li>Missing or ambiguous source-to-assessment mappings fail closed and remain non-numerical.</li></ul></section>
  </div>`;
}
