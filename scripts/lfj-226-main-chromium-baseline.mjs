// #226 exact-main authored standalone O1 capacity baseline (test-only).
// All production source is inherited unchanged from main@4f14beb.
import {readFile,writeFile,mkdir,open,stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {chromium} from 'playwright';

const ROOT='http://127.0.0.1:4173';
const OUTPUT='ValidationRecords/lfj-226-main-browser-baseline.json';
const FIRST='Benchmarks/1885Sjson/Sjson.json';
const NC='Benchmarks/1885_NC/1885_NC.json';
const source=await readFile(FIRST,'utf8');
const fragment=source.trim().slice(1,-1);
const results={schema:'LFJ226.MainAuthoredBrowserBaseline.v1',sourceBase:'4f14beb37bc0b719453c52a116c1c5d7183d2fd0',
  testedHead:process.env.GITHUB_SHA||'LOCAL',cases:[],measurement:'real standalone UI; per-stage RAF gap, CDP JS heap and Chrome process RSS sample; not exact process peak'};

async function persist(){
  await mkdir('ValidationRecords',{recursive:true});
  await writeFile(OUTPUT,JSON.stringify(results,null,2)+'\n');
}
async function generated(targetMiB){
  const target=targetMiB*1024*1024;
  const p='/tmp/lfj226-shaped-'+targetMiB+'mib.json';
  const file=await open(p,'w');
  const hash=createHash('sha256');
  const write=async text=>{await file.write(text);hash.update(text);};
  let bytes=0,copies=0;
  try{
    await write('[');bytes++;
    const add=Buffer.byteLength(fragment);
    while(bytes+add+1<target){
      if(copies){await write(',');bytes++;}
      await write(fragment);bytes+=add;copies++;
    }
    await write(']');bytes++;
  }finally{await file.close();}
  return {file:p,bytes,sha256:hash.digest('hex'),copies,generated:true};
}
async function original(file){
  const b=await readFile(file);
  return {file,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex'),generated:false};
}
function chromeRss(){
  try{
    const lines=execFileSync('ps',['-eo','rss=,comm='],{encoding:'utf8',timeout:1500}).trim().split('\n');
    return lines.reduce((sum,line)=>{
      const match=line.trim().match(/^(\d+)\s+(\S+)/);
      return sum+(match && /^(chrome|chromium|headless_shell|chrome-headless)/.test(match[2])?Number(match[1]):0);
    },0);
  }catch{return null;}
}
async function memorySample(session,page,stats){
  try{
    const a=await session.send('Performance.getMetrics');
    const heap=a.metrics.find(x=>x.name==='JSHeapUsedSize')?.value??0;
    stats.maxRendererJsHeapBytes=Math.max(stats.maxRendererJsHeapBytes,heap);
  }catch{}
  const rss=chromeRss();
  if(rss!==null)stats.maxChromiumAggregateRssKiB=Math.max(stats.maxChromiumAggregateRssKiB,rss);
  try{
    const heap=await page.evaluate(()=>performance.memory?.usedJSHeapSize||0);
    stats.maxObservedPageHeapBytes=Math.max(stats.maxObservedPageHeapBytes,heap);
  }catch{}
}
async function stage(page,session,stats,label,action,verify){
  const out={name:label,ok:false};
  const started=performance.now();
  try{await page.evaluate(()=>window.__lfj226Frame.start());}catch(e){out.startError=String(e);}
  try{
    await action();
    if(verify)await verify();
    out.ok=true;
  }catch(e){out.error=String(e).slice(0,400);}
  out.wallMs=Math.round(performance.now()-started);
  try{Object.assign(out,await page.evaluate(()=>window.__lfj226Frame.end()));}
  catch(e){out.frameMetricError=String(e).slice(0,160);}
  await memorySample(session,page,stats);
  stats.stages.push(out);
  return out.ok;
}
async function checkDownload(page,action){
  const [d]=await Promise.all([
    page.waitForEvent('download',{timeout:18000}),
    page.locator('[data-action="'+action+'"]').click({timeout:18000})
  ]);
  const bytes=await readFile(await d.path());
  return {bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
}
async function run(browser,item){
  const data={kind:item.kind,file:item.source.file,sourceBytes:item.source.bytes,
    sourceSha256:item.source.sha256,generated:item.source.generated,
    generatorCopies:item.source.copies??null,xml:item.xml,stages:[],
    maxRendererJsHeapBytes:0,maxObservedPageHeapBytes:0,maxChromiumAggregateRssKiB:0,
    errors:[],downloads:null};
  const page=await browser.newPage({acceptDownloads:true});
  page.setDefaultTimeout(90000);
  const session=await page.context().newCDPSession(page);
  await session.send('Performance.enable');
  const timer=setInterval(()=>{void memorySample(session,page,data);},450);
  page.on('pageerror',e=>data.errors.push('PAGEERROR: '+String(e).slice(0,300)));
  try{
    await page.goto(ROOT+'/tests/browser/lfj-226-main-baseline.html',{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForFunction(()=>window.__lfj226Mounted===true,null,{timeout:45000});
    const nav=await stage(page,session,data,'open-authored-json-trace',async()=>{
      await page.locator('[data-phase="json-trace"]').click();
    },()=>page.locator('[data-field="source-file"]').waitFor());
    if(!nav)return data;
    const sourceOK=await stage(page,session,data,'upload-original-xml',async()=>{
      await page.locator('[data-field="source-file"]').setInputFiles(item.xml);
      await page.locator('[data-phase="json-trace"]').click();
    },()=>page.locator('[data-field="staged-json-file"]').waitFor({timeout:10000}));
    if(!sourceOK)return data;
    const jsonOK=await stage(page,session,data,'upload-staged-json',()=>page.locator('[data-field="staged-json-file"]').setInputFiles(item.source.file),
      ()=>page.getByText('✅ Staged JSON: Loaded').first().waitFor({timeout:30000}));
    if(!jsonOK)return data;
    const traceOK=await stage(page,session,data,'build-and-render-resolver-trace',async()=>{
      await page.locator('[data-action="build-resolver-index"]').click({timeout:90000});
    },()=>page.waitForFunction(()=>{
      const b=document.querySelector('[data-action="download-node-wise-trace-csv"]');
      return !!b && !b.disabled;
    },null,{timeout:30000}));
    if(!traceOK)return data;
    data.metrics=await page.locator('.xml-cii-resolver-metric').allTextContents();
    if(item.kind==='FIRSTPASS'||item.kind==='NC_NEGATIVE'){
      const csvOk=await stage(page,session,data,'download-original-trace-CSVs',async()=>{
        data.downloads={
          node:await checkDownload(page,'download-node-wise-trace-csv'),
          evidence:await checkDownload(page,'download-evidence-tree-csv')
        };
      });
      if(!csvOk)data.downloads=null;
    }
  }catch(e){data.errors.push('CASE: '+String(e).slice(0,350));}
  finally{
    clearInterval(timer);
    try{await memorySample(session,page,data);}catch{}
    try{await page.close({runBeforeUnload:false});}catch{}
    data.ok=data.stages.length>=4 && data.stages.slice(0,4).every(x=>x.ok);
  }
  return data;
}
await persist();
let browser;
try{
  browser=await chromium.launch({headless:true,args:['--enable-precise-memory-info','--disable-background-timer-throttling']});
  const cases=[
    {kind:'FIRSTPASS',source:await original(FIRST),xml:'Benchmarks/1885Sjson/FirstpassXML'},
    {kind:'NC_NEGATIVE',source:await original(NC),xml:'Benchmarks/1885_NC/1885_NC.topology.input.xml'}
  ];
  for(const size of [30,60,100])cases.push({
    kind:'GENERATED_CAPACITY_'+size+'MiB',source:await generated(size),
    xml:'Benchmarks/1885Sjson/FirstpassXML'
  });
  for(const item of cases){
    const result=await run(browser,item);
    results.cases.push(result);
    await persist();
    console.log('LFJ226_CASE '+JSON.stringify({kind:result.kind,bytes:result.sourceBytes,
      ok:result.ok,stages:result.stages,heap:result.maxRendererJsHeapBytes,
      rssKiB:result.maxChromiumAggregateRssKiB,errors:result.errors}));
  }
}catch(e){results.fatalError=String(e);process.exitCode=1;}
finally{await persist();await browser?.close().catch(()=>{});}
