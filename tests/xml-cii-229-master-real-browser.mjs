import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.XML_CII_PLAYWRIGHT_MODULE || 'playwright');
const server=createServer(async(req,res)=>{
  try{
    const targetPath=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(targetPath==='/xml229-master-probe.html'){
      res.writeHead(200,{'content-type':'text/html','cache-control':'no-store'});
      res.end('<!doctype html><meta charset="utf-8"><base href="/docs/"><title>XML229 Piping Class real browser probe</title>');
      return;
    }
    const file=path.resolve(root,'.'+targetPath);
    if(!file.startsWith(root+path.sep))throw Error('outside root');
    const body=await readFile(file);
    const mime=({'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html','.json':'application/json','.css':'text/css'})[path.extname(file)]||'application/octet-stream';
    res.writeHead(200,{'content-type':mime,'cache-control':'no-store'});res.end(body);
  }catch(error){res.writeHead(404);res.end(String(error));}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
let browser;
try {
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage();
  const errors=[], failures=[], sources=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('response',r=>{if(r.status()>=400)failures.push({status:r.status(),url:r.url()})});
  page.on('request',r=>{if(/Piping_class_master\.json|SpecwisePipingClass\/index\.json/.test(r.url()))sources.push(r.url())});
  await page.goto('http://127.0.0.1:'+server.address().port+'/xml229-master-probe.html');
  const observation=await page.evaluate(async()=>{
    const {prepareStandaloneImportMasters,summarizeStandaloneImportMasters}=await import('/docs/tabs/xml-cii-2019-standalone/xml-cii-master-context.js');
    const hydrated=await prepareStandaloneImportMasters({supportConfigJson:'{}'});
    const piping=summarizeStandaloneImportMasters(hydrated).find(row=>row.key==='pipingClass');
    const anyClass=hydrated.pipingClassRows.every(row=>String(row?.['Piping Class']||'').trim().length>0);
    return {rowCount:piping?.rowCount,status:piping?.sourceMetadata?.status,
      source:piping?.sourceMetadata?.source,rowsWithPipingClass:anyClass,
      configRows:hydrated.config.pipingClass?.masterRows?.length,
      serializedCount:JSON.parse(hydrated.supportConfigJson)?.pipingClass?.masterRows?.length};
  });
  assert.equal(observation.rowCount,10699);
  assert.equal(observation.configRows,10699);
  assert.equal(observation.serializedCount,10699);
  assert.equal(observation.rowsWithPipingClass,true);
  assert.equal(observation.status,'loaded');
  assert.match(String(observation.source),/Piping_class_master\.json$/);
  assert(sources.some(s=>s.endsWith('/docs/Masters/Piping_class_master.json')),'real network fetch must obtain row source');
  assert(!sources.some(s=>s.endsWith('/SpecwisePipingClass/index.json')),'manifest must not be used as a master');
  assert.deepEqual(errors,[]);
  // Material defaults may separately return 404 on some hosted routes; forbid errors for the Piping Class source.
  assert(!failures.some(f=>f.url.includes('Piping_class_master.json')),'row-bearing source HTTP failure');
  console.log(JSON.stringify({schema:'XML229_REAL_BROWSER_MASTER_V1',ok:true,observation,pipingMasterRequests:sources.length,errors,unrelatedFailures:failures.map(f=>f.status)},null,2));
} finally {
  await browser?.close();
  await new Promise(ok=>server.close(ok));
}
