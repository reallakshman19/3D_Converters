import { refreshUnmatchedSupportWarnings } from './xml-cii-unmatched-supports.js';
import {
  enrichStandaloneXmlForRun as enrichStandaloneXmlForRunBase,
  loadParentWeightMatchModules,
  standaloneParityOptions,
} from './xml-cii-standalone-run-parity-atta-default.js?v=20260804-mds-position-restraints-1';
import { createStandaloneRunParityEvidence } from './xml-cii-run-parity-evidence.js?v=20260804-mds-position-restraints-1';
import { closeGovernedMdsPositionRestraintsXml } from './xml-cii-mds-restraint-closure.js?v=20260804-mds-position-restraints-1';
import { closeModeBSourceRestraintsXml } from './xml-cii-mode-b-restraint-closure.js?v=20261113-x4-1';
import {recordActiveRestraintStage} from '../../../tabs/xml-cii-2019-standalone/xml-cii-active-restraint-journal.js';
import { restoreTransferSupports, snapshotTransferSupports } from '../../../vendor/uxml-v2/supports/process/TransferSupportsKeep.js';
import { carryTransferNote } from './xml-cii-transfer-protection.js';

function text(value) {
  return value === undefined || value === null ? '' : String(value);
}

function parseConfig(raw) {
  try {
    const value = JSON.parse(text(raw) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

function effectiveConfig(job, extraOptions) {
  return parseConfig(extraOptions?.supportConfigJson || job?.supportConfigJson || '{}');
}

function mergeStats(base, extra) {
  const out = { ...(base || {}) };
  for (const [key, value] of Object.entries(extra || {})) {
    if (typeof value === 'number' && Number.isFinite(value)) out[key] = Number(out[key] || 0) + value;
    else out[key] = value;
  }
  return out;
}

/**
 * Support locks in step 10 (Owner 18 Nov 2026): the nodes the transfer protection note names in its "supports" list
 * keep the supports of the source XML. Today's route adds default supports after protected values are restored
 * (measured: EF-05 node 90's removed support came back), so this runs after the MDS closure, the route's last
 * restraint step, with the same rule as the UXML supports stage (vendor/uxml-v2 TransferSupportsKeep.js).
 * No note, or none of those nodes changed: the result is returned as it came.
 */
function keepTransferredSupports(out, job) {
  if (!out?.xmlText || out.error || out.applied !== true) return out;
  const kept = restoreTransferSupports(out.xmlText, snapshotTransferSupports(text(job?.sourceText)));
  out.diagnostics = [...(Array.isArray(out.diagnostics) ? out.diagnostics : []), ...kept.diagnostics];
  if (!kept.kept.length) return out;
  // The keep writes plain XML, which has no comments: carry the source's note again, so a second run keeps the protection.
  out.xmlText = carryTransferNote(text(job?.sourceText), kept.xmlText);
  out.stats = mergeStats(out.stats, { transferSupportsKept: kept.kept.length });
  recordActiveRestraintStage(out.restraintAuditJournal, 'transfer-supports', out.xmlText, { diagnostics: kept.diagnostics });
  out.evidence = createStandaloneRunParityEvidence({
    xmlText: out.xmlText, expectedEntries: out.expectedEntries, branchRows: out.branchRows, nodeRows: out.nodeRows,
  });
  out.stats.parityComparisons = out.evidence.comparisons;
  out.stats.parityMismatches = out.evidence.mismatchCount;
  const line = kept.diagnostics.find((d) => d.severity === 'info')?.message || '';
  if (!out.evidence.ok) {
    out.error = `Keeping the supports transferred from CAESAR II blocked ${out.evidence.mismatchCount} parity mismatch(es).`;
    out.applied = false;
    out.logs = [...(out.logs || []), `${out.error} Engine input was not released.`];
    return out;
  }
  refreshUnmatchedSupportWarnings(out);
  out.logs = [...(out.logs || []), line, `Standalone run parity reverified after keeping transferred supports: ${out.evidence.status}.`];
  return out;
}

export async function enrichStandaloneXmlForRun(job, extraOptions = {}) {
  return keepTransferredSupports(await enrichWithMdsClosure(job, extraOptions), job);
}

async function enrichWithMdsClosure(job, extraOptions = {}) {
  const out = await enrichStandaloneXmlForRunBase(job, extraOptions);
  if (!out?.xmlText || out.error || out.applied !== true) return out;

  // Mode B: each source's staged JSON closes only that source's pipes.
  const modeBSources = Array.isArray(job?.modeBStagedSources) ? job.modeBStagedSources : [];
  const closure = modeBSources.length
    ? closeModeBSourceRestraintsXml(out.xmlText, modeBSources, effectiveConfig(job, extraOptions))
    : closeGovernedMdsPositionRestraintsXml(
      out.xmlText,
      text(job?.stagedJsonText),
      effectiveConfig(job, extraOptions),
      out.restraintAuditJournal,
    );
  out.diagnostics = [
    ...(Array.isArray(out.diagnostics) ? out.diagnostics : []),
    ...(Array.isArray(closure.diagnostics) ? closure.diagnostics : []),
  ];
  out.stats = mergeStats(out.stats, closure.stats);
  recordActiveRestraintStage(out.restraintAuditJournal,'mds-closure',closure.xmlText,
    {config:effectiveConfig(job,extraOptions),diagnostics:closure.diagnostics});
  if (!closure.changed) return out;

  out.xmlText = closure.xmlText;
  out.evidence = createStandaloneRunParityEvidence({
    xmlText: out.xmlText,
    expectedEntries: out.expectedEntries,
    branchRows: out.branchRows,
    nodeRows: out.nodeRows,
  });
  out.stats.parityComparisons = out.evidence.comparisons;
  out.stats.parityMismatches = out.evidence.mismatchCount;
  if (!out.evidence.ok) {
    out.error = `MDS position-restraint closure blocked ${out.evidence.mismatchCount} parity mismatch(es).`;
    out.applied = false;
    out.logs = [...(out.logs || []), `${out.error} Engine input was not released.`];
    return out;
  }

  refreshUnmatchedSupportWarnings(out);
  out.logs = [
    ...(out.logs || []),
    `MDS position-restraint closure applied: ${closure.stats.mdsGuideRestraintsAdded || 0} GUI, ${closure.stats.mdsLineStopRestraintsAdded || 0} LIM, and ${closure.stats.mdsRestRestraintsAdded || 0} REST restraint(s) added.`,
    `Standalone run parity reverified after MDS restraint closure: ${out.evidence.status}, input ${out.evidence.engineInputDigest}.`,
  ];
  return out;
}

export { loadParentWeightMatchModules, standaloneParityOptions };
