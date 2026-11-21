// UXML stage files, end-to-end plan E2c step 4 (Owner 19 Nov 2026: "add Icon to download enrichedUXML at each stage
// ... XML->UXML, ... post "4 Preview", UXML post "Weight Match""; "Yes to both": S2 in, snapshots; 20 Nov: "Yes, build
// it", with S0 and S1). Each file is a snapshot: what step 10 would make from the source with today's settings, leaving
// out what later steps add. The same code as step 10 makes it (the UXML route), so it never shows what step 10 would
// not do. The file format is XML_Compare_Utilities uxml/v2/UxmlV2StageFile.js; its review page opens the files.
//   S0 (step 1) the source read; S1 (step 1) after the gasket drop;
//   S2 (step 3) without your Preview edits and weight choices; S3 (step 4) without your weight choices;
//   S4 (step 6) everything: the document step 10 sends the CII engine.
// Preview edits are the config's `overrides` other than `rigidWeight`; weight choices are `overrides.rigidWeight` and
// the job's weightOverrides (the popup). The support mapper and config (steps 7, 8) are used as saved in every stage.
import { normalizeWorkflowJob } from './xml-cii-workflow-types.js?v=20261113-x4-1';
import { applyEffectiveFactsToJob } from './xml-cii-workflow-service.js';
import { detectXmlCiiWorkflowSourceKind } from '../../../tabs/xml-cii-2019-standalone/xml-cii-workflow-source-detect.js';
import { runUxmlSupportsStage, uxmlSourceChain, UXML_ROUTE_VENDOR } from './xml-cii-uxml-route.js';
import { sha256Text } from './xml-cii-uxml-run-record.js';
import { makeStageFile, settingsSha256, stageFileName, STAGES } from '../../../vendor/uxml-v2/UxmlV2StageFile.js';

/** The stage file each step's icon downloads (step 1 offers both S0 and S1). */
export const STAGES_OF_PHASE = Object.freeze({ source: ['S0', 'S1'], 'json-trace': ['S2'], preview: ['S3'], 'weight-match': ['S4'] });

function parseConfig(raw) {
  try {
    const value = JSON.parse(String(raw || '') || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

/** The job's settings split by the step that adds them: {config (without overrides), previewEdits, weightChoices}. */
export function settingsParts(job) {
  const { overrides, ...config } = parseConfig(job?.supportConfigJson);
  const { rigidWeight, ...previewEdits } = overrides && typeof overrides === 'object' && !Array.isArray(overrides) ? overrides : {};
  const weightChoices = { ...(rigidWeight && typeof rigidWeight === 'object' ? rigidWeight : {}), ...(job?.weightOverrides || {}) };
  return { config, previewEdits, weightChoices };
}

/** The job with what the stage leaves out taken away (S2: Preview edits and weight choices; S3: weight choices). */
export function stageJob(job, stage) {
  const leftOut = STAGES[stage]?.leftOut || [];
  if (!leftOut.length) return job;
  const parsed = parseConfig(job.supportConfigJson);
  const overrides = parsed.overrides && typeof parsed.overrides === 'object' && !Array.isArray(parsed.overrides) ? { ...parsed.overrides } : {};
  if (leftOut.includes('weightChoices')) delete overrides.rigidWeight;
  if (leftOut.includes('previewEdits')) for (const key of Object.keys(overrides)) if (key !== 'rigidWeight') delete overrides[key];
  const config = { ...parsed };
  if (Object.keys(overrides).length) config.overrides = overrides;
  else delete config.overrides;
  return { ...job, supportConfigJson: JSON.stringify(config, null, 2), ...(leftOut.includes('weightChoices') ? { weightOverrides: {} } : {}) };
}

async function inputsOf(job, effective) {
  const parts = settingsParts(job);
  return {
    sourceXml: await sha256Text(job.sourceText),
    stagedJson: job.stagedJsonText ? await sha256Text(job.stagedJsonText) : null,
    config: settingsSha256(parts.config),
    previewEdits: settingsSha256(parts.previewEdits),
    weightChoices: settingsSha256(parts.weightChoices),
    // The settings the stage ran with, hashed as step 10's Run record hashes them (S4 equals the Run's).
    runConfig: await sha256Text(effective.supportConfigJson),
  };
}

/**
 * The stage file for a step 10 job as the UI builds it (buildXmlCiiWorkflowJobFromUiState): {name, file}.
 * Throws a plain-words Error when the job cannot make one (no source, an InputXML source, several staged JSON files).
 */
export async function buildUxmlStageFile(rawJob, stage, { now = () => new Date().toISOString() } = {}) {
  if (!STAGES[stage]) throw new Error(`Unknown stage ${stage}.`);
  const normalized = normalizeWorkflowJob(rawJob);
  if (!normalized.ok) throw new Error(normalized.error);
  const job = normalized.job;
  const kind = job.sourceKind === 'auto' ? detectXmlCiiWorkflowSourceKind(job.sourceText) : job.sourceKind;
  if (kind !== 'xml') throw new Error('Stage downloads need a PSI116 XML source (this source is InputXML).');
  if (job.modeBStagedSources?.length) throw new Error('Stage downloads are not made for Mode B (several staged JSON files).');
  const staged = applyEffectiveFactsToJob(stageJob(job, stage));
  const producer = { tool: '3D_Converters step 10 UXML route', vendor: UXML_ROUTE_VENDOR };
  const common = { stage, model: job.sourceName, createdAt: now(), producer, inputs: await inputsOf(stageJob(job, stage), staged) };
  let chain;
  if (stage === 'S0' || stage === 'S1') {
    chain = uxmlSourceChain(staged);
    if (chain.base && stage === 'S0') chain = { base: chain.base, deltas: [] };
  } else {
    const run = await runUxmlSupportsStage(staged);
    chain = run.chain || { refusal: run.changes?.refusal || run.document?.refusal || 'UXML_DOCUMENT_NOT_MADE' };
  }
  const file = makeStageFile({ ...common, base: chain.base, deltas: chain.deltas || [], refusal: chain.refusal || null });
  return { name: stageFileName(job.sourceName, stage), file };
}
