function fail(message) {
  throw new TypeError(`FBX mapped stage scope: ${message}`);
}

function sourceOccurrenceId(child) {
  const value = child?.attributes?.sourceOccurrenceId;
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

function selectedIdSet(zoneGeometryEvidence) {
  if (!Array.isArray(zoneGeometryEvidence?.selectedOccurrenceIds)) {
    fail('zoneGeometryEvidence.selectedOccurrenceIds must be an array.');
  }
  return new Set(zoneGeometryEvidence.selectedOccurrenceIds.map(String));
}

function generatedSourceIds(child) {
  const provenance = child?.attributes?.mappingEngineering?.generationProvenance;
  if (provenance?.generated !== true) return [];
  if (!Array.isArray(provenance.sourceOccurrenceIds)) return [];
  return provenance.sourceOccurrenceIds.map(String).filter(Boolean);
}

function childInScope(child, selectedIds) {
  const occurrenceId = sourceOccurrenceId(child);
  if (occurrenceId !== null) return selectedIds.has(occurrenceId);
  const sourceIds = generatedSourceIds(child);
  return sourceIds.length > 0 && sourceIds.every((id) => selectedIds.has(id));
}

function scopedBranch(branch, selectedIds) {
  if (!Array.isArray(branch?.children)) fail('mapped branch children must be an array.');
  const children = branch.children.filter((child) => childInScope(child, selectedIds))
    .map((child) => structuredClone(child));
  if (!children.length) return null;
  return { ...structuredClone(branch), children };
}

export function scopeMappedStagedBranches(stagedBranches, zoneGeometryEvidence) {
  if (!Array.isArray(stagedBranches)) fail('stagedBranches must be an array.');
  const selectedIds = selectedIdSet(zoneGeometryEvidence);
  const branches = stagedBranches.map((branch) => scopedBranch(branch, selectedIds))
    .filter(Boolean);
  return Object.freeze(branches.map((branch) => Object.freeze(branch)));
}
