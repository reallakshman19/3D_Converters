/**
 * Opt-in LFJ Indexed Build PREVIEW for the actual standalone Resolver UI.
 *
 * This is not a product release or an export-authority promotion. The existing
 * three source-preserving research Workers run on the original Blob and yield
 * a complete row-level preview after independent output re-serialization.
 * Every returned result deliberately has downloadAuthorized:false.
 */
import {
  XML_NODE_TRACE_HEADERS, EVIDENCE_TREE_HEADERS, serializeRowsToCsv
} from '../xml-cii-trace-export.js';
import { deleteIndexedBuildDatabases } from './xml-cii-adapted-lfj-db-cleanup.js';
import { requireIndexedSourceAdmission } from './xml-cii-adapted-lfj-size-admission.js';
import { hashOriginalBlobOffThread } from './xml-cii-adapted-lfj-source-sha.js';
import {
  indexedGenerationNames,withIndexedGenerationCustody,
  recoverAbandonedIndexedGenerations
} from './xml-cii-adapted-lfj-cold-recovery.js';

const SOURCE_WORKER = new URL(
  '../../../lfj/qualification/experiments/consumer-sparse-b0/compact-paged.worker.mjs',
  import.meta.url);
const PROJECTION_WORKER = new URL(
  '../../../lfj/qualification/experiments/consumer-sparse-b0-consumer/projection.worker.mjs',
  import.meta.url);
const MATCH_WORKER = new URL(
  '../../../lfj/qualification/experiments/consumer-sparse-b0-xml-match/matching.worker.mjs',
  import.meta.url);
const MAX_PREVIEW_BYTES = 8 * 1024 * 1024;

const STAGE_LIMIT_MS = 180000;
const fail = (code, message) =>
  Object.assign(new Error(message), { code });
const count = n => Number.isSafeInteger(n) && n >= 0;
const encoder = new TextEncoder();

async function sha256(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), x =>
    x.toString(16).padStart(2, '0')).join('');
}
const shaText = text => sha256(encoder.encode(text));
const stale = isCurrent => {
  if (!isCurrent()) throw fail('LFJ_PREVIEW_SUPERSEDED',
    'The original source or Resolver configuration changed during indexed Build');
};
function workerJob(url, payload, { signal, workerFactory = (u, options) =>
  new Worker(u, options), timeoutMs = STAGE_LIMIT_MS } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(fail('LFJ_PREVIEW_CANCELLED', 'Indexed Build was cancelled'));
    let worker, done = false, timer;
    const finish = (error, value) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancelled);
      worker?.terminate();
      if (error) reject(error);
      else resolve(value);
    };
    const cancelled = () => finish(fail('LFJ_PREVIEW_CANCELLED', 'Indexed Build was cancelled'));
    try {
      worker = workerFactory(url, { type: 'module' });
      worker.onmessage = ({ data }) => {
        if (data?.type === 'DONE') finish(null, data.result);
        else if (data?.type === 'ERROR') finish(fail(
          data.code || 'LFJ_PREVIEW_WORKER_FAILED',
          data.message || 'Indexed Worker rejected the source'));
        else finish(fail('LFJ_PREVIEW_PROTOCOL', 'Unexpected indexed Worker response'));
      };
      worker.onerror = event => finish(fail(
        'LFJ_PREVIEW_WORKER_ERROR', String(event?.message || 'Worker crashed')));
      timer = setTimeout(() => finish(fail('LFJ_PREVIEW_TIMEOUT',
        'Indexed Worker stage exceeded the preview time budget')), timeoutMs);
      signal?.addEventListener('abort', cancelled, { once: true });
      worker.postMessage(payload);
    } catch (error) { finish(error); }
  });
}

/** Independent UI-level row/byte boundary; no research rights are promoted. */
export async function verifyIndexedPreviewHandoff(
  result, originalSha256, xmlSha256, selectedScopeId = undefined
) {
  const handoff = result?.researchHandoff;
  const b = handoff?.basis;
  if (selectedScopeId === undefined &&
      (result?.selectedScope !== undefined ||
       b?.selectedScopeId !== undefined ||
       b?.selectionDigestSha256 !== undefined))
    throw fail('LFJ_PREVIEW_SCOPE_BASIS',
      'A source-selected matching result cannot be accepted as an unscoped Build');
  // A selected original-file Build must carry the same native Worker-authored
  // source manifest SHA in its matching result AND research handoff basis.
  // No caller-supplied bare digest, or absence of evidence, is admissible.
  if (selectedScopeId !== undefined &&
      (typeof selectedScopeId !== 'string' || !selectedScopeId.trim() ||
       result?.selectedScope?.requestedScopeId !== selectedScopeId ||
       !/^[a-f0-9]{64}$/.test(
         result?.selectedScope?.manifestDigestSha256 || '') ||
       result.selectedScope?.sourceOnly !== true ||
       result.selectedScope?.engineeringReady !== false ||
       result.selectedScope?.downloadAuthorized !== false ||
       b?.selectedScopeId !== selectedScopeId ||
       b?.selectionDigestSha256 !==
         result.selectedScope.manifestDigestSha256))
    throw fail('LFJ_PREVIEW_SCOPE_BASIS',
      'Selected original source scope lacks matching Worker/CSV handoff proof');
  if (handoff?.schema !== 'LFJ.B0.ResearchHandoff.v1' ||
      handoff?.sourceOnly !== true ||
      handoff?.engineeringReady !== false ||
      handoff?.downloadAuthorized !== false ||
      handoff?.appWired !== false ||
      b?.originalSha256 !== originalSha256 ||
      b?.xmlSha256 !== xmlSha256 ||
      !count(result?.xmlNodes) || result.xmlNodes < 1 ||
      result.xmlNodes !== b?.xmlNodes ||
      !Array.isArray(handoff?.nodeWiseRows) ||
      !Array.isArray(handoff?.evidenceTreeRows) ||
      handoff.nodeWiseRows.length !== result.xmlNodes ||
      !count(result?.matchedXmlNodes) ||
      result.matchedXmlNodes > result.xmlNodes ||
      b?.xmlRecordsSha256 !== result?.xmlRecordsSha256 ||
      !count(handoff?.payloadBytes) ||
      handoff.payloadBytes > MAX_PREVIEW_BYTES)
    throw fail('LFJ_PREVIEW_BASIS', 'Incomplete source-pinned Worker handoff');
  const pairs = [
    [XML_NODE_TRACE_HEADERS, handoff.nodeWiseRows, handoff.nodeWiseCsv,
      result.nodeWiseCsvSha256, result.nodeWiseCsvBytes,
      handoff.nodeWiseCsvSha256, handoff.nodeWiseCsvBytes],
    [EVIDENCE_TREE_HEADERS, handoff.evidenceTreeRows, handoff.evidenceTreeCsv,
      result.evidenceTreeCsvSha256, result.evidenceTreeCsvBytes,
      handoff.evidenceTreeCsvSha256, handoff.evidenceTreeCsvBytes]
  ];
  for (const [headers, rows, csv, expectedSha, expectedSize, handoffSha, handoffSize] of pairs) {
    if (typeof csv !== 'string' || serializeRowsToCsv(headers, rows) !== csv ||
        !count(expectedSize) || expectedSize !== encoder.encode(csv).byteLength ||
        expectedSize !== handoffSize || expectedSha !== handoffSha ||
        await shaText(csv) !== expectedSha)
      throw fail('LFJ_PREVIEW_CSV_PARITY',
        'Indexed trace/evidence rows diverge from exact shipping CSV serializers');
  }
  return Object.freeze({
    mode: 'lfj-indexed-preview',
    originalSha256, xmlSha256,
    xmlNodes: result.xmlNodes, matchedXmlNodes: result.matchedXmlNodes,
    ...(selectedScopeId === undefined ? {} : {
      selectedScopeId,
      selectionDigestSha256:result.selectedScope.manifestDigestSha256
    }),
    nodeWiseRows: handoff.nodeWiseRows,
    evidenceTreeRows: handoff.evidenceTreeRows,
    nodeWiseCsvSha256: result.nodeWiseCsvSha256,
    evidenceTreeCsvSha256: result.evidenceTreeCsvSha256,
    sourceOnly: true,
    engineeringReady: false,
    downloadAuthorized: false,
    status: 'SOURCE_PINNED_PREVIEW_ONLY'
  });
}

/**
 * Only original File/Blob bytes enter the indexed pipeline, never a JSON.parse
 * of stagedJsonText. A new isolated IndexedDB generation is used per request;
 * both source and projection HEADs are attested by the matching Worker.
 */
export async function buildIndexedResolverPreview({
  blob, xmlText, config = {}, isCurrent = () => true,
  selectedScopeId = undefined,expectedSourceSha256=undefined,
  onProgress = () => {}, signal, workerFactory, timeoutMs = STAGE_LIMIT_MS
} = {}) {
  // Reject over-capacity original files before any read, hashing,
  // IndexedDB allocation or Worker creation.
  requireIndexedSourceAdmission(blob);
  if (typeof xmlText !== 'string' || !xmlText.trim() ||
      typeof isCurrent !== 'function')
    throw fail('LFJ_PREVIEW_INPUT', 'Original XML and revision guard are required');
  if (selectedScopeId !== undefined &&
      (typeof selectedScopeId !== 'string' || !selectedScopeId.trim()))
    throw fail('LFJ_PREVIEW_SCOPE_INPUT','Selected source scope must be an exact nonempty ID');
  if (signal?.aborted) throw fail('LFJ_PREVIEW_CANCELLED', 'Indexed Build was cancelled');
  // A cold browser/tab relaunch may leave a complete or partially staged
  // generation behind. Reclaim only inactive r2 generations before creating
  // another source/index, and never trust their prior HEADs for downloads.
  stale(isCurrent);
  // Node-only deterministic Worker tests have no browser IndexedDB or Web
  // Locks; the real browser must NEVER skip cold recovery.
  if(typeof window!=='undefined')
    await recoverAbandonedIndexedGenerations();
  stale(isCurrent);
  if(signal?.aborted)throw fail('LFJ_PREVIEW_CANCELLED','Indexed Build was cancelled');
  const token = crypto.randomUUID();
  const [sourceDatabaseName,projectionDatabaseName]=indexedGenerationNames(token);
  const sourceGeneration = token, projectionGeneration = token;
  const run = (url, payload) => workerJob(url, payload,
    { signal, workerFactory, timeoutMs });
  return withIndexedGenerationCustody(token,async()=>{
  let failure=null;
  try {
    stale(isCurrent);
    onProgress('Hashing original source');
    const originalSha256 = await hashOriginalBlobOffThread(blob,{signal,timeoutMs});
    if(expectedSourceSha256!==undefined &&
       (!/^[0-9a-f]{64}$/.test(expectedSourceSha256) ||
        originalSha256!==expectedSourceSha256))
      throw fail('LFJ_PREVIEW_SCOPE_SOURCE_DRIFT',
        'Current original File SHA disagrees with the verified hierarchy scan');
    const xmlSha256 = await shaText(xmlText);
    stale(isCurrent);
    onProgress('Indexing original source occurrences');
    const source = await run(SOURCE_WORKER, {
      type: 'START', blob, expectedSha256: originalSha256,
      databaseName: sourceDatabaseName, generation: sourceGeneration,
      revision: 'LFJ_UI_PREVIEW_V1'
    });
    stale(isCurrent);
    if (source?.sourceSha256 !== originalSha256 ||
        !count(source?.occurrenceCount) || source.occurrenceCount < 1)
      throw fail('LFJ_PREVIEW_SOURCE_CENSUS', 'Source occurrence index incomplete');
    onProgress('Constructing bounded source-backed Resolver projection');
    const projection = await run(PROJECTION_WORKER, {
      type: 'PROJECT', blob, expectedSha256: originalSha256, config, toleranceMm: 6,
      sourceDatabaseName, sourceGeneration, projectionDatabaseName,
      projectionGeneration
    });
    stale(isCurrent);
    if (projection?.sourceSha256 !== originalSha256 ||
        projection?.sourceOccurrences !== source.occurrenceCount ||
        !count(projection?.factCount) || projection.factCount < 1)
      throw fail('LFJ_PREVIEW_PROJECTION', 'No complete source-backed facts');
    onProgress('Resolving original XML through indexed Worker');
    const matching = await run(MATCH_WORKER, {
      type: 'MATCH', blob, expectedSha256: originalSha256, xmlText, config,
      sourceDatabaseName, sourceGeneration, projectionDatabaseName,
      projectionGeneration, includeResearchHandoff: true,
      ...(selectedScopeId === undefined ? {} : {selectedScopeId})
    });
    stale(isCurrent);
    if (matching?.originalSha256 !== originalSha256 ||
        matching?.sourceOccurrenceCount !== source.occurrenceCount ||
        matching?.projectionFacts !== projection.factCount)
      throw fail('LFJ_PREVIEW_MATCH_BASIS', 'Indexed matching basis is incomplete or changed');
    const verified = await verifyIndexedPreviewHandoff(
      matching, originalSha256, xmlSha256, selectedScopeId);
    stale(isCurrent);
    return verified;
  } catch(error) {
    failure=error;
    throw error;
  } finally {
    // A scheduled deletion is not a completed deletion: native IDB onblocked,
    // onerror and timeout must fail closed. Attempt both names independently.
    try {
      await deleteIndexedBuildDatabases([
        sourceDatabaseName,projectionDatabaseName
      ]);
    } catch(cleanupError) {
      if(!failure) throw cleanupError;
      // Preserve the original cancel/source failure for the UI, but attach
      // cleanup failure so diagnostics cannot mistake it for verified cleanup.
      failure.cleanupError=cleanupError.code||'LFJ_IDB_CLEANUP_ERROR';
    }
  }
  }); // Web Lock releases only AFTER complete IDB deletion or explicit failure
}
