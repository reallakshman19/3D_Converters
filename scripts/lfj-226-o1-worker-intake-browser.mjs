import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';

const out={schema:'LFJ226.O1.MainWorkerIntake.v1',cases:[]};
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();
 page.on('pageerror',e=>{(out.pageErrors??=[]).push(String(e));});
 await page.goto('http://127.0.0.1:4173/tests/browser/lfj-226-o1-intake.html',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__lfj226Mounted===true);
 await page.locator('[data-phase="json-trace"]').click();
 await page.locator('[data-lfj-o1-enable]').check();
 const field=page.locator('[data-mode-a-staged-json-all]');
 const sources=[
   {name:'FIRSTPASS',path:'Benchmarks/1885Sjson/Sjson.json'},
   {name:'NC_SOURCE_NEGATIVE',path:'Benchmarks/1885_NC/1885_NC.json'}
 ];
 for(const input of sources){
   const original=await readFile(input.path);
   const sha=createHash('sha256').update(original).digest('hex');
   const start=Date.now();
   await page.evaluate(()=>window.__lfj226Metrics.start());
   await field.setInputFiles(input.path);
   await page.waitForFunction(()=>{
     const status=document.querySelector('[data-lfj-o1-status]')?.textContent??'';
     return status.startsWith('LFJ source index COMMITTED')||status.startsWith('LFJ Worker FAILED');
   },null,{timeout:180000});
   const status=await page.locator('[data-lfj-o1-status]').textContent();
   const frames=await page.evaluate(()=>window.__lfj226Metrics.stop());
   const row={name:input.name,sizeBytes:original.length,sha256:sha,elapsedMs:Date.now()-start,
     maxFrameGapMs:frames.maxFrameGapMs,frames:frames.frames,status};
   out.cases.push(row);
   assert.ok(status.includes('COMMITTED'),JSON.stringify(row));
   assert.ok(status.includes(sha.slice(0,12)),'Worker SHA must equal independent Node SHA');
   assert.ok(status.includes('Trace/CSV NOT authorized'),'raw source cannot authorize matching');
 }
 const start=Date.now();
 await field.setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('[{"bad":}')});
 await page.waitForFunction(()=>document.querySelector('[data-lfj-o1-status]')?.textContent?.includes('FAILED'),null,{timeout:20000});
 out.malformed={elapsedMs:Date.now()-start,status:await page.locator('[data-lfj-o1-status]').textContent()};
 assert.ok(out.malformed.status.includes('no trace/export rights'));
 console.log('LFJ226_REAL_UI_WORKER_INDEX '+JSON.stringify(out));
}finally{
 await mkdir('ValidationRecords',{recursive:true});
 await writeFile('ValidationRecords/lfj-226-o1-intake.json',JSON.stringify(out,null,2)+'\n');
 await browser.close();
}
