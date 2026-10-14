/** XML229/P3B.0C: original checked-in Firstpass JSON -> REAL R10 Worker ->
 * committed O1 IndexedDB source occurrence pairs -> <=1 MiB original branch
 * Blob slice -> TEST-ONLY projection Worker using EXISTING DTXR/geometry functions.
 * Does not wire the protected product Preview, and does not confer release rights.
 */
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';

const original=await readFile('Benchmarks/1885Sjson/Sjson.json');
const expectedSha='6b2c8b01ab0ba6ec8e9e7c42eb4a719668ffd2dc4dbe4790d27cf426a1f60288';
assert.equal(createHash('sha256').update(original).digest('hex'),expectedSha);
const results={schema:'XML229.P3B0C.OriginalCommittedSourceRead.v1',
  exactHead:process.env.EXACT_HEAD||null,fixture:'Benchmarks/1885Sjson/Sjson.json',
  bytes:original.byteLength,sha256:expectedSha,privateOwnerInputNotUsed:true,
  onlyTestFilesChanged:true,checks:{},error:null,pass:false};
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage();
  page.setDefaultTimeout(30000);
  const resp=await page.goto('http://127.0.0.1:4173/tests/browser/xml229-p3b-source-read-witness.html');
  assert.equal(resp?.status(),200);
  const proof=await page.evaluate(async(expectedSha)=>{
    const {openIndexedPageRecordStore}=await import('/lfj/storage/browser/indexed-page-record-store.mjs');
    const sourceResponse=await fetch('/Benchmarks/1885Sjson/Sjson.json');
    if(!sourceResponse.ok)throw Error('P3B_TEST_SOURCE_UNAVAILABLE');
    const file=new File([await sourceResponse.blob()],'Sjson.json',{type:'application/json'});
    const uuid=crypto.randomUUID(),sourceRefId='xml229-p3b0c-'+uuid;
    const databaseName='xml229-p3b0c-'+uuid,generation=uuid;
    const worker=new Worker('/lfj/ports/source-browser-worker.mjs',{type:'module'});
    let store=null,basis=null,pageCount=0,eventCount=0;
    const started=performance.now();
    const typed=(e)=>e?.code||e?.message||String(e);
    const rm=async()=>{
      try{store?.close();}catch{}
      await new Promise(resolve=>{
        const req=indexedDB.deleteDatabase(databaseName);
        req.onsuccess=req.onerror=req.onblocked=()=>resolve();
      });
    };
    try{
      const manifest=await new Promise((resolve,reject)=>{
        const timeout=setTimeout(()=>reject(Error('P3B_TEST_SCAN_TIMEOUT')),180000);
        const fail=e=>{clearTimeout(timeout);reject(e);};
        worker.onerror=()=>fail(Error('P3B_TEST_REAL_WORKER_ERROR'));
        worker.onmessage=async({data:m})=>{
          try{
            if(m?.kind==='PROVISIONAL_PAGE'){
              if(m.schema!=='LFJ.CrossRuntimeSourcePort.v1'||m.jobId!==uuid||
                  m.sourceRefId!==sourceRefId||!Array.isArray(m.rows)||!m.rows.length)
                throw Error('P3B_TEST_WRONG_SOURCE_EVENT');
              if(!basis){
                const first=m.rows[0];
                basis={sourceRefId,sourceSha256:first.sourceSha256,
                  sourceRevision:first.sourceRevision};
                store=await openIndexedPageRecordStore({
                  databaseName,namespace:sourceRefId,generation,basis,kind:'source'});
              }
              await store.stagePage(m.rows);
              pageCount++;eventCount+=m.rows.length;
              worker.postMessage({schema:'LFJ.CrossRuntimeSourcePort.v1',kind:'PAGE_ACK',
                jobId:uuid,sourceRefId,sequence:m.sequence});
            }else if(m?.kind==='SCAN_DONE'){
              if(!basis||m.summary?.sourceSha256!==basis.sourceSha256)throw Error('P3B_TEST_SUMMARY_SOURCE');
              await store.commit(m.summary);
              clearTimeout(timeout);resolve(m.summary);
            }else if(m?.kind==='FAILED')throw Error('P3B_TEST_SCAN_FAILED_'+m.code);
          }catch(e){fail(e);}
        };
        worker.postMessage({schema:'LFJ.CrossRuntimeSourcePort.v1',kind:'SCAN',
          jobId:uuid,sourceRefId,revision:uuid,blob:file,pageEvents:1024});
      });
      worker.terminate();
      if(manifest.complete!==true||manifest.rightsBasis!=='SOURCE_FACTS_ONLY'||
          manifest.engineeringReady!==false||manifest.occurrenceCount!==23754||
          manifest.eventCount!==47508||pageCount!==47||
          manifest.sourceSha256!==expectedSha)
        throw Error('P3B_TEST_SOURCE_NOT_ATTESTED');
      const occurrenceId=path=>JSON.stringify(['lfj-json-value/v1',sourceRefId,basis.sourceRevision,path]);
      const readOne=async(path)=>{
        const pair=await store.lookupCommittedPair(occurrenceId(path));
        if(pair.open.path!==path||pair.seal.ordinal!==pair.open.ordinal)throw Error('P3B_TEST_PATH');
        const bytes=pair.seal.endByteExclusive-pair.open.startByte;
        if(bytes<1||bytes>1048576)throw Error('P3B_TEST_BOUNDED_VALUE');
        const buffer=await file.slice(pair.open.startByte,pair.seal.endByteExclusive).arrayBuffer();
        if(buffer.byteLength!==bytes)throw Error('P3B_TEST_SHORT_READ');
        return {path,occurrenceId:occurrenceId(path),bytes:new Uint8Array(buffer)};
      };
      const branch=await readOne('/0'),elbow=await readOne('/0/children/0');
      const smallWitness=new TextDecoder().decode(elbow.bytes);
      if(!smallWitness.includes('ELBOW 90 DEG LR BW Sch 80')||
         !smallWitness.includes('1006649732/51228'))
        throw Error('P3B_TEST_WRONG_ORIGINAL_SPAN');
      const readProof=await new Promise((resolve,reject)=>{
        const projector=new Worker('/tests/browser/xml229-p3b-source-projection-worker.mjs',{type:'module'});
        const timeout=setTimeout(()=>{projector.terminate();reject(Error('P3B_TEST_PROJECT_TIMEOUT'));},30000);
        projector.onerror=()=>{clearTimeout(timeout);projector.terminate();reject(Error('P3B_TEST_PROJECT_WORKER_ERROR'));};
        projector.onmessage=({data:m})=>{clearTimeout(timeout);projector.terminate();
          if(m?.kind!=='SOURCE_BRANCH_PROJECTED')reject(Error(m?.code||'P3B_TEST_PROJECT_FAILED'));
          else resolve(m);
        };
        projector.postMessage({kind:'PROJECT_SINGLE_SOURCE_BRANCH',sourceSha256:expectedSha,
          occurrenceId:branch.occurrenceId,sourcePath:'/0',bytes:branch.bytes});
      });
      if(readProof.sourceSha256!==expectedSha||
         readProof.occurrenceId!==branch.occurrenceId||
         readProof.engineeringReady!==false||
         readProof.witnessedDtxr!=='ELBOW 90 DEG LR BW Sch 80'||
         readProof.witnessBore!=='150mm'||
         readProof.dtxrCount<1||readProof.wallGroupCount<1||readProof.geometryCount<1)
        throw Error('P3B_TEST_EXISTING_PROJECTOR_DIVERGED');
      let crossGen='NONE';
      const wrong=await openIndexedPageRecordStore({databaseName,namespace:sourceRefId,
        generation:'forged-'+uuid,basis,kind:'source'});
      try{await wrong.lookupCommittedPair(occurrenceId('/0'));crossGen='UNEXPECTED';}
      catch(e){crossGen=typed(e);}
      wrong.close();
      if(crossGen!=='PAGE_NOT_COMMITTED')throw Error('P3B_TEST_WRONG_GENERATION_ACCEPTED');
      await store.abort();
      let afterRevocation='NONE';
      try{await store.lookupCommittedPair(occurrenceId('/0'));afterRevocation='UNEXPECTED';}
      catch(e){afterRevocation=typed(e);}
      if(afterRevocation!=='PAGE_STORE_CLOSED')throw Error('P3B_TEST_REVOKED_SOURCE_ACCEPTED');
      return {sourceCommitted:true,sourceIndexSha256:manifest.sourceSha256,
        sourceCount:manifest.occurrenceCount,sourceEvents:eventCount,committedPages:pageCount,
        sourceIndexWallMs:Math.round(performance.now()-started),
        scopedBranchSpanBytes:branch.bytes.byteLength,
        elbowSpanBytes:elbow.bytes.byteLength,
        existingProjection:{dtxrCount:readProof.dtxrCount,
          wallGroupCount:readProof.wallGroupCount,
          geometryCount:readProof.geometryCount,
          originalDtxr:readProof.witnessedDtxr,
          originalBore:readProof.witnessBore},
        wrongGeneration:crossGen,revokedRead:afterRevocation,
        parsedWholeOriginalJsonOnMainThread:false,
        perValueBytesMax:1048576,
        rightsBasis:manifest.rightsBasis,engineeringReady:manifest.engineeringReady};
    }finally{worker.terminate();await rm();}
  },expectedSha);
  results.checks=proof;
  assert.ok(proof.sourceCommitted);
  assert.equal(proof.sourceCount,23754);
  assert.equal(proof.committedPages,47);
  assert.equal(proof.wrongGeneration,'PAGE_NOT_COMMITTED');
  assert.equal(proof.revokedRead,'PAGE_STORE_CLOSED');
  assert.equal(proof.existingProjection.originalBore,'150mm');
  assert.equal(proof.engineeringReady,false);
  results.pass=true;
}catch(error){results.error=String(error?.stack||error).slice(0,3000);}
finally{
  await mkdir('ValidationRecords',{recursive:true});
  await writeFile('ValidationRecords/xml229-p3b0c-original-source-read.json',JSON.stringify(results,null,2)+'\n');
  console.log('XML229_P3B0C_ORIGINAL_SOURCE_READ '+JSON.stringify(results));
  await browser.close();
}
assert.ok(results.pass,results.error||'P3B.0C test-only source read proof failed');
