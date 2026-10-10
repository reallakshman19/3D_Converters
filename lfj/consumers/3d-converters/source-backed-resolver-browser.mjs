/**
 * A3 live, HTTP-served Chromium: actual product Build action wired through
 * native source catalog -> projection -> XML match Workers -> visible UI rows.
 * Verifies exact original Firstpass source and CSV hashes, but product exports
 * intentionally remain vetoed until separate full consumer acceptance.
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({acceptDownloads:false});
  page.setDefaultTimeout(90000);
  page.on('pageerror',error=>console.error('A3_WORKER_PREVIEW_PAGEERROR',error.message));
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
      <button data-action="download-node-wise-trace-csv">Node CSV</button>
      <button data-action="download-evidence-tree-csv">Evidence CSV</button>`;
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
    };
    bindActionEvents(controls,ref,render);
    bindSourceEvents(controls,ref,render);
    const originalCreate=URL.createObjectURL;
    const originalClick=HTMLAnchorElement.prototype.click;
    const originalRevoke=URL.revokeObjectURL;
    let attempts=0,downloads=0;
    URL.createObjectURL=blob=>{attempts++;return 'blob:a3-should-stay-denied';};
    URL.revokeObjectURL=()=>{};
    HTMLAnchorElement.prototype.click=function(){downloads++;};
    try{
      controls.querySelector('[data-action="build-resolver-lfj"]').click();
      const deadline=performance.now()+120000;
      while(ref.current.resolverJsonTraceRunning &&
        performance.now()<deadline)
        await new Promise(resolve=>setTimeout(resolve,50));
      const view=ref.current.resolverResearchView;
      if(!view)throw Error('LFJ native Build blocked: '+
        ref.current.resolverJsonTraceExportStatus);
      if(view.xmlNodes!==216||view.matchedXmlNodes!==164)
        throw Error('original Firstpass semantics mismatch');
      if(view.originalBytes!==733806)
        throw Error('original JSON bytes mismatch');
      if(view.nodeWiseRows.length!==216||view.evidenceTreeRows.length!==241)
        throw Error('full original source row populations mismatch');
      const hash=async source=>[...new Uint8Array(
        await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source))
      )].map(b=>b.toString(16).padStart(2,'0')).join('');
      const expected=[
        ['0d8bb4482ed4a9d0d116faeac5e68ce564f07b6bba2dd73dfc3676b72ec2eddc',57945],
        ['653485ff968bf478fa0001488432bb210a9ce6e85a901e9cc19f368f53a24809',50399]
      ];
      for(const [i,csv] of [view.nodeWiseCsv,view.evidenceTreeCsv].entries()){
        if(await hash(csv)!==expected[i][0]||
           new TextEncoder().encode(csv).length!==expected[i][1])
          throw Error('source-backed original CSV '+i+' mismatch');
      }
      ref.current=updateWorkflowState(ref.current,{jsonTraceActiveSubTabId:'nodeTrace'});
      render();
      const nodeCount=panel.querySelectorAll('.xml-cii-node-wise-table tbody tr').length;
      if(nodeCount!==216)throw Error('actual UI node rows '+nodeCount+' != 216');
      const csv=panel.querySelector('[data-action="download-node-wise-trace-csv"]');
      if(!csv?.disabled)throw Error('pending Worker CSV button is not disabled');
      ref.current=updateWorkflowState(ref.current,{jsonTraceActiveSubTabId:'tree'});
      render();
      const evidenceCount=panel.querySelectorAll('.xml-cii-evidence-source-table tbody tr').length;
      if(evidenceCount!==241)throw Error('actual UI evidence rows '+evidenceCount+' != 241');
      if(!panel.querySelector('[data-action="download-evidence-tree-csv"]')?.disabled)
        throw Error('pending Worker evidence CSV button not disabled');
      for(const action of ['download-node-wise-trace-csv','download-evidence-tree-csv'])
        controls.querySelector('[data-action="'+action+'"]').click();
      if(attempts||downloads)throw Error('research preview wrongly authorized CSV export');
      controls.querySelector('[data-field="source-text"]').value='<Root>changed</Root>';
      controls.querySelector('[data-field="source-text"]').dispatchEvent(
        new Event('change',{bubbles:true}));
      if(ref.current.resolverResearchView!==null)
        throw Error('stale source-backed Worker result retained after XML edit');
      if(ref.current.resolverJsonTraceAcceptedRevision!==null)
        throw Error('native Worker falsely accepted export revision');
      for(const action of ['download-node-wise-trace-csv','download-evidence-tree-csv'])
        controls.querySelector('[data-action="'+action+'"]').click();
      if(attempts||downloads)throw Error('stale source-backed Worker triggered browser download');
      return {xmlNodes:view.xmlNodes,matchedXmlNodes:view.matchedXmlNodes,
        nodeRows:nodeCount,evidenceRows:evidenceCount,
        sha256:expected.map(a=>a[0]),bytes:expected.map(a=>a[1]),
        workers:view.nativeWorkerStages,renderCount:renders,
        blockedBeforeRevision:2,blockedAfterRevision:2,
        actualDownloads:downloads,
        qualification:'A3_NATIVE_WORKER_PREVIEW_PASS'};
    }finally{
      URL.createObjectURL=originalCreate;
      URL.revokeObjectURL=originalRevoke;
      HTMLAnchorElement.prototype.click=originalClick;
      controls.remove();panel.remove();
    }
  });
  assert.equal(out.qualification,'A3_NATIVE_WORKER_PREVIEW_PASS');
  console.log('A3_NATIVE_WORKER_PREVIEW_PASS '+JSON.stringify(out));
}finally{await browser.close();}
