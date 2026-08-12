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
import { renderAivReadinessPanelHtml } from './vibration-aiv-readiness-view.js';

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
  if (item.arithmeticReconciliation?.state === 'OPEN') return 'PUBLISHED_FLM1_ARITHMETIC_RECONCILIATION_REQUIRED';
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
    <td><span class="aivq-status gap">${esc(item.reviewState)}</span></td>
  </tr>`).join('');
}

export function renderAivQualificationWorkspaceHtml(state = {}) {
  return `<div class="aivq-root">
    <header class="aivq-header"><div><h3>Acoustic-Induced Vibration</h3><p class="aivq-mono">VIB.AIV.ACOUSTIC</p></div><div class="aivq-authority"><strong>BLOCKED</strong><span>NOT SCREENING / NOT DESIGN AUTHORITY</span></div></header>
    <section class="aivq-card aivq-banner"><strong>Qualification workspace only.</strong><span>Controlled benchmark inputs, editable working tables, non-numerical readiness and published-reference evidence are available. Benchmark calculation, screening and production AIV numerical results remain unavailable until issue #441 gates are closed.</span></section>
    ${renderAivInputWorkspaceHtml(state)}
    ${renderAivReadinessPanelHtml(state)}
    <section class="aivq-card"><h4>Controlled source set</h4><div class="aivq-grid">
      <div><small>Qualification issue</small><strong>#441</strong></div>
      <div><small>EI T2.7 main guidance</small><strong>${esc(AIV_EI_MAIN_GUIDANCE_SOURCE.path)}</strong><span>${esc(AIV_EI_MAIN_GUIDANCE_SOURCE.repository)} @ ${esc(AIV_EI_MAIN_GUIDANCE_SOURCE.commit)} · blob ${esc(AIV_EI_MAIN_GUIDANCE_SOURCE.gitBlob)} · ${esc(AIV_EI_MAIN_GUIDANCE_SOURCE.locator)}</span><span>Page ${esc(AIV_EI_MAIN_GUIDANCE_SOURCE.officialErrata.aivRelevantPage)} errata reconciliation required before equation transcription.</span></div>
      <div><small>EI worked-example DOCX</small><strong>${esc(AIV_EI_D23_SOURCE.path)}</strong><span>${esc(AIV_EI_D23_SOURCE.repository)} @ ${esc(AIV_EI_D23_SOURCE.commit)} · blob ${esc(AIV_EI_D23_SOURCE.gitBlob)} · ${esc(AIV_EI_D23_SOURCE.locator)}</span></div>
      <div><small>Controlled worked-example Markdown</small><strong>${esc(AIV_EI_WORKED_EXAMPLES_MARKDOWN_SOURCE.path)}</strong><span>${esc(AIV_EI_WORKED_EXAMPLES_MARKDOWN_SOURCE.repository)} @ ${esc(AIV_EI_WORKED_EXAMPLES_MARKDOWN_SOURCE.commit)} · blob ${esc(AIV_EI_WORKED_EXAMPLES_MARKDOWN_SOURCE.gitBlob)} · ${esc(AIV_EI_WORKED_EXAMPLES_MARKDOWN_SOURCE.lineCount)} lines</span><span>Validated PR #445 transcription of all ${esc(AIV_EI_WORKED_EXAMPLES_MARKDOWN_SOURCE.derivedFrom.nonEmptyWordTextNodesTotal)} non-empty DOCX text nodes.</span></div>
      <div><small>EI examples PDF corroboration</small><strong>${esc(AIV_EI_EXAMPLES_PDF_SOURCE.path)}</strong><span>${esc(AIV_EI_EXAMPLES_PDF_SOURCE.repository)} @ ${esc(AIV_EI_EXAMPLES_PDF_SOURCE.commit)} · blob ${esc(AIV_EI_EXAMPLES_PDF_SOURCE.gitBlob)}</span><span>Retained as binary corroborating evidence; readable content authority is provided by the validated DOCX→Markdown transcription.</span></div>
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
    <section class="aivq-card"><div class="aivq-section-head"><div><h4>EI D.2.3 published benchmark evidence</h4><p>These are pinned published-reference values, not outputs from the production AIV calculator. The final relief-weldolet LOF is published as 0.29; FLM1 arithmetic reconciliation remains open.</p></div></div>
      <div class="aivq-example-table"><table><thead><tr><th>Benchmark</th><th>Case</th><th>Published source PWL (dB)</th><th>Published point PWL (dB)</th><th>Published final LOF</th><th>Evidence state</th><th>Open gap</th></tr></thead><tbody>${benchmarkRows()}</tbody></table></div>
    </section>
    <section class="aivq-card"><div class="aivq-section-head"><div><h4>Independent analytical benchmark vectors</h4><p>Qualification-only vectors cover the sonic SFF=6 branch and simultaneous-source logarithmic combination. Values remain pending named human acceptance against reviewed EI traces.</p></div></div>
      <div class="aivq-example-table"><table><thead><tr><th>Benchmark</th><th>Purpose</th><th>Expected analytical result</th><th>Required EI traces</th><th>Review state</th></tr></thead><tbody>${independentBenchmarkRows()}</tbody></table></div>
    </section>
    <section class="aivq-card"><div class="aivq-section-head"><div><h4>AIV qualification trace register</h4><p>Page/flowchart locations and controlled worked-example transcription evidence are visible while human source reconciliation remains pending. Trace state is not a confidence score or screening classification.</p></div></div>
      <div class="aivq-example-table"><table><thead><tr><th>Trace ID</th><th>Method item</th><th>Evidence / locator</th><th>Qualification state</th><th>Benchmark / gap</th></tr></thead><tbody>${coverageRows()}</tbody></table></div>
    </section>
    <section class="aivq-card"><h4>Permanent UI boundary</h4><ul class="aivq-list"><li>Advanced_Analysis remains topology/model author.</li><li>AIV consumes certified table exchange and separate process/device authorities.</li><li>No 3D viewer, free-form topology canvas, geometry editor or click-on-model calculation workflow is added.</li><li>No AIV PWL equation, attenuation equation, LOF equation, threshold assessment or pass/safe logic is implemented in UI code.</li><li>Missing or ambiguous source-to-assessment mappings fail closed and remain non-numerical.</li></ul></section>
  </div>`;
}
