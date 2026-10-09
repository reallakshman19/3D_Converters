// #1104 A03 independent RECEIVER H1 acceptance: actual docs origin LFJ runtime.
// The ONLY test-only route is the #1104 consumer receiver itself, which DEPLOY
// #1097 does not own. SourceSession, Worker, page/index/pair IDB and all transitive
// LFJ imports MUST come from the real docs/ HTTP publication, never source tree.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const raw='[{"name":"é","children":[{"name":"X"}]},{"name":"é","children":[{"name":"Y"}]}]';
const expectedPaths=['','/0','/0/name','/0/children','/0/children/0',
  '/0/children/0/name','/1','/1/name','/1/children','/1/children/0',
  '/1/children/0/name'];
const sha=createHash('sha256').update(raw).digest('hex');
const receiver=await readFile('lfj/consumers/3d-converters/source-facts-receiver.mjs','utf8');
const browser=await chromium.launch({headless:true});
try {
  const page=await browser.newPage();
  const pageErrors=[];
  page.on('pageerror',e=>pageErrors.push(e.message));
  // Transparent acceptance-only exception: the receiver is #1104 source code,
  // NOT a substitute / fallback route for any LFJ deployed runtime module.
  await page.route('**/__lfj1104_receiver__.mjs',route=>route.fulfill({
    status:200,contentType:'text/javascript',body:receiver
  }));
  await page.goto('http://127.0.0.1:4186/lfj/served-durable-qualification.html',{waitUntil:'load'});
  const records=await page.evaluate(async({raw,sha})=>{
    let receiverModule;
    try {
      receiverModule=await import('/__lfj1104_receiver__.mjs');
      if(typeof receiverModule.consumeSelectedSourceFacts!=='function')
        throw Error('missing receiver export');
    } catch(e) {
      return {kind:'A03_RECEIVER_FIXTURE_INVALID',error:String(e?.message||e)};
    }
    let imports;
    try {
      imports=await Promise.all([
        import('/lfj/runtime/source-session.mjs'),
        import('/lfj/runtime/indexed-occurrence-pairs.mjs'),
        import('/lfj/storage/browser/indexed-record-store.mjs')
      ]);
    } catch(e) {
      return {kind:'H1_DEPLOY_IMPORT_REJECT',
        error:String(e?.message||e),
        required:['/lfj/runtime/source-session.mjs',
          '/lfj/runtime/indexed-occurrence-pairs.mjs',
          '/lfj/storage/browser/indexed-record-store.mjs']};
    }
    const [{openSourceSession},{openIndexedOccurrencePairStore,createPairedIndexStore},
      {openIndexedRecordStore}]=imports;
    const {consumeSelectedSourceFacts}=receiverModule;
    const input=new TextEncoder().encode(raw);
    const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',input)),
      b=>b.toString(16).padStart(2,'0')).join('');
    if(digest!==sha) return {kind:'INDEPENDENT_SOURCE_SHA_MISMATCH',digest};
    const run=async(stale)=>{
      const jobId='A03-real-'+crypto.randomUUID();
      const sourceRefId='A03-original-'+crypto.randomUUID();
      const sourceRevision='A03:sha256:'+sha,selectionDigest='A03-ALL';
      const basis={sourceRefId,sourceSha256:sha,sourceRevision};
      const expectedBasis={...basis,selectionDigest,jobId,
        dependencyRevision:'original-xml-masters-config',byteLength:input.byteLength};
      let current={...expectedBasis};
      const databaseName='lfj-1104-a03-'+crypto.randomUUID();
      const source=await openIndexedRecordStore({databaseName,
        namespace:'source',generation:jobId,basis,kind:'source'});
      const selected=await openIndexedRecordStore({databaseName,
        namespace:'selected',generation:jobId,basis,kind:'selection',
        selectionDigest,jobEpoch:jobId});
      const pair=await openIndexedOccurrencePairStore({
        databaseName:databaseName+'-pairs',namespace:'source',generation:jobId,basis
      });
      let session=null,commits=0,aborts=0,staged=[],published=[],receipt,error=null;
      const txn={
        async begin(){if(staged.length)throw Error('generation must start empty');},
        async stage(f){
          staged.push({path:f.row.path,occurrenceId:f.row.occurrenceId,
            raw:f.bytes===null?null:new TextDecoder().decode(f.bytes)});
          if(stale && staged.length===2)
            current.dependencyRevision='superseded master after first page';
        },
        async commit({receipt:complete,expectedBasis:expected,getCurrentBasis}){
          // Single synchronous promotion with live compare-and-swap in fixture;
          // *not* proof of an eventual production persistent app-owned sink.
          if(Object.keys(expected).some(key=>expected[key]!==getCurrentBasis()[key]))
            throw Object.assign(Error('stale app basis'),{code:'APP_CAS_STALE'});
          published=staged.slice();commits++;
          return {schema:'LFJ.3D.SourceFactsPublication.v1',committed:true,
            ...expected,selectedCount:complete.selectedCount,
            rightsBasis:'SOURCE_FACTS_ONLY',engineeringReady:false};
        },
        async abort(){aborts++;staged=[];}
      };
      try {
        session=await openSourceSession({blob:new Blob([input]),
          revision:'A03',expectedSha256:sha,sourceRefId,jobId,selectionDigest,
          selection:{mode:'ALL',includes:[],excludes:[]},
          trustedWorkerCtor:Worker,
          createWorker:()=>new Worker(
            new URL('/lfj/ports/source-browser-worker.mjs',location.origin),
            {type:'module'}),
          indexStore:createPairedIndexStore({indexStore:source,pairPort:pair}),
          selectedStore:selected,getCurrentBasis:()=>({...current}),pageEvents:2
        });
        try {
          receipt=await consumeSelectedSourceFacts({session,
            expectedBasis,getCurrentBasis:()=>({...current}),transaction:txn,
            maxRows:2,maxScalarBytes:2048,maxPageBytes:65536});
        }catch(e){error=e?.code||e?.message||String(e);}
        const summary={
          error,receipt,commits,aborts,published,
          stagedRemaining:staged.length,
          workerBytes:session.receipt?.workerConsumedBytes,
          indexedOccurrences:session.summary?.occurrenceCount,
          sourceRights:session.pageManifest?.rightsBasis,
          engineeringReady:session.pageManifest?.engineeringReady
        };
        let closeCode=null;
        try {await session.readPage({cursor:null,maxRows:2,maxBytes:65536});}
        catch(e){closeCode=e?.code;}
        summary.closeCode=closeCode;
        return summary;
      } finally {
        try{await session?.close();}catch{}
        try{source.close();selected.close();pair.close();}catch{}
        indexedDB.deleteDatabase(databaseName);
        indexedDB.deleteDatabase(databaseName+'-pairs');
      }
    };
    return {kind:'H1_RECEIVER_RESULTS',sha:digest,positive:await run(false),
      staleDependency:await run(true)};
  },{raw,sha});
  assert.equal(records.kind,'H1_RECEIVER_RESULTS',
    'Actual docs-origin H1 must load before source-only consumer admission: '+
    JSON.stringify(records));
  assert.equal(records.sha,sha);
  const p=records.positive;
  assert.equal(p.error,null);
  assert.equal(p.receipt.complete,true);
  assert.equal(p.receipt.selectedCount,expectedPaths.length);
  assert.equal(p.receipt.engineeringReady,false);
  assert.equal(p.receipt.rightsBasis,'SOURCE_FACTS_ONLY');
  assert.equal(p.workerBytes,Buffer.byteLength(raw));
  assert.equal(p.indexedOccurrences,expectedPaths.length);
  assert.equal(p.sourceRights,'SOURCE_FACTS_ONLY');
  assert.equal(p.engineeringReady,false);
  assert.deepEqual(p.published.map(x=>x.path),expectedPaths);
  const identicalNames=p.published.filter(x=>x.path==='/0/name'||x.path==='/1/name');
  assert.equal(identicalNames.length,2);
  assert.notEqual(identicalNames[0].occurrenceId,identicalNames[1].occurrenceId);
  assert.deepEqual(identicalNames.map(x=>x.raw),['"é"','"é"']);
  assert.equal(p.commits,1);assert.equal(p.aborts,0);
  assert.equal(p.closeCode,'SESSION_CLOSED');
  const stale=records.staleDependency;
  assert.equal(stale.error,'CONSUMER_BASIS_STALE');
  assert.equal(stale.commits,0);assert.equal(stale.aborts,1);
  assert.deepEqual(stale.published,[]);
  assert.equal(stale.stagedRemaining,0);
  assert.equal(stale.closeCode,'SESSION_CLOSED');
  assert.deepEqual(pageErrors,[]);
  console.log('A03 exact docs origin Worker/IDB → #1104 receiver source-only original-byte union + late dependency abort ACCEPTABLE');
} finally {await browser.close();}
