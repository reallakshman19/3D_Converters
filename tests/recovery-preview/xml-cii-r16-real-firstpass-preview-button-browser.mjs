/** Real Playwright/browser qualification of R16 original selected-Owner fail closed. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage();
const misses=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{
 if(r.status()===404&&r.url().startsWith('http://127.0.0.1:4200/'))
  misses.push(new URL(r.url()).pathname);
});
const artifacts=process.env.RUNNER_TEMP||tmpdir();
let result=null;
try{
 await page.goto('http://127.0.0.1:4200/tests/browser/lfj-r16-real-firstpass-preview-nonall-button.html',
  {waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>Boolean(window.__R16_REAL_PREVIEW_RESULT__),null,{timeout:75000});
 result=await page.evaluate(()=>window.__R16_REAL_PREVIEW_RESULT__);
 console.log('R16_ACTUAL_FIRSTPASS_BUTTON_RECEIPT '+JSON.stringify(result));
 assert.equal(result.ok,true,result.message||'Actual Preview UI failed to reject unapproved source');
 assert.equal(result.originalBranches,5);
 assert.equal(result.originalNodes,216);
 assert.equal(result.realBuildPreviewButton,true);
 assert.equal(result.realRetryPreviewButton,true);
 assert.deepEqual(result.errors,['PREVIEW_SELECTED_SCOPE_NOT_INTEGRATED','PREVIEW_SELECTED_SCOPE_NOT_INTEGRATED']);
 assert.equal(result.selectedWorkerDispatched,false);
 assert.equal(result.stagedOriginalRead,false);
 assert.equal(result.factRecordsComputed,false);
 assert.equal(result.runAuthorized,false);
 assert.deepEqual(errors,[]);
 assert.deepEqual(misses,[]);
 await page.screenshot({path:join(artifacts,'r16-firstpass-preview-nonall-denied.png'),fullPage:true});
}finally{
 if(result)await writeFile(join(artifacts,'r16-firstpass-preview-nonall-receipt.json'),
   JSON.stringify({...result,pageErrors:errors,missingSameOriginResources:misses},null,2)+'\n');
 await browser.close();
}
