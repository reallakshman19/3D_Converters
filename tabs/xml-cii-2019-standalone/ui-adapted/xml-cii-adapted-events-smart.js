import { bindAdaptedWorkflowEvents as bindBaseAdaptedWorkflowEvents } from './xml-cii-adapted-events.js?v=20260713-master-autoload-v10';
import { installRigidSmartFillDashboard } from './xml-cii-adapted-rigid-smart-fill-ui.js';

installRigidSmartFillDashboard();

export function bindAdaptedWorkflowEvents(container, stateRef, render) {
  installRigidSmartFillDashboard();
  return bindBaseAdaptedWorkflowEvents(container, stateRef, render);
}
