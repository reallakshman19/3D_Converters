import { detectXmlCiiWorkflowSourceKind, workflowOutputKindForSource } from './xml-cii-workflow-source-detect.js?v=20260804-mds-position-restraints-1';
import { normalizeWorkflowJob, normalizeWorkflowResult } from './xml-cii-workflow-types.js?v=20260804-mds-position-restraints-1';
import { runXmlCii2019WorkflowService } from './xml-cii-workflow-service.js?v=20260928-issue776-authority-2';
import { enrichStandaloneXmlForRun } from './xml-cii-standalone-run-parity-mds-restraints.js?v=20260928-issue776-authority-2';
import { buildXmlCiiModeBRuntimeWorkflowJob } from '../../converters/xml-cii2019-core/topology/xml-cii-mode-b-runtime.js?v=20260930-issue787-modeb04-1';

export async function runXmlCii2019Workflow(job, runtime = {}) {
  const normalized = normalizeWorkflowJob(job);
  if (!normalized.ok) {
    const fallbackSourceKind = job?.sourceKind === 'inputxml' ? 'inputxml' : 'xml';
    return normalizeWorkflowResult({
      ok: false,
      sourceKind: fallbackSourceKind,
      outputKind: workflowOutputKindForSource(fallbackSourceKind),
      enrichedText: '',
      enrichedName: '',
      ciiText: null,
      ciiName: null,
      diagnostics: null,
      logs: [],
      error: normalized.error || 'Invalid XML to CII workflow job.',
    });
  }

  const workflowJob = normalized.job;
  const resolvedSourceKind = workflowJob.sourceKind === 'auto'
    ? detectXmlCiiWorkflowSourceKind(workflowJob.sourceText)
    : workflowJob.sourceKind;
  const serviceRuntime = resolvedSourceKind === 'xml'
    && typeof runtime.runParityEnricher !== 'function'
    ? { ...runtime, runParityEnricher: enrichStandaloneXmlForRun }
    : runtime;

  try {
    return await runXmlCii2019WorkflowService(
      { ...workflowJob, sourceKind: resolvedSourceKind },
      serviceRuntime,
    );
  } catch (error) {
    return normalizeWorkflowResult({
      ok: false,
      sourceKind: resolvedSourceKind,
      outputKind: workflowOutputKindForSource(resolvedSourceKind),
      enrichedText: '',
      enrichedName: '',
      ciiText: null,
      ciiName: null,
      diagnostics: null,
      logs: [],
      error: error?.message || String(error),
    });
  }
}

export async function runXmlCii2019ModeBWorkflow(modeBInput = {}, baseJob = {}, runtime = {}) {
  try {
    const { prepared, job } = buildXmlCiiModeBRuntimeWorkflowJob(modeBInput, baseJob, modeBInput?.modeBOptions || {});
    const result = await runXmlCii2019Workflow(job, runtime);
    const modeB = {
      ...(prepared.evidence || {}),
      sourceName: prepared.sourceName,
      sourceKind: prepared.sourceKind,
      runtimeBound: true,
      productionDefault: false,
    };
    return {
      ...result,
      diagnostics: {
        ...(result.diagnostics || {}),
        modeB,
      },
      logs: [
        `MODE_B_RUNTIME sourceDocs=${modeB.sourceDocumentCount} acceptedEdges=${modeB.acceptedCrossDocumentEdgeCount} junctionAliases=${modeB.junctionAliasCount} sourceDigest=${modeB.sourceDigest}`,
        ...(Array.isArray(result.logs) ? result.logs : []),
      ],
    };
  } catch (error) {
    return normalizeWorkflowResult({
      ok: false,
      sourceKind: 'xml',
      outputKind: workflowOutputKindForSource('xml'),
      enrichedText: '',
      enrichedName: '',
      ciiText: null,
      ciiName: null,
      diagnostics: {
        schema: 'xml-cii-2019-workflow-diagnostics/v1',
        sourceKind: 'xml',
        outputKind: 'enrichedXML',
        branch: 'mode-b-runtime-preparation-blocked',
        warnings: [error?.message || String(error)],
        modeB: {
          schema: 'xml-cii-mode-b-runtime-evidence/v1',
          runtimeBound: false,
          productionDefault: false,
          blocked: true,
        },
      },
      logs: [],
      error: error?.message || String(error),
    });
  }
}

export { detectXmlCiiWorkflowSourceKind } from './xml-cii-workflow-source-detect.js?v=20260804-mds-position-restraints-1';
export {
  DEFAULT_XML_CII_WORKFLOW_OPTIONS,
  normalizeWorkflowJob,
  normalizeWorkflowOptions,
  validateSupportConfigJson,
} from './xml-cii-workflow-types.js?v=20260804-mds-position-restraints-1';
