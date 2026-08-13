import { bindAdaptedWorkflowEvents as bindBaseModeAEvents } from './xml-cii-adapted-events-mode-a.js?v=20260813-mode-a-rigid-review-1';
import { modeARawRef } from './xml-cii-adapted-mode-a-propagation.js?v=20260813-mode-a-rigid-review-1';
import { runModeABatchFromUi } from './xml-cii-adapted-run-workflow-mode-a-consolidated-review-v2.js?v=20260813-mode-a-rigid-review-1';

export function bindAdaptedWorkflowEvents(container, stateRef, render) {
  const result = bindBaseModeAEvents(container, stateRef, render);
  const existing = container.querySelector('[data-action="run"]');
  if (!existing?.parentNode) return result;
  const replacement = existing.cloneNode(true);
  replacement.textContent = 'Run Separate Models';
  replacement.disabled = !!modeARawRef(stateRef).current.batchRunning;
  existing.parentNode.replaceChild(replacement, existing);
  replacement.addEventListener('click', () => runModeABatchFromUi(modeARawRef(stateRef), render));
  return result;
}
