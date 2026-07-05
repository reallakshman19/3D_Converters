import { clearElement, createElement } from './xml-cii-adapted-dom.js';
import { XML_CII_WORKFLOW_PHASES } from './xml-cii-adapted-phase-registry.js';
import { createXmlCiiAdaptedWorkflowState } from './xml-cii-adapted-state.js';
import { renderActivePhase } from './xml-cii-adapted-phase-panels.js';
import { renderOutputPanel } from './xml-cii-adapted-output-panel.js';
import { bindAdaptedWorkflowEvents } from './xml-cii-adapted-events.js';

export function createStateRef(initialState = createXmlCiiAdaptedWorkflowState()) {
  return { current: initialState };
}

export function renderXmlCiiAdaptedWorkflowShell(container, initialState) {
  const stateRef = createStateRef(initialState);
  const render = () => renderAdaptedWorkflow(container, stateRef, render);
  render();
  return () => clearElement(container);
}

export function renderAdaptedWorkflow(container, stateRef, render) {
  clearElement(container);
  const root = createElement('section', '', 'xml-cii-standalone-root xml-cii-adapted-workflow-shell');
  renderHeader(root);
  renderPhaseRail(root, stateRef.current);
  renderActivePhase(root, stateRef.current);
  renderOutputPanel(root, stateRef.current);
  container.appendChild(root);
  bindAdaptedWorkflowEvents(container, stateRef, render);
}

export function renderHeader(root) {
  const header = createElement('header', '', 'xml-cii-standalone-header');
  const title = createElement('div');
  title.append(
    createElement('h1', 'XML→CII 2019 Standalone'),
    createElement('p', 'Adapted from the XML→CII 2019 phase model; API-first, UI-configurable, and isolated from the Model Converters popup.'),
  );
  header.append(title, createElement('div', 'Standalone adapted workflow', 'xml-cii-standalone-badge'));
  root.appendChild(header);
}

export function renderPhaseRail(root, state) {
  const rail = createElement('nav', '', 'xml-cii-phase-rail');
  rail.setAttribute('aria-label', 'XML CII workflow phases');
  for (const phase of XML_CII_WORKFLOW_PHASES) rail.appendChild(renderPhaseButton(phase, state));
  root.appendChild(rail);
}

export function renderPhaseButton(phase, state) {
  const button = createElement('button', '', 'xml-cii-phase-pill');
  button.type = 'button';
  button.dataset.phase = phase.id;
  button.classList.toggle('is-active', state.activePhaseId === phase.id);
  button.append(
    createElement('span', phase.label, 'xml-cii-phase-label'),
    createElement('small', phase.summary, 'xml-cii-phase-summary'),
  );
  return button;
}
