/** Real Chromium native-worker Cancel, input supersession, and IDB cleanup. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage();
  page.setDefaultTimeout(300000);
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  await page.goto('http://127.0.0.1:4200/lfj/qualification/experiments/consumer-sparse-b0-xml-match/xml-csv-original.html');
  const outcome=await page.evaluate(async()=>{
    const [state,actions]=await Promise.all([
      import('/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-state.js'),
      import('/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events.js')
    ]);
    const [j,x]=await Promise.all([
      fetch('/Benchmarks/1885Sjson/Sjson.json',{cache:'no-store'}),
      fetch('/Benchmarks/1885Sjson/FirstpassXML',{cache:'no-store'})
    ]);
    if(!j.ok||!x.ok)throw Error('Authentic source/Firstpass XML unavailable');
    const file=new File([await j.arrayBuffer()],'Sjson.json');
    const xmlText=await x.text();
    const ui=document.createElement('section');
    ui.innerHTML=`<input type="file" data-field="staged-json-file">
      <select data-field="resolver-source-mode"><option value="legacy">Legacy</option>
       <option value="lfj-indexed-preview">Indexed</option></select>
      <textarea data-field="resolver-json-config">{}</textarea>
      <button data-action="build-resolver-index">Build</button>
      <button data-action="cancel-indexed-build">Cancel</button>`;
    document.body.appendChild(ui);
    const ref={current:state.updateWorkflowState(
      state.createXmlCiiAdaptedWorkflowState(),{
        sourceKind:'xml',sourceText:xmlText,supportConfigJson:'{}',
        resolverJsonTraceConfig:{}
      })};
    let renders=0;
    actions.bindSourceEvents(ui,ref,()=>renders++);
    actions.bindResolverEvents(ui,ref,()=>renders++);
    actions.bindActionEvents(ui,ref,()=>renders++);
    const mode=ui.querySelector('[data-field="resolver-source-mode"]');
    mode.value='lfj-indexed-preview';
    mode.dispatchEvent(new Event('change',{bubbles:true}));
    const upload=ui.querySelector('[data-field="staged-json-file"]');
    const dt=new DataTransfer();dt.items.add(file);
    upload.files=dt.files;
    upload.dispatchEvent(new Event('change',{bubbles:true}));
    if(ref.current.stagedJsonText!=='')throw Error('Main-thread original JSON was read');
    const RealWorker=window.Worker;
    let held=null,terminated=0,created=0;
    const wait=async(predicate,label,ms=20000)=>{
      const until=performance.now()+ms;
      while(performance.now()<until){
        if(await predicate())return;
        await new Promise(r=>setTimeout(r,20));
      }
      if(!await predicate())throw Error('Timed out: '+label);
    };
    const idleDb=async()=>{
      const existing=await indexedDB.databases();
      return existing.filter(d=>d.name?.startsWith('lfj-ui-preview-'));
    };
    window.Worker=class extends RealWorker{
      constructor(...args){super(...args);created++;}
      postMessage(data,...rest){
        if(data?.type==='START'&&!held){
          held={worker:this,data};
          return;
        }
        return super.postMessage(data,...rest);
      }
      terminate(){terminated++;super.terminate();}
    };
    try{
      ui.querySelector('[data-action="build-resolver-index"]').click();
      await wait(()=>held!==null,'indexed native Worker START intercepted');
      if(!ref.current.resolverJsonTraceRunning)
        throw Error('Build is not running before Cancel');
      ui.querySelector('[data-action="cancel-indexed-build"]').click();
      await wait(()=>ref.current.resolverJsonTraceRunning===false,
        'user Cancel cleared active UI');
      if(terminated<1||ref.current.lfjIndexedExportReceipt!==null||
         ref.current.lfjIndexedExportOptIn!==false||
         ref.current.lfjIndexedPreview!==null)
        throw Error('Cancel failed to kill active Worker or revoke downloads');
      await wait(async()=> (await idleDb()).length===0,'cancelled DB cleanup');
      const cancelledDb=await idleDb();
      if(cancelledDb.length)throw Error('Cancellation leaked original source DB');
    }finally{window.Worker=RealWorker;}
    // After cancellation the SAME actual original Blob must still Build cleanly.
    ui.querySelector('[data-action="build-resolver-index"]').click();
    await wait(()=>!ref.current.resolverJsonTraceRunning,
      'replacement real indexed Build',270000);
    const preview=ref.current.lfjIndexedPreview;
    if(!preview||preview.xmlNodes!==216||preview.matchedXmlNodes!==164||
       preview.nodeWiseRows.length!==216||preview.evidenceTreeRows.length!==241)
      throw Error('Replacement native Worker failed after cancellation: '+
        ref.current.resolverJsonTraceExportStatus);
    if(preview.nodeWiseCsvSha256!==
         '0d8bb4482ed4a9d0d116faeac5e68ce564f07b6bba2dd73dfc3676b72ec2eddc'||
       preview.evidenceTreeCsvSha256!==
         '653485ff968bf478fa0001488432bb210a9ce6e85a901e9cc19f368f53a24809')
      throw Error('Native replacement source-to-CSV SHA mismatch');
    const leftovers=await idleDb();
    if(leftovers.length)throw Error('Indexed temp DBs still persisted: '+
      JSON.stringify(leftovers.map(x=>x.name)));
    // Post-Build source change must revoke local export and never resurrect it.
    actions.replaceState(ref,state.updateWorkflowState(ref.current,{
      sourceText:'<Root><Node>changed</Node></Root>'
    }),()=>renders++);
    if(ref.current.lfjIndexedExportReceipt!==null||
       ref.current.lfjIndexedExportOptIn!==false||
       ref.current.lfjIndexedPreview!==null)
      throw Error('Source supersession failed to revoke session');
    ui.remove();
    return {
      schema:'LFJ.A3.CancelCleanupBrowser.v1',
      interceptedNativeStart:true,terminatedNativeWorkers:terminated,
      cancelledDbCount:cancelledDb.length,
      restoredOriginalBlobBuild:true,xmlNodes:216,matched:164,
      cleanupAfterSuccess:0,sourceRevoked:true,
      renders,qualification:'NATIVE_CHROMIUM_INDEXED_CANCEL_CLEANUP_PASS'
    };
  });
  assert.equal(outcome.qualification,'NATIVE_CHROMIUM_INDEXED_CANCEL_CLEANUP_PASS');
  assert.deepEqual(pageErrors,[]);
  console.log('LFJ_INDEXED_CANCEL_CLEANUP_PASS '+JSON.stringify(outcome));
}finally{await browser.close();}
