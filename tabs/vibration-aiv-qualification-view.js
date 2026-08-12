import {
  AIV_D23_BENCHMARK_CASES,
  AIV_EI_D23_SOURCE,
  AIV_EI_MAIN_GUIDANCE_SOURCE,
  AIV_METHOD_TRACE_FOUNDATION,
} from '../converters/vibration/aiv/aiv-qualification-evidence.js';
import {
  AIV_EI_EXAMPLES_PDF_SOURCE,
  AIV_EI_WORKED_EXAMPLES_MARKDOWN_SOURCE,
} from '../converters/vibration/aiv/aiv-d23-pdf-revalidation.js';
import { AIV_INDEPENDENT_BENCHMARKS } from '../converters/vibration/aiv/aiv-independent-benchmark-evidence.js';
import { renderAivInlineSymbol } from './vibration-aiv-inline-symbols.js';
import { renderAivInputWorkspaceHtml } from './vibration-aiv-input-view.js';
import { renderAivPromotionReadinessHtml } from './vibration-aiv-promotion-view.js';
import { renderAivReadinessPanelHtml } from './vibration-aiv-readiness-view.js';
import { renderAivResultShellsHtml } from './vibration-aiv-result-view.js';

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
function cell(value) {
  return value === null || value === undefined || value === '' ? '<span class="aivq-empty">—</span>' : esc(value);
}
function evidenceKind(state) {
  return /REQUIRED|PARTIAL|GAP|ERRATA|RECONCILIATION_OPEN/u.test(state) ? 'gap' : 'ok';
}
function sourceLabel(sourceId) {
  if (sourceId === AIV_EI_MAIN_GUIDANCE_SOURCE.sourceId) return 'EI T2.7 main guidance';
  if (sourceId === AIV_EI_D23_SOURCE.sourceId) return 'EI D.2.3 worked example';
  return 'Unresolved source';
}
function coverageRows() {
  return AIV_METHOD_TRACE_FOUNDATION.map((item) => `<tr>
    <td><code>${esc(item.traceId)}</code></td><td>${esc(item.subject)}</td>
    <td>${esc(sourceLabel(item.sourceId))}<br><small>${cell(item.locator)}</small></td>
    <td><span class="aivq-status ${evidenceKind(item.qualificationState)}">${esc(item.qualificationState)}</span></td>
    <td>${item.gaps?.length ? esc(item.gaps.join('; ')) : item.benchmarkIds?.length ? esc(item.benchmarkIds.join('; ')) : '<span class="aivq-empty">—</span>'}</td>
  </tr>`).join('');
}
function benchmarkGap(item) {
  if (item.arithmeticReconciliation?.state === 'OPEN') return 'CONFIGURABLE_FLM1_VARIANCE';
  return item.qualificationGap ?? null;
}
function benchmarkRows() {
  return AIV_D23_BENCHMARK_CASES.map((item) => `<tr>
    <td><code>${esc(item.benchmarkId)}</code></td><td>${esc(item.caseLabel)}</td>
    <td>${cell(item.publishedOutputs?.sourcePwlDb)}</td>
    <td>${cell(item.publishedIntermediates?.assessmentPwlDb)}</td>
    <td>${cell(item.publishedFinal?.LOF)}</td>
    <td>${esc(item.evidenceState)}</td>
    <td>${benchmarkGap(item) ? `<code>${esc(benchmarkGap(item))}</code>` : '<span class="aivq-empty">—</span>'}</td>
  </tr>`).join('');
}
function independentExpected(item) {
  if (item.expected?.sonicPwlDb !== undefined) return `${item.expected.sonicPwlDb} dB`;
  if (item.expected?.combinedPwlDb !== undefined) return `${item.expected.combinedPwlDb} dB`;
  return null;
}
function independentBenchmarkRows() {
  return AIV_INDEPENDENT_BENCHMARKS.map((item) => `<tr>
    <td><code>${esc(item.benchmarkId)}</code></td>
    <td>${esc(item.purpose)}</td>
    <td>${cell(independentExpected(item))}</td>
    <td>${esc(item.requiredTraceIds.join('; '))}</td>
    <td><span class="aivq-status ok">MACHINE_BENCHMARK</span></td>
  </tr>`).join('');
}

export function renderAivQualificationWorkspaceHtml(state = {}) {
  return `<div class="aivq-root">
    <header class="aivq-header"><div><h3>Acoustic-Induced Vibration</h3><p class="aivq-mono">VIB.AIV.ACOUSTIC</p></div><div class="aivq-authority"><strong>BLOCKED</strong><span>BENCHMARK IMPLEMENTATION IN PROGRESS · NOT DESIGN AUTHORITY</span></div></header>
    <section class="aivq-card aivq-banner"><strong>Benchmark qualification workspace.</strong><span>Controlled examples, editable working tables, user-configurable assumptions, readiness and frozen result scopes are available. Human evidence is not a release prerequisite. Product numerical execution remains blocked until the complete 10-stage benchmark path and exact-head validation are implemented.</span></section>
    ${renderAivInputWorkspaceHtml(state)}
    ${renderAivReadinessPanelHtml(state)}
    ${renderAivResultShellsHtml(state)}
    ${renderAivPromotionReadinessHtml(state)}
    <section class="aivq-card"><h4>Controlled source set</h4><div class="aivq-grid">
      <div><small>Qualification issue</small><strong>#441</strong></div>
      <div><small>EI T2.7 main guidance</small><strong>${esc(AIV_EI_MAIN_GUIDANCE_SOURCE.path)}</strong><span>${esc(AIV_EI_MAIN_GUIDANCE_SOURCE.repository)} @ ${esc(AIV_EI_MAIN_GUIDANCE_SOURCE.commit)} · blob ${esc(AIV_EI_MAIN_GUIDANCE_SOURCE.gitBlob)} · ${esc(AIV_EI_MAIN_GUIDANCE_SOURCE.locator)}</span><span>Errata-aware trace retained for benchmark comparison; unresolved method values are represented as visible configurable assumptions.</span></div>
      <div><small>EI worked-example DOCX</small><strong>${esc(AIV_EI_D23_SOURCE.path)}</strong><span>${esc(AIV_EI_D23_SOURCE.repository)} @ ${esc(AIV_EI_D23_SOURCE.commit)} · blob ${esc(AIV_EI_D23_SOURCE.gitBlob)} · ${esc(AIV_EI_D23_SOURCE.locator)}</span></div>
      <div><small>Controlled worked-example Markdown</small><strong>${esc(AIV_EI_WORKED_EXAMPLES_MARKDOWN_SOURCE.path)}</strong><span>${esc(AIV_EI_WORKED_EXAMPLES_MARKDOWN_SOURCE.repository)} @ ${esc(AIV_EI_WORKED_EXAMPLES_MARKDOWN_SOURCE.commit)} · blob ${esc(AIV_EI_WORKED_EXAMPLES_MARKDOWN_SOURCE.gitBlob)} · ${esc(AIV_EI_WORKED_EXAMPLES_MARKDOWN_SOURCE.lineCount)} lines</span><span>Validated PR #445 transcription of all ${esc(AIV_EI_WORKED_EXAMPLES_MARKDOWN_SOURCE.derivedFrom.nonEmptyWordTextNodesTotal)} non-empty DOCX text nodes.</span></div>
      <div><small>EI examples PDF corroboration</small><strong>${esc(AIV_EI_EXAMPLES_PDF_SOURCE.path)}</strong><span>${esc(AIV_EI_EXAMPLES_PDF_SOURCE.repository)} @ ${esc(AIV_EI_EXAMPLES_PDF_SOURCE.commit)} · blob ${esc(AIV_EI_EXAMPLES_PDF_SOURCE.gitBlob)}</span><span>Retained as binary corroborating evidence; readable content authority is provided by the validated DOCX→Markdown transcription.</span></div>
      <div><small>Advanced_Analysis visual lineage</small><strong>Sequential engineering SVG symbols</strong><span>Advanced_Analysis @ 6463b39866f68eb6476bfa41764538eb19f8b9f9</span></div>
      <div><small>Topology authority</small><strong>TopologyEditTableHumanExport.v1</strong><span>Elements + Connections + Source Mapping + Catalogue Evidence + Export Metadata</span></div>
    </div></section>
    <section class="aivq-card"><div class="aivq-section-head"><div><h4>Table-first SVG adaptation</h4><p>SVG is limited to inline engineering glyphs. It does not project coordinates or render plant/model geometry.</p></div></div>
      <div class="aivq-example-table"><table><thead><tr><th>Symbol</th><th>Role</th><th>Example</th><th>Engineering meaning</th></tr></thead><tbody>
        <tr><td>${renderAivInlineSymbol({ type: 'RELIEF_VALVE', role: 'SOURCE' })}</td><td>Acoustic source</td><td>Relief/control/restriction device</td><td>Identity only; process/source calculation remains in the AIV kernel.</td></tr>
        <tr><td>${renderAivInlineSymbol({ type: 'PIPE', role: 'PROPAGATION_PATH' })}</td><td>Propagation path</td><td>Connected piping row</td><td>Connectivity evidence only; SVG/pixel distance is never an AIV input.</td></tr>
        <tr><td>${renderAivInlineSymbol({ type: 'OLET', role: 'ASSESSMENT' })}</td><td>Assessment point</td><td>Weldolet / welded discontinuity</td><td>Source identity and assessment identity remain distinct records.</td></tr>
      </tbody></table></div>
    </section>
    <section class="aivq-card"><div class="aivq-section-head"><div><h4>EI D.2.3 published benchmark evidence</h4><p>These pinned values are benchmark targets. The final relief-weldolet LOF is 0.29. The FLM1 variance is configurable in the assumptions UI: published 1.2133 or recalculated 1.2109758194311824.</p></div></div>
      <div class="aivq-example-table"><table><thead><tr><th>Benchmark</th><th>Case</th><th>Published source PWL (dB)</th><th>Published point PWL (dB)</th><th>Published final LOF</th><th>Evidence state</th><th>Configuration note</th></tr></thead><tbody>${benchmarkRows()}</tbody></table></div>
    </section>
    <section class="aivq-card"><div class="aivq-section-head"><div><h4>Independent analytical benchmark vectors</h4><p>Machine benchmarks cover the sonic SFF=6 branch and simultaneous-source logarithmic combination. No named human acceptance is required.</p></div></div>
      <div class="aivq-example-table"><table><thead><tr><th>Benchmark</th><th>Purpose</th><th>Expected analytical result</th><th>Required EI traces</th><th>Qualification use</th></tr></thead><tbody>${independentBenchmarkRows()}</tbody></table></div>
    </section>
    <section class="aivq-card"><div class="aivq-section-head"><div><h4>AIV trace register</h4><p>Page/flowchart locations remain traceability evidence. Trace gaps do not create human gates; missing values are exposed as configurable assumptions and benchmarked by machine parity.</p></div></div>
      <div class="aivq-example-table"><table><thead><tr><th>Trace ID</th><th>Method item</th><th>Evidence / locator</th><th>Trace state</th><th>Benchmark / gap</th></tr></thead><tbody>${coverageRows()}</tbody></table></div>
    </section>
    <section class="aivq-card"><h4>Permanent UI boundary</h4><ul class="aivq-list"><li>Advanced_Analysis remains topology/model author.</li><li>AIV consumes table exchange and process/device inputs.</li><li>No 3D viewer, free-form topology canvas, geometry editor or click-on-model calculation workflow is added.</li><li>No AIV equations are implemented in UI code; the UI only edits data and assumptions.</li><li>Missing engineering values are resolved from the visible user-configurable assumption profile and exported with results.</li><li><code>designAuthority=false</code>; BENCHMARK_ONLY release does not imply design approval.</li></ul></section>
  </div>`;
}
