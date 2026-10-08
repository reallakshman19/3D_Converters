// Standalone hosted Chromium R10 real Worker, independent WebCrypto+Node SHA oracle.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const original='[{"label":"A","a/b~":"μ","children":[{"label":"A"}]}]';
const expected=['','/0','/0/label','/0/a~1b~0','/0/children','/0/children/0','/0/children/0/label'];
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();
 await page.goto('http://127.0.0.1:4173/lfj/ports/source-browser-qualification.html',{waitUntil:'load'});
 await page.waitForFunction(()=>typeof window.runR10SourceWorker==='function');
 const first=await page.evaluate(json=>window.runR10SourceWorker(json),original);
 const nodeSha=createHash('sha256').update(new TextEncoder().encode(original)).digest('hex');
 assert.equal(first.result.kind,'SCAN_DONE');
 assert.equal(first.result.summary.sourceSha256,nodeSha);
 assert.equal(first.independentBrowserSha256,nodeSha);
 assert.equal(first.result.summary.complete,true);
 assert.equal(first.result.summary.engineeringReady,false);
 assert.equal(first.result.summary.rightsBasis,'SOURCE_FACTS_ONLY');
 assert.equal(first.result.workerGlobal,true);
 assert.deepEqual(first.rows.filter(x=>x.kind==='OPEN').map(x=>x.path),expected);
 assert.equal(first.rows.filter(x=>x.kind==='SEAL').length,expected.length);
 const changed=original.replace('"label":"A"','"label":"B"');
 assert.equal(new TextEncoder().encode(changed).length,new TextEncoder().encode(original).length);
 const second=await page.evaluate(json=>window.runR10SourceWorker(json),changed);
 assert.equal(second.result.kind,'SCAN_DONE');
 assert.notEqual(second.result.summary.sourceSha256,nodeSha);
 const invalid=await page.evaluate(json=>window.runR10SourceWorker(json),'[{"a":}');
 assert.equal(invalid.result.kind,'FAILED');
 assert.notEqual(invalid.result.summary?.complete,true);
 console.log('R10 REAL CHROMIUM WORKER parity: original SHA, 7 OPEN/7 SEAL, escaped pointer, stale-equal-length source and malformed source PASS');
}finally{await browser.close();}
