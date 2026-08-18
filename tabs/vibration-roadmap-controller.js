import { parseEnergyInstituteEit } from '../converters/vibration/eit/parse.js';
import { buildVibrationIntegrityProjectFromEit } from '../converters/vibration/project/from-eit.js';
import { buildVibrationRoadmapStateFromProject } from '../converters/vibration/project/roadmap.js';
import {
  VIBRATION_INTEGRITY_PROJECT_FILE_EXTENSION,
  parseVibrationIntegrityProject,
  serializeVibrationIntegrityProject,
} from '../converters/vibration/project/serialize.js';
import { buildVibrationRoadmapProjection } from '../converters/vibration/roadmap/projection.js';
import { renderVibrationRoadmapPanel } from './vibration-roadmap-panel.js';

export const VIBRATION_ROADMAP_STATE_EVENT = 'vibration-roadmap-state';
export const VIBRATION_PROJECT_CHANGED_EVENT = 'vibration-project-changed';
const VIBRATION_FAMILY_ID = 'VIB';

export function shouldShowVibrationRoadmap(definition, state = {}) {
  return state.familyLanding === VIBRATION_FAMILY_ID || definition?.family === VIBRATION_FAMILY_ID;
}

export function vibrationProjectFileName(project) {
  const base = String(project?.project?.title || project?.project?.projectId || 'vibration-project')
    .trim().replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'vibration-project';
  return `${base}${VIBRATION_INTEGRITY_PROJECT_FILE_EXTENSION}`;
}

function cleanPanel(container) {
  container.querySelector('[data-vibration-roadmap-panel]')?.remove();
  container.querySelector('.engineering-console-layout')?.classList.remove('has-vibration-roadmap', 'vibration-roadmap-collapsed');
}

function normalizedDisplayState(value = {}) {
  return { eitImport: value.eitImport ?? null, mechanismStates: value.mechanismStates ?? {}, context: value.context ?? {} };
}

function mergeDisplayState(current, update = {}) {
  return {
    eitImport: update.eitImport === undefined ? current.eitImport : update.eitImport,
    mechanismStates: update.mechanismStates === undefined ? current.mechanismStates : update.mechanismStates,
    context: update.context === undefined ? current.context : { ...current.context, ...update.context },
  };
}

function defaultDownloadText(text, fileName) {
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function customEvent(container, name, detail) {
  const EventClass = container.ownerDocument?.defaultView?.CustomEvent ?? globalThis.CustomEvent;
  if (typeof EventClass === 'function') container.dispatchEvent(new EventClass(name, { detail }));
}

export function createVibrationRoadmapController(container, { initialState = {}, downloadText = defaultDownloadText } = {}) {
  let displayState = normalizedDisplayState(initialState);
  let currentProject = initialState.project ?? null;
  let selectedLineId = initialState.context?.lineId ?? null;
  let collapsed = initialState.collapsed === true;
  let lastRender = null;
  let projectMessage = null;
  let projectMessageKind = 'info';

  function syncProjectState() {
    if (!currentProject) return;
    displayState = buildVibrationRoadmapStateFromProject(currentProject, {
      lineId: selectedLineId,
      mechanismStates: displayState.mechanismStates,
    });
    selectedLineId = displayState.context.lineId;
  }

  function projectionContext(definition) {
    return {
      ...displayState.context,
      familyId: VIBRATION_FAMILY_ID,
      calculationId: definition?.family === VIBRATION_FAMILY_ID ? definition.id : null,
      projectMessage,
      projectMessageKind,
    };
  }

  function render({ definition, state }) {
    lastRender = { definition, state };
    cleanPanel(container);
    if (!shouldShowVibrationRoadmap(definition, state)) return;
    const layout = container.querySelector('.engineering-console-layout');
    if (!layout) return;
    const projection = buildVibrationRoadmapProjection({
      eitImport: displayState.eitImport,
      mechanismStates: displayState.mechanismStates,
      context: projectionContext(definition),
    });
    layout.classList.add('has-vibration-roadmap');
    if (collapsed) layout.classList.add('vibration-roadmap-collapsed');
    layout.insertAdjacentHTML('beforeend', renderVibrationRoadmapPanel(projection, { collapsed }));
  }

  function commitProject(candidate, message) {
    currentProject = candidate;
    selectedLineId = candidate.subjects.lines[0]?.lineId ?? null;
    projectMessage = message;
    projectMessageKind = 'info';
    syncProjectState();
    customEvent(container, VIBRATION_PROJECT_CHANGED_EVENT, { project: currentProject, lineId: selectedLineId });
    if (lastRender) render(lastRender);
  }

  function failProject(error) {
    projectMessage = `${error?.code ? `${error.code}: ` : ''}${String(error?.message || error)}`;
    projectMessageKind = 'error';
    if (lastRender) render(lastRender);
  }

  async function importEitFile(file) {
    try {
      const imported = parseEnergyInstituteEit(await file.text(), { sourceName: file.name });
      const candidate = buildVibrationIntegrityProjectFromEit(imported);
      commitProject(candidate, `Imported ${file.name}; historical results require registered rerun.`);
    } catch (error) { failProject(error); }
  }

  async function openProjectFile(file) {
    try {
      const candidate = parseVibrationIntegrityProject(await file.text());
      commitProject(candidate, `Opened ${file.name}; current-result authority is not restored by project load.`);
    } catch (error) { failProject(error); }
  }

  function saveProject() {
    if (!currentProject) return;
    downloadText(serializeVibrationIntegrityProject(currentProject), vibrationProjectFileName(currentProject));
    projectMessage = 'Project exported. Engineering authority remains with registered calculation evidence.';
    projectMessageKind = 'info';
    if (lastRender) render(lastRender);
  }

  function onRoadmapState(event) {
    if (!event.detail || typeof event.detail !== 'object') return;
    displayState = mergeDisplayState(displayState, event.detail);
    if (lastRender) render(lastRender);
  }

  function onClick(event) {
    if (event.target.closest('[data-roadmap-collapse]')) {
      collapsed = !collapsed;
      if (lastRender) render(lastRender);
      return;
    }
    const action = event.target.closest('[data-roadmap-action]')?.dataset.roadmapAction;
    if (action === 'import-eit') container.querySelector('[data-roadmap-eit-file]')?.click();
    else if (action === 'open-project') container.querySelector('[data-roadmap-project-file]')?.click();
    else if (action === 'save-project') saveProject();
  }

  function onChange(event) {
    if (event.target.matches('[data-roadmap-line-select]')) {
      selectedLineId = event.target.value;
      syncProjectState();
      customEvent(container, VIBRATION_PROJECT_CHANGED_EVENT, { project: currentProject, lineId: selectedLineId });
      if (lastRender) render(lastRender);
      return;
    }
    if (event.target.matches('[data-roadmap-eit-file]') && event.target.files?.[0]) importEitFile(event.target.files[0]);
    if (event.target.matches('[data-roadmap-project-file]') && event.target.files?.[0]) openProjectFile(event.target.files[0]);
  }

  container.addEventListener(VIBRATION_ROADMAP_STATE_EVENT, onRoadmapState);
  container.addEventListener('click', onClick);
  container.addEventListener('change', onChange);

  return Object.freeze({
    render,
    destroy() {
      cleanPanel(container);
      container.removeEventListener(VIBRATION_ROADMAP_STATE_EVENT, onRoadmapState);
      container.removeEventListener('click', onClick);
      container.removeEventListener('change', onChange);
    },
  });
}
