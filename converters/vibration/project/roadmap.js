import { assertVibrationIntegrityProject } from './schema.js';

function lineById(project, lineId) {
  if (lineId == null) return null;
  return project.subjects.lines.find((line) => line.lineId === lineId) ?? null;
}

function lineLabel(line) {
  return line.legacyEit?.lineReference || line.legacyEit?.lineDescription || line.legacyEit?.rid || line.lineId;
}

export function buildVibrationRoadmapStateFromProject(project, { lineId = null, mechanismStates = {} } = {}) {
  assertVibrationIntegrityProject(project);
  const selected = lineById(project, lineId) ?? project.subjects.lines[0] ?? null;
  return Object.freeze({
    eitImport: project.sourceImports?.eit ?? null,
    mechanismStates,
    context: Object.freeze({
      projectId: project.project.projectId,
      projectTitle: project.project.title,
      lineId: selected?.lineId ?? null,
      eitRid: selected?.legacyEit?.rid ?? null,
      projectLines: Object.freeze(project.subjects.lines.map((line) => Object.freeze({
        lineId: line.lineId, label: String(lineLabel(line)), eitRid: line.legacyEit?.rid ?? null,
      }))),
    }),
  });
}
