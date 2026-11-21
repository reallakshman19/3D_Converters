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
import { runStage, sha256Hex } from '../../../vendor/uxml-v2/UxmlV2Kernel.js';
import { firstNameParts } from './xml-cii-joined-names.js';
import { runSupportsUnderLocks } from '../../../vendor/uxml-v2/supports/SupportsUnderLocks.js';
import { changeList } from '../../../vendor/uxml-v2/supports/ChangeList.js';
import { noteLockStage } from '../../../vendor/uxml-v2/transfer/TransferStage.js';
import { readTransferNote, withoutTransferNote } from '../../../vendor/uxml-v2/transfer/TransferNote.js';
import { parsePlainXml, serializePlainXml } from '../../../vendor/uxml-v2/supports/PlainDom.js';
/** The document's XML laid out as today's supports stage writes it (SupportsAsChanges.js engineXml), note taken out. */
const asToday = (xmlText) => serializePlainXml(parsePlainXml(withoutTransferNote(xmlText)));
import { compareUxmlRouteXml } from './xml-cii-uxml-route-compare.js';
import { carryTransferNote } from './xml-cii-transfer-protection.js';
import { buildUxmlRunRecord, rememberUxmlRunRecord } from './xml-cii-uxml-run-record.js';

export const UXML_ROUTE_STORAGE_KEY = 'xmlCii.uxmlRoute';
export const UXML_ROUTE_VENDOR = 'vendor/uxml-v2 (XML_Compare_Utilities bc94633b)';

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
    // E2c step 4: the source read and the gasket drop's delta start a stage file's chain.
    return { xmlText: out.xmlText, document: documentRecord(out), uxml: out.result, source: out.source, deltas: [out.delta] };
  } catch (error) {
    // The reader's XML parser puts its code only in the message (e.g. PSI116_XML_DTD_OR_DECLARATION_FORBIDDEN).
    const refusal = String(error?.code || error?.message || '').match(/^(PSI116|UXML)_[A-Z0-9_]+/)?.[0];
    if (!refusal) throw error;
    return { xmlText: dropGasketNodesFromXmlText(text, options).xmlText, document: { made: false, refusal } };
  }
}

/**
 * The supports stage on today's inputs: the job config, today's material map rows, and the XML after the gasket drop.
 * End-to-end plan E1 (Owner 19 Nov 2026): the source is read once into a UXML document and the gasket drop is a UXML
 * stage on it, so each removed node is recorded; the supports stage reads the XML written from that document.
 */
/**
 * E2c step 4 (Owner 20 Nov 2026, "Yes, build it"): the source read and the gasket drop as step 10 makes them, for the
 * stage files S0 and S1: {base, deltas: [gasket drop]} or {refusal} when the UXML reader refuses the file.
 */
export function uxmlSourceChain(job, extraOptions = {}) {
  const options = { ...standaloneParityOptions(job?.supportConfigJson, job?.options || {}), ...extraOptions };
  const prepared = prepareSource(String(job?.sourceText ?? ''), options);
  return prepared.uxml ? { base: prepared.source, deltas: prepared.deltas } : { refusal: prepared.document.refusal };
}

export async function runUxmlSupportsStage(job, extraOptions = {}) {
  const options = { ...standaloneParityOptions(job?.supportConfigJson, job?.options || {}), ...extraOptions };
  const prepared = prepareSource(String(job?.sourceText ?? ''), options);
  const materialMapRows = await loadXmlCiiMaterialMap(parseXmlCiiEnrichmentConfig(options.supportConfigJson), []);
  const started = Date.now();
  const runToday = (xmlText) => runSupportsStage({
    xmlText,
    stagedJsonText: String(job?.stagedJsonText ?? ''),
    supportConfig: parseConfig(options.supportConfigJson),
    masters: { materialMapRows },
  });
  let changes = null;
  if (prepared.uxml) {
    let last = null;
    try {
      const note = noteLocks(prepared.uxml, job?.sourceText);
      const locked = note.uxml;
      const under = runSupportsUnderLocks(locked, (t) => (last = runToday(t)));
      const lockedWithBar = firstNameParts(prepared.xmlText, lockedNames(job?.sourceText)).locked;
      // E2c step 4: the whole chain from the source read, for the stage files (the Run record does not keep it).
      const chain = { base: prepared.source, deltas: [...prepared.deltas, ...(note.delta ? [note.delta] : []), ...under.deltas] };
      return { xmlText: asToday(under.engineXmlText), ms: Date.now() - started, chain,
        stageInputXml: prepared.xmlText, result: { ...last, xmlText: asToday(under.engineXmlText) }, document: prepared.document, changes: { ...changesRecord(under, locked), lockedWithBar } };
    } catch (error) {
      const refusal = String(error?.code || error?.message || '').match(/^(PSI116|UXML)_[A-Z0-9_]+/)?.[0];
      if (!refusal) throw error;
      changes = { made: false, refusal };
    }
  }
  // PR 436 review B3: without the document route, a "|" history in a name is cut to its first part for today's stage.
  const plain = firstNameParts(prepared.xmlText, lockedNames(job?.sourceText));
  const stage = runToday(plain.xmlText);
  if (plain.cut || plain.locked) changes = { ...(changes || { made: false, refusal: null }), historyCut: plain.cut, lockedWithBar: plain.locked };
  return { xmlText: stage.xmlText, ms: Date.now() - started, stageInputXml: plain.xmlText, result: stage, document: prepared.document, changes };
}

/** The node values the source's transfer note protects: 'branch|node' -> [key] ({} without a note). */
function lockedNames(sourceText) {
  return readTransferNote(String(sourceText || ''))?.note?.nodes || {};
}

/** Review N9: a "|" in a name the transfer locked goes to the CII as the transfer set it; say so. */
const lockedBarLog = (changes) => (changes?.lockedWithBar
  ? [`UXML route: ${changes.lockedWithBar} name(s) the transfer locked hold "|"; they went to the CII as the transfer set them (the lock wins).`] : []);

/** The source's transfer protection note as locks on the document (E2b; today's stage reads the note from the text). */
function noteLocks(doc, sourceText) {
  const found = readTransferNote(String(sourceText || ''));
  if (!found?.note) return { uxml: doc, delta: null };
  const step = runStage(noteLockStage, doc, { note: found.note, noteSha256: sha256Hex(found.raw) });
  return { uxml: step.uxml, delta: step.delta };
}

/**
 * End-to-end plan E2c step 2 (Owner 20 Nov 2026): what the document route recorded, for the Run record and the log:
 * one recorded stage per sub-step (rule, op count), the locked duplicates joined, the kept nodes given the "|" names
 * (their history, NodeName.1, .2 ...), and the lock conflicts.
 */
/** Review N1 (PR 437): the change list only reports; if it cannot be built the record says why and the run goes on. */
function listOf(before, deltas) {
  try {
    return { list: changeList(before, deltas) };
  } catch (err) {
    return { list: null, listError: String(err?.message || err) };
  }
}

function changesRecord(under, before) {
  return {
    made: true,
    rules: under.rules,
    steps: under.deltas.map((d) => ({ stage: d.stage, rule: d.rulesVersion, base: d.base, result: d.result, ops: d.ops.length })),
    // E2c step 3 (Owner 20 Nov): each recorded stage's changes, listed for the review page (vendor supports/ChangeList.js).
    ...listOf(before, under.deltas),
    joined: under.joined,
    names: under.names.map((n) => ({ branch: n.branch, nodeNumber: n.nodeNumber, node: n.node, from: n.from,
      NodeName: n.NodeName, ComponentRefNo: n.ComponentRefNo, written: n.written, notWritten: n.notWritten })),
    conflicts: under.conflicts,
    revision: under.uxml.revision.id,
  };
}

/** Today's stage line for nodes that keep their transferred supports, from the document route's conflicts. */
function keptSupportsDiagnostics(changes) {
  const kept = (changes?.conflicts || []).filter((c) => c.key === 'Supports');
  if (!kept.length) return [];
  return [{ type: 'transfer-supports', severity: 'info', count: kept.length,
    message: `${kept.length} node(s) keep the supports transferred from CAESAR II (the supports step wanted others).`,
    nodes: kept.map((c) => ({ key: `${c.branch}|${c.node}`, runSupports: c.stageWanted, kept: c.kept })) }];
}

function changesLog(changes) {
  if (!changes) return [];
  if (!changes.made) {
    return [
      ...(changes.refusal ? [`UXML route: the supports could not be recorded on the document (${changes.refusal}); today's supports stage XML went to the engine.`] : []),
      ...(changes.historyCut ? [`UXML route: ${changes.historyCut} name(s) holding a "|" history were cut to their first part for the supports stage and the CII; the Enriched XML of this run has no "|" history.`] : []),
      ...lockedBarLog(changes)];
  }
  const ops = changes.steps.reduce((n, s) => n + s.ops, 0);
  const named = changes.names.filter((n) => n.written.length).length;
  return [`UXML route: the supports and engineering were recorded on the UXML document (${ops} change(s) in ${changes.steps.length} recorded stage(s)); `
    + `${changes.joined.length} locked duplicate node(s) joined; ${named} node(s) listed for "|" names in the Enriched XML, written after the engine (not in the CII); `
    + `${changes.conflicts.length} lock conflict(s).`, ...lockedBarLog(changes)];
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
    vendor: UXML_ROUTE_VENDOR, ms: stage.ms, document: stage.document, changes: stage.changes }));
  if (!evidence.ok) return holdRun(out, evidence);
  out.xmlText = stageXml;
  out.evidence = evidence;
  out.stats = { ...out.stats, parityComparisons: evidence.comparisons, parityMismatches: evidence.mismatchCount, uxmlRouteNodesDiffer: compare.nodesDiffer };
  recordActiveRestraintStage(out.restraintAuditJournal, 'uxml-route', stageXml, { vendor: UXML_ROUTE_VENDOR });
  refreshUnmatchedSupportWarnings(out);
  // Support locks in step 10 (Owner 18 Nov): the stage's own line for nodes that keep their transferred supports.
  const keptSupports = stage.changes?.made ? keptSupportsDiagnostics(stage.changes)
    : (stage.result?.diagnostics || []).filter((d) => d?.type === 'transfer-supports');
  // E2c step 2: the "|" names go into step 10's Enriched XML after the engine (xml-cii-joined-names.js), never into its input.
  if (stage.changes?.made) out.uxmlNames = stage.changes.names.filter((n) => n.written.length);
  out.diagnostics = [...out.diagnostics, ...keptSupports];
  out.logs = [...(out.logs || []), ...keptSupports.map((d) => `UXML route: ${d.message}`),
    stage.document.refusal ? `UXML route: no UXML document (${stage.document.refusal}); today's gasket drop ran on the XML text.`
      : `UXML route: the source was read into a UXML document; the gasket drop removed ${stage.document.removed.length} node(s) (recorded in the Run record).`,
    `UXML route ON: CII input from the UXML supports stage (${UXML_ROUTE_VENDOR}, ${stage.ms} ms); parity PASS, input ${evidence.engineInputDigest}.`,
    ...changesLog(stage.changes),
    compareLog(compare)];
  return out;
}
