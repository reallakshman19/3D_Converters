import { installModeAConsolidatedWeightEasyUi } from './xml-cii-adapted-mode-a-consolidated-easy-weight-ui.js?v=20260813-mode-a-easy-weight-1';
import { modeARawState } from './xml-cii-adapted-mode-a-propagation.js?v=20260813-mode-a-easy-weight-1';

export function installModeAConsolidatedWeightEasyUiFromWorkspace(workspace,stateRef) {
  const state=modeARawState(stateRef);
  const result=state.modeAConsolidatedWeightResult;
  if(!result||state.activePhaseId!=='weight-match') return false;
  const panels=[...(workspace?.querySelectorAll?.('.xml-cii-mode-a-consolidated')||[])];
  const panel=panels.find((node)=>/Consolidated Weight Match/i.test(node.querySelector?.('h3')?.textContent||''));
  if(!panel) return false;
  const body=panel.querySelector('table.xml-cii-audit-table tbody');
  if(body) body.dataset.modeAWeightConsolidatedBody='true';
  const build=[...panel.querySelectorAll('button')].find((button)=>/Consolidated Weight Match/i.test(button.textContent||''));
  if(build) build.dataset.modeAConsolidatedBuild='weight';
  return installModeAConsolidatedWeightEasyUi(panel,result,stateRef);
}
