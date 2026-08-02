import { renderActivePhase as renderBaseActivePhase } from './xml-cii-adapted-phase-panels.js?v=20260713-config-tabs-p2';
import { enhanceRegexSmartWorkbench } from './xml-cii-adapted-regex-smart-ui.js';

export function renderActivePhase(root, stateRef, render) {
  renderBaseActivePhase(root, stateRef, render);
  if (stateRef?.current?.activePhaseId !== 'regex') return;
  const card = root.querySelector('[data-active-phase="regex"]') || root;
  enhanceRegexSmartWorkbench(card, stateRef.current, stateRef, render);
}
