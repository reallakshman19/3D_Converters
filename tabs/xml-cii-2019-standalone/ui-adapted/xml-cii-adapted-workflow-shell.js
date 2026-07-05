import { defaultXmlCii2019SupportConfigJson } from '../xml-cii-standalone-default-config.js';
import { runXmlCii2019Workflow, validateSupportConfigJson } from '../xml-cii-workflow-api.js';
import { buildXmlCiiWorkflowJobFromUiState, summarizeWorkflowFile } from '../xml-cii-workflow-ui-adapter.js';
import { XML_CII_WORKFLOW_PHASES, getAdaptedWorkflowPhase, normalizeAdaptedWorkflowPhaseId } from './xml-cii-adapted-phase-registry.js';

function node(tag, text, className) { const el = document.createElement(tag); if (className) el.className = className; if (text) el.textContent = text; return el; }
function option(value, text, selected) { const opt = node('option', text); opt.value = value; opt.selected = selected; return opt; }
function addLabel(parent, labelText, control) { const label = node('label'); label.append(labelText + ' ', control); parent.appendChild(label); return control; }
function lineCount(text) { return text ? String(text).split(/\r\n|\r|\n/).length : 0; }
function downloadText(name, text, mime) { const blob = new Blob([String(text || '')], { type: mime || 'text/plain;charset=utf-8' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name || 'xml-cii-2019-output.txt'; a.click(); URL.revokeObjectURL(url); }

function defaultOptions() {
  return { coordsMode: 'first', kgToNewton: true, splitCondensedValveFlange: null, useRestraintTypeBasedOnJson: true, outputMode: 'enriched-only', inputXmlOutputMode: 'full-document', pointPropertiesBasis: 'auto', inputXmlRestraintPolicy: 'replace-with-dtxr-derived-restraints', fillSentinelFromLineContext: true, normalizePressureCaseNames: true, escapeXmlAttributes: true };
}

export function createXmlCiiAdaptedWorkflowState() {
  return { sourceFile: null, stagedJsonFile: null, sourceText: '', elementSideLoadText: '', sourceKind: 'auto', supportConfigJson: defaultXmlCii2019SupportConfigJson(), options: defaultOptions(), activePhaseId: 'regex', running: false, result: null };
}

function renderPhaseRail(root, state) {
  const rail = node('nav', '', 'xml-cii-phase-rail');
  rail.setAttribute('aria-label', 'XML CII workflow phases');
  for (const phase of XML_CII_WORKFLOW_PHASES) {
    const button = node('button', '', 'xml-cii-phase-pill');
    button.type = 'button';
    button.dataset.phase = phase.id;
    button.classList.toggle('is-active', state.activePhaseId === phase.id);
    button.append(node('span', phase.label, 'xml-cii-phase-label'), node('small', phase.summary, 'xml-cii-phase-summary'));
    rail.appendChild(button);
  }
  root.appendChild(rail);
}

function renderSourceControls(card, state) {
  const sourceKind = addLabel(card, 'Source type:', node('select'));
  sourceKind.dataset.field = 'source-kind';
  sourceKind.append(option('auto', 'auto', state.sourceKind === 'auto'), option('xml', 'PSI116 XML', state.sourceKind === 'xml'), option('inputxml', 'Element-based InputXML', state.sourceKind === 'inputxml'));

  const sourceFile = addLabel(card, 'XML / InputXML file:', node('input'));
  sourceFile.type = 'file'; sourceFile.accept = '.xml,.XML,.inputxml'; sourceFile.dataset.field = 'source-file';
  card.appendChild(node('div', summarizeWorkflowFile(state.sourceFile), 'xml-cii-file-summary'));

  const sourceText = addLabel(card, 'InputXML file/text:', node('textarea'));
  sourceText.value = state.sourceText || '';
  sourceText.placeholder = '<PipeStressExport>...</PipeStressExport> or <CAESARII XML_TYPE="Input">...</CAESARII> or <PIPINGELEMENT ... />';
  sourceText.dataset.field = 'source-text';

  const staged = addLabel(card, 'Optional staged JSON:', node('input'));
  staged.type = 'file'; staged.accept = '.json,.JSON'; staged.dataset.field = 'staged-json-file';
  card.appendChild(node('div', summarizeWorkflowFile(state.stagedJsonFile), 'xml-cii-file-summary'));
}

function renderInputXmlControls(card, state) {
  card.appendChild(node('h3', 'InputXML / Element Side-load'));
  card.appendChild(node('p', 'Standalone-only adapted surface for CAESARII InputXML, PIPINGELEMENT fragments, and element side-load text.', 'xml-cii-phase-help'));

  const sideLoad = addLabel(card, 'elementSideLoadText:', node('textarea'));
  sideLoad.value = state.elementSideLoadText || '';
  sideLoad.placeholder = 'ELEMENT 30-40\nLINE_ID=/ASIM-1836-6"-S8810010-91261M7-HC/B1\nDTXR_POS=Pipe Rest XRT01|GUIDE PDO-TYPE-603\nDTXR_PS=PIPE SUPPORT TYPE-103';
  sideLoad.dataset.field = 'element-side-load';

  const inputXmlOutputMode = addLabel(card, 'inputXmlOutputMode:', node('select'));
  inputXmlOutputMode.dataset.field = 'inputxml-output-mode';
  inputXmlOutputMode.append(option('full-document', 'full-document', state.options.inputXmlOutputMode === 'full-document'), option('fragment', 'fragment', state.options.inputXmlOutputMode === 'fragment'));

  const basis = addLabel(card, 'pointPropertiesBasis:', node('select'));
  basis.dataset.field = 'point-properties-basis';
  basis.append(option('auto', 'auto', state.options.pointPropertiesBasis === 'auto'), option('TO', 'TO', state.options.pointPropertiesBasis === 'TO'), option('FROM', 'FROM', state.options.pointPropertiesBasis === 'FROM'));

  const policy = addLabel(card, 'inputXmlRestraintPolicy:', node('select'));
  policy.dataset.field = 'inputxml-restraint-policy';
  for (const value of ['preserve-existing-restraints', 'convert-existing-restraints', 'replace-with-dtxr-derived-restraints', 'merge-existing-and-dtxr-derived-restraints']) policy.append(option(value, value, state.options.inputXmlRestraintPolicy === value));

  const fill = addLabel(card, 'fillSentinelFromLineContext:', node('input'));
  fill.type = 'checkbox'; fill.checked = state.options.fillSentinelFromLineContext; fill.dataset.field = 'fill-sentinel';

  const aliases = addLabel(card, 'normalizePressureCaseNames:', node('input'));
  aliases.type = 'checkbox'; aliases.checked = state.options.normalizePressureCaseNames; aliases.dataset.field = 'pressure-aliases';
}

function renderXmlOptions(card, state) {
  const coords = addLabel(card, 'coordsMode:', node('select'));
  coords.dataset.field = 'coords-mode';
  for (const mode of ['first', 'all', 'none']) coords.append(option(mode, mode, state.options.coordsMode === mode));
  const kg = addLabel(card, 'kgToNewton:', node('input')); kg.type = 'checkbox'; kg.checked = state.options.kgToNewton; kg.dataset.field = 'kg-to-newton';
  const jsonRest = addLabel(card, 'useRestraintTypeBasedOnJson:', node('input')); jsonRest.type = 'checkbox'; jsonRest.checked = state.options.useRestraintTypeBasedOnJson; jsonRest.dataset.field = 'json-restraints';
  const split = addLabel(card, 'splitCondensedValveFlange:', node('select')); split.dataset.field = 'split-condensed';
  const splitVal = state.options.splitCondensedValveFlange === true ? 'true' : state.options.splitCondensedValveFlange === false ? 'false' : 'null';
  split.append(option('null', 'config/default', splitVal === 'null'), option('true', 'force true', splitVal === 'true'), option('false', 'force false', splitVal === 'false'));
}

function renderConfig(card, state) {
  const validation = validateSupportConfigJson(state.supportConfigJson);
  const config = addLabel(card, 'supportConfigJson:', node('textarea'));
  config.value = state.supportConfigJson; config.dataset.field = 'support-config';
  card.appendChild(node('div', validation.ok ? 'JSON valid.' : validation.error, validation.ok ? 'xml-cii-valid' : 'xml-cii-invalid'));
}

function renderRunControls(card, state) {
  const outputMode = addLabel(card, 'Output:', node('select'));
  outputMode.dataset.field = 'output-mode';
  outputMode.append(option('enriched-only', 'enriched-only', state.options.outputMode === 'enriched-only'), option('cii-only', 'cii-only', state.options.outputMode === 'cii-only'), option('both', 'both', state.options.outputMode === 'both'));
  const run = node('button', state.running ? 'Running…' : 'Run standalone workflow');
  run.dataset.action = 'run'; run.disabled = state.running || !validateSupportConfigJson(state.supportConfigJson).ok || (!state.sourceFile && !String(state.sourceText || '').trim());
  const downEnriched = node('button', 'Download enriched'); downEnriched.dataset.action = 'download-enriched'; downEnriched.disabled = !state.result?.enrichedText;
  const downCii = node('button', 'Download CII'); downCii.dataset.action = 'download-cii'; downCii.disabled = !state.result?.ciiText;
  const clear = node('button', 'Clear/reset'); clear.dataset.action = 'clear';
  card.append(run, downEnriched, downCii, clear);
}

function renderActivePhase(root, state) {
  const phase = getAdaptedWorkflowPhase(state.activePhaseId);
  const card = node('section', '', 'xml-cii-standalone-card xml-cii-phase-panel');
  card.dataset.activePhase = phase.id;
  card.append(node('h2', phase.label), node('p', phase.summary, 'xml-cii-phase-help'));
  if (phase.id === 'regex') renderXmlOptions(card, state);
  else if (phase.id === 'import-masters') renderSourceControls(card, state);
  else if (phase.id === 'json-trace') { renderSourceControls(card, state); renderInputXmlControls(card, state); }
  else if (phase.id === 'preview') card.append(node('pre', JSON.stringify({ sourceKind: state.sourceKind, sourceFile: state.sourceFile?.name || null, stagedJsonFile: state.stagedJsonFile?.name || null, sourceTextBytes: String(state.sourceText || '').length, elementSideLoadBytes: String(state.elementSideLoadText || '').length, options: state.options }, null, 2)));
  else if (phase.id === 'diagnostics') card.append(node('pre', state.result?.diagnostics ? JSON.stringify(state.result.diagnostics, null, 2) : 'No diagnostics yet.'));
  else if (phase.id === 'weight-match') card.append(node('p', 'Weight match remains config-driven in the standalone path. Use 8 Config to provide weight/material/rating maps.', 'xml-cii-phase-help'));
  else if (phase.id === 'run') renderRunControls(card, state);
  else if (phase.id === 'support-mapper') card.append(node('pre', validateSupportConfigJson(state.supportConfigJson).ok ? state.supportConfigJson : 'Fix supportConfigJson in 8 Config.'));
  else if (phase.id === 'config') renderConfig(card, state);
  else if (phase.id === 'custom-input') { renderSourceControls(card, state); renderInputXmlControls(card, state); }
  root.appendChild(card);
}

function renderOutput(root, state) {
  const previewText = state.result?.ciiText || state.result?.enrichedText || '';
  const output = node('section', '', 'xml-cii-standalone-output');
  const outBox = node('div'); outBox.append(node('h2', 'Output preview'), node('div', `Output bytes: ${previewText.length.toLocaleString()} | lines: ${lineCount(previewText).toLocaleString()}`, 'xml-cii-file-summary'), node('pre', previewText || 'No output yet.'));
  const logText = [state.result?.error || '', state.result?.diagnostics ? JSON.stringify(state.result.diagnostics, null, 2) : '', ...(state.result?.logs || [])].filter(Boolean).join('\n');
  const logBox = node('div'); logBox.append(node('h2', 'Logs / diagnostics'), node('pre', logText || 'No logs yet.'));
  output.append(outBox, logBox); root.appendChild(output);
}

function bind(container, state, render) {
  const rerender = () => render();
  container.querySelectorAll('[data-phase]').forEach((button) => button.addEventListener('click', () => { state.activePhaseId = normalizeAdaptedWorkflowPhaseId(button.dataset.phase); rerender(); }));
  container.querySelector('[data-field="source-kind"]')?.addEventListener('change', (e) => { state.sourceKind = e.target.value; state.result = null; rerender(); });
  container.querySelector('[data-field="source-file"]')?.addEventListener('change', (e) => { state.sourceFile = e.target.files?.[0] || null; state.result = null; rerender(); });
  container.querySelector('[data-field="staged-json-file"]')?.addEventListener('change', (e) => { state.stagedJsonFile = e.target.files?.[0] || null; state.result = null; rerender(); });
  container.querySelector('[data-field="source-text"]')?.addEventListener('change', (e) => { state.sourceText = e.target.value; state.result = null; });
  container.querySelector('[data-field="element-side-load"]')?.addEventListener('change', (e) => { state.elementSideLoadText = e.target.value; state.result = null; });
  container.querySelector('[data-field="inputxml-output-mode"]')?.addEventListener('change', (e) => { state.options.inputXmlOutputMode = e.target.value; });
  container.querySelector('[data-field="point-properties-basis"]')?.addEventListener('change', (e) => { state.options.pointPropertiesBasis = e.target.value; });
  container.querySelector('[data-field="inputxml-restraint-policy"]')?.addEventListener('change', (e) => { state.options.inputXmlRestraintPolicy = e.target.value; });
  container.querySelector('[data-field="fill-sentinel"]')?.addEventListener('change', (e) => { state.options.fillSentinelFromLineContext = !!e.target.checked; });
  container.querySelector('[data-field="pressure-aliases"]')?.addEventListener('change', (e) => { state.options.normalizePressureCaseNames = !!e.target.checked; });
  container.querySelector('[data-field="coords-mode"]')?.addEventListener('change', (e) => { state.options.coordsMode = e.target.value; });
  container.querySelector('[data-field="kg-to-newton"]')?.addEventListener('change', (e) => { state.options.kgToNewton = !!e.target.checked; });
  container.querySelector('[data-field="json-restraints"]')?.addEventListener('change', (e) => { state.options.useRestraintTypeBasedOnJson = !!e.target.checked; });
  container.querySelector('[data-field="split-condensed"]')?.addEventListener('change', (e) => { state.options.splitCondensedValveFlange = e.target.value === 'true' ? true : e.target.value === 'false' ? false : null; });
  container.querySelector('[data-field="support-config"]')?.addEventListener('change', (e) => { state.supportConfigJson = e.target.value; state.result = null; rerender(); });
  container.querySelector('[data-field="output-mode"]')?.addEventListener('change', (e) => { state.options.outputMode = e.target.value; });
  container.querySelector('[data-action="run"]')?.addEventListener('click', async () => { if (state.running || !validateSupportConfigJson(state.supportConfigJson).ok) return; state.running = true; state.result = null; rerender(); try { state.result = await runXmlCii2019Workflow(await buildXmlCiiWorkflowJobFromUiState(state)); } finally { state.running = false; rerender(); } });
  container.querySelector('[data-action="download-enriched"]')?.addEventListener('click', () => { if (state.result?.enrichedText) downloadText(state.result.enrichedName, state.result.enrichedText, 'application/xml;charset=utf-8'); });
  container.querySelector('[data-action="download-cii"]')?.addEventListener('click', () => { if (state.result?.ciiText) downloadText(state.result.ciiName, state.result.ciiText, 'text/plain;charset=utf-8'); });
  container.querySelector('[data-action="clear"]')?.addEventListener('click', () => { const fresh = createXmlCiiAdaptedWorkflowState(); Object.keys(state).forEach((key) => { delete state[key]; }); Object.assign(state, fresh); rerender(); });
}

export function renderXmlCiiAdaptedWorkflowShell(container, state = createXmlCiiAdaptedWorkflowState()) {
  const render = () => {
    container.innerHTML = '';
    const root = node('section', '', 'xml-cii-standalone-root xml-cii-adapted-workflow-shell');
    const header = node('header', '', 'xml-cii-standalone-header');
    const title = node('div');
    title.append(node('h1', 'XML→CII 2019 Standalone'), node('p', 'Adapted from the XML→CII 2019 phase model; API-first, UI-configurable, and isolated from the Model Converters popup.'));
    header.append(title, node('div', 'Standalone adapted workflow', 'xml-cii-standalone-badge'));
    root.appendChild(header);
    renderPhaseRail(root, state);
    renderActivePhase(root, state);
    renderOutput(root, state);
    container.appendChild(root);
    bind(container, state, render);
  };
  render();
  return () => { container.innerHTML = ''; };
}
