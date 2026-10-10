/**
 * Product A3: native original-source LFJ Worker chain -> pending verified view.
 * No legacy JSON.parse, no synchronous fallback, no export rights.
 * Worker scripts remain research-controlled and explicitly restricted to
 * supported FLAT_BRANCHES_ONLY topology; unsupported input fails closed.
 */
import {configuredJsonTraceFieldNames} from '../../../tabs/xml-cii-2019-standalone/xml-cii-json-trace-fields.js';
import {resolveSourceSchema} from '../../../converters/xml-cii2019-core/source-schema-adapter.js';
import {verifyResolverResearchHandoff} from './verified-xml-csv-handoff.mjs';

const enc=new TextEncoder();
const fail=(code,message)=>{throw Object.assign(new Error(message),{code});};
const toHex=bytes=>[...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');
const sha=async bytes=>toHex(await crypto.subtle.digest('SHA-256',bytes));
export async function projectionCaptureDigest(config={}) {
  return sha(enc.encode(JSON.stringify({
    schema:'LFJ.B0.ResolverProjection.v1',config,toleranceMm:6,
    enabledFields:configuredJsonTraceFieldNames(config),
    resolvedSchema:resolveSourceSchema(config)
  })));
}

function nativeStep(file,data,{assertCurrent,signal}){
  if(signal?.aborted)fail('A3_CANCELLED','source-backed Build cancelled');
  assertCurrent();
  return new Promise((resolve,reject)=>{
    let finished=false,worker;
    const end=(error,result)=>{
      if(finished)return;
      finished=true;
      signal?.removeEventListener('abort',cancel);
      worker?.terminate();
      if(error)reject(error);else resolve(result);
    };
    const cancel=()=>end(Object.assign(new Error('cancelled'),{code:'A3_CANCELLED'}));
    try{
      worker=new Worker(new URL(file,import.meta.url),{type:'module'});
      worker.onerror=e=>end(Object.assign(new Error(e.message||'Worker exception'),
        {code:'A3_WORKER_ERROR'}));
      worker.onmessage=({data:response})=>{
        if(response?.type==='DONE')end(null,response.result);
        else if(response?.type==='ERROR')end(Object.assign(
          new Error(response.message||'native Worker refused original input'),
          {code:response.code||'A3_WORKER_REJECTED'}));
      };
      signal?.addEventListener('abort',cancel,{once:true});
      if(signal?.aborted){cancel();return;}
      worker.postMessage(data);
    }catch(e){end(e);}
  }).then(result=>{assertCurrent();return result;});
}

/**
 * Remove A3's ephemeral source/projection stores after every attempt.
 * Worker steps terminate before this runs; a blocked delete is a hard
 * product acceptance failure rather than a hidden storage leak.
 */
export async function cleanupSourceBackedResearchDatabases(names,{timeoutMs=8000}={}){
  if(!Array.isArray(names)||names.length!==2 ||
     names.some(name=>typeof name!=='string'||!/^lfj-a3-(source|projection)-[a-f0-9-]+$/.test(name)))
    fail('A3_IDB_NAMES','only this exact Build’s two ephemeral databases may be removed');
  const results=await Promise.allSettled(names.map(name=>new Promise((resolve,reject)=>{
    let done=false,request;
    const finish=error=>{
      if(done)return;
      done=true;clearTimeout(timer);
      if(error)reject(error);else resolve(name);
    };
    const timer=setTimeout(()=>finish(Object.assign(
      new Error('ephemeral IndexedDB deletion timed out: '+name),
      {code:'A3_IDB_CLEANUP'})),timeoutMs);
    try{
      request=indexedDB.deleteDatabase(name);
      request.onsuccess=()=>finish(null);
      request.onerror=()=>finish(Object.assign(
        new Error('ephemeral IndexedDB deletion failed: '+name),
        {code:'A3_IDB_CLEANUP'}));
      request.onblocked=()=>finish(Object.assign(
        new Error('ephemeral IndexedDB deletion was blocked: '+name),
        {code:'A3_IDB_CLEANUP'}));
    }catch(error){finish(Object.assign(
      new Error('ephemeral IndexedDB deletion threw: '+name+': '+String(error)),
      {code:'A3_IDB_CLEANUP'}));}
  })));
  const failure=results.find(row=>row.status==='rejected');
  if(failure)throw failure.reason;
  return Object.freeze({deleted:names.length});
}

/** The caller owns the live revision callback and source Blob identity. */
export async function runProductSourceBackedResolver({
  blob,xmlText,config={},revision,currentRevision,signal
}={}) {
  if(!(blob instanceof Blob)||blob.size===0||
     typeof xmlText!=='string'||!xmlText||
     !Number.isSafeInteger(revision)||revision<0||
     typeof currentRevision!=='function')
    fail('A3_PRODUCT_INPUT','original JSON Blob, XML and live revision required');
  if(typeof Worker!=='function'||typeof indexedDB==='undefined')
    fail('A3_WORKER_REQUIRED','native Worker and IndexedDB are required');
  const current=()=>{
    if(signal?.aborted)fail('A3_CANCELLED','source-backed Build cancelled');
    if(currentRevision()!==revision)
      fail('A3_PRODUCT_SUPERSEDED','source/config changed during native Worker Build');
  };
  current();
  // The one original Blob digest is verified by the source Worker again.
  // This does not decode/JSON.parse the entire original staged JSON on main.
  const originalSha256=await sha(await blob.arrayBuffer());
  current();
  const projectionConfigDigest=await projectionCaptureDigest(config);
  current();
  const generation=crypto.randomUUID();
  const sourceDb='lfj-a3-source-'+generation;
  const projectionDb='lfj-a3-projection-'+generation;
  const started=performance.now();
  try{
  const source=await nativeStep(
    '../../qualification/experiments/consumer-sparse-b0/compact-paged.worker.mjs',
    {type:'START',blob,expectedSha256:originalSha256,
      generation,databaseName:sourceDb,revision:generation},
    {assertCurrent:current,signal});
  if(source?.occurrenceCount<1)fail('A3_SOURCE_CENSUS','empty source catalog');
  const projection=await nativeStep(
    '../../qualification/experiments/consumer-sparse-b0-consumer/projection.worker.mjs',
    {type:'PROJECT',sourceDatabaseName:sourceDb,sourceGeneration:generation,
      projectionDatabaseName:projectionDb,projectionGeneration:generation,
      blob,expectedSha256:originalSha256,config,toleranceMm:6},
    {assertCurrent:current,signal});
  if(projection?.factCount<1)
    fail('A3_PROJECTION_EMPTY','empty engineering consumer projection');
  const result=await nativeStep(
    '../../qualification/experiments/consumer-sparse-b0-xml-match/matching.worker.mjs',
    {type:'MATCH',sourceDatabaseName:sourceDb,sourceGeneration:generation,
      projectionDatabaseName:projectionDb,projectionGeneration:generation,
      blob,expectedSha256:originalSha256,xmlText,config,
      includeResearchHandoff:true},
    {assertCurrent:current,signal});
  if(result?.originalSha256!==originalSha256||
      result?.projectionConfigDigest!==projectionConfigDigest ||
      result?.sourceOccurrenceCount!==source.occurrenceCount ||
      result?.projectionFacts!==projection.factCount ||
      result?.projectionSha256!==projection.domainSha256)
    fail('A3_SOURCE_PROJECTION','Worker stages reported contradictory source facts');
  const view=await verifyResolverResearchHandoff(result,{
    originalSha256,xmlText,projectionConfigDigest,revision,
    currentRevision:()=>{current();return revision;}
  });
  current();
  return Object.freeze({...view,
    nativeWorkerStages:3,
    elapsedMs:performance.now()-started,
    originalBytes:blob.size,
    matchedXmlNodes:result.matchedXmlNodes,
    indexedDbCleanup:'required-before-return',
    // Explicitly not a product export authorization or committed acceptance.
    downloadAuthorized:false,appWired:false});
  }finally{
    // Never let a successful CSV grant escape while its source pages remain
    // in the browser's persistent store, even after an abort or Worker error.
    await cleanupSourceBackedResearchDatabases([sourceDb,projectionDb]);
  }
}
