/**
 * R17 W01 ONLY: diagnostic RED observation through actual authored docs tab.
 * Uses unchanged checked-in Firstpass original bytes and two explicitly
 * SYNTHETIC one-row master controls; NOT engineering Preview acceptance.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const sha=t=>createHash('sha256').update(t).digest('hex');
const source=await readFile(path.join(root,'Benchmarks/1885Sjson/FirstpassXML'));
const staged=await readFile(path.join(root,'Benchmarks/1885Sjson/Sjson.json'));
assert.equal(sha(source),'feee5a5a6399207337e63bc56c8afb001fe37ab30c6a7a9283333ec60f6eea38');
assert.equal(sha(staged),'6b2c8b01ab0ba6ec8e9e7c42eb4a719668ffd2dc4dbe4790d27cf426a1f60288');
const mime=file=>({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript',
  '.json':'application/json','.css':'text/css','.xml':'text/xml'})[path.extname(file)]||'application/octet-stream';
const server=createServer(async(req,res)=>{
  try{
    const route=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const full=path.resolve(root,'.'+(route==='/'?'/docs/index.html':route));
    if(!full.startsWith(root+path.sep))throw Error('PATH_OUTSIDE');
    res.writeHead(200,{'Content-Type':mime(full),'Cache-Control':'no-store'});
    res.end(await readFile(full));
  }catch(e){res.writeHead(404);res.end(String(e));}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
const folder=process.env.RUNNER_TEMP||await mkdtemp(path.join(tmpdir(),'tab3-r17-w01-'));
await mkdir(folder,{recursive:true});
const receipt={schema:'TAB3.R17.W01.AuthoredSelectionTrace.v1',task:'TAB3-R17-W01',
  assessedSource:'06b3228ee438af691c6bd5cd7c2cd2cfdfbb7094',
  authenticInput:{xml:{sha256:sha(source),bytes:source.length},stagedJson:{sha256:sha(staged),bytes:staged.length}},
  masters:'TWO_SYNTHETIC_ONE_ROW_CONTROL_ONLY_NOT_OWNER_385',
  eventLog:[],pageErrors:[],missingSameOrigin:[],selected:null,preview:null,classification:'INCONCLUSIVE'};
let browser,step='bootstrap';
const log=(name,data={})=>receipt.eventLog.push({name,...data});
try{
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage();
  page.setDefaultTimeout(25000);
  page.on('pageerror',e=>receipt.pageErrors.push(e.message));
  page.on('response',r=>{
    if(r.status()===404&&r.url().startsWith(base))
      receipt.missingSameOrigin.push(new URL(r.url()).pathname);
  });
  await page.addInitScript(()=>{
    window.__R17_WORKERS__=[];
    const Original=window.Worker;
    window.Worker=class extends Original{
      constructor(url,options){super(url,options);window.__R17_WORKERS__.push(String(url));}
    };
  });
  step='actual-docs-tab';
  await page.goto(base+'/docs/',{waitUntil:'domcontentloaded',timeout:60000});
  await page.getByRole('button',{name:'XML→CII 2019 Standalone'}).click();
  log('ACTUAL_STANDALONE_DOCS_MOUNTED');
  step='actual-xml-file-upload';
  await page.locator('input[data-field="source-file"]').setInputFiles({
    name:'Firstpass.xml',mimeType:'application/xml',buffer:source});
  await page.waitForFunction(()=>document.querySelector('[data-phase="json-trace"]')!==null);
  log('ORIGINAL_XML_UPLOADED',{branchCount:5,nodeCount:216});
  step='test-only-master-controls';
  // Only enough to reveal the manual Preview button; NEVER claimed as real masters.
  await page.getByRole('button',{name:/Piping Class/}).last().click();
  await page.locator('input[data-master-file="pipingClass"]').setInputFiles({
    name:'r17-synthetic-piping.csv',mimeType:'text/csv',
    buffer:Buffer.from('PipingClass,Material\\n31441C4,ASTM A106-B\\n')});
  await page.getByRole('button',{name:/Line List/}).last().click();
  await page.locator('input[data-master-file="lineList"]').setInputFiles({
    name:'r17-synthetic-lines.csv',mimeType:'text/csv',
    buffer:Buffer.from('lineKey1,lineKey2\\nP,8810021\\n')});
  log('SYNTHETIC_MASTER_CONTROLS_LOADED_NOT_APPROVED');
  step='actual-indexed-resolver-mode';
  await page.locator('button[data-phase="json-trace"]').click();
  await page.locator('select[data-field="resolver-source-mode"]').selectOption('lfj-indexed-preview');
  log('INDEXED_A3_MODE_SELECTED');
  step='actual-staged-json-upload';
  let stagedField=page.locator('input[data-field="staged-json-file"]');
  if(await stagedField.count()===0){
    await page.locator('button[data-phase="source"]').click();
    stagedField=page.locator('input[data-field="staged-json-file"]');
  }
  await stagedField.setInputFiles({name:'Sjson.json',mimeType:'application/json',buffer:staged});
  await page.locator('button[data-phase="json-trace"]').click();
  log('AUTHENTIC_STAGED_JSON_FILE_UPLOADED');
  step='actual-scan-scopes';
  await page.locator('button[data-action="discover-indexed-scopes"]').click();
  await page.waitForFunction(()=>[...document.querySelectorAll('.xml-cii-resolver-scope-control select option')]
    .some(el=>String(el.textContent||'').includes('/ASIM-1885-CU-PI')),{timeout:30000});
  const select=page.locator('.xml-cii-resolver-scope-control select');
  const opts=await select.locator('option').evaluateAll(nodes=>nodes.map(n=>({value:n.value,label:n.textContent})));
  const target=opts.find(o=>o.label.includes('/ASIM-1885-CU-PI'));
  assert(target&&target.value&&target.value!=='__ALL__','Authenticated non-ALL Owner scope missing');
  step='actual-owner-selection';
  await select.selectOption(target.value);
  const selectedInUI=await page.locator('.xml-cii-resolver-scope-control select').inputValue();
  assert.equal(selectedInUI,target.value);
  receipt.selected={scopeId:selectedInUI,optionLabel:target.label,scanOptionCount:opts.length,
    realA3Picker:true,originalOneSite:true};
  log('ORIGINAL_INDEXED_OWNER_SELECTED',{selectedScopeId:selectedInUI});
  step='actual-selected-resolver-build';
  const build=page.locator('button[data-action="build-resolver-index"]');
  await build.click();
  try{
    await page.waitForFunction(()=>/Indexed Build complete|Build failed|error/i.test(
      document.querySelector('[data-active-phase="json-trace"]')?.textContent||''),null,{timeout:45000});
  }catch(e){log('BUILD_STATUS_TIMEOUT',{message:e.message.slice(0,170)});}
  log('ACTUAL_RESOLVER_BUILD_ATTEMPTED');
  step='actual-phase-four';
  await page.locator('button[data-phase="preview"]').click();
  const previewButton=page.locator('#mc-preview-table-host [data-mc-preview-build]').first();
  await previewButton.waitFor({timeout:35000});
  const before=await page.evaluate(()=>({
    workers:window.__R17_WORKERS__.slice(),
    cacheKeys:Object.keys(localStorage).filter(k=>/xml-cii-pv|preview-cache/i.test(k)),
    previewCode:document.querySelector('#mc-preview-table-host [data-mc-preview-job-state] code')?.textContent||''
  }));
  step='actual-preview-click';
  await previewButton.click();
  try{
    await page.waitForFunction(()=>{
      const h=document.querySelector('#mc-preview-table-host');
      return h?.querySelector('[data-mc-preview-job-state] code')||
        h?.__xmlCiiPreviewResult?.branchRows?.length>0;
    },null,{timeout:30000});
  }catch(e){log('PREVIEW_TERMINAL_TIMEOUT',{message:e.message.slice(0,170)});}
  const after=await page.evaluate(()=>({
    workers:window.__R17_WORKERS__.slice(),
    cacheKeys:Object.keys(localStorage).filter(k=>/xml-cii-pv|preview-cache/i.test(k)),
    previewCode:document.querySelector('#mc-preview-table-host [data-mc-preview-job-state] code')?.textContent||'',
    previewStatus:document.querySelector('#mc-preview-table-host [data-mc-preview-job-state]')?.textContent?.slice(0,700)||'',
    computedRows:document.querySelector('#mc-preview-table-host')?.__xmlCiiPreviewResult?.branchRows?.length||0,
    basisId:document.querySelector('#mc-preview-table-host')?.dataset.mcPreviewBasisId||null
  }));
  receipt.preview={before,after,deltaWorkers:after.workers.slice(before.workers.length),
    scopePassedToSession:'SOURCE_INSPECTION_OPTIONS_OMIT_JSON_TRACE_SCOPE_AT_BASE_SHA'};
  receipt.classification=after.previewCode==='PREVIEW_SELECTED_SCOPE_NOT_INTEGRATED'
    ? 'ACTUAL_SELECTED_UI_REFUSED_NEEDS_V7_PREREAD_ORACLE'
    : after.computedRows>0
      ? 'RED_SELECTED_UI_COMPUTED_UNSCOPED_PREVIEW'
      : 'RED_SCOPE_NOT_FORWARDED_RESULT_UNRESOLVED';
  log('PREVIEW_OBSERVED',{classification:receipt.classification});
  await page.screenshot({path:path.join(folder,'r17-w01-authored-selected-preview.png'),fullPage:true});
  assert.equal(receipt.selected.realA3Picker,true);
  assert.equal(receipt.pageErrors.length,0,'Browser module failed unexpectedly');
  assert.equal(receipt.missingSameOrigin.length,0,'Authored app assets returned 404');
}catch(e){
  receipt.error={step,message:String(e?.stack||e)};
  receipt.classification='INCONCLUSIVE_AUTHORED_FLOW_BLOCKED';
  process.exitCode=1;
}finally{
  await writeFile(path.join(folder,'r17-w01-authored-selector-receipt.json'),
    JSON.stringify(receipt,null,2)+'\n');
  console.log('TAB3_R17_W01_AUTHORED_RECEIPT '+JSON.stringify(receipt));
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
