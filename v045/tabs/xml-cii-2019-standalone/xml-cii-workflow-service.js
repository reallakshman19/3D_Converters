import { modeBSourceConfigWarning, withModeBSourceConfigWarning } from '../../../converters/xml-cii2019-core/mode-b-source-config.js?v=20261113-x5a-2';
import { assertModeBRunRestraints, assertModeBRunResult } from '../../../converters/xml-cii2019-core/xml-node-offset-combine.js?v=20261113-x5a-2';
import { enrichInputXmlDocument } from './xml-cii-inputxml-enrichment.js';
import { runXmlCii2019StandaloneEngineJob } from './xml-cii-workflow-engine-client.js';
import { createWorkflowDiagnostics, normalizeWorkflowResult } from './xml-cii-workflow-types.js?v=20261113-x4-1';
import { applyStandaloneSifFacts } from '../../../tabs/xml-cii-2019-standalone/xml-cii-standalone-sif-apply.js';
import { enrichStandaloneXmlForRun } from './xml-cii-standalone-run-parity.js';
import { ciiSha256 } from './xml-cii-final-property-reader.js';
import { captureModeBStagedSources } from './xml-cii-frozen-run-package.js';
import { writeJoinedNames } from './xml-cii-joined-names.js';
import { noteEngineOnRunRecord, noteEnrichedOnRunRecord } from './xml-cii-uxml-run-record.js';
import { enrichedFromDocument } from './xml-cii-uxml-enriched.js';
import {captureActiveRestraintAudit} from '../../../tabs/xml-cii-2019-standalone/xml-cii-active-restraint-audit.js';

function parseSupportConfig(raw) {
  try {
    const value = JSON.parse(String(raw ?? '') || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

// Exported for the stage files (E2c step 4): a snapshot applies the same facts step 10 does.
export function applyEffectiveFactsToJob(job) {
  const config = parseSupportConfig(job.supportConfigJson);
  const weightOverrides = job.weightOverrides && typeof job.weightOverrides === 'object' ? job.weightOverrides : {};
  if (Object.keys(weightOverrides).length) {
    config.overrides = { ...(config.overrides || {}), rigidWeight: { ...(config.overrides?.rigidWeight || {}), ...weightOverrides } };
  }
  if (Array.isArray(job.previewFacts) && job.previewFacts.length) config.previewFacts = job.previewFacts;
  if (Array.isArray(job.manualFacts) && job.manualFacts.length) config.manualFacts = job.manualFacts;
  if (Array.isArray(job.supportMapperRules) && job.supportMapperRules.length) config.supportMapperRules = job.supportMapperRules;
  return { ...job, supportConfigJson: JSON.stringify(config, null, 2) };
}

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

function blockedRunParityResult(job, parity) {
  const evidence = parity?.evidence || null;
  const error = parity?.error
    || (!parity?.applied ? 'Standalone run parity did not release a verified converter input.' : '')
    || (!evidence ? 'Standalone run parity evidence is missing.' : '')
    || 'Standalone run parity verification failed.';
  return normalizeXmlEngineResult({
    ok: false,
    sourceKind: 'xml',
    outputKind: 'enrichedXML',
    enrichedText: '',
    enrichedName: '',
    ciiText: null,
    ciiName: null,
    diagnostics: {
      schema: 'xml-cii-2019-workflow-diagnostics/v1',
      sourceKind: 'xml',
      outputMode: job?.options?.outputMode || 'enriched-only',
      warnings: [error],
      runParityStats: parity?.stats || {},
      runParityEvidence: evidence,
      converterInputReleased: false,
    },
    logs: Array.isArray(parity?.logs) ? parity.logs : [],
    error,
  });
}

async function runWorkflow(job, runtime) {
  const factedJob = applyEffectiveFactsToJob(job);
  assertModeBRunRestraints(factedJob, factedJob.sourceText, 'Run combined source XML');
  if (factedJob.sourceKind === 'inputxml') {
    const enrichedResult = enrichInputXmlDocument(factedJob);
    const sif = applyStandaloneSifFacts(enrichedResult.enrichedText, 'inputxml', factedJob.sifFacts);
    const finalEnrichedResult = { ...enrichedResult, enrichedText: sif.text };
    if (factedJob.options.outputMode === 'enriched-only') return normalizeWorkflowResult(finalEnrichedResult);
    const engineJob = { ...factedJob, sourceText: sif.text, sourceName: enrichedResult.enrichedName, options: { ...factedJob.options, outputMode: 'cii-only' } };
    const engineResult = await runXmlCii2019StandaloneEngineJob(engineJob, runtime);
    return mergeInputXmlEngineResult(finalEnrichedResult, engineResult, factedJob.options.outputMode);
  }

  const parityRunner = typeof runtime.runParityEnricher === 'function'
    ? runtime.runParityEnricher
    : enrichStandaloneXmlForRun;
  const parity = await parityRunner(factedJob);
  if (!parity?.applied || parity?.error || !parity?.evidence || parity.evidence.ok !== true) {
    const blocked=blockedRunParityResult(factedJob,parity);
    blocked.restraintAudit=await captureActiveRestraintAudit(parity?.restraintAuditJournal,blocked);
    if(blocked.restraintAudit.run)blocked.restraintAudit.status='CONVERSION_HELD';
    return blocked;
  }

  assertModeBRunRestraints(factedJob, parity.xmlText, 'Run engine input XML', { allowAdditions: true });
  // E3 (Owner 21 Nov 2026): with "Engine reads UXML" on, the route also hands the document parity.xmlText is written from.
  const engineJob = { ...factedJob, sourceText: parity.xmlText, ...(parity.engineUxml ? { engineUxml: parity.engineUxml } : {}),
    // E4: the engine then skips its Enriched XML pass over the XML; the Enriched XML is written from the document below.
    // Only when an Enriched XML is asked for (PR 440 review N2: "CII only" gives none, as today; engine.js checks the same).
    ...(parity.engineUxml && parity.enrichedUxml && factedJob.options?.outputMode === 'both' ? { enrichedFromUxml: true } : {}) };
  const result = await runXmlCii2019StandaloneEngineJob(engineJob, runtime);
  assertModeBRunResult(factedJob, result, engineJob.sourceText);
  // E4: the engine's steps are recorded after the "|" names step (the Enriched XML's document), built once for both.
  const recorded = parity.engineUxml
    ? noteEngineOnRunRecord(engineJob.sourceName, parity.enrichedUxml || parity.engineUxml, result?.engineUxml) : null;
  // E4 (Owner 21 Nov 2026, "Yes, as suggested"): the engine read the document, so the Enriched XML is written from the
  // route's final document plus the engine's recorded steps ("|" names and note included). If that cannot be written,
  // today's Enriched XML pass runs on the XML and the joined names go in as before; the log says which.
  let enrichedFromDoc = false;
  if (engineJob.enrichedFromUxml && result?.ok && result.engineUxml?.used) {
    const written = enrichedFromDocument(parity.enrichedUxml, result.engineUxml.changes, { sourceText: factedJob.sourceText, sifFacts: factedJob.sifFacts, recorded });
    if (written.ok) {
      result.enrichedText = written.xmlText;
      enrichedFromDoc = true;
      parity.logs = [...(parity.logs || []), `Enriched XML written from the UXML document (revision ${written.revision}; ${written.removedValues} value(s) the engine removed).`];
      noteEnrichedOnRunRecord(engineJob.sourceName, { fromDocument: true, revision: written.revision, sha256: await ciiSha256(written.xmlText) });
    } else {
      const again = await runXmlCii2019StandaloneEngineJob({ ...factedJob, sourceText: parity.xmlText, options: { ...factedJob.options, outputMode: 'enriched-only' } }, runtime);
      result.enrichedText = again?.enrichedText || '';
      parity.logs = [...(parity.logs || []), `Enriched XML: could not be written from the UXML document (${written.error}); made from the XML as before.`];
      noteEnrichedOnRunRecord(engineJob.sourceName, { fromDocument: false, error: written.error });
    }
  }
  // E2c step 2 (Owner 20 Nov 2026, "Write | in output"): the joined names go into the Enriched XML, never the CII input.
  if (!enrichedFromDoc && parity.uxmlNames?.length && result?.enrichedText) {
    const named = writeJoinedNames(result.enrichedText, parity.uxmlNames);
    if (named.ok) result.enrichedText = named.xmlText;
    parity.logs = [...(parity.logs || []), named.message];
  }
  if (Array.isArray(result?.logs) && parity.logs.length) result.logs = [...parity.logs, ...result.logs];
  const normalized = normalizeXmlEngineResult(result);
  normalized.restraintAudit=await captureActiveRestraintAudit(parity.restraintAuditJournal,normalized);
  // Non-published, run-pinned review evidence: exact XML handed to the engine,
  // effective weight master, staged context and weight unit scale. The final CII
  // pointer/branch/geometry must still reconcile before any reference is offered.
  if (normalized.ok && normalized.ciiText && normalized.ciiInputSource !== 'topofix') {
    normalized.finalRigidReviewEvidence = {
      sourceKind: 'xml',
      engineInputText: parity.xmlText,
      stagedJsonText: factedJob.stagedJsonText || '',
      // X3: retain only per-source staged byte lengths, hashes and their run-time seal.
      ...await captureModeBStagedSources(factedJob.modeBStagedSources),
      supportConfigJson: factedJob.supportConfigJson,
      weightScale: factedJob.options?.kgToNewton === false ? 1 : 10,
      engineInputDigest: parity.evidence.engineInputDigest,
      // R2: sealed effective converter-boundary custody. The original
      // uploaded job options must not be inferred again after this run.
      engineInputSha256: await ciiSha256(parity.xmlText),
      originalCiiSha256: await ciiSha256(normalized.ciiText),
      effectiveSourceName: engineJob.sourceName,
      effectiveOptions: { ...engineJob.options },
      originalCiiName: normalized.ciiName,
    };
  }
  if (normalized.diagnostics) {
    normalized.diagnostics.runParityStats = parity.stats;
    normalized.diagnostics.runParityEvidence = parity.evidence;
    normalized.diagnostics.converterInputReleased = true;
    normalized.diagnostics.converterInputDigest = parity.evidence.engineInputDigest;
  }
  return normalized;
}

export async function runXmlCii2019WorkflowService(job, runtime = {}) {
  modeBSourceConfigWarning(job.modeBManifest);
  const result = await runWorkflow(job, runtime);
  return withModeBSourceConfigWarning(result, job.modeBManifest);
}
