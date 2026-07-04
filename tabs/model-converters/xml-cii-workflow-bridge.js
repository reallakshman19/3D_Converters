/**
 * XML->CII(2019) Workflow bridge boundary.
 *
 * Keep this import URL aligned with ModelConvertersTab.js. If the URL differs,
 * the browser creates a second legacy-adapter module instance and the workflow
 * button cannot see the phase bridge populated by renderModelConvertersTab().
 */

import { getXmlCiiPhaseBridge } from './legacy-adapter.js?v=20260704-model-converters-load-hotfix-1';

let snapshotGeneration = 0;
let snapshotCache = { key: '', value: null, createdAt: 0 };
const SNAPSHOT_TTL_MS = 5000;

function nowMs() { return Date.now ? Date.now() : 0; }
function text(value) { return value === undefined || value === null ? '' : String(value).trim(); }
function phaseKey(root) { return root?.dataset?.selectedPhase || 'regex'; }
function snapshotKey(root) { return `${snapshotGeneration}|${phaseKey(root)}`; }
function clearSnapshotCache() { snapshotGeneration += 1; snapshotCache = { key: '', value: null, createdAt: 0 }; }

function parseJson(value) {
  try {
    const parsed = JSON.parse(String(value || '{}'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
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
