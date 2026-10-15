/**
 * XML229 P4-B — one physical source, one isolated engineering Preview Worker,
 * one GC-PW Match-1 / Match-2 review service. Strict native Worker only.
 *
 * The independently enumerated source and physical identity lists must come
 * from the owning original XML importer, NOT from returned Worker results
 * nor visible Weight table rows. This is the reusable producer-to-review port
 * for future Weight Match + Final UI integration, with no automatic decisions.
 */
import {createGcPwPreviewWorkerFactPort} from './gc-pw-preview-worker-fact-port.js';
import {createXml229EngineeringWorkerClient} from './xml229-preview-engineering-worker-client.mjs';
import {openGcPwPreviewWeightSession} from './gc-pw-preview-weight-session.js';

const fail=(code,message)=>{const e=new Error(message);e.code=code;throw e;};
export async function openXml229AttestedWeightReview({
  sources,masters,selection,stagedSource=null,config={},overrides={},
  independentSourceOccurrences,independentOriginalNodeOccurrences,
  independentPhysicalOccurrences,requestId,
  workerFactory,onProgress,maxPhysical=10000,
}={}){
  if(!Array.isArray(sources)||sources.length!==1||
    !Array.isArray(selection)||selection.length!==1||
    sources[0]?.sourceId!==selection[0]?.sourceId||
    selection[0].selectionRef!=='all')
    fail('INDEPENDENT_FULL_XML_SCOPE_REQUIRED','Only fully selected original Mode A XML is authorized for this Worker');
  if(stagedSource!==null)
    fail('STAGED_BLOB_BASIS_WORKER_REQUIRED',
      'Original JSON staged bytes need Worker-held InputBasis custody; no main-thread JSON conversion');
  if(!Array.isArray(independentSourceOccurrences)||
    !Array.isArray(independentOriginalNodeOccurrences)||
    !Array.isArray(independentPhysicalOccurrences)||
    independentSourceOccurrences.length<1||independentOriginalNodeOccurrences.length<1||
    independentPhysicalOccurrences.length<1)
    fail('INDEPENDENT_XML_CENSUS_REQUIRED','Actual importer original XML and physical occurrence census required');
  const sourceId=sources[0].sourceId;
  const originalSet=new Set();
  for(const item of independentSourceOccurrences){
    if(item?.sourceId!==sourceId||!['branch','node'].includes(item.subjectType)||!item.occurrenceId)
      fail('INVALID_SOURCE_CENSUS','Source and node originals must belong to the selected source');
    const key=JSON.stringify([item.subjectType,item.occurrenceId]);
    if(originalSet.has(key))fail('DUPLICATE_ORIGINAL_SOURCE','Source original identity repeated');
    originalSet.add(key);
  }
  const physicalSet=new Set();
  for(const row of independentPhysicalOccurrences){
    if(row?.sourceId!==sourceId||!Number.isSafeInteger(row.branchOccurrenceIndex)||
      !Number.isSafeInteger(row.nodeOrdinal)||!row.componentSignature)
      fail('INVALID_INDEPENDENT_PHYSICAL','Original physical occurrence identity missing');
    const key=JSON.stringify([row.sourceId,row.branchOccurrenceIndex,row.nodeOrdinal,row.componentSignature]);
    if(physicalSet.has(key))fail('DUPLICATE_PHYSICAL','Physical source occurrence repeated');
    physicalSet.add(key);
  }
  if(independentPhysicalOccurrences.length>maxPhysical)
    fail('PHYSICAL_WORKER_LIMIT','Physical population beyond bounded P4 Worker, no UI fallback');
  const xmlText=sources[0].text;
  if(typeof xmlText!=='string'||!xmlText.trim())
    fail('ORIGINAL_XML_REQUIRED','Original XML text is required');
  const live={
    sources:{[sourceId]:xmlText},masters,selection,
    stagedSource:null,config,overrides,
  };
  const client=createXml229EngineeringWorkerClient({
    workerFactory,xmlText,sourceId,live,
    expectedOriginalCount:independentSourceOccurrences.length,
    maxPhysical,onProgress,
  });
  const port=createGcPwPreviewWorkerFactPort({
    startJob:args=>client.startJob(args),
    openFactModel:args=>client.openFactModel(args),
    expectedOriginalOccurrences:independentSourceOccurrences,
    expectedOriginalCount:independentSourceOccurrences.length,
    expectedModelOccurrenceCount:independentSourceOccurrences.length+
      independentPhysicalOccurrences.length,
    expectedPhysicalFactCount:independentPhysicalOccurrences.length*7,
    pageSize:100,
  });
  try{
    const opened=await openGcPwPreviewWeightSession({
      sources,masters,selection,stagedSource:null,config,overrides,
      originalOccurrences:independentOriginalNodeOccurrences,
      expectedOriginalCount:independentOriginalNodeOccurrences.length,
      physicalOccurrences:independentPhysicalOccurrences,
      requiredFieldIds:['source.occurrence','bore.mm','length.mm','rating','mass.kg',
        'component.type','component.ref'],
      requestId,loadFactPages:port,
    });
    const ready=await opened.awaitReady();
    const evidence=client.getSummary();
    if(!evidence||evidence.info?.basisId!==ready.basis.basisId||
       evidence.counts?.physical!==independentPhysicalOccurrences.length||
       ready.openedFacts!==independentPhysicalOccurrences.length*7)
      fail('VERIFIED_POPULATION_DRIFT','Completed review service facts differ from independent physical census');
    // The caller must keep this one SESSION identity for both panels. A
    // cloned legacy config or separate Match-2 ranker is not equivalent.
    return Object.freeze({basisId:ready.basis.basisId,session:ready,
      requestId,engineeringFacts:evidence.info,
      workerSummary:{counts:evidence.counts},
      dispose:()=>client.dispose()});
  }catch(error){client.dispose();throw error;}
}

/**
 * Production-ready independent census invocation seam: do not extract
 * expected original/physical IDs from the engineering Worker response.
 * A second isolated source-only Worker independently prepares the census,
 * then the engineering Worker must prove its own source computations match.
 */
export async function openXml229AttestedWeightReviewWithOriginalCensus({
  censusWorkerFactory=()=>new Worker(new URL('./xml229-original-physical-census-worker.mjs',import.meta.url),
    {type:'module'}),
  ...options
}={}){
  if(options.stagedSource!==undefined&&options.stagedSource!==null)
    fail('STAGED_BLOB_BASIS_WORKER_REQUIRED',
      'Large original JSON requires a Worker-held full source basis, never a UI text copy');
  const sources=options.sources;
  if(!Array.isArray(sources)||sources.length!==1||typeof sources[0]?.text!=='string'||
     !sources[0]?.sourceId||!options.config)
    fail('ORIGINAL_SOURCE_CENSUS_REQUIRED','One loaded original XML and current configuration required');
  const worker=censusWorkerFactory();
  if(!worker||typeof worker.postMessage!=='function'||
      typeof worker.addEventListener!=='function')
    fail('CENSUS_WORKER_REQUIRED','Independent census must run in a real isolated Worker');
  const requestId=String(options.requestId||'');
  if(!requestId)fail('REQUEST_ID_REQUIRED','A unique source/census request ID is mandatory');
  const protocol='XML229.P4.OriginalWeightCensus.v1';
  let result;
  try{
    result=await new Promise((resolve,reject)=>{
      worker.addEventListener('message',({data:m})=>{
        if(m?.protocol!==protocol||m.requestId!==requestId)return;
        if(m.state==='completed')resolve(m);
        else if(m.state==='failed'){
          const e=new Error(m.error?.message||'Original source census failed');
          e.code=m.error?.code||'INDEPENDENT_CENSUS_FAILED';reject(e);
        }
      });
      worker.addEventListener('error',e=>reject(new Error(String(e?.message||e))));
      worker.postMessage({protocol,kind:'start',requestId,
        xmlText:sources[0].text,sourceId:sources[0].sourceId,config:options.config});
    });
  }finally{
    worker.terminate();
  }
  if(!Array.isArray(result.independentSourceOccurrences)||
     !Array.isArray(result.independentOriginalNodeOccurrences)||
     !Array.isArray(result.independentPhysicalOccurrences)||
     result.counts?.original!==result.independentSourceOccurrences.length||
     result.counts?.physical!==result.independentPhysicalOccurrences.length)
    fail('CENSUS_PAYLOAD_DRIFT','Original census Worker produced an incomplete result');
  return openXml229AttestedWeightReview({
    ...options,
    independentSourceOccurrences:result.independentSourceOccurrences,
    independentOriginalNodeOccurrences:result.independentOriginalNodeOccurrences,
    independentPhysicalOccurrences:result.independentPhysicalOccurrences,
  });
}
