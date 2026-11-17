import { detectXmlCiiWorkflowSourceKind, workflowOutputKindForSource } from '../../../tabs/xml-cii-2019-standalone/xml-cii-workflow-source-detect.js';
import { normalizeWorkflowJob, normalizeWorkflowResult } from './xml-cii-workflow-types.js?v=20261113-x4-1';
import { runXmlCii2019WorkflowService } from './xml-cii-workflow-service.js?v=20261113-x5a-2';
import { enrichStandaloneXmlForRun } from './xml-cii-standalone-run-parity-mds-restraints.js?v=20261113-x4-1';
import { enrichStandaloneXmlForUxmlRoute, uxmlRouteOn } from './xml-cii-uxml-route.js';
import {activeAuditJobIdentity,activeAuditJobManifest} from '../../../tabs/xml-cii-2019-standalone/xml-cii-active-restraint-audit.js';

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
    // Step-10 switch "UXML route" (on by default in a browser since 17 Nov): the CII input comes from the UXML supports stage.
    ? { ...runtime, runParityEnricher: uxmlRouteOn() ? enrichStandaloneXmlForUxmlRoute : enrichStandaloneXmlForRun }
    : runtime;

  try {
    const result=await runXmlCii2019WorkflowService(
      { ...workflowJob, sourceKind: resolvedSourceKind },
      serviceRuntime,
    );
    if(result.restraintAudit?.run) {
      result.restraintAudit.run.requestSha256=await activeAuditJobIdentity(workflowJob);
      result.restraintAudit.run.requestManifest=await activeAuditJobManifest(workflowJob);
    }
    return result;
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

export { detectXmlCiiWorkflowSourceKind } from '../../../tabs/xml-cii-2019-standalone/xml-cii-workflow-source-detect.js';
export {
  DEFAULT_XML_CII_WORKFLOW_OPTIONS,
  normalizeWorkflowJob,
  normalizeWorkflowOptions,
  validateSupportConfigJson,
} from './xml-cii-workflow-types.js?v=20261113-x4-1';
