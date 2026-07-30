function fail(message) {
  throw new TypeError(`FBX mapped stage scope: ${message}`);
}

function sourceOccurrenceId(child) {
  const value = child?.attributes?.sourceOccurrenceId;
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

function selectedIdSet(zoneGeometryEvidence) {
  if (!Array.isArray(zoneGeometryEvidence?.selectedOccurrenceIds)) {
    fail('zoneGeometryEvidence.selectedOccurrenceIds must be an array.');
  }
  return new Set(zoneGeometryEvidence.selectedOccurrenceIds.map(String));
}

function scopedBranch(branch, selectedIds) {
  if (!Array.isArray(branch?.children)) fail('mapped branch children must be an array.');
  const children = branch.children.filter((child) => {
    const occurrenceId = sourceOccurrenceId(child);
    return occurrenceId !== null && selectedIds.has(occurrenceId);
  }).map((child) => structuredClone(child));
  if (!children.length) return null;
  return { ...structuredClone(branch), children };
}

export function scopeMappedStagedBranches(stagedBranches, zoneGeometryEvidence) {
  if (!Array.isArray(stagedBranches)) fail('stagedBranches must be an array.');
  const selectedIds = selectedIdSet(zoneGeometryEvidence);
  const branches = stagedBranches.map((branch) => scopedBranch(branch, selectedIds)).filter(Boolean);
  return Object.freeze(branches.map((branch) => Object.freeze(branch)));
}
