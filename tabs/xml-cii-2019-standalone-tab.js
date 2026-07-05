import { defaultXmlCii2019SupportConfigJson } from './xml-cii-2019-standalone/xml-cii-standalone-default-config.js';
import { runXmlCii2019Workflow, validateSupportConfigJson } from './xml-cii-2019-standalone/xml-cii-workflow-api.js';
import { buildXmlCiiWorkflowJobFromUiState, summarizeWorkflowFile } from './xml-cii-2019-standalone/xml-cii-workflow-ui-adapter.js';

function ensureStylesheet() { if (document.querySelector('link[data-xml-cii-standalone-style="true"]')) return; const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = './tabs/xml-cii-2019-standalone-tab.css'; link.dataset.xmlCiiStandaloneStyle = 'true'; document.head.appendChild(link); }
function node(tag, text, className) { const el = document.createElement(tag); if (className) el.className = className; if (text) el.textContent = text; return el; }
function option(value, text, selected) { const opt = node('option', text); opt.value = value; opt.selected = selected; return opt; }
function downloadText(name, text, mime) { const blob = new Blob([String(text || '')], { type: mime || 'text/plain;charset=utf-8' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name || 'xml-cii-2019-output.txt'; a.click(); URL.revokeObjectURL(url); }
function lineCount(text) { return text ? String(text).split(/\r\n|\r|\n/).length : 0; }
function addLabel(parent, labelText, control) { const label = node('label'); label.append(labelText + ' ', control); parent.appendChild(label); return control; }
function defaultOptions() { return { coordsMode: 'first', kgToNewton: true, splitCondensedValveFlange: null, useRestraintTypeBasedOnJson: true, outputMode: 'enriched-only', inputXmlOutputMode: 'full-document', pointPropertiesBasis: 'auto', inputXmlRestraintPolicy: 'replace-with-dtxr-derived-restraints', fillSentinelFromLineContext: true, normalizePressureCaseNames: true, escapeXmlAttributes: true }; }

function renderInputXmlControls(card, state) {
  const output = addLabel(card, 'InputXML output mode:', node('select'));
  output.dataset.field = 'inputxml-output-mode';
  output.append(option('full-document', 'full CAESARII/PIPINGMODEL document', state.options.inputXmlOutputMode === 'full-document'), option('fragment', 'PIPINGELEMENT fragment', state.options.inputXmlOutputMode === 'fragment'));
  const basis = addLabel(card, 'Point properties basis:', node('select'));
  basis.dataset.field = 'point-properties-basis';
  basis.append(option('auto', 'auto', state.options.pointPropertiesBasis === 'auto'), option('TO', 'TO', state.options.pointPropertiesBasis === 'TO'), option('FROM', 'FROM', state.options.pointPropertiesBasis === 'FROM'));
  const policy = addLabel(card, 'Restraint policy:', node('select'));
  policy.dataset.field = 'inputxml-restraint-policy';
  const policies = [
    ['preserve-existing-restraints', 'Preserve existing restraints'],
    ['convert-existing-restraints', 'Convert existing restraints'],
    ['replace-with-dtxr-derived-restraints', 'Replace with DTXR-derived restraints'],
    ['merge-existing-and-dtxr-derived-restraints', 'Merge existing + DTXR-derived restraints'],
  ];
  for (const [value, label] of policies) policy.append(option(value, label, state.options.inputXmlRestraintPolicy === value));
  const fill = addLabel(card, 'Fill missing/sentinel values from line context', node('input')); fill.type = 'checkbox'; fill.checked = state.options.fillSentinelFromLineContext; fill.dataset.field = 'fill-sentinel';
  const aliases = addLabel(card, 'Normalize PRESSURE1..9 aliases', node('input')); aliases.type = 'checkbox'; aliases.checked = state.options.normalizePressureCaseNames; aliases.dataset.field = 'pressure-aliases';
}

function render(container, state) {
  const validation = validateSupportConfigJson(state.supportConfigJson);
  const isInputXml = state.sourceKind === 'inputxml' || state.result?.sourceKind === 'inputxml';
  container.innerHTML = '';
  const root = node('section', '', 'xml-cii-standalone-root');
  const header = node('header', '', 'xml-cii-standalone-header');
  const title = node('div');
  title.append(node('h1', 'XML→CII 2019 Standalone'), node('p', 'Reusable workflow API first; this tab is the first UI consumer.'));
  header.append(title, node('div', 'Standalone compatibility engine', 'xml-cii-standalone-badge'));
  root.appendChild(header);

  const grid = node('div', '', 'xml-cii-standalone-grid');
  const inputCard = node('section', '', 'xml-cii-standalone-card');
  inputCard.appendChild(node('h2', 'Input'));
  const sourceKind = addLabel(inputCard, 'Source type:', node('select'));
  sourceKind.dataset.field = 'source-kind';
  sourceKind.append(option('auto', 'Auto detect', state.sourceKind === 'auto'), option('xml', 'PSI116 XML', state.sourceKind === 'xml'), option('inputxml', 'Element-based InputXML', state.sourceKind === 'inputxml'));
  const sourceFile = addLabel(inputCard, isInputXml ? 'Input: Element-based InputXML' : 'Input: PSI116 XML', node('input'));
  sourceFile.type = 'file'; sourceFile.accept = '.xml,.XML,.inputxml'; sourceFile.dataset.field = 'source-file';
  inputCard.appendChild(node('div', summarizeWorkflowFile(state.sourceFile), 'xml-cii-file-summary'));
  if (!isInputXml) {
    const staged = addLabel(inputCard, 'Optional staged JSON:', node('input'));
    staged.type = 'file'; staged.accept = '.json,.JSON'; staged.dataset.field = 'staged-json-file';
    inputCard.appendChild(node('div', summarizeWorkflowFile(state.stagedJsonFile), 'xml-cii-file-summary'));
  } else {
    const sideLoad = addLabel(inputCard, 'Element side-load text:', node('textarea'));
    sideLoad.value = state.elementSideLoadText || '';
    sideLoad.placeholder = 'ELEMENT 20-30\nDTXR_POS=Pipe Rest XRT01\nDTXR_PS=PIPE SUPPORT TYPE-103';
    sideLoad.dataset.field = 'element-side-load';
    inputCard.appendChild(node('div', 'Use ELEMENT 20-30 blocks or key plus DTXR_POS/DTXR_PS XML-style lines.', 'xml-cii-file-summary'));
  }

  const optCard = node('section', '', 'xml-cii-standalone-card');
  optCard.appendChild(node('h2', 'Options'));
  if (!isInputXml) {
    const coords = addLabel(optCard, 'Coords mode:', node('select'));
    coords.dataset.field = 'coords-mode';
    for (const mode of ['first', 'all', 'none']) coords.append(option(mode, mode, state.options.coordsMode === mode));
    const kg = addLabel(optCard, 'kg to Newton weight scale', node('input')); kg.type = 'checkbox'; kg.checked = state.options.kgToNewton; kg.dataset.field = 'kg-to-newton';
    const jsonRest = addLabel(optCard, 'use restraint type based on JSON', node('input')); jsonRest.type = 'checkbox'; jsonRest.checked = state.options.useRestraintTypeBasedOnJson; jsonRest.dataset.field = 'json-restraints';
    const split = addLabel(optCard, 'Split condensed valve/flange:', node('select')); split.dataset.field = 'split-condensed';
    const splitVal = state.options.splitCondensedValveFlange === true ? 'true' : state.options.splitCondensedValveFlange === false ? 'false' : 'null';
    split.append(option('null', 'config/default', splitVal === 'null'), option('true', 'force on', splitVal === 'true'), option('false', 'force off', splitVal === 'false'));
  } else {
    renderInputXmlControls(optCard, state);
  }
  const outputMode = addLabel(optCard, 'Output:', node('select')); outputMode.dataset.field = 'output-mode';
  outputMode.append(option('enriched-only', 'Enriched ' + (isInputXml ? 'InputXML' : 'XML') + ' only', state.options.outputMode === 'enriched-only'), option('cii-only', 'CII only', state.options.outputMode === 'cii-only'), option('both', 'Both', state.options.outputMode === 'both'));

  const configCard = node('section', '', 'xml-cii-standalone-card');
  configCard.appendChild(node('h2', 'Support/config JSON'));
  const textarea = node('textarea'); textarea.value = state.supportConfigJson; textarea.dataset.field = 'support-config';
  configCard.append(textarea, node('div', validation.ok ? 'JSON valid.' : validation.error, validation.ok ? 'xml-cii-valid' : 'xml-cii-invalid'));

  const runCard = node('section', '', 'xml-cii-standalone-card');
  runCard.appendChild(node('h2', 'Run'));
  const previewText = state.result?.ciiText || state.result?.enrichedText || '';
  runCard.append(node('div', 'Output bytes: ' + previewText.length.toLocaleString()), node('div', 'Output lines: ' + lineCount(previewText).toLocaleString()));
  const run = node('button', state.running ? 'Running…' : 'Run workflow'); run.dataset.action = 'run'; run.disabled = !state.sourceFile || state.running || !validation.ok;
  const downEnriched = node('button', 'Download enriched'); downEnriched.dataset.action = 'download-enriched'; downEnriched.disabled = !state.result?.enrichedText;
  const downCii = node('button', 'Download CII'); downCii.dataset.action = 'download-cii'; downCii.disabled = !state.result?.ciiText;
  const clear = node('button', 'Clear/reset'); clear.dataset.action = 'clear';
  runCard.append(run, downEnriched, downCii, clear);
  grid.append(inputCard, optCard, configCard, runCard);
  root.appendChild(grid);

  const output = node('section', '', 'xml-cii-standalone-output');
  const outBox = node('div'); outBox.append(node('h2', 'Output preview'), node('pre', previewText || 'No output yet.'));
  const logText = [state.result?.error || '', state.result?.diagnostics ? JSON.stringify(state.result.diagnostics, null, 2) : '', ...(state.result?.logs || [])].filter(Boolean).join('\n');
  const logBox = node('div'); logBox.append(node('h2', 'Logs / diagnostics'), node('pre', logText || 'No logs yet.'));
  output.append(outBox, logBox); root.appendChild(output); container.appendChild(root);
  bind(container, state);
}

function bind(container, state) {
  const rerender = () => render(container, state);
  container.querySelector('[data-field="source-kind"]')?.addEventListener('change', (e) => { state.sourceKind = e.target.value; state.result = null; rerender(); });
  container.querySelector('[data-field="source-file"]')?.addEventListener('change', (e) => { state.sourceFile = e.target.files?.[0] || null; state.result = null; rerender(); });
  container.querySelector('[data-field="staged-json-file"]')?.addEventListener('change', (e) => { state.stagedJsonFile = e.target.files?.[0] || null; state.result = null; rerender(); });
  container.querySelector('[data-field="element-side-load"]')?.addEventListener('change', (e) => { state.elementSideLoadText = e.target.value; state.result = null; });
  container.querySelector('[data-field="coords-mode"]')?.addEventListener('change', (e) => { state.options.coordsMode = e.target.value; });
  container.querySelector('[data-field="kg-to-newton"]')?.addEventListener('change', (e) => { state.options.kgToNewton = !!e.target.checked; });
  container.querySelector('[data-field="json-restraints"]')?.addEventListener('change', (e) => { state.options.useRestraintTypeBasedOnJson = !!e.target.checked; });
  container.querySelector('[data-field="split-condensed"]')?.addEventListener('change', (e) => { state.options.splitCondensedValveFlange = e.target.value === 'true' ? true : e.target.value === 'false' ? false : null; });
  container.querySelector('[data-field="inputxml-output-mode"]')?.addEventListener('change', (e) => { state.options.inputXmlOutputMode = e.target.value; });
  container.querySelector('[data-field="point-properties-basis"]')?.addEventListener('change', (e) => { state.options.pointPropertiesBasis = e.target.value; });
  container.querySelector('[data-field="inputxml-restraint-policy"]')?.addEventListener('change', (e) => { state.options.inputXmlRestraintPolicy = e.target.value; });
  container.querySelector('[data-field="fill-sentinel"]')?.addEventListener('change', (e) => { state.options.fillSentinelFromLineContext = !!e.target.checked; });
  container.querySelector('[data-field="pressure-aliases"]')?.addEventListener('change', (e) => { state.options.normalizePressureCaseNames = !!e.target.checked; });
  container.querySelector('[data-field="output-mode"]')?.addEventListener('change', (e) => { state.options.outputMode = e.target.value; });
  container.querySelector('[data-field="support-config"]')?.addEventListener('change', (e) => { state.supportConfigJson = e.target.value; state.result = null; rerender(); });
  container.querySelector('[data-action="run"]')?.addEventListener('click', async () => { if (!state.sourceFile || state.running || !validateSupportConfigJson(state.supportConfigJson).ok) return; state.running = true; state.result = null; rerender(); try { state.result = await runXmlCii2019Workflow(await buildXmlCiiWorkflowJobFromUiState(state)); } finally { state.running = false; rerender(); } });
  container.querySelector('[data-action="download-enriched"]')?.addEventListener('click', () => { if (state.result?.enrichedText) downloadText(state.result.enrichedName, state.result.enrichedText, 'application/xml;charset=utf-8'); });
  container.querySelector('[data-action="download-cii"]')?.addEventListener('click', () => { if (state.result?.ciiText) downloadText(state.result.ciiName, state.result.ciiText, 'text/plain;charset=utf-8'); });
  container.querySelector('[data-action="clear"]')?.addEventListener('click', () => { state.sourceFile = null; state.stagedJsonFile = null; state.elementSideLoadText = ''; state.supportConfigJson = defaultXmlCii2019SupportConfigJson(); state.options = defaultOptions(); state.result = null; state.running = false; rerender(); });
}

export function renderXmlCii2019StandaloneTab(container) { ensureStylesheet(); const state = { sourceFile: null, stagedJsonFile: null, elementSideLoadText: '', sourceKind: 'auto', supportConfigJson: defaultXmlCii2019SupportConfigJson(), options: defaultOptions(), running: false, result: null }; render(container, state); return () => { container.innerHTML = ''; }; }
