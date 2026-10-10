/**
 * Actual Chromium same-profile cold tab restart:
 *   real original source index commits -> live Web Lock excludes scavenger ->
 *   tab closes without JS cleanup -> next tab recovers orphan -> real rebuild.
 * No synthetic DB "crash" stand-ins or reusing previously committed source HEAD.
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({acceptDownloads:false});
try{
  const url='http://127.0.0.1:4200/lfj/qualification/experiments/consumer-sparse-b0-xml-match/xml-csv-original.html';
  const page1=await context.newPage();
  const pageErrors=[];
  page1.on('pageerror',e=>pageErrors.push(e.message));
  await page1.goto(url);
  await page1.evaluate(async()=>{
    const [state,events]=await Promise.all([
      import('/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-state.js'),
      import('/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events.js')
    ]);
    const [j,x]=await Promise.all([
      fetch('/Benchmarks/1885Sjson/Sjson.json',{cache:'no-store'}),
      fetch('/Benchmarks/1885Sjson/FirstpassXML',{cache:'no-store'})
    ]);
    if(!j.ok||!x.ok)throw Error('Authentic original tracked files unavailable');
    const file=new File([await j.arrayBuffer()],'Sjson.json');
    const section=document.createElement('section');
    section.innerHTML=`<input data-field="staged-json-file" type="file">
      <select data-field="resolver-source-mode">
       <option value="legacy">Legacy</option>
       <option value="lfj-indexed-preview">Indexed</option>
      </select><textarea data-field="resolver-json-config">{}</textarea>
      <button data-action="build-resolver-index">Build</button>`;
    document.body.append(section);
    const ref={current:state.updateWorkflowState(
      state.createXmlCiiAdaptedWorkflowState(),{
        sourceKind:'xml',sourceText:await x.text(),
        resolverJsonTraceConfig:{},supportConfigJson:'{}'
      })};
    events.bindSourceEvents(section,ref,()=>{});
    events.bindResolverEvents(section,ref,()=>{});
    events.bindActionEvents(section,ref,()=>{});
    const mode=section.querySelector('[data-field="resolver-source-mode"]');
    mode.value='lfj-indexed-preview';
    mode.dispatchEvent(new Event('change',{bubbles:true}));
    const upload=section.querySelector('[data-field="staged-json-file"]');
    const data=new DataTransfer();data.items.add(file);
    upload.files=data.files;
    upload.dispatchEvent(new Event('change',{bubbles:true}));
    const NativeWorker=window.Worker;
    window.__cold={ref,held:false,sourceCommitted:false};
    window.Worker=class extends NativeWorker{
      postMessage(payload,...args){
        if(payload?.type==='PROJECT'&&!window.__cold.held){
          window.__cold.held=true;
          // Intercept AFTER genuine source Worker returned its committed HEAD;
          // keep page alive without completing projection/cancelling source.
          return;
        }
        return super.postMessage(payload,...args);
      }
    };
    section.querySelector('[data-action="build-resolver-index"]').click();
  });
  await page1.waitForFunction(()=>window.__cold?.held===true,
    null,{timeout:180000});
  const activeBefore=await page1.evaluate(async()=>{
    const db=await indexedDB.databases();
    return {running:window.__cold.ref.current.resolverJsonTraceRunning,
      names:db.filter(d=>d.name?.startsWith('lfj-ui-preview-')).map(d=>d.name)};
  });
  assert.equal(activeBefore.running,true);
  assert.equal(activeBefore.names.filter(n=>n.includes('-source-r2-')).length,1);

  // Separate real tab in SAME storage partition; it must not delete an active
  // Web-Lock-owned generation while the original Worker has been paused.
  const page2=await context.newPage();
  page2.on('pageerror',e=>pageErrors.push(e.message));
  await page2.goto(url);
  const activeProbe=await page2.evaluate(async()=>{
    const {recoverAbandonedIndexedGenerations}=await import(
      '/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-lfj-cold-recovery.js');
    const result=await recoverAbandonedIndexedGenerations();
    return {result,names:(await indexedDB.databases())
      .filter(d=>d.name?.includes('-r2-')).map(d=>d.name)};
  });
  assert.equal(activeProbe.result.liveSkipped,1);
  assert.equal(activeProbe.result.recovered,0);
  assert.equal(activeProbe.names.length,1);

  // Real tab interruption. Chromium may itself finish the pending finally
  // while closing the page. Record that behavior precisely: it is NOT proof
  // that orphan reclamation ran, and must not be reported as recovered.
  await page1.close();
  const postClose=await page2.evaluate(async()=>{
    const {recoverAbandonedIndexedGenerations}=await import(
      '/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-lfj-cold-recovery.js');
    const before=(await indexedDB.databases())
      .filter(d=>d.name?.includes('-r2-')).map(d=>d.name);
    let result=null,after=[],recovered=0,attempts=0;
    const deadline=performance.now()+12000;
    do{
      result=await recoverAbandonedIndexedGenerations();
      recovered+=result.recovered;attempts++;
      after=(await indexedDB.databases())
        .filter(d=>d.name?.includes('-r2-')).map(d=>d.name);
      if(after.length===0)break;
      // The renderer/page-close may release its Web Lock asynchronously.
      // Never delete the live-locked generation; bounded retry is test-only.
      await new Promise(resolve=>setTimeout(resolve,100));
    }while(performance.now()<deadline);
    return {before,result,after,recovered,attempts};
  });
  assert.equal(postClose.after.length,0,
    'Browser tab-close generation remained locked/persisted past 12s recovery bound');
  assert.equal(postClose.recovered,postClose.before.length);

  // Force the harder orphan boundary deterministically: an ORIGINAL source
  // Worker commits a complete source HEAD with a versioned UUID and exits,
  // but the owning browser generation lease is absent (as after a hard crash).
  // This is a real source catalog, not a fabricated empty IndexedDB record.
  const cold=await page2.evaluate(async()=>{
    const {indexedGenerationNames,recoverAbandonedIndexedGenerations}=
      await import('/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-lfj-cold-recovery.js');
    const input=await fetch('/Benchmarks/1885Sjson/Sjson.json',{cache:'no-store'});
    if(!input.ok)throw Error('Authentic JSON source missing for orphan fixture');
    const blob=await input.blob();
    const sha=[...new Uint8Array(await crypto.subtle.digest('SHA-256',
      await blob.arrayBuffer()))].map(x=>x.toString(16).padStart(2,'0')).join('');
    const uuid=crypto.randomUUID();
    const [sourceDb,projectionDb]=indexedGenerationNames(uuid);
    const worker=new Worker(
      '/lfj/qualification/experiments/consumer-sparse-b0/compact-paged.worker.mjs',
      {type:'module'});
    const source=await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(Error('Real orphan source index timed out')),120000);
      worker.onmessage=({data})=>{
        if(data.type==='DONE'){clearTimeout(timer);resolve(data.result);}
        else if(data.type==='ERROR'){clearTimeout(timer);reject(Error(data.message));}
      };
      worker.onerror=e=>{clearTimeout(timer);reject(Error(e.message));};
      worker.postMessage({
        type:'START',blob,expectedSha256:sha,
        databaseName:sourceDb,generation:uuid,revision:'LFJ_UI_PREVIEW_V1'
      });
    }).finally(()=>worker.terminate());
    if(source.sourceSha256!==sha||source.occurrenceCount<1)
      throw Error('Real unowned source generation did not commit expected HEAD');
    const before=(await indexedDB.databases())
      .filter(d=>d.name===sourceDb||d.name===projectionDb).map(d=>d.name);
    if(before.length!==1)throw Error('Original orphan source DB not persisted');
    const result=await recoverAbandonedIndexedGenerations();
    const after=(await indexedDB.databases())
      .filter(d=>d.name===sourceDb||d.name===projectionDb).map(d=>d.name);
    if(result.recovered!==1||after.length!==0)
      throw Error('Ownerless committed original source not reclaimed');
    return {before,result,after,originalOccurrences:source.occurrenceCount,
      originalSha256:sha,fixture:'REAL_ORIGINAL_SOURCE_ORPHAN_SIMULATED_LEASE_LOSS'};
  });
  assert.equal(cold.before.length,1);
  assert.equal(cold.result.recovered,1);
  assert.equal(cold.after.length,0);

  // New real original File -> source Worker -> projection -> matching;
  // never resume the orphaned HEAD; both original goldens must still match.
  const rebuilt=await page2.evaluate(async()=>{
    const [state,events]=await Promise.all([
      import('/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-state.js'),
      import('/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events.js')
    ]);
    const [j,x]=await Promise.all([
      fetch('/Benchmarks/1885Sjson/Sjson.json',{cache:'no-store'}),
      fetch('/Benchmarks/1885Sjson/FirstpassXML',{cache:'no-store'})
    ]);
    const ui=document.createElement('section');
    ui.innerHTML=`<input data-field="staged-json-file" type="file">
      <select data-field="resolver-source-mode"><option value="legacy">Legacy</option>
      <option value="lfj-indexed-preview">Indexed</option></select>
      <textarea data-field="resolver-json-config">{}</textarea>
      <input type="checkbox" data-field="lfj-indexed-export-consent">
      <button data-action="build-resolver-index">Build</button>
      <button data-action="download-node-wise-trace-csv">Node CSV</button>
      <button data-action="download-evidence-tree-csv">Evidence CSV</button>`;
    document.body.append(ui);
    const ref={current:state.updateWorkflowState(
      state.createXmlCiiAdaptedWorkflowState(),{
        sourceKind:'xml',sourceText:await x.text(),
        supportConfigJson:'{}',resolverJsonTraceConfig:{}
      })};
    events.bindSourceEvents(ui,ref,()=>{});
    events.bindResolverEvents(ui,ref,()=>{});
    events.bindActionEvents(ui,ref,()=>{});
    const mode=ui.querySelector('[data-field="resolver-source-mode"]');
    mode.value='lfj-indexed-preview';
    mode.dispatchEvent(new Event('change',{bubbles:true}));
    const file=new File([await j.arrayBuffer()],'Sjson.json');
    const input=ui.querySelector('[data-field="staged-json-file"]');
    const dt=new DataTransfer();dt.items.add(file);
    input.files=dt.files;
    input.dispatchEvent(new Event('change',{bubbles:true}));
    const captures=[],nativeCreate=URL.createObjectURL,nativeRevoke=URL.revokeObjectURL;
    const nativeClick=HTMLAnchorElement.prototype.click;
    URL.createObjectURL=blob=>{captures.push(blob);return 'blob:captured-cold';};
    URL.revokeObjectURL=()=>{};
    HTMLAnchorElement.prototype.click=function(){};
    try{
      ui.querySelector('[data-action="build-resolver-index"]').click();
      const deadline=performance.now()+260000;
      while(ref.current.resolverJsonTraceRunning&&performance.now()<deadline)
        await new Promise(resolve=>setTimeout(resolve,30));
      const p=ref.current.lfjIndexedPreview;
      if(!p||p.xmlNodes!==216||p.matchedXmlNodes!==164||
         p.nodeWiseRows.length!==216||p.evidenceTreeRows.length!==241)
        throw Error('Cold source restart did not reproduce original XML census: '+
          ref.current.resolverJsonTraceExportStatus);
      const expected=new Map([
        ['0d8bb4482ed4a9d0d116faeac5e68ce564f07b6bba2dd73dfc3676b72ec2eddc',57945],
        ['653485ff968bf478fa0001488432bb210a9ce6e85a901e9cc19f368f53a24809',50399]
      ]);
      if(!expected.has(p.nodeWiseCsvSha256)||!expected.has(p.evidenceTreeCsvSha256))
        throw Error('Cold restart original source hashes changed');
      const opt=ui.querySelector('[data-field="lfj-indexed-export-consent"]');
      opt.checked=true;opt.dispatchEvent(new Event('change',{bubbles:true}));
      for(const action of ['download-node-wise-trace-csv','download-evidence-tree-csv'])
        ui.querySelector('[data-action="'+action+'"]').click();
      const until=performance.now()+30000;
      while(captures.length<2&&performance.now()<until)
        await new Promise(resolve=>setTimeout(resolve,30));
      if(captures.length!==2)throw Error('Rebuilt cold source did not export two CSVs');
      const values=await Promise.all(captures.map(async blob=>{
        const bytes=await blob.arrayBuffer();
        const hash=await crypto.subtle.digest('SHA-256',bytes);
        return {
          bytes:bytes.byteLength,
          sha256:[...new Uint8Array(hash)]
            .map(v=>v.toString(16).padStart(2,'0')).join('')
        };
      }));
      if(new Set(values.map(v=>v.sha256)).size!==2 ||
         values.some(v=>expected.get(v.sha256)!==v.bytes))
        throw Error('Cold restart two CSV byte oracles do not match originals');
      const leftovers=(await indexedDB.databases())
        .filter(d=>d.name?.includes('-r2-'));
      if(leftovers.length)throw Error('Cold Build left versioned temporary DBs');
      return {xmlNodes:p.xmlNodes,matched:p.matchedXmlNodes,
        evidence:p.evidenceTreeRows.length,actualCsvOutputs:values,
        tempDbAfterBuild:leftovers.length};
    }finally{
      URL.createObjectURL=nativeCreate;
      URL.revokeObjectURL=nativeRevoke;
      HTMLAnchorElement.prototype.click=nativeClick;
      ui.remove();
    }
  });
  assert.deepEqual(pageErrors,[]);
  console.log('LFJ_COLD_RESTART_CHROMIUM_PASS '+JSON.stringify({
    schema:'LFJ.A3.ColdRestartChromium.v1',
    liveLockedGenerationProtected:true,
    uncleanTabClosedWithoutCancel:true,
    postCloseDbCount:postClose.before.length,
    postCloseAutomaticOrRecoveryDeleteCount:postClose.result.recovered,
    simulatedLossOfLeaseAfterRealSourceCommit:true,
    orphanSourceDbBeforeRecovery:cold.before.length,
    recoveredOrphanGenerations:cold.result.recovered,
    orphanDbAfterRecovery:cold.after.length,
    rebuilt
  }));
}finally{await context.close();await browser.close();}
