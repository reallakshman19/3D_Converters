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
      // T06b: user-facing exact direct Owner site entry, not an invented
      // discovered scope choice. Actual UI Build/consent/two click pipeline
      // still requires full source-verified Worker matching and receipts.
      const [
        {ensureResolverHierarchyScope,renderResolverHierarchyScopeControl},
        {createIndexedExportReceipt,verifyIndexedProductCsv}
      ]=await Promise.all([
        import('/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-resolver-scope.js'),
        import('/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-lfj-indexed-export.js')
      ]);
      ref.current=updateWorkflowState(ref.current,{sourceText:xmlText});
      renderResolverHierarchyScopeControl(c,ref,()=>renderCount++,
        ensureResolverHierarchyScope(ref.current,ref));
      const zone=c.querySelector('[data-field="resolver-indexed-original-scope"]');
      if(!zone)throw Error('Original indexed UI never offered exact owner zone');
      const selectedScopeId='/ASIM-1885-CU-PI';
      zone.value=selectedScopeId;
      zone.dispatchEvent(new Event('change',{bubbles:true}));
      if(ref.current.jsonTraceScopeId!==selectedScopeId||
         ref.current.lfjIndexedManualScopeFile!==originalFile||
         ref.current.lfjIndexedExportReceipt!==null)
        throw Error('Typed owner zone did not revoke old receipt or bind original File');
      c.querySelector('[data-action="build-resolver-index"]').click();
      await wait(()=>!ref.current.resolverJsonTraceRunning,'selected original indexed UI Build');
      const selected=ref.current.lfjIndexedPreview;
      if(!selected)throw Error('Selected live indexed Build denied: '+
        ref.current.resolverJsonTraceExportStatus);
      if(ref.current.lfjIndexedExportReceipt?.selectedScopeId!==selectedScopeId ||
         ref.current.lfjIndexedExportReceipt?.selectionDigestSha256!==
           selected.selectionDigestSha256)
        throw Error('Live original selected Build lost scope-bound receipt');
      for(const action of ['download-node-wise-trace-csv','download-evidence-tree-csv'])
        c.querySelector('[data-action="'+action+'"]').click();
      await new Promise(r=>setTimeout(r,50));
      if(captures.length!==2)throw Error('Unconsented selected original export');
      consent.checked=true;consent.dispatchEvent(new Event('change',{bubbles:true}));
      for(const action of ['download-node-wise-trace-csv','download-evidence-tree-csv'])
        c.querySelector('[data-action="'+action+'"]').click();
      await wait(()=>captures.length===4,'selected original two verified CSVs');
      const selectedHashes=await Promise.all(captures.slice(2).map(async b=>
        sha(await b.arrayBuffer())));
      if(selectedHashes.length!==2 ||
         new Set(selectedHashes).size!==2 ||
         selectedHashes.some(x=>!originalHashes.includes(x)))
        throw Error('Selected live CSV bytes do not match original shipping serializations');
      const staleBefore=captures.length;
      zone.value='MISSING-OWNER-ZONE';
      zone.dispatchEvent(new Event('change',{bubbles:true}));
      if(ref.current.lfjIndexedExportReceipt!==null ||
         ref.current.lfjIndexedExportOptIn!==false)
        throw Error('Changing original owner zone retained old export right');
      for(const action of ['download-node-wise-trace-csv','download-evidence-tree-csv'])
        c.querySelector('[data-action="'+action+'"]').click();
      await new Promise(r=>setTimeout(r,60));
      if(captures.length!==staleBefore)
        throw Error('Old selected scope exported after manual zone change');
      // A visually typed value is not a trustworthy source catalogue. Only
      // the original Blob/committed native catalogue may authorize a scope.
      c.querySelector('[data-action="build-resolver-index"]').click();
      await wait(()=>!ref.current.resolverJsonTraceRunning,
        'negative unknown original owner zone Build');
      if(ref.current.lfjIndexedPreview!==null ||
         ref.current.lfjIndexedExportReceipt!==null ||
         !/scope|selected|unknown|absent|root/i.test(
           ref.current.resolverJsonTraceExportStatus||''))
        throw Error('Unknown original Owner zone bypassed native source rejection');
      for(const action of ['download-node-wise-trace-csv','download-evidence-tree-csv'])
        c.querySelector('[data-action="'+action+'"]').click();
      await new Promise(r=>setTimeout(r,45));
      if(captures.length!==staleBefore)
        throw Error('Rejected unknown-zone Build exported a CSV');
      // T06c: discover real owner labels from the original File via *native*
      // SHA + persisted packed source catalogue + bounded direct root reads.
      // This is the actual button and dropdown, not an invented label fixture.
      const discover=c.querySelector('[data-action="discover-indexed-original-scopes"]');
      if(!discover)throw Error('Real original File has no on-demand zone discovery control');
      discover.click();
      await wait(()=>!!ref.current.lfjIndexedOriginalScopeChoices ||
        /failed:/i.test(ref.current.lfjIndexedScopeDiscoveryStatus||''),
        'source-verified original owner catalogue');
      const observed=ref.current.lfjIndexedOriginalScopeChoices;
      if(!observed)throw Error('Original zone discovery denied: '+
        ref.current.lfjIndexedScopeDiscoveryStatus);
      if(observed.sourceFile!==originalFile ||
         observed.originalBytes!==originalFile.size ||
         observed.originalRootCount!==13 ||
         observed.choices.length!==1 ||
         observed.choices[0].id!==selectedScopeId ||
         observed.choices[0].rootCount!==13 ||
         observed.downloadAuthorized!==false)
        throw Error('Native original Owner-zone choices are not source-attested');
      const discoveredUi=document.createElement('div');
      c.appendChild(discoveredUi);
      renderResolverHierarchyScopeControl(discoveredUi,ref,()=>renderCount++,
        ensureResolverHierarchyScope(ref.current,ref));
      const dropdown=discoveredUi.querySelector(
        '[data-field="resolver-hierarchy-scope"]');
      if(!dropdown || !Array.from(dropdown.options).some(option=>
           option.value===selectedScopeId&&option.textContent.includes('13')))
        throw Error('Actual original File dropdown omitted directly proven zone/count');
      dropdown.value=selectedScopeId;
      dropdown.dispatchEvent(new Event('change',{bubbles:true}));
      if(ref.current.jsonTraceScopeId!==selectedScopeId ||
         ref.current.lfjIndexedManualScopeFile!==originalFile)
        throw Error('Discovered original zone did not bind same File/build revision');
      c.querySelector('[data-action="build-resolver-index"]').click();
      await wait(()=>!ref.current.resolverJsonTraceRunning,
        'discovered original owner zone indexed UI Build');
      if(!ref.current.lfjIndexedPreview||
         ref.current.lfjIndexedExportReceipt?.selectedScopeId!==selectedScopeId||
         ref.current.lfjIndexedPreview.nodeWiseCsvSha256!==originalHashes[0]||
         ref.current.lfjIndexedPreview.evidenceTreeCsvSha256!==originalHashes[1])
        throw Error('Source discovered zone native selected Worker Build not attested');
      consent.checked=true;consent.dispatchEvent(new Event('change',{bubbles:true}));
      for(const action of ['download-node-wise-trace-csv','download-evidence-tree-csv'])
        c.querySelector('[data-action="'+action+'"]').click();
      await wait(()=>captures.length===6,'discovered original zone two CSV downloads');
      const discoveredHashes=await Promise.all(captures.slice(4).map(async b=>
        sha(await b.arrayBuffer())));
      if(new Set(discoveredHashes).size!==2 ||
         discoveredHashes.some(x=>!originalHashes.includes(x)))
        throw Error('Discovered original zone exported non-original CSV bytes');
      discoveredUi.remove();
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
        unconsentedExports:0,consentedExports:6,
        nativeDiscoveredOwnerZones:1,nativeDiscoveredOriginalRoots:13,
        discoveredUiBuild:true,
        manualSelectedScopeId:selectedScopeId,selectedUiBuild:true,
        missingOwnerZoneBuildRejected:true,
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
