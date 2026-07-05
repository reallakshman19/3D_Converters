import { runXmlCii2019StandaloneEngineJob } from './xml-cii-workflow-engine-client.js';
import { createWorkflowDiagnostics, normalizeWorkflowResult } from './xml-cii-workflow-types.js';

function stemFromName(name, fallback) {
  const safe = String(name || fallback || 'input').replace(/[\/:*?"<>|]/g, '_');
  const idx = safe.lastIndexOf('.');
  return idx > 0 ? safe.slice(0, idx) : safe;
}

function inputXmlPassthroughResult(job) {
  const stem = stemFromName(job.sourceName, 'inputxml');
  const wantsCii = job.options.outputMode === 'cii-only' || job.options.outputMode === 'both';
  return {
    ok: true,
    sourceKind: 'inputxml',
    outputKind: 'enrichedInputXML',
    enrichedText: job.options.outputMode === 'cii-only' ? '' : job.sourceText,
    enrichedName: job.options.outputMode === 'cii-only' ? '' : `${stem}_enriched.input.xml`,
    ciiText: null,
    ciiName: null,
    diagnostics: createWorkflowDiagnostics({
      sourceKind: 'inputxml',
      outputKind: 'enrichedInputXML',
      branch: 'inputxml-preserve-family',
      warnings: [
        'Phase 1 preserves element-based InputXML as InputXML. Full InputXML enrichment is intentionally isolated for a later parity phase.',
        ...(wantsCii ? ['CII output is requested through the isolated InputXML to CII compatibility route.'] : []),
      ],
    }),
    logs: ['InputXML branch selected.', 'InputXML source family preserved; no PSI116 XML enrichment was applied.'],
    error: null,
  };
}

function mergeInputXmlEngineResult(passthrough, engineResult) {
  const logs = [...passthrough.logs, ...(Array.isArray(engineResult.logs) ? engineResult.logs : [])];
  const diagnostics = { ...(passthrough.diagnostics || {}), engineDiagnostics: engineResult.diagnostics || null };
  if (!engineResult.ok) {
    return normalizeWorkflowResult({ ...passthrough, ok: false, diagnostics, logs, error: engineResult.error || 'InputXML CII compatibility route failed.' });
  }
  return normalizeWorkflowResult({ ...passthrough, ciiText: engineResult.ciiText, ciiName: engineResult.ciiName, diagnostics, logs });
}

export async function runXmlCii2019WorkflowService(job, runtime = {}) {
  if (job.sourceKind === 'inputxml') {
    const passthrough = inputXmlPassthroughResult(job);
    if (job.options.outputMode === 'enriched-only') return normalizeWorkflowResult(passthrough);
    const engineResult = await runXmlCii2019StandaloneEngineJob(job, runtime);
    return mergeInputXmlEngineResult(passthrough, engineResult);
  }
  const result = await runXmlCii2019StandaloneEngineJob(job, runtime);
  return normalizeWorkflowResult(result);
}
