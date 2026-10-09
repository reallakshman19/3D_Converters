// Actual Chromium DOM acceptance from served repository source modules only.
// Does not certify deployed docs/tabs mirror or live Resolver adoption.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();
 await page.goto('http://127.0.0.1:4175/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-resolver-scope.browser.html',{waitUntil:'load'});
 await page.waitForFunction(()=>typeof window.runR12ActualScopeControl==='function');
 const result=await page.evaluate(()=>window.runR12ActualScopeControl());
 assert.deepEqual(result.before.first,['SITE-PARENT']);
 assert.equal(result.before.sourceSuperseded,true);
 assert.equal(result.before.stale,'__STALE_SOURCE_SCOPE__');
 assert.equal(result.before.reset,true);
 assert.equal(result.before.exportStatus,'');
 assert.ok(result.before.note.includes('reselect'));
 assert.equal(result.before.options[0].value,'__STALE_SOURCE_SCOPE__');
 assert.equal(result.before.options[0].selected,true);
 assert.equal(result.after.selected,'SITE-PARENT');
 assert.equal(result.after.updatedStateScope,'SITE-PARENT');
 assert.equal(result.after.renders,1);
 const stale=await page.evaluate(()=>window.runR12OriginalIndexGuard());
 assert.deepEqual(stale,{failedClosed:true,code:'SOURCE_SCOPE_STALE'});
 console.log('R12 real Chromium DOM: stale scope revoked, old trace cleared, manual reselect required, source-index guard PASS');
}finally{await browser.close();}
