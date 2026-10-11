/** NEXT-03: real authored Chromium Firstpass selected LFJ -> real Preview button.
 * Only a performance/behavior probe. NEVER certifies physical selected engineering.
 * Uses untouched authentic Firstpass XML/JSON and the native app; no stubs.
 */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {chromium} from 'playwright';

const sha=x=>createHash('sha256').update(x).digest('hex');
const input={xml:'Benchmarks/1885Sjson/FirstpassXML',json:'Benchmarks/1885Sjson/Sjson.json'};
const expected={
  xml:'feee5a5a6399207337e63bc56c8afb001fe37ab30c6a7a9283333ec60f6eea38',
  json:'6b2c8b01ab0ba6ec8e9e7c42eb4a719668ffd2dc4dbe4790d27cf426a1f60288'
};
const stamp={rootEntry:'http://127.0.0.1:4200/index.html',
  owner:'/ASIM-1885-CU-PI', qualification:'NEXT03_AUTHOR_BROWSER_DIAGNOSTIC_ONLY',
  firstpassSourceSha:{xml:sha(await readFile(input.xml)),json:sha(await readFile(input.json))},
  selection: 'OWNER_SELECTED_IN_LFJ_BUT_PREVIEW_ALL_FALLBACK_NOT_PROVEN',
  exactHead:process.env.GITHUB_SHA||null, metrics:[],pageErrors:[],http404:[],
  screenshots:[],sourceCountChecks:{},notes:[]};
for (const k of ['xml','json'])assert.equal(stamp.firstpassSourceSha[k],expected[k],'unaltered original fixture '+k);
const out=process.env.RUNNER_TEMP||join(tmpdir(),'next03');
await mkdir(out,{recursive:true});
let browser, context,page, result='INCOMPLETE', firstError=null;
const filename=join(out,'next03-browser-benchmark-receipt.json');
const persist=async()=>writeFile(filename,JSON.stringify({...stamp,result,firstError},null,2)+'\n');
try {
  browser=await chromium.launch({headless:true});
  context=await browser.newContext({acceptDownloads:true});
  await context.addInitScript(()=>{
    try{localStorage.setItem('xml-cii-resolver-config-v1','{}');}catch{}
    window.__next03={longTasks:[],startsAt:performance.now()};
    try{new PerformanceObserver(list=>{
      for (const x of list.getEntries())
        window.__next03.longTasks.push({durationMs:Math.round(x.duration),startMs:Math.round(x.startTime)});
    }).observe({entryTypes:['longtask']});}catch{}
  });
  await context.tracing.start({screenshots:true,snapshots:true,sources:true});
  page=await context.newPage();
  page.setDefaultTimeout(45000);
  page.on('pageerror',e=>stamp.pageErrors.push(e.message));
  page.on('response',r=>{if(r.status()===404 && r.url().startsWith('http://127.0.0.1:4200/'))
    stamp.http404.push(new URL(r.url()).pathname);});
  const phase=async id=>page.locator('button[data-phase="'+id+'"]').click();
  await page.goto(stamp.rootEntry,{waitUntil:'domcontentloaded',timeout:60000});
  await page.locator('.app-tab[data-tab="xml-cii-2019-standalone"]').click();
  await page.locator('.xml-cii-adapted-workflow-shell').waitFor({timeout:60000});
  const kind=page.locator('select[data-field="source-kind"]');
  if(await kind.count())await kind.selectOption('xml');
  await page.locator('input[data-field="source-file"]').setInputFiles(input.xml);
  await page.waitForFunction(()=>[...document.querySelectorAll('.xml-cii-file-summary')].some(x=>x.textContent.includes('FirstpassXML')),{timeout:30000}).catch(async()=>{await page.locator('.xml-cii-file-summary').first().waitFor()});
  await phase('json-trace');
  await page.locator('select[data-field="resolver-source-mode"]').selectOption('lfj-indexed-preview');
  await page.locator('input[data-field="staged-json-file"]').setInputFiles(input.json);
  await page.locator('[data-json-trace-sub-tab="index"]').click();
  const discover=page.locator('[data-action="discover-indexed-scopes"]');
  await discover.waitFor({timeout:30000});
  let t=performance.now();
  await discover.click();
  await page.waitForFunction(owner=>{
    const box=document.querySelector('select[data-field="resolver-hierarchy-scope"]');
    return !!box&&[...box.options].some(x=>x.value===owner);
  },stamp.owner,{timeout:180000});
  stamp.metrics.push({stage:'discover_indexed_owner',durationMs:Math.round(performance.now()-t)});
  await page.locator('select[data-field="resolver-hierarchy-scope"]').selectOption(stamp.owner);
  assert.equal(await page.locator('select[data-field="resolver-hierarchy-scope"]').inputValue(),stamp.owner);
  t=performance.now();
  await page.locator('button[data-action="build-resolver-index"]').click();
  await page.waitForFunction(()=>{
    const c=document.querySelector('[data-field="lfj-indexed-export-consent"]');
    return !!c&&!c.disabled;
  },null,{timeout:240000});
  stamp.metrics.push({stage:'selected_owner_indexed_build',durationMs:Math.round(performance.now()-t)});
  stamp.notes.push('Native indexed Owner Build completed before physical Preview; full CSV goldens are independently covered in unchanged earlier Firstpass browser run.');

  // Use only the authored importer and the untouched checked-in master sources.
  await phase('source');
  await page.locator('button[data-sub-tab="pipingClass"]').click();
  const load=page.locator('button[data-action="load-import-masters"]');
  await load.waitFor({timeout:30000});
  t=performance.now();
  await load.click();
  await page.waitForFunction(()=>{
    const button=document.querySelector('[data-action="load-import-masters"]');
    return !!button && !button.disabled && !/Loading/i.test(button.textContent||'');
  },null,{timeout:180000});
  stamp.metrics.push({stage:'native_load_default_master_context',durationMs:Math.round(performance.now()-t)});
  const masterPanel=await page.locator('.xml-cii-phase-panel').innerText();
  stamp.masterPanelSummary=masterPanel.slice(0,2000);
  await phase('preview');
  await page.locator('.xml-cii-phase-panel[data-active-phase="preview"]').waitFor({timeout:45000});
  const host=page.locator('#mc-preview-table-host');
  stamp.previewEntry=await page.locator('.xml-cii-phase-panel').innerText().then(x=>x.slice(0,2100));
  if(!(await host.count())){
    result='BLOCKED_NO_NATIVE_PREVIEW_HOST';
    stamp.notes.push('Native Preview refused to render a Build button: source or master prerequisite unavailable. Not a physical Preview pass.');
  }else{
    for(const cycle of ['cold','warm']){
      const build=host.locator('button[data-mc-preview-build]');
      if(!(await build.count())) {
        stamp.notes.push('No Build Preview button available for '+cycle+' cycle');
        stamp.metrics.push({stage:cycle+'_preview',outcome:'NO_BUTTON'});
        break;
      }
      const start=performance.now();
      await build.click();
      let outcome='TIMEOUT',code=null,readModel=null;
      try{
        await page.waitForFunction(()=>{
          const h=document.querySelector('#mc-preview-table-host');
          if(!h)return true;
          if(h.dataset.mcPreviewBasisId)return true;
          const notice=h.querySelector('[data-mc-preview-job-state]');
          const s=(notice?.textContent||'').toLowerCase();
          return /preview failed|preview cancelled|preview session failed|corrupt_worker|scoped_engineering_pending|incomplete_worker/.test(s);
        },null,{timeout:150000,polling:100});
        const info=await host.evaluate(h=>({
          basisId:h.dataset.mcPreviewBasisId||null,
          mode:h.dataset.mcPreviewSourceMode||null,
          statusText:h.querySelector('[data-mc-preview-job-state]')?.textContent?.slice(0,950)||null,
          hasTable:!!h.querySelector('table'),
          sourceFactRows:h.querySelectorAll('[data-mc-preview-source-facts] tr').length,
          previewResult:!!h.__xmlCiiPreviewResult,
        }));
        readModel=info;
        code=info.statusText?.match(/\b[A-Z][A-Z0-9_]{5,}\b/)?.[0]||null;
        outcome=info.basisId?'WORKER_BASIS_PUBLISHED':(info.statusText?'FAIL_VISIBLE':'NO_BASIS');
      }catch(e){
        const s=await host.innerText().catch(()=>'<missing>');
        readModel={summary:s.slice(0,1000)};
        stamp.notes.push(cycle+' Preview timed out waiting for real button terminal: '+String(e?.message||e).slice(0,200));
      }
      const metric={stage:cycle+'_actual_preview_button',durationMs:Math.round(performance.now()-start),
        outcome,code,readModel};
      stamp.metrics.push(metric);
      await page.screenshot({path:join(out,'next03-'+cycle+'-preview.png'),fullPage:true});
      stamp.screenshots.push('next03-'+cycle+'-preview.png');
      if(outcome!=='WORKER_BASIS_PUBLISHED')break;
    }
    const passes=stamp.metrics.filter(x=>/_actual_preview_button$/.test(x.stage));
    result=passes.some(x=>x.outcome==='WORKER_BASIS_PUBLISHED')?'SOURCE_ONLY_BROWSER_PREVIEW_OBSERVED':'PREVIEW_BLOCKED_OR_FAILED';
  }
  stamp.perf=await page.evaluate(()=>({longTasks:window.__next03?.longTasks||[],
    memory:performance.memory?{usedJSHeapSize:performance.memory.usedJSHeapSize,jsHeapSizeLimit:performance.memory.jsHeapSizeLimit}:null,
    currentSelectionAvailable:document.querySelector('select[data-field="resolver-hierarchy-scope"]')?.value||null}));
  stamp.cancelTest='NOT_RUN_NO_AUTHENTIC_LONG_RUNNING_SELECTED_PHYSICAL_JOB';
  stamp.selectedPhysicalScope='NOT_PROVEN_CODE_BUTTON_BASIS_USES_ALL';
  stamp.independentEngineeringAuthority=false;
  assert.deepEqual(stamp.http404,[],'authored source assets must resolve');
}catch(err){
  firstError=String(err?.stack||err).slice(0,2800);
  stamp.notes.push('Actual browser task failed before qualifying Preview; do not interpret harness completion as engineering pass.');
  result='BROWSER_HARNESS_FAILED';
}finally{
  if(page){await page.screenshot({path:join(out,'next03-last.png'),fullPage:true}).catch(()=>{});stamp.screenshots.push('next03-last.png');}
  if(context)await context.tracing.stop({path:join(out,'next03-trace.zip')}).catch(()=>{});
  if(browser)await browser.close().catch(()=>{});
  await persist();
  console.log('NEXT03_REAL_ROOT_BROWSER_RECEIPT '+JSON.stringify({result,firstError,metrics:stamp.metrics,notes:stamp.notes,previewEntry:stamp.previewEntry,
    masterPanelSummary:stamp.masterPanelSummary,http404:stamp.http404,longTasks:stamp.perf?.longTasks?.length}));
}
if(firstError)process.exitCode=1;
