/**
 * #1104/I3 — bounded LFJ → 3D_Converters consumer-side source-facts receiver.
 *
 * DOES NOT wire Resolver/Enrichment and DOES NOT project engineering identity,
 * interpret JSON, or authorize CII/PSI/DTXR. SourceSessionV1 remains owned by
 * #1105. A caller with an independently qualified H1 session must supply the
 * real consumer's current source+selection+dependency basis on every read.
 *
 * Container OPEN events are metadata ONLY: reading every nested object/array
 * would duplicate unbounded original byte ranges. Individual scalar values
 * are read from their attested OPEN/SEAL spans and delivered one at a time.
 * The exclusive provided session is closed on success AND on any failure.
 */
export class ConsumerSourceError extends Error {
  constructor(code, message) {
    super(code+': '+message);
    this.name = 'ConsumerSourceError';
    this.code = code;
  }
}
const fail = (code, message) => { throw new ConsumerSourceError(code, message); };
const string = value => typeof value === 'string' && value.length > 0 && value.length <= 1024;
const nat = value => Number.isSafeInteger(value) && value >= 0;
const SCALARS = new Set(['string', 'number', 'boolean', 'null']);
const CONTAINERS = new Set(['object', 'array']);
const SOURCE_KEYS = ['sourceRefId', 'sourceSha256', 'sourceRevision'];
const BASIS_KEYS = [...SOURCE_KEYS, 'selectionDigest', 'jobId', 'dependencyRevision', 'byteLength'];

function sourceMatches(left, right) {
  return SOURCE_KEYS.every(key => left?.[key] === right?.[key]);
}
function fullMatches(left, right) {
  return BASIS_KEYS.every(key => left?.[key] === right?.[key]);
}
function verifyExpected(expected) {
  if (!expected || BASIS_KEYS.some(key => !string(expected[key]) && key !== 'byteLength') ||
      !nat(expected.byteLength))
    fail('CONSUMER_BASIS_REQUIRED', 'exact source, selection, job, dependency, byteLength must be explicitly supplied');
  return Object.freeze({...expected});
}
function verifyRelease(session, expected, manifest) {
  if (session?.schema !== 'LFJ.SourceSession.v1' ||
      session?.completion?.kind !== 'SOURCE_INDEX_COMPLETE' ||
      session?.completion?.complete !== true ||
      session?.completion?.rightsBasis !== 'SOURCE_FACTS_ONLY' ||
      session?.completion?.engineeringReady !== false ||
      manifest?.rightsBasis !== 'SOURCE_FACTS_ONLY' ||
      manifest?.engineeringReady !== false ||
      !fullMatches({...manifest, byteLength:manifest?.sourceByteLength,
        dependencyRevision:expected.dependencyRevision}, expected) ||
      !nat(manifest?.occurrenceCount) || !nat(manifest?.eventCount) ||
      manifest.eventCount !== 2 * manifest.occurrenceCount ||
      !nat(manifest?.sourceByteLength) ||
      session?.pageManifest?.schema !== 'LFJ.CommittedSelectionPageManifest.v1' ||
      session.pageManifest.complete !== true ||
      session.pageManifest.rightsBasis !== 'SOURCE_FACTS_ONLY' ||
      session.pageManifest.engineeringReady !== false ||
      !sourceMatches(session.pageManifest, expected) ||
      session.pageManifest.selectionDigest !== expected.selectionDigest ||
      session.pageManifest.jobEpoch !== expected.jobId ||
      !nat(session.pageManifest.selectedCount) ||
      session.pageManifest.selectedCount > manifest.occurrenceCount)
    fail('SOURCE_SESSION_UNQUALIFIED', 'complete source-only committed original + selection manifests required');
}

/**
 * Consumer provides an exclusively owned SourceSessionV1, app-owned complete
 * expectedBasis, LIVE getCurrentBasis(), and per-row onOccurrence callback.
 * All source-only scalar bytes are delivered one at a time; no full-array result.
 */
export async function consumeSelectedSourceFacts({
  session,expectedBasis,getCurrentBasis,onOccurrence,signal,
  maxRows=64,maxPageBytes=65536,maxScalarBytes=65536
}={}) {
  const expected = verifyExpected(expectedBasis);
  if (!session || typeof session.getCompletionManifest !== 'function' ||
      typeof session.readPage !== 'function' || typeof session.readOccurrence !== 'function' ||
      typeof session.close !== 'function' || typeof getCurrentBasis !== 'function' ||
      typeof onOccurrence !== 'function')
    fail('CONSUMER_PORT_REQUIRED', 'live session, getter, callback and explicit close authority required');
  if (!Number.isSafeInteger(maxRows) || maxRows<1 || maxRows>4096 ||
      !Number.isSafeInteger(maxPageBytes) || maxPageBytes<256 || maxPageBytes>1048576 ||
      !Number.isSafeInteger(maxScalarBytes) || maxScalarBytes<1 || maxScalarBytes>1048576)
    fail('CONSUMER_RESOURCE_BOUND', 'page and original scalar budgets are required');
  let closed=false;
  const attest=()=>{
    if (signal?.aborted) fail('CONSUMER_CANCELLED','source consumer cancelled');
    let current;
    try {current=getCurrentBasis();} catch {fail('CONSUMER_BASIS_STALE','current app basis unavailable');}
    if (!fullMatches(current,expected)) fail('CONSUMER_BASIS_STALE','source, scope, dependency or job changed');
  };
  let failed=null;
  try {
    attest();
    const manifest=await session.getCompletionManifest();
    attest();
    verifyRelease(session,expected,manifest);
    const total=session.pageManifest.selectedCount;
    let cursor=null,lastOrdinal=-1,count=0,scalars=0,containers=0,scalarBytes=0,pageCount=0;
    while (true) {
      attest();
      const page=await session.readPage({cursor,maxRows,maxBytes:maxPageBytes});
      attest();
      if (page?.schema!=='LFJ.CommittedSelectionPage.v1' ||
          page.rightsBasis!=='SOURCE_FACTS_ONLY' ||
          page.engineeringReady!==false ||
          !sourceMatches(page,expected) ||
          page.selectionDigest!==expected.selectionDigest ||
          page.jobEpoch!==expected.jobId ||
          page.totalCount!==total ||
          !Array.isArray(page.rows) || page.rows.length>maxRows ||
          (page.rows.length===0 && !(page.complete===true && total===0 && count===0)) ||
          (page.complete!==true && page.complete!==false) ||
          (page.complete===true && page.cursor!==null) ||
          (page.complete===false && !string(page.cursor)) ||
          (page.complete===false && page.cursor===cursor) ||
          new TextEncoder().encode(JSON.stringify(page)).byteLength>maxPageBytes)
        fail('CONSUMER_PAGE_INVALID', 'paged source is not a complete bounded exact-basis OPEN response');
      pageCount++;
      for (const row of page.rows) {
        attest();
        if (row?.kind!=='OPEN' || !sourceMatches(row,expected) ||
            !nat(row.ordinal) || row.ordinal<=lastOrdinal ||
            (typeof row.occurrenceId!=='string'||row.occurrenceId.length<1||row.occurrenceId.length>67584) ||
            typeof row.path!=='string' ||
            !(row.parentId===null || typeof row.parentId==='string') ||
            !nat(row.startByte) ||
            !(SCALARS.has(row.type) || CONTAINERS.has(row.type)))
          fail('CONSUMER_OCCURRENCE_INVALID','ordered original source OPEN event required');
        lastOrdinal=row.ordinal;
        let bytes=null;
        if (SCALARS.has(row.type)) {
          const value=await session.readOccurrence({
            occurrenceId:row.occurrenceId,expectedSourceRevision:expected.sourceRevision,
            maxBytes:maxScalarBytes
          });
          attest();
          if (value?.schema!=='LFJ.SourceOccurrenceValue.v1' ||
              !sourceMatches(value,expected) ||
              value.rightsBasis!=='SOURCE_FACTS_ONLY' || value.engineeringReady!==false ||
              value.occurrenceId!==row.occurrenceId || value.path!==row.path ||
              value.ordinal!==row.ordinal || value.type!==row.type ||
              value.startByte!==row.startByte ||
              !nat(value.endByteExclusive) || value.endByteExclusive<=row.startByte ||
              !(value.bytes instanceof Uint8Array) ||
              value.bytes.byteLength!==value.endByteExclusive-row.startByte ||
              value.bytes.byteLength>maxScalarBytes)
            fail('CONSUMER_VALUE_INVALID','exact original scalar OPEN/SEAL bytes or source rights mismatched');
          bytes=value.bytes;
          scalars++;scalarBytes+=bytes.byteLength;
        } else containers++;
        // Never mutate LFJ's committed row and never promote it into an app owner.
        const facts=Object.freeze({row:Object.freeze({...row}),bytes,sourceOnly:true});
        await onOccurrence(facts);
        attest(); // no successful callback response on late supersession
        count++;
        if (count>total) fail('CONSUMER_CARDINALITY_INVALID','more source rows than committed selection');
      }
      if (page.complete===true) {
        if (count!==total) fail('CONSUMER_CARDINALITY_INVALID','committed selection truncated');
        break;
      }
      if (count>=total) fail('CONSUMER_CARDINALITY_INVALID','incomplete cursor after exhausted selection');
      cursor=page.cursor;
    }
    attest();
    return Object.freeze({
      schema:'LFJ.3D.ConsumerSourceFactsReceipt.v1',complete:true,
      sourceRefId:expected.sourceRefId,sourceSha256:expected.sourceSha256,
      sourceRevision:expected.sourceRevision,selectionDigest:expected.selectionDigest,
      jobId:expected.jobId,dependencyRevision:expected.dependencyRevision,
      selectedCount:count,scalarCount:scalars,containerCount:containers,
      deliveredScalarBytes:scalarBytes,pages:pageCount,
      rightsBasis:'SOURCE_FACTS_ONLY',engineeringReady:false
    });
  }catch(error){failed=error;throw error;}
  finally{
    if(!closed){
      closed=true;
      try{await session.close();}catch(error){if(!failed)throw error;}
    }
  }
}
