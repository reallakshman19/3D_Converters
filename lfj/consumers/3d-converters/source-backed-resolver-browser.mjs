/**
 * Exact-head original Firstpass, real standalone Build and download buttons:
 * native START -> PROJECT -> MATCH, actual DOM rows, exact received Blob
 * bytes (including BOM), stale/racing export veto. Not deployed Pages/Opera.
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({acceptDownloads:false});
  page.setDefaultTimeout(120000);
  page.on('pageerror',error=>console.error('A3_WORKER_PRODUCT_PAGEERROR',error.message));
  await page.goto('http://127.0.0.1:4200/lfj/qualification/experiments/consumer-sparse-b0-xml-match/xml-csv-original.html');
  const out=await page.evaluate(async()=>{
    const [{createXmlCiiAdaptedWorkflowState,updateWorkflowState},
      {bindActionEvents,bindSourceEvents},
      {renderStandaloneResolverJsonTracePanel}]=await Promise.all([
      import('/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-state.js'),
      import('/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events.js'),
      import('/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-resolver-json-trace.js')
    ]);
    const [j,x]=await Promise.all([
      fetch('/Benchmarks/1885Sjson/Sjson.json',{cache:'no-store'}),
      fetch('/Benchmarks/1885Sjson/FirstpassXML',{cache:'no-store'})
    ]);
    if(!j.ok||!x.ok)throw Error('original checked-in Firstpass pair missing');
    const json=await j.text(),xml=await x.text();
    const controls=document.createElement('section');
    controls.innerHTML=`<textarea data-field="source-text"></textarea>
      <button data-action="build-resolver-lfj">Build with LFJ native Workers</button>
      <button data-action="download-node-wise-trace-csv">Node CSV external</button>
      <button data-action="download-evidence-tree-csv">Evidence CSV external</button>`;
    const panel=document.createElement('section');
    document.body.append(controls,panel);
    const ref={current:updateWorkflowState(createXmlCiiAdaptedWorkflowState(),{
      sourceKind:'xml',sourceText:xml,stagedJsonText:json,
      resolverJsonTraceConfig:{},supportConfigJson:'{}'
    })};
    let renders=0;
    const render=()=>{
      renders++;
      panel.replaceChildren();
      renderStandaloneResolverJsonTracePanel(panel,ref.current,ref,render);
      // Bind actual dynamically rendered Node/Evidence CSV action buttons.
      bindActionEvents(panel,ref,render);
    };
    bindActionEvents(controls,ref,render);
    bindSourceEvents(controls,ref,render);
    const originalCreate=URL.createObjectURL;
    const originalClick=HTMLAnchorElement.prototype.click;
    const originalRevoke=URL.revokeObjectURL;
    const captures=[];let downloads=0;
    URL.createObjectURL=blob=>{captures.push(blob);return 'blob:a3-captured-verified-csv';};
    URL.revokeObjectURL=()=>{};
    HTMLAnchorElement.prototype.click=function(){downloads++;};
    const wait=async test=>{
      const deadline=performance.now()+120000;
      while(!test()&&performance.now()<deadline)
        await new Promise(resolve=>setTimeout(resolve,20));
      if(!test())throw Error('timed out waiting on actual Build/download status');
    };
    const digest=async buffer=>[...new Uint8Array(
      await crypto.subtle.digest('SHA-256',buffer)
    )].map(b=>b.toString(16).padStart(2,'0')).join('');
    try{
      controls.querySelector('[data-action="build-resolver-lfj"]').click();
      await wait(()=>!ref.current.resolverJsonTraceRunning);
      const a3Databases=(await indexedDB.databases()).filter(row=>
        row.name?.startsWith('lfj-a3-'));
      if(a3Databases.length)
        throw Error('product Build retained ephemeral IndexedDB stores: '+
          a3Databases.map(row=>row.name).join(', '));
      const view=ref.current.resolverResearchView,grant=ref.current.resolverProductCsvGrant;
      if(!view||!grant)throw Error('LFJ Build did not admit original CSVs: '+
        ref.current.resolverJsonTraceExportStatus);
      if(view.downloadAuthorized!==false||view.engineeringReady!==false)
        throw Error('research rights improperly self-promoted');
      if(grant.schema!=='LFJ.A3.ProductCsvGrant.v1'||grant.view!==view)
        throw Error('product owned grant missing');
      if(view.xmlNodes!==216||view.matchedXmlNodes!==164)
        throw Error('original Firstpass XML semantics drift');
      if(view.originalBytes!==733806)throw Error('original JSON byte count drift');
      if(view.nodeWiseRows.length!==216||view.evidenceTreeRows.length!==241)
        throw Error('original trace/evidence census drift');

      const originalExpect=[
        ['0d8bb4482ed4a9d0d116faeac5e68ce564f07b6bba2dd73dfc3676b72ec2eddc',57945],
        ['653485ff968bf478fa0001488432bb210a9ce6e85a901e9cc19f368f53a24809',50399]
      ];
      const clickPanel=async (tab,action,expectedDownloads)=>{
        ref.current=updateWorkflowState(ref.current,{jsonTraceActiveSubTabId:tab});
        render();
        const btn=panel.querySelector('[data-action="'+action+'"]');
        if(!btn||btn.disabled)
          throw Error('source-backed verified CSV action unavailable: '+action);
        btn.click();
        await wait(()=>captures.length===expectedDownloads && downloads===expectedDownloads);
      };
      await clickPanel('nodeTrace','download-node-wise-trace-csv',1);
      const nodeCount=panel.querySelectorAll('.xml-cii-node-wise-table tbody tr').length;
      if(nodeCount!==216)throw Error('real node table rows '+nodeCount);
      await clickPanel('tree','download-evidence-tree-csv',2);
      const evidenceCount=panel.querySelectorAll('.xml-cii-evidence-source-table tbody tr').length;
      if(evidenceCount!==241)throw Error('real evidence rows '+evidenceCount);
      const buffers=await Promise.all(captures.map(blob=>blob.arrayBuffer()));
      const hash=await Promise.all(buffers.map(digest));
      for(let i=0;i<2;i++){
        const bytes=buffers[i].byteLength;
        const bom=[...new Uint8Array(buffers[i]).slice(0,3)].join(',');
        if(bom!=='239,187,191'||bytes!==originalExpect[i][1]||
           hash[i]!==originalExpect[i][0])
          throw Error('downloaded actual Blob differs from original golden '+i+
            ': '+bytes+' '+hash[i]+' '+bom);
      }
      // Click and synchronously revoke the source before async SHA resolution
      // of the third attempted download. A stale click cannot emit any Blob.
      panel.querySelector('[data-action="download-evidence-tree-csv"]').click();
      controls.querySelector('[data-field="source-text"]').value='<Root>changed</Root>';
      controls.querySelector('[data-field="source-text"]').dispatchEvent(
        new Event('change',{bubbles:true}));
      if(ref.current.resolverResearchView!==null ||
         ref.current.resolverProductCsvGrant!==null ||
         ref.current.resolverJsonTraceAcceptedRevision!==null)
        throw Error('old product Worker CSV grant survived source edit');
      await new Promise(resolve=>setTimeout(resolve,150));
      for(const action of ['download-node-wise-trace-csv','download-evidence-tree-csv'])
        controls.querySelector('[data-action="'+action+'"]').click();
      await new Promise(resolve=>setTimeout(resolve,100));
      if(captures.length!==2||downloads!==2)
        throw Error('revoked source emitted additional stale CSV Blob');
      return {qualification:'A3_NATIVE_WORKER_PRODUCT_DOWNLOAD_PASS',
        xmlNodes:view.xmlNodes,matchedXmlNodes:view.matchedXmlNodes,
        nodeRows:nodeCount,evidenceRows:evidenceCount,
        downloadedSha256:hash,downloadedBytes:buffers.map(x=>x.byteLength),
        workers:view.nativeWorkerStages,renderCount:renders,
        validCsvDownloads:downloads,staleAttempts:3,staleDownloads:0,
        ephemeralIndexedDbAfterBuild:0,
        researchDownloadAuthorized:view.downloadAuthorized};
    }finally{
      URL.createObjectURL=originalCreate;
      URL.revokeObjectURL=originalRevoke;
      HTMLAnchorElement.prototype.click=originalClick;
      controls.remove();panel.remove();
    }
  });
  assert.equal(out.qualification,'A3_NATIVE_WORKER_PRODUCT_DOWNLOAD_PASS');
  console.log('A3_NATIVE_WORKER_PRODUCT_DOWNLOAD_PASS '+JSON.stringify(out));
}finally{await browser.close();}
