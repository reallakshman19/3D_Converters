/**
 * Standalone adapted XML→CII(2019) workflow phase registry.
 * Reference contract: tabs/model-converters/WorkflowShell.js / XML_CII_WORKFLOW_PHASES.
 * This adapts the phase model without importing or executing the Model Converters workflow.
 */
export const XML_CII_WORKFLOW_PHASES = Object.freeze([
  { id: 'regex', label: '1 Regex', summary: 'Configure line-key, piping-class, and size extraction strategy.' },
  { id: 'import-masters', label: '2 Import Masters', summary: 'Select XML/InputXML source and optional staged JSON/master inputs.' },
  { id: 'json-trace', label: '3 JSON Trace', summary: 'Inspect staged JSON and InputXML side-load trace evidence.' },
  { id: 'manual-element', label: '5 Manual / Element Side-load', summary: 'Resolve XML manual restraints and InputXML element side-load rows.' },
  { id: 'preview', label: '4 Preview', summary: 'Preview selected source, side-load, options, and config state.' },
  { id: 'diagnostics', label: '5 Diagnostics', summary: 'Review normalized workflow diagnostics and warnings.' },
  { id: 'matched-audit', label: '8 Matched Audit', summary: 'Review matched and rejected standalone facts with latest run state.' },
  { id: 'weight-match', label: '5A Weight Match', summary: 'Review weight/material/rating readiness through config inputs.' },
  { id: 'run', label: '6 Run', summary: 'Call runXmlCii2019Workflow and collect generated artifacts.' },
  { id: 'support-mapper', label: '7 Support Types', summary: 'Review DTXR-derived support and restraint mapping rules.' },
  { id: 'config', label: '8 Config', summary: 'Edit support/config JSON passed to the standalone API.' },
  { id: 'custom-input', label: 'Custom Input', summary: 'Configure InputXML text and element side-load options.' },
]);

export function normalizeAdaptedWorkflowPhaseId(phaseId) {
  const id = String(phaseId || '').trim();
  return XML_CII_WORKFLOW_PHASES.some((phase) => phase.id === id) ? id : 'regex';
}

export function getAdaptedWorkflowPhase(phaseId) {
  const id = normalizeAdaptedWorkflowPhaseId(phaseId);
  return XML_CII_WORKFLOW_PHASES.find((phase) => phase.id === id) || XML_CII_WORKFLOW_PHASES[0];
}

export function getAdaptedWorkflowPhaseLabels() {
  return XML_CII_WORKFLOW_PHASES.map((phase) => phase.label);
}
