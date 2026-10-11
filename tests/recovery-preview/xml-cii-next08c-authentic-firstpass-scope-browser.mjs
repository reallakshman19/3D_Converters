/**
 * Hosted REAL Chromium / original Firstpass file A3 source root → GC-PW basis.
 * Exercise only the test-page's isolated original B0 IDB generation; not
 * the production Preview button or engineering authority.
 */
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {chromium} from 'playwright';

const browser=await chromium.launch({headless:true});
const page=await browser.newPage();
page.setDefaultTimeout(120000);
const errors=[],sameOrigin404=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('response',response=>{
 if(response.status()===404 && response.url().startsWith('http://127.0.0.1:4200/'))
   sameOrigin404.push(new URL(response.url()).pathname);
});
const artifacts=process.env.RUNNER_TEMP||tmpdir();
let receipt=null;
try{
 await page.goto('http://127.0.0.1:4200/tests/browser/lfj-next08c-authentic-firstpass-scope-to-basis.html',
   {waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>Boolean(window.__NEXT08C_RESULT__),null,{timeout:180000});
 receipt=await page.evaluate(()=>window.__NEXT08C_RESULT__);
 console.log('NEXT08C_AUTHENTIC_CHROMIUM_RECEIPT '+JSON.stringify(receipt));
 assert.equal(receipt.ok,true,receipt.error||receipt.code||'real original source qualification failed');
 assert.equal(receipt.actualSourceSha256,
   '6b2c8b01ab0ba6ec8e9e7c42eb4a719668ffd2dc4dbe4790d27cf426a1f60288');
 assert.equal(receipt.actualXmlSha256,
   'feee5a5a6399207337e63bc56c8afb001fe37ab30c6a7a9283333ec60f6eea38');
 assert.equal(receipt.originalJsonBytes,733806);
 assert.equal(receipt.selectedScope,'/ASIM-1885-CU-PI');
 assert.ok(receipt.originalRootCount>=receipt.selectedRootCount && receipt.selectedRootCount>=1);
 assert.equal(receipt.temporaryOriginalIndexedDbCommitted,true);
 assert.equal(receipt.explicitAllManifestSeparate,true);
 assert.notEqual(receipt.selectedBasisId,receipt.allBasisId);
 assert.equal(receipt.rejectedUnknownScope,'SCOPE_UNKNOWN');
 assert.ok(receipt.rejectedOriginalShaDrift);
 assert.equal(Object.keys(receipt.masterCensus).length,4);
 assert.equal(receipt.ownerApproved385,false);
 assert.equal(receipt.realPreviewButtonIntegrated,false);
 assert.equal(receipt.physicalFactsComputed,false);
 assert.equal(receipt.productionA3IndexedReceiptIssued,false);
 assert.equal(receipt.productionSourceGenerationAuthenticated,false);
 assert.equal(receipt.engineeringReady,false);
 assert.equal(receipt.runAuthorized,false);
 assert.deepEqual(errors,[],'No page exceptions permitted');
 assert.deepEqual(sameOrigin404,[],'No missing authentic Firstpass/assets');
 await page.screenshot({path:join(artifacts,'next08c-authentic-firstpass-basis.png'),fullPage:true});
}finally{
 if(receipt){
  await writeFile(join(artifacts,'next08c-authentic-firstpass-scope-basis.json'),
    JSON.stringify({...receipt,pageErrors:errors,missingAssets:sameOrigin404},null,2)+'\n');
 }
 await browser.close();
}
