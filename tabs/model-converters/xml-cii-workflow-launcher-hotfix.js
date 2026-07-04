import { WorkflowModal } from './shared/WorkflowModal.js?v=20260624-workflow-tabs-fix-1';
import { XML_CII_WORKFLOW_PHASES, normalizeWorkflowPhaseId } from './WorkflowShell.js';
import { xmlCiiWorkflowGetBridge } from './xml-cii-workflow-bridge.js?v=20260704-workflow-button-bridge-1';

const HOTFIX_VERSION = '20260704-workflow-button-bridge-1';
const ROOT_DATASET_KEY = 'xmlCiiWorkflowLauncherHotfixBound';
const LAUNCHER_SELECTOR = [
  '#model-converters-xml-cii-workflow-btn',
  '[data-xml-cii-workflow-launcher="true"]',
  '[data-xml-cii-unified-workflow-launcher="true"]',
].join(', ');

function browserReady() { return typeof window !== 'undefined' && typeof document !== 'undefined'; }
function rootFor(container = document) { return container?.querySelector?.('.model-converters-root') || container; }
function tabs() { return XML_CII_WORKFLOW_PHASES.map((phase) => ({ id: phase.id, label: phase.label })); }
function setHostDataset(host, phaseId) {
  if (!host) return;
  host.dataset.selectedPhase = phaseId;
  host.dataset.xmlCiiWorkflowMode = 'unified';
}
function renderPhase(host, bridge, modal, phaseId) {
  const id = normalizeWorkflowPhaseId(phaseId);
  setHostDataset(host, id);
  modal?.setActiveTab?.(id);
  host.innerHTML = '<div data-xml-cii-workflow-hotfix-body></div>';
  const body = host.querySelector('[data-xml-cii-workflow-hotfix-body]');
  bridge.switchPhase = (nextPhaseId) => renderPhase(host, bridge, modal, nextPhaseId);
  bridge.closePopup = () => modal?.close?.();
  bridge.renderPhaseInto?.(body, id);
}
function showBridgeMissing(root) {
  const button = root?.querySelector?.(LAUNCHER_SELECTOR);
  if (button) button.title = 'XML->CII workflow bridge is not ready. Reopen the Model Converters tab and try again.';
  console.warn('[XML CII Workflow] Bridge was not ready when workflow button was clicked.');
}
function openWorkflow(root) {
  const bridge = xmlCiiWorkflowGetBridge();
  if (!bridge?.renderPhaseInto) {
    showBridgeMissing(root);
    return;
  }
  const modal = new WorkflowModal({
    title: 'XML->CII(2019) Workflow',
    subtitle: 'Import masters, map fields, preview enrichment, review weights, map supports, configure, and run.',
    tabs: tabs(),
    activeTabId: 'regex',
    onTabChange: (phaseId) => renderPhase(host, bridge, modal, phaseId),
    onClose: () => {
      bridge.closePopup = null;
      bridge.switchPhase = null;
    },
  });
  const host = modal.open();
  host.dataset.xmlCiiWorkflowLauncherHotfix = HOTFIX_VERSION;
  renderPhase(host, bridge, modal, 'regex');
}
function bind(root) {
  if (!root || root.dataset?.[ROOT_DATASET_KEY] === HOTFIX_VERSION) return null;
  root.addEventListener('click', (event) => {
    const target = event.target?.closest?.(LAUNCHER_SELECTOR);
    if (!target || !root.contains(target)) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openWorkflow(root);
  }, { capture: true });
  root.dataset[ROOT_DATASET_KEY] = HOTFIX_VERSION;
  return root;
}

export function installXmlCiiWorkflowLauncherHotfix(container = document) {
  if (!browserReady()) return null;
  return bind(rootFor(container));
}
