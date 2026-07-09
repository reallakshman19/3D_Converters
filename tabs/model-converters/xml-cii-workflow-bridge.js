/**
 * XML->CII(2019) Workflow bridge boundary.
 *
 * Keep this import URL aligned with ModelConvertersTab.js. If the URL differs,
 * the browser creates a second legacy-adapter module instance and the workflow
 * button cannot see the phase bridge populated by renderModelConvertersTab().
 */

import { getXmlCiiPhaseBridge } from './legacy-adapter.js?v=20260708-workflow-bridge-align-1';
import { xmlCiiWorkflowRequestFinalRun } from './xml-cii-workflow-runner.js?v=20260624-workflow1-workflow2-1';
import { renderXmlCiiTopology5BPanel } from './xml-cii-topology-5b-panel.js?v=20260709-native-5b-2';
import { renderXmlCiiTopology5CPanel } from './xml-cii-topology-5c-panel.js?v=20260709-5c-ui-2';

let snapshotGeneration = 0;
let snapshotCache = { key: '', value: null, createdAt: 0 };
const SNAPSHOT_TTL_MS = 5000;
const XML_CII_5C_STATE_KEY = '__xmlCiiTopology5CState';
let jsonTraceBuildPatchInstalled = false;
let jsonTraceAutoBuildSignature = '';
let inputXml5CDownloadPatchInstalled = false;
let inputXml5CDownloadPatchQueued = false;

function nowMs() { return Date.now ? Date.now() : 0; }
function text(value) { return value === undefined || value === null ? '' : String(value).trim(); }
function phaseKey(root) { return root?.dataset?.selectedPhase || 'regex'; }
function snapshotKey(root) { return `${snapshotGeneration}|${phaseKey(root)}`; }
function clearSnapshotCache() { snapshotGeneration += 1; snapshotCache = { key: '', value: null, createdAt: 0 }; }

function esc(value) {
  return text(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}

function compactTopologyTable(rows, emptyText) {
  const columns = [
    ['path', 'Path'],
    ['status', 'Status'],
    ['branchName', 'Branch'],
    ['fromNodeNumber', 'From'],
    ['toNodeNumber', 'To'],
    ['componentType', 'Type'],
    ['componentRefNo', 'ComponentRefNo'],
    ['endpoint', 'Endpoint'],
    ['lengthMm', 'Length mm'],
    ['reason', 'Reason'],
    ['message', 'Message'],
  ];
  if (!rows.length) return `<div class="model-converters-workflow-detail-note">${esc(emptyText || 'No topology rows available.')}</div>`;
  return `<div class="xml-cii-native-table-wrap"><table class="xml-cii-native-table"><thead><tr>${columns.map(([, label]) => `<th>${esc(label)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${columns.map(([key]) => `<td>${esc(row?.[key] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

function jsonTraceSnapshot() {
  try { return window.xmlCiiJsonTraceState?.getSnapshot?.() || {}; } catch { return {}; }
}

function jsonTraceSignature(current) {
  const staged = text(current?.stagedJsonText);
  if (!staged) return '';
  return [current?.sourceFileName || '', staged.length, staged.slice(0, 64), staged.slice(-64)].join('|');
}

function injectJsonTraceBuildButton(scope = document) {
  if (typeof document === 'undefined') return null;
  let injected = null;
  scope.querySelectorAll?.('.json-trace-section-head').forEach((head) => {
    if (!/JsonNode\s+Trace\s+tree/i.test(head.textContent || '')) return;
    if (head.querySelector('[data-json-trace-build-tree]')) { injected = head.querySelector('[data-json-trace-build-tree]'); return; }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'json-trace-ghost-btn';
    button.dataset.jsonTraceBuildTree = 'true';
    button.textContent = 'Build Json trace';
    const actions = head.querySelector('.json-trace-section-actions') || head;
    const before = actions.querySelector('[data-json-trace-export-tree]');
    if (before) actions.insertBefore(button, before);
    else actions.appendChild(button);
    injected = button;
  });
  return injected;
}

function runJsonTraceBuildButton(button) {
  const scope = button?.closest?.('.json-trace-dashboard') || document;
  const parseButton = scope?.querySelector?.('[data-json-trace-parse]:not([data-json-trace-build-tree])') || document.querySelector('[data-json-trace-parse]:not([data-json-trace-build-tree])');
  if (parseButton && parseButton !== button) parseButton.click();
}

function maybeAutoBuildJsonTrace(scope = document) {
  const current = jsonTraceSnapshot();
  const signature = jsonTraceSignature(current);
  if (!signature || signature === jsonTraceAutoBuildSignature) return;
  const button = injectJsonTraceBuildButton(scope);
  if (!button) return;
  jsonTraceAutoBuildSignature = signature;
  setTimeout(() => runJsonTraceBuildButton(button), 0);
}

function installJsonTraceBuildPatch() {
  if (jsonTraceBuildPatchInstalled || typeof document === 'undefined') return;
  jsonTraceBuildPatchInstalled = true;
  const scan = () => {
    document.querySelectorAll('.json-trace-dashboard').forEach((dashboard) => {
      injectJsonTraceBuildButton(dashboard);
      maybeAutoBuildJsonTrace(dashboard);
    });
  };
  document.addEventListener('click', (event) => {
    const button = event.target?.closest?.('[data-json-trace-build-tree]');
    if (!button) return;
    event.preventDefault?.();
    runJsonTraceBuildButton(button);
  }, true);
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(scan);
    observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
  }
  setTimeout(scan, 0);
}

function parseJson(value) {
  try {
    const parsed = JSON.parse(String(value || '{}'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function renderTopologyPhaseInto(target) {
  const payload = parseJson(window.localStorage?.getItem('xmlCii2019.matchedPreview.lastDiagnostics.v1') || '{}');
  const audit = payload?.topologyAudit && typeof payload.topologyAudit === 'object' ? payload.topologyAudit : { rows: [], disconnectedRows: [], stats: {}, schema: '' };
  const rows = Array.isArray(audit.rows) ? audit.rows : [];
  const disconnectedRows = Array.isArray(audit.disconnectedRows) ? audit.disconnectedRows : rows.filter((row) => row?.status === 'DISCONNECTED' || row?.status === 'ORPHAN');
  const stats = audit.stats || {};
  const disconnectedCount = Number(stats.topologyDisconnectedRows || disconnectedRows.length || 0);
  target.innerHTML = `
    <div class="xml-cii-native-phase-head"><div><div class="model-converters-workflow-detail-title">5B Topology</div><div class="model-converters-workflow-detail-text">Native POS-only 5B workbench driven by current workflow XML, plus legacy enriched XML/InputXML continuity audit.</div></div></div>
    <div data-xml-cii-topology5b-native></div>
    <section class="xml-cii-native-card">
      <div class="model-converters-workflow-section-title">Legacy topology audit</div>
      <div class="xml-cii-native-toolbar" style="margin-bottom:8px;"><button type="button" class="model-converters-run-btn" data-xml-cii-build-topology>Build Topology Audit</button><button type="button" class="model-converters-download-btn" data-xml-cii-refresh-topology>Refresh latest audit</button><span class="xml-cii-native-status-text" data-xml-cii-topology-status>${rows.length ? 'Latest audit loaded.' : 'No audit loaded yet.'}</span></div>
      <div class="xml-cii-native-status-list">
        <div class="xml-cii-native-status-row ${rows.length ? 'is-ok' : 'is-warn'}"><span class="xml-cii-native-status-icon">${rows.length ? 'OK' : 'WARN'}</span><span>Latest topology audit</span><strong>${esc(audit.schema || 'not run')}</strong></div>
        <div class="xml-cii-native-status-row ${Number(stats.topologyAuditPath1Rows || 0) > 0 ? 'is-ok' : 'is-warn'}"><span class="xml-cii-native-status-icon">${Number(stats.topologyAuditPath1Rows || 0) > 0 ? 'OK' : 'WARN'}</span><span>Path 1 UXML rows</span><strong>${Number(stats.topologyAuditPath1Rows || 0).toLocaleString()}</strong></div>
        <div class="xml-cii-native-status-row ${Number(stats.topologyAuditPath2Rows || 0) > 0 ? 'is-ok' : 'is-warn'}"><span class="xml-cii-native-status-icon">${Number(stats.topologyAuditPath2Rows || 0) > 0 ? 'OK' : 'WARN'}</span><span>Path 2 InputXML rows</span><strong>${Number(stats.topologyAuditPath2Rows || 0).toLocaleString()}</strong></div>
        <div class="xml-cii-native-status-row ${disconnectedCount === 0 ? 'is-ok' : 'is-warn'}"><span class="xml-cii-native-status-icon">${disconnectedCount === 0 ? 'OK' : 'WARN'}</span><span>Disconnected / orphan</span><strong>${disconnectedCount.toLocaleString()}</strong></div>
      </div>
      <div class="xml-cii-native-hint">Build Topology Audit runs the existing Finalise/Run path because topology is generated from the final enriched XML used by the CII worker.</div>
    </section>
    <section class="xml-cii-native-card"><div class="model-converters-workflow-section-title">Disconnected / Orphan Nodes</div>${compactTopologyTable(disconnectedRows.slice(0, 500), 'No disconnected/orphan nodes found in the latest topology audit.')}</section>
    <section class="xml-cii-native-card"><div class="model-converters-workflow-section-title">All Topology Rows</div>${compactTopologyTable(rows.slice(0, 500), 'No topology rows loaded. Run XML→CII to generate topology diagnostics.')}</section>`;
  const nativePanel = target.querySelector('[data-xml-cii-topology5b-native]');
  if (nativePanel) renderXmlCiiTopology5BPanel(nativePanel, { root: target.closest?.('[data-xml-cii-workflow-root]') || target.closest?.('.model-converters-root') || document, anchorNode: '210' });
  target.querySelector('[data-xml-cii-refresh-topology]')?.addEventListener('click', () => renderTopologyPhaseInto(target));
  target.querySelector('[data-xml-cii-build-topology]')?.addEventListener('click', () => {
    const status = target.querySelector('[data-xml-cii-topology-status]');
    if (status) status.textContent = 'Starting Finalise/Run to build topology audit...';
    const root = target.closest?.('[data-xml-cii-workflow-root]') || target.closest?.('.model-converters-root') || document;
    xmlCiiWorkflowRequestFinalRun(root, 'unified');
  });
}

function readConfig(base) { return parseJson(base?.exportPopupConfigText?.() || '{}'); }
function writeConfig(base, config) { base?.importPopupConfigText?.(JSON.stringify(config || {}, null, 2)); clearSnapshotCache(); }
function looksLikeNodeXml(value) {
  const raw = text(value);
  return raw.length > 200 && /<Branch\b/i.test(raw) && /<Node\b/i.test(raw);
}\nfunction extractNodeXmlCandidate(value, seen = new Set()) {
  if (!value) return '';
  if (typeof value === 'string') return looksLikeNodeXml(value) ? value : '';
  if (typeof value !== 'object' || seen.has(value)) return '';
  seen.add(value);
  const preferredKeys = ['xmlText', 'sourceXml', 'sourceXML', 'sourceText', 'sourceFileText', 'inputXml', 'enrichedXmlText', 'enrichedXml'];
  for (const key of preferredKeys) {
    const found = extractNodeXmlCandidate(value[key], seen);
    if (found) return found;
  }
  for (const item of Array.isArray(value) ? value : Object.values(value)) {
    const found = extractNodeXmlCandidate(item, seen);
    if (found) return found;
  }
  return '';
}
function sync5CSourceXml(base, root) {
  try {
    const snapshot = cachedSnapshot(base, root);
    const xmlText = extractNodeXmlCandidate(snapshot);
    if (xmlText) {
      window.localStorage?.setItem('xmlCii2019.5c.sourceXml.v1', xmlText);
      return xmlText;
    }
  } catch {}
  return '';
}

function renderXmlToInputXmlPhaseInto(target, base) {
  const root = target.closest?.('[data-xml-cii-workflow-root]') || target.closest?.('.model-converters-root') || document;
  const supportConfigJson = base?.exportPopupConfigText?.() || '{}';
  const workflowXmlText = sync5CSourceXml(base, root);
  renderXmlCiiTopology5CPanel(target, { root, supportConfigJson, workflowXmlText });
}

function mergeConfigText(editedText, bools = {}) {
  const cfg = parseJson(editedText);
  Object.assign(cfg, bools || {});
  return JSON.stringify(cfg, null, 2);
}

function sanitizeSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return snapshot;
  const masters = Array.isArray(snapshot.masterDefs) ? snapshot.masterDefs : [];
  for (const master of masters) {
    if (master?.key === 'pipingClass' && text(master.defaultUrl).includes('Piping_class_master.json')) master.defaultUrl = '';
  }
  return snapshot;
}

function cachedSnapshot(base, root) {
  if (!base?.getPopupSnapshot) return null;
  const key = snapshotKey(root);
  const createdAt = nowMs();
  if (snapshotCache.key === key && snapshotCache.value && createdAt - snapshotCache.createdAt < SNAPSHOT_TTL_MS) return snapshotCache.value;
  const value = sanitizeSnapshot(base.getPopupSnapshot(root));
  if (value) snapshotCache = { key, value, createdAt };
  return value;
}

function wrapAsync(base, methodName) {
  const original = base?.[methodName]?.bind(base);
  if (!original) return undefined;
  return async (...args) => { const result = await original(...args); clearSnapshotCache(); return result; };
}

function wrapSync(base, methodName) {
  const original = base?.[methodName]?.bind(base);
  if (!original) return undefined;
  return (...args) => { const result = original(...args); clearSnapshotCache(); return result; };
}

function find5CState(node) {
  let current = node;
  while (current) {
    if (current[XML_CII_5C_STATE_KEY]) return current[XML_CII_5C_STATE_KEY];
    current = current.parentElement;
  }
  return null;
}
function current5CInputXml(state) {
  return text(state?.result?.finalInputXmlText) || text(state?.result?.coreInputXmlText);
}
function download5CText(filename, value) {
  const blob = new Blob([String(value || '')], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
function ensure5CDownloadButton(buildButton) {
  if (!buildButton) return;
  buildButton.textContent = 'Build InputXML';
  const toolbar = buildButton.parentElement || buildButton.closest?.('.xml-cii-native-toolbar');
  if (!toolbar) return;
  let button = toolbar.querySelector('[data-xml-cii-5c-download-inputxml]');
  if (!button) {
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'model-converters-download-btn';
    button.dataset.xmlCii5cDownloadInputxml = 'true';
    button.textContent = 'Download InputXML';
    buildButton.insertAdjacentElement('afterend', button);
  }
  const state = find5CState(button);
  button.disabled = !current5CInputXml(state);
  button.title = button.disabled ? 'Build InputXML first.' : 'Download final enriched InputXML; falls back to core InputXML.';
}
function scan5CDownloadButtons() {
  inputXml5CDownloadPatchQueued = false;
  document.querySelectorAll?.('[data-xml-cii-5c-build]').forEach(ensure5CDownloadButton);
}
function queue5CDownloadScan() {
  if (inputXml5CDownloadPatchQueued) return;
  inputXml5CDownloadPatchQueued = true;
  const schedule = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (fn) => setTimeout(fn, 0);
  schedule(scan5CDownloadButtons);
}
function on5CDownloadClick(event) {
  const button = event.target?.closest?.('[data-xml-cii-5c-download-inputxml]');
  if (!button) return;
  event.preventDefault?.();
  const state = find5CState(button);
  const value = current5CInputXml(state);
  if (!value) {
    if (state) state.status = 'No InputXML available yet. Build InputXML first.';
    button.disabled = true;
    button.title = 'Build InputXML first.';
    return;
  }
  download5CText('5c-inputxml.xml', value);
}
function install5CDownloadInputXmlPatch() {
  if (inputXml5CDownloadPatchInstalled || typeof document === 'undefined') return;
  inputXml5CDownloadPatchInstalled = true;
  document.addEventListener('click', on5CDownloadClick, true);
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(queue5CDownloadScan);
    observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
  }
  queue5CDownloadScan();
}

function workflowBridge() {
  const base = getXmlCiiPhaseBridge?.() || null;
  if (!base) return null;
  const safe = Object.create(base);
  Object.assign(safe, base);
  safe.__xmlCiiWorkflowSafeBridge = true;
  safe.ensureDefaultMastersLoaded = async () => null;
  safe.getPopupSnapshot = (root) => cachedSnapshot(base, root);
  safe.renderPhaseInto = (target, phaseId) => {
    if (phaseId === 'topology') { renderTopologyPhaseInto(target); return true; }
    if (phaseId === 'xml-to-inputxml') { renderXmlToInputXmlPhaseInto(target, base); return true; }
    return base.renderPhaseInto?.(target, phaseId);
  };
  safe.setPopupConfigValue = wrapSync(base, 'setPopupConfigValue');
  safe.importPopupConfigText = wrapSync(base, 'importPopupConfigText');
  safe.importPopupMasterFile = wrapAsync(base, 'importPopupMasterFile');
  safe.autoMapPopupMaster = wrapSync(base, 'autoMapPopupMaster');
  safe.setPopupMasterField = wrapSync(base, 'setPopupMasterField');
  safe.savePopupMaster = wrapSync(base, 'savePopupMaster');
  safe.clearPopupMaster = wrapSync(base, 'clearPopupMaster');
  safe.applyPopupPreferredWeights = wrapSync(base, 'applyPopupPreferredWeights');
  safe.savePopupConfigText = (editedText, bools) => {
    const nextText = mergeConfigText(editedText, bools || {});
    const result = base.savePopupConfigText?.(nextText, bools);
    clearSnapshotCache();
    return result;
  };
  safe.setPopupRunOption = (key, value, type) => {
    const cfg = readConfig(base);
    cfg[key] = value;
    writeConfig(base, cfg);
    return base.setPopupRunOption?.(key, value, type);
  };
  return safe;
}

installJsonTraceBuildPatch();
install5CDownloadInputXmlPatch();

export function xmlCiiWorkflowGetBridge() { return workflowBridge(); }
export function xmlCiiWorkflowGetSnapshot(root) { return xmlCiiWorkflowGetBridge()?.getPopupSnapshot?.(root) || null; }
export function xmlCiiWorkflowSetConfigValue(path, value, valueType = 'text') { return xmlCiiWorkflowGetBridge()?.setPopupConfigValue?.(path, value, valueType); }
export function xmlCiiWorkflowSetMasterField(masterKey, fieldKey, value) { return xmlCiiWorkflowGetBridge()?.setPopupMasterField?.(masterKey, fieldKey, value); }
export function xmlCiiWorkflowInvalidateSnapshot() { clearSnapshotCache(); }
export function xmlCiiWorkflowClosePopup() { return xmlCiiWorkflowGetBridge()?.closePopup?.(); }
