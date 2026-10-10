/** A3 first product safety slice: real event handlers, real original inputs,
 * native Chromium HTML origin. Not H09 product wiring or independent approval. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({acceptDownloads:false});
  page.setDefaultTimeout(90000);
  page.on('pageerror',error=>console.error('A3_BROWSER_PAGEERROR',error.message));
  await page.goto('http://127.0.0.1:4200/lfj/qualification/experiments/consumer-sparse-b0-xml-match/xml-csv-original.html');
  const result=await page.evaluate(async()=>{
    const [{createXmlCiiAdaptedWorkflowState,updateWorkflowState},
      {bindSourceEvents,bindActionEvents},
      {buildXmlNodeWiseTraceRows}] = await Promise.all([
        import('/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-state.js'),
        import('/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events.js'),
        import('/tabs/xml-cii-2019-standalone/xml-cii-trace-export.js')
      ]);
    const [jsonResponse,xmlResponse]=await Promise.all([
      fetch('/Benchmarks/1885Sjson/Sjson.json',{cache:'no-store'}),
      fetch('/Benchmarks/1885Sjson/FirstpassXML',{cache:'no-store'})
    ]);
    if(!jsonResponse.ok||!xmlResponse.ok)throw Error('original fixture unavailable');
    const [originalJson,xmlText]=await Promise.all([
      jsonResponse.text(),xmlResponse.text()]);
    const container=document.createElement('section');
    container.innerHTML=`
      <textarea data-field="source-text"></textarea>
      <button data-action="build-resolver-index">Build</button>
      <button data-action="download-node-wise-trace-csv">Node CSV</button>
      <button data-action="download-evidence-tree-csv">Evidence CSV</button>`;
    document.body.appendChild(container);
    let renderCount=0;
    const stateRef={current:updateWorkflowState(
      createXmlCiiAdaptedWorkflowState(),{
        sourceKind:'xml',sourceText:xmlText,stagedJsonText:originalJson,
        resolverJsonTraceConfig:{} // Match the independently pinned baseline's exact config.
      })};
    bindSourceEvents(container,stateRef,()=>renderCount++);
    bindActionEvents(container,stateRef,()=>renderCount++);
    const captures=[];
    const originalCreate=URL.createObjectURL;
    const originalRevoke=URL.revokeObjectURL;
    const originalClick=HTMLAnchorElement.prototype.click;
    URL.createObjectURL=blob=>{captures.push(blob);return 'blob:a3-guard-test';};
    URL.revokeObjectURL=()=>{};
    HTMLAnchorElement.prototype.click=function(){};
    try{
      container.querySelector('[data-action="build-resolver-index"]').click();
      // The handler awaits both input functions before calling the actual
      // unchanged Resolver. Wait on its real state result, not a fake count.
      const deadline=performance.now()+60000;
      while(!stateRef.current.resolverJsonTraceResult&&
            performance.now()<deadline)
        await new Promise(resolve=>setTimeout(resolve,25));
      const trace=stateRef.current.resolverJsonTraceResult;
      if(!trace)throw Error('actual original-source Build did not produce trace');
      const rows=buildXmlNodeWiseTraceRows(trace);
      const matched=trace.traceResolutionLedger.records.filter(
        row=>String(row.status).startsWith('RESOLVED_')).length;
      if(rows.length!==216||matched!==164)
        throw Error('actual legacy positive census drift '+rows.length+'/'+matched);
      for(const action of ['download-node-wise-trace-csv',
        'download-evidence-tree-csv'])
        container.querySelector('[data-action="'+action+'"]').click();
      if(captures.length!==2)throw Error('two baseline CSV exports missing');
      const texts=await Promise.all(captures.map(blob=>blob.text()));
      const digest=async text=>Array.from(new Uint8Array(
        await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))))
        .map(x=>x.toString(16).padStart(2,'0')).join('');
      const hashes=await Promise.all(texts.map(digest));
      const bytes=texts.map(x=>new TextEncoder().encode(x).length);
      const expected=[
        ['0d8bb4482ed4a9d0d116faeac5e68ce564f07b6bba2dd73dfc3676b72ec2eddc',57945],
        ['653485ff968bf478fa0001488432bb210a9ce6e85a901e9cc19f368f53a24809',50399]
      ];
      for(let i=0;i<2;i++)
        if(hashes[i]!==expected[i][0]||bytes[i]!==expected[i][1])
          throw Error('original standalone CSV bytes drifted '+i+' '+hashes[i]+' '+bytes[i]);
      const source=container.querySelector('[data-field="source-text"]');
      source.value='<Root><Node>changed-original</Node></Root>';
      source.dispatchEvent(new Event('change',{bubbles:true}));
      if(stateRef.current.resolverJsonTraceResult!==null||
         stateRef.current.resolverJsonTraceJsonResult!==null||
         stateRef.current.resolverJsonTraceAcceptedRevision!==null)
        throw Error('old source trace survived new source selection');
      for(const action of ['download-node-wise-trace-csv',
        'download-evidence-tree-csv'])
        container.querySelector('[data-action="'+action+'"]').click();
      if(captures.length!==2)
        throw Error('old trace CSV downloaded after source revision');
      if(!stateRef.current.resolverJsonTraceExportStatus.includes('blocked'))
        throw Error('missing visible stale-download error');
      return {schema:'LFJ.A3.StaleExportBrowser.v1',originalXmlNodes:rows.length,
        originalMatchedNodes:matched,csvSha256:hashes,csvBytes:bytes,
        attemptedStaleDownloads:2,actualStaleDownloads:0,
        renderCount,qualification:'NATIVE_CHROMIUM_PRODUCT_EVENT_STALE_VETO_PASS'};
    }finally{
      URL.createObjectURL=originalCreate;
      URL.revokeObjectURL=originalRevoke;
      HTMLAnchorElement.prototype.click=originalClick;
      container.remove();
    }
  });
  assert.equal(result.qualification,'NATIVE_CHROMIUM_PRODUCT_EVENT_STALE_VETO_PASS');
  console.log('A3_STALE_EXPORT_NATIVE_PASS '+JSON.stringify(result));
}finally{
  await browser.close();
}
