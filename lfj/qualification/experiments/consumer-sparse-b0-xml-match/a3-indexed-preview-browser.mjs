/**
 * Native Chromium real Resolver UI event/renderer replay on authentic source.
 * No stand-in Worker, no generated CSV golden and NO indexed download right.
 */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless:true });
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(300000);
  const errors=[];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:4200/lfj/qualification/experiments/consumer-sparse-b0-xml-match/xml-csv-original.html');
  const results = await page.evaluate(async() => {
    const [
      {createXmlCiiAdaptedWorkflowState, updateWorkflowState},
      {bindSourceEvents, bindResolverEvents, bindActionEvents,
        downloadResolverTraceCsvFromUi},
      {renderStandaloneResolverJsonTracePanel}
    ] = await Promise.all([
      import('/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-state.js'),
      import('/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events.js'),
      import('/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-resolver-json-trace.js')
    ]);
    const [j,x]=await Promise.all([
      fetch('/Benchmarks/1885Sjson/Sjson.json',{cache:'no-store'}),
      fetch('/Benchmarks/1885Sjson/FirstpassXML',{cache:'no-store'})
    ]);
    if(!j.ok||!x.ok)throw Error('Original tracked input files unavailable');
    const [original,xmlText]=await Promise.all([j.arrayBuffer(),x.text()]);
    const file=new File([original],'Sjson.json',{type:'application/json'});
    const container=document.createElement('div');
    container.innerHTML=`<input type="file" data-field="staged-json-file" />
      <select data-field="resolver-source-mode">
        <option value="legacy">Legacy</option>
        <option value="lfj-indexed-preview">Indexed</option>
      </select>
      <textarea data-field="resolver-json-config">{}</textarea>
      <button data-action="build-resolver-index">Build</button>
      <button data-action="download-node-wise-trace-csv">Node CSV</button>
      <button data-action="download-evidence-tree-csv">Evidence CSV</button>`;
    document.body.appendChild(container);
    let renders=0;
    const stateRef={current:updateWorkflowState(
      createXmlCiiAdaptedWorkflowState(),{
        sourceKind:'xml',sourceText:xmlText,
        supportConfigJson:'{}',resolverJsonTraceConfig:{}
      })};
    bindSourceEvents(container,stateRef,()=>renders++);
    bindResolverEvents(container,stateRef,()=>renders++);
    bindActionEvents(container,stateRef,()=>renders++);
    const select=container.querySelector('[data-field="resolver-source-mode"]');
    select.value='lfj-indexed-preview';
    select.dispatchEvent(new Event('change',{bubbles:true}));
    const upload=container.querySelector('[data-field="staged-json-file"]');
    const files=new DataTransfer();
    files.items.add(file);
    upload.files=files.files;
    upload.dispatchEvent(new Event('change',{bubbles:true}));
    if(stateRef.current.stagedJsonText!=='')
      throw Error('Foreground original JSON text was unexpectedly staged');
    if(stateRef.current.stagedJsonFile!==file)
      throw Error('Original File identity not retained');
    container.querySelector('[data-action="build-resolver-index"]').click();
    const deadline=performance.now()+280000;
    while(!stateRef.current.lfjIndexedPreview &&
          stateRef.current.resolverJsonTraceRunning &&
          performance.now()<deadline)
      await new Promise(resolve=>setTimeout(resolve,50));
    const preview=stateRef.current.lfjIndexedPreview;
    if(!preview)throw Error('Real indexed Worker Build failed: '+
      stateRef.current.resolverJsonTraceExportStatus);
    if(preview.xmlNodes!==216||preview.matchedXmlNodes!==164||
       preview.nodeWiseRows.length!==216||preview.evidenceTreeRows.length!==241)
      throw Error('Original indexed preview count mismatch: '+
        JSON.stringify({nodes:preview.xmlNodes,matched:preview.matchedXmlNodes,
          evidence:preview.evidenceTreeRows.length}));
    const expected=['0d8bb4482ed4a9d0d116faeac5e68ce564f07b6bba2dd73dfc3676b72ec2eddc',
      '653485ff968bf478fa0001488432bb210a9ce6e85a901e9cc19f368f53a24809'];
    if(preview.nodeWiseCsvSha256!==expected[0]||
       preview.evidenceTreeCsvSha256!==expected[1])
      throw Error('Indexed preview original byte golden mismatch');
    const traceCard=document.createElement('div');
    renderStandaloneResolverJsonTracePanel(traceCard,
      {...stateRef.current,jsonTraceActiveSubTabId:'nodeTrace'},stateRef,()=>{});
    const traceDom=traceCard.querySelectorAll('table tbody tr').length;
    const evidenceCard=document.createElement('div');
    renderStandaloneResolverJsonTracePanel(evidenceCard,
      {...stateRef.current,jsonTraceActiveSubTabId:'tree'},stateRef,()=>{});
    const evidenceDom=evidenceCard.querySelectorAll('table tbody tr').length;
    if(traceDom!==216||evidenceDom!==241)
      throw Error('Real indexed preview UI rendered clipped population '+
        traceDom+'/'+evidenceDom);
    const attempted=['node-wise-trace','evidence-tree'];
    for(const kind of attempted){
      if(downloadResolverTraceCsvFromUi(stateRef,()=>renders++,kind)!==null)
        throw Error('Indexed preview silently authorized download: '+kind);
    }
    const rejected=stateRef.current.resolverJsonTraceAcceptedRevision===null &&
      preview.downloadAuthorized===false;
    if(!rejected)throw Error('Research-only results became export-authorized');
    stateRef.current=updateWorkflowState(stateRef.current,{
      resolverJsonTraceConfig:{changedAfterIndexedBuild:true}
    });
    if(stateRef.current.lfjIndexedPreview!==null)
      throw Error('Source/config supersession left previous indexed preview visible');
    const output={
      schema:'LFJ.A3.IndexedPreviewBrowser.v1',
      actualWorkers:3,originalXmlNodes:216,originalMatchedNodes:164,
      evidenceRows:241,traceDom,evidenceDom,
      csvSha256:expected,attemptedBlockedDownloads:2,
      actualIndexedDownloads:0,retainedOriginalBlob:true,
      foregroundJsonParse:false,configSupersessionRevoked:true,
      renders,qualification:'NATIVE_CHROMIUM_INDEXED_PREVIEW_ONLY_PASS'
    };
    container.remove();
    return output;
  });
  assert.equal(results.qualification,'NATIVE_CHROMIUM_INDEXED_PREVIEW_ONLY_PASS');
  assert.deepEqual(errors,[]);
  console.log('LFJ_INDEXED_PREVIEW_CHROMIUM_PASS '+JSON.stringify(results));
} finally { await browser.close(); }
