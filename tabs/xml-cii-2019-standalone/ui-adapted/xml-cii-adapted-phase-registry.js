/**
 * Standalone adapted XML→CII(2019) workflow phase registry.
 *
 * Reference phase contract: tabs/model-converters/WorkflowShell.js / XML_CII_WORKFLOW_PHASES.
 * This module adapts the full phase model for the standalone API-first workflow without importing the legacy workflow shell or executing its side effects.
 */
export const XML_CII_WORKFLOW_PHASES = Object.freeze([
  { id: 'regex', label: '1 Regex', summary: 'Configure line-key, piping-class, and size extraction strategy.', state: 'Adapted' },
  { id: 'import-masters', label: '2 Import Masters', summary: 'Select PSI116 XML/InputXML sources and optional staged JSON/master support inputs.', state: 'Adapted' },
  { id: 'json-trace', label: '3 JSON Trace', summary: 'Inspect staged JSON and InputXML side-load trace evidence before running.', state: 'Adapted' },
  { id: 'preview', label: '4 Preview', summary: 'Preview selected source, side-load, and normalized workflow options.', state: 'Adapted' },
  { id: 'diagnostics', label: '5 Diagnostics', summary: 'Review normalized workflow diagnostics, warnings, and branch metadata.', state: 'Adapted' },
  { id: 'weight-match', label: '5A Weight Match', summary: 'Review standalone readiness for weight/material matching configuration.', state: 'Adapted' },
  { id: 'run', label: '6 Run', summary: 'Call runXmlCii2019Workflow(job, runtime) and collect enriched XML/InputXML and optional CII.', state: 'Adapted' },
  { id: 'support-mapper', label: '7 Support Types', summary: 'Review DTXR-derived support and restraint mapping rules.', state: 'Adapted' },
  { id: 'config', label: '8 Config', summary: 'Edit standalone support/config JSON passed to the public workflow API.', state: 'Adapted' },
  { id: 'custom-input', label: 'Custom Input', summary: 'Configure standalone-only InputXML / Element Side-load input and options.', state: 'Adapted' },
]);

export function normalizeAdaptedWorkflowPhaseId(phaseId) {
  const id = String(phaseId || '').trim();
  if (XML_CII_WORKFLOW_PHASES.some((phase) => phase.id === id)) return id;
  return XML_CII_WORKFLOW_PHASES[0]?.id || 'regex';
}

export function getAdaptedWorkflowPhase(id) {
  return XML_CII_WORKFLOW_PHASES.find((phase) => phase.id === id) || XML_CII_WORKFLOW_PHASES[0];
}

(function assertAdaptedPhaseOrder() {
  const ids = XML_CII_WORKFLOW_PHASES.map((phase) => phase.id);
  if (ids.indexOf('weight-match') >= ids.indexOf('run')) throw new Error('[Standalone XML CII adapted UI] Phase ordering violation.');
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) throw new Error(`[Standalone XML CII adapted UI] Duplicate phase id: ${id}`);
    seen.add(id);
  }
})();
