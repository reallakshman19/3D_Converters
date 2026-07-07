import { enrichInputXmlDocument } from './xml-cii-inputxml-enrichment.js';
import { runXmlCii2019StandaloneEngineJob } from './xml-cii-workflow-engine-client.js';
import { createWorkflowDiagnostics, normalizeWorkflowResult } from './xml-cii-workflow-types.js';

function mergeInputXmlEngineResult(enrichedResult, engineResult, outputMode) {
  const logs = [...(enrichedResult.logs || []), ...(Array.isArray(engineResult.logs) ? engineResult.logs : [])];
  const diagnostics = createWorkflowDiagnostics({
    ...(enrichedResult.diagnostics || {}),
    sourceKind: 'inputxml',
    outputKind: 'enrichedInputXML',
    branch: 'direct-inputxml-enrichment-plus-cii-compatibility',
    engineDiagnostics: engineResult.diagnostics || null,
    warnings: [
      ...((Array.isArray(enrichedResult.diagnostics?.warnings) ? enrichedResult.diagnostics.warnings : [])),
      ...((Array.isArray(engineResult.diagnostics?.warnings) ? engineResult.diagnostics.warnings : [])),
    ],
  });
  if (!engineResult.ok) {
    return normalizeWorkflowResult({ ...enrichedResult, ok: false, diagnostics, logs, error: engineResult.error || 'InputXML CII compatibility route failed.' });
  }
  return normalizeWorkflowResult({
    ...enrichedResult,
    enrichedText: outputMode === 'cii-only' ? '' : enrichedResult.enrichedText,
    enrichedName: outputMode === 'cii-only' ? '' : enrichedResult.enrichedName,
    ciiText: engineResult.ciiText,
    ciiName: engineResult.ciiName,
    diagnostics,
    logs,
  });
}

function normalizeXmlEngineResult(engineResult) {
  const engineDiagnostics = engineResult?.diagnostics && typeof engineResult.diagnostics === 'object' ? engineResult.diagnostics : null;
  const diagnostics = createWorkflowDiagnostics({
    ...(engineDiagnostics || {}),
    sourceKind: 'xml',
    outputKind: 'enrichedXML',
    branch: 'psi116-xml-compatibility-engine',
    engineDiagnostics,
    warnings: Array.isArray(engineDiagnostics?.warnings) ? engineDiagnostics.warnings : [],
  });
  return normalizeWorkflowResult({
    ...engineResult,
    sourceKind: 'xml',
    outputKind: 'enrichedXML',
    diagnostics,
  });
}

export async function runXmlCii2019WorkflowService(job, runtime = {}) {
  if (job.sourceKind === 'inputxml') {
    const enrichedResult = enrichInputXmlDocument(job);
    if (job.options.outputMode === 'enriched-only') return normalizeWorkflowResult(enrichedResult);
    const engineJob = { ...job, sourceText: enrichedResult.enrichedText, sourceName: enrichedResult.enrichedName, options: { ...job.options, outputMode: 'cii-only' } };
    const engineResult = await runXmlCii2019StandaloneEngineJob(engineJob, runtime);
    return mergeInputXmlEngineResult(enrichedResult, engineResult, job.options.outputMode);
  }
  const result = await runXmlCii2019StandaloneEngineJob(job, runtime);
  return normalizeXmlEngineResult(result);
}
