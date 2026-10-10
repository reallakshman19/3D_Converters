/**
 * A3 U03 — product-owned, read-only reconciliation of the H09 source Worker
 * capsule with the real standalone CSV serializers.
 *
 * NOT a source/CSV export grant. The native research Worker deliberately
 * reports engineeringReady:false, downloadAuthorized:false, appWired:false.
 * The product must separately prove its current input/configuration revision,
 * render the trace and bind its own authorized Build/download lifecycle.
 *
 * Do not parse the original staged JSON here or regenerate protected goldens.
 */
import {
  XML_NODE_TRACE_HEADERS, EVIDENCE_TREE_HEADERS, serializeRowsToCsv
} from '../../../tabs/xml-cii-2019-standalone/xml-cii-trace-export.js';

const MATCH_SCHEMA = 'LFJ.B0.XmlCsvResearch.v1';
const HANDOFF_SCHEMA = 'LFJ.B0.ResearchHandoff.v1';
const MAX_BYTES = 8 * 1024 * 1024;
const hex = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const encoder = new TextEncoder();
const fail = (code, message) => { throw Object.assign(new Error(message), {code}); };
const digest = async value => [...new Uint8Array(
  await crypto.subtle.digest('SHA-256', encoder.encode(value))
)].map(x => x.toString(16).padStart(2, '0')).join('');

const TRACE_KEYS = Object.freeze([
  'xmlNode','xmlBranch','componentType','jsonNodeNoDtxrPs',
  'jsonNodeNoDtxrPos','matchType','posBasis','distanceMm',
  'toleranceMm','dtxrPosValue','dtxrPsName','dtxrPsValue',
  'effectiveSource','derivedRestraints','status'
]);
const EVIDENCE_KEYS = Object.freeze([
  'branch','bore','sourceNodeNo','position','objectType',
  'dtxrPos','name','cmpSupGap','componentRefNo','sourcePath'
]);

function inspectRows(rows, keys, kind) {
  if (!Array.isArray(rows)) fail('A3_HANDOFF_ROWS', kind + ' rows must be an array');
  for (const row of rows) {
    if (!row || typeof row !== 'object' || Array.isArray(row) ||
        Object.keys(row).length !== keys.length ||
        keys.some(key => !Object.hasOwn(row,key) || typeof row[key] !== 'string'))
      fail('A3_HANDOFF_ROWS', kind + ' row shape differs from shipping exporter');
  }
  return rows;
}

function chargePayload(c) {
  let sum=0;
  for (const part of [c.nodeWiseCsv, c.evidenceTreeCsv,
      JSON.stringify(c.nodeWiseRows), JSON.stringify(c.evidenceTreeRows)]) {
    if (typeof part !== 'string' || part.length > MAX_BYTES - sum)
      fail('A3_HANDOFF_LIMIT','research handoff exceeds product byte budget');
    sum+=encoder.encode(part).byteLength;
    if (sum > MAX_BYTES)
      fail('A3_HANDOFF_LIMIT','research handoff exceeds product byte budget');
  }
  return sum;
}

function assertUnpromoted(o) {
  if (!o || o.sourceOnly !== true || o.engineeringReady !== false ||
      o.downloadAuthorized !== false || o.appWired !== false)
    fail('A3_RESEARCH_ONLY','research output cannot self-authorize product exports');
}

/**
 * Input authority is caller-supplied *current* product identity. This check
 * does not create that authority: caller must establish original SHA from the
 * actual selected Blob and projection digest from the current capture config.
 * The revision callback must read live state, not a captured constant.
 *
 * Returns a frozen pending view for UI integration; it never sets CSV rights.
 */
export async function verifyResolverResearchHandoff(result, {
  originalSha256, xmlText, projectionConfigDigest, revision, currentRevision
}={}) {
  if (!hex(originalSha256) || !hex(projectionConfigDigest) ||
      typeof xmlText !== 'string' || !xmlText ||
      !Number.isSafeInteger(revision) || revision < 0 ||
      typeof currentRevision !== 'function')
    fail('A3_PRODUCT_BASIS','exact source, XML, config and live revision are required');
  const stillCurrent=() => {
    if (currentRevision() !== revision)
      fail('A3_PRODUCT_SUPERSEDED','standalone source/config changed during acceptance');
  };
  stillCurrent();
  if (result?.schema !== MATCH_SCHEMA || !result.researchHandoff)
    fail('A3_HANDOFF_SCHEMA','native matching Worker handoff missing');
  const c=result.researchHandoff,b=c.basis;
  if (c.schema !== HANDOFF_SCHEMA || !b || typeof b !== 'object')
    fail('A3_HANDOFF_SCHEMA','research capsule/basis schema mismatch');
  assertUnpromoted(result);
  assertUnpromoted(c);
  if (result.originalSha256 !== originalSha256 ||
      b.originalSha256 !== originalSha256 ||
      result.projectionConfigDigest !== projectionConfigDigest ||
      b.projectionConfigDigest !== projectionConfigDigest ||
      b.xmlNodes !== result.xmlNodes ||
      b.xmlRecordsSha256 !== result.xmlRecordsSha256 ||
      c.nodeWiseCsvSha256 !== result.nodeWiseCsvSha256 ||
      c.evidenceTreeCsvSha256 !== result.evidenceTreeCsvSha256 ||
      c.nodeWiseCsvBytes !== result.nodeWiseCsvBytes ||
      c.evidenceTreeCsvBytes !== result.evidenceTreeCsvBytes ||
      !hex(b.projectionSha256) || !hex(b.matchingEvidenceDigestSha256) ||
      b.projectionSha256 !== result.projectionSha256 ||
      b.matchingEvidenceDigestSha256 !== result.matchingEvidenceDigestSha256 ||
      !hex(b.xmlRecordsSha256))
    fail('A3_HANDOFF_IDENTITY','Worker identity/census/digests inconsistent');
  if (!Number.isSafeInteger(b.xmlNodes) || b.xmlNodes < 1 ||
      result.matchedXmlNodes < 0 || result.matchedXmlNodes > b.xmlNodes)
    fail('A3_HANDOFF_CENSUS','XML population/status census inconsistent');
  if ((await digest(xmlText)) !== b.xmlSha256)
    fail('A3_XML_CHANGED','XML bytes differ from attested Worker result');
  stillCurrent();
  const nodeRows=inspectRows(c.nodeWiseRows,TRACE_KEYS,'node-wise');
  const evidenceRows=inspectRows(c.evidenceTreeRows,EVIDENCE_KEYS,'evidence');
  if (nodeRows.length !== b.xmlNodes)
    fail('A3_HANDOFF_CENSUS','node-wise table misses original XML records');
  const payloadBytes=chargePayload(c);
  if (c.payloadBytes !== payloadBytes)
    fail('A3_HANDOFF_LIMIT','research payload size declaration mismatch');
  // Compare transported row objects to EXACT, unchanged shipping serializers.
  // A hash of the CSV alone would not detect a manipulated visible table.
  if (serializeRowsToCsv(XML_NODE_TRACE_HEADERS,nodeRows) !== c.nodeWiseCsv ||
      serializeRowsToCsv(EVIDENCE_TREE_HEADERS,evidenceRows) !== c.evidenceTreeCsv)
    fail('A3_HANDOFF_ROWS_CSV','visible rows and both original CSVs disagree');
  if (encoder.encode(c.nodeWiseCsv).byteLength !== c.nodeWiseCsvBytes ||
      encoder.encode(c.evidenceTreeCsv).byteLength !== c.evidenceTreeCsvBytes ||
      await digest(c.nodeWiseCsv) !== c.nodeWiseCsvSha256 ||
      await digest(c.evidenceTreeCsv) !== c.evidenceTreeCsvSha256)
    fail('A3_HANDOFF_CSV','two complete CSV contents differ from attested bytes');
  stillCurrent();

  const copyRows = rows => Object.freeze(rows.map(row => Object.freeze({...row})));
  return Object.freeze({
    schema:'LFJ.A3.VerifiedResearchView.v1',
    revision, originalSha256, xmlSha256:b.xmlSha256,
    projectionConfigDigest, xmlNodes:b.xmlNodes,
    nodeWiseRows:copyRows(nodeRows),
    evidenceTreeRows:copyRows(evidenceRows),
    nodeWiseCsv:c.nodeWiseCsv, evidenceTreeCsv:c.evidenceTreeCsv,
    nodeWiseCsvSha256:c.nodeWiseCsvSha256,
    evidenceTreeCsvSha256:c.evidenceTreeCsvSha256,
    nodeWiseCsvBytes:c.nodeWiseCsvBytes,
    evidenceTreeCsvBytes:c.evidenceTreeCsvBytes,
    // Product readiness requires a separate owned source/Build/DOM integration
    // and an independently accepted consumer authority. Never upgrade here.
    sourceOnly:true, engineeringReady:false,
    downloadAuthorized:false, appWired:false
  });
}
