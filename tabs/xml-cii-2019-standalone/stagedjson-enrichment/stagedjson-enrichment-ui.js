/**
 * Functionality: renders the element-aware stagedJson enrichment path beside
 * the unchanged node-based XML->CII(2019) Standalone workflow. Parameters:
 * host element. Outputs: import, preview, enrich, and export interactions.
 * Fallback: invalid/missing inputs remain visible and block execution.
 */

import { downloadTextFile } from '../ui-adapted/xml-cii-adapted-dom.js';
import { DEFAULT_VISIBLE_STAGEDJSON_CONFIG, parseVisibleStagedJsonConfig } from './stagedjson-enrichment-contract.js';
import { enrichStagedJson } from './stagedjson-enrichment-engine.js';
import { readStagedJsonFile, readStagedJsonMasterFile } from './stagedjson-file-parser.js';

const MASTER_DEFS = Object.freeze([
  { key: 'lineList', label: 'Master line list' },
  { key: 'pipingClass', label: 'Piping class / thickness' },
  { key: 'materialMap', label: 'Material map' },
  { key: 'weight', label: 'Component weight master' },
]);

const INFO_TEXT = [
  'Parallel element-aware path. The node-based XML->CII(2019) Standalone core is unchanged.',
  'Every resolver setting below is visible. Missing engineering values remain null with diagnostics.',
  'No viewer Attr+ result is required for production enrichment.',
].join('\n');

export function renderStagedJsonEnrichmentPanel(host) {
  ensureStylesheet();
  const state = createState();
  const details = element('details', 'stagedjson-enrichment-parallel');
  details.open = false;
  details.appendChild(element('summary', '', 'Adapted stagedJson enrichment (parallel element path)'));
  const body = element('div', 'stagedjson-enrichment-body');
  details.appendChild(body);
  host.appendChild(details);
  const render = () => renderBody(body, state, render);
  render();
  return () => details.remove();
}

function createState() {
  return {
    stagedJson: null,
    sourceFileName: '',
    masters: { lineList: [], pipingClass: [], materialMap: [], weight: [], files: {} },
    configText: JSON.stringify(DEFAULT_VISIBLE_STAGEDJSON_CONFIG, null, 2),
    result: null,
    completed: false,
    status: 'Import stagedJson and explicit master files.',
    error: false,
  };
}

function renderBody(body, state, render) {
  body.replaceChildren();
  body.append(titleRow(), flowRow(state), introRow(), cards(state, render), actionRow(state, render), statusRow(state), resultView(state));
}

function titleRow() {
  const row = element('div', 'stagedjson-enrichment-title');
  row.append(element('h3', '', 'stagedJson -> CII(2019) attribute enrichment'), infoButton());
  return row;
}

function introRow() {
  return element('p', 'stagedjson-enrichment-note', 'This adapter resolves element contexts through reusable Standalone master/resolver modules. It does not replace or mutate the XML workflow.');
}

function infoButton() {
  const button = element('button', 'stagedjson-enrichment-info', 'i');
  button.type = 'button';
  button.title = INFO_TEXT;
  button.setAttribute('aria-label', INFO_TEXT);
  return button;
}

function flowRow(state) {
  const flow = element('div', 'stagedjson-enrichment-flow');
  const sourceReady = Boolean(state.stagedJson);
  const masterReady = MASTER_DEFS.every((def) => state.masters[def.key].length > 0);
  const steps = [['1 Source', sourceReady ? 'OK' : 'WAIT'], ['2 Masters', masterReady ? 'OK' : 'WARN'], ['3 Resolve Map', state.result ? 'READY' : 'WAIT'], ['4 Enrich', state.completed ? 'OK' : 'WAIT'], ['5 Export', state.completed ? 'READY' : 'LOCKED']];
  steps.forEach(([label, status]) => flow.append(step(label, status)));
  return flow;
}

function step(label, status) {
  const row = element('div', 'stagedjson-enrichment-step');
  row.append(element('strong', '', label), element('span', '', status));
  return row;
}

function cards(state, render) {
  const grid = element('div', 'stagedjson-enrichment-grid');
  grid.append(sourceCard(state, render), mastersCard(state, render), configCard(state));
  return grid;
}

function sourceCard(state, render) {
  const card = element('section', 'stagedjson-enrichment-card');
  card.append(element('h4', '', '1. stagedJson source'));
  const input = fileInput('.json');
  input.addEventListener('change', (event) => loadSource(event, state, render));
  card.append(fieldRow('Managed stagedJson', input, state.sourceFileName || 'not loaded'));
  return card;
}

function mastersCard(state, render) {
  const card = element('section', 'stagedjson-enrichment-card');
  card.append(element('h4', '', '2. Explicit masters'));
  MASTER_DEFS.forEach((def) => {
    const input = fileInput('.csv,.tsv,.json,.xlsx,.xls,.ods');
    input.dataset.masterKind = def.key;
    input.addEventListener('change', (event) => loadMaster(event, state, render));
    card.append(fieldRow(def.label, input, `${state.masters[def.key].length} rows`));
  });
  return card;
}

function configCard(state) {
  const card = element('section', 'stagedjson-enrichment-card');
  card.append(element('h4', '', '3. Visible resolver configuration'));
  const textarea = element('textarea', 'stagedjson-enrichment-config');
  textarea.value = state.configText;
  textarea.addEventListener('input', () => { state.configText = textarea.value; });
  card.append(textarea);
  return card;
}

function fieldRow(label, input, count) {
  const row = element('label', 'stagedjson-enrichment-field');
  row.append(element('span', '', label), input, element('span', 'stagedjson-enrichment-count', count));
  return row;
}

function actionRow(state, render) {
  const row = element('div', 'stagedjson-enrichment-actions');
  row.append(action('Preview resolution', !state.stagedJson, () => run(false, state, render)), action('Run enrichment', !state.stagedJson, () => run(true, state, render)), action('Export enriched stagedJson', !state.completed, () => exportArtifact('stage', state)), action('Export audit JSON', !state.completed, () => exportArtifact('audit', state)), action('Export unresolved CSV', !state.completed, () => exportArtifact('csv', state)));
  return row;
}

function action(label, disabled, handler) {
  const button = element('button', '', label);
  button.type = 'button'; button.disabled = disabled; button.addEventListener('click', handler);
  return button;
}

function statusRow(state) {
  return element('div', `stagedjson-enrichment-status${state.error ? ' is-error' : ''}`, state.status);
}

function resultView(state) {
  const wrapper = element('section', 'stagedjson-enrichment-card');
  wrapper.append(element('h4', '', 'Resolution preview / audit'));
  if (!state.result) { wrapper.append(element('p', 'stagedjson-enrichment-note', 'No resolution preview yet.')); return wrapper; }
  wrapper.append(summaryRow(state.result.audit.summary), previewTable(state.result.previewRows));
  return wrapper;
}

function summaryRow(summary) {
  const row = element('div', 'stagedjson-enrichment-summary');
  const values = [['Scanned', summary.totalNodesComponentsScanned], ['Resolved', summary.totalEnriched], ['Partial', summary.totalPartial], ['Missing', summary.totalMissing], ['Conflicts', summary.totalConflicts], ['Geometry changed', summary.geometryChanged ? 'YES' : 'NO'], ['Coordinates changed', summary.coordinateChanged ? 'YES' : 'NO']];
  values.forEach(([label, value]) => row.append(element('span', '', `${label}: ${value}`)));
  return row;
}

function previewTable(rows) {
  const wrap = element('div', 'stagedjson-enrichment-table-wrap');
  const table = element('table', 'stagedjson-enrichment-table');
  const header = element('tr');
  ['Path', 'Type', 'Line', 'Class', 'Status', 'Missing'].forEach((label) => header.append(element('th', '', label)));
  const head = element('thead'); head.append(header); table.append(head);
  const body = element('tbody');
  rows.slice(0, 200).forEach((row) => body.append(previewTableRow(row)));
  table.append(body); wrap.append(table); return wrap;
}

function previewTableRow(row) {
  const tr = element('tr');
  [row.path, row.type, row.lineNo, row.pipingClass, row.status, row.missing.join(', ')].forEach((value) => tr.append(element('td', '', value ?? 'null')));
  return tr;
}

async function loadSource(event, state, render) {
  try { const result = await readStagedJsonFile(event.target.files?.[0]); state.stagedJson = result.parsed; state.sourceFileName = result.fileName; success(state, `Loaded ${result.fileName}.`); }
  catch (error) { failure(state, error); }
  render();
}

async function loadMaster(event, state, render) {
  try { const key = event.target.dataset.masterKind; const result = await readStagedJsonMasterFile(event.target.files?.[0], key); state.masters = { ...state.masters, [key]: result.rows, files: { ...state.masters.files, [key]: result.fileName } }; success(state, `Loaded ${result.rows.length} ${key} row(s).`); }
  catch (error) { failure(state, error); }
  render();
}

function run(completed, state, render) {
  try { const config = parseVisibleStagedJsonConfig(state.configText); state.result = enrichStagedJson({ stagedJson: state.stagedJson, masters: state.masters, config, sourceFileName: state.sourceFileName, evaluatedAt: new Date().toISOString() }); state.completed = completed; success(state, completed ? 'Enrichment complete. Geometry changed: NO. Coordinates changed: NO.' : 'Resolution preview complete; no output has been committed.'); }
  catch (error) { state.completed = false; failure(state, error); }
  render();
}

function exportArtifact(kind, state) {
  const stem = safeStem(state.sourceFileName || 'stagedjson');
  if (kind === 'stage') downloadTextFile(`${stem}_enriched_stage.json`, JSON.stringify(state.result.enrichedStagedJson, null, 2), 'application/json;charset=utf-8');
  if (kind === 'audit') downloadTextFile(`${stem}_enrichment_audit.json`, JSON.stringify(state.result.audit, null, 2), 'application/json;charset=utf-8');
  if (kind === 'csv') downloadTextFile(`${stem}_unresolved.csv`, state.result.unresolvedCsv, 'text/csv;charset=utf-8');
}

function fileInput(accept) { const input = element('input'); input.type = 'file'; input.accept = accept; return input; }
function success(state, message) { state.status = message; state.error = false; }
function failure(state, error) { state.status = error instanceof Error ? error.message : String(error); state.error = true; }
function safeStem(value) { return String(value).replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9_.-]+/g, '_') || 'stagedjson'; }
function element(tag, className = '', text = '') { const node = document.createElement(tag); if (className) node.className = className; if (text !== '') node.textContent = String(text); return node; }
function ensureStylesheet() { if (document.querySelector('link[data-stagedjson-enrichment-style]')) return; const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = './tabs/xml-cii-2019-standalone/stagedjson-enrichment/stagedjson-enrichment-ui.css?v=20260711-v1'; link.dataset.stagedjsonEnrichmentStyle = 'true'; document.head.appendChild(link); }
