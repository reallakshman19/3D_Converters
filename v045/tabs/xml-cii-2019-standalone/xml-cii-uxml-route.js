// Step-10 "UXML route" (UXML plan step 5; off by default, the Owner turns it on in step 10 to test it).
// Today's route runs first, unchanged: its holds, journal, parity rows and warnings stay. With the switch on, the CII
// engine then gets the XML from the UXML supports stage (vendor/uxml-v2, XML_Compare_Utilities, pinned in PIN.json)
// instead: the stage starts where today's branch pass starts (after the gasket drop) and runs every step after it.
// Today's own parity check must pass on the stage's XML, or the Run is held. The log says how the two XMLs compare.
// Not used for Mode B (several staged JSON sources): the stage has no Mode B closure yet; today's route runs.
import { refreshUnmatchedSupportWarnings } from './xml-cii-unmatched-supports.js';
import { recordActiveRestraintStage } from '../../../tabs/xml-cii-2019-standalone/xml-cii-active-restraint-journal.js';
import { createStandaloneRunParityEvidence } from './xml-cii-run-parity-evidence.js';
import { enrichStandaloneXmlForRun, standaloneParityOptions } from './xml-cii-standalone-run-parity-mds-restraints.js?v=20261113-x4-1';
import { dropGasketNodesFromXmlText } from '../model-converters/converters/xmltocii2019_helper/enrichment-run-parity.js';
import { parseXmlCiiEnrichmentConfig } from '../../converters/xml-cii2019-core/config.js';
import { loadXmlCiiMaterialMap } from '../../converters/xml-cii2019-core/master-context.js';
import { runSupportsStage } from '../../../vendor/uxml-v2/supports/SupportsStage.js';
import { compareUxmlRouteXml } from './xml-cii-uxml-route-compare.js';

export const UXML_ROUTE_STORAGE_KEY = 'xmlCii.uxmlRoute';
export const UXML_ROUTE_VENDOR = 'vendor/uxml-v2 (XML_Compare_Utilities cfea5beb)';

/** The step-10 switch; off unless the Owner turned it on in this browser. */
export function uxmlRouteOn(storage = globalThis.localStorage) {
  try {
    return storage?.getItem?.(UXML_ROUTE_STORAGE_KEY) === 'on';
  } catch {
    return false;
  }
}

function parseConfig(raw) {
  try {
    const value = JSON.parse(String(raw || '') || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

/** The supports stage on today's inputs: the XML after the gasket drop, the job config, today's material map rows. */
export async function runUxmlSupportsStage(job, extraOptions = {}) {
  const options = { ...standaloneParityOptions(job?.supportConfigJson, job?.options || {}), ...extraOptions };
  const prepared = dropGasketNodesFromXmlText(String(job?.sourceText ?? ''), options);
  const materialMapRows = await loadXmlCiiMaterialMap(parseXmlCiiEnrichmentConfig(options.supportConfigJson), []);
  const started = Date.now();
  const stage = runSupportsStage({
    xmlText: prepared.xmlText,
    stagedJsonText: String(job?.stagedJsonText ?? ''),
    supportConfig: parseConfig(options.supportConfigJson),
    masters: { materialMapRows },
  });
  return { xmlText: stage.xmlText, ms: Date.now() - started };
}

function compareLog(compare) {
  if (compare.equal) return `UXML route: the XML equals today's route on every value and restraint (${compare.branches} branches, ${compare.nodes} nodes).`;
  const where = compare.examples.slice(0, 5).map((e) => `${e.branch}${e.NodeNumber ? ` node ${e.NodeNumber}` : ''}: ${[...(e.values || []), ...(e.restraints ? ['restraints'] : [])].join(', ')}`);
  const counts = compare.nodeCountDiffer.length ? `node counts differ on ${compare.nodeCountDiffer.length} branch(es)` : `${compare.nodesDiffer} node(s) and ${compare.branchesDiffer} branch(es) differ`;
  const fields = Object.entries(compare.fields).map(([name, n]) => `${name} on ${n}`).join(', ');
  // Owner 16 Nov: the stage measures ElementLengthMm from the final node numbering (the CII element lengths).
  const lengthsOnly = fields && Object.keys(compare.fields).every((name) => name === 'ElementLengthMm') && !compare.branchesDiffer
    ? ' Only ElementLengthMm differs: the UXML stage measures it from the final node numbering (Owner decision, 16 Nov).' : '';
  return `UXML route: ${counts} from today's route (${fields || 'branch values'}).${lengthsOnly} First: ${where.join('; ')}`;
}

function holdRun(out, evidence) {
  out.error = `UXML route blocked ${evidence.mismatchCount} parity mismatch(es) on the UXML stage's XML.`;
  out.applied = false;
  out.logs = [...(out.logs || []), `${out.error} Engine input was not released. Turn the UXML route off in step 10 to run today's route.`];
  return out;
}

/** Today's route, then (switch on) the UXML stage's XML for the CII engine. Same result shape as today's enricher. */
export async function enrichStandaloneXmlForUxmlRoute(job, extraOptions = {}) {
  const out = await enrichStandaloneXmlForRun(job, extraOptions);
  if (!out?.xmlText || out.error || out.applied !== true) return out;
  if (Array.isArray(job?.modeBStagedSources) && job.modeBStagedSources.length) {
    out.logs = [...(out.logs || []), 'UXML route: not used for Mode B (several staged JSON files); today\'s route ran.'];
    return out;
  }
  const stage = await runUxmlSupportsStage(job, extraOptions);
  const compare = compareUxmlRouteXml(out.xmlText, stage.xmlText);
  const evidence = createStandaloneRunParityEvidence({
    xmlText: stage.xmlText, expectedEntries: out.expectedEntries, branchRows: out.branchRows, nodeRows: out.nodeRows,
  });
  out.uxmlRoute = { vendor: UXML_ROUTE_VENDOR, ms: stage.ms, compare, parityOk: evidence.ok };
  out.diagnostics = [...(out.diagnostics || []), { type: 'uxml-route', ...out.uxmlRoute, message: compareLog(compare) }];
  if (!evidence.ok) return holdRun(out, evidence);
  out.xmlText = stage.xmlText;
  out.evidence = evidence;
  out.stats = { ...out.stats, parityComparisons: evidence.comparisons, parityMismatches: evidence.mismatchCount, uxmlRouteNodesDiffer: compare.nodesDiffer };
  recordActiveRestraintStage(out.restraintAuditJournal, 'uxml-route', stage.xmlText, { vendor: UXML_ROUTE_VENDOR });
  refreshUnmatchedSupportWarnings(out);
  out.logs = [...(out.logs || []),
    `UXML route ON: CII input from the UXML supports stage (${UXML_ROUTE_VENDOR}, ${stage.ms} ms); parity PASS, input ${evidence.engineInputDigest}.`,
    compareLog(compare)];
  return out;
}
