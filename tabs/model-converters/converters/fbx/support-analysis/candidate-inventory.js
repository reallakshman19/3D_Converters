import { compareText, sortedUnique } from './identity.js';

function pipeOccurrenceIds(classifications) {
  return new Set((classifications || []).filter((item) => item?.admitted)
    .map((item) => item.sourceOccurrenceId));
}

function itemFor(occurrence, selectionById, admittedPipeIds) {
  const geometryIds = sortedUnique(occurrence.geometryObjectIds || []);
  const selections = geometryIds.map((id) => selectionById.get(id)).filter(Boolean);
  if (!geometryIds.length) return Object.freeze({
    occurrence, selections: Object.freeze([]), inventoryDisposition: 'CONTEXT_ONLY',
    reasons: Object.freeze(['ZERO_GEOMETRY_OCCURRENCE']),
  });
  if (admittedPipeIds.has(occurrence.sourceOccurrenceId)) return Object.freeze({
    occurrence, selections: Object.freeze(selections), inventoryDisposition: 'ADMITTED_PIPE_GEOMETRY',
    reasons: Object.freeze(['EXACT_ACCEPTED_PIPE_EVIDENCE']),
  });
  if (selections.length !== geometryIds.length) return Object.freeze({
    occurrence, selections: Object.freeze(selections), inventoryDisposition: 'UNSUPPORTED_GEOMETRY',
    reasons: Object.freeze(['MISSING_SELECTED_TOPOLOGY_BINDING']),
  });
  return Object.freeze({
    occurrence, selections: Object.freeze(selections), inventoryDisposition: 'POSSIBLE_SUPPORT_CANDIDATE',
    reasons: Object.freeze(['NON_PIPE_SELECTED_POLYGON_GEOMETRY']),
  });
}

export function inventorySupportCandidates({ zoneGeometryEvidence, selections, pipeClassifications }) {
  if (!zoneGeometryEvidence?.artifactId || !Array.isArray(zoneGeometryEvidence.occurrenceEvidence)) {
    throw new Error('BLOCKED_SUPPORT_BINDING invalid selected-zone geometry evidence.');
  }
  const selectionById = new Map((selections || []).map((selection) => (
    [selection.geometry.geometryObjectId, selection]
  )));
  const admittedPipeIds = pipeOccurrenceIds(pipeClassifications);
  const occurrences = [...zoneGeometryEvidence.occurrenceEvidence]
    .sort((left, right) => compareText(left.sourceOccurrenceId, right.sourceOccurrenceId));
  return Object.freeze(occurrences.map((occurrence) => (
    itemFor(occurrence, selectionById, admittedPipeIds)
  )));
}
