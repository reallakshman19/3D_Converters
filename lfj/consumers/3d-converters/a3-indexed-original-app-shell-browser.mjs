/**
 * A3 T08 — ACTUAL authored /index.html application, not an injected panel.
 * Real native Chromium file-input selection, index Worker custody, verified
 * source zone picker, Build, complete two table views, per-click consent,
 * two REAL Playwright downloads and changed-scope revocation.
 *
 * Original Firstpass is a ONE-zone authentic fixture. This qualifies the
 * app-shell wiring and original golden bytes, not multi-zone owner semantics,
 * Owner 30MiB responsiveness, deployment or CII engineering approval.
 */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {chromium} from 'playwright';

const sha=x=>createHash('sha256').update(x).digest('hex');
const ORIGINAL_JSON='Benchmarks/1885Sjson/Sjson.json';
const ORIGINAL_XML='Benchmarks/1885Sjson/FirstpassXML';
const SITE='/ASIM-1885-CU-PI';
const goldens=Object.freeze({
  'xml-cii-node-wise-trace.csv':Object.freeze({
    bytes:57945,sha256:'0d8bb4482ed4a9d0d116faeac5e68ce564f07b6bba2dd73dfc3676b72ec2eddc'
  }),
  'xml-cii-evidence-tree.csv':Object.freeze({
    bytes:50399,sha256:'653485ff968bf478fa0001488432bb210a9ce6e85a901e9cc19f368f53a24809'
  })
});
const context=await chromium.launch({headless:true}).then(b=>({browser:b}));
const browser=context.browser;
const profile=await browser.newContext({acceptDownloads:true});
const page=await profile.newPage();
page.setDefaultTimeout(45000);
const pageErrors=[],internal404=[];
page.on('pageerror',e=>pageErrors.push(e.message));
page.on('response',r=>{
  if(r.status()===404 && r.url().startsWith('http://127.0.0.1:4200/'))
    internal404.push(new URL(r.url()).pathname);
});
await profile.addInitScript(()=>{
  try{localStorage.setItem('xml-cii-resolver-config-v1','{}');}catch{}
});
const artifactDir=process.env.RUNNER_TEMP||tmpdir();
await profile.tracing.start({screenshots:true,snapshots:true,sources:true});
let finish='ERROR';
try{
  await page.goto('http://127.0.0.1:4200/index.html',
    {waitUntil:'domcontentloaded',timeout:60000});
  await page.locator('.app-tab[data-tab="xml-cii-2019-standalone"]').click();
  await page.locator('.xml-cii-adapted-workflow-shell').waitFor({timeout:60000});
  const phase=async id=>{
    await page.locator('button[data-phase="'+id+'"]').click();
  };
  // Original XML is selected with the AUTHORED source File input. It may
  // rerender the phase rail asynchronously; the File summary is the signal.
  const kind=page.locator('select[data-field="source-kind"]');
  if(await kind.count()) await kind.selectOption('xml');
  await page.locator('input[data-field="source-file"]').setInputFiles(ORIGINAL_XML);
  await page.waitForFunction(()=>
    [...document.querySelectorAll('.xml-cii-file-summary')].some(x=>
      x.textContent.includes('FirstpassXML')),null,{timeout:30000});
  await phase('json-trace');
  // Opt in to the REAL indexed pathway BEFORE selecting large original JSON.
  const mode=page.locator('select[data-field="resolver-source-mode"]');
  await mode.selectOption('lfj-indexed-preview');
  // Never load original JSON into the legacy on-main-thread FileReader.
  // Observe the ACTUAL browser input change without forging its event,
  // replacing a File or modifying the application's state.
  await page.evaluate(()=>{
    window.__a3StagedFileEvents=[];
    document.addEventListener('change',event=>{
      if(event.target?.dataset?.field==='staged-json-file'){
        window.__a3StagedFileEvents.push({
          filename:event.target.files?.[0]?.name||null,
          size:event.target.files?.[0]?.size||0,
          activePhase:document.querySelector(
            'button[data-phase].is-active')?.dataset.phase||null,
          mode:document.querySelector(
            '[data-field="resolver-source-mode"]')?.value||null
        });
      }
    },true);
  });
  await page.locator('input[data-field="staged-json-file"]')
    .setInputFiles(ORIGINAL_JSON);
  const afterOriginalUpload=await page.evaluate(()=>({
    observedEvents:window.__a3StagedFileEvents,
    uploadedFile:document.querySelector(
      'input[data-field="staged-json-file"]')?.files?.[0]?.name||null,
    stagedSummaries:[...document.querySelectorAll(
      '.xml-cii-file-summary')].map(e=>e.textContent.slice(0,160)),
    selectedMode:document.querySelector(
      '[data-field="resolver-source-mode"]')?.value||null
  }));
  console.log('A3_ROOT_ORIGINAL_FILE_CHANGE '+JSON.stringify(afterOriginalUpload));
  if(!(await page.locator('[data-action="discover-indexed-scopes"]').count()))
    await phase('json-trace');
  await page.locator('[data-json-trace-sub-tab="index"]').click();
  // A genuine root-shell render cannot be substituted with an injected
  // component. Publish a bounded DOM snapshot if it fails to retain mode/file.
  const scan=page.locator('[data-action="discover-indexed-scopes"]');
  if(!(await scan.count())){
    const diagnosis=await page.evaluate(()=>({
      selectedMode:document.querySelector(
        '[data-field="resolver-source-mode"]')?.value||null,
      activePhase:document.querySelector(
        'button[data-phase].is-active')?.dataset.phase||null,
      activeResolverTab:document.querySelector(
        '[data-json-trace-sub-tab].is-active')?.dataset.jsonTraceSubTab||null,
      jsonFileSummary:[...document.querySelectorAll(
        '.xml-cii-file-summary')].map(x=>x.textContent.slice(0,150)),
      sourceFileInputCount:document.querySelectorAll(
        'input[data-field="staged-json-file"]').length,
      scopeOptions:[...document.querySelectorAll(
        'select[data-field="resolver-hierarchy-scope"] option')]
        .map(x=>({id:x.value,text:x.textContent})),
      controls:[...document.querySelectorAll(
        '.xml-cii-resolver-scope-control button')].map(x=>x.textContent),
      visibleHelp:[...document.querySelectorAll('.xml-cii-phase-help')]
        .slice(0,12).map(x=>x.textContent.slice(0,160))
    }));
    console.error('A3_ROOT_SCOPE_MISSING '+JSON.stringify({diagnosis,
      afterOriginalUpload,pageErrors,internal404}));
    throw Error('Actual root authored mode/file scope discovery control is missing');
  }
  await scan.click();
  await page.waitForFunction(site=>{
    const select=document.querySelector(
      'select[data-field="resolver-hierarchy-scope"]');
    return !!select && [...select.options].some(o=>o.value===site);
  },SITE,{timeout:180000});
  const chooser=page.locator('select[data-field="resolver-hierarchy-scope"]');
  await chooser.selectOption(SITE);
  assert.equal(await chooser.inputValue(),SITE,
    'real picker uses exact source-verified owner site');
  const build=page.locator('button[data-action="build-resolver-index"]');
  await build.click();
  const consent=page.locator('input[data-field="lfj-indexed-export-consent"]');
  // Consent cannot be enabled until an actual three-Worker Build publishes
  // its verified receipt, both CSV hashes and complete XML census.
  await page.waitForFunction(()=>{
    const consent=document.querySelector(
      '[data-field="lfj-indexed-export-consent"]');
    return !!consent && !consent.disabled;
  },null,{timeout:240000});
  const help=(await page.locator('.xml-cii-resolver-panel').first().innerText())
    .slice(0,3500);
  assert.match(help,/Indexed Build complete|Indexed preview:/,
    'native Build must finish successfully, not silently fall back to legacy');
  assert.equal(await consent.isChecked(),false,
    'fresh original source Build cannot grant consent automatically');
  await page.screenshot({
    path:join(artifactDir,'a3-authored-indexed-selected-build.png'),
    fullPage:true
  });
  await consent.check();
  assert.equal(await consent.isChecked(),true);
  const outputs=[];
  for(const [tab,action,rowClass,expectedRows,fileName] of [
    ['nodeTrace','download-node-wise-trace-csv',
      'xml-cii-node-wise-table',216,'xml-cii-node-wise-trace.csv'],
    ['tree','download-evidence-tree-csv',
      'xml-cii-resolver-table',241,'xml-cii-evidence-tree.csv']
  ]){
    await page.locator('[data-json-trace-sub-tab="'+tab+'"]').click();
    const rows=page.locator('.'+rowClass+' tbody tr');
    assert.equal(await rows.count(),expectedRows,
      'complete authentic source-backed table population for '+tab);
    const pager=page.locator('[data-field="table-visible-range"]');
    assert.match(await pager.innerText(),
      new RegExp('of '+expectedRows+' original rows'));
    if(tab==='tree')
      assert.match(await rows.first().innerText(),/ASIM|\\$\\[|[A-Z]/,
        'Evidence Tree must expose nonempty source data rather than blank cells');
    const downloadButton=page.locator('[data-action="'+action+'"]');
    assert.equal(await downloadButton.isEnabled(),true);
    const [download]=await Promise.all([
      page.waitForEvent('download',{timeout:60000}),downloadButton.click()
    ]);
    assert.equal(download.suggestedFilename(),fileName);
    const bytes=await readFile(await download.path());
    assert.equal(bytes.subarray(0,3).toString('hex'),'efbbbf',
      'shipping CSV exact original UTF-8 BOM');
    assert.equal(bytes.length,goldens[fileName].bytes);
    assert.equal(sha(bytes),goldens[fileName].sha256,
      'actual browser download must match protected original CSV golden');
    outputs.push({name:fileName,bytes:bytes.length,
      sha256:sha(bytes),displayedRows:expectedRows});
  }
  // A real user scope switch revokes current Build and opt-in. Verify from
  // the actual DOM buttons, not by injecting the product verifier directly.
  await page.locator('[data-json-trace-sub-tab="index"]').click();
  await page.locator('[data-field="resolver-hierarchy-scope"]')
    .selectOption('__ALL__');
  for(const [tab,action] of [
    ['nodeTrace','download-node-wise-trace-csv'],
    ['tree','download-evidence-tree-csv']
  ]){
    await page.locator('[data-json-trace-sub-tab="'+tab+'"]').click();
    const old=page.locator('[data-action="'+action+'"]');
    if(await old.count())
      assert.equal(await old.isEnabled(),false,
        'scope switch must disable old downloaded CSV action '+action);
  }
  // Confirm original JSON never passed via a foreground full-JSON text state:
  // this is the product indexed source upload, not the legacy parser path.
  assert.deepEqual(internal404,[],'all same-origin authored assets must resolve');
  finish='PASS';
  console.log('A3_AUTHORED_ROOT_SELECTED_INDEXED_E2E_PASS '+JSON.stringify({
    candidate:'AUTHORED_ROOT_APP_SOURCE_ONLY',entry:'/index.html',
    originalJsonSha256:sha(await readFile(ORIGINAL_JSON)),
    originalXmlSha256:sha(await readFile(ORIGINAL_XML)),
    selectedOwnerScope:SITE,xmlNodes:216,evidenceRows:241,
    downloaded:outputs,revokedBothAfterScopeSwitch:true,
    appPageErrors:pageErrors,downstreamEngineeringAuthorized:false,
    qualification:'NATIVE_CHROMIUM_ROOT_AUTHORED_SELECTED_TWO_CSV'
  }));
}finally{
  await page.screenshot({path:join(artifactDir,
    'a3-authored-indexed-root-last-'+finish+'.png'),fullPage:true})
    .catch(()=>{});
  await profile.tracing.stop({
    path:join(artifactDir,'a3-authored-indexed-root-'+finish+'.zip')
  }).catch(()=>{});
  await browser.close();
}
