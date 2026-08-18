import { assertVibrationIntegrityProject } from './schema.js';

function lineById(project, lineId) {
  if (lineId == null) return null;
  return project.subjects.lines.find((line) => line.lineId === lineId) ?? null;
}

export function buildVibrationRoadmapStateFromProject(project, { lineId = null, mechanismStates = {} } = {}) {
  assertVibrationIntegrityProject(project);
  const line = lineById(project, lineId);
  return Object.freeze({
    eitImport: project.sourceImports?.eit ?? null,
    mechanismStates,
    context: Object.freeze({
      projectId: project.project.projectId,
      projectTitle: project.project.title,
      lineId: line?.lineId ?? null,
      eitRid: line?.legacyEit?.rid ?? null,
    }),
  });
}
