/** Real authored UI O1 Firstpass XML+JSON -> native indexed domain Worker -> both CSVs. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const record={schema:'LFJ226.O1.OriginalTraceBrowser.v1',cases:[]};
const sha=b=>createHash('sha256').update(b).digest('hex');
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({acceptDownloads:true});
 page.on('pageerror',err=>(record.pageErrors??=[]).push(String(err)));
 const firstpass='Benchmarks/1885Sjson/Sjson.json';
 const originalXml='Benchmarks/1885Sjson/FirstpassXML';
 const source=await readFile(firstpass),xml=await readFile(originalXml);
 record.original={jsonBytes:source.length,jsonSha256:sha(source),
   xmlBytes:xml.length,xmlSha256:sha(xml)};
 await page.goto('http://127.0.0.1:4173/tests/browser/lfj-226-o1-intake.html',
   {waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__lfj226Mounted===true);
 await page.locator('[data-phase="source"]').click();
 await page.locator('[data-field="source-file"]').setInputFiles(originalXml);
 await page.locator('[data-phase="json-trace"]').click();
 await page.locator('[data-lfj-o1-enable]').check();
 await page.evaluate(()=>window.__lfj226Metrics.start());
 await page.locator('[data-field="staged-json-file"]').setInputFiles(firstpass);
 await page.waitForFunction(expected=>{
   const status=document.querySelector('[data-lfj-o1-status]')?.textContent??'';
   return status.startsWith('LFJ source index COMMITTED')&&status.includes(expected);
 },record.original.jsonSha256.slice(0,12),{timeout:90000});
 record.indexReceipt=await page.locator('[data-lfj-o1-status]').textContent();
 const buildStarted=Date.now();
 await page.locator('[data-action="build-resolver-index"]').click();
 try {
   await page.waitForFunction(()=>{
     const txt=document.querySelector('[data-lfj-o1-status]')?.textContent||'';
     return txt.startsWith('O1 matched trace source-path verified')||
       txt.startsWith('O1 domain blocked')||txt.startsWith('O1 Worker FAILED');
   },null,{timeout:240000});
 }catch(e){record.waitError=String(e);}
 record.domainStatus=await page.locator('[data-lfj-o1-status]').textContent();
 record.buildWallMs=Date.now()-buildStarted;
 record.frame=await page.evaluate(()=>window.__lfj226Metrics.stop());
 record.verifiedPanel=await page.locator('[data-lfj-o1-trace-status]').textContent().catch(()=>null);
 assert.ok(record.domainStatus?.startsWith('O1 matched trace source-path verified'),
   'domain Worker must finish and independently attest source paths: '+JSON.stringify(record));
 assert.ok(record.verifiedPanel?.includes('SOURCE-PATH VERIFIED'));
 const table=page.locator('[data-lfj-o1-table] tbody tr');
 record.visibleRows=await table.count();
 assert.ok(record.visibleRows>0&&record.visibleRows<=64);
 for(const kind of ['node','evidence']){
   const button=page.locator('[data-lfj-o1-action="export-'+kind+'"]');
   const [download]=await Promise.all([
     page.waitForEvent('download',{timeout:60000}),button.click()
   ]);
   const bytes=await readFile(await download.path());
   const output={type:kind,fileName:download.suggestedFilename(),length:bytes.length,
     sha256:sha(bytes),bom:bytes.subarray(0,3).toString('hex'),
     lines:bytes.toString('utf8').split('\r\n').length-2};
   assert.ok(bytes.length>64&&output.bom==='efbbbf');
   assert.ok(output.lines>=1,'original exporter should contain at least one fact');
   record.cases.push(output);
 }
 // Replace source with malformed original: all former output rights revoked.
 await page.locator('[data-field="staged-json-file"]').setInputFiles({
   name:'O1-invalid.json',mimeType:'application/json',
   buffer:Buffer.from('[{"bad":}')
 });
 await page.waitForFunction(()=>document.querySelector('[data-lfj-o1-status]')
   ?.textContent?.startsWith('LFJ Worker FAILED'),null,{timeout:30000});
 await page.locator('[data-action="download-node-wise-trace-csv"]').click();
 record.staleExportStatus=await page.locator('[data-lfj-o1-status]').textContent();
 assert.ok(record.staleExportStatus?.includes('CSV blocked'),
   'replaced original may not export earlier source');
 record.pass=true;
 console.log('LFJ226_ORIGINAL_TRACE_WORKER '+JSON.stringify(record));
}finally{
 await mkdir('ValidationRecords',{recursive:true});
 await writeFile('ValidationRecords/lfj-226-o1-trace.json',JSON.stringify(record,null,2)+'\n');
 await browser.close();
}
