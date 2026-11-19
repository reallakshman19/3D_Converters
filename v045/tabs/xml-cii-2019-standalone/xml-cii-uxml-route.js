// Step-10 "UXML route" (UXML plan step 5). On by default since 17 Nov 2026 (Owner, after the live test passed);
// unticking it in step 10 runs today's route in that browser.
// Today's route runs first, unchanged: its holds, journal, parity rows and warnings stay. With the switch on, the CII
// engine then gets the XML from the UXML supports stage (vendor/uxml-v2, XML_Compare_Utilities, pinned in PIN.json)
// instead: the stage starts where today's branch pass starts (after the gasket drop) and runs every step after it.
// Today's own parity check must pass on the stage's XML, or the Run is held. The log says how the two XMLs compare.
// Not used for Mode B (several staged JSON sources): the stage has no Mode B closure yet; today's route runs.
import { refreshUnmatchedSupportWarnings } from './xml-cii-unmatched-supports.js';
import { recordActiveRestraintStage } from '../../../tabs/xml-cii-2019-standalone/xml-cii-active-restraint-journal.js';
import { createStandaloneRunParityEvidence } from './xml-cii-run-parity-evidence.js';
import { enrichStandaloneXmlForRun, standaloneParityOptions } from './xml-cii-standalone-run-parity-mds-restraints.js?v=20261113-x4-1';
import { dropGasketNodesFromXmlText, gasketDropOn } from '../model-converters/converters/xmltocii2019_helper/enrichment-run-parity.js';
import { parseXmlCiiEnrichmentConfig } from '../../converters/xml-cii2019-core/config.js';
import { loadXmlCiiMaterialMap } from '../../converters/xml-cii2019-core/master-context.js';
import { runSupportsStage } from '../../../vendor/uxml-v2/supports/SupportsStage.js';
import { documentRecord, step10Document } from '../../../vendor/uxml-v2/topology/GasketDropStage.js';
import { compareUxmlRouteXml } from './xml-cii-uxml-route-compare.js';
import { carryTransferNote } from './xml-cii-transfer-protection.js';
import { buildUxmlRunRecord, rememberUxmlRunRecord } from './xml-cii-uxml-run-record.js';

export const UXML_ROUTE_STORAGE_KEY = 'xmlCii.uxmlRoute';
export const UXML_ROUTE_VENDOR = 'vendor/uxml-v2 (XML_Compare_Utilities a31a581f)';

/**
 * The step-10 switch: in a browser, on unless it was turned off there (blocked storage: on, the default).
 * Without a browser's storage (Node, scripts, workers) it is off: today's route, as the callers there expect.
 */
export function uxmlRouteOn(storage) {
  try {
    // Read inside the try: with site data blocked the localStorage getter itself throws (review 17 Nov).
    const store = storage === undefined ? globalThis.localStorage : storage;
    if (!store) return false;
    return store.getItem?.(UXML_ROUTE_STORAGE_KEY) !== 'off';
  } catch {
    return true;
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

/**
 * The source as a UXML document with the gasket drop recorded (end-to-end plan E1). A file the UXML reader refuses
 * (for example a PSI116 file without its namespace, which today's route reads) gets today's gasket drop on the XML
 * text instead; the Run log and the Run record name the refusal, so the Run is never stopped by the document.
 */
function prepareSource(text, options) {
  try {
    const out = step10Document(text, { drop: gasketDropOn(options) });
    return { xmlText: out.xmlText, document: documentRecord(out) };
  } catch (error) {
    if (!/^(PSI116|UXML)_/.test(String(error?.code || ''))) throw error;
    return { xmlText: dropGasketNodesFromXmlText(text, options).xmlText, document: { made: false, refusal: error.code } };
  }
}

/**
 * The supports stage on today's inputs: the job config, today's material map rows, and the XML after the gasket drop.
 * End-to-end plan E1 (Owner 19 Nov 2026): the source is read once into a UXML document and the gasket drop is a UXML
 * stage on it, so each removed node is recorded; the supports stage reads the XML written from that document.
 */
export async function runUxmlSupportsStage(job, extraOptions = {}) {
  const options = { ...standaloneParityOptions(job?.supportConfigJson, job?.options || {}), ...extraOptions };
  const prepared = prepareSource(String(job?.sourceText ?? ''), options);
  const materialMapRows = await loadXmlCiiMaterialMap(parseXmlCiiEnrichmentConfig(options.supportConfigJson), []);
  const started = Date.now();
  const stage = runSupportsStage({
    xmlText: prepared.xmlText,
    stagedJsonText: String(job?.stagedJsonText ?? ''),
    supportConfig: parseConfig(options.supportConfigJson),
    masters: { materialMapRows },
  });
  return { xmlText: stage.xmlText, ms: Date.now() - started, stageInputXml: prepared.xmlText, result: stage, document: prepared.document };
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
  // The stage writes plain XML, which has no comments: carry the source's transfer protection note again, so step 10's
  // Enriched XML (and a second step 10 run on it) keeps the protection (Owner 19 Nov, group 1).
  const stageXml = carryTransferNote(String(job?.sourceText || ''), stage.xmlText);
  const compare = compareUxmlRouteXml(out.xmlText, stage.xmlText);
  const evidence = createStandaloneRunParityEvidence({
    xmlText: stageXml, expectedEntries: out.expectedEntries, branchRows: out.branchRows, nodeRows: out.nodeRows,
  });
  out.uxmlRoute = { vendor: UXML_ROUTE_VENDOR, ms: stage.ms, compare, parityOk: evidence.ok };
  out.diagnostics = [...(out.diagnostics || []), { type: 'uxml-route', ...out.uxmlRoute, message: compareLog(compare) }];
  // Run record (Owner 17 Nov): this Run's own provenance, kept for the step-10 download; held Runs are recorded too.
  rememberUxmlRunRecord(await buildUxmlRunRecord({ job, stageInputXml: stage.stageInputXml, stage: stage.result, evidence, compare,
    vendor: UXML_ROUTE_VENDOR, ms: stage.ms, document: stage.document }));
  if (!evidence.ok) return holdRun(out, evidence);
  out.xmlText = stageXml;
  out.evidence = evidence;
  out.stats = { ...out.stats, parityComparisons: evidence.comparisons, parityMismatches: evidence.mismatchCount, uxmlRouteNodesDiffer: compare.nodesDiffer };
  recordActiveRestraintStage(out.restraintAuditJournal, 'uxml-route', stageXml, { vendor: UXML_ROUTE_VENDOR });
  refreshUnmatchedSupportWarnings(out);
  // Support locks in step 10 (Owner 18 Nov): the stage's own line for nodes that keep their transferred supports.
  const keptSupports = (stage.result?.diagnostics || []).filter((d) => d?.type === 'transfer-supports');
  out.diagnostics = [...out.diagnostics, ...keptSupports];
  out.logs = [...(out.logs || []), ...keptSupports.map((d) => `UXML route: ${d.message}`),
    stage.document.refusal ? `UXML route: no UXML document (${stage.document.refusal}); today's gasket drop ran on the XML text.`
      : `UXML route: the source was read into a UXML document; the gasket drop removed ${stage.document.removed.length} node(s) (recorded in the Run record).`,
    `UXML route ON: CII input from the UXML supports stage (${UXML_ROUTE_VENDOR}, ${stage.ms} ms); parity PASS, input ${evidence.engineInputDigest}.`,
    compareLog(compare)];
  return out;
}
