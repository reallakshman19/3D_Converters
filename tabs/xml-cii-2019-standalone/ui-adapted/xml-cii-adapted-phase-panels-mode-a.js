import { renderActivePhase as renderBranchScopedPhase } from './xml-cii-adapted-phase-panels-branch-scope.js?v=20260804-mode-a-v1';
import { renderModeABatchResults, renderModeASourceInventory } from './xml-cii-adapted-mode-a-panel.js?v=20260804-mode-a-v1';

function activeCard(root, phaseId) {
  return root.querySelector?.(`[data-active-phase="${phaseId}"]`) || root;
}

function sourceWorkspace(card) {
  return card.querySelector?.('.xml-cii-sub-workspace') || card;
}

function addBatchStatus(card, state) {
  if (!state.batchRunStatus || card.querySelector?.('[data-mode-a-run-status]')) return;
  const note = document.createElement('div');
  note.dataset.modeARunStatus = 'true';
  note.className = 'model-converters-workflow-detail-note';
  note.textContent = state.batchRunStatus;
  note.style.marginBottom = '10px';
  card.prepend(note);
}

export function renderActivePhase(root, stateRef, render) {
  renderBranchScopedPhase(root, stateRef, render);
  const state = stateRef.current;
  const phaseId = state.activePhaseId;
  const card = activeCard(root, phaseId);
  if (phaseId === 'source' && (state.activeSubTabId || 'loader') === 'loader') {
    const workspace = sourceWorkspace(card);
    renderModeASourceInventory(workspace, stateRef);
    const inventory = workspace.querySelector?.('[data-mode-a-panel="source-inventory"]');
    const branchPanel = workspace.querySelector?.('.xml-cii-branch-scope-panel');
    if (inventory && branchPanel) workspace.insertBefore(inventory, branchPanel);
  }
  if (phaseId === 'run') {
    addBatchStatus(card, state);
    renderModeABatchResults(card, state);
  }
}
