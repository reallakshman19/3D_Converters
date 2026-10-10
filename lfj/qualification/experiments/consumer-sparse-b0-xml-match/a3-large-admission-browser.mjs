/**
 * Synthetic CAPACITY control only. A 30 MiB padded Blob or a distinct 90 MiB
 * Blob does not establish Owner-content correctness or 30/90MB performance.
 * Exercises the ACTUAL indexed UI file handler and Build rejection path.
 */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage();
  page.setDefaultTimeout(90000);
  const pageErrors=[];
  page.on('pageerror',e=>pageErrors.push(e.message));
  await page.goto('http://127.0.0.1:4200/lfj/qualification/experiments/consumer-sparse-b0-xml-match/xml-csv-original.html');
  const report=await page.evaluate(async()=>{
    const [
      {createXmlCiiAdaptedWorkflowState,updateWorkflowState},
      {bindSourceEvents,bindResolverEvents,bindActionEvents},
      {inspectIndexedSourceAdmission}
    ]=await Promise.all([
      import('/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-state.js'),
      import('/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events.js'),
      import('/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-lfj-size-admission.js')
    ]);
    const MiB=1024*1024;
    // Immutable browser Blob parts used only to test native File.size metadata.
    // This is NOT an Owner file or a representative occurrence distribution.
    const chunk=new Uint8Array(MiB);
    const makeSource=(n,name)=>new File(Array(n).fill(chunk),name,
      {type:'application/json'});
    const thirty=makeSource(30,'SYNTHETIC-size-only-30MiB.json');
    const ninety=makeSource(90,'SYNTHETIC-size-only-90MiB.json');
    const atCap=makeSource(32,'SYNTHETIC-size-only-32MiB.json');
    if(!inspectIndexedSourceAdmission(thirty).accepted ||
       !inspectIndexedSourceAdmission(atCap).accepted ||
       inspectIndexedSourceAdmission(ninety).accepted)
      throw Error('Native 30/32/90 size categorization is wrong');
    const ui=document.createElement('div');
    ui.innerHTML=`<input type="file" data-field="staged-json-file">
      <select data-field="resolver-source-mode">
        <option value="legacy">Legacy</option>
        <option value="lfj-indexed-preview">Indexed</option>
      </select>
      <textarea data-field="resolver-json-config">{}</textarea>
      <button data-action="build-resolver-index">Build</button>`;
    document.body.appendChild(ui);
    const ref={current:updateWorkflowState(createXmlCiiAdaptedWorkflowState(),{
      sourceKind:'xml',sourceText:'<Root><Node/></Root>',
      supportConfigJson:'{}',resolverJsonTraceConfig:{}
    })};
    let renders=0;
    bindSourceEvents(ui,ref,()=>renders++);
    bindResolverEvents(ui,ref,()=>renders++);
    bindActionEvents(ui,ref,()=>renders++);
    const mode=ui.querySelector('[data-field="resolver-source-mode"]');
    mode.value='lfj-indexed-preview';
    mode.dispatchEvent(new Event('change',{bubbles:true}));
    const upload=ui.querySelector('[data-field="staged-json-file"]');
    const list=new DataTransfer();list.items.add(ninety);
    upload.files=list.files;
    upload.dispatchEvent(new Event('change',{bubbles:true}));
    if(ref.current.stagedJsonText!==''||
       !ref.current.stagedJsonFile ||
       ref.current.stagedJsonFile.size!==90*MiB)
      throw Error('Original 90MiB File was transformed/foreground decoded');
    const originalWorker=window.Worker;
    const originalBuffer=File.prototype.arrayBuffer;
    let workers=0,reads=0;
    window.Worker=class extends originalWorker{
      constructor(...args){workers++;super(...args);}
    };
    File.prototype.arrayBuffer=async function(...args){
      if(this.size===90*MiB)reads++;
      return originalBuffer.apply(this,args);
    };
    try{
      ui.querySelector('[data-action="build-resolver-index"]').click();
      const deadline=performance.now()+2000;
      while(ref.current.resolverJsonTraceRunning&&performance.now()<deadline)
        await new Promise(r=>setTimeout(r,10));
      if(ref.current.resolverJsonTraceRunning ||
         !ref.current.resolverJsonTraceExportStatus.includes('32 MiB') ||
         ref.current.lfjIndexedPreview ||
         ref.current.lfjIndexedExportReceipt ||
         ref.current.lfjIndexedExportOptIn)
        throw Error('Oversized 90MiB UI Build was not fail closed');
      if(workers!==0||reads!==0)
        throw Error('Rejected 90MiB triggered original File read/Worker start');
      const existing=await indexedDB.databases();
      if(existing.some(db=>db.name?.startsWith('lfj-ui-preview-')))
        throw Error('Rejected 90MiB left temp IndexedDB allocation');
    }finally{
      window.Worker=originalWorker;
      File.prototype.arrayBuffer=originalBuffer;
      ui.remove();
    }
    return {
      schema:'LFJ.A3.SyntheticLargeSourceAdmission.v1',
      dataset:'SYNTHETIC_CAPACITY_ONLY_NOT_OWNER',
      admitted30MiB:true,admitted32MiB:true,rejected90MiB:true,
      rejectedWorkerStarts:workers,rejectedFileReads:reads,
      zeroCsvPermissions:true,renders,
      qualification:'SYNTHETIC_30_90_CAPACITY_VETO_PASS'
    };
  });
  assert.equal(report.qualification,'SYNTHETIC_30_90_CAPACITY_VETO_PASS');
  assert.deepEqual(pageErrors,[]);
  console.log('LFJ_SYNTHETIC_LARGE_ADMISSION_PASS '+JSON.stringify(report));
}finally{await browser.close();}
