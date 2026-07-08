/**
 * XML->CII(2019) Workflow bridge boundary.
 *
 * Keep this import URL aligned with ModelConvertersTab.js. If the URL differs,
 * the browser creates a second legacy-adapter module instance and the workflow
 * button cannot see the phase bridge populated by renderModelConvertersTab().
 */

import { getXmlCiiPhaseBridge } from './legacy-adapter.js?v=20260708-workflow-bridge-align-1';

let snapshotGeneration = 0;
let snapshotCache = { key: '', value: null, createdAt: 0 };
const SNAPSHOT_TTL_MS = 5000;

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
    <div class="xml-cii-native-phase-head"><div><div class="model-converters-workflow-detail-title">5B Topology</div><div class="model-converters-workflow-detail-text">Audit enriched XML node continuity with UXML topology and final InputXML From→To orphan checks.</div></div></div>
    <section class="xml-cii-native-card">
      <div class="xml-cii-native-status-list">
        <div class="xml-cii-native-status-row ${rows.length ? 'is-ok' : 'is-warn'}"><span class="xml-cii-native-status-icon">${rows.length ? 'OK' : 'WARN'}</span><span>Latest topology audit</span><strong>${esc(audit.schema || 'not run')}</strong></div>
        <div class="xml-cii-native-status-row ${Number(stats.topologyAuditPath1Rows || 0) > 0 ? 'is-ok' : 'is-warn'}"><span class="xml-cii-native-status-icon">${Number(stats.topologyAuditPath1Rows || 0) > 0 ? 'OK' : 'WARN'}</span><span>Path 1 UXML rows</span><strong>${Number(stats.topologyAuditPath1Rows || 0).toLocaleString()}</strong></div>
        <div class="xml-cii-native-status-row ${Number(stats.topologyAuditPath2Rows || 0) > 0 ? 'is-ok' : 'is-warn'}"><span class="xml-cii-native-status-icon">${Number(stats.topologyAuditPath2Rows || 0) > 0 ? 'OK' : 'WARN'}</span><span>Path 2 InputXML rows</span><strong>${Number(stats.topologyAuditPath2Rows || 0).toLocaleString()}</strong></div>
        <div class="xml-cii-native-status-row ${disconnectedCount === 0 ? 'is-ok' : 'is-warn'}"><span class="xml-cii-native-status-icon">${disconnectedCount === 0 ? 'OK' : 'WARN'}</span><span>Disconnected / orphan</span><strong>${disconnectedCount.toLocaleString()}</strong></div>
      </div>
      <div class="xml-cii-native-hint">Run Finalise and Run first. This table reads the latest run diagnostics and the generated topology audit JSON.</div>
    </section>
    <section class="xml-cii-native-card"><div class="model-converters-workflow-section-title">Disconnected / Orphan Nodes</div>${compactTopologyTable(disconnectedRows.slice(0, 500), 'No disconnected/orphan nodes found in the latest topology audit.')}</section>
    <section class="xml-cii-native-card"><div class="model-converters-workflow-section-title">All Topology Rows</div>${compactTopologyTable(rows.slice(0, 500), 'No topology rows loaded. Run XML→CII to generate topology diagnostics.')}</section>`;
}

function readConfig(base) { return parseJson(base?.exportPopupConfigText?.() || '{}'); }
function writeConfig(base, config) { base?.importPopupConfigText?.(JSON.stringify(config || {}, null, 2)); clearSnapshotCache(); }

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

export function xmlCiiWorkflowGetBridge() { return workflowBridge(); }
export function xmlCiiWorkflowGetSnapshot(root) { return xmlCiiWorkflowGetBridge()?.getPopupSnapshot?.(root) || null; }
export function xmlCiiWorkflowSetConfigValue(path, value, valueType = 'text') { return xmlCiiWorkflowGetBridge()?.setPopupConfigValue?.(path, value, valueType); }
export function xmlCiiWorkflowSetMasterField(masterKey, fieldKey, value) { return xmlCiiWorkflowGetBridge()?.setPopupMasterField?.(masterKey, fieldKey, value); }
export function xmlCiiWorkflowInvalidateSnapshot() { clearSnapshotCache(); }
export function xmlCiiWorkflowClosePopup() { return xmlCiiWorkflowGetBridge()?.closePopup?.(); }
