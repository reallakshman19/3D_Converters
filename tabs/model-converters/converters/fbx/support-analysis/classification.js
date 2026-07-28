export function terminalForInventory(item) {
  if (item.inventoryDisposition === 'CONTEXT_ONLY') return Object.freeze({
    terminalDisposition: 'CONTEXT_ONLY', hostDisposition: 'HOST_ASSOCIATION_NOT_APPLICABLE',
    reasons: item.reasons,
  });
  if (item.inventoryDisposition === 'ADMITTED_PIPE_GEOMETRY') return Object.freeze({
    terminalDisposition: 'NOT_SUPPORT_EVIDENCE', hostDisposition: 'HOST_ASSOCIATION_NOT_APPLICABLE',
    reasons: item.reasons,
  });
  if (item.inventoryDisposition === 'UNSUPPORTED_GEOMETRY') return Object.freeze({
    terminalDisposition: 'SUPPORT_CANDIDATE_AMBIGUOUS', hostDisposition: 'HOST_ASSOCIATION_NOT_APPLICABLE',
    reasons: item.reasons,
  });
  return null;
}

export function terminalForGeometry(analysis) {
  if (analysis.geometryDisposition === 'REJECTED') return Object.freeze({
    terminalDisposition: 'SUPPORT_CANDIDATE_REJECTED', hostDisposition: 'HOST_ASSOCIATION_NOT_APPLICABLE',
    reasons: analysis.reasons,
  });
  if (analysis.geometryDisposition === 'AMBIGUOUS') return Object.freeze({
    terminalDisposition: 'SUPPORT_CANDIDATE_AMBIGUOUS', hostDisposition: 'HOST_ASSOCIATION_NOT_APPLICABLE',
    reasons: analysis.reasons,
  });
  return null;
}

export function terminalForHost(hostResult) {
  if (hostResult.outcome === 'SINGLE_HOST_PROVED' || hostResult.outcome === 'MULTI_HOST_PROVED') {
    return Object.freeze({ terminalDisposition: 'SUPPORT_ADMITTED',
      hostDisposition: hostResult.outcome, reasons: Object.freeze(['GENERIC_SUPPORT_GEOMETRY_AND_HOST_PROVED']) });
  }
  if (hostResult.outcome === 'HOST_NOT_FOUND') return Object.freeze({
    terminalDisposition: 'SUPPORT_CANDIDATE_AMBIGUOUS', hostDisposition: 'HOST_NOT_FOUND',
    reasons: Object.freeze(['SUPPORT_SHAPED_GEOMETRY_WITHOUT_PROVED_PIPE_HOST']),
  });
  return Object.freeze({ terminalDisposition: 'SUPPORT_CANDIDATE_AMBIGUOUS',
    hostDisposition: 'HOST_AMBIGUOUS', reasons: Object.freeze(['PIPE_HOST_ASSOCIATION_AMBIGUOUS']) });
}

export function releaseBlock(candidateDispositions, analyses, admittedPipeCount) {
  if (analyses.some((item) => item?.blockStatus === 'BLOCKED_SUPPORT_TOPOLOGY')) {
    return 'BLOCKED_SUPPORT_TOPOLOGY';
  }
  if (analyses.some((item) => item?.blockStatus === 'BLOCKED_SUPPORT_CLASSIFICATION')) {
    return 'BLOCKED_SUPPORT_CLASSIFICATION';
  }
  const candidates = candidateDispositions.filter((item) => item.inventoryDisposition
    === 'POSSIBLE_SUPPORT_CANDIDATE');
  if (candidates.length && admittedPipeCount === 0) return 'BLOCKED_SUPPORT_HOST_ASSOCIATION';
  if (candidateDispositions.some((item) => item.terminalDisposition === 'SUPPORT_CANDIDATE_AMBIGUOUS')) {
    return 'BLOCKED_SUPPORT_AMBIGUITY';
  }
  return null;
}
