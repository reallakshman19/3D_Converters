/** Native Chromium, real source-indexed UI Build and both byte-exact local CSV downloads. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({acceptDownloads:false});
  page.setDefaultTimeout(300000);
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4200/lfj/qualification/experiments/consumer-sparse-b0-xml-match/xml-csv-original.html');
  const results=await page.evaluate(async()=>{
    const [
      {createXmlCiiAdaptedWorkflowState,updateWorkflowState},
      {bindSourceEvents,bindResolverEvents,bindActionEvents},
      {renderStandaloneResolverJsonTracePanel}
    ]=await Promise.all([
      import('/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-state.js'),
      import('/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events.js'),
      import('/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-resolver-json-trace.js')
    ]);
    const [j,x]=await Promise.all([
      fetch('/Benchmarks/1885Sjson/Sjson.json',{cache:'no-store'}),
      fetch('/Benchmarks/1885Sjson/FirstpassXML',{cache:'no-store'})
    ]);
    if(!j.ok||!x.ok)throw Error('Original tracked inputs unavailable');
    const [jsonBytes,xmlText]=await Promise.all([j.arrayBuffer(),x.text()]);
    const originalFile=new File([jsonBytes],'Sjson.json',{type:'application/json'});
    // A main-thread File.arrayBuffer of the original would be a regression.
    // Worker realms have their own Blob/File prototypes, so the dedicated
    // SHA Worker can still read and hash original source bytes there.
    const originalFileArrayBuffer=File.prototype.arrayBuffer;
    const originalWorker=window.Worker;
    let foregroundSourceReads=0,shaWorkerJobs=0;
    const shaWorkerCensus=[];
    File.prototype.arrayBuffer=function(...args){
      if(this.name==='Sjson.json'){
        foregroundSourceReads++;
        throw Error('Full original JSON Blob read on UI thread');
      }
      return originalFileArrayBuffer.apply(this,args);
    };
    window.Worker=class extends originalWorker {
      constructor(...args){
        super(...args);
        if(String(args[0]).includes('lfj-sha.worker.mjs'))
          this.addEventListener('message',event=>{
            if(event.data?.type==='DONE') shaWorkerCensus.push(event.data);
          });
      }
      postMessage(data,...args){
        if(data?.type==='HASH') shaWorkerJobs++;
        return super.postMessage(data,...args);
      }
    };
    const c=document.createElement('section');
    c.innerHTML=`<input type="file" data-field="staged-json-file">
      <select data-field="resolver-source-mode">
        <option value="legacy">Legacy</option>
        <option value="lfj-indexed-preview">Indexed</option>
      </select>
      <textarea data-field="resolver-json-config">{}</textarea>
      <input type="checkbox" data-field="lfj-indexed-export-consent">
      <button data-action="build-resolver-index">Build</button>
      <button data-action="download-node-wise-trace-csv">Download nodes</button>
      <button data-action="download-evidence-tree-csv">Download evidence</button>`;
    document.body.appendChild(c);
    let renderCount=0;
    const ref={current:updateWorkflowState(createXmlCiiAdaptedWorkflowState(),{
      sourceKind:'xml',sourceText:xmlText,supportConfigJson:'{}',
      resolverJsonTraceConfig:{}
    })};
    bindSourceEvents(c,ref,()=>renderCount++);
    bindResolverEvents(c,ref,()=>renderCount++);
    bindActionEvents(c,ref,()=>renderCount++);
    const captures=[];
    const oldURL=URL.createObjectURL,oldRevoke=URL.revokeObjectURL;
    const oldClick=HTMLAnchorElement.prototype.click;
    URL.createObjectURL=blob=>{captures.push(blob);return 'blob:lfj-verified';};
    URL.revokeObjectURL=()=>{};
    HTMLAnchorElement.prototype.click=function(){};
    const wait=async(condition,label)=>{
      const until=performance.now()+240000;
      while(!condition()&&performance.now()<until)
        await new Promise(r=>setTimeout(r,20));
      if(!condition())throw Error('Timeout: '+label);
    };
    try{
      const mode=c.querySelector('[data-field="resolver-source-mode"]');
      mode.value='lfj-indexed-preview';mode.dispatchEvent(new Event('change',{bubbles:true}));
      const upload=c.querySelector('[data-field="staged-json-file"]');
      const dt=new DataTransfer();dt.items.add(originalFile);
      upload.files=dt.files;upload.dispatchEvent(new Event('change',{bubbles:true}));
      if(ref.current.stagedJsonText!=='')throw Error('Original JSON leaked to foreground string');
      c.querySelector('[data-action="build-resolver-index"]').click();
      await wait(()=>!ref.current.resolverJsonTraceRunning,'original indexed Build');
      const preview=ref.current.lfjIndexedPreview;
      if(!preview||preview.xmlNodes!==216||preview.matchedXmlNodes!==164||
         preview.nodeWiseRows.length!==216||preview.evidenceTreeRows.length!==241)
        throw Error('Incorrect original indexed source/trace census '+
          ref.current.resolverJsonTraceExportStatus);
      const originalHashes=[
        '0d8bb4482ed4a9d0d116faeac5e68ce564f07b6bba2dd73dfc3676b72ec2eddc',
        '653485ff968bf478fa0001488432bb210a9ce6e85a901e9cc19f368f53a24809'
      ];
      if(preview.nodeWiseCsvSha256!==originalHashes[0]||
         preview.evidenceTreeCsvSha256!==originalHashes[1])
        throw Error('Original CSV hashes drifted in indexed Build');
      for(const action of ['download-node-wise-trace-csv','download-evidence-tree-csv'])
        c.querySelector('[data-action="'+action+'"]').click();
      await new Promise(r=>setTimeout(r,30));
      if(captures.length!==0)
        throw Error('Unconsented indexed CSV was downloadable');
      const consent=c.querySelector('[data-field="lfj-indexed-export-consent"]');
      consent.checked=true;consent.dispatchEvent(new Event('change',{bubbles:true}));
      if(ref.current.lfjIndexedExportOptIn!==true||
         ref.current.lfjIndexedExportReceipt?.schema!=='LFJ.A3.IndexedCsvReceipt.v1')
        throw Error('Local product receipt and explicit consent not accepted');
      const traceCard=document.createElement('div');
      renderStandaloneResolverJsonTracePanel(traceCard,
        {...ref.current,jsonTraceActiveSubTabId:'nodeTrace'},ref,()=>{});
      const evidenceCard=document.createElement('div');
      renderStandaloneResolverJsonTracePanel(evidenceCard,
        {...ref.current,jsonTraceActiveSubTabId:'tree'},ref,()=>{});
      const traceDom=traceCard.querySelectorAll('table tbody tr').length;
      const evidenceDom=evidenceCard.querySelectorAll('table tbody tr').length;
      if(traceDom!==216||evidenceDom!==241)
        throw Error('Actual product view lost full original population');
      for(const action of ['download-node-wise-trace-csv','download-evidence-tree-csv'])
        c.querySelector('[data-action="'+action+'"]').click();
      await wait(()=>captures.length===2,'original two verified CSVs');
      const buffers=await Promise.all(captures.map(b=>b.arrayBuffer()));
      const sizes=buffers.map(b=>b.byteLength);
      const sha=async buffer=>Array.from(new Uint8Array(
        await crypto.subtle.digest('SHA-256',buffer)))
        .map(x=>x.toString(16).padStart(2,'0')).join('');
      const got=await Promise.all(buffers.map(sha));
      // The two concurrent clicks may finish SHA hashing in either order.
      // Identify each actual download by its independently protected bytes,
      // never by which asynchronous Worker resolves first.
      const goldenBytesBySha=new Map([
        [originalHashes[0],57945],[originalHashes[1],50399]
      ]);
      if(got.length!==2||new Set(got).size!==2||
         got.some((digest,i)=>goldenBytesBySha.get(digest)!==sizes[i]))
        throw Error('Actual downloaded CSV byte digest mismatch '+JSON.stringify({sizes,got}));
      for(const buf of buffers)
        if(Array.from(new Uint8Array(buf).slice(0,3)).join(',')!=='239,187,191')
          throw Error('Downloaded BOM bytes missing');
      // A user edit not yet dispatched as a change must still block CSVs.
      const tx=c.querySelector('[data-field="resolver-json-config"]');
      tx.value='{malformed unsaved';
      c.querySelector('[data-action="download-node-wise-trace-csv"]').click();
      await new Promise(r=>setTimeout(r,50));
      if(captures.length!==2)throw Error('Malformed unsaved config exported CSV');
      tx.value='{}';
      // A mutated preview row must no longer reproduce the admitted SHA.
      ref.current.lfjIndexedPreview.nodeWiseRows[0].xmlNode='TAMPERED';
      c.querySelector('[data-action="download-node-wise-trace-csv"]').click();
      await new Promise(r=>setTimeout(r,80));
      if(captures.length!==2)throw Error('Tampered original row exported CSV');
      ref.current=updateWorkflowState(ref.current,{
        sourceText:'<Root>changed original</Root>'
      });
      if(ref.current.lfjIndexedExportReceipt!==null||
         ref.current.lfjIndexedExportOptIn!==false)
        throw Error('Original source change failed to revoke export lease');
      for(const action of ['download-node-wise-trace-csv','download-evidence-tree-csv'])
        c.querySelector('[data-action="'+action+'"]').click();
      await new Promise(r=>setTimeout(r,40));
      if(captures.length!==2)
        throw Error('Stale original exported after source mutation');
      if(foregroundSourceReads!==0 || shaWorkerJobs<4)
        throw Error('Original source hashing was not confined to native Workers: '+
          JSON.stringify({foregroundSourceReads,shaWorkerJobs}));
      if(shaWorkerCensus.length!==shaWorkerJobs || shaWorkerCensus.some(s=>
        s.sizeBytes!==originalFile.size ||
        s.bytesHashed!==originalFile.size ||
        s.chunkLimitBytes!==1024*1024 ||
        s.chunkReads!==Math.ceil(originalFile.size/(1024*1024)) ||
        s.maxReadBytes!==Math.min(originalFile.size,1024*1024)))
        throw Error('Real original source SHA Worker did not attest bounded full-source census');
      // T06 research-only selected product preview and local CSV verifier
      // against the REAL original Firstpass Worker pipeline. Firstpass roots
      // all share this directly evidenced OWNER_SITE; this proves receipt
      // plumbing, not an independent multi-zone Owner positive golden.
      const [
        {buildIndexedResolverPreview},
        {createIndexedExportReceipt,verifyIndexedProductCsv}
      ]=await Promise.all([
        import('/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-lfj-indexed-preview.js'),
        import('/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-lfj-indexed-export.js')
      ]);
      const selectedScopeId='/ASIM-1885-CU-PI';
      const selected=await buildIndexedResolverPreview({
        blob:originalFile,xmlText,config:{},selectedScopeId
      });
      if(selected.selectedScopeId!==selectedScopeId ||
         !/^[a-f0-9]{64}$/.test(selected.selectionDigestSha256) ||
         selected.sourceOnly!==true||selected.downloadAuthorized!==false ||
         selected.xmlNodes!==216 ||
         selected.nodeWiseCsvSha256!==originalHashes[0] ||
         selected.evidenceTreeCsvSha256!==originalHashes[1])
        throw Error('Real native selected Worker handoff not admitted');
      const scopedReceipt=createIndexedExportReceipt({
        preview:selected,sourceFile:originalFile,revision:17,config:{},
        selectedScopeId
      });
      for(const kind of ['node-wise-trace','evidence-tree']){
        const authorized=await verifyIndexedProductCsv({
          receipt:scopedReceipt,preview:selected,kind,sourceFile:originalFile,
          xmlText,config:{},revision:17,optIn:true,isCurrent:()=>true,
          selectedScopeId
        });
        if(authorized.downstreamEngineeringAuthorized!==false ||
           authorized.content.charCodeAt(0)!==0xFEFF)
          throw Error('Native selected scope has escaped local CSV rights');
      }
      let wrongScopeAccepted=false;
      try{
        await verifyIndexedProductCsv({
          receipt:scopedReceipt,preview:selected,kind:'node-wise-trace',
          sourceFile:originalFile,xmlText,config:{},revision:17,optIn:true,
          isCurrent:()=>true,selectedScopeId:'A3-FORGED-ZONE'
        });
        wrongScopeAccepted=true;
      }catch(error){
        if(!/^LFJ_EXPORT_/.test(error.code||''))throw error;
      }
      if(wrongScopeAccepted)
        throw Error('Selected source receipt accepted a forged zone');
      return {schema:'LFJ.A3.LocalCsvExportBrowser.v1',nativeIndexedWorkers:3,
        originalXmlNodes:216,originalMatched:164,
        traceDom,evidenceDom,originalCsvSha256:got,originalCsvBytes:sizes,
        unconsentedExports:0,consentedExports:2,
        rejectedTamperedOrStaleExports:4,
        offThreadSourceShaJobs:shaWorkerJobs,foregroundSourceReads,
        boundedShaChunkBytes:1024*1024,shaWorkerCensusCount:shaWorkerCensus.length,
        downstreamEngineeringAuthorized:false,renderCount,
        qualification:'NATIVE_CHROMIUM_SOURCE_FENCED_TWO_CSV_PASS'};
    }finally{
      URL.createObjectURL=oldURL;URL.revokeObjectURL=oldRevoke;
      HTMLAnchorElement.prototype.click=oldClick;
      File.prototype.arrayBuffer=originalFileArrayBuffer;
      window.Worker=originalWorker;
      c.remove();
    }
  });
  assert.equal(results.qualification,'NATIVE_CHROMIUM_SOURCE_FENCED_TWO_CSV_PASS');
  assert.deepEqual(errors,[]);
  console.log('LFJ_TWO_CSV_CHROMIUM_PASS '+JSON.stringify(results));
}finally{await browser.close();}
