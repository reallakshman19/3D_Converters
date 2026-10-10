/**
 * A3 30-MiB-class POPULATED source catalog stress (research Worker boundary).
 * FOUR authentic 10,232,634-byte original source root arrays are concatenated
 * as a new valid array. Every byte between branch arrays represents actual
 * original objects/fields, NOT padded whitespace or a sparse dummy fixture.
 * Derived stress input: NOT an Owner-original 30MB semantic/golden fixture.
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const copies=Number(process.env.LFJ_A3_STRESS_COPIES||4);
assert.ok(copies===4||copies===10,'supported stress sizes: 4x or 10x authentic source');
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage();
  page.setDefaultTimeout(copies===10?540000:170000);
  await page.goto('http://127.0.0.1:4200/lfj/qualification/experiments/consumer-sparse-b0-xml-match/xml-csv-original.html');
  const result=await page.evaluate(async({copies})=>{
    const sourceUrl='/Benchmarks/1885_NC/1885_NC.json';
    const sourceResponse=await fetch(sourceUrl,{cache:'no-store'});
    if(!sourceResponse.ok)throw Error('authentic 10MB source unavailable');
    const originalBytes=await sourceResponse.arrayBuffer();
    const digest=async bytes=>[...new Uint8Array(
      await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
    const pinned='89f9c2ab7a9f1df15c1b9e1e0e30a8ca6c97ef994dcd56aec86c3a90f7d71646';
    if(originalBytes.byteLength!==10232634||
       await digest(originalBytes)!==pinned)
      throw Error('authentic root source SHA/bytes invalid');
    const source=new TextDecoder('utf-8',{fatal:true}).decode(originalBytes).trim();
    if(source[0]!=='['||source.at(-1)!==']')
      throw Error('authentic source is not a top-level branch array');
    const inner=source.slice(1,-1).trim();
    // Reuse whole original populated branch arrays, never empty padding.
    const parts=['['];
    for(let i=0;i<copies;i++){
      if(i)parts.push(',');
      parts.push(inner);
    }
    parts.push(']');
    const blob=new Blob(parts,{type:'application/json'});
    const target=copies===10?90:30;
    const max=copies===10?110:45;
    if(blob.size<target*1024*1024||blob.size>max*1024*1024)
      throw Error('expected >='+target+'MiB populated input: '+blob.size);
    const sourceSha=await digest(await blob.arrayBuffer());
    const generation=crypto.randomUUID();
    const sourceDb='lfj-a3-source-'+generation;
    const projectionDb='lfj-a3-projection-'+generation;
    const {cleanupSourceBackedResearchDatabases}=await import(
      '/lfj/consumers/3d-converters/source-backed-resolver-build.mjs');
    let timer,maxHeartbeatGapMs=0,last=performance.now();
    const start=performance.now();
    timer=setInterval(()=>{
      const now=performance.now();
      maxHeartbeatGapMs=Math.max(maxHeartbeatGapMs,now-last);
      last=now;
    },50);
    let worker=null,summary=null,catalogPages=null;
    try{
      worker=new Worker(
        '/lfj/qualification/experiments/consumer-sparse-b0/compact-paged.worker.mjs',
        {type:'module'});
      summary=await Promise.race([
        new Promise((resolve,reject)=>{
          worker.onerror=e=>reject(Error('source worker '+(e.message||'error')));
          worker.onmessage=({data})=>{
            if(data?.type==='DONE')resolve(data.result);
            else if(data?.type==='ERROR')
              reject(Error('source Worker '+data.code+': '+data.message));
          };
          worker.postMessage({type:'START',blob,expectedSha256:sourceSha,
            databaseName:sourceDb,generation,revision:generation});
        }),
        new Promise((_,reject)=>setTimeout(()=>reject(
          Error('populated source catalog exceeded browser deadline')),
          copies===10?450000:140000))
      ]);
      if(summary.originalBytes!==blob.size||
         summary.sourceSha256!==sourceSha||
         summary.occurrenceCount<10000||
         summary.pageCount<3)
        throw Error('populated source catalog evidence incomplete');
      const names=(await indexedDB.databases()).map(x=>x.name);
      if(!names.includes(sourceDb))
        throw Error('source catalog not persisted in IndexedDB');
      catalogPages=summary.pageCount;
    }finally{
      clearInterval(timer);
      worker?.terminate();
      // Do not leave raw source pages behind even on timeout/throw.
      await cleanupSourceBackedResearchDatabases([sourceDb,projectionDb]);
    }
    const leaked=(await indexedDB.databases()).filter(x=>x.name?.startsWith('lfj-a3-'));
    if(leaked.length)throw Error('source stress leaked A3 source databases');
    return {
      schema:'LFJ.A3.PopulatedSourceStress.v1',
      provenance:'DERIVED_'+copies+'X_AUTHENTIC_1885_NC_SOURCE_NOT_OWNER_GOLDEN',
      sourceSha256:sourceSha,sourceBytes:blob.size,
      originalJsonSha256:pinned,originalJsonBytes:originalBytes.byteLength,
      occurrenceCount:summary.occurrenceCount,
      pageCount:catalogPages,storageWrites:summary.storageWrites,
      workerElapsedMs:summary.elapsedMs,
      fullElapsedMs:performance.now()-start,
      maxHeartbeatGapMs,leakedA3Databases:leaked.length,
      productResolverMatchingQualified:false,
      independentGoldenAccepted:false
    };
  },{copies});
  assert.equal(result.leakedA3Databases,0);
  assert.ok(result.sourceBytes>=(copies===10?90:30)*1024*1024);
  assert.ok(result.occurrenceCount>=10000);
  console.log('A3_POPULATED_'+(copies===10?'90':'30')+'MIB_SOURCE_CATALOG_PASS '+JSON.stringify(result));
}finally{await browser.close();}
