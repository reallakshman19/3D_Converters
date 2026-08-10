import { detectXmlCiiWorkflowSourceKind, workflowOutputKindForSource } from './xml-cii-workflow-source-detect.js?v=20260804-mds-position-restraints-1';
import { normalizeWorkflowJob, normalizeWorkflowResult } from './xml-cii-workflow-types.js?v=20260804-mds-position-restraints-1';
import { runXmlCii2019WorkflowService } from './xml-cii-workflow-service.js?v=20260804-mds-position-restraints-1';
import { enrichStandaloneXmlForRun } from './xml-cii-standalone-run-parity-mds-restraints.js?v=20260804-mds-position-restraints-1';
import {
  buildXmlCiiConversionEvidenceXml,
  digestXmlCiiEvidenceText,
} from './xml-cii-conversion-evidence.js';

function parseEvidence(supportConfigJson) {
  try {
    const config = JSON.parse(String(supportConfigJson || '{}'));
    return config?.conversionEvidence && typeof config.conversionEvidence === 'object'
      ? config.conversionEvidence
      : null;
  } catch { return null; }
}

function evidenceResultFields(workflowJob, result) {
  const evidence = parseEvidence(workflowJob?.supportConfigJson);
  if (!evidence) return {};
  const ciiDigest = result?.ciiText ? digestXmlCiiEvidenceText(result.ciiText) : '';
  const enrichedEvidenceXml = buildXmlCiiConversionEvidenceXml(evidence, { ciiDigest });
  const stem = String(workflowJob?.sourceName || 'source.xml').replace(/\.[^.]+$/, '');
  return {
    conversionEvidence: evidence,
    enrichedEvidenceXml,
    enrichedEvidenceName: `${stem}.enriched-evidence.xml`,
  };
}

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
    const result = await runXmlCii2019WorkflowService(
      { ...workflowJob, sourceKind: resolvedSourceKind },
      serviceRuntime,
    );
    return { ...result, ...evidenceResultFields(workflowJob, result) };
  } catch (error) {
    const result = normalizeWorkflowResult({
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
    return { ...result, ...evidenceResultFields(workflowJob, result) };
  }
}

export { detectXmlCiiWorkflowSourceKind } from './xml-cii-workflow-source-detect.js?v=20260804-mds-position-restraints-1';
export {
  DEFAULT_XML_CII_WORKFLOW_OPTIONS,
  normalizeWorkflowJob,
  normalizeWorkflowOptions,
  validateSupportConfigJson,
} from './xml-cii-workflow-types.js?v=20260804-mds-position-restraints-1';
