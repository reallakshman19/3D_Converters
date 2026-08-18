import { buildVibrationRoadmapProjection } from '../converters/vibration/roadmap/projection.js';
import { renderVibrationRoadmapPanel } from './vibration-roadmap-panel.js';

export const VIBRATION_ROADMAP_STATE_EVENT = 'vibration-roadmap-state';
const VIBRATION_FAMILY_ID = 'VIB';

export function shouldShowVibrationRoadmap(definition, state = {}) {
  return state.familyLanding === VIBRATION_FAMILY_ID || definition?.family === VIBRATION_FAMILY_ID;
}

function cleanPanel(container) {
  container.querySelector('[data-vibration-roadmap-panel]')?.remove();
  const layout = container.querySelector('.engineering-console-layout');
  layout?.classList.remove('has-vibration-roadmap', 'vibration-roadmap-collapsed');
}

function normalizedDisplayState(value = {}) {
  return {
    eitImport: value.eitImport ?? null,
    mechanismStates: value.mechanismStates ?? {},
    context: value.context ?? {},
  };
}

function mergeDisplayState(current, update = {}) {
  return {
    eitImport: update.eitImport === undefined ? current.eitImport : update.eitImport,
    mechanismStates: update.mechanismStates === undefined ? current.mechanismStates : update.mechanismStates,
    context: update.context === undefined ? current.context : { ...current.context, ...update.context },
  };
}

export function createVibrationRoadmapController(container, { initialState = {} } = {}) {
  let displayState = normalizedDisplayState(initialState);
  let collapsed = initialState.collapsed === true;
  let lastRender = null;

  function render({ definition, state }) {
    lastRender = { definition, state };
    cleanPanel(container);
    if (!shouldShowVibrationRoadmap(definition, state)) return;
    const layout = container.querySelector('.engineering-console-layout');
    if (!layout) return;
    const context = {
      ...displayState.context,
      familyId: VIBRATION_FAMILY_ID,
      calculationId: definition?.family === VIBRATION_FAMILY_ID ? definition.id : null,
    };
    const projection = buildVibrationRoadmapProjection({
      eitImport: displayState.eitImport,
      mechanismStates: displayState.mechanismStates,
      context,
    });
    layout.classList.add('has-vibration-roadmap');
    if (collapsed) layout.classList.add('vibration-roadmap-collapsed');
    layout.insertAdjacentHTML('beforeend', renderVibrationRoadmapPanel(projection, { collapsed }));
  }

  function onRoadmapState(event) {
    if (!event.detail || typeof event.detail !== 'object') return;
    displayState = mergeDisplayState(displayState, event.detail);
    if (lastRender) render(lastRender);
  }

  function onClick(event) {
    if (!event.target.closest('[data-roadmap-collapse]')) return;
    collapsed = !collapsed;
    if (lastRender) render(lastRender);
  }

  container.addEventListener(VIBRATION_ROADMAP_STATE_EVENT, onRoadmapState);
  container.addEventListener('click', onClick);

  return Object.freeze({
    render,
    destroy() {
      cleanPanel(container);
      container.removeEventListener(VIBRATION_ROADMAP_STATE_EVENT, onRoadmapState);
      container.removeEventListener('click', onClick);
    },
  });
}
