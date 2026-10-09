/** #1104 I2: genuine docs/index.html SINGLE-mode Resolver user journey, not LFJ adoption/release.
 * Start python3 -m http.server 4182 --directory docs, then run this file under Node.
 * Characterizes the actual default Single-mode XML+JSON file paths, source scope, CSV.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
const register=JSON.parse(readFileSync(join(root,'lfj/acceptance/3d-converters/fixture-register.json'),'utf8'));
const js=register.inputs.find(x=>x.id==='1885Sjson-stage1-generated');
assert.ok(js);
const staged=readFileSync(join(root,js.path));
assert.equal(staged.length,js.bytes);
assert.equal(createHash('sha256').update(staged).digest('hex'),js.sha256);
const manifest=JSON.parse(readFileSync(join(root,'Benchmarks/1885Sjson/fixture-manifest.json'),'utf8'));
const xmlFile=join(root,'Benchmarks/1885Sjson/ExpectedCondensedEnrichedXML');
const xml=readFileSync(xmlFile);
assert.equal(createHash('sha256').update(xml).digest('hex'),manifest.artifacts.enrichedXml.sha256);
const base=process.env.LFJ_I0_DOCS_URL||'http://127.0.0.1:4182';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({acceptDownloads:true,viewport:{width:1500,height:900}});
const pageErrors=[];
page.on('pageerror',e=>pageErrors.push(String(e.message||e)));
const mark=async name=>page.evaluate(n=>{performance.mark(n);return performance.now()},name);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const steps=[];
async function step(name,callback){
  try{const value=await callback();steps.push({name,status:'OK'});return value;}
  catch(err){steps.push({name,status:'FAILED',error:String(err.message||err)});throw err;}
}
try{
 await page.addInitScript(()=>{
  const obj={fileTextCalls:[],largeParseCalls:0,largeParseMaxChars:0,lfjWorkerUrls:[],workerUrls:[],indexedDbOpens:[],longTasks:[]};
  Object.defineProperty(window,'__LFJ_I2',{value:obj});
  const text=File.prototype.text;
  File.prototype.text=function(...args){obj.fileTextCalls.push({name:this.name,bytes:this.size});return text.apply(this,args);};
  const parse=JSON.parse;
  JSON.parse=function(s,...rest){if(typeof s==='string'&&s.length>100000){obj.largeParseCalls++;obj.largeParseMaxChars=Math.max(obj.largeParseMaxChars,s.length);}return parse.call(this,s,...rest);};
  const NativeWorker=window.Worker;
  if(NativeWorker){window.Worker=class extends NativeWorker {
    constructor(url,options){super(url,options);const u=String(url);obj.workerUrls.push(u);if(u.includes('/lfj/'))obj.lfjWorkerUrls.push(u);}
  };}
  const idbOpen=indexedDB.open.bind(indexedDB);
  indexedDB.open=function(name,...rest){obj.indexedDbOpens.push(String(name));return idbOpen(name,...rest);};
  try{new PerformanceObserver(list=>{for(const e of list.getEntries())obj.longTasks.push(e.duration);}).observe({entryTypes:['longtask']});}catch{}
 });
 const t0=await step('open_actual_docs_app',async()=>{
  const r=await page.goto(base+'/index.html',{waitUntil:'domcontentloaded',timeout:45000});
  assert.equal(r.status(),200);return mark('R0-document-mounted');
 });
 await step('open_live_xml_cii_standalone_tab',async()=>{
  const nav=page.locator('button[data-tab="xml-cii-2019-standalone"]');
  await nav.waitFor({state:'visible',timeout:45000});
  await nav.click();
  await page.locator('.xml-cii-standalone-root').waitFor({state:'visible',timeout:45000});
  assert.equal(await page.locator('.app-content').getAttribute('data-active-tab'),'xml-cii-2019-standalone');
 });
 const sourceT=await step('real_xml_file_upload',async()=>{
  const input=page.locator('.xml-cii-standalone-root input[data-field="source-file"]').first();
  await input.waitFor({state:'attached'});
  await input.setInputFiles({name:'1885-expected.xml',mimeType:'text/xml',buffer:xml});
  await page.getByText('1885-expected.xml',{exact:false}).first().waitFor({timeout:45000});
  return mark('R1-XML-source-loaded');
 });
 await step('enter_real_resolver_phase',async()=>{
  const btn=page.locator('button[data-phase="json-trace"]');
  await btn.waitFor({state:'visible',timeout:20000});
  assert.equal(await btn.isDisabled(),false,'Real XML mode must allow Resolver phase');
  await btn.click();
  await page.locator('.xml-cii-standalone-root input[data-field="staged-json-file"]').waitFor({state:'attached',timeout:25000});
 });
 const stagedT=await step('real_staged_json_file_upload',async()=>{
  await page.locator('.xml-cii-standalone-root input[data-field="staged-json-file"]').setInputFiles({name:'EnrichedSjson.json',mimeType:'application/json',buffer:staged});
  await page.getByText('✅ Staged JSON: Loaded').first().waitFor({timeout:45000});
  return mark('R2-staged-json-loaded');
 });
 const scope=await step('real_resolver_scope_control',async()=>{
  const choices=await page.locator('select[data-field="resolver-hierarchy-scope"]').evaluate(el=>({value:el.value,options:Array.from(el.options,x=>({value:x.value,text:x.textContent}))}));
  assert.ok(choices.options.length>=1,'Real scope options missing');
  return choices;
 });
 const t3=await step('click_real_resolver_build',async()=>{
  await page.locator('button[data-action="build-resolver-index"]').click();
  await page.getByText(/Resolver index built:/).first().waitFor({timeout:90000});
  return mark('R3-resolver-computed');
 });
 const indexUI=await page.locator('.xml-cii-resolver-metrics').allTextContents();
 await step('real_node_trace_tab',async()=>{
  await page.locator('button[data-json-trace-sub-tab="nodeTrace"]').click();
  await page.locator('.xml-cii-node-wise-table').waitFor({state:'attached',timeout:45000});
 });
 const nodeCsv=await step('real_node_trace_csv',async()=>{
  const button=page.locator('button[data-action="download-node-wise-trace-csv"]');
  assert.equal(await button.isDisabled(),false,'Node-wise CSV export disabled after actual build');
  const dl=page.waitForEvent('download',{timeout:20000});
  await button.click();
  const file=await dl;
  const bytes=readFileSync(await file.path());
  assert.equal(file.suggestedFilename(),'xml-cii-node-wise-trace.csv');
  assert.ok(bytes.length>100,'Real node CSV must have nonempty rows');
  return {name:file.suggestedFilename(),bytes:bytes.length,sha256:sha(bytes),rows:bytes.toString('utf8').split(/\r?\n/).filter(Boolean).length,head:bytes.toString('utf8').slice(0,230)};
 });
 const t4=await mark('R4-downloaded-and-validated');
 const obs=await page.evaluate(()=>window.__LFJ_I2);
 const output={schema:'LFJ.3D.ResolverLiveBrowserLegacyBaseline.v1',classification:'REAL_DEPLOYED_UI_LEGACY_NO_LFJ_ADOPTION',exactContext:'docs/index.html + real app tab + default Single mode + original Resolver build and CSV',inputs:{xml:{path:'Benchmarks/1885Sjson/ExpectedCondensedEnrichedXML',bytes:xml.length,sha256:sha(xml),role:'GENERATED_CANDIDATE_XML'},stagedJson:{path:js.path,bytes:js.bytes,sha256:js.sha256,role:js.role}},scope,metrics:indexUI,csv:nodeCsv,elapsedMs:{XMLUploadToStaged:stagedT-sourceT,stagedUploadToBuilt:t3-stagedT,XMLUploadToValidatedCsv:t4-t0},instrumentation:obs,steps,pageErrors,semantics:'NOT_INDEPENDENT_ENGINEERING_GOLDEN'};
 if(process.env.LFJ_I0_RECEIPT_DIR){mkdirSync(process.env.LFJ_I0_RECEIPT_DIR,{recursive:true});writeFileSync(join(process.env.LFJ_I0_RECEIPT_DIR,'resolver-browser-baseline.json'),JSON.stringify(output,null,2)+'\n');}
 console.log('LFJ_3D_RESOLVER_LIVE_BROWSER '+JSON.stringify(output));
 assert.ok(obs.fileTextCalls.some(x=>x.name==='EnrichedSjson.json'),'Real File.text still used for staged JSON');
 assert.ok(obs.largeParseCalls>0,'Legacy foreground parse must reproduce');
 assert.equal(obs.lfjWorkerUrls.length,0,'No LFJ Worker expected from legacy Resolver; if newly wired, revise acceptance');
 assert.ok(nodeCsv.rows>1);
 if(process.env.LFJ_I0_BROWSER_ACCEPTANCE==='1'){
  assert.equal(obs.largeParseCalls,0,'RED: original staged JSON still parsed on main thread');
  assert.ok(obs.lfjWorkerUrls.length>0,'RED: original Resolver does not admit LFJ Worker');
 }
} catch(err){
 const obs=await page.evaluate(()=>window.__LFJ_I2).catch(()=>null);
 console.error('LFJ_3D_RESOLVER_FAILURE '+JSON.stringify({error:String(err.stack||err),steps,pageErrors,obs}));
 throw err;
}finally{await page.close();await browser.close();}
