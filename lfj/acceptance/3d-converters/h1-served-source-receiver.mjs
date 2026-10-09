// #1104 A03 independent RECEIVER H1 acceptance: actual docs origin LFJ runtime.
// ONLY test-only routes are #1104 consumer receiver and the independently
// first-party source CAS sink, both outside #1097's docs/lfj/** write lease.
// All NEUTRAL LFJ SourceSession, Worker, page/index/pair IndexedDB modules and
// transitive imports MUST come from the real docs/ HTTP publication.
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
const generationStore=await readFile('lfj/consumers/3d-converters/source-generation-store.mjs','utf8');
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
  await page.route('**/__lfj1104_generation__.mjs',route=>route.fulfill({
    status:200,contentType:'text/javascript',body:generationStore
  }));
  await page.goto('http://127.0.0.1:4186/lfj/served-durable-qualification.html',{waitUntil:'load'});
  const records=await page.evaluate(async({raw,sha})=>{
    let receiverModule,generationModule;
    try {
      [receiverModule,generationModule]=await Promise.all([
        import('/__lfj1104_receiver__.mjs'),
        import('/__lfj1104_generation__.mjs')
      ]);
      if(typeof receiverModule.consumeSelectedSourceFacts!=='function'||
         typeof generationModule.createSourceFactsGenerationStore!=='function')
        throw Error('missing first-party receiver or generation store export');
    } catch(e) {
      return {kind:'A03_CONSUMER_FIXTURE_INVALID',error:String(e?.message||e)};
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
    const {createSourceFactsGenerationStore}=generationModule;
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
      let session=null,commits=0,aborts=0,stagedCount=0,receipt,error=null;
      // This is the actual #1104-owned source-only generation store module,
      // not a mock-publishing browser closure. It performs the live app CAS and
      // one-turn visibility swap; the wrapper below ONLY records test hooks.
      const generation=createSourceFactsGenerationStore({
        getCurrentBasis:()=>({...current}),maxFacts:64
      });
      const txn={
        begin:args=>generation.transaction.begin(args),
        stage:f=>{
          generation.transaction.stage(f);stagedCount++;
          if(stale && stagedCount===2)
            current.dependencyRevision='superseded master after first page';
        },
        commit:args=>{
          const publication=generation.transaction.commit(args);
          commits++;return publication;
        },
        abort:args=>{aborts++;return generation.transaction.abort(args);}
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
        const snapshot=generation.readPublished();
        const published=snapshot?.facts.map(f=>({
          path:f.row.path,occurrenceId:f.row.occurrenceId,
          raw:f.bytes===null?null:new TextDecoder().decode(f.bytes)
        }))??[];
        const summary={
          error,receipt,commits,aborts,published,
          hiddenAfterFailure:snapshot===null,
          publishedRights:snapshot?.rightsBasis??null,
          publishedEngineeringReady:snapshot?.engineeringReady??null,
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
  assert.equal(p.publishedRights,'SOURCE_FACTS_ONLY');
  assert.equal(p.publishedEngineeringReady,false);
  assert.equal(p.closeCode,'SESSION_CLOSED');
  const stale=records.staleDependency;
  assert.equal(stale.error,'CONSUMER_BASIS_STALE');
  assert.equal(stale.commits,0);assert.equal(stale.aborts,1);
  assert.deepEqual(stale.published,[]);
  assert.equal(stale.hiddenAfterFailure,true,
    'staging failure must leave NO visible first-party app result');
  assert.equal(stale.closeCode,'SESSION_CLOSED');
  assert.deepEqual(pageErrors,[]);
  console.log('A03 Worker+IndexedDB to actual #1104 source CAS generation store PASS; workflow distinguishes PROVISIONAL staging from canonical authored docs H1');
} finally {await browser.close();}
