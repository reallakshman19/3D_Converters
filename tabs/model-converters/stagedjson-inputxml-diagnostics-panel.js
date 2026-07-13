import { CONVERTERS } from './converter-registry.js?v=20260713-stagedjson-inputxml-audit-1';

const CONVERTER_ID = 'stagedjson_to_inputxml';
const EVENT_NAME = 'model-converters:stagedjson-inputxml-diagnostics';
const WRAP_VERSION = 'stagedjson-inputxml-diagnostics/v1';

function text(value) { return String(value ?? '').trim(); }
function esc(value) { return text(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function rows(value) { return Array.isArray(value) ? value : []; }

function ensurePanel(root) {
  let panel = root.querySelector('[data-stagedjson-inputxml-diagnostics-panel]');
  if (panel) return panel;
  panel = document.createElement('details');
  panel.dataset.stagedjsonInputxmlDiagnosticsPanel = 'v1';
  panel.className = 'model-converters-advanced';
  panel.hidden = true;
  const output = root.querySelector('#model-converters-output');
  if (output?.parentNode) output.insertAdjacentElement('afterend', panel);
  else root.appendChild(panel);
  return panel;
}

function renderPanel(panel, diagnostics) {
  const summary = diagnostics?.summary || {};
  const records = rows(diagnostics?.records);
  const warningCount = Number(summary.warning || 0);
  const errorCount = Number(summary.error || 0);
  panel.hidden = false;
  panel.open = warningCount > 0 || errorCount > 0;
  panel.innerHTML = `
    <summary>StagedJSON → InputXML diagnostics — ${Number(summary.total || records.length)} events, ${errorCount} errors, ${warningCount} warnings</summary>
    <div style="padding:8px 0;display:grid;gap:8px;">
      <div class="model-converters-muted">Schema: ${esc(diagnostics?.schema || '')} · Output ready: ${diagnostics?.outputReady === true ? 'yes' : 'no'}</div>
      <div style="overflow:auto;max-height:360px;">
        <table class="model-converters-table" style="width:100%;font-size:12px;">
          <thead><tr><th>Severity</th><th>Code</th><th>Stage</th><th>Source</th><th>Action</th><th>Message</th></tr></thead>
          <tbody>${records.slice(0, 500).map((record) => `
            <tr>
              <td>${esc(record.severity)}</td>
              <td><code>${esc(record.code)}</code></td>
              <td>${esc(record.stage)}</td>
              <td>${esc([record.sourceBranch, record.sourceType, record.sourceIndex === null ? '' : record.sourceIndex].filter((value) => value !== '').join(' / '))}</td>
              <td>${esc(record.action)}</td>
              <td>${esc(record.message)}</td>
            </tr>`).join('')}</tbody>
        </table>
      </div>
      ${records.length > 500 ? `<div class="model-converters-muted">Showing first 500 of ${records.length} records. Download the diagnostics JSON output for the complete ledger.</div>` : ''}
    </div>`;
}

function wrapConverter(root) {
  const converter = Array.isArray(CONVERTERS) ? CONVERTERS.find((entry) => entry?.id === CONVERTER_ID) : null;
  if (!converter || converter.stagedJsonDiagnosticsWrapVersion === WRAP_VERSION) return;
  const run = converter.run;
  if (typeof run !== 'function') return;
  converter.run = async (context) => {
    const response = await run(context);
    root.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: response?.logs?.diagnostics || null }));
    return response;
  };
  converter.stagedJsonDiagnosticsWrapVersion = WRAP_VERSION;
}

export function installStagedJsonInputXmlDiagnosticsPanel(root = globalThis.document) {
  if (!root?.querySelector || !globalThis.document) return () => {};
  wrapConverter(root);
  const panel = ensurePanel(root);
  const select = root.querySelector('#model-converters-select');
  const onDiagnostics = (event) => {
    if (select?.value !== CONVERTER_ID || !event.detail) return;
    renderPanel(panel, event.detail);
  };
  const onSelection = () => {
    panel.hidden = select?.value !== CONVERTER_ID;
    if (select?.value === CONVERTER_ID && !panel.innerHTML) {
      panel.innerHTML = '<summary>StagedJSON → InputXML diagnostics</summary><div class="model-converters-muted" style="padding:8px 0;">Run the converter to populate the structured ledger.</div>';
      panel.hidden = false;
    }
  };
  root.addEventListener(EVENT_NAME, onDiagnostics);
  select?.addEventListener('change', onSelection);
  onSelection();
  return () => {
    root.removeEventListener(EVENT_NAME, onDiagnostics);
    select?.removeEventListener('change', onSelection);
  };
}
