export function applyXmlCiiShortDropContinuity(xmlText) {
  return {
    xmlText,
    appliedCount: 0,
    diagnostics: [],
    stats: { shortDropContinuityRenumbered: 0 },
  };
}
