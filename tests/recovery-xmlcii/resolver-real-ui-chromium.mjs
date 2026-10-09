/**
 * B5 / A3 source-check: actual authored docs UI, real File changes, scope selection,
 * Resolver Build, and both downloaded CSV artifacts. No production calls or UI mocks.
 * This is a baseline, NOT owner-original 30MB or whole-product acceptance.
 */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.XML_CII_PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const evidence = path.resolve(process.env.RECOVERY_EVIDENCE_DIR || 'recovery-browser-evidence');
const mode = process.env.RECOVERY_JSON ? 'AUTHENTIC_CHECKED_IN' : 'SYNTHETIC_POSITIVE';
const originalJson = process.env.RECOVERY_JSON && path.resolve(root, process.env.RECOVERY_JSON);
const originalXml = process.env.RECOVERY_XML && path.resolve(root, process.env.RECOVERY_XML);
const maxMs = Number(process.env.RECOVERY_TIMEOUT_MS || 90000);
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const branchA = '/SCOPE-A-4"-P1000001-61440-01/B1';
const branchB = '/SCOPE-B-4"-P1000002-61440-01/B1';
const sourceXml = `<Root><Branch><Branchname>${branchB}</Branchname><Node>
  <NodeNumber>20</NodeNumber><NodeName>PS-B</NodeName><ComponentType>ANCI</ComponentType>
  <Position>100 0 0</Position>
</Node></Branch></Root>`;
function scopedBranch(name, site, position, ps, description) {
  return { type: 'BRANCH', name, attributes: { OWNER_SITE: site }, children: [
    { type: 'ATTA', name: ps, attributes: { NAME: ps, POS: position,
      DTXR: description, ABORE: '100' } },
  ] };
}
const synthetic = Buffer.from(JSON.stringify([
  scopedBranch(branchA, '/ZONE-A', '0 0 0', '/PS-A', 'REST-A'),
  scopedBranch(branchB, '/ZONE-B', '100 0 0', '/PS-B', 'REST-B'),
]));
const syntheticXml = Buffer.from(sourceXml);
const types = { '.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript',
  '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml',
  '.wasm':'application/wasm' };
const server = createServer(async (req, res) => {
  try {
    const route = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    const filename = path.resolve(root, '.' + (route.endsWith('/') ? route + 'index.html' : route));
    if (!filename.startsWith(root + path.sep)) throw new Error('OUTSIDE_ROOT');
    res.writeHead(200, { 'Content-Type': types[path.extname(filename)] || 'application/octet-stream',
      'Cache-Control': 'no-store' });
    res.end(await readFile(filename));
  } catch (error) { res.writeHead(404); res.end(String(error)); }
});
const report = {
  schema: 'XMLCII.ResolverChromiumBaseline.v1', mode, isOwner30MbAcceptance: false,
  appRoot: 'docs/', testedHead: process.env.GITHUB_SHA || 'UNRECORDED',
  status: 'NOT_RUN', checks: [], errors: [], failedRequests: [], timings: {},
  downloads: {}, source: {}, browser: {}, scope: {},
};
const check = (name, fn) => {
  try { fn(); report.checks.push({name, status:'PASS'}); }
  catch (e) { report.checks.push({name,status:'FAIL',error:String(e)}); throw e; }
};
await mkdir(evidence, {recursive:true});
let browser, page;
try {
  const jsonBuffer = originalJson ? await readFile(originalJson) : synthetic;
  const parsed = originalJson ? JSON.parse(jsonBuffer.toString('utf8')) : null;
  // No provided XML accompanies these authentic source datasets. Create a
  // TEST-ONLY XML node from ORIGINAL JSON POS/DTXR values; never claim Owner XML.
  const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  let paired=null;
  if(parsed && !originalXml) {
    for(const b of Array.isArray(parsed) ? parsed : []) {
      for(const child of Array.isArray(b.children) ? b.children : []) {
        const a=child?.attributes||{},p=a.POS;
        if(typeof a.DTXR!=='string'||!a.DTXR||!p||
          ![p.x,p.y,p.z].every(v=>Number.isFinite(Number(v)))) continue;
        const xml='<Root><Branch><Branchname>'+esc(b.name)+'</Branchname><Node>'+
          '<NodeNumber>42</NodeNumber><NodeName>'+esc(a.NAME||child.name)+'</NodeName>'+
          '<ComponentType>'+esc(child.type)+'</ComponentType><Position>'+
          [p.x,p.y,p.z].join(' ')+'</Position></Node></Branch></Root>';
        paired={xml,branch:b.name,nodeType:child.type,dtXR:a.DTXR,
          position:[p.x,p.y,p.z],name:a.NAME||child.name};
        break;
      }
      if(paired)break;
    }
    assert.ok(paired,'Authentic JSON has no original child POS and DTXR');
  }
  const xmlBuffer = originalXml ? await readFile(originalXml)
    : paired ? Buffer.from(paired.xml) : syntheticXml;
  report.source = {
    jsonPath:originalJson ? path.relative(root,originalJson):'inline-synthetic-2-zone',
    xmlPath:originalXml ? path.relative(root,originalXml)
      : paired ? 'TEST_ONLY_DERIVED_XML_FROM_AUTHENTIC_JSON':'inline-synthetic-one-node',
    jsonSha256:sha(jsonBuffer),jsonBytes:jsonBuffer.byteLength,
    xmlSha256:sha(xmlBuffer),xmlBytes:xmlBuffer.byteLength,
    originalCorpusAvailable:Boolean(originalJson),
    pairedOracle:paired?{branch:paired.branch,nodeType:paired.nodeType,
      expectedDtxr:paired.dtXR,position:paired.position,name:paired.name}:null,
  };
  if(parsed){
    report.source.rootType=Array.isArray(parsed)?'ARRAY':typeof parsed;
    report.source.rootEntries=Array.isArray(parsed)?parsed.length:null;
  }
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  browser = await chromium.launch({ headless: true });
  report.browser = { version: browser.version(), node: process.version,
    platform: process.platform, arch: process.arch, cpus: os.cpus().length,
    totalMemBytes: os.totalmem() };
  const context = await browser.newContext({acceptDownloads:true});
  await context.tracing.start({screenshots:true,snapshots:true,sources:true});
  page = await context.newPage();
  page.setDefaultTimeout(maxMs);
  page.on('pageerror', err => report.errors.push(String(err)));
  page.on('console', msg => { if (msg.type()==='error') report.errors.push(msg.text()); });
  page.on('requestfailed', req => report.failedRequests.push(req.url() + ' ' + (req.failure()?.errorText||'')));
  await page.addInitScript(() => {
    const o = {gaps:[], longTasks:[], previous:performance.now()};
    setInterval(() => {
      const now = performance.now(); o.gaps.push(Math.max(0,now-o.previous-20));
      if (o.gaps.length>10000) o.gaps.shift();
      o.previous = now;
    },20);
    try {
      new PerformanceObserver(list => {
        for (const e of list.getEntries()) o.longTasks.push(e.duration);
      }).observe({entryTypes:['longtask']});
    } catch {}
    window.__resolverPerf = o;
  });
  const url = `http://127.0.0.1:${server.address().port}/docs/`;
  const start=Date.now();
  await page.goto(url, {waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'XML→CII 2019 Standalone'}).click();
  report.timings.navigationMs=Date.now()-start;
  // File upload may return the real application to Source & Masters. Upload XML
  // there first; then deliberately enter 3 Resolver before uploading staged JSON.
  report.stage='xml-upload';
  const uploadStart=Date.now();
  await page.locator('input[data-field="source-file"]').first().setInputFiles({
    name:'recovery.xml',mimeType:'application/xml',buffer:xmlBuffer
  });
  await page.waitForFunction(()=>document.querySelector('#app-layout')?.innerText
    ?.includes('Active Source: Loaded'),null,{timeout:maxMs});
  report.stage='resolver-navigation';
  await page.getByRole('button',{name:/3 Resolver \/ JSON Trace/}).click();
  await page.locator('.xml-cii-phase-panel input[data-field="staged-json-file"]').waitFor();
  report.stage='json-upload';
  await page.locator('.xml-cii-phase-panel input[data-field="staged-json-file"]')
    .setInputFiles({name:'recovery.json',mimeType:'application/json',buffer:jsonBuffer});
  await page.waitForFunction(()=>document.querySelector('.xml-cii-phase-panel')
    ?.innerText?.includes('Staged JSON: Loaded'),null,{timeout:maxMs});
  report.timings.uploadAndIndexMs=Date.now()-uploadStart;
  const scope=page.locator('select[data-field="resolver-hierarchy-scope"]');
  await scope.waitFor();
  const options=await scope.locator('option').evaluateAll(items=>items.map(o=>({value:o.value,label:o.textContent})));
  report.scope.options=options;
  check('hierarchy-scopes-exist',()=>assert.ok(options.length>=2,JSON.stringify(options)));
  const selected = mode==='SYNTHETIC_POSITIVE' ? '/ZONE-B'
    : (options.find(o=>o.value && o.value!=='__ALL__')||{}).value;
  check('selected-scope-is-offered',()=>assert.ok(options.some(o=>o.value===selected)));
  await scope.selectOption(selected);
  report.scope.selected=selected;
  const buildStart=Date.now();
  await page.locator('[data-action="build-resolver-index"]').click();
  await page.waitForFunction(()=>/Resolver index built: \d+ facts processed/.test(
    document.querySelector('.xml-cii-phase-panel')?.textContent||''),null,{timeout:maxMs});
  report.timings.buildMs=Date.now()-buildStart;
  report.scope.status=await page.locator('.xml-cii-phase-panel').innerText().then(s=>
    s.match(/Resolver index built: \d+ facts processed/)?.[0]||'UNKNOWN');
  await page.locator('[data-json-trace-sub-tab="nodeTrace"]').click();
  const tableRows=page.locator('table.xml-cii-node-wise-table tbody tr');
  const rowCount=await tableRows.count();
  report.scope.nodeWiseRows=rowCount;
  check('nodewise-rendered',()=>assert.ok(rowCount>0,'Real UI returned zero XML trace rows'));
  const [nodeDl]=await Promise.all([
    page.waitForEvent('download',{timeout:maxMs}),
    page.locator('[data-action="download-node-wise-trace-csv"]').click()
  ]);
  const nodePath=path.join(evidence,'node-wise.csv');
  await nodeDl.saveAs(nodePath);
  const nodeBytes=await readFile(nodePath);
  report.downloads.nodeWise={name:nodeDl.suggestedFilename(),bytes:nodeBytes.byteLength,sha256:sha(nodeBytes)};
  check('node-csv-header',()=>assert.match(nodeBytes.toString('utf8'),/XML Node,XML Branch,Type/));
  await page.locator('[data-json-trace-sub-tab="tree"]').click();
  const treeButton=page.locator('[data-action="download-evidence-tree-csv"]');
  const treeEnabled = await treeButton.isEnabled();
  check('evidence-tree-download-enabled',()=>assert.equal(treeEnabled,true));
  const [treeDl]=await Promise.all([
    page.waitForEvent('download',{timeout:maxMs}),treeButton.click()
  ]);
  const treePath=path.join(evidence,'evidence-tree.csv');
  await treeDl.saveAs(treePath);
  const treeBytes=await readFile(treePath);
  report.downloads.evidenceTree={name:treeDl.suggestedFilename(),bytes:treeBytes.byteLength,sha256:sha(treeBytes)};
  check('tree-csv-header',()=>assert.match(treeBytes.toString('utf8'),/Branch,Bore,Source Node No/));
  const csv=nodeBytes.toString('utf8');
  if(mode==='SYNTHETIC_POSITIVE') {
    check('independent-zone-B-trace',()=>{
      assert.equal(rowCount,1,'one original XML node must remain one trace row');
      assert.match(csv,/REST-B/,'source B restraint must be resolved');
      assert.doesNotMatch(csv,/REST-A/,'unselected source A must not leak');
    });
  } else if(report.source.pairedOracle) {
    check('authentic-original-DTXR-projection',()=>{
      assert.equal(rowCount,1,'one paired source XML node expected');
      assert.ok(csv.includes(report.source.pairedOracle.expectedDtxr),
        'Original DTXR missing in node-wise CSV');
      assert.ok(treeBytes.toString('utf8').includes(report.source.pairedOracle.expectedDtxr),
        'Original DTXR missing in Evidence Tree CSV');
    });
  }
  report.status='PASS_BASELINE_ONLY';
} catch(err) {
  report.status='FAIL'; report.failure=String(err?.stack||err);
} finally {
  if(page) {
    try {
      report.performance=await page.evaluate(()=>{
        const p=window.__resolverPerf||{gaps:[],longTasks:[]};
        return {maxTimerGapMs:Math.max(0,...p.gaps),longTaskCount:p.longTasks.length,
          maxLongTaskMs:Math.max(0,...p.longTasks)};
      });
      await page.screenshot({path:path.join(evidence,'last-state.png'),fullPage:true,timeout:10000});
      await page.context().tracing.stop({path:path.join(evidence,'chromium-trace.zip')});
    } catch(e) {report.teardownError=String(e);}
  }
  if(browser) await browser.close();
  if(server.listening) await new Promise(resolve=>server.close(resolve));
  if(report.status==='PASS_BASELINE_ONLY' && mode==='AUTHENTIC_CHECKED_IN') {
    report.performance.provisionalUiLongTaskTargetMs=250;
    report.performance.targetApprovedByOwner=false;
    if(report.performance.maxLongTaskMs>250) {
      report.status='FAIL_PROVISIONAL_RESPONSIVENESS';
      report.failure='Native Chromium long task exceeded proposed 250ms target';
    }
  }
  await writeFile(path.join(evidence,'run-manifest.json'),JSON.stringify(report,null,2)+'\n');
  console.log('XMLCII_RECOVERY_CHROMIUM '+JSON.stringify({
    mode:report.mode,status:report.status,source:report.source,
    scope:report.scope,timings:report.timings,downloads:report.downloads,
    performance:report.performance,errors:report.errors,failure:report.failure,
  }));
  if(report.status!=='PASS_BASELINE_ONLY') process.exitCode=1;
}
