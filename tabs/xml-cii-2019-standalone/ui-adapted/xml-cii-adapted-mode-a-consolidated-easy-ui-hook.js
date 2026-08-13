import { installModeAConsolidatedPreviewEasyUi } from './xml-cii-adapted-mode-a-consolidated-easy-ui.js?v=20260813-mode-a-easy-bulk-1';
import { modeARawState } from './xml-cii-adapted-mode-a-propagation.js?v=20260813-mode-a-easy-bulk-1';

export function installModeAConsolidatedPreviewEasyUiFromWorkspace(workspace, stateRef) {
  const state = modeARawState(stateRef);
  const result = state.modeAConsolidatedPreviewResult;
  if (!result || state.activePhaseId !== 'preview') return false;
  const panels = [...(workspace?.querySelectorAll?.('.xml-cii-mode-a-consolidated') || [])];
  const panel = panels.find((node) => /Consolidated Preview/i.test(node.querySelector?.('h3')?.textContent || ''));
  if (!panel) return false;
  const body = panel.querySelector('table.xml-cii-audit-table tbody');
  if (body) body.dataset.modeAPreviewConsolidatedBody = 'true';
  const build = [...panel.querySelectorAll('button')].find((button) => /Consolidated Preview/i.test(button.textContent || ''));
  if (build) build.dataset.modeAConsolidatedBuild = 'preview';
  return installModeAConsolidatedPreviewEasyUi(panel, result, stateRef);
}
