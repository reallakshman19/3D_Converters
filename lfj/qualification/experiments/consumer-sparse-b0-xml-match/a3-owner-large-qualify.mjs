#!/usr/bin/env node
/**
 * Run ONLY on separately supplied authentic Owner files: no built-in goldens,
 * fixture synthesis or silent sample substitution. Requires Playwright.
 *
 * node a3-owner-large-qualify.mjs --manifest /safe/owner-large.json \
 *   --expected-head <raw-git-sha> --out /safe/owner-large-receipt.json
 *
 * 30MB case: real Worker Build, exact Owner two-CSV expected hashes and cleanup.
 * 90MB case: current 32MiB fail-closed admission; NOT 90MB support.
 */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {validateOwnerLargeManifest} from './a3-owner-large-manifest.mjs';

const hex=x=>typeof x==='string'&&/^[a-f\d]{40}$/.test(x);
const args=new Map();
for(let i=2;i<process.argv.length;i+=2){
  if(!process.argv[i]?.startsWith('--')||!process.argv[i+1])
    throw Error('Use --manifest PATH --expected-head SHA --out PATH');
  args.set(process.argv[i],process.argv[i+1]);
}
const manifestPath=args.get('--manifest');
const outPath=args.get('--out');
const expectedHead=args.get('--expected-head');
if(!manifestPath||!outPath||!hex(expectedHead))
  throw Error('--manifest, --out and 40-character --expected-head required');
const repoRoot=path.resolve('.');
const actualHead=execFileSync('git',['rev-parse','HEAD'],{
  cwd:repoRoot,encoding:'utf8'}).trim();
if(actualHead!==expectedHead)
  throw Error('Source mismatch: current checkout '+actualHead+' is not '+expectedHead);
const shaFile=async file=>{
  const hash=createHash('sha256');
  for await(const chunk of fs.createReadStream(file,{highWaterMark:1024*1024}))
    hash.update(chunk);
  return hash.digest('hex');
};
const readAndAttest=async w=>{
  for(const [file,want] of [
    [w.sourcePath,w.sourceSha256],[w.xmlPath,w.xmlSha256]
  ]){
    const stat=await fsp.stat(file);
    if(!stat.isFile())throw Error('Not a regular Owner file: '+file);
    if(file===w.sourcePath && stat.size!==w.sourceBytes)
      throw Error('Owner source byte count mismatch for '+w.id);
    const found=await shaFile(file);
    if(found!==want)throw Error('Owner source/XML SHA-256 mismatch for '+w.id);
  }
  return await fsp.readFile(w.xmlPath,'utf8');
};
const mime=file=>file.endsWith('.mjs')||file.endsWith('.js')?
  'text/javascript;charset=utf-8':file.endsWith('.html')?
  'text/html;charset=utf-8':file.endsWith('.json')?
  'application/json;charset=utf-8':'application/octet-stream';
const startServer=()=>new Promise((resolve,reject)=>{
  const server=http.createServer(async(req,res)=>{
    let pathname;
    try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}
    catch{res.writeHead(400).end();return;}
    const source=path.resolve(repoRoot,'.'+pathname);
    if(!source.startsWith(repoRoot+path.sep)){
      res.writeHead(403).end();return;
    }
    try{
      const stat=await fsp.stat(source);
      if(!stat.isFile())throw Error('not a file');
      res.writeHead(200,{'content-type':mime(source)});
      fs.createReadStream(source).pipe(res);
    }catch{res.writeHead(404).end();}
  });
  server.once('error',reject);
  server.listen(0,'127.0.0.1',()=>resolve({
    server,origin:'http://127.0.0.1:'+server.address().port
  }));
});
const receipt={
  schema:'LFJ.A3.OwnerLargeQualificationReceipt.v1',
  status:'NOT_STARTED',startedAt:new Date().toISOString(),
  exactHead:actualHead,manifestSha256:await shaFile(manifestPath),
  authoringContext:'OWNER_FILES_EXTERNAL_TO_GIT',
  provenanceVerifiedIndependently:false,
  sourceQualifiesForEngineering:false,workloads:[]
};
try{
  const manifest=validateOwnerLargeManifest(JSON.parse(
    await fsp.readFile(manifestPath,'utf8')));
  receipt.ownerEvidenceReference=manifest.ownerEvidenceReference;
  const {chromium}=await import('playwright');
  const {server,origin}=await startServer();
  let browser;
  try{
    browser=await chromium.launch({headless:true});
    for(const w of manifest.workloads){
      const started=performance.now();
      const row={
        id:w.id,expectedOutcome:w.expectedOutcome,sourceBytes:w.sourceBytes,
        expectedSourceSha256:w.sourceSha256,
        sourceEvidenceReference:w.sourceEvidenceReference,
        status:'FAILED'
      };
      receipt.workloads.push(row);
      const xmlText=await readAndAttest(w);
      row.fixtureShaValidated=true;
      const page=await browser.newPage();
      try{
        page.setDefaultTimeout(300000);
        await page.goto(origin+'/lfj/qualification/experiments/consumer-sparse-b0-xml-match/xml-csv-original.html');
        await page.evaluate(async text=>{
          const [state,actions]=await Promise.all([
            import('/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-state.js'),
            import('/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events.js')
          ]);
          const ui=document.createElement('div');
          ui.innerHTML=`<input type="file" data-field="staged-json-file">
            <select data-field="resolver-source-mode">
              <option value="legacy">Legacy</option>
              <option value="lfj-indexed-preview">Indexed</option>
            </select>
            <textarea data-field="resolver-json-config">{}</textarea>
            <input type="checkbox" data-field="lfj-indexed-export-consent">
            <button data-action="build-resolver-index">Build</button>
            <button data-action="download-node-wise-trace-csv">Node CSV</button>
            <button data-action="download-evidence-tree-csv">Evidence CSV</button>`;
          document.body.appendChild(ui);
          const ref={current:state.updateWorkflowState(
            state.createXmlCiiAdaptedWorkflowState(),{
              sourceKind:'xml',sourceText:text,supportConfigJson:'{}',
              resolverJsonTraceConfig:{}
            })};
          actions.bindSourceEvents(ui,ref,()=>{});
          actions.bindResolverEvents(ui,ref,()=>{});
          actions.bindActionEvents(ui,ref,()=>{});
          const mode=ui.querySelector('[data-field="resolver-source-mode"]');
          mode.value='lfj-indexed-preview';
          mode.dispatchEvent(new Event('change',{bubbles:true}));
          window.__ownerA3={ui,ref,workerCreates:0,originalWorker:window.Worker,
            blobs:[]};
          window.Worker=class extends window.__ownerA3.originalWorker{
            constructor(...args){super(...args);window.__ownerA3.workerCreates++;}
          };
          const originalObjectURL=URL.createObjectURL;
          const originalRevoke=URL.revokeObjectURL;
          const originalClick=HTMLAnchorElement.prototype.click;
          window.__ownerA3.restore=()=>{
            window.Worker=window.__ownerA3.originalWorker;
            URL.createObjectURL=originalObjectURL;
            URL.revokeObjectURL=originalRevoke;
            HTMLAnchorElement.prototype.click=originalClick;
          };
          URL.createObjectURL=blob=>{
            window.__ownerA3.blobs.push(blob);
            return 'blob:owner-a3-captured';
          };
          URL.revokeObjectURL=()=>{};
          HTMLAnchorElement.prototype.click=function(){};
        },xmlText);
        await page.setInputFiles('[data-field="staged-json-file"]',w.sourcePath);
        await page.click('[data-action="build-resolver-index"]');
        await page.waitForFunction(()=>window.__ownerA3 &&
          !window.__ownerA3.ref.current.resolverJsonTraceRunning,{
            timeout:w.expectedOutcome==='INDEXED_TWO_CSV'?300000:20000
        });
        const result=await page.evaluate(async expected=>{
          const {ui,ref,workerCreates,blobs}=window.__ownerA3;
          const output={workerCreates,
            buildStatus:ref.current.resolverJsonTraceExportStatus,
            inputBytes:ref.current.stagedJsonFile?.size,
            accepted:Boolean(ref.current.lfjIndexedPreview),
            tempDbCount:(await indexedDB.databases()).filter(d=>
              d.name?.startsWith('lfj-ui-preview-')).length
          };
          if(expected.expectedOutcome==='REJECT_CURRENT_32MIB_LIMIT'){
            if(output.accepted||workerCreates!==0||
              ref.current.lfjIndexedExportReceipt||
              !output.buildStatus.includes('32 MiB')||
              output.tempDbCount!==0)
              throw Error('90MB over-capacity admission did not fail closed');
            output.result='EXPECTED_CAPACITY_REJECTION';
          }else{
            const preview=ref.current.lfjIndexedPreview;
            if(!preview||preview.xmlNodes!==expected.expectedXmlNodes||
              preview.matchedXmlNodes!==expected.expectedMatchedNodes||
              preview.nodeWiseCsvSha256!==expected.expectedNodeWiseCsvSha256||
              preview.evidenceTreeCsvSha256!==expected.expectedEvidenceTreeCsvSha256)
              throw Error('Owner XML / two-CSV goldens differ from declared expected values');
            if(ref.current.lfjIndexedExportReceipt?.schema!==
              'LFJ.A3.IndexedCsvReceipt.v1'||output.tempDbCount!==0)
              throw Error('Owner 30MB source was not safely admitted or cleaned');
            const consent=ui.querySelector('[data-field="lfj-indexed-export-consent"]');
            consent.checked=true;consent.dispatchEvent(new Event('change',{bubbles:true}));
            const actions=['download-node-wise-trace-csv','download-evidence-tree-csv'];
            for(const id of actions)ui.querySelector('[data-action="'+id+'"]').click();
            const until=performance.now()+30000;
            while(blobs.length<2&&performance.now()<until)
              await new Promise(r=>setTimeout(r,20));
            if(blobs.length!==2)throw Error('Owner 30MB two verified downloads not created');
            const digests=await Promise.all(blobs.map(async blob=>
              [...new Uint8Array(await crypto.subtle.digest('SHA-256',
                await blob.arrayBuffer()))].map(b=>b.toString(16).padStart(2,'0')).join('')));
            if(digests[0]!==expected.expectedNodeWiseCsvSha256||
              digests[1]!==expected.expectedEvidenceTreeCsvSha256)
              throw Error('Owner 30MB actual CSV Blob hashes differ');
            output.result='ORIGINAL_SOURCE_TWO_CSV_MATCH';
            output.xmlNodes=preview.xmlNodes;
            output.matched=preview.matchedXmlNodes;
            output.downloadedCsvHashes=digests;
            output.downloadedBytes=blobs.map(b=>b.size);
          }
          window.__ownerA3.restore();return output;
        },w);
        Object.assign(row,result,{status:'PASSED',
          wallClockMs:Math.round(performance.now()-started)});
      }finally{
        await page.close();
      }
    }
    receipt.status='ALL_DECLARED_TESTS_PASSED_OWNER_PROVENANCE_STILL_EXTERNAL';
  }finally{
    await browser?.close();
    await new Promise(resolve=>server.close(resolve));
  }
}catch(error){
  receipt.status='FAILED';
  receipt.error={message:String(error?.message||error),code:error?.code||null};
}finally{
  receipt.completedAt=new Date().toISOString();
  const destination=path.resolve(outPath);
  await fsp.mkdir(path.dirname(destination),{recursive:true});
  await fsp.writeFile(destination,JSON.stringify(receipt,null,2)+'\n');
  console.log(JSON.stringify({status:receipt.status,out:destination,
    workloads:receipt.workloads.map(w=>({id:w.id,status:w.status}))}));
}
if(receipt.status==='FAILED')process.exitCode=1;
