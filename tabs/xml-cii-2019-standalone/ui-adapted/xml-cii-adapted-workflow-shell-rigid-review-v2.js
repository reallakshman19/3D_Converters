import { renderXmlCiiAdaptedWorkflowShell as renderBaseWorkflowShell } from './xml-cii-adapted-workflow-shell-strict-line.js?v=20260804-rigid-review-actions-v2';
import { installRigidReviewActionsEnhancement } from './xml-cii-adapted-rigid-review-actions-ui.js?v=20260804-rigid-review-actions-v2';

installRigidReviewActionsEnhancement();

export function renderXmlCiiAdaptedWorkflowShell(container, initialState) {
  installRigidReviewActionsEnhancement();
  return renderBaseWorkflowShell(container, initialState);
}
