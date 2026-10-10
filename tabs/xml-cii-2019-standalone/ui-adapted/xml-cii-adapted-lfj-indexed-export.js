/**
 * Product-owned, opt-in indexed LFJ CSV output verification.
 *
 * The B0 research Worker keeps downloadAuthorized:false. This module NEVER
 * changes that flag or grants downstream CII engineering authority. It
 * independently admits only two byte-exact, original-source CSV downloads
 * under a fresh UI Build receipt and explicit current-session consent.
 */
import {
  XML_NODE_TRACE_HEADERS, EVIDENCE_TREE_HEADERS, serializeRowsToCsv
} from '../xml-cii-trace-export.js';
import { hashOriginalBlobOffThread } from './xml-cii-adapted-lfj-source-sha.js';

const enc = new TextEncoder();
const fail = (code, reason) => Object.assign(new Error(reason), {code});
const sha256 = async bytes => [...new Uint8Array(
  await crypto.subtle.digest('SHA-256',bytes))]
  .map(x=>x.toString(16).padStart(2,'0')).join('');
const digestText = text => sha256(enc.encode(text));
const hex = x => typeof x === 'string' && /^[0-9a-f]{64}$/.test(x);
const integer = n => Number.isSafeInteger(n) && n >= 0;
const choices = Object.freeze({
  'node-wise-trace': {
    headers: XML_NODE_TRACE_HEADERS, rows: 'nodeWiseRows',
    sha: 'nodeWiseCsvSha256', fileName: 'xml-cii-node-wise-trace.csv'
  },
  'evidence-tree': {
    headers: EVIDENCE_TREE_HEADERS, rows: 'evidenceTreeRows',
    sha: 'evidenceTreeCsvSha256', fileName: 'xml-cii-evidence-tree.csv'
  }
});
function assertFresh(isCurrent) {
  if (typeof isCurrent !== 'function' || !isCurrent())
    throw fail('LFJ_EXPORT_STALE', 'Original source, config or Build changed during export');
}

/** Called only after an actual completed indexed Worker Build. */
export function createIndexedExportReceipt({
  preview, config, revision, sourceFile
} = {}) {
  if (preview?.mode !== 'lfj-indexed-preview' ||
      preview?.status !== 'SOURCE_PINNED_PREVIEW_ONLY' ||
      preview?.sourceOnly !== true ||
      preview?.engineeringReady !== false ||
      preview?.downloadAuthorized !== false ||
      !hex(preview?.originalSha256) || !hex(preview?.xmlSha256) ||
      !hex(preview?.nodeWiseCsvSha256) || !hex(preview?.evidenceTreeCsvSha256) ||
      !integer(preview?.xmlNodes) || preview.xmlNodes < 1 ||
      !integer(preview?.matchedXmlNodes) ||
      preview.matchedXmlNodes > preview.xmlNodes ||
      preview.nodeWiseRows?.length !== preview.xmlNodes ||
      !Array.isArray(preview?.evidenceTreeRows) ||
      !(sourceFile instanceof Blob) ||
      !integer(revision) || !config || typeof config !== 'object')
    throw fail('LFJ_EXPORT_RECEIPT', 'Indexed preview is not a complete original-source result');
  return Object.freeze({
    schema:'LFJ.A3.IndexedCsvReceipt.v1', revision, sourceFile,
    originalSha256: preview.originalSha256, xmlSha256: preview.xmlSha256,
    nodeWiseCsvSha256: preview.nodeWiseCsvSha256,
    evidenceTreeCsvSha256: preview.evidenceTreeCsvSha256,
    xmlNodes: preview.xmlNodes,
    configJson: JSON.stringify(config),
    preview
  });
}

/**
 * This is a separate, product-side final output decision, not a B0 Worker
 * grant. Reverify immutable original File bytes, original XML, config,
 * complete row census and SHA of the SHIPPING serializer at click time.
 * No Blob/download creation happens inside this verifier.
 */
export async function verifyIndexedProductCsv({
  receipt, preview, kind, sourceFile, xmlText, config,
  revision, optIn, isCurrent
} = {}) {
  const choice = choices[kind];
  assertFresh(isCurrent);
  if (!choice || optIn !== true ||
      receipt?.schema !== 'LFJ.A3.IndexedCsvReceipt.v1' ||
      !Object.isFrozen(receipt) ||
      receipt?.revision !== revision ||
      receipt?.sourceFile !== sourceFile || receipt?.preview !== preview ||
      !(sourceFile instanceof Blob) ||
      typeof xmlText !== 'string' || !xmlText.trim() ||
      !config || typeof config !== 'object' ||
      receipt.configJson !== JSON.stringify(config) ||
      preview?.mode !== 'lfj-indexed-preview' ||
      preview?.status !== 'SOURCE_PINNED_PREVIEW_ONLY' ||
      preview?.sourceOnly !== true ||
      preview?.engineeringReady !== false ||
      preview?.downloadAuthorized !== false ||
      preview?.originalSha256 !== receipt.originalSha256 ||
      preview?.xmlSha256 !== receipt.xmlSha256 ||
      preview?.nodeWiseCsvSha256 !== receipt.nodeWiseCsvSha256 ||
      preview?.evidenceTreeCsvSha256 !== receipt.evidenceTreeCsvSha256 ||
      preview?.xmlNodes !== receipt.xmlNodes ||
      preview?.nodeWiseRows?.length !== receipt.xmlNodes ||
      !Array.isArray(preview?.evidenceTreeRows))
    throw fail('LFJ_EXPORT_NOT_ADMITTED',
      'Select verified indexed Build, enable downloads, and keep original source/config');
  // Hash again at the actual download boundary. The File is never parsed.
  const originalSha256 = await hashOriginalBlobOffThread(sourceFile);
  assertFresh(isCurrent);
  if (originalSha256 !== receipt.originalSha256 ||
      await digestText(xmlText) !== receipt.xmlSha256)
    throw fail('LFJ_EXPORT_SOURCE_DIGEST', 'The original source differs from the completed indexed Build');
  assertFresh(isCurrent);
  const rows = preview[choice.rows];
  // The original BOM, row order, quoting and CRLF come from the real
  // standalone serializer, not the Worker claiming its own correctness.
  const content = serializeRowsToCsv(choice.headers,rows);
  if (content.charCodeAt(0) !== 0xFEFF ||
      enc.encode(content).byteLength > 8*1024*1024 ||
      await digestText(content) !== receipt[choice.sha])
    throw fail('LFJ_EXPORT_CSV_DIGEST',
      'Original source-backed rows no longer reproduce the admitted CSV bytes');
  assertFresh(isCurrent);
  return Object.freeze({
    kind,fileName:choice.fileName,rowCount:rows.length,
    sha256:receipt[choice.sha],content,
    bytes:enc.encode(content).byteLength,
    schema:'LFJ.A3.VerifiedCsvLocalOutput.v1',
    downstreamEngineeringAuthorized:false
  });
}
